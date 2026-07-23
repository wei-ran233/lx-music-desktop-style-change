import { userLists } from '@renderer/store/list/state'
import { dialog } from '@renderer/plugins/Dialog'
import syncSourceList from '@renderer/store/list/syncSourceList'
import { getListDetail, getListDetailAll } from '@renderer/store/songList/action'
import { createUserList, addListMusics, getListMusics } from '@renderer/store/list/action'
import { playList } from '@renderer/core/player/action'
import { LIST_IDS } from '@common/constants'
import { toMD5 } from '@renderer/utils'

const getListId = (id: string, source: LX.OnlineSource) => `${source}__${id}`

export const addSongListDetail = async(id: string, source: LX.OnlineSource, name?: string) => {
  // console.log(this.listDetail.info)
  // if (!this.listDetail.info.name) return
  const listId = getListId(id, source)
  const targetList = userLists.find(l => l.sourceListId == listId)
  if (targetList) {
    const confirm = await dialog.confirm({
      message: window.i18n.t('duplicate_list_tip', { name: targetList.name }),
      cancelButtonText: window.i18n.t('lists__import_part_button_cancel'),
      confirmButtonText: window.i18n.t('confirm_button_text'),
    })
    if (!confirm) return
    void syncSourceList(targetList)
    return
  }

  const list = await getListDetailAll(id, source)
  await createUserList({
    name,
    id: `${source}_${toMD5(listId)}`,
    list,
    source,
    sourceListId: id,
  })
}

export const playSongListDetail = async(id: string, source: LX.OnlineSource, list?: LX.Music.MusicInfoOnline[], index: number = 0) => {
  if (!list?.length) list = (await getListDetail(id, source, 1)).list
  if (!list?.length) return

  const targetSong = list[index] || list[0]
  await addListMusics(LIST_IDS.DEFAULT, list)

  const updatedDefaultMusics = await getListMusics(LIST_IDS.DEFAULT)
  const targetIndex = updatedDefaultMusics.findIndex(s => s.id === targetSong.id)
  if (targetIndex > -1) playList(LIST_IDS.DEFAULT, targetIndex)

  const fullList = await getListDetailAll(id, source)
  if (fullList.length) {
    await addListMusics(LIST_IDS.DEFAULT, fullList)
  }
}
