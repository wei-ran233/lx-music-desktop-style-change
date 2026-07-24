import { djSettings } from '@renderer/store/dj'

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

/**
 * 将文本转为 TTS 语音 URL 或 speech: 格式
 */
export const synthesizeSpeech = async(text: string): Promise<string> => {
  const engine = djSettings.ttsEngine || 'edge-tts'
  const voice = djSettings.ttsVoice || 'zh-CN-XiaoxiaoNeural'
  const cleanText = cleanTextForSpeech(text)

  if (!cleanText) {
    throw new Error('TTS 转换文本为空')
  }

  // 1. Edge-TTS 引擎处理（优先使用浏览器/Chromium原生 SpeechSynthesis）
  if (engine === 'edge-tts') {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return `speech:${encodeURIComponent(cleanText)}`
    }
    const encodedText = encodeURIComponent(cleanText.slice(0, 100))
    return `https://dict.youdao.com/dictvoice?audio=${encodedText}&le=zh`
  }

  // 2. OpenAI TTS 引擎 (tts-1)
  if (engine === 'openai-tts') {
    const apiKey = djSettings.ttsApiKey || djSettings.apiKey
    if (!apiKey) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        return `speech:${encodeURIComponent(cleanText)}`
      }
    }
    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: cleanText,
          voice: 'alloy',
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI TTS 失败 Status Code: ${response.status}`)
      }

      const blob = await response.blob()
      return URL.createObjectURL(blob)
    } catch (err) {
      console.warn('OpenAI TTS 请求失败，自动降级到本地语音:', err)
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        return `speech:${encodeURIComponent(cleanText)}`
      }
      throw err
    }
  }

  // 3. 自定义 WebAPI
  if (engine === 'custom-tts' && djSettings.ttsCustomUrl) {
    try {
      const response = await fetch(djSettings.ttsCustomUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${djSettings.ttsApiKey}`,
        },
        body: JSON.stringify({
          text: cleanText,
          voice,
          lang: djSettings.ttsLang,
        }),
      })

      if (!response.ok) {
        throw new Error(`自定义 TTS 失败 Status Code: ${response.status}`)
      }

      const blob = await response.blob()
      return URL.createObjectURL(blob)
    } catch (err) {
      console.warn('自定义 TTS 请求失败，自动降级到本地语音:', err)
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        return `speech:${encodeURIComponent(cleanText)}`
      }
      throw err
    }
  }

  // Fallback 默认
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return `speech:${encodeURIComponent(cleanText)}`
  }
  const encodedText = encodeURIComponent(cleanText.slice(0, 100))
  return `https://dict.youdao.com/dictvoice?audio=${encodedText}&le=zh`
}
