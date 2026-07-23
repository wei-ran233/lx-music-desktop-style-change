<template>
  <div :class="$style.list">
    <div :class="$style.headerBanner">
      <div
        :class="$style.bannerCover"
        :style="headerCover ? { backgroundImage: `url(${headerCover})` } : {}"
      >
        <div v-if="!headerCover" :class="$style.bannerDefaultCover">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" viewBox="0 0 247.498 247.498" space="preserve" style="width: 44px; height: 44px; fill: currentColor;">
            <use xlink:href="#icon-musicFolder" />
          </svg>
        </div>
        <span v-if="list.length" :class="$style.playCountBadge">
          🎧 {{ list.length }}
        </span>
      </div>

      <div :class="$style.bannerMain">
        <div :class="$style.bannerTitleRow">
          <h1 :class="$style.bannerTitle" :title="currentListName">{{ currentListName }}</h1>
        </div>

        <div :class="$style.bannerMetaRow">
          <span :class="$style.bannerAuthor">
            LX Player
          </span>
          <span v-if="currentListMeta.subtitle" :class="$style.bannerSubTitle">
            {{ currentListMeta.subtitle }}
          </span>
        </div>

        <div v-if="currentListMeta.tags && currentListMeta.tags.length" :class="$style.bannerTagsRow">
          <span
            v-for="(tag, idx) in currentListMeta.tags"
            :key="idx"
            :class="$style.tagBadge"
          >
            {{ tag }}
          </span>
        </div>

        <div :class="$style.bannerActionsRow">
          <base-btn
            v-if="list.length"
            :class="$style.primaryPlayBtn"
            @click="handlePlayAll"
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" space="preserve" style="width: 13px; height: 13px; margin-right: 4px; fill: currentColor; vertical-align: -1px;">
              <use xlink:href="#icon-play-outline" />
            </svg>
            {{ $t('list__play') }}
          </base-btn>

          <base-btn
            :class="$style.secondaryBtn"
            @click="isShowMetaModal = true"
          >
            {{ $t('list_edit_meta_title') }}
          </base-btn>
        </div>
      </div>
    </div>
    <div class="thead">
      <table>
        <thead>
          <tr v-if="actionButtonsVisible">
            <th class="num" style="width: 5%;">#</th>
            <th class="nobreak">{{ $t('music_name') }}</th>
            <th class="nobreak" style="width: 22%;">{{ $t('music_singer') }}</th>
            <th class="nobreak" style="width: 22%;">{{ $t('music_album') }}</th>
            <th class="nobreak" style="width: 9%;">{{ $t('music_time') }}</th>
            <th class="nobreak" style="width: 16%;">{{ $t('action') }}</th>
          </tr>
          <tr v-else>
            <th class="num" style="width: 5%;">#</th>
            <th class="nobreak">{{ $t('music_name') }}</th>
            <th class="nobreak" style="width: 25%;">{{ $t('music_singer') }}</th>
            <th class="nobreak" style="width: 28%;">{{ $t('music_album') }}</th>
            <th class="nobreak" style="width: 10%;">{{ $t('music_time') }}</th>
          </tr>
        </thead>
      </table>
    </div>
    <div v-show="list.length" ref="dom_listContent" :class="$style.content">
      <base-virtualized-list
        v-if="actionButtonsVisible" ref="listRef" v-slot="{ item, index }" :list="list" key-name="id"
        :item-height="listItemHeight" container-class="scroll" content-class="list"
        @scroll="saveListPosition" @contextmenu.capture="handleListRightClick"
      >
        <div
          class="list-item" :class="[{ [$style.active]: playerInfo.isPlayList && playerInfo.playIndex === index }, { selected: selectedIndex == index || rightClickSelectedIndex == index }, { active: selectedList.includes(item) }, { disabled: !assertApiSupport(item.source) }]"
          @click="handleListItemClick($event, index)" @contextmenu="handleListItemRightClick($event, index)"
        >
          <div class="list-item-cell no-select" :class="$style.num" style="flex: 0 0 5%;">
            <transition name="play-active">
              <div v-if="playerInfo.isPlayList && playerInfo.playIndex === index" :class="$style.playIcon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="50%" viewBox="0 0 512 512" space="preserve">
                  <use xlink:href="#icon-play-outline" />
                </svg>
              </div>
              <div v-else class="num">{{ index + 1 }}</div>
            </transition>
          </div>
          <div class="list-item-cell auto name" :aria-label="item.name" style="display: flex; align-items: center;">
            <div
              v-if="item.pic || item.img"
              :class="$style.songThumb"
              :style="{ backgroundImage: `url(${item.pic || item.img})` }"
            />
            <span class="select name">{{ item.name }}</span>
            <span v-if="isShowSource" class="no-select label-source">{{ item.source }}</span>
          </div>
          <div class="list-item-cell" style="flex: 0 0 22%;"><span class="select" :aria-label="item.singer">{{ item.singer }}</span></div>
          <div class="list-item-cell" style="flex: 0 0 22%;"><span class="select" :aria-label="item.meta.albumName">{{ item.meta.albumName }}</span></div>
          <div class="list-item-cell" style="flex: 0 0 9%;"><span class="no-select">{{ item.interval || '--/--' }}</span></div>
          <div class="list-item-cell" style="flex: 0 0 16%; padding-left: 0; padding-right: 0;">
            <material-list-buttons :index="index" :download-btn="assertApiSupport(item.source) && item.source != 'local'" @btn-click="handleListBtnClick" />
          </div>
        </div>
      </base-virtualized-list>
      <base-virtualized-list
        v-else ref="listRef" v-slot="{ item, index }" :list="list" key-name="id"
        :item-height="listItemHeight" container-class="scroll" content-class="list"
        @scroll="saveListPosition" @contextmenu.capture="handleListRightClick"
      >
        <div
          class="list-item"
          :class="[{ [$style.active]: playerInfo.isPlayList && playerInfo.playIndex === index }, { selected: selectedIndex == index || rightClickSelectedIndex == index }, { active: selectedList.includes(item) }, { disabled: !assertApiSupport(item.source) }]"
          @click="handleListItemClick($event, index)" @contextmenu="handleListItemRightClick($event, index)"
        >
          <div class="list-item-cell no-select" :class="$style.num" style="flex: 0 0 5%;">
            <transition name="play-active">
              <div v-if="playerInfo.isPlayList && playerInfo.playIndex === index" :class="$style.playIcon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="50%" viewBox="0 0 512 512" space="preserve">
                  <use xlink:href="#icon-play-outline" />
                </svg>
              </div>
              <div v-else class="num">{{ index + 1 }}</div>
            </transition>
          </div>
          <div class="list-item-cell auto name" style="display: flex; align-items: center;">
            <div
              v-if="item.pic || item.img"
              :class="$style.songThumb"
              :style="{ backgroundImage: `url(${item.pic || item.img})` }"
            />
            <span class="select name" :aria-label="item.name">{{ item.name }}</span>
            <span v-if="isShowSource" class="no-select label-source">{{ item.source }}</span>
          </div>
          <div class="list-item-cell" style="flex: 0 0 25%;"><span class="select" :aria-label="item.singer">{{ item.singer }}</span></div>
          <div class="list-item-cell" style="flex: 0 0 28%;"><span class="select" :aria-label="item.meta.albumName">{{ item.meta.albumName }}</span></div>
          <div class="list-item-cell" style="flex: 0 0 10%;"><span class="no-select">{{ item.interval || '--/--' }}</span></div>
        </div>
      </base-virtualized-list>
    </div>
    <div v-show="!list.length" :class="$style.noItem">
      <p v-text="$t('no_item')" />
    </div>
    <common-list-add-modal
      v-model:show="isShowListAdd" :is-move="isMove" :from-list-id="listId"
      :music-info="selectedAddMusicInfo" :exclude-list-id="excludeListIds" teleport="#view"
    />
    <common-list-add-multiple-modal
      v-model:show="isShowListAddMultiple" :from-list-id="listId"
      :is-move="isMoveMultiple" :music-list="selectedList" :exclude-list-id="excludeListIds" teleport="#view" @confirm="removeAllSelect"
    />
    <common-download-modal v-model:show="isShowDownload" :music-info="selectedDownloadMusicInfo" teleport="#view" :list-id="listId" />
    <common-download-multiple-modal v-model:show="isShowDownloadMultiple" :list="selectedList" teleport="#view" :list-id="listId" @confirm="removeAllSelect" />
    <search-list :list="list" :visible="isShowSearchBar" @action="handleMusicSearchAction" />
    <music-sort-modal v-model:show="isShowMusicSortModal" :music-info="selectedSortMusicInfo" :selected-num="selectedNum" @confirm="sortMusic" />
    <music-toggle-modal v-model:show="isShowMusicToggleModal" :music-info="selectedToggleMusicInfo" @toggle="toggleSource" />
    <list-meta-edit-modal v-model:visible="isShowMetaModal" :list-id="listId" />
    <base-menu v-model="isShowItemMenu" :menus="menus" :xy="menuLocation" item-name="name" @menu-click="handleMenuClick" />
  </div>
</template>

<script>
import { ref, computed } from '@common/utils/vueTools'
import { LIST_IDS } from '@common/constants'
import { defaultList, loveList, localList, tempList, userLists } from '@renderer/store/list/state'
import { getListMeta } from '@renderer/store/list/listMeta'
import { clipboardWriteText } from '@common/utils/electron'
import { assertApiSupport } from '@renderer/store/utils'
import SearchList from './components/SearchList.vue'
import MusicSortModal from './components/MusicSortModal.vue'
import MusicToggleModal from './components/MusicToggleModal.vue'
import ListMetaEditModal from '../MyList/components/ListMetaEditModal.vue'
import useListInfo from './useListInfo'
import useList from './useList'
import useMenu from './useMenu'
import usePlay from './usePlay'
import useMusicDownload from './useMusicDownload'
import useMusicAdd from './useMusicAdd'
import useSort from './useSort'
import useMusicActions from './useMusicActions'
import useSearch from './useSearch'
import useListScroll from './useListScroll'
import useMusicToggle from './useMusicToggle'
import { appSetting } from '@renderer/store/setting'
export default {
  name: 'MusicList',
  components: {
    SearchList,
    MusicSortModal,
    MusicToggleModal,
    ListMetaEditModal,
  },
  props: {
    listId: {
      type: String,
      required: true,
    },
  },
  emits: ['show-menu'],
  setup(props, { emit }) {
    const actionButtonsVisible = appSetting['list.actionButtonsVisible']

    let scrollIndex = null
    let isAnimation = false
    const handleRestoreScroll = (_scrollIndex, _isAnimation) => {
      scrollIndex = _scrollIndex
      isAnimation = _isAnimation
      if (isAnimation) void restoreScroll(scrollIndex, isAnimation)
      // console.log('handleRestoreScroll', scrollIndex, isAnimation)
    }
    const onLoadedList = () => {
      // console.log('restoreScroll', scrollIndex, isAnimation)
      void restoreScroll(scrollIndex, isAnimation)
    }

    const {
      rightClickSelectedIndex,
      selectedIndex,
      dom_listContent,
      listRef,
      list,
      playerInfo,
      setSelectedIndex,
      isShowSource,
      excludeListIds,
    } = useListInfo({ props, onLoadedList })

    const {
      selectedList,
      listItemHeight,
      handleSelectData,
      removeAllSelect,
    } = useList({ listRef, list })

    const {
      handlePlayMusic,
      handlePlayMusicLater,
      doubleClickPlay,
    } = usePlay({ props, selectedList, list, removeAllSelect })

    const {
      isShowListAdd,
      isMove,
      isShowListAddMultiple,
      isMoveMultiple,
      selectedAddMusicInfo,
      handleShowMusicAddModal,
      handleShowMusicMoveModal,
    } = useMusicAdd({ selectedList, list })

    const {
      isShowDownload,
      isShowDownloadMultiple,
      selectedDownloadMusicInfo,
      handleShowDownloadModal,
    } = useMusicDownload({ selectedList, list })

    const {
      isShowMusicSortModal,
      selectedNum,
      selectedSortMusicInfo,
      handleShowSortModal,
      sortMusic,
    } = useSort({ props, list, selectedList, removeAllSelect })

    const {
      handleShowMusicToggleModal,
      isShowMusicToggleModal,
      selectedToggleMusicInfo,
      toggleSource,
    } = useMusicToggle(props, list)

    const {
      handleSearch,
      handleOpenMusicDetail,
      handleCopyName,
      handleDislikeMusic,
      handleRemoveMusic,
    } = useMusicActions({ props, list, removeAllSelect, selectedList })

    const {
      menus,
      menuLocation,
      isShowItemMenu,
      showMenu,
      menuClick,
    } = useMenu({
      assertApiSupport,
      emit,

      handleShowDownloadModal,
      handlePlayMusic,
      handlePlayMusicLater,
      handleShowMusicToggleModal,
      handleSearch,
      handleShowMusicAddModal,
      handleShowMusicMoveModal,
      handleShowSortModal,
      handleOpenMusicDetail,
      handleCopyName,
      handleDislikeMusic,
      handleRemoveMusic,
    })

    const {
      isShowSearchBar,
      searchList,
      handleMusicSearchAction,
    } = useSearch({
      setSelectedIndex,
      handlePlayMusic,
      listRef,
    })

    const { saveListPosition, restoreScroll } = useListScroll({ props, listRef, list, handleRestoreScroll })


    const handleListItemClick = (event, index) => {
      if (rightClickSelectedIndex.value > -1) return
      handleSelectData(index)
      doubleClickPlay(index)
    }
    const handleListItemRightClick = (event, index) => {
      rightClickSelectedIndex.value = index
      showMenu(event, list.value[index], index)
    }
    const handleMenuClick = (action) => {
      let index = rightClickSelectedIndex.value
      rightClickSelectedIndex.value = -1
      menuClick(action, index)
    }
    const handleListRightClick = (event) => {
      if (!event.target.classList.contains('select')) return
      event.stopImmediatePropagation()
      let classList = dom_listContent.value.classList
      classList.add('copying')
      window.requestAnimationFrame(() => {
        let str = window.getSelection().toString()
        classList.remove('copying')
        str = str.split(/\n\n/).map(s => s.replace(/\n/g, '  ')).join('\n').trim()
        if (!str.length) return
        clipboardWriteText(str)
      })
    }
    const handleListBtnClick = ({ action, index }) => {
      switch (action) {
        case 'download':
          handleShowDownloadModal(index, true)
          break
        case 'play':
          handlePlayMusic(index, true)
          break
        case 'search':
          handleSearch(index)
          break
        case 'listAdd':
          handleShowMusicAddModal(index, true)
          break
      }
    }
    const scrollToTop = () => {
      listRef.value.scrollTo(0, true)
    }

    const currentListName = computed(() => {
      const id = props.listId
      if (!id || id === LIST_IDS.DEFAULT) return defaultList.name.startsWith('list__') ? window.i18n.t(defaultList.name) : defaultList.name
      if (id === LIST_IDS.LOVE) return loveList.name.startsWith('list__') ? window.i18n.t(loveList.name) : loveList.name
      if (id === LIST_IDS.LOCAL) return localList.name.startsWith('list__') ? window.i18n.t(localList.name) : localList.name
      if (id === LIST_IDS.DOWNLOAD) return window.i18n.t('download')
      if (id === LIST_IDS.TEMP) return tempList.name
      const targetUserList = userLists.find(l => l.id === id)
      if (targetUserList) return targetUserList.name
      return window.i18n.t('default_list')
    })

    const isShowMetaModal = ref(false)

    const currentListMeta = computed(() => {
      return getListMeta(props.listId)
    })

    const headerCover = computed(() => {
      const meta = currentListMeta.value
      if (meta.customPic) return meta.customPic
      if (list.value.length) {
        const first = list.value[0]
        if (first.pic) return first.pic
        if (first.img) return first.img
        if (first.meta?.picUrl) return first.meta.picUrl
      }
      return ''
    })

    return {
      currentListName,
      currentListMeta,
      headerCover,
      isShowMetaModal,
      handlePlayAll,
      listItemHeight,
      handleListItemClick,
      selectedList,
      handleListItemRightClick,
      removeAllSelect,
      handleListBtnClick,
      rightClickSelectedIndex,
      selectedIndex,
      dom_listContent,
      listRef,
      excludeListIds,

      menus,
      isShowItemMenu,
      menuLocation,
      handleMenuClick,

      handleListRightClick,
      assertApiSupport,

      isShowListAdd,
      isMove,
      isShowListAddMultiple,
      isMoveMultiple,
      selectedAddMusicInfo,

      isShowMusicSortModal,
      selectedNum,
      selectedSortMusicInfo,
      sortMusic,

      isShowDownload,
      isShowDownloadMultiple,
      selectedDownloadMusicInfo,

      scrollToTop,

      isShowSearchBar,
      searchList,
      handleMusicSearchAction,

      list,
      playerInfo,

      saveListPosition,
      isShowSource,
      handleRestoreScroll,

      actionButtonsVisible,

      isShowMusicToggleModal,
      selectedToggleMusicInfo,
      toggleSource,
    }
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.list {
  overflow: hidden;
  height: 100%;
  flex: auto;
  display: flex;
  flex-flow: column nowrap;

  :global(.list-item) {
    &.active {
      color: var(--color-button-font);
    }
  }
  :global {
    .label-source {
      color: var(--color-primary);
      padding: 5px;
      font-size: .8em;
      line-height: 1.2;
      opacity: .75;
      display: inline-block;
    }
  }
}
.num {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.playIcon {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  color: var(--color-button-font);
  opacity: .7;
}
.content {
  min-height: 0;
  font-size: 14px;
  display: flex;
  flex-flow: column nowrap;
  flex: auto;
}

.noItem {
  position: relative;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;

  p {
    font-size: 24px;
    color: var(--color-font-label);
  }
}

.headerBanner {
  flex: none;
  display: flex;
  align-items: flex-start;
  padding: 16px 20px;
  background: var(--color-content-background);
  border-bottom: 1px solid var(--color-primary-light-900-alpha-200);
}

.bannerCover {
  flex: none;
  width: 110px;
  height: 110px;
  border-radius: 8px;
  background-position: center;
  background-size: cover;
  background-color: var(--color-primary-light-900-alpha-100);
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin-right: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bannerDefaultCover {
  color: var(--color-primary);
  opacity: 0.8;
}

.playCountBadge {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 2px 6px;
  background-color: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 10px;
  border-radius: 10px;
  backdrop-filter: blur(4px);
}

.bannerMain {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 110px;
}

.bannerTitleRow {
  margin-bottom: 4px;
}

.bannerTitle {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-font);
  margin: 0;
  .mixin-ellipsis-1();
}

.bannerMetaRow {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--color-font-label);
  margin-bottom: 6px;
}

.bannerAuthor {
  font-weight: 500;
}

.bannerSubTitle {
  opacity: 0.85;
  .mixin-ellipsis-1();
}

.bannerTagsRow {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.tagBadge {
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 4px;
  background-color: var(--color-primary-light-900-alpha-200);
  color: var(--color-primary);
  font-weight: 500;
}

.bannerActionsRow {
  display: flex;
  align-items: center;
  gap: 10px;
}

.primaryPlayBtn {
  font-size: 12px;
  padding: 5px 16px;
  border-radius: 16px;
  background-color: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  font-weight: 600;
}

.secondaryBtn {
  font-size: 12px;
  padding: 5px 14px;
  border-radius: 16px;
  display: flex;
  align-items: center;
}

.songThumb {
  width: 26px;
  height: 26px;
  border-radius: 4px;
  background-position: center;
  background-size: cover;
  background-color: var(--color-primary-light-900-alpha-100);
  margin-right: 8px;
  flex: none;
}

</style>
