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
        <!-- 左侧 分类菜单列表 (使用单一 icon 避免图标重复) -->
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
                v-model="djPromptRole"
                rows="3"
                placeholder="设定 DJ 的性格、说话语气与电台风格..."
                :class="$style.textarea"
              ></textarea>
            </div>

            <div :class="$style.formGroup">
              <label>🌅 2. 调频开场白规则 (Opening Greetings)</label>
              <textarea
                v-model="djPromptOpening"
                rows="3"
                placeholder="结合城市天气、时间段、节气与温度的广播开场白..."
                :class="$style.textarea"
              ></textarea>
            </div>

            <div :class="$style.formGroup">
              <label>🎵 3. 电台选歌逻辑与规则 (Music Selection Criteria)</label>
              <textarea
                v-model="djPromptSelection"
                rows="3"
                placeholder="基于场景 BPM、曲风渐进、气候情绪选歌算法..."
                :class="$style.textarea"
              ></textarea>
            </div>

            <div :class="$style.formGroup">
              <label>🗣️ 4. 音乐串词与故事推荐 (Music Pitching & Storytelling)</label>
              <textarea
                v-model="djPromptRecommendation"
                rows="3"
                placeholder="讲出歌曲创作背景、乐器编曲细节与听感故事..."
                :class="$style.textarea"
              ></textarea>
            </div>

            <div :class="$style.formGroup">
              <label>🧠 5. 用户电台偏好学习 (User Profile Strategy)</label>
              <textarea
                v-model="djPromptProfileLearning"
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
                v-model="chatPromptRole"
                rows="3"
                placeholder="设定知心伴侣人设、倾听态度与温暖共情语气..."
                :class="$style.textarea"
              ></textarea>
            </div>

            <div :class="$style.formGroup">
              <label>🌅 2. 聊天互动与破冰开场 (Opening Greetings)</label>
              <textarea
                v-model="chatPromptOpening"
                rows="3"
                placeholder="如何根据时间、用户心情与日常感受自然发起关怀问候..."
                :class="$style.textarea"
              ></textarea>
            </div>

            <div :class="$style.formGroup">
              <label>🎵 3. 情绪共鸣与契合推歌 (Emotional Music Matching)</label>
              <textarea
                v-model="chatPromptSelection"
                rows="3"
                placeholder="根据用户倾诉的心事与情感状态推荐歌曲..."
                :class="$style.textarea"
              ></textarea>
            </div>

            <div :class="$style.formGroup">
              <label>🗣️ 4. 乐评交流与深度探讨 (Music Critique & Discussion)</label>
              <textarea
                v-model="chatPromptRecommendation"
                rows="3"
                placeholder="如何与用户就音乐审美、词曲意境、演唱技巧展开深度交流..."
                :class="$style.textarea"
              ></textarea>
            </div>

            <div :class="$style.formGroup">
              <label>🧠 5. 情感与审美画像学习 (Sentiment Profile Strategy)</label>
              <textarea
                v-model="chatPromptProfileLearning"
                rows="3"
                placeholder="如何记录用户的心理情感变化、喜爱的音乐情绪标签与生活习惯..."
                :class="$style.textarea"
              ></textarea>
            </div>
          </div>

          <!-- 📊 用户画像与分析日志 -->
          <div v-if="activeCategory === 'profileLogs'" :class="$style.section">
            <h4 :class="$style.sectionTitle">📊 用户品味画像与分析日志</h4>

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
                <span :class="$style.summaryLabel">场景行为规律：</span>
                <span :class="$style.summaryValue">下雨天偏爱慢摇民谣，深夜倾向舒缓助眠钢琴曲，午后偏爱 Bossa Nova</span>
              </div>
              <div :class="$style.summaryItem">
                <span :class="$style.summaryLabel">学习样本库：</span>
                <span :class="$style.summaryValue">已分析“我的喜爱”歌单 24 首歌曲，提取 16 个风格标签</span>
              </div>
            </div>

            <h5 :class="$style.subTitle">📜 本地偏好学习实时日志</h5>
            <div :class="$style.logTimeline" class="scroll">
              <div v-for="(log, idx) in profileLogs" :key="idx" :class="$style.logItem">
                <span :class="$style.logTime">{{ log.time }}</span>
                <span :class="$style.logContent">{{ log.content }}</span>
              </div>
            </div>
          </div>

          <!-- 🤖 大模型选择与 API 接口配置 -->
          <div v-if="activeCategory === 'llm'" :class="$style.section">
            <h4 :class="$style.sectionTitle">🤖 大模型选择与 API 配置</h4>

            <div :class="$style.formGroup">
              <label>选择 AI 模型 (Model Selector)</label>
              <select v-model="selectedModel" :class="$style.select" @change="onModelSelectChange">
                <option value="glm-4-flash">智谱 GLM-4-Flash (高速推荐 - 默认)</option>
                <option value="glm-4">智谱 GLM-4 (深度乐评与对话)</option>
                <option value="glm-4-plus">智谱 GLM-4-Plus (旗舰级多模态人设)</option>
                <option value="glm-4-air">智谱 GLM-4-Air (极速轻量)</option>
                <option value="deepseek-chat">DeepSeek-V3 / R1 (通用推理)</option>
                <option value="gpt-4o-mini">OpenAI GPT-4o-mini</option>
                <option value="custom">⚙️ 自定义模型名称...</option>
              </select>
            </div>

            <div v-if="selectedModel === 'custom'" :class="$style.formGroup">
              <label>自定义模型 Identifier</label>
              <input v-model="customModelName" type="text" placeholder="例如：llama-3.1-70b / qwen-max" :class="$style.input" />
            </div>

            <div :class="$style.formGroup">
              <label>API Base URL</label>
              <input v-model="baseUrl" type="text" placeholder="https://open.bigmodel.cn/api/paas/v4/" :class="$style.input" />
            </div>
            <div :class="$style.formGroup">
              <label>API Key</label>
              <input v-model="apiKey" type="password" placeholder="请输入你的 API Key" :class="$style.input" />
            </div>
          </div>

          <!-- 🗣️ 语音播报与 TTS 接入 API 配置 -->
          <div v-if="activeCategory === 'tts'" :class="$style.section">
            <h4 :class="$style.sectionTitle">🗣️ 语音播报与 TTS API 引擎配置</h4>

            <!-- TTS 引擎/接口 API 选择 -->
            <div :class="$style.formGroup">
              <label>语音合成 API 服务商 (TTS Engine API)</label>
              <select v-model="ttsEngine" :class="$style.select">
                <option value="edge-tts">微软 Edge TTS API (免 Key - 高清自然)</option>
                <option value="openai-tts">OpenAI TTS API (tts-1 / tts-1-hd)</option>
                <option value="volcengine-tts">火山引擎 / 字节跳动 语音大模型 API</option>
                <option value="custom-tts">自定义 WebAPI 语音接口</option>
              </select>
            </div>

            <!-- 需要 API Key 的服务商关联文本框 -->
            <div v-if="ttsEngine !== 'edge-tts'" :class="$style.formGroup">
              <label>TTS 语音服务 API Key</label>
              <input v-model="ttsApiKey" type="password" placeholder="输入 TTS API Key" :class="$style.input" />
            </div>

            <div v-if="ttsEngine === 'custom-tts'" :class="$style.formGroup">
              <label>自定义 TTS API Endpoint URL</label>
              <input v-model="ttsCustomUrl" type="text" placeholder="https://your-tts-service.com/v1/audio/speech" :class="$style.input" />
            </div>

            <!-- 播报语言 API 输出选择 -->
            <div :class="$style.formGroup">
              <label>播报语言 API 输出 (TTS Language)</label>
              <select v-model="ttsLang" :class="$style.select">
                <option value="zh-CN">中文 (Standard Chinese - zh-CN)</option>
                <option value="en-US">English (US - en-US)</option>
                <option value="zh-TW">繁體中文 (Traditional Chinese - zh-TW)</option>
              </select>
            </div>

            <!-- 播报发音人选择 -->
            <div :class="$style.formGroup">
              <label>播报发音人 (Voice Character)</label>
              <select v-model="ttsVoice" :class="$style.select">
                <option value="zh-CN-XiaoxiaoNeural">晓晓 (中文女声 - 活泼自然)</option>
                <option value="zh-CN-YunxiNeural">云希 (中文男声 - 阳光幽默)</option>
                <option value="zh-CN-YunjianNeural">云健 (中文男声 - 沉稳播音)</option>
                <option value="zh-CN-XiaoyiNeural">晓伊 (中文女声 - 柔和知心)</option>
              </select>
            </div>

            <div :class="$style.formGroup">
              <label>💬 聊天模式下播放语音</label>
              <label :class="$style.checkboxLabel">
                <input v-model="enableChatSpeech" type="checkbox" />
                <span>开启聊天回复的 TTS 语音朗读</span>
              </label>
            </div>

            <div :class="$style.formGroup">
              <label>🎧 DJ 模式下自动串场播报</label>
              <label :class="$style.checkboxLabel">
                <input v-model="enableDjSpeech" type="checkbox" />
                <span>开启切歌与推荐时的 DJ 语音串场</span>
              </label>
            </div>

            <div :class="$style.formGroup">
              <label>DJ 语音闪避降频音量 (Audio Ducking)</label>
              <div :class="$style.sliderRow">
                <input v-model.number="duckingVolume" type="range" min="5" max="50" :class="$style.slider" />
                <span>{{ duckingVolume }}%</span>
              </div>
            </div>
          </div>

          <!-- 🌤️ 环境与和风天气设置 -->
          <div v-if="activeCategory === 'weather'" :class="$style.section">
            <h4 :class="$style.sectionTitle">🌤️ 环境感知与和风天气 API</h4>
            <div :class="$style.formGroup">
              <label>和风天气 API Key</label>
              <input v-model="weatherApiKey" type="text" placeholder="填入 key 自动感知城市天气" :class="$style.input" />
            </div>
            <div :class="$style.formGroup">
              <label>当前位置 / 城市</label>
              <input v-model="city" type="text" placeholder="例如：北京 / 上海 / 广州 / 深圳" :class="$style.input" />
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
import { ref } from '@common/utils/vueTools'

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

    // 修复图标重复：使用单一 icon + 干净文本 name
    const categories = [
      { id: 'djPrompt', name: 'DJ 人设 Prompt', icon: '📻' },
      { id: 'chatPrompt', name: '聊天人设 Prompt', icon: '💬' },
      { id: 'profileLogs', name: '用户画像与日志', icon: '📊' },
      { id: 'llm', name: '模型选择与 API', icon: '🤖' },
      { id: 'tts', name: '语音播报与 API', icon: '🗣️' },
      { id: 'weather', name: '环境与和风天气', icon: '🌤️' },
    ]

    // Prompt 人设
    const djPromptRole = ref('你是一名拥有丰富音乐知识与极客精神的专业电台音乐 DJ。你的声音性感优雅，性格热情幽默且充满都市感。你不仅精通各种音乐类型（如 R&B、CityPop、爵士、摇滚、纯音乐），还能通过富有感染力的语言将音乐与用户当前的环境相连接。')
    const djPromptOpening = ref('结合用户所在城市的天气（如晴天、雨天、阴天、雪天）、实时时间段（早晨唤醒、午后茶歇、傍晚通勤、深夜电台）以及气温，生成极具仪式感与氛围感的广播频道开场白。例如：“欢迎收听 AI 音乐调频。现在是北京时间傍晚，窗外飘着微雨，温度 22℃。在这样一个适合放空的时刻，我是你的专属 DJ……”')
    const djPromptSelection = ref('选歌算法需精准契合环境与节奏：早晨优先推荐 110-125 BPM 的活力清爽音乐；午后选择 80-100 BPM 的轻爵士、Bossa Nova 或 CityPop；雨天优先选择慢板民谣与治愈系钢琴；深夜电台则精选 Ambient 纯音乐或感性 R&B。确保切歌时曲风过渡自然，避免情绪断崖。')
    const djPromptRecommendation = ref('推歌时需输出具象化、富有画面感的串词。讲述歌曲背后的创作故事、词曲意境、独到音色与乐器编曲亮点。串词控制在 100-180 字之间，幽默而不失深度，让听众在聆听歌曲前建立强烈的情绪期待。')
    const djPromptProfileLearning = ref('持续分析用户“我的喜爱”歌单与历史点歌轨迹，自动提取歌手偏好、常用场景标签与喜爱的乐器类型。在推荐中优先融入符合用户历史审美的冷门宝藏歌曲，并在日志中记录画像的调优历程。')

    const chatPromptRole = ref('你是一个温暖、体贴、懂得倾听的知心音乐伙伴。你不是冷冰冰的问答机器，而是一位音乐修养极高的挚友。你善于通过文字给予用户情感上的开导与抚慰，引导用户分享生活故事，并用音乐作为连接心灵的桥梁。')
    const chatPromptOpening = ref('开场白需体现关怀与温情。结合当下时间与天气自然发起问候，询问用户今天过得怎么样、心情如何。例如：“嗨，今天工作辛苦啦。今晚的天空很清澈，你现在心情怎么样？有什么想和我聊聊的吗？”')
    const chatPromptSelection = ref('根据用户倾诉的心事与情感状态推荐歌曲：当用户焦虑时推荐频率舒缓的治愈系音乐；当用户兴奋喜悦时推荐昂扬热烈的歌；当用户陷入低谷时推荐温柔共情、陪伴感强的曲目。')
    const chatPromptRecommendation = ref('乐评探讨需真诚深入。可以从歌词意境、歌手演唱时的情感流露、个人听感体会等角度展开交流，鼓励用户分享对某首歌的独特记忆与感悟，形成双向的情感互动。')
    const chatPromptProfileLearning = ref('细致记录用户的心理情感变化、喜爱的音乐情绪标签（如：怀旧、励志、孤独、欢快）以及个人生活习惯，建立深度的情感画像，使后续的聊天与关切更加懂用户。')

    // 用户画像分析日志
    const profileLogs = ref([
      { time: '17:25:02', content: '分析“我的喜爱”歌单完成，更新偏好标签: [R&B, 流行, 治愈系, CityPop]' },
      { time: '14:20:11', content: '匹配下雨场景规则: 推荐歌曲《晴天》《阴天快乐》' },
      { time: '08:30:00', content: '基于早晨时间段，调优推荐 BPM 为 110-125 活力曲风' },
    ])

    // 大模型配置
    const selectedModel = ref('glm-4-flash')
    const customModelName = ref('')
    const baseUrl = ref('https://open.bigmodel.cn/api/paas/v4/')
    const apiKey = ref('')

    const onModelSelectChange = () => {
      if (selectedModel.value !== 'custom') {
        customModelName.value = ''
      }
    }

    // TTS 语音合成 API 与参数
    const ttsEngine = ref('edge-tts')
    const ttsApiKey = ref('')
    const ttsCustomUrl = ref('')
    const ttsLang = ref('zh-CN')
    const ttsVoice = ref('zh-CN-XiaoxiaoNeural')
    const enableChatSpeech = ref(true)
    const enableDjSpeech = ref(true)
    const duckingVolume = ref(20)

    const weatherApiKey = ref('')
    const city = ref('北京')

    const close = () => {
      emit('update:visible', false)
    }

    const save = () => {
      const activeModelName = selectedModel.value === 'custom' ? customModelName.value : selectedModel.value
      emit('save', {
        djPromptRole: djPromptRole.value,
        djPromptOpening: djPromptOpening.value,
        djPromptSelection: djPromptSelection.value,
        djPromptRecommendation: djPromptRecommendation.value,
        djPromptProfileLearning: djPromptProfileLearning.value,
        chatPromptRole: chatPromptRole.value,
        chatPromptOpening: chatPromptOpening.value,
        chatPromptSelection: chatPromptSelection.value,
        chatPromptRecommendation: chatPromptRecommendation.value,
        chatPromptProfileLearning: chatPromptProfileLearning.value,
        selectedModel: selectedModel.value,
        customModelName: customModelName.value,
        model: activeModelName,
        baseUrl: baseUrl.value,
        apiKey: apiKey.value,
        ttsEngine: ttsEngine.value,
        ttsApiKey: ttsApiKey.value,
        ttsCustomUrl: ttsCustomUrl.value,
        ttsLang: ttsLang.value,
        ttsVoice: ttsVoice.value,
        enableChatSpeech: enableChatSpeech.value,
        enableDjSpeech: enableDjSpeech.value,
        duckingVolume: duckingVolume.value,
        weatherApiKey: weatherApiKey.value,
        city: city.value,
      })
      close()
    }

    return {
      activeCategory,
      categories,
      djPromptRole,
      djPromptOpening,
      djPromptSelection,
      djPromptRecommendation,
      djPromptProfileLearning,
      chatPromptRole,
      chatPromptOpening,
      chatPromptSelection,
      chatPromptRecommendation,
      chatPromptProfileLearning,
      profileLogs,
      selectedModel,
      customModelName,
      baseUrl,
      apiKey,
      ttsEngine,
      ttsApiKey,
      ttsCustomUrl,
      ttsLang,
      ttsVoice,
      enableChatSpeech,
      enableDjSpeech,
      duckingVolume,
      weatherApiKey,
      city,
      onModelSelectChange,
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

/* 左侧 分类菜单 */
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

/* 右侧 内容区 */
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

/* 用户画像总结卡片 */
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

.logContent {
  color: var(--color-font);
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
