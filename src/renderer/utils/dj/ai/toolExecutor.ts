import { markRaw } from '@common/utils/vueTools'
import musicSdk from '@renderer/utils/musicSdk'
import { toNewMusicInfo } from '@renderer/utils'
import { getPicPath } from '@renderer/core/music'
import { handlePlay, playNext, playPrev, pause } from '@renderer/core/player'
import { addTempPlayList, setPlayMusicInfo } from '@renderer/store/player/action'
import { playInfo } from '@renderer/store/player/state'
import { addListMusics } from '@renderer/store/list/action'
import { LIST_IDS } from '@common/constants'
import { recommendFromLoveList } from '@renderer/utils/dj/templateEngine'
import { recordPlayedSong } from '@renderer/utils/dj/userProfile'
import type { MusicCard, WeatherType, DjMode } from '@renderer/utils/dj/types'

const isNonOriginal = (name: string, singer?: string): boolean => {
  const text = `${name} ${singer ?? ''}`
  return /(翻唱|翻自|cover|Cover|live|Live|现场|伴奏|instrumental|纯音乐伴奏|remix|Remix|DJ版|官方版MV|演奏版|合唱版|对唱版|粤语版|国语版)/.test(text)
}

const pickBestOriginal = (results: any[]): any => {
  if (!results?.length) return null
  const candidates: any[] = []
  for (const r of results) {
    if (r?.list?.length) candidates.push(r.list[0])
  }
  if (!candidates.length) return null
  const originals = candidates.filter(c => !isNonOriginal(c.name, c.singer))
  const pool = originals.length ? originals : candidates
  return pool[0]
}

export async function searchMusicTrack(kw: string, singerHint?: string): Promise<LX.Music.MusicInfo | null> {
  try {
    const results = await musicSdk.searchMusic({ name: kw, singer: singerHint ?? '', source: undefined, limit: 5 })
    let topSong = pickBestOriginal(results)
    if (topSong && singerHint) {
      const hintNorm = singerHint.trim().toLowerCase()
      const matched = (results || []).flatMap((r: any) => r?.list || []).find((c: any) => {
        const s = (c.singer || '').toLowerCase()
        return (s.includes(hintNorm) || hintNorm.includes(s)) && !isNonOriginal(c.name, c.singer)
      })
      if (matched) topSong = matched
    }
    if (topSong) {
      const musicInfo = toNewMusicInfo(topSong)
      try {
        const picUrl = await getPicPath({ musicInfo })
        if (picUrl) musicInfo.meta.picUrl = picUrl
      } catch { /* ignore */ }
      return markRaw(musicInfo)
    }
  } catch (err) {
    console.error('[ToolExecutor] 搜歌异常:', err)
  }
  return null
}

export async function playMusicTrack(musicInfo: LX.Music.MusicInfo) {
  recordPlayedSong(musicInfo.name, musicInfo.singer)
  const currentListId = playInfo.playerListId
  if (currentListId && currentListId !== LIST_IDS.PLAY_LATER) {
    await addListMusics(currentListId, [musicInfo])
    setPlayMusicInfo(currentListId, musicInfo, false)
    handlePlay()
    return
  }
  addTempPlayList([{ listId: LIST_IDS.PLAY_LATER, musicInfo, isTop: true }])
  await playNext(true)
}

export interface ToolExecutionContext {
  weatherType?: WeatherType
  mode?: DjMode
  onFoundMusicCard?: (card: MusicCard) => void
}

/**
 * 执行 AI 工具调用并返回结构化结果供大模型继续推理
 */
export async function executeToolAction(
  name: string,
  args: any,
  context?: ToolExecutionContext,
): Promise<Record<string, any>> {
  switch (name) {
    case 'search_and_play': {
      const { keyword, singer, reason, immediatePlay } = args
      const musicInfo = await searchMusicTrack(keyword, singer)
      if (!musicInfo) {
        return {
          found: false,
          keyword,
          singer,
          message: `未能在音乐库中找到歌曲《${keyword}》${singer ? ` - ${singer}` : ''}`,
        }
      }

      const card: MusicCard = {
        name: musicInfo.name,
        singer: musicInfo.singer,
        reason: reason || '',
        pic: musicInfo.meta?.picUrl || undefined,
        source: musicInfo.source,
        id: musicInfo.id,
      }

      context?.onFoundMusicCard?.(card)

      if (immediatePlay !== false) {
        try {
          await playMusicTrack(musicInfo)
        } catch (playErr: any) {
          console.warn('[ToolExecutor] 自动播放失败:', playErr)
        }
      }

      return {
        found: true,
        name: musicInfo.name,
        singer: musicInfo.singer,
        source: musicInfo.source,
        reason: reason || '精选推荐',
        played: immediatePlay !== false,
      }
    }

    case 'get_user_favorites': {
      const weatherType = context?.weatherType || 'sunny'
      const mode = context?.mode || 'dj'
      const loveRecs = recommendFromLoveList(weatherType, mode)
      const limit = Math.min(10, Math.max(1, args.limit || 5))
      const selected = loveRecs.slice(0, limit)

      return {
        count: selected.length,
        songs: selected.map(s => ({
          name: s.name,
          singer: s.singer,
          reason: s.reason,
        })),
      }
    }

    case 'control_player': {
      const action = args.action
      switch (action) {
        case 'play':
          handlePlay()
          return { success: true, action: 'play', message: '已继续播放音乐' }
        case 'pause':
          pause()
          return { success: true, action: 'pause', message: '已暂停音乐播放' }
        case 'next':
          await playNext(true)
          return { success: true, action: 'next', message: '已切换至下一首歌曲' }
        case 'prev':
          await playPrev(true)
          return { success: true, action: 'prev', message: '已切换至上一首歌曲' }
        default:
          return { success: false, action, message: `不支持的操作: ${action}` }
      }
    }

    default:
      throw new Error(`未知的工具名称: ${name}`)
  }
}
