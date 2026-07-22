<template>
  <div :class="$style.container">
    <div :class="$style.playCard">
      <h3>🎵 快捷一键点歌</h3>
      <p>无需繁琐搜索，输入歌曲名称或演唱者，AI 将自动匹配最高品质音源并推入当前播放列表。</p>
      
      <div :class="$style.inputGroup">
        <input
          type="text"
          placeholder="例如：陈奕迅 阴天快乐"
          :class="$style.input"
        />
        <button :class="$style.btn">一键点播</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DjPlay',
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  display: flex;
  flex-direction: column;
}

.playCard {
  padding: 24px;
  background: var(--color-primary-light-900-alpha-300);
  border-radius: 12px;
  border: 1px solid var(--color-primary-light-500-alpha-300);

  h3 {
    margin: 0 0 8px 0;
    color: var(--color-primary);
    font-size: 16px;
  }

  p {
    margin: 0 0 16px 0;
    color: var(--color-font-label);
    font-size: 13px;
  }
}

.inputGroup {
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

.btn {
  padding: 10px 24px;
  border-radius: 8px;
  border: none;
  background: var(--color-primary);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
</style>
