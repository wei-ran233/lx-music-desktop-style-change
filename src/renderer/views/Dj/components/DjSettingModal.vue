<template>
  <Teleport to="body">
    <div v-if="visible" :class="$style.overlay" @click.self="close">
      <div :class="$style.modal" role="dialog" aria-modal="true" aria-label="AI 电台设置">
        <div :class="$style.header">
          <h3><DjIcon name="settings" /> AI 电台设置</h3>
          <button :class="$style.closeBtn" aria-label="关闭" @click="close"><DjIcon name="close" /></button>
        </div>

        <div :class="$style.body">
          <div :class="$style.menuSidebar">
            <button
              v-for="cat in categories"
              :key="cat.id"
              :class="[$style.menuItem, { [$style.activeMenuItem]: activeCategory === cat.id }]"
              @click="activeCategory = cat.id"
            >
              <DjIcon :name="cat.icon" />
              <span>{{ cat.name }}</span>
            </button>
          </div>

          <div :class="$style.contentPanel" class="scroll">
            <!--  模型与 API -->
            <div v-if="activeCategory === 'llm'" :class="$style.section">
              <h4 :class="$style.sectionTitle"><DjIcon name="model" /> 模型连接</h4>
              <div :class="$style.formGroup">
                <label>模型服务商</label>
                <select v-model="form.selectedModel" :class="$style.select" @change="onModelSelectChange">
                  <option value="openai-compatible">OpenAI 兼容接口（通用）</option>
                  <option value="openai">OpenAI（Responses）</option>
                  <option value="anthropic">Anthropic（Messages）</option>
                  <option value="google">Google Gemini</option>
                  <option value="groq">Groq</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="opencode-go">OpenCode Go（订阅）</option>
                  <option value="deepseek">DeepSeek (深度求索)</option>
                  <option value="ollama">Ollama 本地引擎 (免 Key)</option>
                  <option value="lmstudio">LM Studio 本地引擎 (免 Key)</option>
                  <option value="glm-4.7-flash">智谱 GLM-4.7-Flash</option>
                  <option value="qwen-turbo">阿里通义千问 Qwen-Turbo</option>
                  <option value="custom">自定义模型</option>
                </select>
              </div>

              <div :class="$style.quickPresets">
                <span :class="$style.quickLabel">一键预设：</span>
                <button
                  v-for="preset in quickPresets"
                  :key="preset.id"
                  type="button"
                  :class="[$style.quickBtn, { [$style.quickBtnActive]: form.selectedModel === preset.id }]"
                  @click="applyQuickPreset(preset.id)"
                >
                  {{ preset.label }}
                </button>
              </div>

              <div v-if="isLocalProvider" :class="$style.localEngineBox">
                <div :class="$style.localEngineHeader">
                  <span><DjIcon name="server" /> 本地模型自发现 (Ollama / LM Studio)</span>
                  <button
                    type="button"
                    :class="$style.detectBtn"
                    :disabled="detectingLocal"
                    @click="scanLocalModels"
                  >
                    <DjIcon name="search" /> {{ detectingLocal ? '探测中...' : '探测本地模型' }}
                  </button>
                </div>
                <div v-if="localDiscoveredModels.length > 0" :class="$style.discoveredChips">
                  <span :class="$style.discoveredLabel">已发现模型（点击选用）：</span>
                  <button
                    v-for="m in localDiscoveredModels"
                    :key="m.source + m.id"
                    type="button"
                    :class="[$style.discoveredChip, { [$style.activeDiscoveredChip]: form.customModelName === m.id }]"
                    @click="selectDiscoveredModel(m)"
                  >
                    {{ m.name }} {{ m.size ? `(${m.size})` : '' }}
                  </button>
                </div>
                <p v-else-if="detectStatusText" :class="$style.detectStatusTip">
                  {{ detectStatusText }}
                </p>
              </div>

              <p v-if="form.selectedModel === 'opencode-go'" :class="$style.fieldTip">填写 Go API Key 后会自动读取在线模型列表。选择模型后，协议和接口路径自动匹配。</p>
              <div v-if="!isLocalProvider" :class="$style.formGroup">
                <label>API Key</label>
                <div :class="$style.inputWithBtn">
                  <input
                    :value="form.apiKey.startsWith('lx-vault:') ? '' : form.apiKey"
                    :type="showApiKey ? 'text' : 'password'"
                    :placeholder="form.apiKey.startsWith('lx-vault:') ? '已安全保存，输入新 Key 可替换' : '输入你的 API Key'"
                    :class="$style.input"
                    @input="form.apiKey = $event.target.value"
                  />
                  <button :class="$style.iconBtn" type="button" :aria-label="showApiKey ? '隐藏 API Key' : '显示 API Key'" @click="showApiKey = !showApiKey">
                    <DjIcon :name="showApiKey ? 'hidden' : 'eye'" />
                  </button>
                </div>
              </div>

              <div :class="$style.connectionRow">
                <button :class="$style.testBtn" type="button" :disabled="testing" @click="testConnection">
                  <DjIcon name="server" /> {{ testing ? '测试中...' : '测试连接' }}
                </button>
                <span v-if="testResult" :class="[$style.testResult, testResult.ok ? $style.testOk : $style.testFail]">
                  {{ testResult.msg }}
                </span>
              </div>

              <p :class="$style.fieldTip" role="status">{{ credentialStorage === 'system' ? '密钥已由系统密钥环保护，配置备份不包含密钥。' : credentialStorage === 'session' ? '系统密钥环不可用：新密钥仅保留在本次运行内，重启后需重新输入。' : '正在连接密钥存储；原配置会在安全迁移成功后更新。' }}</p>
              <ModelPicker v-model="form.customModelName" :settings="form" />
              <details :class="$style.advancedSettings">
                <summary>高级连接设置</summary>
                <div :class="$style.formGroup">
                  <label>API Base URL</label>
                  <input v-model="form.baseUrl" type="text" placeholder="https://api.openai.com/v1/" :class="$style.input" />
                  <p :class="$style.fieldTip">填写服务商 API 根地址；本地引擎会自动补全 /v1，连接测试与对话使用相同协议</p>
                </div>

                <div :class="$style.formGroup">
                  <label>请求并发限制</label>
                  <div :class="$style.sliderRow">
                    <input v-model.number="form.concurrencyLimit" type="range" min="1" max="10" :class="$style.slider" />
                    <span>{{ form.concurrencyLimit }} 次</span>
                  </div>
                  <p :class="$style.fieldTip">控制同时进行的请求数量；较低的数值可减少接口限流</p>
                </div>
              </details>
            </div>

            <!--  DJ 人设 -->
            <div v-if="activeCategory === 'djPrompt'" :class="$style.section">
              <h4 :class="$style.sectionTitle"><DjIcon name="headphones" /> DJ 模式人设</h4>
              <p :class="$style.fieldTip">不配置时使用内置模板，留空即可。</p>

              <div v-for="field in djPromptFields" :key="field.key" :class="$style.formGroup">
                <div :class="$style.labelRow">
                  <label>{{ field.label }}</label>
                  <button :class="$style.resetBtn" type="button" @click="resetField('dj', field.key)">↺ 恢复默认</button>
                </div>
                <textarea
                  :value="form[field.key]"
                  :rows="field.rows"
                  :placeholder="field.placeholder"
                  :class="$style.textarea"
                  @input="form[field.key] = $event.target.value"
                ></textarea>
              </div>
            </div>

            <!--  聊天人设 -->
            <div v-if="activeCategory === 'chatPrompt'" :class="$style.section">
              <h4 :class="$style.sectionTitle"><DjIcon name="chat" /> 聊天模式人设</h4>
              <p :class="$style.fieldTip">不配置时使用内置模板，留空即可。</p>

              <div v-for="field in chatPromptFields" :key="field.key" :class="$style.formGroup">
                <div :class="$style.labelRow">
                  <label>{{ field.label }}</label>
                  <button :class="$style.resetBtn" type="button" @click="resetField('chat', field.key)">↺ 恢复默认</button>
                </div>
                <textarea
                  :value="form[field.key]"
                  :rows="field.rows"
                  :placeholder="field.placeholder"
                  :class="$style.textarea"
                  @input="form[field.key] = $event.target.value"
                ></textarea>
              </div>
            </div>

            <!--  语音播报 -->
            <div v-if="activeCategory === 'tts'" :class="$style.section">
              <h4 :class="$style.sectionTitle"><DjIcon name="voice" /> 语音播报</h4>

              <!-- 渠道选择（类似模型选择器） -->
              <div :class="$style.formGroup">
                <label>选择播报渠道</label>
                <select v-model="form.ttsEngine" :class="$style.select">
                  <option v-for="ch in ttsChannels" :key="ch.id" :value="ch.id">{{ ch.label }}</option>
                </select>
                <p :class="$style.fieldTip">{{ ttsChannelHint }}</p>
              </div>

              <div :class="$style.formGroup">
                <label>播报语言</label>
                <select v-model="form.ttsLang" :class="$style.select">
                  <option value="zh-CN">简体中文</option>
                  <option value="zh-TW">繁体中文</option>
                  <option value="en-US">English</option>
                </select>
              </div>
              <div :class="$style.formGroup">
                <button type="button" :class="$style.cancelBtn" :disabled="ttsTesting" @click="testTts">{{ ttsTesting ? '正在测试…' : '测试语音' }}</button>
                <p v-if="ttsTestResult" role="status" :class="$style.fieldTip">{{ ttsTestResult }}</p>
                <p :class="$style.fieldTip">使用当前填写的配置测试。云端播报由 AI 合成。</p>
              </div>
              <template v-if="form.ttsEngine === 'volcengine-v3-tts'">
                <div :class="$style.formGroup">
                  <label>火山官方音色（豆包 2.0）</label>
                  <button type="button" :class="$style.cancelBtn" :disabled="voiceCatalogLoading" @click="refreshVoiceCatalog">{{ voiceCatalogLoading ? '正在读取官网…' : '刷新官方音色' }}</button>
                  <p role="status" :class="$style.fieldTip">{{ voiceCatalogStatus }}</p>
                  <input v-model="voiceCatalogQuery" type="search" placeholder="搜索音色名称、语言或 ID" aria-label="搜索火山音色" :class="$style.input" />
                  <select v-model="form.ttsVoice" aria-label="火山音色列表" :class="$style.select">
                    <option value="">Vivi 2.0（默认）</option>
                    <option v-for="voice in visibleVolcengineVoices" :key="voice.id" :value="voice.id">{{ voice.name }}</option>
                    <option v-if="form.ttsVoice && !volcengineVoices.some(v => v.id === form.ttsVoice)" :value="form.ttsVoice">自定义：{{ form.ttsVoice }}</option>
                  </select>
                  <p :class="$style.fieldTip">已载入 {{ volcengineVoices.length }} 个官方公开音色。选中后点击“测试语音”试听，实际可用性以账号资源权限为准。</p>
                </div>
                <div :class="$style.formGroup">
                  <label>Resource ID（资源模型）</label>
                  <input v-model="form.ttsResourceId" type="text" placeholder="seed-tts-2.0" :class="$style.input" />
                </div>
              </template>
              <!-- 发音人选择（大部分渠道通用） -->
              <div v-if="form.ttsEngine !== 'youdao-tts'" :class="$style.formGroup">
                <label>播报发音人</label>
                <input
                  v-model="form.ttsVoice"
                  type="text"
                  :placeholder="voicePlaceholder"
                  :class="$style.input"
                />
              </div>

              <!-- 渠道专属配置 -->
              <template v-if="needsApiKey">
                <div :class="$style.formGroup">
                  <label>API Key</label>
                  <input v-model="form.ttsApiKey" type="password" placeholder="输入 TTS API Key" :class="$style.input" />
                </div>
              </template>

              <template v-if="form.ttsEngine === 'azure-tts'">
                <div :class="$style.formGroup">
                  <label>Region（区域）</label>
                  <input v-model="form.ttsRegion" type="text" placeholder="eastasia" :class="$style.input" />
                  <p :class="$style.fieldTip">Azure 语音服务的区域，如 eastasia / eastus</p>
                </div>
              </template>

              <template v-if="form.ttsEngine === 'iflytek-tts'">
                <div :class="$style.formGroup">
                  <label>App ID</label>
                  <input v-model="form.ttsAppId" type="text" placeholder="讯飞开放平台 AppID" :class="$style.input" />
                </div>
                <div :class="$style.formGroup">
                  <label>API Secret</label>
                  <input v-model="form.ttsCustomUrl" type="password" placeholder="讯飞 APISecret" :class="$style.input" />
                </div>
              </template>

              <template v-if="form.ttsEngine === 'volcengine-tts'">
                <div :class="$style.formGroup">
                  <label>App ID</label>
                  <input v-model="form.ttsAppId" type="text" placeholder="火山引擎应用 ID" :class="$style.input" />
                </div>
              </template>

              <template v-if="form.ttsEngine === 'custom-tts'">
                <div :class="$style.formGroup">
                  <label>自定义 API Endpoint</label>
                  <input v-model="form.ttsCustomUrl" type="text" placeholder="https://your-tts-service.com/v1/audio/speech" :class="$style.input" />
                </div>
              </template>

              <!-- 语速 / 音调（部分渠道） -->
              <div v-if="form.ttsEngine !== 'youdao-tts'" :class="$style.twoCol">
                <div :class="$style.formGroup">
                  <label>语速 {{ form.ttsSpeed }}x</label>
                  <input v-model.number="form.ttsSpeed" type="range" min="0.5" max="2" step="0.1" :class="$style.slider" />
                </div>
                <div :class="$style.formGroup">
                  <label>音调 {{ form.ttsPitch }}x（系统 / Azure）</label>
                  <input v-model.number="form.ttsPitch" :disabled="!['web-speech', 'azure-tts'].includes(form.ttsEngine)" type="range" min="0.5" max="2" step="0.1" :class="$style.slider" />
                </div>
              </div>

              <!-- Switch 风格开关 -->
              <div :class="$style.switchList">
                <div :class="$style.switchItem">
                  <div :class="$style.switchText">
                    <span :class="$style.switchTitle"><DjIcon name="chat" /> 聊天播报</span>
                    <span :class="$style.switchDesc">聊天回复时播放语音</span>
                  </div>
                  <button
                    :class="[$style.switch, { [$style.switchOn]: form.enableChatSpeech }]"
                    @click="form.enableChatSpeech = !form.enableChatSpeech"
                  >
                    <span :class="$style.switchThumb"></span>
                  </button>
                </div>
                <div :class="$style.switchItem">
                  <div :class="$style.switchText">
                    <span :class="$style.switchTitle"><DjIcon name="headphones" /> DJ 串场播报</span>
                    <span :class="$style.switchDesc">切歌推荐时播放 DJ 语音</span>
                  </div>
                  <button
                    :class="[$style.switch, { [$style.switchOn]: form.enableDjSpeech }]"
                    @click="form.enableDjSpeech = !form.enableDjSpeech"
                  >
                    <span :class="$style.switchThumb"></span>
                  </button>
                </div>
                <div :class="$style.switchItem">
                  <div :class="$style.switchText">
                    <span :class="$style.switchTitle"><DjIcon name="music" /> 自动连播</span>
                    <span :class="$style.switchDesc">一首歌播完后自动推荐并播放下一首</span>
                  </div>
                  <button
                    :class="[$style.switch, { [$style.switchOn]: form.autoContinue }]"
                    @click="form.autoContinue = !form.autoContinue"
                  >
                    <span :class="$style.switchThumb"></span>
                  </button>
                </div>
                <div :class="$style.switchItem">
                  <div :class="$style.switchText">
                    <span :class="$style.switchTitle"><DjIcon name="headphones" /> 推荐即播</span>
                    <span :class="$style.switchDesc">DJ 推荐歌曲后立即切换播放（无需手动点击）</span>
                  </div>
                  <button
                    :class="[$style.switch, { [$style.switchOn]: form.djAutoPlay }]"
                    @click="form.djAutoPlay = !form.djAutoPlay"
                  >
                    <span :class="$style.switchThumb"></span>
                  </button>
                </div>
              </div>

              <div :class="$style.formGroup">
                <label>语音闪避音量（播报时音乐自动压低）</label>
                <div :class="$style.sliderRow">
                  <input v-model.number="form.duckingVolume" type="range" min="5" max="50" :class="$style.slider" />
                  <span>{{ form.duckingVolume }}%</span>
                </div>
              </div>
            </div>

            <!--  天气设置 -->
            <div v-if="activeCategory === 'weather'" :class="$style.section">
              <h4 :class="$style.sectionTitle"><DjIcon name="weather" /> 环境与天气</h4>

              <div :class="$style.formGroup">
                <label>所在城市</label>
                <div :class="$style.inputWithBtn">
                  <input
                    v-model="form.city"
                    type="text"
                    placeholder="例如：北京 / 上海 / 广州 / 成都"
                    :class="$style.input"
                    @input="onCityInput"
                    @focus="onCityFocus"
                  />
                  <button :class="$style.iconBtn" type="button" title="常用城市" @click="showPopularCity = !showPopularCity">
                    <DjIcon name="city" />
                  </button>
                </div>
                <div v-if="showPopularCity" :class="$style.popularCities">
                  <button v-for="c in popularCities" :key="c" :class="$style.cityChip" @click="form.city = c">
                    {{ c }}
                  </button>
                </div>
                <transition name="fade">
                  <div v-if="showCityDropdown && cityResults.length > 0" :class="$style.cityDropdown">
                    <div
                      v-for="item in cityResults"
                      :key="item.id"
                      :class="$style.cityDropdownItem"
                      @click="selectCity(item)"
                    >
                      <span :class="$style.cityName">{{ item.name }}</span>
                      <span :class="$style.cityRegion">{{ item.displayLabel }}</span>
                    </div>
                  </div>
                </transition>
              </div>

              <div :class="$style.formGroup">
                <label>和风天气 API Key（可选）</label>
                <input v-model="form.weatherApiKey" type="password" placeholder="填入 key 可自动感知天气" :class="$style.input" />
                <p :class="$style.fieldTip">留空时自动使用免费天气接口，无需 Key</p>
              </div>
              <div :class="$style.formGroup">
                <label>和风天气 API Host</label>
                <input v-model="form.weatherApiHost" placeholder="控制台 → 设置中的专属域名，如 xxx.qweatherapi.com" :class="$style.input" />
                <p :class="$style.fieldTip">使用 API Key 时请同时填写专属 API Host，旧公共域名正在停用。</p>
                <button type="button" :class="$style.secondaryBtn" :disabled="weatherTesting" @click="testWeather">{{ weatherTesting ? '正在测试…' : '保存并测试天气' }}</button>
                <p v-if="weatherTestResult" role="status" :class="$style.fieldTip">{{ weatherTestResult }}</p>
              </div>
            </div>

            <!--  用户画像 -->
            <div v-if="activeCategory === 'profile'" :class="$style.section">
              <h4 :class="$style.sectionTitle"><DjIcon name="chart" /> 音乐偏好</h4>
              <p :class="$style.fieldTip">根据收藏和有效收听在本地自动更新。收听满 30 秒或歌曲时长的 30%（取较小值）计一次；拖动进度、暂停和加载不计入。</p>

              <div :class="$style.profileCard">
                <div :class="$style.profileBlock">
                  <div :class="$style.profileLabel"><DjIcon name="voice" /> 自动提取的喜欢歌手</div>
                  <p v-if="!profileSummary.autoArtists.length" :class="$style.fieldTip">还没有足够的收藏或收听记录，听几首喜欢的歌后会自动出现。</p>
                  <div v-for="artist in profileSummary.autoArtists" :key="artist.name" :class="$style.artistEvidence">
                    <span :class="$style.distName">{{ artist.name }}</span>
                    <span :class="$style.fieldTip">收藏 {{ artist.favorites }} 首 · 有效收听 {{ artist.listens }} 次</span>
                    <button type="button" :class="$style.resetBtn" :aria-label="'忽略歌手 ' + artist.name" @click="ignoreProfileTag('artists', artist.name)">不符合</button>
                  </div>
                </div>
                <div :class="$style.profileBlock">
                  <div :class="$style.profileLabel"><DjIcon name="music" /> 自动提取的曲风</div>
                  <p :class="$style.fieldTip">{{ profileSummary.knownGenreCount }} / {{ profileSummary.analyzedSongCount }} 首歌曲有可识别曲风标签。缺少标签的歌曲保留为未知，不根据歌手姓名猜测。</p>
                  <div :class="$style.tagCloud">
                    <button v-for="genre in profileSummary.automaticGenres" :key="genre" type="button" :class="$style.tag" :title="'忽略曲风：' + genre" @click="ignoreProfileTag('genres', genre)">{{ genre }} ×</button>
                    <span v-if="!profileSummary.automaticGenres.length" :class="$style.tagEmpty">暂无可确认曲风，可手动设置偏好或导入带曲风标签的本地音乐。</span>
                  </div>
                  <p v-if="profileSummary.genreHints.length" :class="$style.fieldTip">标题线索（待确认，尚未作为已知偏好）：{{ profileSummary.genreHints.join('、') }}</p>
                  <button v-for="hint in profileSummary.genreHints" :key="hint" type="button" :class="$style.resetBtn" @click="confirmGenre(hint)">确认喜欢 {{ hint }}</button>
                </div>
                <div :class="$style.profileBlock">
                  <div :class="$style.profileLabel"><DjIcon name="radio" /> 各时段常听歌曲</div>
                  <p :class="$style.fieldTip">按实际收听发生的本地时间统计近 90 天记录。旧记录没有时间戳，无法恢复时段；最多保留最近 5000 次有效收听。</p>
                  <details v-for="group in profileSummary.timeSongs" :key="group.period" :open="group.songs.length > 0" :class="$style.periodGroup">
                    <summary>{{ group.label }} · {{ group.songs.length ? '常听 ' + group.songs.length + ' 首' : '暂无记录' }}</summary>
                    <div v-for="song in group.songs" :key="song.name + song.singer" :class="$style.periodSong">
                      <span>{{ song.name }}<small> · {{ song.singer || '歌手未知' }}</small></span>
                      <span>{{ song.count }} 次</span>
                    </div>
                  </details>
                </div>

                <div :class="$style.profileBlock">
                  <div :class="$style.profileLabel"><DjIcon name="music" /> 明确喜欢的曲风（可编辑）</div>
                  <div :class="$style.tagCloud">
                    <span
                      v-for="(g, i) in editableTags.genres"
                      :key="'g-' + i"
                      :class="[$style.tag, $style.tagEditable]"
                      :title="'删除：' + g"
                      @click="removeTag('genres', i)"
                    >{{ g }} ✕</span>
                    <span v-if="!editableTags.genres.length" :class="$style.tagEmpty">暂无，请在下方添加</span>
                  </div>
                  <div :class="$style.tagInputRow">
                    <input
                      v-model="newGenreTag"
                      type="text"
                      placeholder="添加曲风，如：治愈系 / 摇滚 / R&B"
                      :class="$style.input"
                      @keyup.enter="addTag('genres')"
                    />
                    <button :class="$style.addTagBtn" type="button" @click="addTag('genres')">＋ 添加</button>
                  </div>
                </div>

                <div :class="$style.profileBlock">
                  <div :class="$style.profileLabel"><DjIcon name="voice" /> 明确喜欢的歌手（可编辑）</div>
                  <div :class="$style.tagCloud">
                    <span
                      v-for="(a, i) in editableTags.artists"
                      :key="'a-' + i"
                      :class="[$style.tag, $style.tagEditable]"
                      :title="'删除：' + a"
                      @click="removeTag('artists', i)"
                    >{{ a }} ✕</span>
                    <span v-if="!editableTags.artists.length" :class="$style.tagEmpty">暂无，请在下方添加</span>
                  </div>
                  <div :class="$style.tagInputRow">
                    <input
                      v-model="newArtistTag"
                      type="text"
                      placeholder="添加歌手，如：周杰伦 / 陈奕迅"
                      :class="$style.input"
                      @keyup.enter="addTag('artists')"
                    />
                    <button :class="$style.addTagBtn" type="button" @click="addTag('artists')">＋ 添加</button>
                  </div>
                </div>

                <!-- 曲风占比（参考大厂音乐口味分析） -->
                <div v-if="profileSummary.genreDist.length" :class="$style.profileBlock">
                  <div :class="$style.profileLabel"><DjIcon name="chart" /> 已识别曲风的加权占比</div>
                  <div :class="$style.distList">
                    <div v-for="(g, i) in profileSummary.genreDist" :key="'gd-' + i" :class="$style.distItem">
                      <span :class="$style.distName">{{ g.name }}</span>
                      <div :class="$style.distBarWrap">
                        <div :class="$style.distBar" :style="{ width: g.percent + '%' }"></div>
                      </div>
                      <span :class="$style.distPct">{{ g.percent }}%</span>
                    </div>
                  </div>
                </div>

                <!-- 情绪 / 语种标签 -->
                <div v-if="profileSummary.moodList.length || profileSummary.langList.length" :class="$style.profileBlock">
                  <div :class="$style.profileLabel"><DjIcon name="user" /> 情绪倾向</div>
                  <div :class="$style.tagCloud">
                    <span v-for="(m, i) in profileSummary.moodList" :key="'m-' + i" :class="[$style.tag, $style.tagMood]">{{ m }}</span>
                    <span v-if="!profileSummary.moodList.length" :class="$style.tagEmpty">暂无</span>
                  </div>
                  <div :class="$style.profileLabel" style="margin-top: 8px;"><DjIcon name="globe" /> 语种偏好</div>
                  <div :class="$style.tagCloud">
                    <span v-for="(l, i) in profileSummary.langList" :key="'l-' + i" :class="[$style.tag, $style.tagLang]">{{ l }}</span>
                    <span v-if="!profileSummary.langList.length" :class="$style.tagEmpty">暂无</span>
                  </div>
                </div>

                <div v-if="editableTags.excludedArtists?.length || editableTags.excludedGenres?.length" :class="$style.profileBlock">
                  <div :class="$style.profileLabel">已忽略（点击恢复自动学习）</div>
                  <button v-for="tag in editableTags.excludedArtists" :key="'artist-' + tag" type="button" :class="$style.resetBtn" @click="restoreProfileTag('artists', tag)">{{ tag }} · 恢复</button>
                  <button v-for="tag in editableTags.excludedGenres" :key="'genre-' + tag" type="button" :class="$style.resetBtn" @click="restoreProfileTag('genres', tag)">{{ tag }} · 恢复</button>
                </div>
                <div :class="$style.profileBlock">
                  <div :class="$style.profileLabel"><DjIcon name="book" /> 学习样本</div>
                  <div :class="$style.profileSample">收藏 {{ profileSummary.sampleCount }} 首 · 近 90 天有效收听 {{ profileSummary.listeningCount }} 次 · 更新于 {{ profileSummary.updatedAt }}</div>
                </div>
              </div>

              <div :class="$style.logHeader">
                <h5 :class="$style.subTitle"><DjIcon name="book" /> 偏好学习日志</h5>
                <button :class="$style.resetBtn" type="button" @click="clearLogs"><DjIcon name="trash" /> 清空日志</button>
              </div>
              <div :class="$style.logTimeline" class="scroll">
                <div v-for="(log, idx) in logs" :key="idx" :class="$style.logItem">
                  <span :class="$style.logTime">{{ log.time }}</span>
                  <span :class="$style.logContent">{{ log.content }}</span>
                </div>
                <div v-if="!logs.length" :class="$style.logEmpty">暂无日志</div>
              </div>

              <!-- 数据导入 / 导出 -->
              <div :class="$style.backupRow">
                <button :class="$style.exportBtn" type="button" @click="exportDjData"><DjIcon name="upload" /> 导出配置</button>
                <button :class="$style.importBtn" type="button" @click="importDjData"><DjIcon name="download" /> 导入配置</button>
                <span :class="$style.backupTip">备份设置、历史与画像；密钥不包含在导出文件中</span>
              </div>
            </div>
          </div>
        </div>

        <div :class="$style.footer">
          <button :class="$style.cancelBtn" @click="close">取消</button>
          <button :class="$style.saveBtn" @click="save">保存配置</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import ModelPicker from './ModelPicker.vue'
import DjIcon from '@renderer/components/common/SvgIcon.vue'
import { completeModelText, isLocalModel } from '@renderer/utils/dj/ai/modelsManager'
import { ref, reactive, computed, watch, onUnmounted } from '@common/utils/vueTools'
import { djSettings, saveDjSettings, credentialStorage, profileLogs, clearProfileLogs, getDjBackupData, applyDjBackupData } from '@renderer/store/dj'
import { sanitizeVoiceList } from '@common/dj/voiceCatalog'
import { djRequest } from '@renderer/utils/dj/serviceBridge'
import { VOLCENGINE_VOICES } from '@common/dj/voices'
import { synthesizeSpeech } from '@renderer/utils/dj/ttsService'
import { searchCities, fetchCurrentWeather } from '@renderer/utils/dj/weatherService'
import { analyzeUserProfile, getUserTags, saveUserTags, setProfileTagExcluded } from '@renderer/utils/dj/userProfile'
import { getModelPresets } from '@renderer/utils/dj/llmService'
import { detectAllLocalEngines } from '@renderer/utils/dj/ai/localDiscovery'
import { showSelectDialog, openSaveDir } from '@renderer/utils/ipc'
import { dialog } from '@renderer/plugins/Dialog'

const defaultDjPrompts = {
  djPromptRole: '你是一名拥有丰富音乐知识与极客精神的专业电台音乐 DJ。你的声音性感优雅，性格热情幽默且充满都市感。你不仅精通各种音乐类型（如 R&B、CityPop、爵士、摇滚、纯音乐），还能通过富有感染力的语言将音乐与用户当前的环境相连接。',
  djPromptOpening: '结合用户所在城市的天气、实时时间段（早晨/午后/傍晚/深夜）以及气温，生成极具仪式感与氛围感的广播频道开场白。',
  djPromptSelection: '选歌算法需精准契合环境与节奏：早晨优先 110-125 BPM 活力音乐；午后选择 80-100 BPM 轻爵士、Bossa Nova 或 CityPop；雨天优先慢板民谣与治愈系钢琴；深夜精选 Ambient 纯音乐或感性 R&B。',
  djPromptRecommendation: '推歌时输出具象化、富有画面感的串词，讲述歌曲的创作故事、词曲意境、音色与编曲亮点。串词控制在 100-180 字。',
  chatPromptRole: '你是一个温暖、体贴、懂得倾听的知心音乐伙伴。你善于通过文字给予用户情感上的开导与抚慰，引导用户分享生活故事，并用音乐作为连接心灵的桥梁。',
  chatPromptOpening: '开场白需体现关怀与温情。结合当下时间与天气自然发起问候，询问用户今天过得怎么样、心情如何。',
  chatPromptSelection: '根据用户倾诉的心事与情感状态推荐歌曲：焦虑时推荐舒缓治愈系；兴奋喜悦时推荐昂扬热烈的歌；低落时推荐温柔共情、陪伴感强的曲目。',
  chatPromptRecommendation: '乐评探讨需真诚深入。从歌词意境、歌手演唱时的情感流露、个人听感体会等角度展开交流，形成双向的情感互动。',
}

export default {
  name: 'DjSettingModal',
  components: { DjIcon, ModelPicker },
  props: {
    visible: { type: Boolean, default: false },
  },
  emits: ['update:visible', 'save'],
  setup(props, { emit }) {
    const activeCategory = ref('llm')
    const showApiKey = ref(false)
    const showPopularCity = ref(false)
    const weatherTesting = ref(false)
    const weatherTestResult = ref('')
    const testWeather = async() => {
      weatherTesting.value = true
      weatherTestResult.value = ''
      try {
        await saveDjSettings({ ...djSettings, city: form.city, weatherApiKey: form.weatherApiKey, weatherApiHost: form.weatherApiHost })
        const data = await fetchCurrentWeather(true)
        weatherTestResult.value = `成功：${data.fullText}`
      } catch (err) {
        weatherTestResult.value = `测试失败：${err.message}`
      } finally { weatherTesting.value = false }
    }
    const testing = ref(false)
    const testResult = ref(null)
    let searchTimer = null
    let citySearchSeq = 0

    const categories = [
      { id: 'llm', name: '模型与 API', icon: 'model' },
      { id: 'djPrompt', name: 'DJ 人设', icon: 'radio' },
      { id: 'chatPrompt', name: '聊天人设', icon: 'chat' },
      { id: 'tts', name: '语音播报', icon: 'voice' },
      { id: 'weather', name: '天气设置', icon: 'weather' },
      { id: 'profile', name: '用户画像', icon: 'chart' },
    ]

    const quickPresets = [
      { id: 'opencode-go', label: 'OpenCode Go' },
      { id: 'openai', label: 'OpenAI' },
      { id: 'anthropic', label: 'Anthropic' },
      { id: 'google', label: 'Gemini' },
      { id: 'deepseek', label: 'DeepSeek' },
      { id: 'ollama', label: 'Ollama 本地' },
      { id: 'lmstudio', label: 'LM Studio' },
      { id: 'glm-4.7-flash', label: '智谱 GLM' },
      { id: 'qwen-turbo', label: '通义千问' },
    ]

    const popularCities = ['北京', '上海', '广州', '深圳', '成都', '杭州', '西安', '武汉']

    const ttsChannels = [
      { id: 'web-speech', label: '本地语音（免 Key）', hint: '依赖系统已安装的语音音色；Ubuntu/Electron 可能没有中文音色，请先测试，失败时改用云端语音' },
      { id: 'youdao-tts', label: '有道翻译语音（免 Key）', hint: '非正式公共接口，仅限 100 字短句，不保证可用；长篇播报请选择正式云端服务' },
      { id: 'azure-tts', label: 'Azure 神经语音', hint: '微软云神经语音，音质自然，需 Speech 资源专用 Key，区域必须与资源一致；中文音色可填 zh-CN-XiaoxiaoNeural' },
      { id: 'openai-tts', label: 'OpenAI TTS', hint: 'OpenAI tts-1 模型，需 OpenAI API Key' },
      { id: 'iflytek-tts', label: '讯飞 TTS', hint: '科大讯飞语音合成，需开放平台 AppID + ApiKey + ApiSecret' },
      { id: 'volcengine-v3-tts', label: '火山引擎 · 豆包语音 2.0（新版 API Key）', hint: '新版控制台 API Key，无需 AppID；资源默认 seed-tts-2.0，音色可从官方列表选择并试听' },
      { id: 'volcengine-tts', label: '火山引擎 TTS', hint: '字节跳动语音合成，需火山引擎 AppID 和 Access Token' },
      { id: 'custom-tts', label: '自定义 TTS', hint: '填写完整的 OpenAI 兼容 /v1/audio/speech 地址，发送 tts-1 / input / voice / speed，接口必须返回音频' },
    ]

    const ttsChannelsMap = Object.fromEntries(ttsChannels.map(c => [c.id, c]))
    const ttsChannelHint = computed(() => ttsChannelsMap[form.ttsEngine]?.hint ?? '')
    const needsApiKey = computed(() => {
      return ['openai-tts', 'azure-tts', 'volcengine-tts', 'volcengine-v3-tts', 'iflytek-tts', 'custom-tts'].includes(form.ttsEngine)
    })
    const voicePlaceholder = computed(() => {
      switch (form.ttsEngine) {
        case 'azure-tts': return 'zh-CN-XiaoxiaoNeural'
        case 'iflytek-tts': return 'xiaoyan'
        case 'volcengine-tts': return 'BV001_streaming'
        case 'volcengine-v3-tts': return 'zh_female_vv_uranus_bigtts'
        case 'openai-tts': return 'alloy'
        default: return 'zh-CN-XiaoxiaoNeural'
      }
    })

    const djPromptFields = [
      { key: 'djPromptRole', label: '角色设定', rows: 3, placeholder: '设定 DJ 的性格与说话语气...' },
      { key: 'djPromptOpening', label: '开场白规则', rows: 2, placeholder: '结合城市天气、时间段的广播开场白...' },
      { key: 'djPromptSelection', label: '选歌逻辑', rows: 2, placeholder: '基于场景 BPM、曲风渐进的选歌算法...' },
      { key: 'djPromptRecommendation', label: '串词推荐', rows: 2, placeholder: '讲出歌曲创作背景与听感故事...' },
    ]

    const chatPromptFields = [
      { key: 'chatPromptRole', label: '角色设定', rows: 3, placeholder: '设定知心伙伴人设与倾听语气...' },
      { key: 'chatPromptOpening', label: '开场关怀', rows: 2, placeholder: '如何根据时间发起关怀问候...' },
      { key: 'chatPromptSelection', label: '情绪推歌', rows: 2, placeholder: '根据用户情绪状态推荐歌曲...' },
      { key: 'chatPromptRecommendation', label: '乐评交流', rows: 2, placeholder: '与用户就音乐审美展开交流...' },
    ]

    const form = reactive({ ...djSettings, modelList: djSettings.modelList.map(model => ({ ...model })) })
    const voiceCacheKey = 'lx_dj_volcengine_voice_catalog_v1'
    const volcengineVoices = ref([...VOLCENGINE_VOICES])
    const voiceCatalogQuery = ref('')
    const visibleVolcengineVoices = computed(() => {
      const query = voiceCatalogQuery.value.trim().toLowerCase()
      const matches = volcengineVoices.value.filter(voice => !query || `${voice.name} ${voice.id} ${voice.language}`.toLowerCase().includes(query))
      const selected = volcengineVoices.value.find(voice => voice.id === form.ttsVoice)
      if (selected && !matches.some(voice => voice.id === selected.id)) matches.unshift(selected)
      return matches
    })
    const voiceCatalogLoading = ref(false)
    const voiceCatalogStatus = ref('内置音色目录；点击刷新可读取官网新增音色')
    let voiceCatalogUpdatedAt = 0
    let voiceCatalogController = null
    try {
      const cached = JSON.parse(localStorage.getItem(voiceCacheKey) ?? 'null')
      const voices = sanitizeVoiceList(cached?.voices)
      if (voices.length) {
        volcengineVoices.value = voices
        voiceCatalogUpdatedAt = Date.parse(cached.updatedAt) || 0
        voiceCatalogStatus.value = `已读取缓存，更新时间：${new Date(voiceCatalogUpdatedAt).toLocaleString()}`
      }
    } catch { /* retain built-in catalog */ }
    const refreshVoiceCatalog = async() => {
      if (voiceCatalogLoading.value) return
      const controller = new AbortController()
      voiceCatalogController = controller
      voiceCatalogLoading.value = true
      voiceCatalogStatus.value = '正在读取火山官网公开音色，不会发送 API Key'
      try {
        const result = await djRequest('tts-voices', { settings: {} }, controller.signal)
        const voices = sanitizeVoiceList(result.voices)
        if (!voices.length) throw new Error('官网未返回有效的豆包 2.0 音色')
        if (controller.signal.aborted) return
        volcengineVoices.value = voices
        voiceCatalogUpdatedAt = Date.parse(result.updatedAt) || Date.now()
        localStorage.setItem(voiceCacheKey, JSON.stringify({ voices, updatedAt: new Date(voiceCatalogUpdatedAt).toISOString() }))
        voiceCatalogStatus.value = `已从官网更新 ${voices.length} 个音色，${new Date(voiceCatalogUpdatedAt).toLocaleString()}`
      } catch (error) {
        if (!controller.signal.aborted) voiceCatalogStatus.value = `刷新失败，保留当前列表：${error.message}`
      } finally {
        if (voiceCatalogController === controller) {
          voiceCatalogController = null
          voiceCatalogLoading.value = false
        }
      }
    }
    watch(() => [props.visible, activeCategory.value, form.ttsEngine], () => {
      if (props.visible && activeCategory.value === 'tts' && form.ttsEngine === 'volcengine-v3-tts' && Date.now() - voiceCatalogUpdatedAt > 24 * 60 * 60 * 1000) void refreshVoiceCatalog()
    })
    const ttsTesting = ref(false)
    const ttsTestResult = ref('')
    let ttsController = null
    let previewAudio = null
    let previewUrl = null
    const stopTtsTest = () => {
      ttsController?.abort()
      ttsController = null
      if (previewAudio) { previewAudio.pause(); previewAudio.removeAttribute('src'); previewAudio.load(); previewAudio = null }
      if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null }
      window.speechSynthesis?.cancel()
    }
    const testTts = async() => {
      stopTtsTest()
      const controller = new AbortController()
      ttsController = controller
      ttsTesting.value = true
      ttsTestResult.value = ''
      try {
        const url = await synthesizeSpeech('你好，这是音乐电台的语音测试。', { settings: { ...form }, signal: controller.signal })
        if (controller.signal.aborted) { if (url.startsWith('blob:')) URL.revokeObjectURL(url); return }
        if (url.startsWith('speech:')) {
          const utterance = new SpeechSynthesisUtterance(decodeURIComponent(url.slice(7)))
          utterance.lang = form.ttsLang
          utterance.voice = window.speechSynthesis.getVoices().find(v => v.name === form.ttsVoice) ?? window.speechSynthesis.getVoices().find(v => v.lang.replace('_', '-').toLowerCase() === form.ttsLang.toLowerCase())
          utterance.rate = form.ttsSpeed
          utterance.pitch = form.ttsPitch
          utterance.onerror = () => { if (!controller.signal.aborted) ttsTestResult.value = '系统语音播放失败，请选择云端语音服务' }
          window.speechSynthesis.speak(utterance)
        } else {
          previewUrl = url.startsWith('blob:') ? url : null
          previewAudio = new Audio(url)
          previewAudio.onerror = () => { if (!controller.signal.aborted) ttsTestResult.value = '音频播放失败，请检查服务返回格式和系统音量' }
          previewAudio.onended = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = null }
          await previewAudio.play()
        }
        ttsTestResult.value = '语音已开始播放；请确认扬声器可以听到声音。'
      } catch (error) {
        if (!controller.signal.aborted) ttsTestResult.value = `测试失败：${error.message}`
      } finally {
        if (ttsController === controller) ttsTesting.value = false
      }
    }
    watch(() => form.ttsEngine, () => {
      form.ttsVoice = ''
      ttsTestResult.value = ''
      stopTtsTest()
      ttsTesting.value = false
    })
    let editingModelId = form.selectedModel
    let connectionController = null
    const cityResults = ref([])
    const showCityDropdown = ref(false)

    const isLocalProvider = computed(() => isLocalModel(form.selectedModel))

    const modelNamePlaceholder = computed(() => {
      const presets = getModelPresets()
      const preset = presets.find(p => p.id === form.selectedModel)
      return preset?.defaultModel ?? 'gpt-4o-mini'
    })

    const profileSummary = computed(() => {
      const profile = analyzeUserProfile()
      return {
        artistList: profile.topArtists.length > 0 ? profile.topArtists : [],
        genreList: profile.genreTags.length > 0 ? profile.genreTags : [],
        genreDist: profile.genreDistribution?.length ? profile.genreDistribution : [],
        artistDist: profile.artistDistribution?.length ? profile.artistDistribution : [],
        moodList: profile.moodTags?.length ? profile.moodTags : [],
        langList: profile.langTags?.length ? profile.langTags : [],
        sampleCount: profile.sampleCount,
        autoArtists: profile.automaticArtists,
        automaticGenres: profile.genreDistribution.map(g => g.name),
        genreHints: profile.inferredGenreTags,
        timeSongs: profile.timePeriodSongs,
        knownGenreCount: profile.knownGenreCount,
        analyzedSongCount: profile.analyzedSongCount,
        listeningCount: profile.listeningCount,
        updatedAt: profile.lastAnalyzedTime,
      }
    })

    // 用户可编辑标签
    const editableTags = ref(getUserTags())
    const newGenreTag = ref('')
    const newArtistTag = ref('')

    const addTag = (type) => {
      const input = type === 'genres' ? newGenreTag.value : newArtistTag.value
      const tag = input.trim()
      if (!tag) return
      const list = editableTags.value[type]
      if (!list.includes(tag)) {
        list.push(tag)
        const key = type === 'genres' ? 'excludedGenres' : 'excludedArtists'
        editableTags.value[key] = (editableTags.value[key] ?? []).filter(t => t.toLowerCase() !== tag.toLowerCase())
        saveUserTags(editableTags.value)
      }
      if (type === 'genres') newGenreTag.value = ''
      else newArtistTag.value = ''
    }

    const ignoreProfileTag = (type, tag) => {
      setProfileTagExcluded(type, tag, true)
      editableTags.value = getUserTags()
    }
    const restoreProfileTag = (type, tag) => {
      setProfileTagExcluded(type, tag, false)
      editableTags.value = getUserTags()
    }
    const removeTag = (type, index) => { ignoreProfileTag(type, editableTags.value[type][index]) }
    const confirmGenre = (genre) => {
      newGenreTag.value = genre
      addTag('genres')
    }

    watch(
      () => props.visible,
      (newVal) => {
        if (newVal) {
          Object.assign(form, djSettings, { modelList: djSettings.modelList.map(model => ({ ...model })) })
          editingModelId = form.selectedModel
          showCityDropdown.value = false
          showPopularCity.value = false
          testResult.value = null
          editableTags.value = getUserTags()
          newGenreTag.value = ''
          newArtistTag.value = ''
          if (isLocalModel(form.selectedModel)) void scanLocalModels()
        }
      },
    )

    const onCityInput = () => {
      if (searchTimer) clearTimeout(searchTimer)
      searchTimer = setTimeout(() => {
        const query = form.city.trim()
        const seq = ++citySearchSeq
        if (!query) {
          cityResults.value = []
          showCityDropdown.value = false
          return
        }
        searchCities(query).then(results => {
          if (seq !== citySearchSeq || query !== form.city.trim()) return
          cityResults.value = results
          showCityDropdown.value = results.length > 0
        }).catch(() => {})
      }, 300)
    }

    const onCityFocus = () => {
      if (form.city.trim()) onCityInput()
    }

    const selectCity = (cityItem) => {
      form.city = cityItem.name
      showCityDropdown.value = false
    }

    /** 将当前填写的配置缓存到 modelList（切换模型前调用，防止 key 丢失） */
    const cacheCurrentModelConfig = () => {
      if (!form.modelList || !Array.isArray(form.modelList)) return
      const currentId = editingModelId
      const target = form.modelList.find(m => m.id === currentId)
      const cfg = {
        id: currentId,
        name: currentId,
        baseUrl: form.baseUrl,
        modelName: form.customModelName,
        apiKey: form.apiKey,
      }
      if (target) {
        Object.assign(target, cfg)
      } else {
        form.modelList.push(cfg)
      }
    }

    /** 从 modelList 加载目标模型的配置（含 API Key），用户已自定义过的配置优先 */
    const applyModelConfig = (presetId) => {
      const presets = getModelPresets()
      const preset = presets.find(p => p.id === presetId)
      const savedModel = form.modelList?.find(m => m.id === presetId)
      const savedBaseUrl = savedModel?.baseUrl ?? ''
      const presetBaseUrl = preset?.defaultBaseUrl ?? ''
      const savedModelName = savedModel?.modelName ?? ''
      const presetModelName = preset?.defaultModel ?? ''
      form.baseUrl = savedBaseUrl || presetBaseUrl
      form.customModelName = savedModelName || presetModelName
      form.apiKey = savedModel?.apiKey ?? ''
      form.localAiModel = ''
      form.activeModel = ''
      editingModelId = presetId
      testResult.value = null
      connectionController?.abort()
    }

    const onModelSelectChange = () => {
      // 切换前先缓存当前模型的配置
      cacheCurrentModelConfig()
      connectionController?.abort()
      testResult.value = null
      applyModelConfig(form.selectedModel)
      if (isLocalModel(form.selectedModel)) void scanLocalModels()
    }

    /** 快速填入模型预设 */
    const applyQuickPreset = (presetId) => {
      // 切换前先缓存当前模型的配置
      cacheCurrentModelConfig()
      form.selectedModel = presetId
      applyModelConfig(presetId)
      if (isLocalModel(presetId)) void scanLocalModels()
    }

    const detectingLocal = ref(false)
    const localDiscoveredModels = ref([])
    const detectStatusText = ref('')

    const scanLocalModels = async() => {
      detectingLocal.value = true
      detectStatusText.value = '正在探测本地 Ollama (11434) 和 LM Studio (1234)...'
      try {
        const statuses = await detectAllLocalEngines()
        const allModels = []
        let onlineCount = 0
        statuses.forEach((s) => {
          if (s.online) {
            onlineCount++
            allModels.push(...s.models)
          }
        })
        localDiscoveredModels.value = allModels
        if (onlineCount > 0 && allModels.length > 0) {
          detectStatusText.value = `已探测到 ${onlineCount} 个本地引擎，共 ${allModels.length} 个可用模型`
        } else if (onlineCount > 0) {
          detectStatusText.value = '本地引擎在线，但尚未下载任何模型 (可在终端运行 ollama pull <model>)'
        } else {
          detectStatusText.value = '未检测到运行中的 Ollama 或 LM Studio，请先在本地启动服务'
        }
      } catch (err) {
        detectStatusText.value = `探测异常: ${err.message}`
      } finally {
        detectingLocal.value = false
      }
    }

    const selectDiscoveredModel = (m) => {
      cacheCurrentModelConfig()
      form.selectedModel = m.source
      applyModelConfig(m.source)
      form.customModelName = m.id
      form.localAiModel = m.id
      form.apiKey = ''
    }

    /** 恢复默认 prompt */
    const resetField = (mode, key) => {
      const defaultVal = defaultDjPrompts[key]
      if (defaultVal !== undefined) {
        form[key] = defaultVal
      }
    }

    /** 清空日志 */
    const clearLogs = () => {
      clearProfileLogs()
    }

    /** 导出 DJ 数据（设置 + 历史 + 画像） */
    const exportDjData = () => {
      void openSaveDir({
        title: '导出 AI 电台配置',
        defaultPath: 'ai_dj_data.json',
        filters: [{ name: 'JSON', extensions: ['json'] }],
      }).then(result => {
        if (result.canceled || !result.filePath) return
        void window.lx.worker.main.saveLxConfigFile(result.filePath, getDjBackupData())
      })
    }

    /** 导入 DJ 数据 */
    const importDjData = () => {
      void showSelectDialog({
        title: '导入 AI 电台配置',
        properties: ['openFile'],
        filters: [
          { name: 'JSON', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      }).then(result => {
        if (result.canceled || !result.filePaths?.length) return
        void dialog.confirm({
          message: '导入后将覆盖当前 AI 电台的设置、历史记录与画像，确定继续吗？',
          cancelButtonText: '取消',
          confirmButtonText: '确定导入',
        }).then(confirm => {
          if (!confirm) return
          void window.lx.worker.main.readLxConfigFile(result.filePaths[0]).then(async data => {
            if (await applyDjBackupData(data)) {
              Object.assign(form, djSettings, { modelList: djSettings.modelList.map(model => ({ ...model })) })
              editingModelId = form.selectedModel
            } else {
              void dialog({ message: '导入失败：文件格式不正确' })
            }
          })
        })
      })
    }

    /** 测试连接 */
    const testConnection = async() => {
      if (testing.value) return
      testing.value = true
      testResult.value = null
      const controller = new AbortController()
      connectionController = controller
      const timer = setTimeout(() => { controller.abort() }, 15000)
      try {
        await completeModelText({ ...form }, '请简短回复：连接成功', controller.signal)
        if (!controller.signal.aborted) testResult.value = { ok: true, msg: '连接成功，模型已返回响应' }
      } catch (err) {
        if (connectionController !== controller || !props.visible) return
        testResult.value = { ok: false, msg: controller.signal.aborted ? '测试已取消或超时，请检查服务地址' : `连接失败：${err.message}` }
      } finally {
        clearTimeout(timer)
        if (connectionController === controller) connectionController = null
        testing.value = false
      }
    }

    const close = () => {
      voiceCatalogController?.abort()
      stopTtsTest()
      ttsTesting.value = false
      connectionController?.abort()
      if (searchTimer) {
        clearTimeout(searchTimer)
        searchTimer = null
      }
      citySearchSeq++
      showCityDropdown.value = false
      showPopularCity.value = false
      connectionController = null
      emit('update:visible', false)
    }

    onUnmounted(() => {
      voiceCatalogController?.abort()
      stopTtsTest()
      connectionController?.abort()
      if (searchTimer) clearTimeout(searchTimer)
      citySearchSeq++
    })

    const save = async() => {
      showCityDropdown.value = false
      showPopularCity.value = false
      const selectedPreset = form.selectedModel === 'custom'
        ? null
        : (getModelPresets().find(p => p.id === form.selectedModel) ?? null)
      const presetModel = selectedPreset?.defaultModel ?? ''
      const activeModel = form.selectedModel === 'custom'
        ? form.customModelName
        : (form.customModelName || presetModel || form.selectedModel)
      form.activeModel = activeModel

      // 将当前 API Key 保存到对应模型配置中，便于下次切换时恢复
      if (form.modelList && Array.isArray(form.modelList)) {
        const target = form.modelList.find(m => m.id === form.selectedModel)
        if (target) {
          target.apiKey = form.apiKey
        } else {
          form.modelList.push({
            id: form.selectedModel,
            name: form.selectedModel,
            baseUrl: form.baseUrl,
            modelName: activeModel,
            apiKey: form.apiKey,
          })
        }
      }

      cacheCurrentModelConfig()
      try { await saveDjSettings(form) } catch {
        testResult.value = { ok: false, msg: '密钥保存失败，原配置已保留，请重试' }
        return
      }
      emit('save', { ...form })
      close()
    }

    return {
      weatherTesting,
      weatherTestResult,
      testWeather,
      activeCategory,
      credentialStorage,
      categories,
      form,
      logs: profileLogs,
      cityResults,
      showCityDropdown,
      showApiKey,
      showPopularCity,
      popularCities,
      quickPresets,
      djPromptFields,
      chatPromptFields,
      volcengineVoices,
      visibleVolcengineVoices,
      voiceCatalogQuery,
      voiceCatalogLoading,
      voiceCatalogStatus,
      refreshVoiceCatalog,
      ttsTesting,
      ttsTestResult,
      testTts,
      ttsChannels,
      ttsChannelHint,
      needsApiKey,
      voicePlaceholder,
      testing,
      testResult,
      modelNamePlaceholder,
      isLocalProvider,
      profileSummary,
      ignoreProfileTag,
      restoreProfileTag,
      confirmGenre,
      editableTags,
      newGenreTag,
      newArtistTag,
      addTag,
      removeTag,
      onCityInput,
      onCityFocus,
      selectCity,
      onModelSelectChange,
      applyQuickPreset,
      detectingLocal,
      localDiscoveredModels,
      detectStatusText,
      scanLocalModels,
      selectDiscoveredModel,
      resetField,
      clearLogs,
      exportDjData,
      importDjData,
      testConnection,
      close,
      save,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(6px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  width: min(760px, 94vw);
  height: min(680px, 90vh);
  background: var(--color-content-background);
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
  border: 1px solid var(--color-primary-light-400-alpha-500);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-primary-light-400-alpha-400);

  h3 { margin: 0; font-size: 16px; color: var(--color-primary); }
}

.closeBtn {
  border: none;
  background: transparent;
  font-size: 18px;
  color: var(--color-font-label);
  cursor: pointer;
  &:hover { color: var(--color-font); }
}

.body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.menuSidebar {
  width: 160px;
  flex: none;
  background: var(--color-primary-light-900-alpha-300);
  border-right: 1px solid var(--color-primary-light-500-alpha-300);
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.menuItem {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--color-font-label);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: all @transition-fast;

  &:hover {
    background: var(--color-primary-light-800-alpha-400);
    color: var(--color-font);
  }

  &.activeMenuItem {
    background: var(--color-primary-light-700-alpha-600);
    color: var(--color-primary);
    font-weight: 600;
  }
}

.contentPanel {
  min-width: 0;
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sectionTitle {
  margin: 0 0 4px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-primary);
  border-bottom: 1px solid var(--color-primary-light-500-alpha-300);
  padding-bottom: 6px;
}

.subTitle {
  margin: 12px 0 6px 0;
  font-size: 13.5px;
  color: var(--color-primary);
}

.formGroup {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label { font-size: 13px; font-weight: 500; color: var(--color-font); }
}

.fieldTip {
  font-size: 12px;
  color: var(--color-font-label);
  margin: 0;
}

.input, .select, .textarea {
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid var(--color-primary-light-400-alpha-600);
  background: var(--color-content-background);
  color: var(--color-font);
  outline: none;
  font-size: 13px;
  font-family: inherit;
  transition: border-color @transition-fast, box-shadow @transition-fast;

  &:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-light-800-alpha-500);
  }
}

.textarea { line-height: 1.5; resize: vertical; }

/* 输入框 + 按钮组合 */
.inputWithBtn {
  display: flex;
  gap: 6px;
  align-items: stretch;

  .input { flex: 1; }
}

.iconBtn {
  flex: none;
  width: 36px;
  border-radius: 8px;
  border: 1px solid var(--color-primary-light-400-alpha-600);
  background: var(--color-primary-light-900-alpha-300);
  color: var(--color-font);
  font-size: 13px;
  cursor: pointer;
  transition: all @transition-fast;

  &:hover {
    background: var(--color-primary-light-800-alpha-400);
    border-color: var(--color-primary);
  }
}

/* 快速预设 */
.quickPresets {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.quickLabel { font-size: 12px; color: var(--color-font-label); }

.quickBtn {
  padding: 4px 12px;
  border-radius: 14px;
  border: 1px dashed var(--color-primary-light-400-alpha-600);
  background: transparent;
  color: var(--color-primary);
  font-size: 12px;
  cursor: pointer;
  transition: all @transition-fast;

  &:hover, &.quickBtnActive {
    background: var(--color-primary);
    color: #fff;
    border-style: solid;
  }
}

.connectionRow {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* 本地模型探测面板 */
.localEngineBox {
  margin-top: 10px;
  padding: 10px 14px;
  background: var(--color-primary-light-900-alpha-200);
  border-radius: 10px;
  border: 1px solid var(--color-primary-light-400-alpha-400);
}

.localEngineHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
}

.detectBtn {
  padding: 4px 10px;
  border-radius: 12px;
  border: none;
  background: var(--color-primary);
  color: #fff;
  font-size: 11px;
  cursor: pointer;
  transition: all @transition-fast;

  &:hover {
    opacity: 0.9;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.discoveredChips {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.discoveredLabel {
  font-size: 11.5px;
  color: var(--color-font-label);
  width: 100%;
}

.discoveredChip {
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid var(--color-primary);
  background: transparent;
  color: var(--color-primary);
  font-size: 11px;
  cursor: pointer;
  transition: all @transition-fast;

  &:hover {
    background: var(--color-primary);
    color: #fff;
  }
}

.activeDiscoveredChip {
  background: var(--color-primary);
  color: #fff;
}

.detectStatusTip {
  margin-top: 6px;
  font-size: 11.5px;
  color: var(--color-font-label);
}

/* 测试连接 */
.testBtn {
  align-self: flex-start;
  padding: 6px 14px;
  border-radius: 6px;
  border: none;
  background: var(--color-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity @transition-fast;

  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.testResult { font-size: 12px; }
.testOk { color: #2ecc71; }
.testFail { color: #e74c3c; }

/* 标签行（label + 恢复默认） */
.labelRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;

  label { font-size: 13px; font-weight: 500; color: var(--color-font); }
}

.resetBtn {
  border: none;
  background: transparent;
  color: var(--color-font-label);
  font-size: 11.5px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  white-space: nowrap;
  transition: all @transition-fast;

  &:hover {
    color: var(--color-primary);
    background: var(--color-primary-light-800-alpha-400);
  }
}

/* 两列布局 */
.twoCol {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* Switch 开关列表 */
.switchList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.switchItem {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: var(--color-primary-light-900-alpha-300);
  border-radius: 10px;
  border: 1px solid var(--color-primary-light-500-alpha-300);
}

.switchText {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.switchTitle { font-size: 13px; font-weight: 500; color: var(--color-font); }
.switchDesc { font-size: 11.5px; color: var(--color-font-label); }

.switch {
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 11px;
  border: none;
  background: var(--color-font-label);
  opacity: 0.4;
  cursor: pointer;
  transition: background @transition-fast, opacity @transition-fast;
  flex: none;

  &.switchOn {
    background: var(--color-primary);
    opacity: 1;

    .switchThumb {
      transform: translateX(18px);
    }
  }
}

.switchThumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform @transition-fast;
}

/* 常用城市 */
.popularCities {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cityChip {
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid var(--color-primary-light-400-alpha-500);
  background: var(--color-primary-light-900-alpha-300);
  color: var(--color-font);
  font-size: 12px;
  cursor: pointer;
  transition: all @transition-fast;

  &:hover {
    background: var(--color-primary);
    color: #fff;
    border-color: var(--color-primary);
  }
}

/* 用户画像卡片 */
.profileCard {
  padding: 14px;
  background: var(--color-primary-light-900-alpha-300);
  border-radius: 12px;
  border: 1px solid var(--color-primary-light-500-alpha-300);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profileBlock {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.profileLabel {
  font-size: 12.5px;
  color: var(--color-font-label);
  font-weight: 500;
}

.profileSample {
  font-size: 12.5px;
  color: var(--color-font);
}

.tagCloud {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 3px 10px;
  border-radius: 12px;
  background: var(--color-primary);
  color: #fff;
  font-size: 12px;
}

.tagEditable {
  cursor: pointer;
  transition: all @transition-fast;

  &:hover {
    background: #e74c3c;
    text-decoration: line-through;
  }
}

.tagEmpty {
  font-size: 12px;
  color: var(--color-font-label);
}

.tagInputRow {
  display: flex;
  gap: 6px;
  margin-top: 4px;

  .input { flex: 1; }
}

/* 导入导出 */
.backupRow {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 4px;
}

.exportBtn, .importBtn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid var(--color-primary-light-400-alpha-600);
  background: var(--color-primary-light-800-alpha-400);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all @transition-fast;

  &:hover {
    background: var(--color-primary);
    color: #fff;
  }
}

.backupTip {
  font-size: 11.5px;
  color: var(--color-font-label);
}

.addTagBtn {
  flex: none;
  padding: 0 12px;
  border-radius: 8px;
  border: none;
  background: var(--color-primary-light-800-alpha-500);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all @transition-fast;

  &:hover {
    background: var(--color-primary);
    color: #fff;
  }
}

/* 曲风占比条 */
.distList {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.distItem {
  display: flex;
  align-items: center;
  gap: 10px;
}

.distName {
  flex: none;
  width: 56px;
  font-size: 12px;
  color: var(--color-font);
  text-align: right;
}

.distBarWrap {
  flex: 1;
  height: 8px;
  background: var(--color-primary-light-800-alpha-400);
  border-radius: 4px;
  overflow: hidden;
}

.distBar {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light-300-alpha-600));
  transition: width 0.4s ease;
}

.distPct {
  flex: none;
  width: 40px;
  font-size: 11.5px;
  color: var(--color-primary);
  font-weight: 600;
}

.tagMood {
  background: #e67e22;
}

.tagLang {
  background: #16a085;
}

.logHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logEmpty {
  font-size: 12px;
  color: var(--color-font-label);
  text-align: center;
  padding: 8px;
}

.cityDropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--color-content-background);
  border: 1px solid var(--color-primary-light-400-alpha-600);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  max-height: 200px;
  overflow-y: auto;
  z-index: 999;
  margin-top: 4px;
  padding: 4px;
}

.cityDropdownItem {
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background @transition-fast;

  &:hover {
    background: var(--color-primary-light-800-alpha-400);
    .cityName { color: var(--color-primary); }
  }
}

.cityName { font-weight: 600; font-size: 13px; color: var(--color-font); }
.cityRegion { font-size: 11.5px; color: var(--color-font-label); }

.sliderRow {
  display: flex;
  align-items: center;
  gap: 12px;

  span { font-size: 13px; font-weight: 600; color: var(--color-primary); }
}

.slider { flex: 1; cursor: pointer; accent-color: var(--color-primary); }

.logTimeline {
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--color-primary-light-900-alpha-200);
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--color-primary-light-400-alpha-400);
}

.logItem {
  display: flex;
  gap: 10px;
  font-size: 12px;
}

.logTime { color: var(--color-font-label); font-family: monospace; }

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 24px;
  border-top: 1px solid var(--color-primary-light-400-alpha-400);
  background: var(--color-primary-light-900-alpha-200);
}

.cancelBtn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--color-primary-light-400-alpha-600);
  background: transparent;
  color: var(--color-font);
  cursor: pointer;
}

.saveBtn {
  padding: 8px 20px;
  border-radius: 8px;
  border: none;
  background: var(--color-primary);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.modal button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
@media (max-width: 760px) {
  .menuSidebar { width: 120px; padding: 12px 6px; }
  .contentPanel { padding: 16px; }
  .menuItem { padding: 10px 6px; font-size: 12px; }
  .localEngineHeader { flex-wrap: wrap; gap: 8px; }
}
.advancedSettings { border-top: 1px solid var(--color-primary-alpha-200); padding-top: 12px; summary { cursor: pointer; font-size: 12px; color: var(--color-font-label); padding-bottom: 12px; } > div { margin-bottom: 16px; } }

.artistEvidence { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: 8px 0; }
.artistEvidence .distName { width: auto; max-width: 100%; text-align: left; overflow-wrap: anywhere; }
.artistEvidence .fieldTip { margin: 0; flex: 1; min-width: 160px; }
.periodGroup { margin: 8px 0; border: 1px solid var(--color-primary-alpha-200); border-radius: 8px; padding: 8px 10px; }
.periodGroup summary { cursor: pointer; font-size: 12px; color: var(--color-font); }
.periodSong { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0 0; font-size: 12px; line-height: 1.5; }
.periodSong small { color: var(--color-font-label); }

</style>
