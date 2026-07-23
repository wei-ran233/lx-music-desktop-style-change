import { addTempPlayList } from '@renderer/store/player/action'
import { playList } from '@renderer/core/player'
import { appSetting } from '@renderer/store/setting'
import { LIST_IDS } from '@common/constants'
import { addListMusics, getListMusics } from '@renderer/store/list/action'

export default ({ props, selectedList, list, removeAllSelect }) => {
  let clickTime = 0
  let clickIndex = -1

  const handlePlayMusic = (index) => {
    const isSwitch = appSetting['player.isSwitchPlayListOnPlay']
    const isAddAll = appSetting['player.isAddAllToPlayDirectoryOnPlay']

    if (isSwitch) {
      playList(props.listId, index)
    } else {
      const targetMusic = list.value[index]
      if (targetMusic) {
        const musicsToAdd = isAddAll ? list.value : [targetMusic]
        addListMusics(LIST_IDS.DEFAULT, musicsToAdd).then(async() => {
          const defaultMusics = await getListMusics(LIST_IDS.DEFAULT)
          const targetIndex = defaultMusics.findIndex(s => s.id === targetMusic.id)
          if (targetIndex > -1) playList(LIST_IDS.DEFAULT, targetIndex)
        }).catch(() => {})
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
