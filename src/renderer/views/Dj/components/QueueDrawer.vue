<template>
  <aside ref="drawer" :class="$style.drawer" role="region" aria-label="播放队列" tabindex="-1" @keydown.esc="$emit('close')">
    <header :class="$style.header"><div><DjIcon name="queue" /><strong>播放队列</strong></div><button type="button" aria-label="关闭播放队列" @click="$emit('close')"><DjIcon name="close" /></button></header>
    <div v-if="musicInfo.name" :class="$style.nowPlaying"><span>正在播放</span><strong>{{ musicInfo.name }}</strong><small>{{ musicInfo.singer }}</small></div>
    <nav :class="$style.tabs" aria-label="队列类型"><button type="button" :aria-pressed="tab === 'later'" @click="tab = 'later'">稍后播放 {{ later.length }}</button><button type="button" :aria-pressed="tab === 'directory'" @click="tab = 'directory'">当前目录 {{ directory.length }}</button></nav>
    <p :class="$style.hint">{{ tab === 'later' ? '只管理待播顺序，不会删除歌单中的歌曲。' : '点击歌曲播放，或将它加入稍后播放。' }}</p>
    <button v-if="tab === 'later' && later.length" type="button" :class="$style.clear" @click="clearLater">清空待播队列</button>
    <p v-if="error" :class="$style.hint" role="alert">{{ error }}</p>
    <ol :class="$style.list">
      <li v-for="(entry, index) in entries" :key="String(track(entry).id) + '-' + index" :class="{ [$style.active]: track(entry).id === musicInfo.id }">
        <button type="button" :class="$style.track" :title="'播放 ' + track(entry).name" @click="playEntry(entry, index)"><span :class="$style.index">{{ index + 1 }}</span><span><strong>{{ track(entry).name }}</strong><small>{{ track(entry).singer || '未知歌手' }}</small></span></button>
        <button v-if="tab === 'later'" type="button" :aria-label="'移除待播歌曲 ' + track(entry).name" @click="removeLater(index)"><DjIcon name="close" /></button>
        <button v-else type="button" :aria-label="'加入稍后播放 ' + track(entry).name" @click="enqueue(entry)"><DjIcon name="plus" /></button>
      </li>
    </ol>
    <div v-if="!entries.length" :class="$style.empty"><DjIcon name="record" /><strong>{{ tab === 'later' ? '还没有待播歌曲' : '当前目录暂无歌曲' }}</strong><p>从推荐卡片中添加歌曲，留给接下来的时光。</p></div>
    <p :class="$style.feedback" role="status">{{ feedback }}</p>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from '@common/utils/vueTools'
import DjIcon from '@renderer/components/common/SvgIcon.vue'
import { musicInfo, playInfo, playMusicInfo, tempPlayList } from '@renderer/store/player/state'
import { getList, setPlayMusicInfo, addTempPlayList, removeTempPlayList, clearTempPlayeList } from '@renderer/store/player/action'
import { getListMusics } from '@renderer/store/list/action'
import { handlePlay } from '@renderer/core/player'
import { LIST_IDS } from '@common/constants'

defineEmits(['close'])
const drawer = ref<HTMLElement | null>(null)
const tab = ref('later')
const directory = ref<Array<LX.Music.MusicInfo | LX.Download.ListItem>>([])
const error = ref('')
const feedback = ref('')
const later = computed(() => [...tempPlayList])
const currentId = computed(() => playInfo.playerListId ?? playMusicInfo.listId ?? LIST_IDS.DEFAULT)
const entries = computed<Array<LX.Player.PlayMusicInfo | LX.Music.MusicInfo | LX.Download.ListItem>>(() => tab.value === 'later' ? later.value : directory.value)
let sequence = 0
const loadDirectory = async() => {
  const request = ++sequence
  const id = currentId.value
  try {
    const cached = getList(id)
    const list = cached.length || id === LIST_IDS.DOWNLOAD ? cached : await getListMusics(id)
    if (request === sequence) directory.value = [...list]
  } catch { if (request === sequence) error.value = '播放目录读取失败，请稍后重新打开' }
}
watch(currentId, () => { void loadDirectory() }, { immediate: true })
const onListUpdate = () => { void loadDirectory() }
onMounted(() => { drawer.value?.focus(); window.app_event.on('myListUpdate', onListUpdate) })
onUnmounted(() => { sequence++; window.app_event.off('myListUpdate', onListUpdate) })
const track = (entry: any): LX.Music.MusicInfo => {
  const item = entry.musicInfo ?? entry
  return 'progress' in item ? item.metadata.musicInfo : item
}
const playEntry = (entry: any, index: number) => {
  if (tab.value === 'later') {
    setPlayMusicInfo(entry.listId, entry.musicInfo, true)
    removeTempPlayList(index)
  } else setPlayMusicInfo(currentId.value, entry)
  handlePlay()
  feedback.value = `正在播放《${track(entry).name}》`
}
const enqueue = (entry: any) => {
  addTempPlayList([{ listId: currentId.value, musicInfo: entry, isTop: false }])
  feedback.value = `《${track(entry).name}》已加入稍后播放`
}
const removeLater = (index: number) => { removeTempPlayList(index); feedback.value = '已移出待播队列' }
const clearLater = () => { clearTempPlayeList(); feedback.value = '待播队列已清空，歌单未改变' }
</script>

<style lang="less" module>
.drawer { position: absolute; top: 0; right: 0; bottom: 0; z-index: 30; width: min(340px, 100%); box-sizing: border-box; display: flex; flex-direction: column; background: var(--color-main-background); color: var(--color-font); border-left: 1px solid var(--color-primary-alpha-200); box-shadow: -8px 0 30px rgba(0,0,0,.08); outline: none; button { background: transparent; border: none; color: inherit; cursor: pointer; padding: 8px; &:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; } } }
.header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid var(--color-primary-alpha-200); div { display: flex; align-items: center; gap: 8px; color: var(--color-primary); } }
.nowPlaying { display: flex; flex-direction: column; gap: 5px; margin: 16px; padding: 12px; border-left: 3px solid var(--color-primary); background: var(--color-primary-alpha-100); span, small { color: var(--color-font-label); font-size: 11px; } strong { font-size: 15px; } }
.tabs { display: flex; padding: 12px 16px 0; gap: 8px; button { flex: 1; font-size: 12px; border-radius: 6px; &[aria-pressed="true"] { color: var(--color-primary); background: var(--color-primary-alpha-100); } } }
.hint { font-size: 11px; line-height: 1.6; padding: 0 16px; color: var(--color-font-label); }
.clear { align-self: flex-end; margin-right: 8px; font-size: 11px; }
.list { flex: 1; min-height: 0; overflow-y: auto; list-style: none; padding: 0 10px; margin: 0; li { display: flex; align-items: center; border-bottom: 1px solid var(--color-primary-alpha-100); &.active { background: var(--color-primary-alpha-100); } } }
.track { display: flex; gap: 10px; align-items: center; flex: 1; min-width: 0; text-align: left; > span:last-child { display: flex; flex-direction: column; min-width: 0; gap: 4px; } strong { font-size: 12px; font-weight: 500; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; } small, .index { font-size: 11px; color: var(--color-font-label); } }
.empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; color: var(--color-font-label); svg { width: 44px; height: 44px; color: var(--color-primary); margin-bottom: 14px; } strong { font-size: 13px; } p { font-size: 12px; line-height: 1.7; } }
.feedback { padding: 0 16px; min-height: 18px; font-size: 11px; color: var(--color-primary); }
</style>
