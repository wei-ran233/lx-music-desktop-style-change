# LX Music Desktop - AI DJ 第二阶段 TS/JS 逻辑对接技术设计文档

> **文档版本**: v2.0  
> **面向阶段**: Step 2 逻辑开发与 TypeScript / JavaScript 服务对接  
> **更新时间**: 2026-07-22  
> **状态**: 已完成第一步 UI 开发与 Git 提交 (`commit 73877f39`)，进入第二步逻辑架构设计

---

## 1. 整体系统架构与数据流图 (Architecture & Data Flow)

根据已研发完成的 **ChatGPT 风格 AI DJ 界面**（包含 📻 DJ 电台模式、💬 知心聊天模式、独立 Prompt 工坊、分类设置、音频黑胶卡片与历史记录），第二阶段的逻辑处理层分为 5 大核心服务模块：

```
                              ┌────────────────────────────────────────────────────────┐
                              │               AI DJ Vue 3 界面视图层                     │
                              │ (views/Dj/index.vue & DjSettingModal.vue)              │
                              └──────────────────────────┬─────────────────────────────┘
                                                         │
                                               Vue3 ref / computed 响应式绑定
                                                         ▼
                              ┌────────────────────────────────────────────────────────┐
                              │             Store 状态与持久化配置模块                   │
                              │           (store/dj/ & defaultSetting.ts)              │
                              └───────┬──────────────────┬───────────────────┬─────────┘
                                      │                  │                   │
               ┌──────────────────────┴┐       ┌─────────┴────────────┐     ┌┴──────────────────────┐
               │   LLM 智能体对话服务   │       │  TTS 语音合成播报引擎 │     │  音频播放与降频闪避引擎│
               │  (utils/dj/llmService)│       │(utils/dj/ttsService) │     │ (core/player/djAudio) │
               └──────────┬────────────┘       └──────────┬───────────┘     └─────────┬─────────────┘
                          │                               │                           │
                          ▼                               ▼                           ▼
               ┌──────────────────────┐       ┌──────────────────────┐      ┌───────────────────────┐
               │ GLM-4 SSE 流式传输   │       │ Edge-TTS WebSocket   │      │ LX Music Player Core  │
               │ & Tool Call 函数回调 │       │ 音频流实时解码播放   │      │ 音量平滑 Fade Down/Up │
               └──────────────────────┘       └──────────────────────┘      └───────────────────────┘
```

---

## 2. TypeScript 数据模型定义 (Data Models & Contracts)

### 2.1 状态与配置类型 (`src/renderer/store/dj/types.ts`)

```typescript
// AI DJ 模式枚举
export type DjMode = 'dj' | 'chat'

// 天气气象类型
export type WeatherType = 'sunny' | 'rainy' | 'night' | 'cloudy' | 'snowy'

// 消息发送者
export type MessageSender = 'user' | 'ai' | 'system'

// 推荐音乐卡片数据契约
export interface MusicCardData {
  id: string
  name: string
  singer: string
  album?: string
  source?: string
  bpm?: number
  genre?: string
  coverUrl?: string
  duration?: number
}

// 单条对话消息契约
export interface ChatMessage {
  id: string
  sender: MessageSender
  text: string
  timestamp: number
  mode: DjMode
  musicCard?: MusicCardData | null
  featureTag?: {
    type: 'search' | 'play'
    label: string
  } | null
}

// 历史会话契约
export interface HistorySession {
  id: string
  type: 'history' | 'recommend'
  mode: DjMode
  title: string
  date: string
  messages: ChatMessage[]
}

// System Prompt 5 大分段人设配置契约
export interface SystemPromptConfig {
  role: string          // 1. 角色与性格
  opening: string       // 2. 开场白规则
  selection: string     // 3. 选歌逻辑
  recommendation: string// 4. 推荐与串词
  profileLearning: string// 5. 画像学习策略
}

// AI DJ 整体持久化设置契约
export interface DjSettings {
  selectedModel: string
  customModelName: string
  activeModel: string
  baseUrl: string
  apiKey: string
  
  // DJ 模式与聊天模式独立 System Prompt
  djPrompt: SystemPromptConfig
  chatPrompt: SystemPromptConfig
  
  // TTS 语音合成配置
  ttsEngine: 'edge-tts' | 'openai-tts' | 'volcengine-tts' | 'custom-tts'
  ttsApiKey: string
  ttsCustomUrl: string
  ttsLang: 'zh-CN' | 'en-US' | 'zh-TW'
  ttsVoice: string
  enableChatSpeech: boolean
  enableDjSpeech: boolean
  duckingVolume: number // DJ 播报时音乐降频目标音量 (5% - 50%)
  
  // 环境感知配置
  weatherApiKey: string
  city: string
}
```

---

## 3. 第二阶段后端逻辑模块设计 (Step 2 Modules)

### 3.1 AI DJ Store 状态中心与持久化 (`src/renderer/store/dj/index.ts`)
* **职责**：
  * 管理全局 `currentMode`（DJ 模式 vs 聊天模式）、`activeModel`、`chatHistory`、`djHistory` 与 `recommendHistory`；
  * 与 LX Music 原生 `setting` 机制联动，实现保存和加载用户配置；
  * 提供 `addMessage()`, `deleteMessage()`, `deleteHistorySession()`, `saveSettings()` 等 Store Actions。

### 3.2 声音双轨与降频闪避调度器 (`src/renderer/core/player/djAudio.ts`)
* **职责**：
  * 创建独立的 `HTMLAudioElement`（即 `djAudioTrack`），专门用于播报 DJ 语音与串场 TTS；
  * **降频闪避 (Audio Ducking) 算法**：
    1. 当 `djAudioTrack` 开始播放语音时，平滑渐隐降低主音乐音量（`player.setVolume(duckingVolume)`）；
    2. 当 `djAudioTrack` 播报结束时，平滑恢复主音乐原始音量（`player.setVolume(originalVolume)`）。

### 3.3 大模型 SSE 流式对话与 Tool Call 调度 (`src/renderer/utils/dj/llmService.ts`)
* **职责**：
  * 使用 Fetch ReadableStream 解析智谱 GLM-4 / DeepSeek SSE 增量输出；
  * 实现工具函数 (Tool Calling) 调度器：
    * `search_and_play(keyword, genre, mood)`: 触发 LX Music 搜索并自动播放最匹配歌曲；
    * `play_favorite(tags)`: 检索“我的喜爱”歌单并播放；
    * `get_weather(city)`: 获取当前城市天气。

### 3.4 语音合成与实时播报引擎 (`src/renderer/utils/dj/ttsService.ts`)
* **职责**：
  * 对接 **Edge-TTS WebSocket** 或 **OpenAI / 火山 TTS API**；
  * 将大模型输出的文本流实时转为音频 Buffer 并推入 `djAudioTrack` 播放；
  * 支持 `zh-CN`, `en-US`, `zh-TW` 语言 API。

### 3.5 用户偏好智能学习与和风天气感知 (`src/renderer/utils/dj/userProfile.ts`)
* **职责**：
  * 分析用户本地“我的喜爱”歌单，提取歌手、曲风、BPM 和时段偏好；
  * 输出实时偏好日志 (`profileLogs`)，并将其注入到 LLM 的 System Prompt 中。

---

## 4. 逻辑对接步骤规划 (Development Plan)

| 步骤 | 开发任务 | 核心交付产出 |
| :--- | :--- | :--- |
| **Task 2.1** | **Dj Store 状态管理与设置持久化** | `store/dj/index.ts` 支持设置存储与历史记录持久化 |
| **Task 2.2** | **主音乐与 DJ 语音双轨 Fade Ducking 调度器** | `core/player/djAudio.ts` 实现平滑音量闪避 (Audio Ducking) |
| **Task 2.3** | **GLM-4 / OpenAI API SSE 流式传输与 Tool Call 接口** | `utils/dj/llmService.ts` 支持打字机效果与自动推歌点歌 |
| **Task 2.4** | **Edge-TTS WebSocket 音频流引擎对接** | `utils/dj/ttsService.ts` 实现智能语音串场播报 |
| **Task 2.5** | **和风天气 API 感知与用户画像提取** | `utils/dj/userProfile.ts` 实现历史歌单特征提取与日志更新 |

---
*文档归档位置: `f:/yanjiusheng/音乐软件/lx-music-desktop/LX_Music_AI_DJ_Step2_Technical_Design.md`*
