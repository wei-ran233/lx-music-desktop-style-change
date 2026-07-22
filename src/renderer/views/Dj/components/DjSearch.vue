<template>
  <div :class="$style.container">
    <div :class="$style.searchBar">
      <input
        type="text"
        placeholder="输入自然语言搜索（例如：“适合工作听的轻音乐”、“周杰伦动感快歌”）..."
        :class="$style.input"
      />
      <button :class="$style.btn">AI 搜索</button>
    </div>

    <div :class="$style.placeholder">
      <div :class="$style.icon">🔍</div>
      <p>输入你的音乐意图，AI 将整合各大平台音源并精确匹配最符合的曲目。</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DjSearch',
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.searchBar {
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
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  background: var(--color-primary);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--color-font-label);

  .icon {
    font-size: 40px;
    margin-bottom: 12px;
  }
  p {
    margin: 0;
    font-size: 13.5px;
  }
}
</style>
