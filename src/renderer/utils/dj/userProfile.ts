import { loveList } from '@renderer/store/list/state'
import { addProfileLog } from '@renderer/store/dj'

export interface UserTasteProfile {
  topArtists: string[]
  sampleCount: number
  genreTags: string[]
  playCounts: Record<string, number>
  lastAnalyzedTime: string
}

const PROFILE_STORAGE_KEY = 'lx_ai_user_profile_v1'

const loadLocalProfileData = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('加载本地听歌画像数据异常:', e)
  }
  return {}
}

const saveLocalProfileData = (data: Record<string, number>) => {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('保存本地听歌画像数据异常:', e)
  }
}

/**
 * 记录用户听歌/点播事件
 */
export const recordPlayedSong = (songName: string, singer?: string) => {
  if (!songName) return
  const data = loadLocalProfileData()
  const key = singer ? `${singer} - ${songName}` : songName
  data[key] = (data[key] || 0) + 1
  if (singer) {
    const singerKey = `artist:${singer}`
    data[singerKey] = (data[singerKey] || 0) + 1
  }
  saveLocalProfileData(data)
  addProfileLog(`累加用户听歌轨迹: [${key}] (累计 ${data[key]} 次)`)
}

/**
 * 分析“我的喜爱”歌单与听歌历史，提取用户特征画像
 */
export const analyzeUserProfile = (): UserTasteProfile => {
  const songs = (loveList as any)?.list || []
  const singerCountMap: Record<string, number> = {}

  songs.forEach((song: any) => {
    const singer = song.singer || song.artist
    if (singer) {
      singerCountMap[singer] = (singerCountMap[singer] || 0) + 1
    }
  })

  const localData = loadLocalProfileData()
  Object.keys(localData).forEach((key) => {
    if (key.startsWith('artist:')) {
      const artistName = key.replace(/^artist:/, '')
      singerCountMap[artistName] = (singerCountMap[artistName] || 0) + localData[key]
    }
  })

  // 按出现频率降序排列
  const sortedArtists = Object.keys(singerCountMap).sort(
    (a, b) => singerCountMap[b] - singerCountMap[a],
  )
  const topArtists = sortedArtists.slice(0, 5)

  const sampleCount = songs.length
  const now = new Date()
  const lastAnalyzedTime = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`

  const genreTags = ['R&B', '流行', '治愈系', 'CityPop', '纯音乐']

  if (topArtists.length > 0) {
    addProfileLog(
      `提取用户偏好画像: 最喜爱歌手 [${topArtists.join(', ')}]`,
    )
  } else {
    addProfileLog('实时计算环境规则偏好: 包含 [R&B, 流行, 治愈系轻音乐]')
  }

  return {
    topArtists,
    sampleCount,
    genreTags,
    playCounts: localData,
    lastAnalyzedTime,
  }
}

const AI_SUMMARY_STORAGE_KEY = 'lx_ai_user_profile_summary_v1'

export const getAiProfileSummary = (): string => {
  try {
    return localStorage.getItem(AI_SUMMARY_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export const saveAiProfileSummary = (summary: string) => {
  try {
    localStorage.setItem(AI_SUMMARY_STORAGE_KEY, summary)
  } catch (e) {
    console.error('保存 AI 画像摘要失败:', e)
  }
}

/**
 * 触发 LLM 后台生成 100 字深度 AI 用户听歌与心理画像
 */
export const generateAiProfileSummary = async(
  apiKey: string,
  baseUrl: string,
  modelName: string,
): Promise<string> => {
  const profile = analyzeUserProfile()
  const topArtists = profile.topArtists.join('、') || '周杰伦、陈奕迅、林俊杰'
  const playedKeys = Object.keys(profile.playCounts).slice(0, 10).join('；') || '晴天、海阔天空、City of Stars'

  const prompt = `你是一名资深音乐心理学家与音乐审美分析师。请根据用户的听歌历史与点播数据，用 80~120 字总结出该用户的音乐审美性格、心理情感喜好与曲风意境倾向：
【数据样本】
- 最喜爱歌手：${topArtists}
- 近期听歌轨迹：${playedKeys}
- 收藏歌单数量：${profile.sampleCount} 首

【输出要求】
请输出一段温暖、具象、富有同理心的音乐审美性格摘要，直接给出总结段落，不要包含多余前缀或 Markdown 标记。`

  try {
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    const endpoint = `${cleanBaseUrl}chat/completions`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName || 'glm-4.7-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`AI 画像请求响应异常: ${response.status}`)
    }

    const data = await response.json()
    const summary = data.choices?.[0]?.message?.content?.trim() ?? ''
    if (summary) {
      saveAiProfileSummary(summary)
      addProfileLog(`AI 深度总结用户听歌与心理画像: "${summary.slice(0, 30)}..."`)
      return summary
    }
  } catch (err: any) {
    console.error('生成 AI 用户画像失败:', err)
  }
  return getAiProfileSummary()
}

/**
 * 生成供 System Prompt 调用的用户画像摘要文本（融入 AI 深度总结）
 */
export const getUserProfilePromptString = (): string => {
  const profile = analyzeUserProfile()
  const artistsStr = profile.topArtists.length ? profile.topArtists.join('、') : '周杰伦、陈奕迅、林俊杰'
  const genresStr = profile.genreTags.join('、')
  const aiSummary = getAiProfileSummary()

  let prompt = `【用户基础听歌偏好】：偏爱歌手 [${artistsStr}]；常用曲风 [${genresStr}]。`

  if (aiSummary) {
    prompt += `\n【用户长效 AI 深度心理与审美画像】：${aiSummary}\n请在推荐歌曲、播报串词与对话交流时，自然贴合该画像的性格与情感特点。`
  } else {
    prompt += '\n在推荐时请优先融入符合该审美偏好的歌曲或同风格宝藏作品。'
  }

  return prompt
}
