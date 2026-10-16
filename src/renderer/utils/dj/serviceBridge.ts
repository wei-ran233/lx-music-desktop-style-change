import { ipcRenderer } from 'electron'
import { DJ_IPC } from '@common/dj/ipc'

export async function djRequest<T>(operation: string, payload: unknown, signal?: AbortSignal, onEvent?: (event: any) => void): Promise<T> {
  if (signal?.aborted) throw Object.assign(new Error('请求已取消'), { name: 'AbortError' })
  const id = crypto.randomUUID()
  const abort = () => { ipcRenderer.send(DJ_IPC.cancel, id) }
  const receive = (_: unknown, requestId: string, event: unknown) => { if (requestId === id) onEvent?.(event) }
  signal?.addEventListener('abort', abort, { once: true })
  if (onEvent) ipcRenderer.on(DJ_IPC.event, receive)
  try {
    const result = await ipcRenderer.invoke(DJ_IPC.request, { id, operation, payload: JSON.parse(JSON.stringify(payload)) })
    if (signal?.aborted) throw Object.assign(new Error('请求已取消'), { name: 'AbortError' })
    if (result.error) throw Object.assign(new Error(result.error.message), { name: result.error.name })
    return result.value as T
  } finally {
    signal?.removeEventListener('abort', abort)
    if (onEvent) ipcRenderer.off(DJ_IPC.event, receive)
  }
}

export async function storeDjCredentials<T>(settings: T): Promise<{ settings: T, storage: string }> {
  return ipcRenderer.invoke(DJ_IPC.credentials, JSON.parse(JSON.stringify(settings)))
}
