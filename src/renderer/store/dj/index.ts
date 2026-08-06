import { reactive } from '@common/utils/vueTools'
import type { DjSettingsState, ModelPreset, ProfileLogItem, HistoryItem } from '@renderer/utils/dj/types'

const SETTINGS_STORAGE_KEY = 'lx_ai_dj_settings_v1'
const LOGS_STORAGE_KEY = 'lx_ai_dj_logs_v1'
const HISTORY_STORAGE_KEY = 'lx_ai_dj_history_v1'

const defaultModelList: ModelPreset[] = [
  {
    id: 'openai-compatible',
    name: 'OpenAI 兼容接口（通用）',
    baseUrl: '',
    modelName: '',
    apiKey: '',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek (深度求索)',
    baseUrl: 'https://api.deepseek.com/',
    modelName: 'deepseek-chat',
    apiKey: '',
  },
  {
    id: 'glm-4.7-flash',
    name: '智谱 GLM-4.7-Flash',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
    modelName: 'glm-4.7-flash',
    apiKey: '',
  },
  {
    id: 'qwen-turbo',
    name: '阿里通义千问 Qwen-Turbo',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/',
    modelName: 'qwen-turbo',
    apiKey: '',
  },
]

const defaultSettings: DjSettingsState = {
  selectedModel: 'openai-compatible',
  customModelName: '',
  activeModel: '',
  baseUrl: '',
  apiKey: '',

  concurrencyLimit: 3,
  activeModelId: 'openai-compatible',
  modelList: defaultModelList,

  djPromptRole: '你是一名拥有丰富音乐知识与极客精神的专业电台音乐 DJ。你的声音性感优雅，性格热情幽默且充满都市感。你不仅精通各种音乐类型（如 R&B、CityPop、爵士、摇滚、纯音乐），还能通过富有感染力的语言将音乐与用户当前的环境相连接。',
  djPromptOpening: '结合用户所在城市的天气（如晴天、雨天、阴天、雪天）、实时时间段（早晨唤醒、午后茶歇、傍晚通勤、深夜电台）以及气温，生成极具仪式感与氛围感的广播频道开场白。',
  djPromptSelection: '选歌算法需精准契合环境与节奏：早晨优先推荐 110-125 BPM 的活力清爽音乐；午后选择 80-100 BPM 的轻爵士、Bossa Nova 或 CityPop；雨天优先选择慢板民谣与治愈系钢琴；深夜电台则精选 Ambient 纯音乐或感性 R&B。确保切歌时曲风过渡自然，避免情绪断崖。',
  djPromptRecommendation: '推歌时需输出具象化、富有画面感的串词。讲述歌曲背后的创作故事、词曲意境、独到音色与乐器编曲亮点。串词控制在 100-180 字之间，幽默而不失深度，让听众在聆听歌曲前建立强烈的情绪期待。',
  djPromptProfileLearning: '持续分析用户"我的喜爱"歌单与历史点歌轨迹，自动提取歌手偏好、常用场景标签与喜爱的乐器类型。在推荐中优先融入符合用户历史审美的冷门宝藏歌曲，并在日志中记录画像的调优历程。',

  chatPromptRole: '你是一个温暖、体贴、懂得倾听的知心音乐伙伴。你不是冷冰冰的问答机器，而是一位音乐修养极高的挚友。你善于通过文字给予用户情感上的开导与抚慰，引导用户分享生活故事，并用音乐作为连接心灵的桥梁。',
  chatPromptOpening: '开场白需体现关怀与温情。结合当下时间与天气自然发起问候，询问用户今天过得怎么样、心情如何。',
  chatPromptSelection: '根据用户倾诉的心事与情感状态推荐歌曲：当用户焦虑时推荐频率舒缓的治愈系音乐；当用户兴奋喜悦时推荐昂扬热烈的歌；当用户陷入低谷时推荐温柔共情、陪伴感强的曲目。',
  chatPromptRecommendation: '乐评探讨需真诚深入。可以从歌词意境、歌手演唱时的情感流露、个人听感体会等角度展开交流，鼓励用户分享对某首歌的独特记忆与感悟，形成双向的情感互动。',
  chatPromptProfileLearning: '细致记录用户的心理情感变化、喜爱的音乐情绪标签（如：怀旧、励志、孤独、欢快）以及个人生活习惯，建立深度的情感画像，使后续的聊天与关切更加懂用户。',

  ttsEngine: 'web-speech',
  ttsApiKey: '',
  ttsCustomUrl: '',
  ttsLang: 'zh-CN',
  ttsVoice: 'zh-CN-XiaoxiaoNeural',
  ttsAppId: '',
  ttsRegion: 'eastasia',
  ttsSpeed: 1,
  ttsPitch: 1,
  enableChatSpeech: true,
  enableDjSpeech: true,
  duckingVolume: 20,

  autoContinue: true,
  djAutoPlay: true,

  weatherApiKey: '',
  weatherApiHost: '',
  city: '北京',
}

const loadSavedSettings = (): DjSettingsState => {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // 确保 modelList 有默认值
      if (!parsed.modelList || !Array.isArray(parsed.modelList) || parsed.modelList.length === 0) {
        parsed.modelList = defaultModelList
      }
      return { ...defaultSettings, ...parsed }
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
    { time: '17:25:02', content: '分析"我的喜爱"歌单完成，更新偏好标签: [R&B, 流行, 治愈系, CityPop]' },
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

export const clearProfileLogs = () => {
  profileLogs.splice(0, profileLogs.length)
  try {
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(profileLogs))
  } catch (err) {
    console.error('清空 AI DJ 日志失败:', err)
  }
}

interface HistoryStorageData {
  djHistory: HistoryItem[]
  chatHistory: HistoryItem[]
  recommendHistory: HistoryItem[]
}

const loadSavedHistory = (): HistoryStorageData => {
  try {
    const saved = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch (err) {
    console.error('加载 AI DJ 历史记录失败:', err)
  }
  return { djHistory: [], chatHistory: [], recommendHistory: [] }
}

const initialHistory = loadSavedHistory()

export const djHistoryList = reactive<HistoryItem[]>(initialHistory.djHistory)
export const chatHistoryList = reactive<HistoryItem[]>(initialHistory.chatHistory)
export const recommendHistoryList = reactive<HistoryItem[]>(initialHistory.recommendHistory)

export const saveHistory = () => {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({
      djHistory: djHistoryList,
      chatHistory: chatHistoryList,
      recommendHistory: recommendHistoryList,
    }))
  } catch (err) {
    console.error('保存 AI DJ 历史记录失败:', err)
  }
}

// ─── DJ 数据备份 / 恢复（用于导入导出） ──────────────────

export const getDjBackupData = (): Record<string, unknown> => {
  return {
    type: 'ai_dj_data_v1',
    version: 1,
    settings: { ...djSettings },
    history: {
      djHistory: JSON.parse(JSON.stringify(djHistoryList)),
      chatHistory: JSON.parse(JSON.stringify(chatHistoryList)),
      recommendHistory: JSON.parse(JSON.stringify(recommendHistoryList)),
    },
    logs: JSON.parse(JSON.stringify(profileLogs)),
  }
}

export const applyDjBackupData = (data: any): boolean => {
  try {
    if (!data || data.type !== 'ai_dj_data_v1') return false
    // 恢复设置
    if (data.settings && typeof data.settings === 'object') {
      Object.assign(djSettings, data.settings)
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(djSettings))
    }
    // 恢复历史
    if (data.history) {
      const h = data.history
      djHistoryList.splice(0, djHistoryList.length, ...(h.djHistory ?? []))
      chatHistoryList.splice(0, chatHistoryList.length, ...(h.chatHistory ?? []))
      recommendHistoryList.splice(0, recommendHistoryList.length, ...(h.recommendHistory ?? []))
      saveHistory()
    }
    // 恢复日志
    if (Array.isArray(data.logs)) {
      profileLogs.splice(0, profileLogs.length, ...data.logs)
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(profileLogs))
    }
    return true
  } catch (err) {
    console.error('恢复 AI DJ 数据失败:', err)
    return false
  }
}
