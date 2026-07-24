import { onBeforeUnmount, watch } from '@common/utils/vueTools'
import {
  onUpdateAvailable,
  onUpdateDownloaded,
  onUpdateError,
  onUpdateNotAvailable,
  onUpdateProgress,
} from '@renderer/utils/ipc'
import { isShowChangeLog, versionInfo } from '@renderer/store'

export default () => {
  versionInfo.showModal = false
  versionInfo.isLatest = true
  versionInfo.isUnknown = false
  versionInfo.status = 'idle'
  isShowChangeLog.value = false

  const rUpdateAvailable = onUpdateAvailable(() => {})
  const rUpdateNotAvailable = onUpdateNotAvailable(() => {})
  const rUpdateError = onUpdateError(() => {})
  const rUpdateProgress = onUpdateProgress(() => {})
  const rUpdateDownloaded = onUpdateDownloaded(() => {})

  watch(() => versionInfo.showModal, (visible) => {
    if (visible) {
      versionInfo.showModal = false
    }
  })

  onBeforeUnmount(() => {
    rUpdateAvailable()
    rUpdateNotAvailable()
    rUpdateError()
    rUpdateProgress()
    rUpdateDownloaded()
  })
}
