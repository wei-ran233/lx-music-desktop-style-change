/**
 * useDjChat — 聊天逻辑 composable
 *
 * 封装消息发送、流式响应、音乐搜索、推荐处理
 */

import { ref, computed, markRaw } from '@common/utils/vueTools'
import { djSettings } from '@renderer/store/dj'
import { sendLlmStreamMessage } from '@renderer/utils/dj/llmService'
import { synthesizeSpeech } from '@renderer/utils/dj/ttsService'
import { playDjSpeech } from '@renderer/core/player/djAudio'
import { recordPlayedSong } from '@renderer/utils/dj/userProfile'
import {
  buildDjIntroText,
  generateDjCommentary,
  generateChatRecommendation,
  recommendFromLoveList,
} from '@renderer/utils/dj/templateEngine'
import musicSdk from '@renderer/utils/musicSdk'
import { toNewMusicInfo } from '@renderer/utils'
import { getPicPath } from '@renderer/core/music'
import { addTempPlayList, setPlayMusicInfo } from '@renderer/store/player/action'
import { playNext, handlePlay } from '@renderer/core/player'
import { playInfo } from '@renderer/store/player/state'
import { addListMusics } from '@renderer/store/list/action'
import { LIST_IDS } from '@common/constants'
import { getCurrentDjWeatherContext } from '@renderer/composables/useDjWeather'
import type { DjMode, ChatMessage, MusicCard, WeatherType } from '@renderer/utils/dj/types'

// 模块级单例状态：页面卸载后仍存活，供 DJ 自动连播等跨页面逻辑使用
const messageList = ref<ChatMessage[]>([])
const inputMessage = ref('')
const isGenerating = ref(false)
const isPlayingMusic = ref(false)
const activeFeatureTag = ref<{ type: string, label: string, placeholder: string } | null>(null)
const showPlusMenu = ref(false)
// 当前模式（DJ / 聊天），模块级以便跨页面连播判断
// 默认非 DJ，避免未进入 DJ 页面时也触发自动连播
const djMode = ref<DjMode>('chat')
// DJ 页面是否处于活跃状态（进入页面置 true，离开置 false）
let isDjPageActive = false
let activeGenerationAbortController: AbortController | null = null
let activeGenerationId = 0

const clearActiveGeneration = (generationId: number, abortController: AbortController | null) => {
  if (generationId !== activeGenerationId) return
  if (!abortController || activeGenerationAbortController === abortController) {
    activeGenerationAbortController = null
  }
  isGenerating.value = false
}

const hasMessages = computed(() => messageList.value.length > 0)

/** 获取/设置当前模式（模块级） */
export const getDjMode = (): DjMode => djMode.value
export const setDjMode = (m: DjMode) => { djMode.value = m }

/** 标记 DJ 页面是否活跃（进入/离开 DJ 页面时由页面调用） */
export const setDjPageActive = (active: boolean) => {
  isDjPageActive = active
}

/** DJ 页面是否活跃（仅活跃且模式为 dj 时才允许自动连播） */
export const isDjActive = (): boolean => isDjPageActive && djMode.value === 'dj'

// 已推荐歌曲去重（模块级，最近 30 首），避免 DJ 连续推送重复歌曲
const recommendedHistory: string[] = []

const rememberRecommended = (name?: string) => {
  if (!name) return
  const idx = recommendedHistory.indexOf(name)
  if (idx > -1) recommendedHistory.splice(idx, 1)
  recommendedHistory.unshift(name)
  if (recommendedHistory.length > 30) recommendedHistory.pop()
}

const hasBeenRecommended = (name?: string): boolean => {
  if (!name) return false
  return recommendedHistory.includes(name)
}

/** 重置去重记录（新建对话时调用） */
export const resetRecommendedHistory = () => {
  recommendedHistory.splice(0, recommendedHistory.length)
}

const isAbortError = (err: unknown): boolean => {
  return !!err && typeof err === 'object' && (err as Error).name === 'AbortError'
}

interface MusicSearchCacheEntry {
  data: LX.Music.MusicInfo | null
  expiresAt: number
}

const MUSIC_SEARCH_CACHE_TTL_MS = 5 * 60 * 1000
const MUSIC_SEARCH_CACHE_MAX_SIZE = 80
const musicSearchCache = new Map<string, MusicSearchCacheEntry>()
const pendingMusicSearches = new Map<string, Promise<LX.Music.MusicInfo | null>>()

const getMusicSearchCacheKey = (kw: string, singer?: string) => {
  return `${kw.trim().toLowerCase()}::${(singer ?? '').trim().toLowerCase()}`
}

const getCachedMusicSearch = (key: string): MusicSearchCacheEntry | null => {
  const entry = musicSearchCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    musicSearchCache.delete(key)
    return null
  }
  return entry
}

const setCachedMusicSearch = (key: string, data: LX.Music.MusicInfo | null) => {
  musicSearchCache.set(key, {
    data,
    expiresAt: Date.now() + MUSIC_SEARCH_CACHE_TTL_MS,
  })
  if (musicSearchCache.size > MUSIC_SEARCH_CACHE_MAX_SIZE) {
    const firstKey = musicSearchCache.keys().next().value
    if (firstKey) musicSearchCache.delete(firstKey)
  }
}

const MAX_LLM_CONTEXT_MESSAGES = 12
const MAX_LLM_CONTEXT_CHARS = 7000
const MAX_LLM_SINGLE_MESSAGE_CHARS = 1200

const trimContextText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

const formatContextMessage = (msg: ChatMessage): string => {
  let content = trimContextText(msg.text || '', MAX_LLM_SINGLE_MESSAGE_CHARS)
  const cards = msg.musicCards || (msg.musicCard ? [msg.musicCard] : [])
  const cardNames = cards
    .filter(card => !!card?.name)
    .slice(0, 4)
    .map(card => `《${card.name}》${card.singer ? `-${card.singer}` : ''}`)

  if (cardNames.length) {
    const appendix = `\n已推荐歌曲：${cardNames.join('、')}`
    content = trimContextText(`${content}${appendix}`, MAX_LLM_SINGLE_MESSAGE_CHARS)
  }
  return content
}

const buildLlmHistory = (messages: ChatMessage[]) => {
  const selected: Array<{ role: 'user' | 'assistant', content: string }> = []
  let totalLength = 0

  for (let i = messages.length - 1; i >= 0; i--) {
    if (selected.length >= MAX_LLM_CONTEXT_MESSAGES) break
    const msg = messages[i]
    if (!msg.text || msg.text === '...') continue

    const content = formatContextMessage(msg)
    if (!content) continue
    if (totalLength + content.length > MAX_LLM_CONTEXT_CHARS && selected.length > 0) break

    selected.unshift({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content,
    })
    totalLength += content.length
  }

  return selected
}

export function useDjChat() {
  /** 提取 AI 回复中的推荐歌曲列表 */
  const extractRecommendedSongList = (aiText: string, userQuery: string): string[] => {
    const matches = Array.from(aiText.matchAll(/《([^》]+)》/g)).map(m => m[1].trim())
    if (matches.length > 0) return matches

    // 无《》匹配时，尝试 JSON 提取
    const jsonMatch = aiText.match(/\{"recommend_musics":\s*\[.*?\]\}/s)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.recommend_musics?.length) {
          return parsed.recommend_musics.map((m: any) => m.name)
        }
      } catch { /* ignore */ }
    }

    // 通用问候语 fallback
    const commonGreetings = ['你好', 'hi', 'hello', '在吗', '哈啰', '早上好', '晚安', '你好呀', '嗨']
    if (commonGreetings.includes(userQuery.trim().toLowerCase()) || userQuery.trim().length <= 2) {
      return ['晴天']
    }
    return [userQuery]
  }

  /** 剥离 LLM 回复中附加的 JSON 数据块（{"recommend_musics": [...]} 或 ```json ... ```） */
  const stripJsonBlock = (text: string): string => {
    if (!text) return text
    let result = text
    // 剥离 ```json ... ``` 代码块
    result = result.replace(/```json[\s\S]*?```/g, '')
    // 剥离 {"recommend_musics": [...]} JSON 对象（含可能的尾随）
    result = result.replace(/\{"recommend_musics"\s*:\s*\[[\s\S]*?\}\]\s*/g, '')
    // 清理多余的换行和空格
    result = result.replace(/\n{3,}/g, '\n\n').trim()
    return result
  }

  /** 搜索音乐 */
  /** 搜索音乐，返回精简卡片（用于展示） */
  const executeMusicSearch = async(kw: string, singer?: string): Promise<MusicCard | null> => {
    const full = await executeMusicSearchFull(kw, singer)
    if (!full) return null
    return markRaw({
      name: full.name,
      singer: full.singer,
      reason: '',
      pic: full.meta?.picUrl ?? undefined,
      source: full.source,
      meta: full.meta as unknown as { picUrl?: string },
      id: full.id,
    })
  }

  /** 搜索音乐，返回完整 MusicInfo（用于加入列表/播放，含 interval 等必需字段） */
  /** 判断是否为翻唱/现场/伴奏等非原唱版本 */
  const isNonOriginal = (name: string, singer?: string): boolean => {
    const text = `${name} ${singer ?? ''}`
    return /(翻唱|翻自|cover|Cover|live|Live|现场|伴奏|instrumental|纯音乐伴奏|remix|Remix|DJ版|官方版MV|演奏版|合唱版|对唱版|粤语版|国语版)/.test(text)
  }

  /** 从多音源结果中挑选最像原唱的版本（优先排除翻唱/现场，其次选高相关度） */
  const pickBestOriginal = (results: any[]): any => {
    if (!results?.length) return null
    const candidates: any[] = []
    for (const r of results) {
      if (r?.list?.length) candidates.push(r.list[0])
    }
    if (!candidates.length) return null

    // 先排除明显的非原唱版本
    const originals = candidates.filter(c => !isNonOriginal(c.name, c.singer))
    const pool = originals.length ? originals : candidates
    // 取第一个（各音源相关度最高的第一首，通常是最匹配的原唱）
    return pool[0]
  }

  const executeMusicSearchFull = async(kw: string, singerHint?: string): Promise<LX.Music.MusicInfo | null> => {
    const cacheKey = getMusicSearchCacheKey(kw, singerHint)
    const cached = getCachedMusicSearch(cacheKey)
    if (cached) return cached.data

    const pending = pendingMusicSearches.get(cacheKey)
    if (pending) return pending

    const promise = doExecuteMusicSearchFull(kw, singerHint).then((result) => {
      setCachedMusicSearch(cacheKey, result)
      return result
    }).finally(() => {
      pendingMusicSearches.delete(cacheKey)
    })
    pendingMusicSearches.set(cacheKey, promise)
    return promise
  }

  const doExecuteMusicSearchFull = async(kw: string, singerHint?: string): Promise<LX.Music.MusicInfo | null> => {
    try {
      const results = await musicSdk.searchMusic({ name: kw, singer: singerHint ?? '', source: undefined, limit: 5 })
      let topSong = pickBestOriginal(results)
      // 若指定了歌手提示，在结果中优先找歌手名匹配的版本
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
        // markRaw 防止被 Vue 转为 reactive proxy 导致 IPC 克隆失败
        return markRaw(musicInfo)
      }
    } catch (e) {
      console.error('搜索音乐库异常:', e)
    }
    return null
  }

  /** 更新消息中的音乐卡片封面 */
  const preloadMusicCardCovers = (messages: ChatMessage[]) => {
    if (!messages?.length) return
    messages.forEach((msg) => {
      const cards = msg.musicCards || (msg.musicCard ? [msg.musicCard] : [])
      cards.forEach((card) => {
        if (card && !card.pic && !card.meta?.picUrl) {
          executeMusicSearch(card.name, card.singer).then((meta) => {
            if (meta?.pic) card.pic = meta.pic
            if (meta?.source) card.source = meta.source
          }).catch(() => { /* ignore */ })
        }
      })
    })
  }

  /** 发送消息 */
  const sendMessage = async(
    mode: DjMode,
    weatherStr: string,
    weatherType: WeatherType,
    onSaveSession?: () => void,
    options?: { silent?: boolean, query?: string },
  ) => {
    const silent = options?.silent ?? false
    const overrideQuery = options?.query?.trim()
    if (!overrideQuery && !inputMessage.value.trim() && !activeFeatureTag.value) return
    if (isGenerating.value) return

    let tagPrefix = ''
    if (activeFeatureTag.value) {
      tagPrefix = `[${activeFeatureTag.value.label}] `
    }

    const rawQuery = overrideQuery ?? inputMessage.value.trim()
    const userText = overrideQuery ? rawQuery : tagPrefix + rawQuery

    // 非静默模式才添加用户消息（自动连播等场景静默，不显示系统指令气泡）
    if (!silent) {
      messageList.value.push({ sender: 'user', text: userText })
    }
    inputMessage.value = ''
    activeFeatureTag.value = null
    isGenerating.value = true
    const generationId = ++activeGenerationId

    // 添加 AI 占位
    const aiMsgIndex = messageList.value.length
    messageList.value.push({ sender: 'ai', text: '...', musicCards: undefined })

    const abortController = new AbortController()
    activeGenerationAbortController = abortController
    try {
      // 未配置 API Key → 使用本地模板引擎
      if (!djSettings.apiKey) {
        await handleLocalRecommendation(rawQuery, mode, weatherStr, weatherType, aiMsgIndex, onSaveSession, abortController.signal, generationId)
        return
      }

      // 配置了 API Key → 走 LLM
      await handleLlmStream(rawQuery, mode, weatherStr, weatherType, aiMsgIndex, onSaveSession, abortController.signal, generationId)
    } catch (err) {
      if (!isAbortError(err)) console.error('AI DJ 发送消息失败:', err)
    } finally {
      clearActiveGeneration(generationId, abortController)
    }
  }

  /** 本地推荐处理（无 API Key 时） */
  const handleLocalRecommendation = async(
    rawQuery: string,
    mode: DjMode,
    weatherStr: string,
    weatherType: WeatherType,
    aiMsgIndex: number,
    onSaveSession?: () => void,
    signal?: AbortSignal,
    generationId?: number,
  ) => {
    const isStaleGeneration = () => (signal?.aborted ?? false) || (generationId != null && generationId !== activeGenerationId)
    const lower = rawQuery.toLowerCase()
    const isGreeting = ['你好', 'hi', 'hello', '在吗', '哈啰', '早上好', '晚安'].includes(lower)

    // 尝试从喜爱歌单推荐
    const loveRecommendations = recommendFromLoveList(weatherType, mode)
    // 过滤掉已推荐过的歌曲，避免连续推送重复
    const freshRecommendations = loveRecommendations.filter(r => !hasBeenRecommended(r.name))

    let targetKws: Array<{ name: string, singer?: string }> = []
    if (isGreeting) {
      targetKws = [{ name: '晴天' }]
    } else if (freshRecommendations.length >= 1) {
      // 使用本地推荐（优先未推荐过的），带上歌手便于匹配原唱
      targetKws = freshRecommendations.map(r => ({ name: r.name, singer: r.singer }))
    } else {
      // 无新鲜推荐时：从喜爱歌单随机选几首（避免固定 fallback 到同一首）
      const fallback = loveRecommendations.length >= 1
        ? loveRecommendations
        : [{ name: rawQuery, singer: undefined }]
      targetKws = [...fallback].sort(() => Math.random() - 0.5).slice(0, 2)
    }

    // 搜索歌曲（支持多首），同时保留完整 MusicInfo 供自动播放
    const fullResults = (await Promise.all(
      targetKws.slice(0, 3).map(async t => executeMusicSearchFull(t.name, t.singer)),
    )).filter(Boolean) as LX.Music.MusicInfo[]
    if (isStaleGeneration()) return
    const songMetas = fullResults.map(full => markRaw({
      name: full.name,
      singer: full.singer,
      reason: '',
      pic: full.meta?.picUrl ?? undefined,
      source: full.source,
      meta: full.meta as unknown as { picUrl?: string },
      id: full.id,
    })) as MusicCard[]

    // 记录已推荐歌曲（去重）
    songMetas.forEach(s => { rememberRecommended(s.name) })

    // 生成 AI 回复文本
    let aiText = ''
    if (songMetas.length > 1) {
      const namesStr = songMetas.map((s, i) => {
        const reason = loveRecommendations[i]?.reason || ''
        return `《${s.name}》${reason ? '（' + reason + '）' : ''}`
      }).join('、')
      aiText = mode === 'dj'
        ? `🎧【${djSettings.city || '北京'}电台】为您精心编排特别歌单！${namesStr}`
        : `💬 听到关于"${rawQuery}"的倾诉，特别为您推介这几首温暖的曲目 ${namesStr}`
    } else if (songMetas.length === 1) {
      const reason = generateDjCommentary(songMetas[0].name, songMetas[0].singer, weatherType)
      aiText = mode === 'dj'
        ? `🎧【${djSettings.city || '北京'}电台】${reason}`
        : `💬 为您推荐这首《${songMetas[0].name}》：${reason}`
    } else {
      aiText = mode === 'dj'
        ? `🎧 为您搜索了关于"${rawQuery}"的相关推荐，请聆听：`
        : `💬 关于"${rawQuery}"，我找到了一些音乐推荐：`
    }

    // 为歌曲补充推荐理由
    if (songMetas.length > 0 && loveRecommendations.length > 0) {
      songMetas.forEach((song, i) => {
        if (!song.reason && loveRecommendations[i]) {
          song.reason = loveRecommendations[i].reason
        }
      })
    }

    messageList.value[aiMsgIndex] = {
      sender: 'ai',
      text: aiText,
      musicCards: songMetas,
      musicCard: songMetas[0] ?? null,
    }

    if (isStaleGeneration()) return
    onSaveSession?.()

    // DJ 模式自动播放首推歌曲（直接使用完整 MusicInfo，避免二次搜索）
    if (isStaleGeneration()) return
    if (mode === 'dj' && djSettings.djAutoPlay && fullResults.length > 0) {
      try {
        await playMusicCard(songMetas[0], fullResults[0])
      } catch (err) {
        console.error('DJ 自动播放失败:', err)
      }
    }

    // TTS 播报
    if (
      (mode === 'dj' && djSettings.enableDjSpeech) ||
      (mode === 'chat' && djSettings.enableChatSpeech)
    ) {
      if (isStaleGeneration()) return
      try {
        const audioUrl = await synthesizeSpeech(aiText, { signal })
        if (isStaleGeneration()) return
        playDjSpeech(audioUrl)
      } catch (err) {
        if (!isAbortError(err)) console.error('TTS 播放异常:', err)
      }
    }
  }

  /** LLM 流式处理 */
  const handleLlmStream = async(
    rawQuery: string,
    mode: DjMode,
    weatherStr: string,
    weatherType: WeatherType,
    aiMsgIndex: number,
    onSaveSession?: () => void,
    signal?: AbortSignal,
    generationId?: number,
  ) => {
    const isStaleGeneration = () => (signal?.aborted ?? false) || (generationId != null && generationId !== activeGenerationId)
    const formattedHistory = buildLlmHistory(messageList.value.slice(0, -1))

    let accumulatedText = ''

    await sendLlmStreamMessage(
      formattedHistory,
      mode,
      weatherStr,
      {
        onToken(token) {
          if (isStaleGeneration()) return
          accumulatedText += token
          messageList.value[aiMsgIndex].text = accumulatedText
        },
        onThinkingDelta(token) {
          if (isStaleGeneration()) return
          const current = messageList.value[aiMsgIndex].thinkingText || ''
          messageList.value[aiMsgIndex].thinkingText = current + token
        },
        async onToolCall(toolCall) {
          if (isStaleGeneration()) return
          const kw = toolCall.arguments?.keyword || rawQuery
          const songMeta = await executeMusicSearch(kw)
          if (songMeta && !isStaleGeneration()) {
            const currentCards = messageList.value[aiMsgIndex].musicCards || []
            if (!currentCards.some(c => c.id === songMeta.id)) {
              messageList.value[aiMsgIndex].musicCards = [...currentCards, songMeta]
              messageList.value[aiMsgIndex].musicCard = songMeta
            }
          }
        },
        async onComplete(fullText) {
          if (isStaleGeneration()) return
          // 剥离 JSON 数据块，只保留纯文案
          const cleanText = stripJsonBlock(fullText) || stripJsonBlock(messageList.value[aiMsgIndex].text || '')
          if (cleanText) messageList.value[aiMsgIndex].text = cleanText

          // 如果 LLM 回复中没有音乐卡片，尝试从文本提取（支持多首）
          if (!messageList.value[aiMsgIndex].musicCards?.length) {
            const songNames = extractRecommendedSongList(fullText, rawQuery)
            const uniqueNames = [...new Set(songNames)]
            const songMetas = (await Promise.all(
              uniqueNames.map(async name => executeMusicSearch(name)),
            )).filter(Boolean) as MusicCard[]
            if (isStaleGeneration()) return
            if (songMetas.length) {
              messageList.value[aiMsgIndex].musicCards = songMetas
              messageList.value[aiMsgIndex].musicCard = songMetas[0]
            }
          }

          // 记录已推荐歌曲（去重）
          messageList.value[aiMsgIndex].musicCards?.forEach(c => { rememberRecommended(c.name) })

          // 若 LLM 只返回了 tool call、没有文本，则用模板生成 DJ 串词兜底
          const cards = messageList.value[aiMsgIndex].musicCards
          const currentText = messageList.value[aiMsgIndex].text
          if ((!currentText || currentText === '...') && cards?.length) {
            const intro = buildDjIntroText(mode, weatherStr)
            const firstCard = cards[0]
            const commentary = generateDjCommentary(firstCard.name, firstCard.singer, weatherType)
            const finalText = mode === 'dj'
              ? `${intro.greeting} ${commentary}`
              : generateChatRecommendation(rawQuery, firstCard.name, firstCard.singer)
            messageList.value[aiMsgIndex].text = finalText
          }

          onSaveSession?.()

          // DJ 模式自动播放首推歌曲
          if (isStaleGeneration()) return
          if (mode === 'dj' && djSettings.djAutoPlay && cards?.length) {
            try {
              await playMusicCard(cards[0])
            } catch (err) {
              console.error('DJ 自动播放失败:', err)
            }
          }

          // TTS 播报
          const textToSpeak = messageList.value[aiMsgIndex].text || fullText
          if (
            (mode === 'dj' && djSettings.enableDjSpeech) ||
              (mode === 'chat' && djSettings.enableChatSpeech)
          ) {
            try {
              const audioUrl = await synthesizeSpeech(textToSpeak, { signal })
              if (isStaleGeneration()) return
              playDjSpeech(audioUrl)
            } catch (err) {
              if (!isAbortError(err)) console.error('TTS 播报异常:', err)
            }
          }
        },
        onError(err) {
          if (isStaleGeneration()) return
          if (isAbortError(err)) {
            const currentText = messageList.value[aiMsgIndex]?.text
            if (!currentText || currentText === '...') {
              messageList.value[aiMsgIndex].text = '已停止生成'
            }
            return
          }
          messageList.value[aiMsgIndex].text = `服务链接异常: ${err.message}。请在⚙️设置中检查 API Key 与 Endpoint`
        },
      },
      {
        signal,
        weatherType,
        onFoundMusicCard(card: MusicCard) {
          if (isStaleGeneration()) return
          const currentCards = messageList.value[aiMsgIndex].musicCards || []
          if (!currentCards.some(c => c.name === card.name && c.singer === card.singer)) {
            messageList.value[aiMsgIndex].musicCards = [...currentCards, card]
            messageList.value[aiMsgIndex].musicCard = card
          }
        },
      },
    )
  }

  /** 播放音乐卡片（内部方法，供自动播放复用；优先使用传入的完整 musicInfo） */
  const playMusicCard = async(musicCard: MusicCard, musicInfo?: LX.Music.MusicInfo | null) => {
    isPlayingMusic.value = true
    recordPlayedSong(musicCard.name, musicCard.singer)

    // 若未提供完整对象，则搜索获取（含 interval 等必需字段）
    const fullInfo = musicInfo ?? await executeMusicSearchFull(musicCard.name, musicCard.singer)
    if (fullInfo?.source) {
      musicCard.pic = fullInfo.meta?.picUrl ?? musicCard.pic
      musicCard.source = fullInfo.source

      // 优先加入当前播放列表，融合到当前目录（符合"新点歌曲加入当前目录"设计）
      const currentListId = playInfo.playerListId
      if (currentListId && currentListId !== LIST_IDS.PLAY_LATER) {
        await addListMusics(currentListId, [fullInfo])
        // 直接播放刚加入的歌曲
        setPlayMusicInfo(currentListId, fullInfo, false)
        handlePlay()
        return
      }
      // 无当前列表时降级到临时队列
      addTempPlayList([{ listId: LIST_IDS.PLAY_LATER, musicInfo: fullInfo, isTop: true }])
      await playNext(true)
    }
  }

  /** 播放音乐卡片 */
  const toggleMusicPlay = async(musicCard: MusicCard) => playMusicCard(musicCard)

  /** 删除消息 */
  const deleteMessage = (index: number) => {
    messageList.value.splice(index, 1)
  }

  /** 清空消息 */
  const clearMessages = () => {
    messageList.value = []
    activeFeatureTag.value = null
    resetRecommendedHistory()
  }

  /** 停止当前生成任务 */
  const stopGeneration = () => {
    if (!isGenerating.value && !activeGenerationAbortController) return
    activeGenerationId++
    activeGenerationAbortController?.abort()
    activeGenerationAbortController = null
    isGenerating.value = false

    const lastMsg = messageList.value[messageList.value.length - 1]
    if (lastMsg?.sender === 'ai' && (!lastMsg.text || lastMsg.text === '...')) {
      lastMsg.text = '已停止生成'
    }
  }

  /** 附加标签 */
  const attachFeatureTag = (type: 'search' | 'play') => {
    showPlusMenu.value = false
    if (type === 'search') {
      activeFeatureTag.value = {
        type: 'search',
        label: '🔍 AI 聚合搜索',
        placeholder: '输入泛意图或想听的音乐类型...',
      }
    } else {
      activeFeatureTag.value = {
        type: 'play',
        label: '🎵 快捷点歌',
        placeholder: '输入歌名或歌手名...',
      }
    }
  }

  // 注入模块级引用，供 autoContinueRecommend 跨页面调用
  moduleSendMessage = sendMessage

  return {
    messageList,
    inputMessage,
    isGenerating,
    isPlayingMusic,
    activeFeatureTag,
    showPlusMenu,
    hasMessages,
    sendMessage,
    toggleMusicPlay,
    deleteMessage,
    clearMessages,
    stopGeneration,
    attachFeatureTag,
    preloadMusicCardCovers,
    executeMusicSearch,
  }
}

// 模块级 sendMessage / executeMusicSearch 引用（由 useDjChat 调用时注入）
type ModuleSendMessage = (
  mode: DjMode,
  weatherStr: string,
  weatherType: WeatherType,
  onSaveSession?: () => void,
  options?: { silent?: boolean, query?: string },
) => Promise<void>
let moduleSendMessage: ModuleSendMessage | null = null

/**
 * 模块级 DJ 自动连播函数
 * 供播放器歌曲结束时调用（跨页面可用，不依赖组件实例）
 * @returns 是否已接管播放
 */
export const autoContinueRecommend = (): boolean => {
  // 仅 DJ 页面活跃且模式为 dj 时才允许自动连播
  if (!isDjActive() || isGenerating.value) return false
  if (!djSettings.autoContinue) return false
  if (!moduleSendMessage) return false
  const weather = getCurrentDjWeatherContext()
  // 静默推荐下一首
  void moduleSendMessage(
    'dj',
    weather.text,
    weather.type,
    undefined,
    { silent: true, query: '请继续推荐下一首好听的音乐' },
  )
  return true
}
