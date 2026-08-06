/**
 * TTS 语音播报服务 — 多渠道实现
 *
 * 支持渠道：
 * 1. web-speech    浏览器原生 SpeechSynthesis（免 Key，最基础）
 * 2. youdao-tts    有道翻译语音（免 Key，备用）
 * 3. openai-tts    OpenAI TTS API
 * 4. azure-tts     微软 Azure 神经语音 REST API
 * 5. iflytek-tts   科大讯飞 WebSocket 签名鉴权
 * 6. volcengine-tts 火山引擎 TTS HTTP API
 * 7. custom-tts    自定义 URL POST
 *
 * 每个渠道失败时自动降级到 web-speech（无需 Key）
 */

import { djSettings } from '@renderer/store/dj'

export type TtsEngine =
  | 'web-speech'
  | 'youdao-tts'
  | 'openai-tts'
  | 'azure-tts'
  | 'iflytek-tts'
  | 'volcengine-tts'
  | 'custom-tts'

/**
 * 清理文本，去除 Emoji、Markdown 标记与方括号标签
 */
export const cleanTextForSpeech = (text: string): string => {
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    .replace(/\[.*?\]/g, '')
    .replace(/[#*`_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 是否有浏览器原生语音 */
const hasWebSpeech = (): boolean => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** 返回 Web Speech 协议地址（由 djAudio 处理） */
const toSpeechProtocol = (text: string): string => {
  return `speech:${encodeURIComponent(text)}`
}

/** 生成有道翻译语音地址 */
const toYoudaoUrl = (text: string): string => {
  const encodedText = encodeURIComponent(text.slice(0, 100))
  return `https://dict.youdao.com/dictvoice?audio=${encodedText}&le=zh`
}

/** 获取 blob URL */
const blobToUrl = (blob: Blob): string => URL.createObjectURL(blob)

/** 降级到 Web Speech 或你有道 */
const fallbackSpeech = (text: string): string => {
  return hasWebSpeech() ? toSpeechProtocol(text) : toYoudaoUrl(text)
}

// ─── 各渠道实现 ──────────────────────────────────────────

/** 1. OpenAI TTS */
const synthesizeOpenAI = async(text: string): Promise<string | null> => {
  const apiKey = djSettings.ttsApiKey || djSettings.apiKey
  if (!apiKey) return null

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: 'alloy',
    }),
  })

  if (!response.ok) throw new Error(`OpenAI TTS Status ${response.status}`)
  return blobToUrl(await response.blob())
}

/** 2. Azure 神经语音 REST API */
const synthesizeAzure = async(text: string, voice: string): Promise<string | null> => {
  const apiKey = djSettings.ttsApiKey || djSettings.apiKey
  const region = djSettings.ttsRegion || 'eastasia'
  if (!apiKey) return null

  const lang = djSettings.ttsLang || 'zh-CN'
  const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`

  const ssml = [
    `<speak version='1.0' xml:lang='${lang}'>`,
    `<voice name='${voice || 'zh-CN-XiaoxiaoNeural'}'>`,
    text,
    '</voice>',
    '</speak>',
  ].join('')

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
      'Ocp-Apim-Subscription-Key': apiKey,
      'User-Agent': 'lx-music-desktop',
    },
    body: ssml,
  })

  if (!response.ok) throw new Error(`Azure TTS Status ${response.status}`)
  return blobToUrl(await response.blob())
}

/** HMAC-SHA256 签名（用于讯飞鉴权） */
const hmacSha256 = async(key: string, message: string): Promise<ArrayBuffer> => {
  const enc = new TextEncoder()
  const keyData = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return crypto.subtle.sign('HMAC', keyData, enc.encode(message))
}

/** 3. 讯飞 WebSocket TTS */
const synthesizeIflytek = async(text: string, voice: string): Promise<string | null> => {
  const appId = djSettings.ttsAppId
  const apiKey = djSettings.ttsApiKey
  const apiSecret = djSettings.ttsCustomUrl // 复用 customUrl 存 ApiSecret
  if (!appId || !apiKey || !apiSecret) return null

  const host = 'tts-api.xfyun.cn'
  const date = new Date().toUTCString()
  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/tts HTTP/1.1`
  const signature = await hmacSha256(apiSecret, signatureOrigin).then(buf =>
    btoa(String.fromCharCode(...new Uint8Array(buf))),
  )
  const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`
  const authorization = btoa(authorizationOrigin)

  const url = `wss://${host}/v2/tts?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${host}`

  return new Promise((resolve, reject) => {
    let ws: WebSocket
    try {
      ws = new WebSocket(url)
    } catch (err) {
      reject(err)
      return
    }

    const audioChunks: Uint8Array[] = []
    let settled = false

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        try { ws.close() } catch { /* ignore */ }
        reject(new Error('讯飞 TTS 超时'))
      }
    }, 15000)

    ws.onopen = () => {
      ws.send(JSON.stringify({
        common: { app_id: appId },
        business: {
          aue: 'lame',
          sfl: 1,
          auf: 'audio/L16;rate=16000',
          vcn: voice || 'xiaoyan',
          speed: Math.round(djSettings.ttsSpeed * 50),
        },
        data: {
          status: 2,
          text: btoa(unescape(encodeURIComponent(text))),
        },
      }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.code !== 0) {
          settled = true
          clearTimeout(timer)
          reject(new Error(`讯飞 TTS 错误: ${data.message || data.code}`))
          ws.close()
          return
        }
        if (data.data?.audio) {
          const binStr = atob(data.data.audio)
          const bytes = new Uint8Array(binStr.length)
          for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i)
          audioChunks.push(bytes)
        }
        if (data.data?.status === 2) {
          settled = true
          clearTimeout(timer)
          ws.close()
          const merged = new Uint8Array(audioChunks.reduce((sum, c) => sum + c.length, 0))
          let offset = 0
          for (const chunk of audioChunks) {
            merged.set(chunk, offset)
            offset += chunk.length
          }
          const blob = new Blob([merged], { type: 'audio/mpeg' })
          resolve(blobToUrl(blob))
        }
      } catch (err) {
        settled = true
        clearTimeout(timer)
        reject(err)
        ws.close()
      }
    }

    ws.onerror = () => {
      settled = true
      clearTimeout(timer)
      reject(new Error('讯飞 TTS 连接失败'))
    }

    ws.onclose = () => {
      clearTimeout(timer)
    }
  })
}

/** 4. 火山引擎 TTS HTTP API */
const synthesizeVolcengine = async(text: string, voice: string): Promise<string | null> => {
  const appId = djSettings.ttsAppId
  const accessToken = djSettings.ttsApiKey
  if (!appId || !accessToken) return null

  const endpoint = 'https://openspeech.bytedance.com/api/v1/tts'
  const cluster = 'volcano_tts'

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer;${accessToken}`,
    },
    body: JSON.stringify({
      app: { appid: appId, token: 'access_token', cluster },
      user: { uid: 'lx-music' },
      audio: { voice_type: voice || 'BV001_streaming', encoding: 'mp3', speed_ratio: djSettings.ttsSpeed },
      request: { reqid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text, operation: 'query' },
    }),
  })

  if (!response.ok) throw new Error(`火山 TTS Status ${response.status}`)
  const data = await response.json()

  if (data.code !== 3000 || !data.data?.audio) {
    throw new Error(`火山 TTS 返回异常: ${data.message || data.code}`)
  }

  const binStr = atob(data.data.audio)
  const bytes = new Uint8Array(binStr.length)
  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i)
  return blobToUrl(new Blob([bytes], { type: 'audio/mpeg' }))
}

/** 5. 自定义 WebAPI */
const synthesizeCustom = async(text: string): Promise<string | null> => {
  if (!djSettings.ttsCustomUrl) return null
  const response = await fetch(djSettings.ttsCustomUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${djSettings.ttsApiKey}`,
    },
    body: JSON.stringify({
      text,
      voice: djSettings.ttsVoice,
      lang: djSettings.ttsLang,
      speed: djSettings.ttsSpeed,
      pitch: djSettings.ttsPitch,
    }),
  })

  if (!response.ok) throw new Error(`自定义 TTS Status ${response.status}`)
  return blobToUrl(await response.blob())
}

// ─── 主入口 ──────────────────────────────────────────────

/**
 * 将文本转为 TTS 语音 URL 或 speech: 格式
 * 返回的字符串由 playDjSpeech 消费
 */
export const synthesizeSpeech = async(text: string): Promise<string> => {
  const engine: TtsEngine = djSettings.ttsEngine || 'web-speech'
  const voice = djSettings.ttsVoice || 'zh-CN-XiaoxiaoNeural'
  const cleanText = cleanTextForSpeech(text)

  if (!cleanText) {
    throw new Error('TTS 转换文本为空')
  }

  try {
    let url: string | null = null

    switch (engine) {
      case 'web-speech':
        return fallbackSpeech(cleanText)

      case 'youdao-tts':
        return toYoudaoUrl(cleanText)

      case 'openai-tts':
        url = await synthesizeOpenAI(cleanText)
        break

      case 'azure-tts':
        url = await synthesizeAzure(cleanText, voice)
        break

      case 'iflytek-tts':
        url = await synthesizeIflytek(cleanText, voice)
        break

      case 'volcengine-tts':
        url = await synthesizeVolcengine(cleanText, voice)
        break

      case 'custom-tts':
        url = await synthesizeCustom(cleanText)
        break
    }

    if (url) return url
  } catch (err) {
    console.warn(`[TTS] ${engine} 失败，降级到 Web Speech:`, err)
  }

  return fallbackSpeech(cleanText)
}
