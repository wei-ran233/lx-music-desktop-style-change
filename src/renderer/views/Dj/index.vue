<template>
  <div
    :class="[
      $style.chatGptLayout,
      $style[mode],
      $style['weather-' + weatherType]
    ]"
  >
    <!-- 左侧 侧边栏 (支持折叠/展开) -->
    <div :class="[$style.sidebar, { [$style.sidebarCollapsed]: !isSidebarOpen }]">
      <div :class="$style.sidebarHeader">
        <button :class="$style.newChatBtn" @click="startNewChat">
          <span>+</span>
          <span v-if="isSidebarOpen">新建对话</span>
        </button>
      </div>

      <!-- 历史记录分类 Tab：明确区分 📻 DJ 调频历史 vs 💬 聊天对话历史 vs 🎶 推荐音乐 -->
      <div v-if="isSidebarOpen" :class="$style.historyTabs">
        <button
          :class="[$style.historyTab, { [$style.activeHistoryTab]: historyCategory === 'dj' }]"
          @click="historyCategory = 'dj'"
        >
          📻 DJ 调频
        </button>
        <button
          :class="[$style.historyTab, { [$style.activeHistoryTab]: historyCategory === 'chat' }]"
          @click="historyCategory = 'chat'"
        >
          💬 聊天历史
        </button>
        <button
          :class="[$style.historyTab, { [$style.activeHistoryTab]: historyCategory === 'recommend' }]"
          @click="historyCategory = 'recommend'"
        >
          🎶 推荐点播
        </button>
      </div>

      <!-- 历史记录列表 -->
      <div v-if="isSidebarOpen" :class="$style.historyList" class="scroll">
        <div
          v-for="item in currentHistoryList"
          :key="item.id"
          :class="[$style.historyItem, { [$style.activeHistoryItem]: activeHistoryId === item.id }]"
          @click="selectHistoryItem(item)"
        >
          <span :class="$style.itemIcon">
            {{ item.mode === 'dj' ? '📻' : (item.type === 'chat' ? '💬' : '🎵') }}
          </span>

          <div :class="$style.itemMeta">
            <span :class="$style.itemTitle">
              <span v-if="item.mode" :class="[$style.modeBadge, $style['badge-' + item.mode]]">
                {{ item.mode === 'dj' ? 'DJ' : '聊天' }}
              </span>
              {{ item.title }}
            </span>
            <span :class="$style.itemDate">{{ item.date }}</span>
          </div>

          <!-- 推荐音乐历史：直接在侧边栏提供【▶ 播放】按钮（不定位跳转聊天页面） -->
          <div :class="$style.itemActions">
            <button
              v-if="item.type === 'recommend'"
              :class="$style.directPlayBtn"
              title="直接播放"
              @click.stop="directPlayMusic(item)"
            >
              ▶
            </button>

            <!-- 历史记录删除按钮 -->
            <button
              :class="$style.deleteItemBtn"
              title="删除记录"
              @click.stop="deleteHistoryItem(item)"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧 主交互区域 -->
    <div :class="$style.mainContent">
      <!-- 顶部 工具栏 -->
      <div :class="$style.topBar">
        <!-- 侧边栏折叠按钮 -->
        <div :class="$style.topBarLeft">
          <button
            :class="$style.sidebarToggleBtn"
            :title="isSidebarOpen ? '收起侧边栏' : '展开侧边栏'"
            @click="isSidebarOpen = !isSidebarOpen"
          >
            <span :class="$style.toggleIcon">☰</span>
          </button>

          <!-- 当前生效的模型 Indicator -->
          <div :class="$style.activeModelBadge" title="当前模型">
            <span :class="$style.modelIcon">🤖</span>
            <span :class="$style.modelName">{{ currentModel }}</span>
          </div>
        </div>

        <!-- 模式切换：DJ 模式 vs 聊天模式 -->
        <div :class="$style.topBarCenter">
          <div :class="$style.modeTogglePills">
            <button
              :class="[$style.pillBtn, { [$style.activePill]: mode === 'dj' }]"
              @click="switchMode('dj')"
            >
              🎧 DJ 模式
            </button>
            <button
              :class="[$style.pillBtn, { [$style.activePill]: mode === 'chat' }]"
              @click="switchMode('chat')"
            >
              💬 聊天模式
            </button>
          </div>
        </div>

        <!-- 右上角 分类设置按钮 -->
        <div :class="$style.topBarRight">
          <button :class="$style.settingIconBtn" title="AI DJ 偏好与独立人设设置" @click="showSettingModal = true">
            ⚙️
          </button>
        </div>
      </div>

      <!-- 1. 居中新对话 Landing Page 视图 -->
      <div v-if="messageList.length === 0" :class="$style.landingView">
        <div :class="$style.landingContainer">
          <!-- AI 动态生成的开场白主标题 -->
          <h1 :class="$style.landingTitle">
            {{ aiOpeningGreeting }}
          </h1>

          <!-- 天气与时间因素 Banner (位于聊天框正上方) -->
          <div :class="$style.centerWeatherBadge">
            <span :class="$style.weatherIcon">🌤️</span>
            <span :class="$style.weatherTimeText">
              {{ currentDateStr }} | {{ city }}天气：<strong>{{ currentWeather }}</strong>
            </span>
          </div>

          <!-- 居中 聊天框 -->
          <div :class="$style.centerInputWrapper">
            <div :class="$style.inputBoxContainer">
              <!-- Inline 附加功能 Chip 标签（在输入框内部，无独立弹窗） -->
              <div v-if="activeFeatureTag" :class="$style.activeTagChip">
                <span>{{ activeFeatureTag.label }}</span>
                <button :class="$style.removeTagBtn" @click="activeFeatureTag = null">✕</button>
              </div>

              <!-- 输入框 -->
              <input
                v-model="inputMessage"
                type="text"
                :placeholder="activeFeatureTag ? activeFeatureTag.placeholder : '有问题，尽管问...'"
                :class="$style.chatInput"
                @keyup.enter="sendMessage"
              />

              <!-- '+' 功能按钮菜单 -->
              <div :class="$style.plusMenuContainer">
                <button :class="$style.plusBtn" title="附加功能" @click="showPlusMenu = !showPlusMenu">
                  +
                </button>
                <transition name="fade">
                  <div v-if="showPlusMenu" :class="$style.plusDropdown" @mouseleave="showPlusMenu = false">
                    <button :class="$style.dropdownItem" @click="attachFeatureTag('search')">
                      🔍 AI 聚合搜索
                    </button>
                    <button :class="$style.dropdownItem" @click="attachFeatureTag('play')">
                      🎵 快捷点歌
                    </button>
                  </div>
                </transition>
              </div>

              <!-- 发送按钮 -->
              <button :class="$style.sendCircleBtn" @click="sendMessage">
                ↑
              </button>
            </div>

            <!-- 智能推荐选项 Chips -->
            <div :class="$style.suggestionChips">
              <button
                v-for="(chipText, idx) in suggestionChips"
                :key="idx"
                :class="$style.chip"
                @click="applySuggestion(chipText)"
              >
                {{ chipText }}
              </button>

              <button :class="[$style.chip, $style.refreshChip]" title="刷新推荐选项" @click="refreshSuggestions">
                🔄 换一换
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. 已有消息时的 对话流视图 -->
      <div v-else :class="$style.streamBody" class="scroll">
        <!-- 顶部简短天气环境条 -->
        <div :class="$style.streamWeatherHeader">
          <span>
            🌤️ {{ currentDateStr }} | {{ city }}天气：{{ currentWeather }} | 当前模式：{{ mode === 'dj' ? '🎧 DJ 电台' : '💬 知心聊天' }} | 当前模型：{{ currentModel }}
          </span>
        </div>

        <!-- 消息列表 -->
        <div :class="$style.messagesStream">
          <div v-for="(msg, index) in messageList" :key="index" :class="[$style.messageRow, $style[msg.sender]]">
            <div :class="$style.avatar">{{ msg.sender === 'user' ? '👤' : (mode === 'dj' ? '📻' : '💬') }}</div>
            <div :class="$style.bubble">
              <p>{{ msg.text }}</p>

              <!-- 🎵 音乐推荐卡片：包含黑胶唱片 (Vinyl Record Logo) 动画设计 -->
              <div v-if="msg.musicCard" :class="$style.musicCard">
                <div :class="$style.vinylContainer">
                  <div :class="$style.albumCover">🎵</div>
                  <div :class="[$style.vinylDisc, { [$style.spinning]: isPlayingMusic }]">
                    <div :class="$style.vinylCenterLabel"></div>
                  </div>
                </div>

                <div :class="$style.musicMeta">
                  <div :class="$style.songTitle">{{ msg.musicCard.name }}</div>
                  <div :class="$style.artist">{{ msg.musicCard.singer }}</div>
                </div>

                <button :class="$style.playBtn" @click="isPlayingMusic = !isPlayingMusic">
                  {{ isPlayingMusic ? '⏸ 暂停' : '▶ 播放' }}
                </button>
              </div>

              <!-- 消息气泡内的【🗑️ 删除单条消息】按钮 -->
              <button :class="$style.deleteMsgBtn" title="删除此条消息" @click="deleteMessage(index)">
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 对话流视图下的 底部固定聊天框 -->
      <div v-if="messageList.length > 0" :class="$style.bottomInputArea">
        <div :class="$style.inputBoxContainer">
          <!-- Inline 附加功能 Chip 标签 -->
          <div v-if="activeFeatureTag" :class="$style.activeTagChip">
            <span>{{ activeFeatureTag.label }}</span>
            <button :class="$style.removeTagBtn" @click="activeFeatureTag = null">✕</button>
          </div>

          <!-- 输入框 -->
          <input
            v-model="inputMessage"
            type="text"
            :placeholder="activeFeatureTag ? activeFeatureTag.placeholder : '有问题，尽管问...'"
            :class="$style.chatInput"
            @keyup.enter="sendMessage"
          />

          <!-- '+' 功能按钮菜单 -->
          <div :class="$style.plusMenuContainer">
            <button :class="$style.plusBtn" title="附加功能" @click="showPlusMenu = !showPlusMenu">
              +
            </button>
            <transition name="fade">
              <div v-if="showPlusMenu" :class="$style.plusDropdown" @mouseleave="showPlusMenu = false">
                <button :class="$style.dropdownItem" @click="attachFeatureTag('search')">
                  🔍 AI 聚合搜索
                </button>
                <button :class="$style.dropdownItem" @click="attachFeatureTag('play')">
                  🎵 快捷点歌
                </button>
              </div>
            </transition>
          </div>

          <!-- 发送按钮 -->
          <button :class="$style.sendCircleBtn" @click="sendMessage">
            ↑
          </button>
        </div>
      </div>
    </div>

    <!-- 分类偏好设置 弹窗 -->
    <DjSettingModal v-model:visible="showSettingModal" @save="onSaveSetting" />
  </div>
</template>

<script>
import { ref, computed, onMounted } from '@common/utils/vueTools'
import DjSettingModal from './components/DjSettingModal.vue'

export default {
  name: 'DjChatGPTIntegratedView',
  components: {
    DjSettingModal,
  },
  setup() {
    const isSidebarOpen = ref(true)
    const mode = ref('dj') // 'dj' | 'chat'
    const weatherType = ref('sunny')
    const city = ref('北京')
    const currentWeather = ref('晴 22°C')
    const currentDateStr = ref('')
    const currentModel = ref('glm-4-flash')

    const aiOpeningGreeting = ref('')
    const suggestionChips = ref([])

    const historyCategory = ref('dj') // 'dj' | 'chat' | 'recommend'
    const activeHistoryId = ref('')
    const inputMessage = ref('')
    const isPlayingMusic = ref(true)

    const showPlusMenu = ref(false)
    const showSettingModal = ref(false)
    const activeFeatureTag = ref(null)

    // 提示词与配置状态
    const djSystemPrompt = ref('')
    const chatSystemPrompt = ref('')
    const enableChatSpeech = ref(true)
    const enableDjSpeech = ref(true)

    // 1. DJ 调频专属历史列表
    const djHistory = ref([
      {
        id: 'dj-1',
        type: 'history',
        mode: 'dj',
        title: '周五雨夜晚安调频',
        date: '21:30',
        messages: [
          { sender: 'user', text: '播放适合雨夜放空的爵士音乐' },
          {
            sender: 'ai',
            text: '🎧 欢迎收听周五雨夜特别调频。窗外小雨淅淅沥沥，为您播送一首 Bill Evans 的经典爵士《Peace Piece》：',
            musicCard: { name: 'Peace Piece', singer: 'Bill Evans' },
          },
        ],
      },
      {
        id: 'dj-2',
        type: 'history',
        mode: 'dj',
        title: '阳光午后 Bossa Nova 特调',
        date: '昨天',
        messages: [
          { sender: 'user', text: '来几首轻松清爽的午后咖啡音乐' },
          {
            sender: 'ai',
            text: '🎧 调频就绪！为您播送小野丽莎的经典 Bossa Nova《Fly Me to the Moon》：',
            musicCard: { name: 'Fly Me to the Moon', singer: '小野丽莎' },
          },
        ],
      },
    ])

    // 2. 知心聊天专属历史列表
    const chatHistory = ref([
      {
        id: 'chat-1',
        type: 'history',
        mode: 'chat',
        title: '周杰伦经典歌曲交流与推荐',
        date: '14:20',
        messages: [
          { sender: 'user', text: '想听周杰伦比较有氛围感、适合现在听的歌' },
          {
            sender: 'ai',
            text: '💬 为您推荐周杰伦的经典名曲《晴天》。这首歌吉他前奏一出来就充满了青春与怀旧的氛围。',
            musicCard: { name: '晴天', singer: '周杰伦' },
          },
          { sender: 'user', text: '这首歌真的很经典！还有类似的乐风吗？' },
          {
            sender: 'ai',
            text: '💬 有的！《七里香》同样充满了夏日的清爽与诗意：',
            musicCard: { name: '七里香', singer: '周杰伦' },
          },
        ],
      },
      {
        id: 'chat-2',
        type: 'history',
        mode: 'chat',
        title: '适合雨天工作的轻音乐',
        date: '07-20',
        messages: [
          { sender: 'user', text: '外面在下雨，求推荐几首适合专注工作的舒缓纯音乐' },
          {
            sender: 'ai',
            text: '💬 下雨天最适合听羽肿的《Rainy Memory》，雨滴般的钢琴琴音能让人迅速沉静下来：',
            musicCard: { name: 'Rainy Memory', singer: '羽肿' },
          },
        ],
      },
    ])

    // 3. 推荐点播历史列表
    const recommendHistory = ref([
      { id: 'rec-1', type: 'recommend', mode: 'dj', title: '晴天 - 周杰伦', singer: '周杰伦', date: '08:30' },
      { id: 'rec-2', type: 'recommend', mode: 'chat', title: '阴天快乐 - 陈奕迅', singer: '陈奕迅', date: '07-21' },
    ])

    const currentHistoryList = computed(() => {
      if (historyCategory.value === 'dj') return djHistory.value
      if (historyCategory.value === 'chat') return chatHistory.value
      return recommendHistory.value
    })

    const messageList = ref([])

    // 动态生成 AI 开场白主标题
    const generateAiGreeting = () => {
      const hours = new Date().getHours()
      let timePeriod = '白天'
      if (hours >= 5 && hours < 11) timePeriod = '早晨'
      else if (hours >= 11 && hours < 13) timePeriod = '午后'
      else if (hours >= 13 && hours < 18) timePeriod = '下午'
      else timePeriod = '夜晚'

      if (mode.value === 'dj') {
        if (timePeriod === '早晨') {
          aiOpeningGreeting.value = '🎧 阳光正好，我是你的 AI 音乐 DJ，早晨想听什么？'
        } else if (timePeriod === '夜晚') {
          aiOpeningGreeting.value = '🎧 晚安调频：我是 AI 音乐 DJ，为您播送夜间情绪特调'
        } else {
          aiOpeningGreeting.value = '🎧 调频就绪：我是你的 AI 音乐 DJ，随时为你点播好歌'
        }
      } else {
        if (timePeriod === '早晨') {
          aiOpeningGreeting.value = `💬 早上好！今天${city.value}天气${currentWeather.value}，想聊些什么？`
        } else if (timePeriod === '夜晚') {
          aiOpeningGreeting.value = '💬 晚上好！结束了一天的工作，来聊聊今晚的心情吧'
        } else {
          aiOpeningGreeting.value = '💬 你今天在想些什么？我是你的音乐知心伙伴'
        }
      }
    }

    // 动态生成推荐选项 Chips
    const generateDynamicSuggestions = () => {
      const hours = new Date().getHours()
      const isNight = hours >= 19 || hours < 6

      if (mode.value === 'dj') {
        if (isNight) {
          suggestionChips.value = [
            '🌙 深夜感性民谣',
            '🎧 爵士酒吧特调',
            '🌧️ 舒缓助眠钢琴曲',
            '🔥 爆款电音摇滚',
          ]
        } else {
          suggestionChips.value = [
            '💡 推荐周杰伦快歌',
            '☕ 阳光午后 Bossa Nova',
            '🎧 全网热搜流行榜',
            '🔍 适合工作的轻音乐',
          ]
        }
      } else {
        suggestionChips.value = [
          `🌤️ 聊聊${city.value}今天的天气`,
          '☕ 推荐几首适合放松的歌',
          '💡 你有什么音乐励志金句吗？',
          '🔍 帮我搜一首热血动漫主题曲',
        ]
      }
    }

    const refreshSuggestions = () => {
      const alternativeChips = [
        ['🔥 抖音热歌榜', '🎸 经典华语摇滚', '🎹 治愈系纯音乐', '🎧 城市 CityPop'],
        ['☕ 咖啡馆特调爵士', '🌅 晨间唤醒神曲', '🎧 80年代复古港台', '💡 聊聊最近上映的电影原声'],
      ]
      const randomIndex = Math.floor(Math.random() * alternativeChips.length)
      suggestionChips.value = alternativeChips[randomIndex]
    }

    const updateCurrentTime = () => {
      const now = new Date()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      currentDateStr.value = `${now.getFullYear()}-${month}-${day} ${hours}:${minutes}`

      if (now.getHours() >= 19 || now.getHours() < 6) {
        weatherType.value = 'night'
      } else {
        weatherType.value = 'sunny'
      }

      generateAiGreeting()
      generateDynamicSuggestions()
    }

    onMounted(() => {
      updateCurrentTime()
    })

    const switchMode = (newMode) => {
      mode.value = newMode
      generateAiGreeting()
      generateDynamicSuggestions()
    }

    const startNewChat = () => {
      activeHistoryId.value = ''
      messageList.value = []
      activeFeatureTag.value = null
      generateAiGreeting()
    }

    // 点击历史项：自动恢复对应模式 (DJ 或 聊天) 并完整呈现带 musicCard 的消息
    const selectHistoryItem = (item) => {
      activeHistoryId.value = item.id
      if (item.type === 'recommend') {
        directPlayMusic(item)
        return
      }

      // 恢复会话对应的 Mode (DJ / Chat)
      if (item.mode) {
        mode.value = item.mode
      }

      if (item.messages && item.messages.length > 0) {
        messageList.value = JSON.parse(JSON.stringify(item.messages))
      } else {
        messageList.value = [
          { sender: 'user', text: `[回顾会话] ${item.title}` },
          {
            sender: 'ai',
            text: `我们此前交流了"${item.title}"。为您回顾推介的曲目：`,
            musicCard: { name: item.title, singer: 'AI 推荐精选' },
          },
        ]
      }
    }

    // 推荐历史直接播放
    const directPlayMusic = (item) => {
      isPlayingMusic.value = true
      console.log('直接在侧边栏触发播放推荐音乐:', item.title)
    }

    // 删除历史记录项
    const deleteHistoryItem = (item) => {
      if (item.mode === 'dj') {
        djHistory.value = djHistory.value.filter(i => i.id !== item.id)
      } else if (item.mode === 'chat') {
        chatHistory.value = chatHistory.value.filter(i => i.id !== item.id)
      } else {
        recommendHistory.value = recommendHistory.value.filter(i => i.id !== item.id)
      }

      if (activeHistoryId.value === item.id) {
        startNewChat()
      }
    }

    // 删除单条聊天消息
    const deleteMessage = (index) => {
      messageList.value.splice(index, 1)
    }

    const attachFeatureTag = (type) => {
      showPlusMenu.value = false
      if (type === 'search') {
        activeFeatureTag.value = {
          type: 'search',
          label: '🔍 AI 聚合搜索',
          placeholder: '输入泛意图或想听的音乐类型...',
        }
      } else if (type === 'play') {
        activeFeatureTag.value = {
          type: 'play',
          label: '🎵 快捷点歌',
          placeholder: '输入歌名或歌手名...',
        }
      }
    }

    const applySuggestion = (text) => {
      inputMessage.value = text
      sendMessage()
    }

    const sendMessage = () => {
      if (!inputMessage.value.trim() && !activeFeatureTag.value) return

      let tagPrefix = ''
      if (activeFeatureTag.value) {
        tagPrefix = `[${activeFeatureTag.value.label}] `
      }

      const fullText = tagPrefix + inputMessage.value.trim()

      messageList.value.push({
        sender: 'user',
        text: fullText,
      })

      const queryText = inputMessage.value.trim()
      const tag = activeFeatureTag.value
      inputMessage.value = ''
      activeFeatureTag.value = null

      setTimeout(() => {
        if (tag && tag.type === 'play') {
          messageList.value.push({
            sender: 'ai',
            text: `快捷点播成功！已经为您搜索并推入播放列表："${queryText}"。黑胶唱片开始旋转播报～`,
            musicCard: {
              name: queryText,
              singer: '快捷点播音源',
            },
          })
        } else if (tag && tag.type === 'search') {
          messageList.value.push({
            sender: 'ai',
            text: `AI 聚合搜索结果：找到最符合意图"${queryText}"的音乐如下：`,
            musicCard: {
              name: queryText,
              singer: '全网精选曲目',
            },
          })
        } else {
          messageList.value.push({
            sender: 'ai',
            text: mode.value === 'chat'
              ? `聊得很有趣！关于"${queryText}"，为你推介一首心意之作：`
              : `DJ 收到指令："${queryText}"。为您播放一首配合当下天气的推荐曲目！`,
            musicCard: { name: queryText || '晴天', singer: '周杰伦' },
          })
        }
      }, 500)
    }

    const onSaveSetting = (settings) => {
      if (settings.city) city.value = settings.city
      if (settings.model) currentModel.value = settings.model
      if (settings.djPromptRole) djSystemPrompt.value = settings.djPromptRole
      if (settings.chatPromptRole) chatSystemPrompt.value = settings.chatPromptRole
      enableChatSpeech.value = settings.enableChatSpeech
      enableDjSpeech.value = settings.enableDjSpeech

      generateAiGreeting()
      generateDynamicSuggestions()
    }

    return {
      isSidebarOpen,
      mode,
      weatherType,
      city,
      currentWeather,
      currentDateStr,
      currentModel,
      aiOpeningGreeting,
      suggestionChips,
      historyCategory,
      activeHistoryId,
      inputMessage,
      isPlayingMusic,
      showPlusMenu,
      showSettingModal,
      activeFeatureTag,
      currentHistoryList,
      messageList,
      djSystemPrompt,
      chatSystemPrompt,
      switchMode,
      startNewChat,
      selectHistoryItem,
      directPlayMusic,
      deleteHistoryItem,
      deleteMessage,
      attachFeatureTag,
      applySuggestion,
      refreshSuggestions,
      sendMessage,
      onSaveSetting,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

/* 全局布局与动态主题背景 */
.chatGptLayout {
  display: flex;
  height: 100%;
  width: 100%;
  background: var(--color-content-background);
  color: var(--color-font);
  overflow: hidden;
  position: relative;
  transition: background 0.4s ease;

  /* 🎧 DJ 模式：动态适配 LX Music 本地原生主题 (使用原生 CSS 变量) */
  &.dj {
    background: linear-gradient(135deg, var(--color-primary-light-900-alpha-200) 0%, var(--color-content-background) 100%);
    border: 1px solid var(--color-primary-light-500-alpha-300);

    &:before {
      content: '';
      position: absolute;
      top: -120px;
      right: -120px;
      width: 460px;
      height: 460px;
      background: radial-gradient(circle, var(--color-primary-alpha-300) 0%, transparent 70%);
      pointer-events: none;
    }
  }

  /* 💬 聊天模式 动态天气主题 overlay */
  &.chat.weather-sunny {
    background: linear-gradient(180deg, rgba(254, 249, 231, 0.15) 0%, var(--color-content-background) 100%);
  }

  &.chat.weather-night {
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.25) 0%, var(--color-content-background) 100%);
  }
}

/* 左侧 侧边栏 (可折叠) */
.sidebar {
  width: 240px;
  flex: none;
  background: var(--color-primary-light-900-alpha-300);
  border-right: 1px solid var(--color-primary-light-500-alpha-300);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  &.sidebarCollapsed {
    width: 60px;
    padding: 0;

    .historyTabs, .historyList {
      display: none;
    }
  }
}

.sidebarHeader {
  padding: 12px;
}

.newChatBtn {
  width: 100%;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px dashed var(--color-primary-light-400-alpha-600);
  background: var(--color-content-background);
  color: var(--color-primary);
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all @transition-fast;

  &:hover {
    background: var(--color-primary-light-800-alpha-400);
    border-style: solid;
  }
}

.historyTabs {
  display: flex;
  padding: 0 8px 8px 8px;
  gap: 2px;
  border-bottom: 1px solid var(--color-primary-light-500-alpha-200);
}

.historyTab {
  flex: 1;
  border: none;
  background: transparent;
  padding: 5px 2px;
  border-radius: 6px;
  font-size: 11px;
  color: var(--color-font-label);
  cursor: pointer;
  white-space: nowrap;

  &.activeHistoryTab {
    background: var(--color-primary-light-700-alpha-500);
    color: var(--color-primary);
    font-weight: 600;
  }
}

.historyList {
  flex: 1;
  padding: 8px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.historyItem {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background @transition-fast;
  position: relative;

  &:hover {
    background: var(--color-primary-light-800-alpha-300);

    .itemActions {
      opacity: 1;
    }
  }

  &.activeHistoryItem {
    background: var(--color-primary-light-700-alpha-500);
  }
}

.itemIcon {
  font-size: 13px;
}

.itemMeta {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.itemTitle {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--color-font);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 4px;
}

.modeBadge {
  font-size: 9.5px;
  padding: 1px 4px;
  border-radius: 4px;
  font-weight: 600;
  color: #fff;

  &.badge-dj {
    background: #9333ea;
  }

  &.badge-chat {
    background: var(--color-primary);
  }
}

.itemDate {
  font-size: 10.5px;
  color: var(--color-font-label);
}

.itemActions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0.7;
  transition: opacity @transition-fast;
}

.directPlayBtn {
  border: none;
  background: var(--color-primary);
  color: #fff;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    opacity: 0.9;
  }
}

.deleteItemBtn {
  border: none;
  background: transparent;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;

  &:hover {
    background: var(--color-primary-light-700-alpha-600);
  }
}

/* 右侧 主界面 */
.mainContent {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

/* 顶部 工具栏 */
.topBar {
  height: 52px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 10;
}

.topBarLeft {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sidebarToggleBtn {
  border: none;
  background: transparent;
  font-size: 18px;
  color: var(--color-font-label);
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
  transition: background @transition-fast;

  &:hover {
    background: var(--color-primary-light-800-alpha-400);
    color: var(--color-font);
  }
}

.activeModelBadge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--color-primary-light-800-alpha-400);
  border-radius: 12px;
  font-size: 12px;
  color: var(--color-primary);
  border: 1px solid var(--color-primary-light-500-alpha-300);
}

.modelIcon {
  font-size: 13px;
}

.modelName {
  font-weight: 600;
}

.topBarCenter {
  flex: 1;
  display: flex;
  justify-content: center;
}

.modeTogglePills {
  display: flex;
  background: var(--color-primary-light-800-alpha-500);
  padding: 3px;
  border-radius: 20px;
}

.pillBtn {
  border: none;
  background: transparent;
  padding: 5px 18px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-font-label);
  cursor: pointer;
  transition: all @transition-fast;

  &.activePill {
    background: var(--color-primary);
    color: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
}

.settingIconBtn {
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  color: var(--color-font-label);

  &:hover {
    background: var(--color-primary-light-800-alpha-400);
    color: var(--color-font);
  }
}

/* 1. 居中新对话 Landing View 视图 */
.landingView {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.landingContainer {
  width: 100%;
  max-width: 680px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.landingTitle {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--color-font);
  text-align: center;
  line-height: 1.4;
}

.centerWeatherBadge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--color-primary-light-800-alpha-400);
  border-radius: 20px;
  border: 1px solid var(--color-primary-light-500-alpha-300);
  font-size: 13px;
  color: var(--color-font);

  strong {
    color: var(--color-primary);
  }
}

.centerInputWrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.inputBoxContainer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 28px;
  border: 1px solid var(--color-primary-light-400-alpha-600);
  background: var(--color-content-background);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  position: relative;

  &:focus-within {
    border-color: var(--color-primary);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
  }
}

.activeTagChip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 14px;
  background: var(--color-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 600;

  .removeTagBtn {
    border: none;
    background: transparent;
    color: #fff;
    cursor: pointer;
    font-size: 11px;
    padding: 0;
  }
}

.chatInput {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--color-font);
  font-size: 14px;
  outline: none;
  padding: 6px 4px;
}

.plusMenuContainer {
  position: relative;
}

.plusBtn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--color-primary-light-800-alpha-500);
  color: var(--color-font);
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all @transition-fast;

  &:hover {
    background: var(--color-primary);
    color: #fff;
  }
}

.plusDropdown {
  position: absolute;
  bottom: 42px;
  left: 0;
  background: var(--color-content-background);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  border: 1px solid var(--color-primary-light-400-alpha-500);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 100;
  min-width: 160px;
}

.dropdownItem {
  border: none;
  background: transparent;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--color-font);
  text-align: left;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: var(--color-primary-light-800-alpha-400);
    color: var(--color-primary);
  }
}

.sendCircleBtn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: var(--color-primary);
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity @transition-fast;

  &:hover {
    opacity: 0.9;
  }
}

.suggestionChips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.chip {
  padding: 8px 14px;
  border-radius: 20px;
  border: 1px solid var(--color-primary-light-400-alpha-500);
  background: var(--color-primary-light-900-alpha-300);
  color: var(--color-font);
  font-size: 12.5px;
  cursor: pointer;
  transition: all @transition-fast;

  &:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: var(--color-primary-light-800-alpha-400);
  }
}

.refreshChip {
  background: transparent;
  border-style: dashed;
  color: var(--color-primary);
}

/* 2. 对话流视图 */
.streamBody {
  flex: 1;
  padding: 16px 40px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.streamWeatherHeader {
  font-size: 12px;
  color: var(--color-font-label);
  text-align: center;
}

.messagesStream {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 760px;
  margin: 0 auto;
  width: 100%;
}

.messageRow {
  display: flex;
  gap: 12px;

  &.user {
    align-self: flex-end;
    flex-direction: row-reverse;

    .bubble {
      background: var(--color-primary);
      color: #fff;
      border-radius: 18px 18px 2px 18px;
    }
  }

  &.ai {
    align-self: flex-start;

    .bubble {
      background: var(--color-primary-light-900-alpha-400);
      color: var(--color-font);
      border-radius: 18px 18px 18px 2px;
      border: 1px solid var(--color-primary-light-500-alpha-200);
    }
  }
}

.avatar {
  font-size: 18px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-primary-light-800-alpha-500);
  display: flex;
  align-items: center;
  justify-content: center;
}

.bubble {
  padding: 12px 16px;
  max-width: 600px;
  position: relative;

  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
  }

  &:hover {
    .deleteMsgBtn {
      opacity: 1;
    }
  }
}

.deleteMsgBtn {
  position: absolute;
  top: 4px;
  right: -28px;
  border: none;
  background: transparent;
  font-size: 12px;
  cursor: pointer;
  opacity: 0;
  transition: opacity @transition-fast;
}

.musicCard {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  background: var(--color-content-background);
  border-radius: 12px;
  border: 1px solid var(--color-primary-light-400-alpha-500);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.vinylContainer {
  position: relative;
  width: 44px;
  height: 44px;
}

.albumCover {
  position: absolute;
  top: 0;
  left: 0;
  width: 40px;
  height: 40px;
  background: var(--color-primary-light-700-alpha-600);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  z-index: 2;
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.2);
}

.vinylDisc {
  position: absolute;
  top: 2px;
  left: 12px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: radial-gradient(circle, #111 20%, #333 21%, #111 40%, #222 60%, #111 100%);
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);

  &.spinning {
    animation: spinVinyl 3s linear infinite;
  }
}

.vinylCenterLabel {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-primary);
}

@keyframes spinVinyl {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.musicMeta {
  flex: 1;
}

.songTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
}

.artist {
  font-size: 12px;
  color: var(--color-font-label);
}

.playBtn {
  border: none;
  background: var(--color-primary);
  color: #fff;
  padding: 6px 14px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
}

.bottomInputArea {
  padding: 12px 40px 20px 40px;
  background: transparent;
  max-width: 760px;
  margin: 0 auto;
  width: 100%;
}
</style>
