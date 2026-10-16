import { djSettings } from '@renderer/store/dj'
import { djRequest } from './serviceBridge'
export type TtsEngine = 'web-speech' | 'youdao-tts' | 'openai-tts' | 'azure-tts' | 'iflytek-tts' | 'volcengine-tts' | 'custom-tts'

export const cleanTextForSpeech = (text: string): string => text
  .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
  .replace(/\[.*?\]/g, '').replace(/[#*`_~]/g, '').replace(/\s+/g, ' ').trim()

export const synthesizeSpeech = async(text: string, options: { signal?: AbortSignal } = {}): Promise<string> => {
  const clean = cleanTextForSpeech(text).slice(0, 1200)
  if (!clean) throw new Error('TTS 转换文本为空')
  if (options.signal?.aborted) throw Object.assign(new Error('已取消语音播报'), { name: 'AbortError' })
  if (djSettings.ttsEngine === 'web-speech') return `speech:${encodeURIComponent(clean)}`
  const result = await djRequest<{ url?: string, audio?: Uint8Array, mime?: string }>('tts', { settings: djSettings, text: clean }, options.signal)
  if (result.audio) return URL.createObjectURL(new Blob([new Uint8Array(result.audio).buffer], { type: result.mime ?? 'audio/mpeg' }))
  return result.url ?? `speech:${encodeURIComponent(clean)}`
}
