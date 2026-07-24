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

      <!-- 历史记录分类 Tab -->
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

          <div :class="$style.itemActions">
            <button
              v-if="item.type === 'recommend'"
              :class="$style.directPlayBtn"
              title="直接播放"
              @click.stop="directPlayMusic(item)"
            >
              ▶
            </button>

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
        <div :class="$style.topBarLeft">
          <button
            :class="$style.sidebarToggleBtn"
            :title="isSidebarOpen ? '收起侧边栏' : '展开侧边栏'"
            @click="isSidebarOpen = !isSidebarOpen"
          >
            <span :class="$style.toggleIcon">☰</span>
          </button>

          <div :class="$style.activeModelBadge" title="当前生效的大模型">
            <span :class="$style.modelIcon">🤖</span>
            <span :class="$style.modelName">{{ activeModelName }}</span>
          </div>
        </div>

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

        <div :class="$style.topBarRight">
          <button :class="$style.settingIconBtn" title="AI DJ 偏好与独立人设设置" @click="showSettingModal = true">
            ⚙️
          </button>
        </div>
      </div>

      <!-- 1. 居中新对话 Landing View 视图 -->
      <div v-if="messageList.length === 0" :class="$style.landingView">
        <div :class="$style.landingContainer">
          <h1 :class="$style.landingTitle">
            {{ aiOpeningGreeting }}
          </h1>

          <div :class="$style.centerWeatherBadge">
            <span :class="$style.weatherIcon">🌤️</span>
            <span :class="$style.weatherTimeText">
              {{ currentDateStr }} | {{ city }}天气：<strong>{{ currentWeather }}</strong>
            </span>
          </div>

          <div :class="$style.centerInputWrapper">
            <div :class="$style.inputBoxContainer">
              <div v-if="activeFeatureTag" :class="$style.activeTagChip">
                <span>{{ activeFeatureTag.label }}</span>
                <button :class="$style.removeTagBtn" @click="activeFeatureTag = null">✕</button>
              </div>

              <input
                v-model="inputMessage"
                type="text"
                :placeholder="activeFeatureTag ? activeFeatureTag.placeholder : '输入想听的歌、歌手、心情或任何问题...'"
                :class="$style.chatInput"
                :disabled="isGenerating"
                @keyup.enter="handleSendClick"
              />

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

              <button :class="$style.sendCircleBtn" :disabled="isGenerating" @click="handleSendClick">
                {{ isGenerating ? '⌛' : '↑' }}
              </button>
            </div>

            <div :class="$style.suggestionChips">
              <button
                v-for="(chipText, idx) in suggestionChips"
                :key="idx"
                :class="$style.chip"
                :title="chipText"
                @click="applySuggestion(chipText)"
              >
                {{ chipText }}
              </button>

              <button :class="[$style.chip, $style.refreshChip]" title="刷新推荐选项" @click="handleRefreshClick">
                🔄 换一换
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. 已有消息时的 对话流视图 -->
      <div v-else :class="$style.streamBody" class="scroll">
        <div :class="$style.streamWeatherHeader">
          <span>
            🌤️ {{ currentDateStr }} | {{ city }}天气：{{ currentWeather }} | 当前模式：{{ mode === 'dj' ? '🎧 DJ 电台' : '💬 知心聊天' }} | 当前模型：{{ activeModelName }}
          </span>
        </div>

        <div :class="$style.messagesStream">
          <div v-for="(msg, index) in messageList" :key="index" :class="[$style.messageRow, $style[msg.sender]]">
            <div :class="$style.avatar">{{ msg.sender === 'user' ? '👤' : (mode === 'dj' ? '📻' : '💬') }}</div>
            <div :class="$style.bubble">
              <p>{{ msg.text }}</p>

              <!-- 🎵 音乐推荐卡片列表 (支持 1 到多首动态推荐) -->
              <div v-if="msg.musicCards && msg.musicCards.length" :class="$style.musicCardList">
                <div v-for="(card, cardIdx) in msg.musicCards" :key="cardIdx" :class="$style.musicCard">
                  <div :class="$style.vinylContainer">
                    <div :class="$style.albumCover">
                      <img v-if="card.pic || card.meta?.picUrl" :src="card.pic || card.meta?.picUrl" :class="$style.albumCoverImg" />
                      <span v-else>🎵</span>
                    </div>
                    <div :class="[$style.vinylDisc, { [$style.spinning]: isPlayingMusic }]">
                      <div :class="$style.vinylCenterLabel"></div>
                    </div>
                  </div>

                  <div :class="$style.musicMeta">
                    <div :class="$style.songTitle">{{ card.name }}</div>
                    <div :class="$style.artist">{{ card.singer }}</div>
                    <div v-if="card.reason" :class="$style.recommendReason">💡 {{ card.reason }}</div>
                  </div>

                  <button :class="$style.playBtn" @click="toggleMusicPlay(card)">
                    ▶ 播放
                  </button>
                </div>
              </div>

              <!-- 兼容旧历史数据单卡片 msg.musicCard -->
              <div v-else-if="msg.musicCard" :class="$style.musicCard">
                <div :class="$style.vinylContainer">
                  <div :class="$style.albumCover">
                    <img v-if="msg.musicCard.pic || msg.musicCard.meta?.picUrl" :src="msg.musicCard.pic || msg.musicCard.meta?.picUrl" :class="$style.albumCoverImg" />
                    <span v-else>🎵</span>
                  </div>
                  <div :class="[$style.vinylDisc, { [$style.spinning]: isPlayingMusic }]">
                    <div :class="$style.vinylCenterLabel"></div>
                  </div>
                </div>

                <div :class="$style.musicMeta">
                  <div :class="$style.songTitle">{{ msg.musicCard.name }}</div>
                  <div :class="$style.artist">{{ msg.musicCard.singer }}</div>
                  <div v-if="msg.musicCard.reason" :class="$style.recommendReason">💡 {{ msg.musicCard.reason }}</div>
                </div>

                <button :class="$style.playBtn" @click="toggleMusicPlay(msg.musicCard)">
                  ▶ 播放
                </button>
              </div>

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
          <div v-if="activeFeatureTag" :class="$style.activeTagChip">
            <span>{{ activeFeatureTag.label }}</span>
            <button :class="$style.removeTagBtn" @click="activeFeatureTag = null">✕</button>
          </div>

          <input
            v-model="inputMessage"
            type="text"
            :placeholder="activeFeatureTag ? activeFeatureTag.placeholder : '输入想听的歌、歌手、心情或任何问题...'"
            :class="$style.chatInput"
            :disabled="isGenerating"
            @keyup.enter="handleSendClick"
          />

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

          <button :class="$style.sendCircleBtn" :disabled="isGenerating" @click="handleSendClick">
            {{ isGenerating ? '⌛' : '↑' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 分类偏好设置 弹窗 -->
    <DjSettingModal v-model:visible="showSettingModal" @save="onSaveSetting" />
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from '@common/utils/vueTools'
import DjSettingModal from './components/DjSettingModal.vue'
import { djSettings, djHistoryList, chatHistoryList, recommendHistoryList, saveHistory } from '@renderer/store/dj'
import { sendLlmStreamMessage, fetchDynamicSuggestionsFromLLM } from '@renderer/utils/dj/llmService'
import { synthesizeSpeech } from '@renderer/utils/dj/ttsService'
import { playDjSpeech, stopDjSpeech, registerDjSongEndListener, unregisterDjSongEndListener } from '@renderer/core/player/djAudio'
import { fetchCurrentWeather } from '@renderer/utils/dj/weatherService'
import { analyzeUserProfile, recordPlayedSong, generateAiProfileSummary } from '@renderer/utils/dj/userProfile'
import musicSdk from '@renderer/utils/musicSdk'
import { toNewMusicInfo } from '@renderer/utils'
import { getPicPath } from '@renderer/core/music'
import { addTempPlayList } from '@renderer/store/player/action'
import { playNext } from '@renderer/core/player'
import { LIST_IDS } from '@common/constants'

export default {
  name: 'DjChatGPTIntegratedView',
  components: {
    DjSettingModal,
  },
  setup() {
    const isSidebarOpen = ref(true)
    const mode = ref('dj') // 'dj' | 'chat'
    const weatherType = ref('sunny')
    const city = computed(() => djSettings.city || '成都')
    const currentWeather = ref('晴 22°C')
    const currentDateStr = ref('')
    const activeModelName = computed(() => djSettings.activeModel || 'glm-4.7-flash')

    const aiOpeningGreeting = ref('')
    const suggestionChips = ref([])

    const historyCategory = ref('dj')
    const activeHistoryId = ref('')
    const inputMessage = ref('')
    const isGenerating = ref(false)
    const isPlayingMusic = ref(false)

    const showPlusMenu = ref(false)
    const showSettingModal = ref(false)
    const activeFeatureTag = ref(null)

    const currentHistoryList = computed(() => {
      if (historyCategory.value === 'dj') return djHistoryList
      if (historyCategory.value === 'chat') return chatHistoryList
      return recommendHistoryList
    })

    const messageList = ref([])

    // 自动实时天气查询与气象感应
    const initEnvironment = async() => {
      try {
        const wData = await fetchCurrentWeather()
        currentWeather.value = `${wData.weather} ${wData.temp}`
        if (wData.weather.includes('雨')) weatherType.value = 'rainy'
        else if (wData.weather.includes('雪')) weatherType.value = 'snowy'
        else if (wData.weather.includes('夜')) weatherType.value = 'night'
        else weatherType.value = 'sunny'
      } catch (e) {
        console.error('天气自动查询失败:', e)
      }
      analyzeUserProfile()
    }

    const generateAiGreeting = () => {
      const hours = new Date().getHours()
      let timePeriod = '白天'
      if (hours >= 5 && hours < 11) timePeriod = '早晨'
      else if (hours >= 11 && hours < 13) timePeriod = '午后'
      else if (hours >= 13 && hours < 18) timePeriod = '下午'
      else timePeriod = '夜晚'

      if (mode.value === 'dj') {
        if (timePeriod === '早晨') {
          aiOpeningGreeting.value = `🎧 阳光正好，我是你的 AI 音乐 DJ，${city.value}早晨想听什么？`
        } else if (timePeriod === '夜晚') {
          aiOpeningGreeting.value = `🎧 晚安调频：我是 AI 音乐 DJ，为您播送${city.value}夜间情绪特调`
        } else {
          aiOpeningGreeting.value = `🎧 调频就绪：我是你的 AI 音乐 DJ，随时为你点播${city.value}好歌`
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

    const generateDynamicSuggestions = () => {
      if (messageList.value.length > 0) return
      refreshSuggestions().catch(err => { console.error(err) })
    }

    const refreshSuggestions = async() => {
      if (messageList.value.length > 0) return
      if (isGenerating.value) return

      suggestionChips.value = ['正在思考推荐...']
      try {
        const res = await fetchDynamicSuggestionsFromLLM(currentWeather.value, mode.value)
        if (res && res.length >= 4) {
          suggestionChips.value = res
        } else {
          throw new Error('Fallback')
        }
      } catch (err) {
        const fallback = mode.value === 'dj'
          ? ['🔥 抖音热歌榜', '🎸 经典华语摇滚', '🎹 治愈系纯音乐', '🎧 城市 CityPop']
          : ['☕ 推荐几首适合放松的歌', '💡 聊聊最近上映的电影', '🔍 帮我搜一首励志歌曲', '🌤️ 聊聊今天的天气']
        suggestionChips.value = fallback
      }
    }

    const updateCurrentTime = () => {
      const now = new Date()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      currentDateStr.value = `${now.getFullYear()}-${month}-${day} ${hours}:${minutes}`

      generateAiGreeting()
      generateDynamicSuggestions()
    }

    const preloadMusicCardCovers = (messages = messageList.value) => {
      if (!messages?.length) return
      messages.forEach((msg) => {
        const cards = msg.musicCards || (msg.musicCard ? [msg.musicCard] : [])
        cards.forEach((card) => {
          if (card && (!card.pic && !card.meta?.picUrl)) {
            const fetchCover = async() => {
              const songMeta = await executeMusicSearch(`${card.name} ${card.singer || ''}`)
              if (songMeta?.source) {
                const coverPic = songMeta.meta?.picUrl ?? songMeta.pic
                if (coverPic) {
                  card.pic = coverPic
                }
                card.source = songMeta.source
              }
            }
            fetchCover().catch(err => { console.error('加载封面异常:', err) })
          }
        })
      })
    }

    const saveCurrentSessionToHistory = () => {
      if (!messageList.value.length) return
      let firstUserMsg = null
      for (const m of messageList.value) {
        if (m.sender === 'user') {
          firstUserMsg = m
          break
        }
      }
      let sessionTitle = firstUserMsg ? String(firstUserMsg.text).replace(/^\[.*?\]\s*/, '').trim() : ''
      if (!sessionTitle) sessionTitle = mode.value === 'dj' ? 'DJ 专属调频' : '知心聊天'
      sessionTitle = sessionTitle.slice(0, 16)

      const now = new Date()
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      const targetList = mode.value === 'dj' ? djHistoryList : chatHistoryList

      if (!activeHistoryId.value) {
        activeHistoryId.value = `${mode.value}-${Date.now()}`
        targetList.unshift({
          id: activeHistoryId.value,
          type: 'history',
          mode: mode.value,
          title: sessionTitle,
          date: timeStr,
          messages: JSON.parse(JSON.stringify(messageList.value)),
        })
      } else {
        const existing = targetList.find(i => i.id === activeHistoryId.value)
        if (existing) {
          existing.messages = JSON.parse(JSON.stringify(messageList.value))
          existing.date = timeStr
          existing.title = sessionTitle
        } else {
          targetList.unshift({
            id: activeHistoryId.value,
            type: 'history',
            mode: mode.value,
            title: sessionTitle,
            date: timeStr,
            messages: JSON.parse(JSON.stringify(messageList.value)),
          })
        }
      }
      saveHistory()
    }

    const handleDjSongEndedAutoContinue = () => {
      if (mode.value !== 'dj' || isGenerating.value) return
      console.log('DJ 推荐曲目播放完成，触发主动连播过度...')
      inputMessage.value = '（系统自动点播广播续播指令：请给出一句惬意的过度串词，并结合我的用户画像与当下氛围，继续推荐并播放下一首好听的音乐。）'
      sendMessage().catch(err => { console.error(err) })
    }

    onMounted(() => {
      updateCurrentTime()
      initEnvironment().catch(err => { console.error(err) })
      djHistoryList.forEach(item => { preloadMusicCardCovers(item.messages) })
      chatHistoryList.forEach(item => { preloadMusicCardCovers(item.messages) })
      preloadMusicCardCovers()
      registerDjSongEndListener(handleDjSongEndedAutoContinue)
    })

    onUnmounted(() => {
      stopDjSpeech()
      unregisterDjSongEndListener(handleDjSongEndedAutoContinue)
    })

    const switchMode = (newMode) => {
      stopDjSpeech()
      mode.value = newMode
      generateAiGreeting()
      generateDynamicSuggestions()
    }

    const startNewChat = () => {
      stopDjSpeech()
      activeHistoryId.value = ''
      messageList.value = []
      activeFeatureTag.value = null
      generateAiGreeting()
    }

    const selectHistoryItem = (item) => {
      activeHistoryId.value = item.id
      if (item.type === 'recommend') {
        directPlayMusic(item)
        return
      }

      if (item.mode) mode.value = item.mode

      if (item.messages && item.messages.length > 0) {
        messageList.value = JSON.parse(JSON.stringify(item.messages))
        preloadMusicCardCovers(messageList.value)
      }
    }

    const directPlayMusic = (item) => {
      isPlayingMusic.value = true
      recordPlayedSong(item.title, item.singer)
      console.log('直接在侧边栏触发播放推荐音乐:', item.title)
      const playTask = async() => {
        const songMeta = await executeMusicSearch(`${item.title} ${item.singer || ''}`)
        if (songMeta?.source) {
          addTempPlayList([{ listId: LIST_IDS.PLAY_LATER, musicInfo: songMeta, isTop: true }])
          playNext(true).catch(err => { console.error(err) })
        }
      }
      playTask().catch(err => { console.error(err) })
    }

    const deleteHistoryItem = (item) => {
      if (item.mode === 'dj') {
        const idx = djHistoryList.findIndex(i => i.id === item.id)
        if (idx > -1) djHistoryList.splice(idx, 1)
      } else if (item.mode === 'chat') {
        const idx = chatHistoryList.findIndex(i => i.id === item.id)
        if (idx > -1) chatHistoryList.splice(idx, 1)
      } else {
        const idx = recommendHistoryList.findIndex(i => i.id === item.id)
        if (idx > -1) recommendHistoryList.splice(idx, 1)
      }
      saveHistory()

      if (activeHistoryId.value === item.id) {
        startNewChat()
      }
    }

    // 将对话生成的推荐音乐自动同步添加至“推荐点播”侧边栏列表
    const addSongsToRecommendHistory = (songMetas) => {
      if (!songMetas?.length) return
      const now = new Date()
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      songMetas.forEach((song) => {
        if (!song?.name) return
        const songName = song.name
        const singerName = song.singer || '精选歌手'
        const existsIndex = recommendHistoryList.findIndex(
          (item) => item.title === songName && (item.singer === singerName || !song.singer),
        )
        if (existsIndex > -1) {
          recommendHistoryList.splice(existsIndex, 1)
        }

        recommendHistoryList.unshift({
          id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'recommend',
          mode: mode.value,
          title: songName,
          singer: singerName,
          date: timeStr,
        })
      })

      if (recommendHistoryList.length > 50) {
        recommendHistoryList.splice(50)
      }

      saveHistory()
    }

    const deleteMessage = (index) => {
      messageList.value.splice(index, 1)
      saveCurrentSessionToHistory()
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
      sendMessage().catch(err => { console.error(err) })
    }

    // 动态智能抽取 AI 文本中提到的 1 个或多个真实歌名（识别《...》或『...』）
    const extractRecommendedSongList = (aiText, userQuery) => {
      const matches1 = Array.from(aiText.matchAll(/《([^》]+)》/g)).map(m => m[1].trim())
      const matches2 = Array.from(aiText.matchAll(/『([^』]+)』/g)).map(m => m[1].trim())
      const names = [...new Set([...matches1, ...matches2])].filter(Boolean)

      if (names.length > 0) {
        return names
      }

      // 判断用户输入是否是常见打招呼/聊天词
      const commonGreetings = ['你好', 'hi', 'hello', '在吗', '哈啰', '早上好', '晚安', '你好呀', '嗨']
      const lowerQuery = userQuery.trim().toLowerCase()
      if (commonGreetings.includes(lowerQuery) || lowerQuery.length <= 2) {
        return ['晴天']
      }

      return [userQuery]
    }

    // 搜索并匹配曲目
    const executeMusicSearch = async(kw) => {
      try {
        const results = await musicSdk.searchMusic({ name: kw, limit: 5 })
        if (results && results.length > 0 && results[0].list?.length > 0) {
          const topSong = results[0].list[0]
          const musicInfo = toNewMusicInfo(topSong)
          try {
            const picUrl = await getPicPath({ musicInfo })
            if (picUrl) {
              musicInfo.meta.picUrl = picUrl
            }
          } catch (picErr) {
            console.error('获取歌曲封面图片失败:', picErr)
          }
          return musicInfo
        }
      } catch (e) {
        console.error('搜索音乐库异常:', e)
      }
      return null
    }

    // 真正的 SendMessage LLM SSE 打字机流式回复
    const sendMessage = async() => {
      if (!inputMessage.value.trim() && !activeFeatureTag.value) return
      if (isGenerating.value) return

      let tagPrefix = ''
      if (activeFeatureTag.value) {
        tagPrefix = `[${activeFeatureTag.value.label}] `
      }

      const userText = tagPrefix + inputMessage.value.trim()
      const rawQuery = inputMessage.value.trim()

      messageList.value.push({
        sender: 'user',
        text: userText,
      })

      inputMessage.value = ''
      activeFeatureTag.value = null
      isGenerating.value = true

      const aiMsgIndex = messageList.value.length
      messageList.value.push({
        sender: 'ai',
        text: '...',
        musicCards: null,
      })

      // 如果未配置 API Key，使用打字机与精准智能推荐（支持动态 1 到多首推荐）
      if (!djSettings.apiKey) {
        setTimeout(() => {
          const runFallback = async() => {
            const lower = rawQuery.toLowerCase()
            const isGreeting = ['你好', 'hi', 'hello', '在吗', '哈啰', '早上好', '晚安'].includes(lower)

            let targetKws = []
            if (isGreeting) {
              targetKws = ['晴天']
            } else if (lower.includes('多') || lower.includes('几') || lower.includes('3') || lower.includes('两') || lower.includes('歌单') || lower.includes('榜')) {
              targetKws = mode.value === 'dj' ? ['晴天', '海阔天空', 'City of Stars'] : ['晴天', '十年', '江南']
            } else {
              targetKws = [rawQuery]
            }

            const songMetas = (await Promise.all(targetKws.map(async kw => executeMusicSearch(kw)))).filter(Boolean)

            let aiText = ''
            if (songMetas.length > 1) {
              const namesStr = songMetas.map(s => `《${s.name}》`).join('、')
              aiText = mode.value === 'dj'
                ? `🎧【${djSettings.city}电台】为您精心编排特别歌单！结合此时此刻的天气，特别播送 ${namesStr}：`
                : `💬 听到关于"${rawQuery}"的倾诉，特别为您推介这几首温暖的曲目 ${namesStr}：`
            } else if (songMetas.length === 1) {
              aiText = mode.value === 'dj'
                ? `🎧【${djSettings.city}电台】欢迎收听 AI 音乐调频！结合此时此刻的天气，特别为您播送《${songMetas[0].name}》：`
                : `💬 听到关于"${rawQuery}"的倾诉，特别懂你。为您推介这首温暖的《${songMetas[0].name}》：`
            } else {
              aiText = `为您找到了关于 "${rawQuery}" 的相关推荐，请聆听：`
            }

            messageList.value[aiMsgIndex] = {
              sender: 'ai',
              text: aiText,
              musicCards: songMetas,
              musicCard: songMetas[0] ?? null,
            }
            addSongsToRecommendHistory(songMetas)
            saveCurrentSessionToHistory()
            isGenerating.value = false

            if (
              (mode.value === 'dj' && djSettings.enableDjSpeech) ||
              (mode.value === 'chat' && djSettings.enableChatSpeech)
            ) {
              try {
                const audioUrl = await synthesizeSpeech(aiText)
                playDjSpeech(audioUrl)
              } catch (err) {
                console.error('TTS 播放异常:', err)
              }
            }
          }
          runFallback().catch(err => { console.error(err) })
        }, 600)
        return
      }

      // 如果配置了 API Key，走真正的 LLM SSE 接口（带滑动窗口上下文 memory 记忆）
      const validMessages = messageList.value.slice(0, -1).filter(msg => msg.text && msg.text !== '...')
      const recentTurnCount = 8
      const formattedHistory = validMessages.slice(-recentTurnCount).map((msg) => ({
        role: (msg.sender === 'user' ? 'user' : 'assistant'),
        content: msg.text,
      }))

      let accumulatedText = ''

      await sendLlmStreamMessage(
        formattedHistory,
        mode.value,
        currentWeather.value,
        {
          onToken(token) {
            accumulatedText += token
            messageList.value[aiMsgIndex].text = accumulatedText
          },
          onToolCall(toolCall) {
            const handleToolCall = async() => {
              console.log('触发 LLM Tool Call:', toolCall)
              const kw = toolCall.arguments?.keyword || rawQuery
              const songMeta = await executeMusicSearch(kw)
              if (songMeta) {
                const currentCards = messageList.value[aiMsgIndex].musicCards || []
                if (!currentCards.some(c => c.id === songMeta.id)) {
                  messageList.value[aiMsgIndex].musicCards = [...currentCards, songMeta]
                  messageList.value[aiMsgIndex].musicCard = songMeta
                  addSongsToRecommendHistory([songMeta])
                }
              }
            }
            handleToolCall().catch(err => { console.error(err) })
          },
          onComplete(fullText) {
            const handleComplete = async() => {
              isGenerating.value = false

              // 从 AI 回复文本中抽取所有《...》书名号推荐歌名列表（1 个或多个）
              if (!messageList.value[aiMsgIndex].musicCards?.length) {
                const songNames = extractRecommendedSongList(fullText, rawQuery)
                const songMetas = (await Promise.all(songNames.map(async name => executeMusicSearch(name)))).filter(Boolean)
                if (songMetas.length) {
                  messageList.value[aiMsgIndex].musicCards = songMetas
                  messageList.value[aiMsgIndex].musicCard = songMetas[0]
                  addSongsToRecommendHistory(songMetas)
                }
              }

              saveCurrentSessionToHistory()

              if (djSettings.apiKey && messageList.value.length >= 3) {
                generateAiProfileSummary(djSettings.apiKey, djSettings.baseUrl, djSettings.activeModel).catch(err => {
                  console.warn('静默更新 AI 用户画像异常:', err)
                })
              }

              if (
                (mode.value === 'dj' && djSettings.enableDjSpeech) ||
                (mode.value === 'chat' && djSettings.enableChatSpeech)
              ) {
                try {
                  const audioUrl = await synthesizeSpeech(fullText)
                  playDjSpeech(audioUrl)
                } catch (err) {
                  console.error('TTS 播报异常:', err)
                }
              }
            }
            handleComplete().catch(err => { console.error(err) })
          },
          onError(err) {
            isGenerating.value = false
            messageList.value[aiMsgIndex].text = `服务链接异常: ${err.message}。请在右上角⚙️设置中检查 API Key 与 Endpoint`
          },
        },
      )
    }

    const toggleMusicPlay = (musicCard) => {
      isPlayingMusic.value = true
      recordPlayedSong(musicCard.name, musicCard.singer)
      console.log('触发播放聊天推荐音乐:', musicCard)

      void (async() => {
        const songMeta = await executeMusicSearch(`${musicCard.name} ${musicCard.singer || ''}`)
        if (songMeta?.source) {
          // 更新封面与来源，保证UI可以显示并在加入列表时不报错
          musicCard.pic = songMeta.meta?.picUrl ?? songMeta.pic
          musicCard.source = songMeta.source

          addSongsToRecommendHistory([songMeta])

          addTempPlayList([{ listId: LIST_IDS.PLAY_LATER, musicInfo: songMeta, isTop: true }])
          void playNext(true)
        }
      })()
    }

    const onSaveSetting = () => {
      generateAiGreeting()
      generateDynamicSuggestions()
      initEnvironment().catch(err => { console.error(err) })
    }

    const handleSendClick = () => {
      sendMessage().catch(err => { console.error(err) })
    }

    const handleRefreshClick = () => {
      refreshSuggestions().catch(err => { console.error(err) })
    }

    return {
      isSidebarOpen,
      mode,
      weatherType,
      city,
      currentWeather,
      currentDateStr,
      activeModelName,
      aiOpeningGreeting,
      suggestionChips,
      historyCategory,
      activeHistoryId,
      inputMessage,
      isGenerating,
      isPlayingMusic,
      showPlusMenu,
      showSettingModal,
      activeFeatureTag,
      currentHistoryList,
      messageList,
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
      handleSendClick,
      handleRefreshClick,
      toggleMusicPlay,
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

  &.chat.weather-sunny {
    background: linear-gradient(180deg, rgba(254, 249, 231, 0.15) 0%, var(--color-content-background) 100%);
  }

  &.chat.weather-night {
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.25) 0%, var(--color-content-background) 100%);
  }
}

/* 左侧 侧边栏 */
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

/* Landing View */
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

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    opacity: 0.9;
  }
}

.suggestionChips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  max-width: 100%;
}

.chip {
  padding: 6px 12px;
  border-radius: 16px;
  border: 1px solid var(--color-primary-light-400-alpha-500);
  background: var(--color-primary-light-900-alpha-300);
  color: var(--color-font);
  font-size: 11.5px;
  line-height: 1.3;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  max-width: none;
}

.musicCardList {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  width: 100%;
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
    white-space: pre-wrap;
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
  overflow: hidden;
}

.albumCoverImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
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

.recommendReason {
  font-size: 11.5px;
  color: var(--color-primary);
  margin-top: 3px;
  line-height: 1.35;
  background: var(--color-primary-light-900-alpha-200);
  padding: 4px 8px;
  border-radius: 6px;
  border-left: 2px solid var(--color-primary);
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
