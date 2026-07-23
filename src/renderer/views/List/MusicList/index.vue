<template>
  <div :class="$style.list">
    <!-- Header Banner Area -->
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
          <span v-if="currentListMeta?.subtitle" :class="$style.bannerSubTitle">
            {{ currentListMeta.subtitle }}
          </span>
        </div>

        <div v-if="currentListMeta?.tags && currentListMeta.tags.length" :class="$style.bannerTagsRow">
          <span
            v-for="(tag, idx) in currentListMeta.tags"
            :key="idx"
            :class="$style.tagBadge"
          >
            {{ tag }}
          </span>
        </div>

        <div :class="$style.bannerActionsRow">
          <button
            v-if="displayList.length"
            :class="$style.primaryRedBtn"
            @click="handlePlayAll"
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" space="preserve" style="width: 13px; height: 13px; margin-right: 4px; fill: currentColor; vertical-align: -1px;">
              <use xlink:href="#icon-play-outline" />
            </svg>
            {{ $t('list__play') }}全部
          </button>

          <base-btn
            v-if="listId !== LIST_IDS.LOCAL"
            :class="$style.secondaryBtn"
            @click="handleBatchDownload"
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 13px; height: 13px; margin-right: 4px; fill: currentColor; vertical-align: -1px;">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
            下载
          </base-btn>

          <base-btn
            :class="[$style.secondaryBtn, { [$style.toolActive]: isBatchMode }]"
            title="批量操作"
            @click="isBatchMode ? exitBatchMode() : enterBatchMode()"
          >
            ··· 批量操作
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

    <!-- Batch Action Mode Bar (Shown in Batch Mode) -->
    <div v-if="isBatchMode" :class="$style.batchActionBar">
      <div :class="$style.batchActionLeft">
        <button :class="$style.batchPlayBtn" title="播放选中" @click="handlePlaySelected">
          ▶
        </button>
        <button
          :class="$style.batchBtn"
          :disabled="!selectedList.length"
          @click="handleBatchAddToPlaylist"
        >
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: currentColor; margin-right: 4px;">
            <path d="M14 10H3v2h11v-2zm0-4H3v2h11V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM3 16h7v-2H3v2z" />
          </svg>
          添加到播放列表
        </button>
        <button
          v-if="listId !== LIST_IDS.LOCAL"
          :class="$style.batchBtn"
          :disabled="!selectedList.length"
          @click="handleBatchDownload"
        >
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: currentColor; margin-right: 4px;">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
          </svg>
          下载
        </button>
        <button
          :class="$style.batchBtn"
          :disabled="!selectedList.length"
          @click="handleBatchCollect"
        >
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: currentColor; margin-right: 4px;">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          收藏
        </button>
        <button
          :class="$style.batchBtn"
          :disabled="!selectedList.length"
          @click="handleBatchDelete"
        >
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: currentColor; margin-right: 4px;">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </svg>
          删除
        </button>
      </div>

      <div :class="$style.batchActionRight">
        <button :class="$style.finishBatchBtn" @click="exitBatchMode">
          完成
        </button>
      </div>
    </div>

    <!-- Standard Sub-header Toolbar (Shown when NOT in Batch Mode) -->
    <div v-else :class="$style.listSubHeader">
      <div :class="$style.subHeaderTabs">
        <span :class="[$style.tabItem, $style.tabActive]">
          歌曲 <sup :class="$style.tabBadge">{{ displayList.length }}</sup>
        </span>
      </div>

      <div :class="$style.subHeaderTools">
        <!-- Applied Filter Badge Bar (Picture 2 & 3) -->
        <div v-if="activeFilterTags.length" :class="$style.filterBadgeBox">
          <span :class="$style.filterBadgeLabel">
            已筛选 {{ activeFilterTags.join(' · ') }}
          </span>
          <span :class="$style.clearFilterBtn" title="清除筛选" @click="activeFilterTags = []">✕</span>
          <button :class="$style.createListFromFilterBtn" @click="handleCreateListFromFilter">创建歌单</button>
        </div>

        <button
          :class="[$style.iconToolBtn, { [$style.toolActive]: activeFilterTags.length || isShowSongFilterModal }]"
          title="歌曲筛选"
          @click="isShowSongFilterModal = true"
        >
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: currentColor;">
            <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
          </svg>
        </button>

        <div :class="$style.searchBox">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" :class="$style.searchIcon">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索"
            :class="$style.searchInput"
          />
          <span v-if="searchKeyword" :class="$style.clearSearchBtn" @click="searchKeyword = ''">✕</span>
        </div>
      </div>
    </div>

    <!-- Table Header (Normal Mode or Batch Mode Checkbox Header) -->
    <div class="thead">
      <table>
        <thead>
          <tr v-if="isBatchMode">
            <th style="width: 42%; text-align: left; padding-left: 12px;">
              <label :class="$style.checkboxLabel">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  :class="$style.batchCheckbox"
                  @change="toggleSelectAll"
                />
                <span>全选 (共{{ displayList.length }}首)</span>
              </label>
            </th>
            <th class="nobreak" style="width: 28%;">{{ $t('music_album') }}</th>
            <th class="nobreak" style="width: 15%;">喜欢</th>
            <th class="nobreak" style="width: 15%;">{{ $t('music_time') }}</th>
          </tr>
          <tr v-else-if="actionButtonsVisible">
            <th class="num" style="width: 5%;">#</th>
            <th class="nobreak" :class="$style.sortableHeader" @click="handleColumnSort('name')">
              {{ $t('music_name') }}
              <span :class="[$style.sortIcon, { [$style.sortActive]: sortType === 'name' }]">
                {{ sortType === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕' }}
              </span>
            </th>
            <th class="nobreak" style="width: 22%;" :class="$style.sortableHeader" @click="handleColumnSort('singer')">
              {{ $t('music_singer') }}
              <span :class="[$style.sortIcon, { [$style.sortActive]: sortType === 'singer' }]">
                {{ sortType === 'singer' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕' }}
              </span>
            </th>
            <th class="nobreak" style="width: 22%;" :class="$style.sortableHeader" @click="handleColumnSort('album')">
              {{ $t('music_album') }}
              <span :class="[$style.sortIcon, { [$style.sortActive]: sortType === 'album' }]">
                {{ sortType === 'album' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕' }}
              </span>
            </th>
            <th class="nobreak" style="width: 9%;" :class="$style.sortableHeader" @click="handleColumnSort('interval')">
              {{ $t('music_time') }}
              <span :class="[$style.sortIcon, { [$style.sortActive]: sortType === 'interval' }]">
                {{ sortType === 'interval' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕' }}
              </span>
            </th>
            <th class="nobreak" style="width: 16%;">{{ $t('action') }}</th>
          </tr>
          <tr v-else>
            <th class="num" style="width: 5%;">#</th>
            <th class="nobreak" :class="$style.sortableHeader" @click="handleColumnSort('name')">
              {{ $t('music_name') }}
              <span :class="[$style.sortIcon, { [$style.sortActive]: sortType === 'name' }]">
                {{ sortType === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕' }}
              </span>
            </th>
            <th class="nobreak" style="width: 25%;" :class="$style.sortableHeader" @click="handleColumnSort('singer')">
              {{ $t('music_singer') }}
              <span :class="[$style.sortIcon, { [$style.sortActive]: sortType === 'singer' }]">
                {{ sortType === 'singer' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕' }}
              </span>
            </th>
            <th class="nobreak" style="width: 28%;" :class="$style.sortableHeader" @click="handleColumnSort('album')">
              {{ $t('music_album') }}
              <span :class="[$style.sortIcon, { [$style.sortActive]: sortType === 'album' }]">
                {{ sortType === 'album' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕' }}
              </span>
            </th>
            <th class="nobreak" style="width: 10%;" :class="$style.sortableHeader" @click="handleColumnSort('interval')">
              {{ $t('music_time') }}
              <span :class="[$style.sortIcon, { [$style.sortActive]: sortType === 'interval' }]">
                {{ sortType === 'interval' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕' }}
              </span>
            </th>
          </tr>
        </thead>
      </table>
    </div>

    <!-- Content List -->
    <div v-show="displayList.length" ref="dom_listContent" :class="$style.content">
      <!-- Batch Selection Mode List View -->
      <base-virtualized-list
        v-if="isBatchMode"
        ref="listRef"
        v-slot="{ item }"
        :list="displayList"
        key-name="id"
        :item-height="listItemHeight"
        container-class="scroll"
        content-class="list"
      >
        <div
          class="list-item"
          :class="[{ selected: isSelected(item) }, { active: isSelected(item) }]"
          @click="toggleSelectItem(item)"
        >
          <div class="list-item-cell" style="flex: 0 0 42%; display: flex; align-items: center; padding-left: 12px;">
            <input
              type="checkbox"
              :checked="isSelected(item)"
              :class="$style.batchCheckbox"
              @click.stop
              @change="toggleSelectItem(item)"
            />
            <div
              v-if="item.pic || item.img || item.meta?.picUrl"
              :class="$style.songThumb"
              :style="{ backgroundImage: `url(${item.meta?.picUrl || item.pic || item.img})` }"
            />
            <div style="display: flex; flex-direction: column; overflow: hidden; min-width: 0;">
              <span class="select name" :title="item.name">{{ item.name }}</span>
              <span class="no-select" style="font-size: 11px; opacity: 0.65;">{{ item.singer }}</span>
            </div>
          </div>
          <div class="list-item-cell" style="flex: 0 0 28%;"><span class="select" :aria-label="item.meta.albumName">{{ item.meta.albumName }}</span></div>
          <div class="list-item-cell" style="flex: 0 0 15%; text-align: center;">
            <span style="color: #ec4141; cursor: pointer;">❤️</span>
          </div>
          <div class="list-item-cell" style="flex: 0 0 15%;"><span class="no-select">{{ item.interval || '--/--' }}</span></div>
        </div>
      </base-virtualized-list>

      <!-- Standard Mode Virtualized List -->
      <base-virtualized-list
        v-else-if="actionButtonsVisible"
        ref="listRef"
        v-slot="{ item, index }"
        :list="displayList"
        key-name="id"
        :item-height="listItemHeight"
        container-class="scroll"
        content-class="list"
        @scroll="saveListPosition"
        @contextmenu.capture="handleListRightClick"
      >
        <div
          class="list-item"
          :class="[{ [$style.active]: playerInfo.isPlayList && (playerInfo.playIndex === index || playerInfo.playMusicId === item.id) }, { selected: selectedIndex == index || rightClickSelectedIndex == index }, { active: selectedList.includes(item) }, { disabled: !assertApiSupport(item.source) }]"
          @click="handleListItemClick($event, index)"
          @contextmenu="handleListItemRightClick($event, index)"
        >
          <div class="list-item-cell no-select" :class="$style.num" style="flex: 0 0 5%;">
            <transition name="play-active">
              <div v-if="playerInfo.isPlayList && (playerInfo.playIndex === index || playerInfo.playMusicId === item.id)" :class="$style.playIcon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="50%" viewBox="0 0 512 512" space="preserve">
                  <use xlink:href="#icon-play-outline" />
                </svg>
              </div>
              <div v-else class="num">{{ index + 1 }}</div>
            </transition>
          </div>
          <div class="list-item-cell auto name" :aria-label="item.name" style="display: flex; align-items: center;">
            <div
              v-if="item.pic || item.img || item.meta?.picUrl"
              :class="$style.songThumb"
              :style="{ backgroundImage: `url(${item.meta?.picUrl || item.pic || item.img})` }"
            />
            <span class="select name">{{ item.name }}</span>
            <span v-if="isShowSource" class="no-select label-source">{{ item.source }}</span>
          </div>
          <div class="list-item-cell" style="flex: 0 0 22%;"><span class="select" :aria-label="item.singer">{{ item.singer }}</span></div>
          <div class="list-item-cell" style="flex: 0 0 22%;"><span class="select" :aria-label="item.meta.albumName">{{ item.meta.albumName }}</span></div>
          <div class="list-item-cell" style="flex: 0 0 9%;"><span class="no-select">{{ item.interval || '--/--' }}</span></div>
          <div class="list-item-cell" style="flex: 0 0 16%; padding-left: 0; padding-right: 0;">
            <material-list-buttons :index="index" :download-btn="assertApiSupport(item.source) && item.source != 'local' && listId !== LIST_IDS.LOCAL" @btn-click="handleListBtnClick" />
          </div>
        </div>
      </base-virtualized-list>

      <base-virtualized-list
        v-else
        ref="listRef"
        v-slot="{ item, index }"
        :list="displayList"
        key-name="id"
        :item-height="listItemHeight"
        container-class="scroll"
        content-class="list"
        @scroll="saveListPosition"
        @contextmenu.capture="handleListRightClick"
      >
        <div
          class="list-item"
          :class="[{ [$style.active]: playerInfo.isPlayList && (playerInfo.playIndex === index || playerInfo.playMusicId === item.id) }, { selected: selectedIndex == index || rightClickSelectedIndex == index }, { active: selectedList.includes(item) }, { disabled: !assertApiSupport(item.source) }]"
          @click="handleListItemClick($event, index)"
          @contextmenu="handleListItemRightClick($event, index)"
        >
          <div class="list-item-cell no-select" :class="$style.num" style="flex: 0 0 5%;">
            <transition name="play-active">
              <div v-if="playerInfo.isPlayList && (playerInfo.playIndex === index || playerInfo.playMusicId === item.id)" :class="$style.playIcon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="50%" viewBox="0 0 512 512" space="preserve">
                  <use xlink:href="#icon-play-outline" />
                </svg>
              </div>
              <div v-else class="num">{{ index + 1 }}</div>
            </transition>
          </div>
          <div class="list-item-cell auto name" style="display: flex; align-items: center;">
            <div
              v-if="item.pic || item.img || item.meta?.picUrl"
              :class="$style.songThumb"
              :style="{ backgroundImage: `url(${item.meta?.picUrl || item.pic || item.img})` }"
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
    <div v-show="!displayList.length" :class="$style.noItem">
      <p v-text="$t('no_item')" />
    </div>

    <!-- Modals & Menus -->
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
    <song-filter-modal v-model:show="isShowSongFilterModal" v-model="activeFilterTags" :list="list" @confirm="handleFilterConfirm" />

    <!-- Context Menus -->
    <base-menu v-model="isShowItemMenu" :menus="menus" :xy="menuLocation" item-name="name" @menu-click="handleMenuClick" />
    <base-menu v-model="isShowSortMenu" :menus="sortMenus" :xy="sortMenuLocation" item-name="name" @menu-click="handleSortMenuClick" />
  </div>
</template>

<script>
import { ref, computed, reactive } from '@common/utils/vueTools'
import { LIST_IDS } from '@common/constants'
import { loveList, localList, tempList, userLists } from '@renderer/store/list/state'
import { getListMeta } from '@renderer/store/list/listMeta'
import { addListMusics, createUserList } from '@renderer/store/list/action'
import { clipboardWriteText } from '@common/utils/electron'
import { assertApiSupport } from '@renderer/store/utils'
import { dialog } from '@renderer/plugins/Dialog'
import SearchList from './components/SearchList.vue'
import MusicSortModal from './components/MusicSortModal.vue'
import MusicToggleModal from './components/MusicToggleModal.vue'
import ListMetaEditModal from '../MyList/components/ListMetaEditModal.vue'
import SongFilterModal from './components/SongFilterModal.vue'
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
    SongFilterModal,
  },
  props: {
    listId: {
      type: String,
      required: true,
    },
  },
  emits: ['show-menu'],
  setup(props, { emit }) {
    const actionButtonsVisible = computed(() => appSetting['list.actionButtonsVisible'])

    let scrollIndex = null
    let isAnimation = false
    const handleRestoreScroll = (_scrollIndex, _isAnimation) => {
      scrollIndex = _scrollIndex
      isAnimation = _isAnimation
      if (isAnimation) void restoreScroll(scrollIndex, isAnimation)
    }
    const onLoadedList = () => {
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

    // Interactive Search, Filter & Column Sorting State
    const searchKeyword = ref('')
    const sortType = ref('default') // 'default' | 'name' | 'singer' | 'album' | 'interval'
    const sortOrder = ref('asc') // 'asc' | 'desc'
    const isBatchMode = ref(false)

    const isShowSongFilterModal = ref(false)
    const activeFilterTags = ref([])

    const isShowSortMenu = ref(false)
    const sortMenuLocation = reactive({ x: 0, y: 0 })

    const displayList = computed(() => {
      let result = [...list.value]

      // Filter by Active Filter Tags (歌曲筛选)
      if (activeFilterTags.value.length) {
        result = result.filter(item => {
          return activeFilterTags.value.every(tag => {
            const t = tag.toLowerCase()

            // Source mapping check
            const sourceMap = {
              kw: '酷我音乐',
              kg: '酷狗音乐',
              tx: 'QQ音乐',
              wy: '网易云音乐',
              mg: '咪咕音乐',
              local: '本地音乐',
            }
            const sourceName = sourceMap[item.source] || item.source || ''

            // Duration check
            let durationSeconds = 0
            if (item.interval) {
              const parts = item.interval.split(':').map(Number)
              if (parts.length === 2) durationSeconds = parts[0] * 60 + parts[1]
              else if (parts.length === 3) durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
            }

            if (tag === '3分钟以下') return durationSeconds > 0 && durationSeconds < 180
            if (tag === '3 - 4分钟') return durationSeconds >= 180 && durationSeconds <= 240
            if (tag === '4 - 5分钟') return durationSeconds > 240 && durationSeconds <= 300
            if (tag === '5分钟以上') return durationSeconds > 300

            // Singer / Album / Source / Name check
            return item.name?.toLowerCase().includes(t) ||
                   item.singer?.toLowerCase().includes(t) ||
                   item.meta?.albumName?.toLowerCase().includes(t) ||
                   sourceName.toLowerCase().includes(t)
          })
        })
      }

      // Live Search Box Filter
      const kw = searchKeyword.value.trim().toLowerCase()
      if (kw) {
        result = result.filter(item => {
          return item.name?.toLowerCase().includes(kw) ||
                 item.singer?.toLowerCase().includes(kw) ||
                 item.meta?.albumName?.toLowerCase().includes(kw)
        })
      }

      // Sort
      if (sortType.value !== 'default') {
        result.sort((a, b) => {
          let comp = 0
          if (sortType.value === 'name') {
            comp = (a.name || '').localeCompare(b.name || '', 'zh-CN')
          } else if (sortType.value === 'singer') {
            comp = (a.singer || '').localeCompare(b.singer || '', 'zh-CN')
          } else if (sortType.value === 'album') {
            comp = (a.meta?.albumName || '').localeCompare(b.meta?.albumName || '', 'zh-CN')
          } else if (sortType.value === 'interval') {
            comp = (a.interval || '').localeCompare(b.interval || '')
          }
          return sortOrder.value === 'asc' ? comp : -comp
        })
      }

      return result
    })

    const {
      selectedList,
      listItemHeight,
      handleSelectData,
      removeAllSelect,
    } = useList({ listRef, list: displayList })

    const {
      handlePlayMusic,
      handlePlayMusicLater,
      doubleClickPlay,
    } = usePlay({ props, selectedList, list: displayList, removeAllSelect })

    const {
      isShowListAdd,
      isMove,
      isShowListAddMultiple,
      isMoveMultiple,
      selectedAddMusicInfo,
      handleShowMusicAddModal,
      handleShowMusicMoveModal,
    } = useMusicAdd({ selectedList, list: displayList })

    const {
      isShowDownload,
      isShowDownloadMultiple,
      selectedDownloadMusicInfo,
      handleShowDownloadModal,
    } = useMusicDownload({ selectedList, list: displayList })

    const {
      isShowMusicSortModal,
      selectedNum,
      selectedSortMusicInfo,
      handleShowSortModal,
      sortMusic,
    } = useSort({ props, list: displayList, selectedList, removeAllSelect })

    const {
      handleShowMusicToggleModal,
      isShowMusicToggleModal,
      selectedToggleMusicInfo,
      toggleSource,
    } = useMusicToggle(props, displayList)

    const {
      handleSearch,
      handleOpenMusicDetail,
      handleCopyName,
      handleDislikeMusic,
      handleRemoveMusic,
    } = useMusicActions({ props, list: displayList, removeAllSelect, selectedList })

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

    const { saveListPosition, restoreScroll } = useListScroll({ props, listRef, list: displayList, handleRestoreScroll })

    // Column Sorting Handlers
    const handleColumnSort = (type) => {
      if (sortType.value === type) {
        if (sortOrder.value === 'asc') {
          sortOrder.value = 'desc'
        } else {
          sortType.value = 'default'
          sortOrder.value = 'asc'
        }
      } else {
        sortType.value = type
        sortOrder.value = 'asc'
      }
    }

    const sortMenus = computed(() => [
      { name: '默认排序' + (sortType.value === 'default' ? ' ✓' : ''), action: 'default' },
      { name: '标题升序 (A-Z)' + (sortType.value === 'name' && sortOrder.value === 'asc' ? ' ✓' : ''), action: 'name_asc' },
      { name: '标题降序 (Z-A)' + (sortType.value === 'name' && sortOrder.value === 'desc' ? ' ✓' : ''), action: 'name_desc' },
      { name: '歌手升序 (A-Z)' + (sortType.value === 'singer' && sortOrder.value === 'asc' ? ' ✓' : ''), action: 'singer_asc' },
      { name: '歌手降序 (Z-A)' + (sortType.value === 'singer' && sortOrder.value === 'desc' ? ' ✓' : ''), action: 'singer_desc' },
      { name: '专辑升序 (A-Z)' + (sortType.value === 'album' && sortOrder.value === 'asc' ? ' ✓' : ''), action: 'album_asc' },
      { name: '专辑降序 (Z-A)' + (sortType.value === 'album' && sortOrder.value === 'desc' ? ' ✓' : ''), action: 'album_desc' },
      { name: '时长升序 (短-长)' + (sortType.value === 'interval' && sortOrder.value === 'asc' ? ' ✓' : ''), action: 'interval_asc' },
      { name: '时长降序 (长-短)' + (sortType.value === 'interval' && sortOrder.value === 'desc' ? ' ✓' : ''), action: 'interval_desc' },
    ])

    const handleSortMenuClick = (menu) => {
      if (!menu) return
      if (menu.action === 'default') {
        sortType.value = 'default'
        sortOrder.value = 'asc'
      } else {
        const [type, order] = menu.action.split('_')
        sortType.value = type
        sortOrder.value = order
      }
    }

    // Filter Confirm & Create List Handlers
    const handleFilterConfirm = (tags) => {
      activeFilterTags.value = tags
    }

    const handleCreateListFromFilter = () => {
      if (displayList.value.length) {
        const name = `${activeFilterTags.value.join('·')} 筛选歌单`
        void createUserList({
          name,
          list: displayList.value,
        })
        void dialog(`已成功以筛选歌曲创建新歌单：“${name}”`)
      }
    }

    // Batch Selection Mode Logic
    const enterBatchMode = () => {
      isBatchMode.value = true
    }

    const exitBatchMode = () => {
      isBatchMode.value = false
      removeAllSelect()
    }

    const isAllSelected = computed(() => {
      if (!displayList.value.length) return false
      return displayList.value.every(item => selectedList.value.includes(item))
    })

    const toggleSelectAll = () => {
      if (isAllSelected.value) {
        removeAllSelect()
      } else {
        selectedList.value.splice(0, selectedList.value.length, ...displayList.value)
      }
    }

    const isSelected = (item) => {
      return selectedList.value.includes(item)
    }

    const toggleSelectItem = (item) => {
      const index = selectedList.value.indexOf(item)
      if (index > -1) {
        selectedList.value.splice(index, 1)
      } else {
        selectedList.value.push(item)
      }
    }

    const handlePlaySelected = () => {
      if (selectedList.value.length) {
        void addListMusics(LIST_IDS.DEFAULT, selectedList.value)
        const first = selectedList.value[0]
        const idx = displayList.value.indexOf(first)
        if (idx > -1) handlePlayMusic(idx)
      }
    }

    const handleBatchAddToPlaylist = () => {
      if (selectedList.value.length) {
        void addListMusics(LIST_IDS.DEFAULT, selectedList.value)
        void dialog(`已成功将 ${selectedList.value.length} 首歌曲添加到播放列表`)
      }
    }

    const handleBatchCollect = () => {
      if (selectedList.value.length) {
        isMoveMultiple.value = false
        isShowListAddMultiple.value = true
      }
    }

    const handleBatchDelete = () => {
      if (selectedList.value.length) {
        void handleRemoveMusic(selectedList.value)
      }
    }

    const handleBatchDownload = () => {
      if (selectedList.value.length) {
        isShowDownloadMultiple.value = true
      } else if (displayList.value.length) {
        handleSelectData('all')
        isShowDownloadMultiple.value = true
      }
    }

    const handleListItemClick = (event, index) => {
      if (rightClickSelectedIndex.value > -1) return
      handleSelectData(index)
      doubleClickPlay(index)
    }
    const handleListItemRightClick = (event, index) => {
      rightClickSelectedIndex.value = index
      showMenu(event, displayList.value[index], props.listId)
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
      if (!id || id === LIST_IDS.DEFAULT) return '当前目录'
      if (id === LIST_IDS.LOVE) return loveList.name.startsWith('list__') ? window.i18n.t(loveList.name) : loveList.name
      if (id === LIST_IDS.LOCAL) return localList.name.startsWith('list__') ? window.i18n.t(localList.name) : localList.name
      if (id === LIST_IDS.DOWNLOAD) return window.i18n.t('download')
      if (id === LIST_IDS.TEMP) return tempList.name
      const targetUserList = userLists.find(l => l.id === id)
      if (targetUserList) return targetUserList.name
      return '当前目录'
    })

    const isShowMetaModal = ref(false)

    const currentListMeta = computed(() => {
      if (props.listId === LIST_IDS.DEFAULT) {
        return {
          subtitle: '当前播放列表与队列',
          tags: ['播放队列'],
        }
      }
      return getListMeta(props.listId)
    })

    const headerCover = computed(() => {
      const meta = currentListMeta.value
      if (meta?.customPic) return meta.customPic
      if (list.value.length) {
        for (const item of list.value) {
          if (item.meta?.picUrl) return item.meta.picUrl
          // @ts-expect-error fallback
          if (item.pic) return item.pic
          // @ts-expect-error fallback
          if (item.img) return item.img
        }
      }
      return ''
    })

    const handlePlayAll = () => {
      if (displayList.value.length) {
        handlePlayMusic(0)
      }
    }

    return {
      props,
      LIST_IDS,
      currentListName,
      currentListMeta,
      headerCover,
      isShowMetaModal,
      handlePlayAll,
      handleBatchDownload,
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
      displayList,
      playerInfo,

      saveListPosition,
      isShowSource,
      handleRestoreScroll,

      actionButtonsVisible,

      isShowMusicToggleModal,
      selectedToggleMusicInfo,
      toggleSource,

      searchKeyword,
      sortType,
      sortOrder,
      handleColumnSort,

      isBatchMode,
      enterBatchMode,
      exitBatchMode,
      isAllSelected,
      toggleSelectAll,
      isSelected,
      toggleSelectItem,
      handlePlaySelected,
      handleBatchAddToPlaylist,
      handleBatchCollect,
      handleBatchDelete,

      isShowSortMenu,
      sortMenuLocation,
      sortMenus,
      handleSortMenuClick,

      isShowSongFilterModal,
      activeFilterTags,
      handleFilterConfirm,
      handleCreateListFromFilter,
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
  border-bottom: 1px solid var(--color-primary-light-900-alpha-150);
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

.primaryRedBtn {
  font-size: 12px;
  padding: 6px 18px;
  border-radius: 18px;
  background-color: #ec4141;
  color: #fff;
  display: flex;
  align-items: center;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.9;
  }
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

/* Sub-header Bar (Songs count tab on left, Filter & Search input on right) */
.listSubHeader {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  background: var(--color-content-background);
  border-bottom: 1px solid var(--color-primary-light-900-alpha-150);
}

.subHeaderTabs {
  display: flex;
  align-items: center;
  gap: 20px;
}

.tabItem {
  font-size: 14px;
  color: var(--color-font-label);
  cursor: pointer;
  padding-bottom: 4px;
  position: relative;
  transition: color 0.2s ease;
  user-select: none;

  &:hover {
    color: var(--color-font);
  }
}

.tabActive {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-font) !important;
  border-bottom: 3px solid #ec4141;
}

.tabBadge {
  font-size: 10px;
  font-weight: 400;
  margin-left: 2px;
  opacity: 0.7;
}

.subHeaderTools {
  display: flex;
  align-items: center;
  gap: 10px;
}

.iconToolBtn {
  background: none;
  border: 1px solid var(--color-primary-light-900-alpha-200);
  border-radius: 14px;
  padding: 4px 8px;
  color: var(--color-font);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;

  &:hover {
    background: var(--color-primary-light-900-alpha-100);
  }
}

.toolActive {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.filterBadgeBox {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: var(--color-primary-light-900-alpha-100);
  border: 1px solid var(--color-primary-light-900-alpha-200);
  border-radius: 14px;
  padding: 2px 10px;
  font-size: 12px;
}

.filterBadgeLabel {
  color: var(--color-font);
  font-weight: 500;
}

.createListFromFilterBtn {
  background-color: var(--color-primary-light-900-alpha-150);
  border: none;
  border-radius: 12px;
  padding: 2px 10px;
  font-size: 11px;
  color: var(--color-font);
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: var(--color-primary-light-900-alpha-250);
    color: var(--color-primary);
  }
}

.searchBox {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--color-primary-light-900-alpha-100);
  border-radius: 16px;
  padding: 2px 10px;
  width: 140px;
}

.searchIcon {
  width: 14px;
  height: 14px;
  fill: var(--color-font-label);
  margin-right: 4px;
  flex: none;
}

.searchInput {
  background: transparent;
  border: none;
  outline: none;
  font-size: 12px;
  color: var(--color-font);
  width: 100%;
}

.clearSearchBtn {
  font-size: 11px;
  color: var(--color-font-label);
  cursor: pointer;
  padding: 0 2px;

  &:hover {
    color: var(--color-font);
  }
}

/* Batch Operations Mode Toolbar (Matching Screenshot Layout) */
.batchActionBar {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: var(--color-content-background);
  border-bottom: 1px solid var(--color-primary-light-900-alpha-150);
}

.batchActionLeft {
  display: flex;
  align-items: center;
  gap: 12px;
}

.batchPlayBtn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-color: #fde2e2;
  color: #ec4141;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.85;
  }
}

.batchBtn {
  background-color: var(--color-primary-light-900-alpha-100);
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 13px;
  color: var(--color-font);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: background-color 0.2s ease;

  &:hover:not(:disabled) {
    background-color: var(--color-primary-light-900-alpha-200);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.batchActionRight {
  display: flex;
  align-items: center;
}

.finishBatchBtn {
  border: 1px solid var(--color-primary-light-900-alpha-200);
  border-radius: 16px;
  padding: 4px 18px;
  font-size: 13px;
  color: var(--color-font);
  background: transparent;
  cursor: pointer;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }
}

.checkboxLabel {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-weight: 500;
  user-select: none;
}

.batchCheckbox {
  width: 16px;
  height: 16px;
  accent-color: #ec4141;
  cursor: pointer;
  margin-right: 8px;
}

/* Hover Column Sort Indicators */
.sortableHeader {
  cursor: pointer;
  user-select: none;
  transition: color 0.2s ease;

  .sortIcon {
    opacity: 0;
    margin-left: 4px;
    font-size: 11px;
    transition: opacity 0.2s ease;
    color: var(--color-primary);
  }

  &:hover {
    color: var(--color-primary);
    .sortIcon {
      opacity: 0.7;
    }
  }

  .sortActive {
    opacity: 1 !important;
    font-weight: bold;
  }
}
</style>
