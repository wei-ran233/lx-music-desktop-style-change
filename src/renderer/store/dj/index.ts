import { reactive } from '@common/utils/vueTools'

export interface SystemPromptGroup {
  role: string
  opening: string
  selection: string
  recommendation: string
  profileLearning: string
}

export interface DjSettingsState {
  selectedModel: string
  customModelName: string
  activeModel: string
  baseUrl: string
  apiKey: string

  djPromptRole: string
  djPromptOpening: string
  djPromptSelection: string
  djPromptRecommendation: string
  djPromptProfileLearning: string

  chatPromptRole: string
  chatPromptOpening: string
  chatPromptSelection: string
  chatPromptRecommendation: string
  chatPromptProfileLearning: string

  ttsEngine: 'edge-tts' | 'openai-tts' | 'volcengine-tts' | 'custom-tts'
  ttsApiKey: string
  ttsCustomUrl: string
  ttsLang: 'zh-CN' | 'en-US' | 'zh-TW'
  ttsVoice: string
  enableChatSpeech: boolean
  enableDjSpeech: boolean
  duckingVolume: number

  weatherApiKey: string
  city: string
}

export interface ProfileLogItem {
  time: string
  content: string
}

export interface HistoryItem {
  id: string
  type: 'history' | 'recommend'
  mode: 'dj' | 'chat'
  title: string
  singer?: string
  date: string
  messages?: any[]
}

const SETTINGS_STORAGE_KEY = 'lx_ai_dj_settings_v1'
const LOGS_STORAGE_KEY = 'lx_ai_dj_logs_v1'

const defaultSettings: DjSettingsState = {
  selectedModel: 'glm-4.7-flash',
  customModelName: '',
  activeModel: 'glm-4.7-flash',
  baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
  apiKey: '',

  djPromptRole: '你是一名拥有丰富音乐知识与极客精神的专业电台音乐 DJ。你的声音性感优雅，性格热情幽默且充满都市感。你不仅精通各种音乐类型（如 R&B、CityPop、爵士、摇滚、纯音乐），还能通过富有感染力的语言将音乐与用户当前的环境相连接。',
  djPromptOpening: '结合用户所在城市的天气（如晴天、雨天、阴天、雪天）、实时时间段（早晨唤醒、午后茶歇、傍晚通勤、深夜电台）以及气温，生成极具仪式感与氛围感的广播频道开场白。例如：“欢迎收听 AI 音乐调频。现在是北京时间傍晚，窗外飘着微雨，温度 22℃。在这样一个适合放空的时刻，我是你的专属 DJ……”',
  djPromptSelection: '选歌算法需精准契合环境与节奏：早晨优先推荐 110-125 BPM 的活力清爽音乐；午后选择 80-100 BPM 的轻爵士、Bossa Nova 或 CityPop；雨天优先选择慢板民谣与治愈系钢琴；深夜电台则精选 Ambient 纯音乐或感性 R&B。确保切歌时曲风过渡自然，避免情绪断崖。',
  djPromptRecommendation: '推歌时需输出具象化、富有画面感的串词。讲述歌曲背后的创作故事、词曲意境、独到音色与乐器编曲亮点。串词控制在 100-180 字之间，幽默而不失深度，让听众在聆听歌曲前建立强烈的情绪期待。',
  djPromptProfileLearning: '持续分析用户“我的喜爱”歌单与历史点歌轨迹，自动提取歌手偏好、常用场景标签与喜爱的乐器类型。在推荐中优先融入符合用户历史审美的冷门宝藏歌曲，并在日志中记录画像的调优历程。',

  chatPromptRole: '你是一个温暖、体贴、懂得倾听的知心音乐伙伴。你不是冷冰冰的问答机器，而是一位音乐修养极高的挚友。你善于通过文字给予用户情感上的开导与抚慰，引导用户分享生活故事，并用音乐作为连接心灵的桥梁。',
  chatPromptOpening: '开场白需体现关怀与温情。结合当下时间与天气自然发起问候，询问用户今天过得怎么样、心情如何。例如：“嗨，今天工作辛苦啦。今晚的天空很清澈，你现在心情怎么样？有什么想和我聊聊的吗？”',
  chatPromptSelection: '根据用户倾诉的心事与情感状态推荐歌曲：当用户焦虑时推荐频率舒缓的治愈系音乐；当用户兴奋喜悦时推荐昂扬热烈的歌；当用户陷入低谷时推荐温柔共情、陪伴感强的曲目。',
  chatPromptRecommendation: '乐评探讨需真诚深入。可以从歌词意境、歌手演唱时的情感流露、个人听感体会等角度展开交流，鼓励用户分享对某首歌的独特记忆与感悟，形成双向的情感互动。',
  chatPromptProfileLearning: '细致记录用户的心理情感变化、喜爱的音乐情绪标签（如：怀旧、励志、孤独、欢快）以及个人生活习惯，建立深度的情感画像，使后续的聊天与关切更加懂用户。',

  ttsEngine: 'edge-tts',
  ttsApiKey: '',
  ttsCustomUrl: '',
  ttsLang: 'zh-CN',
  ttsVoice: 'zh-CN-XiaoxiaoNeural',
  enableChatSpeech: true,
  enableDjSpeech: true,
  duckingVolume: 20,

  weatherApiKey: '',
  city: '北京',
}

const loadSavedSettings = (): DjSettingsState => {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) }
    }
  } catch (err) {
    console.error('加载 AI DJ 设置失败:', err)
  }
  return { ...defaultSettings }
}

export const djSettings = reactive<DjSettingsState>(loadSavedSettings())

export const saveDjSettings = (newSettings: Partial<DjSettingsState>) => {
  Object.assign(djSettings, newSettings)
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(djSettings))
  } catch (err) {
    console.error('保存 AI DJ 设置失败:', err)
  }
}

const loadSavedLogs = (): ProfileLogItem[] => {
  try {
    const saved = localStorage.getItem(LOGS_STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch (err) {
    console.error('加载 AI DJ 日志失败:', err)
  }
  return [
    { time: '17:25:02', content: '分析“我的喜爱”歌单完成，更新偏好标签: [R&B, 流行, 治愈系, CityPop]' },
    { time: '14:20:11', content: '匹配下雨场景规则: 推荐歌曲《晴天》《阴天快乐》' },
    { time: '08:30:00', content: '基于早晨时间段，调优推荐 BPM 为 110-125 活力曲风' },
  ]
}

export const profileLogs = reactive<ProfileLogItem[]>(loadSavedLogs())

export const addProfileLog = (content: string) => {
  const now = new Date()
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
  profileLogs.unshift({ time: timeStr, content })
  if (profileLogs.length > 50) profileLogs.pop()
  try {
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(profileLogs))
  } catch (err) {
    console.error('保存 AI DJ 日志失败:', err)
  }
}
