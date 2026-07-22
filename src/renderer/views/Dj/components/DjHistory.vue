<template>
  <div :class="$style.container">
    <div :class="$style.historyNav">
      <button
        :class="[$style.navBtn, { [$style.active]: historyType === 'recommend' }]"
        @click="historyType = 'recommend'"
      >
        🎶 推荐音乐历史
      </button>
      <button
        :class="[$style.navBtn, { [$style.active]: historyType === 'chat' }]"
        @click="historyType = 'chat'"
      >
        💬 聊天对话历史
      </button>
    </div>

    <div :class="$style.historyContent">
      <div v-if="historyType === 'recommend'" :class="$style.empty">
        <p>暂无 AI DJ 音乐推荐历史记录</p>
      </div>
      <div v-else :class="$style.empty">
        <p>暂无 AI 聊天对话历史记录</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from '@common/utils/vueTools'

export default {
  name: 'DjHistory',
  setup() {
    const historyType = ref('recommend')
    return {
      historyType,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.historyNav {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--color-primary-light-500-alpha-300);
  padding-bottom: 8px;
}

.navBtn {
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--color-font-label);
  cursor: pointer;

  &.active {
    background: var(--color-primary-light-700-alpha-600);
    color: var(--color-primary);
    font-weight: 600;
  }
}

.historyContent {
  padding: 40px 0;
}

.empty {
  text-align: center;
  color: var(--color-font-label);
  font-size: 13px;
}
</style>
