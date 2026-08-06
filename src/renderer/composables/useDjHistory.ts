/**
 * useDjHistory — 历史记录 composable
 *
 * 封装对话历史、推荐历史的保存/加载/删除
 */

import { ref, computed } from '@common/utils/vueTools'
import {
  djHistoryList,
  chatHistoryList,
  recommendHistoryList,
  saveHistory,
} from '@renderer/store/dj'
import { recordPlayedSong } from '@renderer/utils/dj/userProfile'
import type { DjMode, HistoryItem, ChatMessage, MusicCard } from '@renderer/utils/dj/types'

export function useDjHistory() {
  const historyCategory = ref<'dj' | 'chat' | 'recommend'>('dj')
  const activeHistoryId = ref('')

  const currentHistoryList = computed(() => {
    if (historyCategory.value === 'dj') return djHistoryList
    if (historyCategory.value === 'chat') return chatHistoryList
    return recommendHistoryList
  })

  /** 保存当前会话到历史 */
  const saveCurrentSession = (messages: ChatMessage[], mode: DjMode) => {
    if (!messages.length) return

    let firstUserMsg: ChatMessage | null = null
    for (const m of messages) {
      if (m.sender === 'user') { firstUserMsg = m; break }
    }

    let sessionTitle = firstUserMsg
      ? String(firstUserMsg.text).replace(/^\[.*?\]\s*/, '').trim()
      : ''
    if (!sessionTitle) sessionTitle = mode === 'dj' ? 'DJ 专属调频' : '知心聊天'
    sessionTitle = sessionTitle.slice(0, 16)

    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const targetList = mode === 'dj' ? djHistoryList : chatHistoryList

    // 深拷贝消息（仅保留可序列化的展示字段，避免 markRaw/复杂 meta 导致拷贝失败）
    const serializeMessages = (msgs: ChatMessage[]): ChatMessage[] => {
      return msgs.map(m => ({
        sender: m.sender,
        text: m.text,
        musicCards: m.musicCards?.map(c => ({
          name: c.name,
          singer: c.singer,
          reason: c.reason,
          pic: c.pic,
          source: c.source,
          id: c.id,
        })) ?? undefined,
        musicCard: m.musicCard ? {
          name: m.musicCard.name,
          singer: m.musicCard.singer,
          reason: m.musicCard.reason,
          pic: m.musicCard.pic,
          source: m.musicCard.source,
          id: m.musicCard.id,
        } : undefined,
      }))
    }
    const serialized = serializeMessages(messages)

    if (!activeHistoryId.value) {
      activeHistoryId.value = `${mode}-${Date.now()}`
      targetList.unshift({
        id: activeHistoryId.value,
        type: 'history',
        mode,
        title: sessionTitle,
        date: timeStr,
        messages: serialized,
      })
    } else {
      const existing = targetList.find(i => i.id === activeHistoryId.value)
      if (existing) {
        existing.messages = serialized
        existing.date = timeStr
        existing.title = sessionTitle
      } else {
        targetList.unshift({
          id: activeHistoryId.value,
          type: 'history',
          mode,
          title: sessionTitle,
          date: timeStr,
          messages: serialized,
        })
      }
    }
    // 限制历史条数，避免无限增长
    if (targetList.length > 50) targetList.splice(50)
    saveHistory()
  }

  /** 添加歌曲到推荐历史 */
  const addSongsToRecommend = (songMetas: MusicCard[]) => {
    if (!songMetas?.length) return
    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    songMetas.forEach((song) => {
      if (!song?.name) return
      const existsIndex = recommendHistoryList.findIndex(
        item => item.title === song.name && (item.singer === song.singer || !song.singer),
      )
      if (existsIndex > -1) recommendHistoryList.splice(existsIndex, 1)

      recommendHistoryList.unshift({
        id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'recommend',
        mode: 'dj',
        title: song.name,
        singer: song.singer || '精选歌手',
        date: timeStr,
      })
    })

    if (recommendHistoryList.length > 50) recommendHistoryList.splice(50)
    saveHistory()
  }

  /** 选择历史记录 */
  const selectHistory = (item: HistoryItem): ChatMessage[] | null => {
    activeHistoryId.value = item.id
    if (item.type === 'recommend') return null // 推荐项目直接播放
    if (item.messages && item.messages.length > 0) {
      return JSON.parse(JSON.stringify(item.messages))
    }
    return null
  }

  /** 直接播放推荐 */
  const directPlay = (item: HistoryItem, playMusic: (card: MusicCard) => void) => {
    recordPlayedSong(item.title, item.singer)
    playMusic({ name: item.title, singer: item.singer })
  }

  /** 删除历史记录 */
  const deleteHistory = (item: HistoryItem) => {
    const targetList = item.mode === 'dj'
      ? djHistoryList
      : item.mode === 'chat'
        ? chatHistoryList
        : recommendHistoryList

    const idx = targetList.findIndex(i => i.id === item.id)
    if (idx > -1) targetList.splice(idx, 1)
    saveHistory()

    if (activeHistoryId.value === item.id) {
      activeHistoryId.value = ''
    }
  }

  /** 新对话 */
  const startNewChat = () => {
    activeHistoryId.value = ''
  }

  return {
    historyCategory,
    activeHistoryId,
    currentHistoryList,
    saveCurrentSession,
    addSongsToRecommend,
    selectHistory,
    directPlay,
    deleteHistory,
    startNewChat,
  }
}
