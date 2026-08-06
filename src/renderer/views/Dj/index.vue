<template>
  <div
    :class="[
      $style.chatGptLayout,
      $style[mode],
      $style['weather-' + weatherType]
    ]"
  >
    <!-- 左侧侧边栏 -->
    <div :class="[$style.sidebar, { [$style.sidebarCollapsed]: !isSidebarOpen }]">
      <div :class="$style.sidebarHeader">
        <button :class="$style.newChatBtn" @click="startNewChat">
          <span>+</span>
          <span v-if="isSidebarOpen">新建对话</span>
        </button>
      </div>

      <div v-if="isSidebarOpen" :class="$style.historyTabs">
        <button
          :class="[$style.historyTab, { [$style.activeHistoryTab]: historyCategory === 'dj' }]"
          @click="historyCategory = 'dj'"
        >📻 DJ 调频</button>
        <button
          :class="[$style.historyTab, { [$style.activeHistoryTab]: historyCategory === 'chat' }]"
          @click="historyCategory = 'chat'"
        >💬 聊天历史</button>
        <button
          :class="[$style.historyTab, { [$style.activeHistoryTab]: historyCategory === 'recommend' }]"
          @click="historyCategory = 'recommend'"
        >🎶 推荐点播</button>
      </div>

      <div v-if="isSidebarOpen" :class="$style.historyList" class="scroll">
        <div
          v-for="item in currentHistoryList"
          :key="item.id"
          :class="[$style.historyItem, { [$style.activeHistoryItem]: activeHistoryId === item.id }]"
          @click="onSelectHistory(item)"
        >
          <span :class="$style.itemIcon">{{ item.mode === 'dj' ? '📻' : '💬' }}</span>
          <div :class="$style.itemMeta">
            <span :class="$style.itemTitle">
              <span :class="[$style.modeBadge, $style['badge-' + item.mode]]">
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
              @click.stop="directPlay(item)"
            >▶</button>
            <button
              :class="$style.deleteItemBtn"
              title="删除记录"
              @click.stop="deleteHistory(item)"
            >🗑️</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧主交互区域 -->
    <div :class="$style.mainContent">
      <!-- 顶部工具栏 -->
      <div :class="$style.topBar">
        <div :class="$style.topBarLeft">
          <button
            :class="$style.sidebarToggleBtn"
            :title="isSidebarOpen ? '收起侧边栏' : '展开侧边栏'"
            @click="isSidebarOpen = !isSidebarOpen"
          >☰</button>
          <div :class="$style.activeModelBadge" title="当前生效的大模型">
            <span>🤖</span>
            <span>{{ activeModelName }}</span>
          </div>
        </div>

        <div :class="$style.topBarCenter">
          <div :class="$style.modeTogglePills">
            <button
              :class="[$style.pillBtn, { [$style.activePill]: mode === 'dj' }]"
              @click="switchMode('dj')"
            >🎧 DJ 模式</button>
            <button
              :class="[$style.pillBtn, { [$style.activePill]: mode === 'chat' }]"
              @click="switchMode('chat')"
            >💬 聊天模式</button>
          </div>
        </div>

        <div :class="$style.topBarRight">
          <button :class="$style.settingIconBtn" title="AI DJ 设置" @click="showSettingModal = true">
            ⚙️
          </button>
        </div>
      </div>

      <!-- 1. 居中新对话 Landing View -->
      <div v-if="!hasMessages" :class="$style.landingView">
        <div :class="$style.landingContainer">
          <h1 :class="$style.landingTitle">{{ aiOpeningGreeting }}</h1>

          <div :class="$style.centerWeatherBadge">
            <span>🌤️</span>
            <span>{{ currentDateStr }} | {{ city }}天气：<strong>{{ weatherDisplay }}</strong></span>
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
                <button :class="$style.plusBtn" title="附加功能" @click="showPlusMenu = !showPlusMenu">+</button>
                <transition name="fade">
                  <div v-if="showPlusMenu" :class="$style.plusDropdown" @mouseleave="showPlusMenu = false">
                    <button :class="$style.dropdownItem" @click="attachFeatureTag('search')">🔍 AI 聚合搜索</button>
                    <button :class="$style.dropdownItem" @click="attachFeatureTag('play')">🎵 快捷点歌</button>
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
              >{{ chipText }}</button>
              <button :class="[$style.chip, $style.refreshChip]" title="刷新推荐选项" @click="refreshSuggestions">🔄 换一换</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. 对话流视图 -->
      <div v-else :class="$style.streamBody" class="scroll">
        <div :class="$style.streamWeatherHeader">
          <span>🌤️ {{ currentDateStr }} | {{ city }}天气：{{ weatherDisplay }} | 当前模式：{{ mode === 'dj' ? '🎧 DJ 电台' : '💬 知心聊天' }}</span>
        </div>

        <div :class="$style.messagesStream">
          <div v-for="(msg, index) in messageList" :key="index" :class="[$style.messageRow, $style[msg.sender]]">
            <div :class="$style.avatar">{{ msg.sender === 'user' ? '👤' : (mode === 'dj' ? '📻' : '💬') }}</div>
            <div :class="$style.bubble">
              <div v-if="msg.sender === 'ai'" :class="$style.bubbleHeader">
                <span :class="[$style.bubbleTag, $style['tag-' + (mode === 'dj' ? 'dj' : 'chat')]]">
                  {{ mode === 'dj' ? '🎧 AI 电台' : '💬 AI 助手' }}
                </span>
                <span v-if="isGenerating && index === messageList.length - 1" :class="$style.typingHint">正在思考...</span>
              </div>
              <p>{{ msg.text }}</p>

              <!-- 音乐推荐卡片（单首纵向 / 多首横向滑动适配） -->
              <div v-if="msg.musicCards && msg.musicCards.length" :class="[$style.musicCardList, { [$style.musicCardListMulti]: msg.musicCards.length > 1 }]">
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
                  <button :class="$style.playBtn" @click="toggleMusicPlay(card)">▶ 播放</button>
                </div>
              </div>

              <button :class="$style.deleteMsgBtn" title="删除此条消息" @click="deleteMessage(index)">🗑️</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部固定输入框 -->
      <div v-if="hasMessages" :class="$style.bottomInputArea">
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
            <button :class="$style.plusBtn" title="附加功能" @click="showPlusMenu = !showPlusMenu">+</button>
            <transition name="fade">
              <div v-if="showPlusMenu" :class="$style.plusDropdown" @mouseleave="showPlusMenu = false">
                <button :class="$style.dropdownItem" @click="attachFeatureTag('search')">🔍 AI 聚合搜索</button>
                <button :class="$style.dropdownItem" @click="attachFeatureTag('play')">🎵 快捷点歌</button>
              </div>
            </transition>
          </div>
          <button :class="$style.sendCircleBtn" :disabled="isGenerating" @click="handleSendClick">
            {{ isGenerating ? '⌛' : '↑' }}
          </button>
        </div>
      </div>
    </div>

    <DjSettingModal v-model:visible="showSettingModal" @save="onSaveSetting" />
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from '@common/utils/vueTools'
import DjSettingModal from './components/DjSettingModal.vue'
import { djSettings } from '@renderer/store/dj'
import { fetchDynamicSuggestions } from '@renderer/utils/dj/llmService'
import { stopDjSpeech, setDjActionHandler } from '@renderer/core/player/djAudio'
import { onDjAction } from '@renderer/utils/ipc'
import { useDjChat, setDjMode, setDjPageActive } from '@renderer/composables/useDjChat'
import { useDjHistory } from '@renderer/composables/useDjHistory'
import { useDjWeather } from '@renderer/composables/useDjWeather'
import { generateGreeting } from '@renderer/utils/dj/templateEngine'
import { analyzeUserProfile } from '@renderer/utils/dj/userProfile'
import { dialog } from '@renderer/plugins/Dialog'

export default {
  name: 'DjChatGPTIntegratedView',
  components: { DjSettingModal },
  setup() {
    const isSidebarOpen = ref(true)
    const mode = ref('dj')
    const showSettingModal = ref(false)
    const currentDateStr = ref('')
    const aiOpeningGreeting = ref('')
    const suggestionChips = ref([])
    let removeDjActionListener = null

    // 使用 composables
    const chat = useDjChat()
    const history = useDjHistory()
    const weather = useDjWeather()

    const {
      messageList,
      inputMessage,
      isGenerating,
      isPlayingMusic,
      hasMessages,
      activeFeatureTag,
      showPlusMenu,
      sendMessage: chatSendMessage,
      toggleMusicPlay: chatToggleMusicPlay,
      deleteMessage: chatDeleteMessage,
      clearMessages,
      attachFeatureTag: chatAttachFeatureTag,
      preloadMusicCardCovers,
    } = chat

    const {
      historyCategory,
      activeHistoryId,
      currentHistoryList,
      saveCurrentSession,
      addSongsToRecommend,
      selectHistory,
      directPlay: historyDirectPlay,
      deleteHistory: rawDeleteHistory,
      startNewChat: historyStartNewChat,
    } = history

    const {
      weatherType,
      weatherDisplay,
      refreshWeather,
    } = weather

    const city = computed(() => djSettings.city || '北京')
    const activeModelName = computed(() => {
      return djSettings.activeModel || djSettings.selectedModel || '未配置'
    })

    // 自动刷新天气
    const initEnvironment = async() => {
      await refreshWeather()
      analyzeUserProfile()
    }

    const generateAiGreeting = () => {
      aiOpeningGreeting.value = generateGreeting(mode.value, weatherDisplay.value)
    }

    const generateDynamicSuggestions = () => {
      if (hasMessages.value) return
      void refreshSuggestions()
    }

    const refreshSuggestions = async() => {
      if (hasMessages.value || isGenerating.value) return
      suggestionChips.value = ['正在思考推荐...']
      const chips = await fetchDynamicSuggestions(weatherDisplay.value, mode.value)
      suggestionChips.value = chips
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

    // 处理开放 API 的 DJ 动作（推荐 / 点歌 / 切歌等）
    const handleDjAction = (data) => {
      const action = data?.action
      const keyword = data?.keyword ?? ''
      if (action === 'play' && keyword) {
        // 指定关键词点歌
        inputMessage.value = keyword
        handleSendClick()
        return
      }
      // 默认 recommend / continue：触发一次推荐
      if (mode.value !== 'dj') switchMode('dj')
      handleSendClick({ silent: true, query: keyword ? `推荐 ${keyword} 相关的歌曲` : '请推荐一首好听的歌' })
    }

    onMounted(() => {
      updateCurrentTime()
      void initEnvironment()
      preloadMusicCardCovers(messageList.value)
      // 标记 DJ 页面活跃，仅在进入本页面且模式为 dj 时才允许自动连播
      setDjPageActive(true)
      setDjMode(mode.value)
      setDjActionHandler(handleDjAction)
      // 监听开放 API 触发的 DJ 动作
      removeDjActionListener = onDjAction(({ params }) => {
        handleDjAction(params)
      })

      setInterval(() => {
        updateCurrentTime()
      }, 60000)
    })

    onUnmounted(() => {
      stopDjSpeech()
      // 离开页面标记为非活跃，避免未使用 DJ 时也触发自动连播
      setDjPageActive(false)
      setDjActionHandler(null)
      removeDjActionListener?.()
    })

    // 切换模式
    const switchMode = (newMode) => {
      if (newMode === mode.value) return
      stopDjSpeech()
      mode.value = newMode
      setDjMode(newMode)
      // 切换模式时开始新对话
      historyStartNewChat()
      clearMessages()
      generateAiGreeting()
      generateDynamicSuggestions()
    }

    // 新对话
    const startNewChat = () => {
      stopDjSpeech()
      historyStartNewChat()
      clearMessages()
      generateAiGreeting()
    }

    // 删除历史记录（带确认；若删除的是当前会话则回到新对话）
    const deleteHistory = async(item) => {
      const confirm = await dialog.confirm({
        message: `确定删除「${item.title}」这条记录吗？`,
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      })
      if (!confirm) return
      rawDeleteHistory(item)
      if (activeHistoryId.value === item.id) {
        startNewChat()
      }
    }

    // 选择历史记录
    const onSelectHistory = (item) => {
      if (item.type === 'recommend') {
        historyDirectPlay(item, (card) => {
          chatToggleMusicPlay(card).catch(err => { console.error(err) })
        })
        return
      }
      const messages = selectHistory(item)
      if (messages) {
        messageList.value = messages
        preloadMusicCardCovers(messageList.value)
      }
      if (item.mode) {
        mode.value = item.mode
        setDjMode(item.mode)
      }
    }

    // 播放音乐卡片（包装：播放后加入推荐历史）
    const toggleMusicPlay = async(card) => {
      await chatToggleMusicPlay(card)
      if (card?.name) {
        addSongsToRecommend([card])
      }
    }

    // 发送消息（包装，自动保存历史）
    const handleSendClick = (options) => {
      void chatSendMessage(
        mode.value,
        weatherDisplay.value,
        weatherType.value,
        () => {
          saveCurrentSession(messageList.value, mode.value)
        },
        options,
      )
    }

    // 应用建议标签
    const applySuggestion = (text) => {
      inputMessage.value = text
      handleSendClick()
    }

    // 删除消息
    const deleteMessage = (index) => {
      chatDeleteMessage(index)
      saveCurrentSession(messageList.value, mode.value)
    }

    // 附加功能标签
    const attachFeatureTag = (type) => {
      chatAttachFeatureTag(type)
    }

    // 设置保存
    const onSaveSetting = () => {
      generateAiGreeting()
      generateDynamicSuggestions()
      void initEnvironment()
    }

    return {
      isSidebarOpen,
      mode,
      showSettingModal,
      currentDateStr,
      aiOpeningGreeting,
      suggestionChips,
      city,
      activeModelName,
      weatherType,
      weatherDisplay,
      messageList,
      inputMessage,
      isGenerating,
      isPlayingMusic,
      hasMessages,
      activeFeatureTag,
      showPlusMenu,
      historyCategory,
      activeHistoryId,
      currentHistoryList,
      switchMode,
      startNewChat,
      onSelectHistory,
      deleteHistory,
      handleSendClick,
      refreshSuggestions,
      applySuggestion,
      toggleMusicPlay,
      deleteMessage,
      attachFeatureTag,
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

/* 左侧侧边栏 */
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

    .historyTabs, .historyList { display: none; }
  }
}

.sidebarHeader { padding: 12px; }

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
    .itemActions { opacity: 1; }
  }

  &.activeHistoryItem {
    background: var(--color-primary-light-700-alpha-500);
  }
}

.itemIcon { font-size: 13px; }

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

  &.badge-dj { background: #9333ea; }
  &.badge-chat { background: var(--color-primary); }
}

.itemDate { font-size: 10.5px; color: var(--color-font-label); }

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

  &:hover { opacity: 0.9; }
}

.deleteItemBtn {
  border: none;
  background: transparent;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;

  &:hover { background: var(--color-primary-light-700-alpha-600); }
}

/* 右侧主界面 */
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

  strong { color: var(--color-primary); }
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

.plusMenuContainer { position: relative; }

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

  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:hover:not(:disabled) { opacity: 0.9; }
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

  /* 多首推荐：横向滑动展示，避免把气泡撑得很高 */
  &.musicCardListMulti {
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: 4px;
    scroll-snap-type: x mandatory;

    .musicCard {
      flex: none;
      width: 220px;
      scroll-snap-align: start;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .vinylContainer {
      width: 100%;
      height: 44px;
    }

    .playBtn {
      align-self: stretch;
    }
  }
}

/* 对话流视图 */
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

  &:hover .deleteMsgBtn { opacity: 1; }
}

.bubbleHeader {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.bubbleTag {
  display: inline-block;
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 8px;
  color: #fff;

  &.tag-dj { background: #9333ea; }
  &.tag-chat { background: var(--color-primary); }
}

.typingHint {
  font-size: 11px;
  color: var(--color-font-label);
  animation: blinkHint 1.2s ease-in-out infinite;
}

@keyframes blinkHint {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
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

  &.spinning { animation: spinVinyl 3s linear infinite; }
}

.vinylCenterLabel {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-primary);
}

@keyframes spinVinyl {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.musicMeta { flex: 1; }

.songTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
}

.artist { font-size: 12px; color: var(--color-font-label); }

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

  &:hover { opacity: 0.9; }
}

.bottomInputArea {
  padding: 12px 40px 20px 40px;
  background: transparent;
  max-width: 760px;
  margin: 0 auto;
  width: 100%;
}
</style>
