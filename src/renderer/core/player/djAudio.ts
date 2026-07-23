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
 * 播放 DJ TTS 语音串场并启动双轨降频闪避 (Audio Ducking)
 */
export const playDjSpeech = (audioSrc: string) => {
  const audio = getDjAudioTrack()
  audio.src = audioSrc

  if (!isDucking) {
    isDucking = true
    savedOriginalVolume = appSetting['player.volume'] ?? 1
    const duckTargetVolume = savedOriginalVolume * (djSettings.duckingVolume / 100)

    // 主播放器音量平滑渐隐 Fade Down
    fadePlayerVolume(duckTargetVolume, 350, () => {
      void audio.play()
    })
  } else {
    void audio.play()
  }
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
 * 强制停止 DJ 播报并立刻恢复主音量
 */
export const stopDjSpeech = () => {
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
