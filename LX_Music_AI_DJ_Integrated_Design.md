# LX Music AI DJ 内部集成需求与功能设计文档

## 一、 需求文档 (Requirements Document)

### 1.1 项目背景
为了提升 LX Music Desktop 的智能化与互动性，计划将 AI 大模型（GLM-4-Flash）、环境感知（和风天气 API）与语音合成技术（TTS）深度集成到播放器**内部**。告别独立的 MCP 架构，实现原生、无缝的“智能音乐 DJ”体验。

### 1.2 核心目标
1. **内部原生集成**: 完全融合在 Vue3 + Electron 的架构内，不再作为独立的外部服务，降低用户的配置与部署门槛。
2. **多模态播放 (DJ 语音播报)**: 引入 Microsoft Edge TTS 作为默认语音合成引擎（支持多口音及自定义 API 扩展），实现“DJ说话”与“音乐播放”的自然穿插。
3. **个性化推荐**: 读取播放器内部的“我的喜爱”或自定义歌单，精准分析用户的个人音乐品味，进行深度个性化推荐。
4. **全方位交互**: 在应用内新增一个 AI DJ 交互界面（如独立侧边栏或悬浮窗），支持日常聊天、点歌、情绪开导与主动推荐。

### 1.3 功能需求 (Functional Requirements)

- **F1 - AI 音乐 DJ (核心语音交互)**
  - **串场播报**: 在歌曲切换、启动软件、或者匹配特定天气/时间时，AI DJ 生成串场词并通过 TTS 输出语音。
  - **音频混合与调度**: 播放语音时，若背景有音乐，可自动降低主音乐音量 (Audio Ducking)；或者在歌曲前奏之前播放 DJ 介绍。

- **F2 - 个人偏好分析与音乐推荐**
  - 读取本地存储的用户歌单（如“我的喜爱”列表）。
  - 根据收藏歌曲的标签（歌手、曲风），动态生成用户偏好画像 (User Profile)。
  - 结合用户偏好和当前天气、时间，推荐最适合当前场景且符合用户口味的歌曲。

- **F3 - 音乐搜索与内建点歌**
  - 在 AI 会话界面，用户可以直接输入自然语言：“我想听周杰伦的快歌”、“播放一些安静的钢琴曲”。
  - AI 理解意图后，直接调用播放器内部核心的 `search` 与 `play` 模块，即搜即播。

- **F4 - 日常聊天陪伴**
  - 维持大模型的原生对话能力，赋予其专属 DJ 人设（如知心姐姐、幽默主播），打造情绪价值拉满的音乐陪伴。

- **F5 - 灵活的 API 与配置管理**
  - 在软件的“设置”页面中新增一个 **[AI DJ 配置]** 专属面板。
  - **大模型配置**: 默认适配 GLM-4-Flash，支持自定义 BaseURL, API Key，以兼容其他 OpenAI 格式模型（如 DeepSeek, Claude）。
  - **TTS 引擎配置**: 默认集成免费的 Edge TTS。支持选择中外语言与不同口音（如 Xiaoxiao, Yunxi），预留 HTTP 接口以便日后接入其他第三方 TTS 服务。
  - **环境感知配置**: 支持输入和风天气 API Key，配置所在城市。

### 1.4 非功能需求
- **无缝嵌入**: 界面必须与 LX Music 现有的深/浅色主题风格 (Theme) 保持高度一致。
- **低开销**: TTS 合成和 LLM 请求过程需采用流式 (Streaming) 或提前预取，避免卡顿。
- **高可用性**: 如果 API 超时、网络断开或 Key 失效，不能影响原本正常的音乐播放逻辑，DJ 会自动沉默。

---

## 二、 功能设计文档 (Functional Design Document)

### 2.1 整体架构设计 (Integrated Architecture)

在原本的 LX Music (Electron + Vue 3) 架构上新增 `AI DJ Core` 模块。

- **前端界面层 (Vue 3)**:
  - `components/DJPanel.vue`: 聊天对话界面，展示 DJ 的文字内容及用户的对话，可作为抽屉 (Drawer) 从侧边滑出。
  - `views/Setting/DJSetting.vue`: 供用户填入 API Keys 及选择 TTS 音色的配置表单。
- **业务逻辑控制层 (core / utils)**:
  - `llmService.ts`: 负责包装对话上下文，发送 HTTP/SSE 请求并解析 Function Calling。
  - `weatherService.ts`: 请求和风天气 API 缓存环境数据。
  - `ttsService.ts`: 封装 Edge TTS（基于 WebSocket 协议），将文字转换为音频流并喂给独立 Audio Context。
  - `userProfile.ts`: 读取状态库 (`store/list`)，提取收藏歌曲生成用户品味画像。
- **播放调度层 (Player Audio Scheduler)**:
  - 扩展原有的 `core/player` 播放控制逻辑。
  - 引入**双音轨混音机制**处理 TTS 语音与原歌曲音频的混合（Audio Ducking 控制）。

### 2.2 核心模块详细设计

#### 2.2.1 个人偏好分析系统
- **数据提取**: 监听应用内部列表的更新，定期随机抽取用户的收藏歌曲（例如 N 首），提取“歌曲名+歌手”，拼接成偏好样本（如：“近期偏好：晴天-周杰伦, 反方向的钟-周杰伦”）。
- **Prompt 动态注入**: 向 LLM 请求时，将这些偏好文本与天气一起注入 System Prompt，确保大模型生成的推荐曲目在用户舒适区内。

#### 2.2.2 语音合成引擎 (Edge TTS) 适配
- **协议实现**: 使用标准的 `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1` WebSocket 端点。
- **SSML 构建**: 根据用户配置的 Voice Name 生成 SSML (Speech Synthesis Markup Language)。
- **扩展性**: `ttsService` 向上暴露出标准的 `speak(text): Promise<AudioBuffer>` 接口，内部可通过 Strategy 模式轻松扩展接入其他 TTS API。

#### 2.2.3 音频调度与混合控制 (Audio Ducking)
由于需要同时播放主音乐和 DJ 语音：
1. **TTS 独立音轨**: 在页面中注入一个专用的 `<audio id="tts-audio">` 元素。
2. **渐变混音策略 (Fade Effect)**:
   - 侦听到 TTS 准备播放：通过 `requestAnimationFrame` 将主播放器 (`music-audio`) 的 `volume` 属性平滑降低至 `20%`（阈值可配）。
   - 侦听到 TTS 播放 `ended`：同样通过平滑渐变，将主音乐音量恢复至原先用户设置的音量。

#### 2.2.4 内部 Tools 解析与执行 (In-App Tool Calls)
直接在前端实现大模型的 Tools 定义与解析：
- `search_and_play(keyword)` 工具: 解析到调用后，直接触发内部的 `action` 进行全网音源搜索，获取 `songId` 后自动塞入播放队列。
- `play_favorite(mood)` 工具: 如果用户说“随便放点我喜欢的”，大模型调用该工具，前端逻辑直接从“我的喜爱”列表中依据 BPM 等条件随机播放。

### 2.3 交互体验工作流示例 (以早晨启动为例)

1. **场景感知启动**: 
   - 早上 8:00，用户打开 LX Music。
   - `weatherService` 获取当前城市天气：“小雨，16度”。
2. **构建上下文**:
   - `llmService` 组装 System Prompt: “现在是早晨 8 点，小雨。用户平时喜欢听周杰伦和陈奕迅。请作为电台 DJ 给出早晨的问候，并推荐一首合适的歌。”
3. **LLM 响应与 TTS 流转**:
   - LLM 返回话术：“早安，窗外正下着淅淅沥沥的小雨。在这个略带凉意的早晨，让我们听一首陈奕迅的《阴天快乐》，开启今天的新篇章吧。”，并附带执行 `search_and_play('阴天快乐 陈奕迅')`。
   - `ttsService` 立即将文字转为音频流。
4. **混音播放演出**:
   - 唤醒 TTS 音频，如果有前一首歌在放，则音量降低。UI 上的 DJ 形象浮现并开始打字。
   - TTS 播放完毕后，执行搜索并无缝切歌，播放《阴天快乐》。主音量恢复。
