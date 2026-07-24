import { djSettings } from '@renderer/store/dj'
import { getUserProfilePromptString } from '@renderer/utils/dj/userProfile'

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

let activeRequestsCount = 0
const requestQueue: Array<() => void> = []

const acquireConcurrencyToken = async(): Promise<void> => {
  const limit = Math.max(1, djSettings.concurrencyLimit || 3)
  if (activeRequestsCount < limit) {
    activeRequestsCount++
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    requestQueue.push(() => {
      activeRequestsCount++
      resolve()
    })
  })
}

const releaseConcurrencyToken = () => {
  activeRequestsCount = Math.max(0, activeRequestsCount - 1)
  if (requestQueue.length > 0) {
    const nextTask = requestQueue.shift()
    if (nextTask) nextTask()
  }
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
 * 构建系统提示词 System Prompt (融合当前模式、城市、天气、气温与用户偏好画像)
 */
export const buildSystemPrompt = (mode: 'dj' | 'chat', weatherStr = '晴 22°C'): string => {
  const now = new Date()
  const timePeriod = now.getHours() < 11 ? '早晨' : (now.getHours() < 18 ? '下午' : '夜晚')
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${timePeriod}`
  const city = djSettings.city || '北京'
  const profilePrompt = getUserProfilePromptString()

  let promptBody = ''
  if (mode === 'dj') {
    promptBody = `
${djSettings.djPromptRole}
【当前环境】城市：${city} | 日期时间：${dateStr} | 天气：${weatherStr}
${profilePrompt}
【开场规范】${djSettings.djPromptOpening}
【选歌逻辑】${djSettings.djPromptSelection}
【串词推荐】${djSettings.djPromptRecommendation}
【用户学习】${djSettings.djPromptProfileLearning}
    `.trim()
  } else {
    promptBody = `
${djSettings.chatPromptRole}
【当前环境】城市：${city} | 日期时间：${dateStr} | 天气：${weatherStr}
${profilePrompt}
【开场关怀】${djSettings.chatPromptOpening}
【情绪推歌】${djSettings.chatPromptSelection}
【乐评交流】${djSettings.chatPromptRecommendation}
【情感画像】${djSettings.chatPromptProfileLearning}
    `.trim()
  }

  const jsonInstruction = `
【音乐推荐与推荐理由规范】（非常重要）
1. 根据用户的指令与对话需求，你可以推荐 1 首或多首（如 2-4 首）真实的歌曲。
2. 推荐时，请在对话文本中为每一首歌曲写出**简短精炼、具象化且富有说服力的推荐理由**（例如歌曲的情绪契合点、音色特点或创作背景）。
3. 在回复文本中，请务必用《歌曲名》格式标记推荐的每一首歌曲。
4. 如果你在回复中推荐了歌曲，请在回复的末尾加上 JSON 数据，格式如下：
\`\`\`json
{"recommend_musics": [{"name": "歌曲名1", "singer": "歌手名1", "reason": "推荐理由1"}, {"name": "歌曲名2", "singer": "歌手名2", "reason": "推荐理由2"}]}
\`\`\`
`.trim()

  return promptBody + '\n\n' + jsonInstruction
}

/**
 * 发起 LLM SSE 流式对话请求（含并发队列控制）
 */
export const sendLlmStreamMessage = async(
  messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>,
  mode: 'dj' | 'chat',
  weatherStr: string,
  callbacks: StreamCallbacks,
) => {
  await acquireConcurrencyToken()
  try {
    const systemPrompt = buildSystemPrompt(mode, weatherStr)
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ]

    let modelName = djSettings.activeModel || 'glm-4.7-flash'
    const baseUrl = djSettings.baseUrl.endsWith('/') ? djSettings.baseUrl : `${djSettings.baseUrl}/`
    const endpoint = `${baseUrl}chat/completions`

    let response: Response | null = null
    let maxRetries = 3
    let attempt = 0

    while (attempt < maxRetries) {
      response = await fetch(endpoint, {
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

      if (response.status === 429) {
        attempt++
        if (attempt < maxRetries) {
          const jitter = Math.floor(Math.random() * 300)
          const delayMs = Math.pow(2, attempt) * 1000 + jitter
          console.warn(`收到 429 Rate Limit，触发第 ${attempt} 次指数退避重试 (等待 ${delayMs}ms)...`)
          await new Promise(resolve => setTimeout(resolve, delayMs))
          continue
        } else if (modelName !== 'glm-4-flash') {
          console.warn('多次 429 频控重试失败，自动降级至备用模型: glm-4-flash')
          modelName = 'glm-4-flash'
          attempt = 0
          maxRetries = 2
          continue
        }
      }
      break
    }

    if (!response || !response.ok) {
      throw new Error(`LLM API 响应错误 Status Code: ${response?.status ?? 'Unknown'}`)
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
  } finally {
    releaseConcurrencyToken()
  }
}

/**
 * 动态获取大模型的随机推荐提问（场景化，限短字符，含并发队列控制）
 */
export const fetchDynamicSuggestionsFromLLM = async(weatherStr: string, mode: 'dj' | 'chat'): Promise<string[]> => {
  await acquireConcurrencyToken()
  try {
    const modelName = djSettings.activeModel || 'glm-4-flash'
    const baseUrl = djSettings.baseUrl.endsWith('/') ? djSettings.baseUrl : `${djSettings.baseUrl}/`
    const endpoint = `${baseUrl}chat/completions`

    const prompt = `你是一个助手。请根据当前的模式（${mode === 'dj' ? '电台DJ' : '知心聊天'}）、天气情况（${weatherStr}）以及当前日期时间（${new Date().toLocaleString()}），随机生成 4 个适合用户在聊天框发送的简短提问或点歌指令（每条指令控制在 12 个字以内，非常简短），必须以 JSON 数组格式返回（只返回数组本身，如 ["指令1", "指令2", "指令3", "指令4"]，不要有任何多余的文本）。`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${djSettings.apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9, // 稍微高一点增加随机性
      }),
    })

    if (!response.ok) return []
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // 尝试解析 JSON 数组
    const match = content.match(/\[(.*)\]/s)
    if (match) {
      const arr = JSON.parse(`[${match[1]}]`)
      if (Array.isArray(arr) && arr.length >= 4) {
        return arr.slice(0, 4)
      }
    }
    return []
  } catch (err) {
    console.error('获取动态推荐提问失败:', err)
    return []
  }
}
