import { reactive } from '@common/utils/vueTools'

export interface ListMeta {
  subtitle?: string
  tags?: string[]
  customPic?: string
}

const STORAGE_KEY = 'lx_user_list_meta'

const loadMetaFromStorage = (): Record<string, ListMeta> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {}
  return {}
}

const saveMetaToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listMetaStore))
  } catch (e) {}
}

export const listMetaStore = reactive<Record<string, ListMeta>>({
  local: {
    subtitle: '本地已下载音乐及外部音源目录',
    tags: ['本地', '母带', 'HQ'],
  },
  love: {
    subtitle: '最喜欢的歌曲合集',
    tags: ['喜爱', '精选'],
  },
  default: {
    subtitle: '当前播放列表与队列',
    tags: ['播放队列'],
  },
  ...loadMetaFromStorage(),
})

export const getListMeta = (listId: string): ListMeta => {
  if (!listMetaStore[listId]) {
    listMetaStore[listId] = reactive({
      subtitle: '',
      tags: [],
    })
  }
  return listMetaStore[listId]
}

export const updateListMeta = (listId: string, meta: Partial<ListMeta>) => {
  const current = getListMeta(listId)
  if (meta.subtitle !== undefined) current.subtitle = meta.subtitle
  if (meta.tags !== undefined) current.tags = meta.tags
  if (meta.customPic !== undefined) current.customPic = meta.customPic
  saveMetaToStorage()
}
