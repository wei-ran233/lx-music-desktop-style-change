<p align="center"><a href="https://github.com/lyswhut/lx-music-desktop"><img width="200" src="https://github.com/lyswhut/lx-music-desktop/blob/master/doc/images/icon.png" alt="lx-music logo"></a></p>

<h1 align="center">LX Music 桌面版</h1>

<p align="center">
  <a href="https://github.com/lyswhut/lx-music-desktop/releases"><img src="https://img.shields.io/github/release/lyswhut/lx-music-desktop" alt="Release version"></a>
  <a href="https://github.com/lyswhut/lx-music-desktop/actions/workflows/release.yml"><img src="https://github.com/lyswhut/lx-music-desktop/workflows/Build/badge.svg" alt="Build status"></a>
  <a href="https://github.com/lyswhut/lx-music-desktop/actions/workflows/beta-pack.yml"><img src="https://github.com/lyswhut/lx-music-desktop/workflows/Build%20Beta/badge.svg" alt="Build status"></a>
  <a href="https://electronjs.org/releases/stable"><img src="https://img.shields.io/github/package-json/dependency-version/lyswhut/lx-music-desktop/dev/electron/master" alt="Electron version"></a>
  <!-- <a href="https://github.com/lyswhut/lx-music-desktop/releases"><img src="https://img.shields.io/github/downloads/lyswhut/lx-music-desktop/latest/total" alt="Downloads"></a> -->
  <a href="https://github.com/lyswhut/lx-music-desktop/tree/dev"><img src="https://img.shields.io/github/package-json/v/lyswhut/lx-music-desktop/dev" alt="Dev branch version"></a>
  <!-- <a href="https://github.com/lyswhut/lx-music-desktop/blob/master/LICENSE"><img src="https://img.shields.io/github/license/lyswhut/lx-music-desktop" alt="License"></a> -->
</p>

<!-- [![GitHub release][1]][2]
[![Build status][3]][4]
[![GitHub Releases Download][5]][6]
[![dev branch][7]][8]
[![GitHub license][9]][10] -->

<!-- [1]: https://img.shields.io/github/release/lyswhut/lx-music-desktop
[2]: https://github.com/lyswhut/lx-music-desktop/releases
[3]: https://ci.appveyor.com/api/projects/status/flrsqd5ymp8fnte5?svg=true
[4]: https://ci.appveyor.com/project/lyswhut/lx-music-desktop
[5]: https://img.shields.io/github/downloads/lyswhut/lx-music-desktop/latest/total
[5]: https://img.shields.io/github/downloads/lyswhut/lx-music-desktop/total
[6]: https://github.com/lyswhut/lx-music-desktop/releases
[7]: https://img.shields.io/github/package-json/v/lyswhut/lx-music-desktop/dev
[8]: https://github.com/lyswhut/lx-music-desktop/tree/dev
[9]: https://img.shields.io/github/license/lyswhut/lx-music-desktop
[10]: https://github.com/lyswhut/lx-music-desktop/blob/master/LICENSE -->

<p align="center">一个基于 Electron & Vue 开发的音乐软件</p>

## 🚀 自定义修改版说明 (lx-music-desktop-style-change)

> **📦 当前版本号**：`v2.12.3-beta.9`

本仓库基于原版 [lx-music-desktop](https://github.com/lyswhut/lx-music-desktop) 进行个性化 UI 风格调整与功能增强。主要包含以下修改与更新：

### 🌟 主要修改内容

1. **🤖 AI 电台与智能播报 (⚠️ 正在测试中)**
   - 集成 AI DJ 交互界面与配置面板，支持接入通用 LLM 大模型及 TTS 语音合成服务。
   - 支持一键粘贴 cURL 命令快速解析生成 API 请求头及参数。
   - 支持天气、新闻等背景融入与音频流播放控制。
   - *注：AI 电台功能目前处于测试阶段，可能存在部分边界情况需进一步测试与优化。*

2. **🎵 本地音乐与播放体验优化**
   - **0 延迟秒播**：重构播放逻辑，解除播放动作对底层数据库同步的硬依赖，实现秒级即播。
   - **优先匹配本地音源**：在线歌单与下载列表中播放歌曲时优先匹配本地已有音乐源。
   - **网易云风格歌单 Banner**：主页歌单详情页引入网易云风格 Header Banner、歌单标签及副标题编辑、缺失封面智能补全。
   - **播放自动下载**：支持播放歌曲时自动同步下载到本地。
   - **播放目录浮层**：播放目录弹窗支持队列清空与直接删除歌曲。

3. **🐛 稳定性与崩溃修复**
   - **首次启动播放列表加载修复**：修复应用首次启动时默认播放目录（播放列表）未能及时加载歌曲的问题。
   - **IPC 跨进程传输修复**：修复 Vue 3 `Proxy` 对象在 IPC 进程通讯传输时引发的 `An object could not be cloned` 报错（引入 `toRaw` 解包）。
   - **MediaSession 崩溃修复**：修复因极速切歌引发的 MediaSession `position > duration` 越界崩溃。
   - **UI 优化**：屏蔽本地音乐列表的误触下载按钮，修复列表相关渲染错误。

### 📦 发布文件与适配系统说明

- **安装包版**：`LX-Music-桌面版-v2.12.3-beta.9-Windows-x64-安装包版.exe`（常规安装文件，双击后按提示进行安装）。
- **免安装版**：`LX-Music-桌面版-v2.12.3-beta.9-Windows-x64-免安装绿色版.zip`（便携解压版，解压后双击 `lx-music-desktop.exe` 即可运行）。
- **适配系统**：支持 Windows 7 / Windows 8 / Windows 10 / Windows 11 及以上 64 位 (x64) 操作系统。

### ⚠️ 功能兼容性状态说明

- **AI 电台 (AI DJ)**：正在测试中。
- **数据同步服务 (Sync Service)**：还未适配。
- **开放 API 支持 (Open API)**：还未适配。

---

## 用户界面

### 1. 我的列表页面
<p><img width="100%" src="./doc/images/my_list.png" alt="我的列表页面"></p>

### 2. AI电台页面
<p><img width="100%" src="./doc/images/ai_dj.png" alt="AI电台页面"></p>

### 3. 主界面预览
<p><img width="100%" src="./doc/images/app.png" alt="lx-music desktop UI"></p>

## 贡献代码

本项目欢迎 PR，但为了 PR 能顺利合并，需要注意以下几点：

- 对于添加新功能的 PR，建议在提交 PR 前先创建 Issue 进行说明，以确认该功能是否确实需要。
- 对于修复 bug 的 PR，请提供修复前后的说明及重现方式。
- 对于其他类型的 PR，则适当附上说明。

贡献代码步骤：

1. 参照[源码使用方法](https://lyswhut.github.io/lx-music-doc/desktop/use-source-code)设置开发环境；
2. 克隆本仓库代码并切换至 `dev` 分支进行开发；
3. 提交 PR 至 `dev` 分支。

## 源码使用方法

请参阅：<https://lyswhut.github.io/lx-music-doc/desktop/use-source-code>

## 项目协议

本项目基于 [Apache License 2.0](https://github.com/lyswhut/lx-music-desktop/blob/master/LICENSE) 许可证发行，以下协议是对于 Apache License 2.0 的补充，如有冲突，以以下协议为准。

---

*词语约定：本协议中的“本项目”指 LX Music（洛雪音乐助手）桌面版项目；“使用者”指签署本协议的使用者；“官方音乐平台”指对本项目内置的包括酷我、酷狗、咪咕等音乐源的官方平台统称；“版权数据”指包括但不限于图像、音频、名字等在内的他人拥有所属版权的数据。*

### 一、数据来源

1.1 本项目的各官方平台在线数据来源原理是从其公开服务器中拉取数据（与未登录状态在官方平台 APP 获取的数据相同），经过对数据简单地筛选与合并后进行展示，因此本项目不对数据的合法性、准确性负责。

1.2 本项目本身没有获取某个音频数据的能力，本项目使用的在线音频数据来源来自软件设置内“自定义源”设置所选择的“源”返回的在线链接。例如播放某首歌，本项目所做的只是将希望播放的歌曲名、艺术家等信息传递给“源”，若“源”返回了一个链接，则本项目将认为这就是该歌曲的音频数据而进行使用，至于这是不是正确的音频数据本项目无法校验其准确性，所以使用本项目的过程中可能会出现希望播放的音频与实际播放的音频不对应或者无法播放的问题。

1.3 本项目的非官方平台数据（例如“我的列表”内列表）来自使用者本地系统或者使用者连接的同步服务，本项目不对这些数据的合法性、准确性负责。

### 二、版权数据

2.1 使用本项目的过程中可能会产生版权数据。对于这些版权数据，本项目不拥有它们的所有权。为了避免侵权，使用者务必在 **24 小时内** 清除使用本项目的过程中所产生的版权数据。

### 三、音乐平台别名

3.1 本项目内的官方音乐平台别名为本项目内对官方音乐平台的一个称呼，不包含恶意。如果官方音乐平台觉得不妥，可联系本项目更改或移除。

### 四、资源使用

4.1 本项目内使用的部分包括但不限于字体、图片等资源来源于互联网。如果出现侵权可联系本项目移除。

### 五、免责声明

5.1 由于使用本项目产生的包括由于本协议或由于使用或无法使用本项目而引起的任何性质的任何直接、间接、特殊、偶然或结果性损害（包括但不限于因商誉损失、停工、计算机故障或故障引起的损害赔偿，或任何及所有其他商业损害或损失）由使用者负责。

### 六、使用限制

6.1 本项目完全免费，且开源发布于 GitHub 面向全世界人用作对技术的学习交流。本项目不对项目内的技术可能存在违反当地法律法规的行为作保证。

6.2 **禁止在违反当地法律法规的情况下使用本项目。** 对于使用者在明知或不知当地法律法规不允许的情况下使用本项目所造成的任何违法违规行为由使用者承担，本项目不承担由此造成的任何直接、间接、特殊、偶然或结果性责任。

### 七、版权保护

7.1 音乐平台不易，请尊重版权，支持正版。

### 八、非商业性质

8.1 本项目仅用于对技术可行性的探索及研究，不接受任何商业（包括但不限于广告等）合作及捐赠。

### 九、接受协议

9.1 若你使用了本项目，即代表你接受本协议。

---

若对此有疑问请 mail to: lyswhut+qq.com (请将 `+` 替换为 `@`)
