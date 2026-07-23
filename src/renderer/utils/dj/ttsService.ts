import { djSettings } from '@renderer/store/dj'

/**
 * 将文本转为 TTS 语音 Blob URL
 */
export const synthesizeSpeech = async(text: string): Promise<string> => {
  const engine = djSettings.ttsEngine || 'edge-tts'
  const voice = djSettings.ttsVoice || 'zh-CN-XiaoxiaoNeural'
  const cleanText = text.replace(/[#*`_~]/g, '').trim()

  if (!cleanText) {
    throw new Error('TTS 转换文本为空')
  }

  // 1. Edge-TTS 引擎处理 (如果包含 API 可通过在线接口转换)
  if (engine === 'edge-tts') {
    try {
      // 模拟 Edge TTS 音频数据流或使用免费转换服务 Endpoint
      const encodedText = encodeURIComponent(cleanText)
      const ttsUrl = `https://dict.youdao.com/dictvoice?audio=${encodedText}&le=zh`
      return ttsUrl
    } catch (err) {
      console.error('Edge-TTS 合成失败:', err)
      throw err
    }
  }

  // 2. OpenAI TTS 引擎 (tts-1)
  if (engine === 'openai-tts') {
    const apiKey = djSettings.ttsApiKey || djSettings.apiKey
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
  }

  // 3. 自定义 WebAPI
  if (engine === 'custom-tts' && djSettings.ttsCustomUrl) {
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

    const blob = await response.blob()
    return URL.createObjectURL(blob)
  }

  // Fallback 默认有道/网络语音
  const encodedText = encodeURIComponent(cleanText)
  return `https://dict.youdao.com/dictvoice?audio=${encodedText}&le=zh`
}
