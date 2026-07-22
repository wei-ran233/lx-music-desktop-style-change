<template>
  <div :class="$style.container">
    <div :class="$style.modeToggleBar">
      <div :class="$style.toggleGroup">
        <button
          :class="[$style.toggleBtn, { [$style.active]: mode === 'chat' }]"
          @click="mode = 'chat'"
        >
          💬 聊天模式
        </button>
        <button
          :class="[$style.toggleBtn, { [$style.active]: mode === 'dj' }]"
          @click="mode = 'dj'"
        >
          🎧 DJ 模式
        </button>
      </div>
      <div :class="$style.modeHint">
        {{ mode === 'chat' ? '纯对话模式，畅聊音乐与心情' : '沉浸式 DJ 模式，自动自动降频混音与语音播报' }}
      </div>
    </div>

    <div :class="$style.chatBody">
      <div :class="$style.chatStream">
        <div :class="$style.welcomeCard">
          <div :class="$style.djAvatar">🎧</div>
          <div :class="$style.welcomeText">
            <h3>你好！我是你的专属 AI 音乐 DJ</h3>
            <p>无论是想听歌、聊聊音乐，还是想要一份贴心的专属音乐推荐，都可以告诉我哦！</p>
          </div>
        </div>
      </div>
    </div>

    <div :class="$style.inputBox">
      <input
        type="text"
        placeholder="输入你想说的话，或者让 DJ 推荐歌曲..."
        :class="$style.input"
      />
      <button :class="$style.sendBtn">发送</button>
    </div>
  </div>
</template>

<script>
import { ref } from '@common/utils/vueTools'

export default {
  name: 'DjChat',
  setup() {
    const mode = ref('chat')
    return {
      mode,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 16px;
}

.modeToggleBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--color-primary-light-900-alpha-400);
  border-radius: 12px;
  border: 1px solid var(--color-primary-light-500-alpha-300);
}

.toggleGroup {
  display: flex;
  background: var(--color-primary-light-800-alpha-500);
  padding: 3px;
  border-radius: 20px;
}

.toggleBtn {
  border: none;
  background: transparent;
  padding: 6px 16px;
  border-radius: 18px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-font);
  cursor: pointer;
  transition: all @transition-fast;

  &.active {
    background: var(--color-primary);
    color: #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
}

.modeHint {
  font-size: 12px;
  color: var(--color-font-label);
}

.chatBody {
  flex: 1;
  min-height: 240px;
  display: flex;
  flex-direction: column;
}

.welcomeCard {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--color-primary-light-900-alpha-200);
  border-radius: 12px;
  border: 1px dashed var(--color-primary-light-400-alpha-500);
}

.djAvatar {
  font-size: 28px;
}

.welcomeText {
  h3 {
    margin: 0 0 4px 0;
    font-size: 15px;
    color: var(--color-primary);
  }
  p {
    margin: 0;
    font-size: 13px;
    color: var(--color-font-label);
  }
}

.inputBox {
  display: flex;
  gap: 8px;
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

.sendBtn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  background: var(--color-primary);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: opacity @transition-fast;

  &:hover {
    opacity: 0.9;
  }
}
</style>
