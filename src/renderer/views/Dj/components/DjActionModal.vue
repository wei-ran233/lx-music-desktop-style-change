<template>
  <div v-if="visible" :class="$style.overlay" @click.self="close">
    <div :class="$style.modal">
      <div :class="$style.header">
        <h3>{{ actionType === 'search' ? '🔍 AI 聚合搜索' : '🎵 快捷一键点歌' }}</h3>
        <button :class="$style.closeBtn" @click="close">✕</button>
      </div>

      <div :class="$style.body">
        <p :class="$style.desc">
          {{
            actionType === 'search'
              ? '输入泛意图表达（如“适合深夜听的慢摇摇滚”），AI 将结合全网音源为您精准聚合曲目：'
              : '输入歌曲名或歌手名（如“周杰伦 晴天”），AI 将直接自动匹配最高品质音源并推入当前播放列表：'
          }}
        </p>
        <div :class="$style.inputRow">
          <input
            v-model="inputQuery"
            type="text"
            :placeholder="actionType === 'search' ? '例如：适合工作听的轻音乐...' : '例如：陈奕迅 阴天快乐...'"
            :class="$style.input"
            @keyup.enter="handleAction"
          />
          <button :class="$style.actionBtn" @click="handleAction">
            {{ actionType === 'search' ? '搜索曲目' : '立刻点播' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from '@common/utils/vueTools'

export default {
  name: 'DjActionModal',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    actionType: {
      type: String, // 'search' | 'play'
      default: 'search',
    },
  },
  emits: ['update:visible', 'submit'],
  setup(props, { emit }) {
    const inputQuery = ref('')

    const close = () => {
      emit('update:visible', false)
      inputQuery.value = ''
    }

    const handleAction = () => {
      if (!inputQuery.value.trim()) return
      emit('submit', { type: props.actionType, query: inputQuery.value.trim() })
      close()
    }

    return {
      inputQuery,
      close,
      handleAction,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  width: 480px;
  background: var(--color-content-background);
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-primary-light-400-alpha-500);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-primary-light-400-alpha-400);

  h3 {
    margin: 0;
    font-size: 16px;
    color: var(--color-primary);
  }
}

.closeBtn {
  border: none;
  background: transparent;
  font-size: 18px;
  color: var(--color-font-label);
  cursor: pointer;

  &:hover {
    color: var(--color-font);
  }
}

.body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-font-label);
  line-height: 1.5;
}

.inputRow {
  display: flex;
  gap: 10px;
}

.input {
  flex: 1;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--color-primary-light-400-alpha-600);
  background: var(--color-content-background);
  color: var(--color-font);
  outline: none;
  font-size: 13.5px;

  &:focus {
    border-color: var(--color-primary);
  }
}

.actionBtn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  background: var(--color-primary);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
</style>
