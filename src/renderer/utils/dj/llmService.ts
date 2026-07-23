import { djSettings } from '@renderer/store/dj'

export interface ToolCall {
  name: string
  arguments: Record<string, any>
}

export interface StreamCallbacks {
  onToken: (token: string) => void
  onToolCall?: (toolCall: ToolCall) => void
  onComplete: (fullText: string, toolCall?: ToolCall) => void
  onError: (error: Error) => void
}

const AVAILABLE_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_and_play',
      description: '在 LX 音乐库中搜索并切歌点播符合场景或意图的歌曲',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: '搜索关键词，如歌名或歌手' },
          singer: { type: 'string', description: '歌手名称' },
          genre: { type: 'string', description: '音乐风格类型' },
          reason: { type: 'string', description: '推歌理由与场景匹配说明' },
        },
        required: ['keyword'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'play_favorite',
      description: '从用户的“我的喜爱”歌单中挑选合适曲目播放',
      parameters: {
        type: 'object',
        properties: {
          tag: { type: 'string', description: '匹配的情绪或风格标签' },
        },
      },
    },
  },
]

/**
 * 构建系统提示词 System Prompt (融合当前模式、城市、天气、气温与时间)
 */
export const buildSystemPrompt = (mode: 'dj' | 'chat', weatherStr = '晴 22°C'): string => {
  const now = new Date()
  const timePeriod = now.getHours() < 11 ? '早晨' : (now.getHours() < 18 ? '下午' : '夜晚')
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${timePeriod}`
  const city = djSettings.city || '北京'

  let promptBody = ''
  if (mode === 'dj') {
    promptBody = `
${djSettings.djPromptRole}
【当前环境】城市：${city} | 日期时间：${dateStr} | 天气：${weatherStr}
【开场规范】${djSettings.djPromptOpening}
【选歌逻辑】${djSettings.djPromptSelection}
【串词推荐】${djSettings.djPromptRecommendation}
【用户学习】${djSettings.djPromptProfileLearning}
    `.trim()
  } else {
    promptBody = `
${djSettings.chatPromptRole}
【当前环境】城市：${city} | 日期时间：${dateStr} | 天气：${weatherStr}
【开场关怀】${djSettings.chatPromptOpening}
【情绪推歌】${djSettings.chatPromptSelection}
【乐评交流】${djSettings.chatPromptRecommendation}
【情感画像】${djSettings.chatPromptProfileLearning}
    `.trim()
  }

  return promptBody
}

/**
 * 发起 LLM SSE 流式对话请求
 */
export const sendLlmStreamMessage = async(
  messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>,
  mode: 'dj' | 'chat',
  weatherStr: string,
  callbacks: StreamCallbacks,
) => {
  const systemPrompt = buildSystemPrompt(mode, weatherStr)
  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  const modelName = djSettings.activeModel || 'glm-4-flash'
  const baseUrl = djSettings.baseUrl.endsWith('/') ? djSettings.baseUrl : `${djSettings.baseUrl}/`
  const endpoint = `${baseUrl}chat/completions`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${djSettings.apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: fullMessages,
        stream: true,
        tools: AVAILABLE_TOOLS,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`LLM API 响应错误 Status Code: ${response.status}`)
    }

    if (!response.body) {
      throw new Error('未收到 ReadableStream 数据')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let accumulatedText = ''
    let detectedToolCall: ToolCall | undefined
    let rawToolCallArgs = ''
    let toolCallName = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'))

      for (const line of lines) {
        const jsonStr = line.replace(/^data:\s*/, '').trim()
        if (jsonStr === '[DONE]') break

        try {
          const parsed = JSON.parse(jsonStr)
          const delta = parsed.choices?.[0]?.delta

          if (delta?.content) {
            accumulatedText += delta.content
            callbacks.onToken(delta.content)
          }

          // Tool Call 函数回调解析
          if (delta?.tool_calls?.[0]) {
            const tc = delta.tool_calls[0]
            if (tc.function?.name) toolCallName = tc.function.name
            if (tc.function?.arguments) rawToolCallArgs += tc.function.arguments
          }
        } catch {
          // ignore single chunk parse error
        }
      }
    }

    if (toolCallName) {
      try {
        const parsedArgs = JSON.parse(rawToolCallArgs)
        detectedToolCall = { name: toolCallName, arguments: parsedArgs }
        callbacks.onToolCall?.(detectedToolCall)
      } catch (e) {
        console.error('解析 Tool Call 参数失败:', e)
      }
    }

    callbacks.onComplete(accumulatedText, detectedToolCall)
  } catch (err: any) {
    console.error('LLM SSE 服务异常:', err)
    callbacks.onError(err)
  }
}
