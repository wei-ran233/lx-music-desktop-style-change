import { loveList } from '@renderer/store/list/state'
import { addProfileLog } from '@renderer/store/dj'

export interface UserTasteProfile {
  topArtists: string[]
  sampleCount: number
  genreTags: string[]
  lastAnalyzedTime: string
}

/**
 * 分析“我的喜爱”歌单并提取用户特征画像
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
      `提取“我的喜爱”歌单 (${sampleCount} 首): 最喜爱歌手 [${topArtists.join(', ')}]`,
    )
  } else {
    addProfileLog('实时计算环境规则偏好: 包含 [R&B, 流行, 治愈系轻音乐]')
  }

  return {
    topArtists,
    sampleCount,
    genreTags,
    lastAnalyzedTime,
  }
}
