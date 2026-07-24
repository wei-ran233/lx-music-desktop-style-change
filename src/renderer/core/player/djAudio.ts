import { setVolume as setPlayerVolume } from '@renderer/plugins/player'
import { appSetting } from '@renderer/store/setting'
import { djSettings } from '@renderer/store/dj'

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

type SongEndCallback = () => void
const songEndCallbacks = new Set<SongEndCallback>()

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
 */
export const notifyDjSongEnded = () => {
  songEndCallbacks.forEach(cb => {
    try {
      cb()
    } catch (e) {
      console.error('DJ 歌曲结束回调执行失败:', e)
    }
  })
}
