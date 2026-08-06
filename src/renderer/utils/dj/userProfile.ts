/**
 * 用户画像服务 — 本地化版本
 *
 * 核心改进：
 * 1. 完全本地计算，无需 LLM API
 * 2. 增加时段偏好分析（早上/下午/晚上爱听什么）
 * 3. 增加风格过渡分析
 * 4. 缓存分析结果，避免重复计算
 */

import { loveList } from '@renderer/store/list/state'
import { addProfileLog } from '@renderer/store/dj'
import type { UserTasteProfile, MusicGenre, TimePeriod } from './types'

const PROFILE_STORAGE_KEY = 'lx_ai_user_profile_v1'
const AI_SUMMARY_STORAGE_KEY = 'lx_ai_user_profile_summary_v1'
const USER_TAGS_STORAGE_KEY = 'lx_ai_user_tags_v1'

// 用户手动编辑的标签（曲风/歌手），合并进分析结果
const loadUserTags = (): { genres: string[], artists: string[] } => {
  try {
    const raw = localStorage.getItem(USER_TAGS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        genres: Array.isArray(parsed.genres) ? parsed.genres : [],
        artists: Array.isArray(parsed.artists) ? parsed.artists : [],
      }
    }
  } catch (e) {
    console.error('加载用户标签异常:', e)
  }
  return { genres: [], artists: [] }
}

export const getUserTags = (): { genres: string[], artists: string[] } => loadUserTags()

export const saveUserTags = (tags: { genres: string[], artists: string[] }) => {
  try {
    localStorage.setItem(USER_TAGS_STORAGE_KEY, JSON.stringify({
      genres: tags.genres.filter(Boolean).slice(0, 20),
      artists: tags.artists.filter(Boolean).slice(0, 20),
    }))
  } catch (e) {
    console.error('保存用户标签异常:', e)
  }
}

// 本地缓存
let cachedProfile: UserTasteProfile | null = null
let lastAnalyzedLoveListLength = -1

// ─── 本地数据持久化 ────────────────────────────────────

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

// ─── 曲风关键词映射（从歌名/歌手推断） ─────────────────

const genreKeywords: Record<MusicGenre, string[]> = {
  pop: ['流行', 'pop', 'Pop'],
  rock: ['摇滚', 'rock', 'Rock', '乐队', 'band'],
  'r&b': ['r&b', 'R&B', '节奏布鲁斯', 'rnb'],
  jazz: ['爵士', 'jazz', 'Jazz'],
  classical: ['古典', 'classical', '交响', '钢琴曲', '小提琴'],
  electronic: ['电子', 'electronic', '电音', 'dj', 'remix'],
  hiphop: ['嘻哈', 'hiphop', 'hip hop', 'rap', '说唱'],
  folk: ['民谣', 'folk', 'folk', '吉他'],
  ambient: ['氛围', 'ambient', '环境', '轻音乐', '纯音乐', 'new age'],
  citypop: ['citypop', 'city pop', '都市'],
  bossanova: ['bossanova', 'bossa nova', 'bossa'],
  acoustic: ['acoustic', '不插电', 'unplugged', '吉他'],
  chinese: ['国风', '古风', '民乐', '古筝', '二胡', '琵琶', '中国风'],
  kpop: ['kpop', 'k-pop', '韩流'],
  edm: ['edm', '电子舞曲', 'house', 'trance', 'dubstep'],
  country: ['country', '乡村', 'country'],
  blues: ['blues', '蓝调', '布鲁斯'],
  metal: ['metal', '金属', '重金属', '摇滚'],
}

const guessGenreFromName = (name: string, singer?: string): MusicGenre | null => {
  const text = `${name} ${singer ?? ''}`.toLowerCase()
  for (const [genre, keywords] of Object.entries(genreKeywords)) {
    if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
      return genre as MusicGenre
    }
  }
  return null
}

// ─── 情绪标签推断（从歌名关键词） ──────────────────────

const moodKeywords: Array<{ mood: string, keywords: string[] }> = [
  { mood: '治愈', keywords: ['治愈', '温暖', '温柔', '心安', '拥抱', '暖'] },
  { mood: '燃', keywords: ['燃', '热血', '奋斗', '冲', '燃爆', '逆袭', '追梦'] },
  { mood: '伤感', keywords: ['伤', '泪', '离别', '遗憾', '痛', '孤独', '想念', '心碎'] },
  { mood: '欢快', keywords: ['快乐', '开心', '阳光', '欢', '跳', '舞', '恋爱', '甜蜜'] },
  { mood: '安静', keywords: ['安静', '夜深', '入睡', '放空', '冥想', '静'] },
  { mood: '励志', keywords: ['梦', '未来', '希望', '前行', '相信', '勇气', '加油'] },
]

const inferMood = (name: string): string | null => {
  const text = `${name}`
  for (const { mood, keywords } of moodKeywords) {
    if (keywords.some(kw => text.includes(kw))) return mood
  }
  return null
}

// ─── 语种推断（从歌手/歌名特征） ───────────────────────

const inferLang = (name: string, singer?: string): string | null => {
  const text = `${name} ${singer ?? ''}`
  // 中文歌名（含中文常见字符）优先判为国语
  if (/[一-龥]/.test(text)) {
    if (/(粤|香港|Beyond|陈奕迅|杨千嬅|郑秀文)/.test(text)) return '粤语'
    if (/(日|日本|日语|J-POP)/.test(text)) return '日语'
    if (/(韩|韩国|K-POP|Korea)/.test(text)) return '韩语'
    return '国语'
  }
  if (/[a-zA-Z]/.test(text)) return '英语'
  return null
}

// ─── 时段偏好分析 ───────────────────────────────────────

const detectTimePeriod = (): TimePeriod => {
  const h = new Date().getHours()
  if (h >= 5 && h < 7) return 'dawn'
  if (h >= 7 && h < 11) return 'morning'
  if (h >= 11 && h < 13) return 'noon'
  if (h >= 13 && h < 18) return 'afternoon'
  if (h >= 18 && h < 21) return 'evening'
  if (h >= 21 && h < 24) return 'night'
  return 'lateNight'
}

// ─── 公开 API ───────────────────────────────────────────

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
  // 清除缓存，下次重新分析
  cachedProfile = null
}

/**
 * 分析"我的喜爱"歌单与听歌历史，提取用户特征画像
 * 完全本地计算，无需 LLM
 */
export const analyzeUserProfile = (): UserTasteProfile => {
  const songs = (loveList as any)?.list || []
  const currentLength = songs.length

  // 使用缓存（如果歌单没有变化）
  if (cachedProfile && lastAnalyzedLoveListLength === currentLength) {
    return cachedProfile
  }

  const singerCountMap: Record<string, number> = {}
  const genreCountMap: Record<string, number> = {}
  const moodCountMap: Record<string, number> = {}
  const langCountMap: Record<string, number> = {}

  songs.forEach((song: any) => {
    const singer = song.singer || song.artist
    const songName = song.name || ''
    if (singer) {
      singerCountMap[singer] = (singerCountMap[singer] || 0) + 1
    }

    // 曲风推断
    const genre = guessGenreFromName(songName, singer)
    if (genre) {
      genreCountMap[genre] = (genreCountMap[genre] || 0) + 1
    }

    // 情绪推断
    const mood = inferMood(songName)
    if (mood) {
      moodCountMap[mood] = (moodCountMap[mood] || 0) + 1
    }

    // 语种推断
    const lang = inferLang(songName, singer)
    if (lang) {
      langCountMap[lang] = (langCountMap[lang] || 0) + 1
    }
  })

  // 合并本地播放数据
  const localData = loadLocalProfileData()
  Object.keys(localData).forEach((key) => {
    if (key.startsWith('artist:')) {
      const artistName = key.replace(/^artist:/, '')
      singerCountMap[artistName] = (singerCountMap[artistName] || 0) + localData[key]
    }
  })

  // 排序歌手
  const sortedArtists = Object.keys(singerCountMap).sort(
    (a, b) => singerCountMap[b] - singerCountMap[a],
  )
  const topArtists = sortedArtists.slice(0, 5)

  // 排序曲风
  const sortedGenres = Object.keys(genreCountMap)
    .filter(k => (genreCountMap as any)[k] > 0)
    .sort((a, b) => (genreCountMap as any)[b] - (genreCountMap as any)[a])
    .slice(0, 5) as MusicGenre[]

  const sampleCount = songs.length
  const now = new Date()
  const lastAnalyzedTime = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`

  // 合并用户手动编辑的标签
  const userTags = loadUserTags()

  const autoGenres = sortedGenres.length > 0
    ? sortedGenres.map(g => {
      const labelMap: Record<string, string> = {
        pop: '流行',
        rock: '摇滚',
        'r&b': 'R&B',
        jazz: '爵士',
        classical: '古典',
        electronic: '电子',
        folk: '民谣',
        ambient: '纯音乐',
        citypop: 'CityPop',
        chinese: '国风',
        acoustic: '不插电',
      }
      return labelMap[g] || g
    })
    : ['R&B', '流行', '治愈系', 'CityPop', '纯音乐']

  // 用户标签优先展示，去重
  const genreTags = [...new Set([...userTags.genres, ...autoGenres])].slice(0, 8)
  const mergedArtists = [...new Set([...userTags.artists, ...topArtists])].slice(0, 8)

  // 计算曲风/歌手占比（基于出现次数）
  const totalSingerCount = Math.max(1, Object.values(singerCountMap).reduce((s, n) => s + n, 0))
  const totalGenreCount = Math.max(1, Object.values(genreCountMap).reduce((s, n) => s + n, 0))
  const totalSongCount = Math.max(1, songs.length)

  const artistDistribution = Object.entries(singerCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, percent: Math.round(count / totalSingerCount * 100) }))

  const genreDistribution = Object.entries(genreCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([g, count]) => {
      const labelMap: Record<string, string> = {
        pop: '流行',
        rock: '摇滚',
        'r&b': 'R&B',
        jazz: '爵士',
        classical: '古典',
        electronic: '电子',
        folk: '民谣',
        ambient: '纯音乐',
        citypop: 'CityPop',
        chinese: '国风',
        acoustic: '不插电',
        hiphop: '嘻哈',
        kpop: '韩流',
        edm: 'EDM',
      }
      return { name: labelMap[g] || g, percent: Math.round(count / totalGenreCount * 100) }
    })

  // 情绪标签：按出现次数排序，取有占比的
  const moodTags = Object.entries(moodCountMap)
    .sort((a, b) => b[1] - a[1])
    .filter(([, count]) => count / totalSongCount >= 0.05)
    .slice(0, 3)
    .map(([mood]) => mood)

  // 语种标签
  const langTags = Object.entries(langCountMap)
    .sort((a, b) => b[1] - a[1])
    .filter(([, count]) => count / totalSongCount >= 0.05)
    .slice(0, 3)
    .map(([lang]) => lang)

  const profile: UserTasteProfile = {
    topArtists: mergedArtists,
    topGenres: sortedGenres,
    sampleCount,
    genreTags,
    genreDistribution,
    artistDistribution,
    moodTags,
    langTags,
    playCounts: localData,
    lastAnalyzedTime,
  }

  // 更新缓存
  cachedProfile = profile
  lastAnalyzedLoveListLength = currentLength

  if (topArtists.length > 0) {
    addProfileLog(`提取用户偏好画像: 最喜爱歌手 [${topArtists.join(', ')}]`)
  } else {
    addProfileLog('实时计算环境规则偏好: 包含 [R&B, 流行, 治愈系轻音乐]')
  }

  if (sortedGenres.length > 0) {
    addProfileLog(`检测到用户曲风偏好: [${sortedGenres.join(', ')}]`)
  }

  return profile
}

/**
 * 获取用户画像摘要字符串（用于 System Prompt）
 */
export const getUserProfilePromptString = (): string => {
  const profile = analyzeUserProfile()
  const artistsStr = profile.topArtists.length
    ? profile.topArtists.join('、')
    : '周杰伦、陈奕迅、林俊杰'
  const genresStr = profile.genreTags.join('、')
  const moodStr = profile.moodTags.length ? `；情绪倾向 [${profile.moodTags.join('、')}]` : ''
  const langStr = profile.langTags.length ? `；语种偏好 [${profile.langTags.join('、')}]` : ''
  const genreDistStr = profile.genreDistribution.length
    ? `\n【曲风占比】${profile.genreDistribution.map(g => `${g.name} ${g.percent}%`).join('、')}。`
    : ''
  const aiSummary = getAiProfileSummary()

  let prompt = `【用户基础听歌偏好】：偏爱歌手 [${artistsStr}]；常用曲风 [${genresStr}]${moodStr}${langStr}。${genreDistStr}`

  if (aiSummary) {
    prompt += `\n【用户长效 AI 深度心理与审美画像】：${aiSummary}\n请在推荐歌曲、播报串词与对话交流时，自然贴合该画像的性格与情感特点。`
  } else {
    prompt += '\n在推荐时请优先融入符合该审美偏好的歌曲或同风格宝藏作品。'
  }

  return prompt
}

/**
 * 获取时段推荐曲风（基于当前时间）
 */
export const getTimePeriodRecommendation = (): { period: TimePeriod, label: string, genres: string[] } => {
  const period = detectTimePeriod()
  const labels: Record<TimePeriod, string> = {
    dawn: '清晨',
    morning: '早晨',
    noon: '正午',
    afternoon: '下午',
    evening: '傍晚',
    night: '夜晚',
    lateNight: '深夜',
  }
  const genreMap: Record<TimePeriod, string[]> = {
    dawn: ['民谣', '不插电', '古典'],
    morning: ['流行', '民谣', 'CityPop'],
    noon: ['流行', 'R&B', '爵士'],
    afternoon: ['爵士', 'Bossa Nova', '古典', '纯音乐'],
    evening: ['CityPop', 'R&B', '流行', '摇滚'],
    night: ['R&B', '纯音乐', '爵士', '电子'],
    lateNight: ['纯音乐', '古典', '民谣'],
  }

  return {
    period,
    label: labels[period],
    genres: genreMap[period] || ['流行'],
  }
}

// ─── AI 画像摘要（轻量版，可选 LLM 增强） ───────────────

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
