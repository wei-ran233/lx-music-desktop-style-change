<template>
  <div :class="$style.container">
    <div :class="$style.section">
      <h3 :class="$style.sectionTitle">🤖 大模型配置 (LLM)</h3>
      <div :class="$style.formGroup">
        <label>API Base URL</label>
        <input type="text" placeholder="https://open.bigmodel.cn/api/paas/v4/" :class="$style.input" />
      </div>
      <div :class="$style.formGroup">
        <label>API Key</label>
        <input type="password" placeholder="请输入你的 API Key" :class="$style.input" />
      </div>
      <div :class="$style.formGroup">
        <label>模型名称</label>
        <input type="text" placeholder="glm-4-flash" :class="$style.input" />
      </div>
    </div>

    <div :class="$style.section">
      <h3 :class="$style.sectionTitle">🗣️ 语音合成设置 (Edge TTS)</h3>
      <div :class="$style.formGroup">
        <label>播报发音人</label>
        <select :class="$style.select">
          <option value="zh-CN-XiaoxiaoNeural">晓晓 (中文女声 - 活泼自然)</option>
          <option value="zh-CN-YunxiNeural">云希 (中文男声 - 阳光幽默)</option>
          <option value="zh-CN-YunjianNeural">云健 (中文男声 - 沉稳播音)</option>
          <option value="zh-CN-XiaoyiNeural">晓伊 (中文女声 - 柔和知心)</option>
        </select>
      </div>
    </div>

    <div :class="$style.section">
      <h3 :class="$style.sectionTitle">🌤️ 环境感知 (和风天气 API)</h3>
      <div :class="$style.formGroup">
        <label>和风天气 API Key</label>
        <input type="text" placeholder="可选填，用于自动融入当下天气串场" :class="$style.input" />
      </div>
      <div :class="$style.formGroup">
        <label>所在城市</label>
        <input type="text" placeholder="例如：北京 / 上海 / 广州" :class="$style.input" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from '@common/utils/vueTools'

export default defineComponent({
  name: 'DjSetting',
})
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 600px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sectionTitle {
  margin: 0;
  font-size: 15px;
  color: var(--color-primary);
  border-bottom: 1px solid var(--color-primary-light-500-alpha-300);
  padding-bottom: 6px;
}

.formGroup {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-font);
  }
}

.input, .select {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--color-primary-light-400-alpha-600);
  background: var(--color-content-background);
  color: var(--color-font);
  outline: none;
  font-size: 13px;

  &:focus {
    border-color: var(--color-primary);
  }
}
</style>
