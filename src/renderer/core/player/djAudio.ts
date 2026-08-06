import { setVolume as setPlayerVolume } from '@renderer/plugins/player'
import { appSetting } from '@renderer/store/setting'
import { djSettings } from '@renderer/store/dj'
import { autoContinueRecommend } from '@renderer/composables/useDjChat'

let djAudioTrack: HTMLAudioElement | null = null
let fadeInterval: NodeJS.Timeout | null = null
let isDucking = false
let savedOriginalVolume = 1

const getDjAudioTrack = (): HTMLAudioElement => {
  if (!djAudioTrack) {
    djAudioTrack = new Audio()
    djAudioTrack.addEventListener('ended', onSpeechEnd)
    djAudioTrack.addEventListener('error', onSpeechEnd)
  }
  return djAudioTrack
}

const clearFadeInterval = () => {
  if (fadeInterval) {
    clearInterval(fadeInterval)
    fadeInterval = null
  }
}

/**
 * 平滑渐变修改主播放器音量
 */
const fadePlayerVolume = (targetVolume: number, durationMs = 400, onComplete?: () => void) => {
  clearFadeInterval()
  const startVolume = appSetting['player.volume'] ?? 1
  const steps = 15
  const stepTime = Math.max(10, Math.floor(durationMs / steps))
  const volumeDelta = (targetVolume - startVolume) / steps
  let currentStep = 0

  fadeInterval = setInterval(() => {
    currentStep++
    const newVol = Math.max(0, Math.min(1, startVolume + volumeDelta * currentStep))
    setPlayerVolume(newVol)

    if (currentStep >= steps) {
      clearFadeInterval()
      setPlayerVolume(targetVolume)
      onComplete?.()
    }
  }, stepTime)
}

/**
 * 语音播报结束，平滑恢复 Fade Up 主播放器音量
 */
const onSpeechEnd = () => {
  if (!isDucking) return

  fadePlayerVolume(savedOriginalVolume, 400, () => {
    isDucking = false
  })
}

/**
 * 获取最契合的发音人声音
 */
const getBestVoice = (lang = 'zh-CN', preferredVoice = ''): SpeechSynthesisVoice | null => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  if (preferredVoice) {
    const cleanVoiceName = preferredVoice.replace(/^zh-CN-/, '').replace(/Neural$/, '')
    const match = voices.find(v => v.name.includes(cleanVoiceName) || v.name.includes(preferredVoice))
    if (match) return match
  }

  const langMatch = voices.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(lang.toLowerCase()))
  if (langMatch) return langMatch

  const zhVoice = voices.find(v => v.lang.includes('zh') || v.name.includes('Chinese'))
  return zhVoice ?? voices[0] ?? null
}

/**
 * 使用原生 SpeechSynthesis 播报
 */
const speakWithWebSpeech = (text: string) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onSpeechEnd()
    return
  }

  try {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = djSettings.ttsLang || 'zh-CN'
    utterance.rate = 1.0
    utterance.pitch = 1.0

    const voice = getBestVoice(djSettings.ttsLang, djSettings.ttsVoice)
    if (voice) utterance.voice = voice

    utterance.onend = () => {
      onSpeechEnd()
    }
    utterance.onerror = (e) => {
      console.error('WebSpeech Synthesis 错误:', e)
      onSpeechEnd()
    }

    window.speechSynthesis.speak(utterance)
  } catch (err) {
    console.error('speakWithWebSpeech 抛出异常:', err)
    onSpeechEnd()
  }
}

/**
 * 播放 DJ TTS 语音串场并启动双轨降频闪避 (Audio Ducking)
 */
export const playDjSpeech = (audioSrc: string) => {
  stopDjSpeech()

  const startDuckingAndPlay = (playFn: () => void) => {
    if (!isDucking) {
      isDucking = true
      savedOriginalVolume = appSetting['player.volume'] ?? 1
      const duckTargetVolume = savedOriginalVolume * (djSettings.duckingVolume / 100)

      fadePlayerVolume(duckTargetVolume, 350, playFn)
    } else {
      playFn()
    }
  }

  // 1. 本地 SpeechSynthesis 协议
  if (audioSrc.startsWith('speech:')) {
    const text = decodeURIComponent(audioSrc.replace(/^speech:/, ''))
    startDuckingAndPlay(() => {
      speakWithWebSpeech(text)
    })
    return
  }

  // 2. 音频网络/Blob URL
  const audio = getDjAudioTrack()
  audio.src = audioSrc

  startDuckingAndPlay(() => {
    audio.play().catch((err) => {
      console.warn('Audio.play 失败，回退至 WebSpeech:', err)
      const cleanText = audioSrc.includes('audio=') ? decodeURIComponent(audioSrc.split('audio=')[1].split('&')[0]) : ''
      if (cleanText) {
        speakWithWebSpeech(cleanText)
      } else {
        onSpeechEnd()
      }
    })
  })
}

/**
 * 强制停止 DJ 播报并立刻恢复主音量
 */
export const stopDjSpeech = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }

  if (djAudioTrack) {
    djAudioTrack.pause()
    djAudioTrack.currentTime = 0
  }
  if (isDucking) {
    clearFadeInterval()
    setPlayerVolume(savedOriginalVolume)
    isDucking = false
  }
}

type SongEndCallback = () => boolean
const songEndCallbacks = new Set<SongEndCallback>()

// 模块级单例：DJ 自动连播执行器（不依赖组件实例，跨页面可用）
// 初始为 null，首次需要时延迟读取 autoContinueRecommend，避免模块循环依赖加载顺序问题
let djAutoContinueExecutor: (() => boolean) | null = null

/**
 * 注入 DJ 自动连播执行器（保留接口，默认使用 useDjChat 的模块级实现）
 */
export const setDjAutoContinueExecutor = (executor: (() => boolean) | null) => {
  djAutoContinueExecutor = executor
}

// 模块级单例：DJ 动作处理器（开放 API / 全局触发，由页面注入）
type DjActionHandler = (data: { action: string, keyword?: string }) => void
let djActionHandler: DjActionHandler | null = null

export const setDjActionHandler = (handler: DjActionHandler | null) => {
  djActionHandler = handler
}

export const notifyDjAction = (data: { action: string, keyword?: string }) => {
  try {
    djActionHandler?.(data)
  } catch (e) {
    console.error('DJ 动作处理失败:', e)
  }
}

/**
 * 注册 DJ 主动连续播报（一首播完自动推荐并连播下一首）监听器
 */
export const registerDjSongEndListener = (callback: SongEndCallback) => {
  songEndCallbacks.add(callback)
}

/**
 * 取消注册 DJ 歌曲结束监听器
 */
export const unregisterDjSongEndListener = (callback: SongEndCallback) => {
  songEndCallbacks.delete(callback)
}

/**
 * 触发 DJ 歌曲结束事件回调
 * @returns 是否被消费（任一回调返回 true 表示已接管播放，主播放器不应再自动切歌）
 */
export const notifyDjSongEnded = (): boolean => {
  let consumed = false
  // 优先使用模块级单例执行器（页面销毁后仍可用，不触发已卸载组件更新）
  const executor = djAutoContinueExecutor ?? autoContinueRecommend
  if (executor) {
    try {
      if (executor()) consumed = true
    } catch (e) {
      console.error('DJ 自动连播执行器异常:', e)
    }
  }
  songEndCallbacks.forEach(cb => {
    try {
      if (cb()) consumed = true
    } catch (e) {
      console.error('DJ 歌曲结束回调执行失败:', e)
    }
  })
  return consumed
}
