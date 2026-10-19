import { onBeforeUnmount, watch } from '@common/utils/vueTools'
import { useI18n } from '@renderer/plugins/i18n'
import { setTitle } from '@renderer/utils'

import {
  getCurrentTime,
  onTimeupdate,
  getDuration,
  setPause, setStop,
} from '@renderer/plugins/player'

import useMediaSessionInfo from './useMediaSessionInfo'
import usePlayProgress from './usePlayProgress'
import usePlayEvent from './usePlayEvent'

import {
  musicInfo,
  playMusicInfo,
  playedList,
  isPlay,
} from '@renderer/store/player/state'
import { createListeningTracker } from '@renderer/utils/dj/listeningProfile'
import { recordPlayedSong } from '@renderer/utils/dj/userProfile'
import {
  setPlay,
  setAllStatus,
  addPlayedList,
  clearPlayedList,
  // resetPlayerMusicInfo,
} from '@renderer/store/player/action'

import { appSetting } from '@renderer/store/setting'

import useLyric from './useLyric'
import useVolume from './useVolume'
import useWatchList from './useWatchList'
import { HOTKEY_PLAYER } from '@common/hotKey'
import { playNext, pause, playPrev, togglePlay, collectMusic, uncollectMusic, dislikeMusic } from '@renderer/core/player'
import { notifyDjSongEnded } from '@renderer/core/player/djAudio'
import usePlaybackRate from './usePlaybackRate'
import useSoundEffect from './useSoundEffect'
import useMaxOutputChannelCount from './useMaxOutputChannelCount'
import { setPowerSaveBlocker } from '@renderer/core/player/utils'
import usePreloadNextMusic from './usePreloadNextMusic'


export default () => {
  const t = useI18n()
  let listeningSessionId = crypto.randomUUID()
  const listeningTracker = createListeningTracker((at) => {
    const item = playMusicInfo.musicInfo
    const track = item && 'progress' in item ? item.metadata.musicInfo : item
    if (!track) return
    try { recordPlayedSong(track.name, track.singer, { sessionId: listeningSessionId, at, track }) } catch (error) { console.error('保存收听偏好失败:', error) }
  })
  const resetListeningSession = () => {
    listeningSessionId = crypto.randomUUID()
    listeningTracker.reset()
  }
  const interruptListening = () => { listeningTracker.interrupt() }
  const removeListeningTimeupdate = onTimeupdate(() => {
    listeningTracker.tick(getCurrentTime(), getDuration(), isPlay.value)
  })
  window.app_event.on('setProgress', interruptListening)

  usePlayProgress()
  useMediaSessionInfo()
  usePlayEvent()
  useLyric()
  useVolume()
  useMaxOutputChannelCount()
  useSoundEffect()
  usePlaybackRate()
  useWatchList()
  usePreloadNextMusic()

  const handlePlayNext = () => {
    void playNext()
  }
  const handlePlayPrev = () => {
    void playPrev()
  }

  const addPowerSaveBlocker = () => {
    setPowerSaveBlocker(true)
  }
  const removePowerSaveBlocker = () => {
    interruptListening()
    setPowerSaveBlocker(false)
  }

  const setPlayStatus = () => {
    interruptListening()
    setPlay(true)
  }
  const setPauseStatus = () => {
    interruptListening()
    setPlay(false)
    if (window.lx.isPlayedStop) pause()
    removePowerSaveBlocker()
  }

  const handleUpdatePlayInfo = () => {
    resetListeningSession()
    setTitle(musicInfo.id ? `${musicInfo.name} - ${musicInfo.singer}` : null)
  }

  const handleCanplay = () => {
    if (window.lx.isPlayedStop) {
      setPause()
    }
  }
  const handleEnded = () => {
    // setTimeout(() => {
    listeningTracker.tick(getCurrentTime(), getDuration(), isPlay.value)
    resetListeningSession()
    setAllStatus(t('player__end'))
    if (window.lx.isPlayedStop) {
      console.log('played stop')
      return
    }
    // DJ 电台连播接管：若 DJ 回调消费了结束事件（推荐下一首），则不触发默认切歌
    if (notifyDjSongEnded()) return
    // resetPlayerMusicInfo()
    // window.app_event.stop()
    void playNext(true)
    // })
  }

  const setProgress = (time: number) => {
    window.app_event.setProgress(time)
  }
  const handleSeekforward = () => {
    const seekOffset = 5
    const curTime = getCurrentTime()
    const time = Math.min(getCurrentTime() + seekOffset, getDuration())
    if (Math.trunc(curTime) == Math.trunc(time)) return
    setProgress(time)
  }
  const handleSeekbackward = () => {
    const seekOffset = 5
    const curTime = getCurrentTime()
    const time = Math.max(getCurrentTime() - seekOffset, 0)
    if (Math.trunc(curTime) == Math.trunc(time)) return
    setProgress(time)
  }

  const setStopStatus = () => {
    resetListeningSession()
    setPlay(false)
    setTitle(null)
    setAllStatus('')
    setStop()
    removePowerSaveBlocker()
  }

  watch(() => appSetting['player.togglePlayMethod'], newValue => {
    // setLoopPlay(newValue == 'singleLoop')
    if (playedList.length) clearPlayedList()
    if (newValue == 'random' && playMusicInfo.musicInfo && !playMusicInfo.isTempPlay) addPlayedList({ ...(playMusicInfo as LX.Player.PlayMusicInfo) })
  })

  // setLoopPlay(appSetting['player.togglePlayMethod'] == 'singleLoop')


  window.key_event.on(HOTKEY_PLAYER.next.action, handlePlayNext)
  window.key_event.on(HOTKEY_PLAYER.prev.action, handlePlayPrev)
  window.key_event.on(HOTKEY_PLAYER.toggle_play.action, togglePlay)
  window.key_event.on(HOTKEY_PLAYER.music_love.action, collectMusic)
  window.key_event.on(HOTKEY_PLAYER.music_unlove.action, uncollectMusic)
  window.key_event.on(HOTKEY_PLAYER.music_dislike.action, dislikeMusic)
  window.key_event.on(HOTKEY_PLAYER.seekbackward.action, handleSeekbackward)
  window.key_event.on(HOTKEY_PLAYER.seekforward.action, handleSeekforward)

  window.app_event.on('play', setPlayStatus)
  window.app_event.on('pause', setPauseStatus)
  window.app_event.on('error', setPauseStatus)
  window.app_event.on('stop', setStopStatus)
  window.app_event.on('musicToggled', handleUpdatePlayInfo)
  window.app_event.on('playerCanplay', handleCanplay)
  window.app_event.on('playerPlaying', addPowerSaveBlocker)
  window.app_event.on('playerEmptied', removePowerSaveBlocker)

  window.app_event.on('playerEnded', handleEnded)


  onBeforeUnmount(() => {
    removeListeningTimeupdate()
    window.app_event.off('setProgress', interruptListening)
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    window.key_event.off(HOTKEY_PLAYER.next.action, handlePlayNext)
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    window.key_event.off(HOTKEY_PLAYER.prev.action, handlePlayPrev)
    window.key_event.off(HOTKEY_PLAYER.toggle_play.action, togglePlay)
    window.key_event.off(HOTKEY_PLAYER.music_love.action, collectMusic)
    window.key_event.off(HOTKEY_PLAYER.music_unlove.action, uncollectMusic)
    window.key_event.off(HOTKEY_PLAYER.music_dislike.action, dislikeMusic)
    window.key_event.off(HOTKEY_PLAYER.seekbackward.action, handleSeekbackward)
    window.key_event.off(HOTKEY_PLAYER.seekforward.action, handleSeekforward)


    window.app_event.off('play', setPlayStatus)
    window.app_event.off('pause', setPauseStatus)
    window.app_event.off('error', setPauseStatus)
    window.app_event.off('stop', setStopStatus)
    window.app_event.off('musicToggled', handleUpdatePlayInfo)
    window.app_event.off('playerPlaying', addPowerSaveBlocker)
    window.app_event.off('playerEmptied', removePowerSaveBlocker)
    window.app_event.off('playerCanplay', handleCanplay)

    window.app_event.off('playerEnded', handleEnded)
  })
}
