<template>
  <material-modal :show="show" teleport="#view" @close="handleClose">
    <main :class="$style.main">
      <div :class="$style.header">
        <h2 :class="$style.title">歌曲筛选</h2>
        <span :class="$style.closeBtn" @click="handleClose">✕</span>
      </div>

      <div :class="$style.content">
        <div v-for="cat in categories" :key="cat.name" :class="$style.section">
          <h3 :class="$style.sectionName">{{ cat.name }}</h3>
          <div :class="$style.tagList">
            <span
              v-for="tag in cat.tags"
              :key="tag"
              :class="[$style.tagPill, { [$style.activePill]: selectedTags.includes(tag) }]"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </span>
          </div>
        </div>
        <div v-if="!categories.length" :class="$style.emptyTip">
          暂无可用分类字段
        </div>
      </div>

      <div :class="$style.footer">
        <button :class="$style.resetBtn" @click="handleReset">重置</button>
        <button :class="$style.confirmBtn" @click="handleConfirm">确定</button>
      </div>
    </main>
  </material-modal>
</template>

<script>
export default {
  name: 'SongFilterModal',
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    modelValue: {
      type: Array,
      default: () => [],
    },
    list: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['update:show', 'confirm'],
  data() {
    return {
      selectedTags: [],
    }
  },
  computed: {
    categories() {
      const cats = []

      // 1. 歌手分类 (Dynamic Singers from current list)
      const singerMap = new Map()
      for (const item of this.list) {
        if (item.singer) {
          const names = item.singer.split(/\s*[/&,、;]\s*/).filter(Boolean)
          for (const name of names) {
            singerMap.set(name, (singerMap.get(name) || 0) + 1)
          }
        }
      }
      const topSingers = [...singerMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([name]) => name)

      if (topSingers.length) {
        cats.push({
          name: '歌手分类',
          tags: topSingers,
        })
      }

      // 2. 专辑分类 (Dynamic Albums from current list)
      const albumMap = new Map()
      for (const item of this.list) {
        const album = item.meta?.albumName
        if (album?.trim()) {
          albumMap.set(album.trim(), (albumMap.get(album.trim()) || 0) + 1)
        }
      }
      const topAlbums = [...albumMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([name]) => name)

      if (topAlbums.length) {
        cats.push({
          name: '专辑分类',
          tags: topAlbums,
        })
      }

      // 3. 音源平台 (Dynamic Sources from current list)
      const sourceMap = {
        kw: '酷我音乐',
        kg: '酷狗音乐',
        tx: 'QQ音乐',
        wy: '网易云音乐',
        mg: '咪咕音乐',
        local: '本地音乐',
      }
      const presentSources = new Set()
      for (const item of this.list) {
        if (item.source) presentSources.add(sourceMap[item.source] || item.source)
      }
      if (presentSources.size) {
        cats.push({
          name: '音源平台',
          tags: [...presentSources],
        })
      }

      // 4. 时长范围 (Duration)
      cats.push({
        name: '时长范围',
        tags: ['3分钟以下', '3 - 4分钟', '4 - 5分钟', '5分钟以上'],
      })

      return cats
    },
  },
  watch: {
    show(n) {
      if (n) {
        this.selectedTags = [...(this.modelValue || [])]
      }
    },
  },
  methods: {
    handleClose() {
      this.$emit('update:show', false)
    },
    toggleTag(tag) {
      const idx = this.selectedTags.indexOf(tag)
      if (idx > -1) {
        this.selectedTags.splice(idx, 1)
      } else {
        this.selectedTags.push(tag)
      }
    },
    handleReset() {
      this.selectedTags = []
    },
    handleConfirm() {
      this.$emit('confirm', [...this.selectedTags])
      this.handleClose()
    },
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.main {
  padding: 18px 24px;
  width: 480px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  background-color: var(--color-content-background);
  border-radius: 12px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-font);
  margin: 0;
  text-align: center;
  flex: 1;
}

.closeBtn {
  font-size: 14px;
  color: var(--color-font-label);
  cursor: pointer;
  padding: 4px;
  line-height: 1;

  &:hover {
    color: var(--color-font);
  }
}

.content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 380px;
  overflow-y: auto;
  padding-right: 4px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sectionName {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-font);
  margin: 0;
}

.tagList {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tagPill {
  font-size: 12px;
  padding: 5px 14px;
  border-radius: 16px;
  background-color: var(--color-primary-light-900-alpha-100);
  color: var(--color-font);
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;

  &:hover {
    background-color: var(--color-primary-light-900-alpha-200);
  }
}

.activePill {
  background-color: var(--color-primary-light-900-alpha-200);
  color: #ec4141 !important;
  font-weight: 600;
}

.emptyTip {
  text-align: center;
  color: var(--color-font-label);
  padding: 20px;
}

.footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
}

.resetBtn {
  padding: 8px 36px;
  border-radius: 20px;
  border: 1px solid var(--color-primary-light-900-alpha-200);
  background: transparent;
  color: var(--color-font);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }
}

.confirmBtn {
  padding: 8px 40px;
  border-radius: 20px;
  border: none;
  background-color: #ec4141;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.9;
  }
}
</style>
