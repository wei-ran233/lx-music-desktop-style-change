<template>
  <div v-if="visible" :class="$style.overlay" @click.self="close">
    <div :class="$style.modal">
      <!-- 弹窗顶部栏 -->
      <div :class="$style.header">
        <h3>⚙️ AI DJ 偏好与独立人设工坊</h3>
        <button :class="$style.closeBtn" @click="close">✕</button>
      </div>

      <!-- 弹窗分类菜单 + 内容双栏布局 -->
      <div :class="$style.body">
        <!-- 左侧 分类菜单列表 -->
        <div :class="$style.menuSidebar">
          <button
            v-for="cat in categories"
            :key="cat.id"
            :class="[$style.menuItem, { [$style.activeMenuItem]: activeCategory === cat.id }]"
            @click="activeCategory = cat.id"
          >
            <span :class="$style.menuIcon">{{ cat.icon }}</span>
            <span>{{ cat.name }}</span>
          </button>
        </div>

        <!-- 右侧 设置表单内容区 -->
        <div :class="$style.contentPanel" class="scroll">
          <!-- 📻 DJ 模式专属 Prompt 提示词工坊 -->
          <div v-if="activeCategory === 'djPrompt'" :class="$style.section">
            <h4 :class="$style.sectionTitle">🎧 DJ 模式专属 System Prompt 提示词工坊</h4>
            <p :class="$style.fieldTip">独立配置 DJ 广播模式下模型的电台主持人人设、调频开场白、选歌与串场推荐逻辑。</p>

            <div :class="$style.formGroup">
              <label>🎭 1. DJ 角色与电台风格设定 (Role & Personality)</label>
              <textarea
                v-model="form.djPromptRole"
                rows="3"
                placeholder="设定 DJ 的性格、说话语气与电台风格..."
                :class="$style.textarea"
              ></textarea>
            </div>

            <div :class="$style.formGroup">
              <label>🌅 2. 调频开场白规则 (Opening Greetings)</label>
              <textarea
                v-model="form.djPromptOpening"
                rows="3"
                placeholder="结合城市天气、时间段、节气与温度的广播开场白..."
                :class="$style.textarea"
              ></textarea>
            </div>

            <div :class="$style.formGroup">
              <label>🎵 3. 电台选歌逻辑与规则 (Music Selection Criteria)</label>
              <textarea
                v-model="form.djPromptSelection"
                rows="3"
                placeholder="基于场景 BPM、曲风渐进、气候情绪选歌算法..."
                :class="$style.textarea"
              ></textarea>
            </div>

            <div :class="$style.formGroup">
              <label>🗣️ 4. 音乐串词与故事推荐 (Music Pitching & Storytelling)</label>
              <textarea
                v-model="form.djPromptRecommendation"
                rows="3"
                placeholder="讲出歌曲创作背景、乐器编曲细节与听感故事..."
                :class="$style.textarea"
              ></textarea>
            </div>

            <div :class="$style.formGroup">
              <label>🧠 5. 用户电台偏好学习 (User Profile Strategy)</label>
              <textarea
                v-model="form.djPromptProfileLearning"
                rows="3"
                placeholder="如何根据用户收藏与播放历史建立专属调频频段画像..."
                :class="$style.textarea"
              ></textarea>
            </div>
          </div>

          <!-- 💬 聊天模式专属 Prompt 提示词工坊 -->
          <div v-if="activeCategory === 'chatPrompt'" :class="$style.section">
            <h4 :class="$style.sectionTitle">💬 聊天模式专属 System Prompt 提示词工坊</h4>
            <p :class="$style.fieldTip">独立配置聊天模式下模型的知心音乐伙伴人设、倾听共情方式与乐评交流风格。</p>

            <div :class="$style.formGroup">
              <label>🎭 1. 聊天伙伴角色与性格 (Role & Personality)</label>
              <textarea
                v-model="form.chatPromptRole"
                rows="3"
                placeholder="设定知心伴侣人设、倾听态度与温暖共情语气..."
                :class="$style.textarea"
              ></textarea>
            </div>

            <div :class="$style.formGroup">
              <label>🌅 2. 聊天互动与破冰开场 (Opening Greetings)</label>
              <textarea
                v-model="form.chatPromptOpening"
                rows="3"
                placeholder="如何根据时间、用户心情与日常感受自然发起关怀问候..."
                :class="$style.textarea"
              ></textarea>
            </div>

            <div :class="$style.formGroup">
              <label>🎵 3. 情绪共鸣与契合推歌 (Emotional Music Matching)</label>
              <textarea
                v-model="form.chatPromptSelection"
                rows="3"
                placeholder="根据用户倾诉的心事与情感状态推荐歌曲..."
                :class="$style.textarea"
              ></textarea>
            </div>

            <div :class="$style.formGroup">
              <label>🗣️ 4. 乐评交流与深度探讨 (Music Critique & Discussion)</label>
              <textarea
                v-model="form.chatPromptRecommendation"
                rows="3"
                placeholder="如何与用户就音乐审美、词曲意境、演唱技巧展开深度交流..."
                :class="$style.textarea"
              ></textarea>
            </div>

            <div :class="$style.formGroup">
              <label>🧠 5. 情感与审美画像学习 (Sentiment Profile Strategy)</label>
              <textarea
                v-model="form.chatPromptProfileLearning"
                rows="3"
                placeholder="如何记录用户的心理情感变化、喜爱的音乐情绪标签与生活习惯..."
                :class="$style.textarea"
              ></textarea>
            </div>
          </div>

          <!-- 📊 用户画像与分析日志 -->
          <div v-if="activeCategory === 'profileLogs'" :class="$style.section">
            <h4 :class="$style.sectionTitle">📊 用户品味画像与分析日志</h4>

            <!-- AI 深度长效画像卡片 -->
            <div :class="$style.aiProfileCard">
              <div :class="$style.aiProfileHeader">
                <span :class="$style.aiProfileTitle">🧠 AI 深度音乐审美与心理长效画像</span>
                <button type="button" :class="$style.generateAiProfileBtn" :disabled="isGeneratingProfile" @click="handleGenerateAiProfile">
                  {{ isGeneratingProfile ? '分析中...' : '⚡ 重新触发 AI 画像总结' }}
                </button>
              </div>
              <p :class="$style.aiProfileContent">
                {{ aiProfileSummary || '暂无深度 AI 画像。请点击右侧按钮发起提炼，或在日常切歌点播与聊天中由系统自动更新。' }}
              </p>
            </div>

            <div :class="$style.profileSummaryCard">
              <div :class="$style.summaryItem">
                <span :class="$style.summaryLabel">主打曲风：</span>
                <span :class="$style.summaryValue">R&B / 流行 / 治愈系轻音乐 / 城市 CityPop</span>
              </div>
              <div :class="$style.summaryItem">
                <span :class="$style.summaryLabel">偏爱歌手：</span>
                <span :class="$style.summaryValue">周杰伦, 陈奕迅, 林俊杰, 莫文蔚</span>
              </div>
              <div :class="$style.summaryItem">
                <span :class="$style.summaryLabel">学习样本库：</span>
                <span :class="$style.summaryValue">已分析听歌轨迹与“我的喜爱”歌单提取 16 个风格标签</span>
              </div>
            </div>

            <h5 :class="$style.subTitle">📜 本地偏好学习实时日志</h5>
            <div :class="$style.logTimeline" class="scroll">
              <div v-for="(log, idx) in logs" :key="idx" :class="$style.logItem">
                <span :class="$style.logTime">{{ log.time }}</span>
                <span :class="$style.logContent">{{ log.content }}</span>
              </div>
            </div>
          </div>

          <!-- 🤖 大模型选择、并发限制与 cURL 配置 -->
          <div v-if="activeCategory === 'llm'" :class="$style.section">
            <h4 :class="$style.sectionTitle">🤖 大模型选择、并发限制与 cURL 配置</h4>

            <!-- 并发限制设置 -->
            <div :class="$style.formGroup">
              <label>⚡ 请求最高并发限制 (Concurrency Limit)</label>
              <div :class="$style.sliderRow">
                <input v-model.number="form.concurrencyLimit" type="range" min="1" max="10" :class="$style.slider" />
                <span>{{ form.concurrencyLimit }} 次 / 并发</span>
              </div>
              <p :class="$style.fieldTip">限制后台打字机生成、动态建议获取、TTS 播报与主动连播的最大并发数。</p>
            </div>

            <!-- 选择 AI 模型 -->
            <div :class="$style.formGroup">
              <label>选择当前活跃 AI 模型 (Active Model Selector)</label>
              <select v-model="form.selectedModel" :class="$style.select" @change="onModelSelectChange">
                <option value="glm-4.7-flash">智谱 GLM-4.7-Flash (免费高速模型 - 推荐)</option>
                <option value="glm-4-flash">智谱 GLM-4-Flash (免费极速)</option>
                <option value="glm-4">智谱 GLM-4 (深度乐评与对话)</option>
                <option value="glm-4-plus">智谱 GLM-4-Plus (旗舰级多模态人设)</option>
                <option value="glm-4-air">智谱 GLM-4-Air (极速轻量)</option>
                <option value="deepseek-chat">DeepSeek-V3 / R1 (通用推理)</option>
                <option value="gpt-4o-mini">OpenAI GPT-4o-mini</option>
                <option value="custom">⚙️ 自定义模型名称...</option>
              </select>
            </div>

            <div v-if="form.selectedModel === 'custom'" :class="$style.formGroup">
              <label>自定义模型 Identifier</label>
              <input v-model="form.customModelName" type="text" placeholder="例如：llama-3.1-70b / qwen-max" :class="$style.input" />
            </div>

            <div :class="$style.formGroup">
              <label>API Base URL</label>
              <input v-model="form.baseUrl" type="text" placeholder="https://open.bigmodel.cn/api/paas/v4/" :class="$style.input" />
            </div>
            <div :class="$style.formGroup">
              <label>API Key</label>
              <input v-model="form.apiKey" type="password" placeholder="请输入你的 API Key" :class="$style.input" />
            </div>

            <!-- 通过 cURL 格式修改 / 导入模型参数 -->
            <div :class="$style.formGroup">
              <label>🛠️ 通过 cURL 命令行导入/编辑模型配置</label>
              <textarea
                v-model="curlInputText"
                rows="4"
                placeholder="粘贴包含 -X POST、Authorization Header 和 Payload 的 cURL 命令行，如：&#10;curl https://open.bigmodel.cn/api/paas/v4/chat/completions -H &quot;Authorization: Bearer YOUR_KEY&quot; -d '{&quot;model&quot;: &quot;glm-4.7-flash&quot;}'"
                :class="$style.textarea"
              ></textarea>
              <button type="button" :class="$style.curlParseBtn" @click="handleParseCurl">
                ⚡ 自动解析 cURL 并回填配置
              </button>
            </div>
          </div>

          <!-- 🗣️ 语音播报与 TTS 接入 API 配置 -->
          <div v-if="activeCategory === 'tts'" :class="$style.section">
            <h4 :class="$style.sectionTitle">🗣️ 语音播报与 TTS API 引擎配置</h4>

            <div :class="$style.formGroup">
              <label>语音合成 API 服务商 (TTS Engine API)</label>
              <select v-model="form.ttsEngine" :class="$style.select">
                <option value="edge-tts">微软 Edge TTS API (免 Key - 高清自然)</option>
                <option value="openai-tts">OpenAI TTS API (tts-1 / tts-1-hd)</option>
                <option value="volcengine-tts">火山引擎 / 字节跳动 语音大模型 API</option>
                <option value="custom-tts">自定义 WebAPI 语音接口</option>
              </select>
            </div>

            <div v-if="form.ttsEngine !== 'edge-tts'" :class="$style.formGroup">
              <label>TTS 语音服务 API Key</label>
              <input v-model="form.ttsApiKey" type="password" placeholder="输入 TTS API Key" :class="$style.input" />
            </div>

            <div v-if="form.ttsEngine === 'custom-tts'" :class="$style.formGroup">
              <label>自定义 TTS API Endpoint URL</label>
              <input v-model="form.ttsCustomUrl" type="text" placeholder="https://your-tts-service.com/v1/audio/speech" :class="$style.input" />
            </div>

            <div :class="$style.formGroup">
              <label>播报语言 API 输出 (TTS Language)</label>
              <select v-model="form.ttsLang" :class="$style.select">
                <option value="zh-CN">中文 (Standard Chinese - zh-CN)</option>
                <option value="en-US">English (US - en-US)</option>
                <option value="zh-TW">繁體中文 (Traditional Chinese - zh-TW)</option>
              </select>
            </div>

            <div :class="$style.formGroup">
              <label>播报发音人 (Voice Character)</label>
              <select v-model="form.ttsVoice" :class="$style.select">
                <option value="zh-CN-XiaoxiaoNeural">晓晓 (中文女声 - 活泼自然)</option>
                <option value="zh-CN-YunxiNeural">云希 (中文男声 - 阳光幽默)</option>
                <option value="zh-CN-YunjianNeural">云健 (中文男声 - 沉稳播音)</option>
                <option value="zh-CN-XiaoyiNeural">晓伊 (中文女声 - 柔和知心)</option>
              </select>
            </div>

            <div :class="$style.formGroup">
              <label>💬 聊天模式下播放语音</label>
              <label :class="$style.checkboxLabel">
                <input v-model="form.enableChatSpeech" type="checkbox" />
                <span>开启聊天回复的 TTS 语音朗读</span>
              </label>
            </div>

            <div :class="$style.formGroup">
              <label>🎧 DJ 模式下自动串场播报</label>
              <label :class="$style.checkboxLabel">
                <input v-model="form.enableDjSpeech" type="checkbox" />
                <span>开启切歌与推荐时的 DJ 语音串场</span>
              </label>
            </div>

            <div :class="$style.formGroup">
              <label>DJ 语音闪避降频音量 (Audio Ducking)</label>
              <div :class="$style.sliderRow">
                <input v-model.number="form.duckingVolume" type="range" min="5" max="50" :class="$style.slider" />
                <span>{{ form.duckingVolume }}%</span>
              </div>
            </div>
          </div>

          <!-- 🌤️ 环境与和风天气设置 (含和风 GeoAPI 城市模糊搜索下拉框) -->
          <div v-if="activeCategory === 'weather'" :class="$style.section">
            <h4 :class="$style.sectionTitle">🌤️ 环境感知与和风天气 API</h4>
            <div :class="$style.formGroup">
              <label>和风天气 API Key</label>
              <input v-model="form.weatherApiKey" type="password" placeholder="填入 key 自动感知城市天气" :class="$style.input" />
            </div>

            <div :class="$style.formGroup">
              <label>自定义天气 API Host (可选)</label>
              <input v-model="form.weatherApiHost" type="text" placeholder="例如：api.qweather.com" :class="$style.input" />
              <p :class="$style.fieldTip">如果填写此项，将覆盖默认的和风天气官方 API Host 进行请求。</p>
            </div>

            <!-- 城市搜索与模糊匹配下拉菜单 -->
            <div :class="$style.formGroup" style="position: relative;">
              <label>当前位置 / 城市 (和风 GeoAPI 模糊匹配)</label>
              <input
                v-model="form.city"
                type="text"
                placeholder="输入城市或拼音搜索，例如：北京 / 朝阳 / 杭州 / 成都..."
                :class="$style.input"
                @input="onCityInput"
                @focus="onCityFocus"
              />

              <!-- 下拉匹配列表 -->
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
          </div>
        </div>
      </div>

      <!-- 底部 按钮操作区 -->
      <div :class="$style.footer">
        <button :class="$style.cancelBtn" @click="close">取消</button>
        <button :class="$style.saveBtn" @click="save">保存配置</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, watch } from '@common/utils/vueTools'
import { djSettings, saveDjSettings, profileLogs } from '@renderer/store/dj'
import { searchCities } from '@renderer/utils/dj/weatherService'
import { parseCurlCommand } from '@renderer/utils/dj/curlParser'
import { getAiProfileSummary, generateAiProfileSummary } from '@renderer/utils/dj/userProfile'

export default {
  name: 'DjSettingModal',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:visible', 'save'],
  setup(props, { emit }) {
    const activeCategory = ref('djPrompt')
    let searchTimer = null

    const categories = [
      { id: 'djPrompt', name: 'DJ 人设 Prompt', icon: '📻' },
      { id: 'chatPrompt', name: '聊天人设 Prompt', icon: '💬' },
      { id: 'profileLogs', name: '用户画像与日志', icon: '📊' },
      { id: 'llm', name: '模型选择与 API', icon: '🤖' },
      { id: 'tts', name: '语音播报与 API', icon: '🗣️' },
      { id: 'weather', name: '环境与和风天气', icon: '🌤️' },
    ]

    const form = reactive({ ...djSettings })
    const cityResults = ref([])
    const showCityDropdown = ref(false)
    const curlInputText = ref('')
    const aiProfileSummary = ref(getAiProfileSummary())
    const isGeneratingProfile = ref(false)

    watch(
      () => props.visible,
      (newVal) => {
        if (newVal) {
          Object.assign(form, djSettings)
          showCityDropdown.value = false
          curlInputText.value = ''
          aiProfileSummary.value = getAiProfileSummary()
        }
      },
    )

    const onCityInput = () => {
      if (searchTimer) clearTimeout(searchTimer)
      searchTimer = setTimeout(() => {
        const doSearch = async() => {
          if (!form.city.trim()) {
            cityResults.value = []
            showCityDropdown.value = false
            return
          }
          const results = await searchCities(form.city)
          cityResults.value = results
          showCityDropdown.value = results.length > 0
        }
        doSearch().catch(err => { console.error(err) })
      }, 300)
    }

    const onCityFocus = () => {
      if (form.city.trim()) {
        onCityInput()
      }
    }

    const selectCity = (cityItem) => {
      form.city = cityItem.name
      showCityDropdown.value = false
    }

    const onModelSelectChange = () => {
      if (form.selectedModel !== 'custom') {
        form.customModelName = ''
      }
    }

    const handleParseCurl = () => {
      if (!curlInputText.value.trim()) return
      const parsed = parseCurlCommand(curlInputText.value)
      if (parsed.baseUrl) form.baseUrl = parsed.baseUrl
      if (parsed.apiKey) form.apiKey = parsed.apiKey
      if (parsed.modelName) {
        form.selectedModel = 'custom'
        form.customModelName = parsed.modelName
      }
    }

    const handleGenerateAiProfile = async() => {
      if (isGeneratingProfile.value) return
      isGeneratingProfile.value = true
      try {
        const activeModel = form.selectedModel === 'custom' ? form.customModelName : form.selectedModel
        const summary = await generateAiProfileSummary(form.apiKey, form.baseUrl, activeModel)
        aiProfileSummary.value = summary
      } finally {
        isGeneratingProfile.value = false
      }
    }

    const close = () => {
      showCityDropdown.value = false
      emit('update:visible', false)
    }

    const save = () => {
      showCityDropdown.value = false
      const activeModel = form.selectedModel === 'custom' ? form.customModelName : form.selectedModel
      form.activeModel = activeModel

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
      curlInputText,
      aiProfileSummary,
      isGeneratingProfile,
      onCityInput,
      onCityFocus,
      selectCity,
      onModelSelectChange,
      handleParseCurl,
      handleGenerateAiProfile,
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
  width: 760px;
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

  h3 {
    margin: 0;
    font-size: 16px;
    color: var(--color-primary);
  }
}

.closeBtn {
  border: none;
  background: transparent;
  font-size: 18px;
  color: var(--color-font-label);
  cursor: pointer;

  &:hover {
    color: var(--color-font);
  }
}

.body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.menuSidebar {
  width: 185px;
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

.menuIcon {
  font-size: 15px;
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

  label {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-font);
  }
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

  &:focus {
    border-color: var(--color-primary);
  }
}

.textarea {
  line-height: 1.5;
  resize: vertical;
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

    .cityName {
      color: var(--color-primary);
    }
  }
}

.cityName {
  font-weight: 600;
  font-size: 13px;
  color: var(--color-font);
}

.cityRegion {
  font-size: 11.5px;
  color: var(--color-font-label);
}

.checkboxLabel {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--color-font);
}

.sliderRow {
  display: flex;
  align-items: center;
  gap: 12px;

  span {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-primary);
  }
}

.slider {
  flex: 1;
  cursor: pointer;
}

.aiProfileCard {
  padding: 14px;
  background: var(--color-primary-light-800-alpha-300);
  border-radius: 12px;
  border: 1px solid var(--color-primary-light-400-alpha-600);
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.aiProfileHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.aiProfileTitle {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--color-primary);
}

.generateAiProfileBtn {
  padding: 4px 12px;
  border-radius: 6px;
  border: none;
  background: var(--color-primary);
  color: #fff;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity @transition-fast;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.aiProfileContent {
  margin: 0;
  font-size: 12.5px;
  color: var(--color-font);
  line-height: 1.6;
}

.profileSummaryCard {
  padding: 14px;
  background: var(--color-primary-light-900-alpha-300);
  border-radius: 12px;
  border: 1px solid var(--color-primary-light-500-alpha-300);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summaryItem {
  font-size: 12.5px;
}

.summaryLabel {
  color: var(--color-font-label);
  font-weight: 500;
}

.summaryValue {
  color: var(--color-primary);
  font-weight: 600;
}

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

.logTime {
  color: var(--color-font-label);
  font-family: monospace;
}

.curlParseBtn {
  align-self: flex-start;
  padding: 6px 14px;
  border-radius: 6px;
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
