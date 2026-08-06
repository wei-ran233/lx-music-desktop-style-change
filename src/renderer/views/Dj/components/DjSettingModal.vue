<template>
  <div v-if="visible" :class="$style.overlay" @click.self="close">
    <div :class="$style.modal">
      <div :class="$style.header">
        <h3>⚙️ AI 电台设置</h3>
        <button :class="$style.closeBtn" @click="close">✕</button>
      </div>

      <div :class="$style.body">
        <div :class="$style.menuSidebar">
          <button
            v-for="cat in categories"
            :key="cat.id"
            :class="[$style.menuItem, { [$style.activeMenuItem]: activeCategory === cat.id }]"
            @click="activeCategory = cat.id"
          >
            <span>{{ cat.icon }}</span>
            <span>{{ cat.name }}</span>
          </button>
        </div>

        <div :class="$style.contentPanel" class="scroll">
          <!-- 🤖 模型与 API -->
          <div v-if="activeCategory === 'llm'" :class="$style.section">
            <h4 :class="$style.sectionTitle">🤖 模型与 API</h4>

            <div :class="$style.formGroup">
              <label>选择 AI 模型</label>
              <select v-model="form.selectedModel" :class="$style.select" @change="onModelSelectChange">
                <option value="openai-compatible">OpenAI 兼容接口（通用）</option>
                <option value="deepseek">DeepSeek (深度求索)</option>
                <option value="glm-4.7-flash">智谱 GLM-4.7-Flash</option>
                <option value="qwen-turbo">阿里通义千问 Qwen-Turbo</option>
                <option value="custom">⚙️ 自定义模型</option>
              </select>
            </div>

            <!-- 快速预设 -->
            <div :class="$style.quickPresets">
              <span :class="$style.quickLabel">快速填入：</span>
              <button v-for="p in quickPresets" :key="p.id" :class="$style.quickBtn" @click="applyQuickPreset(p.id)">
                {{ p.label }}
              </button>
            </div>

            <div :class="$style.formGroup">
              <label>API Base URL</label>
              <input v-model="form.baseUrl" type="text" placeholder="https://api.openai.com/v1/" :class="$style.input" />
              <p :class="$style.fieldTip">任何 OpenAI 兼容接口的 API 地址</p>
            </div>

            <div :class="$style.formGroup">
              <label>模型名称</label>
              <input v-model="form.customModelName" type="text" :placeholder="modelNamePlaceholder" :class="$style.input" />
            </div>

            <div :class="$style.formGroup">
              <label>API Key</label>
              <div :class="$style.inputWithBtn">
                <input
                  v-model="form.apiKey"
                  :type="showApiKey ? 'text' : 'password'"
                  placeholder="输入你的 API Key"
                  :class="$style.input"
                />
                <button :class="$style.iconBtn" type="button" @click="showApiKey = !showApiKey">
                  {{ showApiKey ? '🙈' : '👁️' }}
                </button>
              </div>
              <button :class="$style.testBtn" :disabled="testing" @click="testConnection">
                {{ testing ? '测试中...' : '🧪 测试连接' }}
              </button>
              <span v-if="testResult" :class="[$style.testResult, testResult.ok ? $style.testOk : $style.testFail]">
                {{ testResult.msg }}
              </span>
            </div>

            <div :class="$style.formGroup">
              <label>请求并发限制</label>
              <div :class="$style.sliderRow">
                <input v-model.number="form.concurrencyLimit" type="range" min="1" max="10" :class="$style.slider" />
                <span>{{ form.concurrencyLimit }} 次</span>
              </div>
              <p :class="$style.fieldTip">值越大响应越快，但更易触发 API 频控</p>
            </div>
          </div>

          <!-- 📻 DJ 人设 -->
          <div v-if="activeCategory === 'djPrompt'" :class="$style.section">
            <h4 :class="$style.sectionTitle">🎧 DJ 模式人设</h4>
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

          <!-- 💬 聊天人设 -->
          <div v-if="activeCategory === 'chatPrompt'" :class="$style.section">
            <h4 :class="$style.sectionTitle">💬 聊天模式人设</h4>
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

          <!-- 🗣️ 语音播报 -->
          <div v-if="activeCategory === 'tts'" :class="$style.section">
            <h4 :class="$style.sectionTitle">🗣️ 语音播报</h4>

            <!-- 渠道选择（类似模型选择器） -->
            <div :class="$style.formGroup">
              <label>选择播报渠道</label>
              <select v-model="form.ttsEngine" :class="$style.select">
                <option v-for="ch in ttsChannels" :key="ch.id" :value="ch.id">{{ ch.label }}</option>
              </select>
              <p :class="$style.fieldTip">{{ ttsChannelHint }}</p>
            </div>

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
            <div v-if="form.ttsEngine !== 'web-speech' && form.ttsEngine !== 'youdao-tts'" :class="$style.twoCol">
              <div :class="$style.formGroup">
                <label>语速 {{ form.ttsSpeed }}x</label>
                <input v-model.number="form.ttsSpeed" type="range" min="0.5" max="2" step="0.1" :class="$style.slider" />
              </div>
              <div :class="$style.formGroup">
                <label>音调 {{ form.ttsPitch }}x</label>
                <input v-model.number="form.ttsPitch" type="range" min="0.5" max="2" step="0.1" :class="$style.slider" />
              </div>
            </div>

            <!-- Switch 风格开关 -->
            <div :class="$style.switchList">
              <div :class="$style.switchItem">
                <div :class="$style.switchText">
                  <span :class="$style.switchTitle">💬 聊天播报</span>
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
                  <span :class="$style.switchTitle">🎧 DJ 串场播报</span>
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
                  <span :class="$style.switchTitle">🎵 自动连播</span>
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
                  <span :class="$style.switchTitle">🎧 推荐即播</span>
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

          <!-- 🌤️ 天气设置 -->
          <div v-if="activeCategory === 'weather'" :class="$style.section">
            <h4 :class="$style.sectionTitle">🌤️ 环境与天气</h4>

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
                  🏙️
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
          </div>

          <!-- 📊 用户画像 -->
          <div v-if="activeCategory === 'profile'" :class="$style.section">
            <h4 :class="$style.sectionTitle">📊 用户品味画像</h4>
            <p :class="$style.fieldTip">下方标签由本地分析生成，你也可以手动添加/删除来微调推荐偏好。</p>

            <div :class="$style.profileCard">
              <div :class="$style.profileBlock">
                <div :class="$style.profileLabel">🎵 主打曲风（可编辑）</div>
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
                <div :class="$style.profileLabel">🎤 偏爱歌手（可编辑）</div>
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
                <div :class="$style.profileLabel">📊 曲风占比</div>
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
                <div :class="$style.profileLabel">🎭 情绪倾向</div>
                <div :class="$style.tagCloud">
                  <span v-for="(m, i) in profileSummary.moodList" :key="'m-' + i" :class="[$style.tag, $style.tagMood]">{{ m }}</span>
                  <span v-if="!profileSummary.moodList.length" :class="$style.tagEmpty">暂无</span>
                </div>
                <div :class="$style.profileLabel" style="margin-top: 8px;">🌐 语种偏好</div>
                <div :class="$style.tagCloud">
                  <span v-for="(l, i) in profileSummary.langList" :key="'l-' + i" :class="[$style.tag, $style.tagLang]">{{ l }}</span>
                  <span v-if="!profileSummary.langList.length" :class="$style.tagEmpty">暂无</span>
                </div>
              </div>

              <div :class="$style.profileBlock">
                <div :class="$style.profileLabel">📚 学习样本</div>
                <div :class="$style.profileSample">已分析 "我的喜爱" 歌单 {{ profileSummary.sampleCount }} 首歌曲</div>
              </div>
            </div>

            <div :class="$style.logHeader">
              <h5 :class="$style.subTitle">📜 偏好学习日志</h5>
              <button :class="$style.resetBtn" type="button" @click="clearLogs">🗑️ 清空日志</button>
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
              <button :class="$style.exportBtn" type="button" @click="exportDjData">📤 导出配置</button>
              <button :class="$style.importBtn" type="button" @click="importDjData">📥 导入配置</button>
              <span :class="$style.backupTip">备份/恢复 AI 电台的全部设置、历史记录与画像</span>
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
</template>

<script>
import { ref, reactive, computed, watch } from '@common/utils/vueTools'
import { djSettings, saveDjSettings, profileLogs, clearProfileLogs, getDjBackupData, applyDjBackupData } from '@renderer/store/dj'
import { searchCities } from '@renderer/utils/dj/weatherService'
import { analyzeUserProfile, getUserTags, saveUserTags } from '@renderer/utils/dj/userProfile'
import { getModelPresets } from '@renderer/utils/dj/llmService'
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
  props: {
    visible: { type: Boolean, default: false },
  },
  emits: ['update:visible', 'save'],
  setup(props, { emit }) {
    const activeCategory = ref('llm')
    const showApiKey = ref(false)
    const showPopularCity = ref(false)
    const testing = ref(false)
    const testResult = ref(null)
    let searchTimer = null

    const categories = [
      { id: 'llm', name: '模型与 API', icon: '🤖' },
      { id: 'djPrompt', name: 'DJ 人设', icon: '📻' },
      { id: 'chatPrompt', name: '聊天人设', icon: '💬' },
      { id: 'tts', name: '语音播报', icon: '🗣️' },
      { id: 'weather', name: '天气设置', icon: '🌤️' },
      { id: 'profile', name: '用户画像', icon: '📊' },
    ]

    const quickPresets = [
      { id: 'deepseek', label: 'DeepSeek' },
      { id: 'glm-4.7-flash', label: '智谱 GLM' },
      { id: 'qwen-turbo', label: '通义千问' },
    ]

    const popularCities = ['北京', '上海', '广州', '深圳', '成都', '杭州', '西安', '武汉']

    const ttsChannels = [
      { id: 'web-speech', label: '🖥️ 本地语音（免 Key）', hint: '使用浏览器系统语音，无需任何配置，音色取决于操作系统' },
      { id: 'youdao-tts', label: '📖 有道翻译语音（免 Key）', hint: '免费无需 Key，音质一般但零成本，适合快速播报' },
      { id: 'azure-tts', label: '☁️ Azure 神经语音', hint: '微软云神经语音，音质自然，需 Azure 订阅 Key 和区域' },
      { id: 'openai-tts', label: '🔵 OpenAI TTS', hint: 'OpenAI tts-1 模型，需 OpenAI API Key' },
      { id: 'iflytek-tts', label: '🗣️ 讯飞 TTS', hint: '科大讯飞语音合成，需开放平台 AppID + ApiKey + ApiSecret' },
      { id: 'volcengine-tts', label: '🌋 火山引擎 TTS', hint: '字节跳动语音合成，需火山引擎 AppID 和 Access Token' },
      { id: 'custom-tts', label: '🛠️ 自定义 TTS', hint: '对接任意 OpenAI 兼容的 TTS 服务地址' },
    ]

    const ttsChannelsMap = Object.fromEntries(ttsChannels.map(c => [c.id, c]))
    const ttsChannelHint = computed(() => ttsChannelsMap[form.ttsEngine]?.hint ?? '')
    const needsApiKey = computed(() => {
      return ['openai-tts', 'azure-tts', 'volcengine-tts', 'iflytek-tts'].includes(form.ttsEngine)
    })
    const voicePlaceholder = computed(() => {
      switch (form.ttsEngine) {
        case 'azure-tts': return 'zh-CN-XiaoxiaoNeural'
        case 'iflytek-tts': return 'xiaoyan'
        case 'volcengine-tts': return 'BV001_streaming'
        case 'openai-tts': return 'alloy'
        default: return 'zh-CN-XiaoxiaoNeural'
      }
    })

    const djPromptFields = [
      { key: 'djPromptRole', label: '🎭 角色设定', rows: 3, placeholder: '设定 DJ 的性格与说话语气...' },
      { key: 'djPromptOpening', label: '🌅 开场白规则', rows: 2, placeholder: '结合城市天气、时间段的广播开场白...' },
      { key: 'djPromptSelection', label: '🎵 选歌逻辑', rows: 2, placeholder: '基于场景 BPM、曲风渐进的选歌算法...' },
      { key: 'djPromptRecommendation', label: '🗣️ 串词推荐', rows: 2, placeholder: '讲出歌曲创作背景与听感故事...' },
    ]

    const chatPromptFields = [
      { key: 'chatPromptRole', label: '🎭 角色设定', rows: 3, placeholder: '设定知心伙伴人设与倾听语气...' },
      { key: 'chatPromptOpening', label: '🌅 开场关怀', rows: 2, placeholder: '如何根据时间发起关怀问候...' },
      { key: 'chatPromptSelection', label: '🎵 情绪推歌', rows: 2, placeholder: '根据用户情绪状态推荐歌曲...' },
      { key: 'chatPromptRecommendation', label: '🗣️ 乐评交流', rows: 2, placeholder: '与用户就音乐审美展开交流...' },
    ]

    const form = reactive({ ...djSettings })
    const cityResults = ref([])
    const showCityDropdown = ref(false)

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
        saveUserTags(editableTags.value)
      }
      if (type === 'genres') newGenreTag.value = ''
      else newArtistTag.value = ''
    }

    const removeTag = (type, index) => {
      editableTags.value[type].splice(index, 1)
      saveUserTags(editableTags.value)
    }

    watch(
      () => props.visible,
      (newVal) => {
        if (newVal) {
          Object.assign(form, djSettings)
          showCityDropdown.value = false
          showPopularCity.value = false
          testResult.value = null
          editableTags.value = getUserTags()
          newGenreTag.value = ''
          newArtistTag.value = ''
        }
      },
    )

    const onCityInput = () => {
      if (searchTimer) clearTimeout(searchTimer)
      searchTimer = setTimeout(() => {
        if (!form.city.trim()) {
          cityResults.value = []
          showCityDropdown.value = false
          return
        }
        searchCities(form.city).then(results => {
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
      const currentId = form.selectedModel
      const target = form.modelList.find(m => m.id === currentId)
      const cfg = {
        id: currentId,
        name: currentId,
        baseUrl: form.baseUrl,
        modelName: form.customModelName || currentId,
        apiKey: form.apiKey,
      }
      if (target) {
        Object.assign(target, cfg)
      } else {
        form.modelList.push(cfg)
      }
      // 持久化配置，确保重启后 API Key 缓存仍可用
      saveDjSettings({ ...djSettings, modelList: form.modelList })
    }

    /** 从 modelList 加载目标模型的配置（含 API Key） */
    const applyModelConfig = (presetId) => {
      const presets = getModelPresets()
      const preset = presets.find(p => p.id === presetId)
      if (preset) {
        form.baseUrl = preset.defaultBaseUrl
        form.customModelName = preset.defaultModel
      }
      const savedModel = form.modelList?.find(m => m.id === presetId)
      form.apiKey = savedModel?.apiKey ?? preset?.apiKey ?? ''
    }

    const onModelSelectChange = () => {
      // 切换前先缓存当前模型的配置
      cacheCurrentModelConfig()
      if (form.selectedModel === 'custom') {
        form.customModelName = ''
        form.apiKey = ''
        return
      }
      applyModelConfig(form.selectedModel)
    }

    /** 快速填入模型预设 */
    const applyQuickPreset = (presetId) => {
      // 切换前先缓存当前模型的配置
      cacheCurrentModelConfig()
      form.selectedModel = presetId
      applyModelConfig(presetId)
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
          void window.lx.worker.main.readLxConfigFile(result.filePaths[0]).then(data => {
            if (applyDjBackupData(data)) {
              Object.assign(form, djSettings)
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
      if (!form.apiKey.trim() || !form.baseUrl.trim()) {
        testResult.value = { ok: false, msg: '请先填写 API Key 和 Base URL' }
        return
      }
      testing.value = true
      testResult.value = null
      try {
        const baseUrl = form.baseUrl.endsWith('/') ? form.baseUrl : `${form.baseUrl}/`
        const modelName = form.selectedModel === 'custom' ? form.customModelName : form.customModelName
        const response = await fetch(`${baseUrl}chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${form.apiKey}`,
          },
          body: JSON.stringify({
            model: modelName || 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 5,
          }),
          signal: AbortSignal.timeout(10000),
        })
        if (response.ok) {
          testResult.value = { ok: true, msg: '✅ 连接成功，配置可用' }
        } else {
          testResult.value = { ok: false, msg: `❌ 连接失败 (HTTP ${response.status})` }
        }
      } catch (err) {
        testResult.value = { ok: false, msg: `❌ 请求异常: ${err.message}` }
      } finally {
        testing.value = false
      }
    }

    const close = () => {
      showCityDropdown.value = false
      showPopularCity.value = false
      emit('update:visible', false)
    }

    const save = () => {
      showCityDropdown.value = false
      showPopularCity.value = false
      const activeModel = form.selectedModel === 'custom'
        ? form.customModelName
        : (form.customModelName || form.selectedModel)
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

      saveDjSettings(form)
      emit('save', { ...form })
      close()
    }

    return {
      activeCategory,
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
      ttsChannels,
      ttsChannelHint,
      needsApiKey,
      voicePlaceholder,
      testing,
      testResult,
      modelNamePlaceholder,
      profileSummary,
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
  width: 700px;
  height: 600px;
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

  &:hover {
    background: var(--color-primary);
    color: #fff;
    border-style: solid;
  }
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
</style>
