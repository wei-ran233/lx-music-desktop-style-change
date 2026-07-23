import { addTempPlayList, clearPlayedList, clearTempPlayeList, setPlayListId, setPlayMusicInfo } from '@renderer/store/player/action'
import { playList } from '@renderer/core/player'
import { appSetting } from '@renderer/store/setting'
import { LIST_IDS } from '@common/constants'
import { addListMusics, setListMusics } from '@renderer/store/list/action'
import { playInfo, playMusicInfo } from '@renderer/store/player/state'
import { handlePlay } from '@renderer/core/player/action'
import { toRaw } from '@common/utils/vueTools'

export default ({ props, selectedList, list, removeAllSelect }) => {
  let clickTime = 0
  let clickIndex = -1

  const handlePlayMusic = (index) => {
    const targetMusic = list.value[index]
    if (!targetMusic) return

    const isSwitch = appSetting['player.isSwitchPlayListOnPlay']
    const isAddAll = appSetting['player.isAddAllToPlayDirectoryOnPlay']
    const isAutoClean = appSetting['player.isAutoCleanPlayedList']

    // 1. Clear played list when switching songs in same playlist if setting enabled
    if (isAutoClean && playMusicInfo.listId === props.listId) {
      clearPlayedList()
    }

    if (isSwitch) {
      // 2. If isSwitch is ON: switch active playing playlist directory to props.listId
      playList(props.listId, index)
    } else {
      // 3. If isSwitch is OFF: play inside 当前目录 (LIST_IDS.DEFAULT)
      if (props.listId === LIST_IDS.DEFAULT) {
        playList(LIST_IDS.DEFAULT, index)
      } else if (isAddAll) {
        // Play immediately to prevent reaction delay
        const prevListId = playInfo.playerListId
        setPlayListId(LIST_IDS.DEFAULT)
        setPlayMusicInfo(LIST_IDS.DEFAULT, targetMusic)
        if (appSetting['player.isAutoCleanPlayedList'] || prevListId != LIST_IDS.DEFAULT) clearPlayedList()
        clearTempPlayeList()
        handlePlay()

        // Background sync list
        setListMusics(LIST_IDS.DEFAULT, list.value.map(toRaw)).catch((err) => { console.error('setListMusics error:', err) })
      } else {
        // Play immediately to prevent reaction delay
        const prevListId = playInfo.playerListId
        setPlayListId(LIST_IDS.DEFAULT)
        setPlayMusicInfo(LIST_IDS.DEFAULT, targetMusic)
        if (appSetting['player.isAutoCleanPlayedList'] || prevListId != LIST_IDS.DEFAULT) clearPlayedList()
        clearTempPlayeList()
        handlePlay()

        // Background sync list
        addListMusics(LIST_IDS.DEFAULT, [toRaw(targetMusic)]).catch((err) => { console.error('addListMusics error:', err) })
      }
    }
  }

  const handlePlayMusicLater = (index, single) => {
    if (selectedList.value.length && !single) {
      addTempPlayList(selectedList.value.map(s => ({ listId: props.listId, musicInfo: s })))
      removeAllSelect()
    } else {
      addTempPlayList([{ listId: props.listId, musicInfo: list.value[index] }])
    }
  }

  const doubleClickPlay = index => {
    if (
      window.performance.now() - clickTime > 400 ||
      clickIndex !== index
    ) {
      clickTime = window.performance.now()
      clickIndex = index
      return
    }
    handlePlayMusic(index, true)
    clickTime = 0
    clickIndex = -1
  }

  return {
    handlePlayMusic,
    handlePlayMusicLater,
    doubleClickPlay,
  }
}
