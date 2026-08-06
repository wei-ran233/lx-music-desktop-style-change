/**
 * LLM 服务重构
 *
 * 核心改进：
 * 1. 令牌桶限流器（Token Bucket）— 可配置速率 + 突发容量
 * 2. OpenAI 兼容接口优先 — 支持任意 baseUrl + modelName
 * 3. 自动降级 — LLM 失败 → 本地模板引擎
 * 4. 缓存层 — 对可预测内容进行内存缓存
 */

import { djSettings } from '@renderer/store/dj'
import { getUserProfilePromptString } from '@renderer/utils/dj/userProfile'
import { buildDjIntroText, generateSuggestChips, generateChatRecommendation } from './templateEngine'
import type { DjMode, ToolCall, StreamCallbacks } from './types'

// ─── 令牌桶限流器 ───────────────────────────────────────

class TokenBucket {
  private tokens: number
  private lastRefill: number
  private readonly maxTokens: number
  private readonly refillRate: number // tokens per second

  constructor(maxTokens: number, refillRate: number) {
    this.maxTokens = maxTokens
    this.refillRate = refillRate
    this.tokens = maxTokens
    this.lastRefill = Date.now()
  }

  private refill() {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate)
    this.lastRefill = now
  }

  /** 尝试获取一个令牌，返回是否成功 */
  tryAcquire(): boolean {
    this.refill()
    if (this.tokens >= 1) {
      this.tokens -= 1
      return true
    }
    return false
  }

  /** 等待直到获取到令牌 */
  async acquire(): Promise<void> {
    while (!this.tryAcquire()) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
}

// 全局令牌桶：默认 3 req/s 突发 5
const globalBucket = new TokenBucket(5, 3)

// 模型预设信息
interface ModelInfo {
  id: string
  name: string
  defaultBaseUrl: string
  defaultModel: string
  rateLimit: { maxTokens: number, refillRate: number }
}

const MODEL_PRESETS: ModelInfo[] = [
  {
    id: 'openai-compatible',
    name: 'OpenAI 兼容接口（通用）',
    defaultBaseUrl: '',
    defaultModel: '',
    rateLimit: { maxTokens: 10, refillRate: 5 },
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com/',
    defaultModel: 'deepseek-chat',
    rateLimit: { maxTokens: 10, refillRate: 5 },
  },
  {
    id: 'glm-4.7-flash',
    name: '智谱 GLM-4.7-Flash',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
    defaultModel: 'glm-4.7-flash',
    rateLimit: { maxTokens: 3, refillRate: 1 },
  },
  {
    id: 'glm-4-flash',
    name: '智谱 GLM-4-Flash',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
    defaultModel: 'glm-4-flash',
    rateLimit: { maxTokens: 3, refillRate: 1 },
  },
  {
    id: 'qwen-turbo',
    name: '阿里通义千问 Qwen-Turbo',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/',
    defaultModel: 'qwen-turbo',
    rateLimit: { maxTokens: 10, refillRate: 5 },
  },
  {
    id: 'qwen-plus',
    name: '阿里通义千问 Qwen-Plus',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/',
    defaultModel: 'qwen-plus',
    rateLimit: { maxTokens: 10, refillRate: 5 },
  },
]

export const getModelPresets = () => MODEL_PRESETS

// ─── 缓存层 ─────────────────────────────────────────────

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

class MemoryCache {
  private readonly store = new Map<string, CacheEntry<any>>()
  private readonly defaultTtlMs = 5 * 60 * 1000 // 5 分钟

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.data as T
  }

  set<T>(key: string, data: T, ttlMs?: number) {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    })
  }

  clear() {
    this.store.clear()
  }
}

const cache = new MemoryCache()

/**
 * 从 LLM 返回的 tool call arguments 字符串中健壮地提取 JSON 对象
 * 兼容：前/后有空白、附加文本、多个对象拼接等异常情况
 */
const extractJsonObject = (raw: string): Record<string, any> | null => {
  if (!raw) return null
  const trimmed = raw.trim()

  // 1. 直接尝试完整解析
  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch { /* continue */ }

  // 2. 提取第一个 { 到最后一个 } 之间的内容再解析
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start > -1 && end > start) {
    const candidate = trimmed.slice(start, end + 1)
    try {
      const parsed = JSON.parse(candidate)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    } catch { /* continue */ }
  }

  // 3. 尝试多对象拼接（如 "{"a":1}{"b":2}"），取最后一个合法对象
  const re = /\{[^{}]*\}/g
  const matches = trimmed.match(re)
  if (matches) {
    for (let i = matches.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(matches[i])
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
      } catch { /* continue */ }
    }
  }

  return null
}

// ─── 系统 Prompt 构建 ───────────────────────────────────

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
      description: '从用户的"我的喜爱"歌单中挑选合适曲目播放',
      parameters: {
        type: 'object',
        properties: {
          tag: { type: 'string', description: '匹配的情绪或风格标签' },
        },
      },
    },
  },
]

export const buildSystemPrompt = (mode: DjMode, weatherStr = '晴 22°C'): string => {
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
2. 推荐时，请在对话文本中为每一首歌曲写出**简短精炼、具象化且富有说服力的推荐理由**。
3. 在回复文本中，请务必用《歌曲名》格式标记推荐的每一首歌曲。
4. 如果你在回复中推荐了歌曲，请在回复的末尾加上 JSON 数据，格式如下：
\`\`\`json
{"recommend_musics": [{"name": "歌曲名1", "singer": "歌手名1", "reason": "推荐理由1"}, {"name": "歌曲名2", "singer": "歌手名2", "reason": "推荐理由2"}]}
\`\`\`
`.trim()

  return promptBody + '\n\n' + jsonInstruction
}

// ─── LLM 流式请求 ───────────────────────────────────────

/**
 * 发送 LLM SSE 流式对话请求（含令牌桶限流 + 自动降级）
 *
 * 当 LLM 请求失败或未配置 API Key 时，自动降级到本地模板引擎
 */
export const sendLlmStreamMessage = async(
  messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>,
  mode: DjMode,
  weatherStr: string,
  callbacks: StreamCallbacks,
) => {
  // 未配置 API Key → 直接使用模板引擎降级
  if (!djSettings.apiKey) {
    fallbackToTemplate(messages, mode, weatherStr, callbacks)
    return
  }

  await globalBucket.acquire()
  try {
    const systemPrompt = buildSystemPrompt(mode, weatherStr)
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ]

    const modelName = djSettings.activeModel || 'gpt-4o-mini'
    let baseUrl = djSettings.baseUrl
    if (!baseUrl) {
      // 尝试从预设中查找
      const preset = MODEL_PRESETS.find(p => p.id === djSettings.selectedModel)
      baseUrl = preset?.defaultBaseUrl ?? ''
    }
    baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    const endpoint = `${baseUrl}chat/completions`

    let response: Response | null = null
    let maxRetries = 2
    let attempt = 0

    while (attempt <= maxRetries) {
      try {
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
          signal: AbortSignal.timeout(30000), // 30s 超时
        })

        if (response.status === 429) {
          attempt++
          if (attempt <= maxRetries) {
            const delayMs = Math.pow(2, attempt) * 1000
            console.warn(`[LLM] 429 Rate Limit, 第 ${attempt} 次重试 (等待 ${delayMs}ms)...`)
            await new Promise(resolve => setTimeout(resolve, delayMs))
            continue
          }
          // 超过重试次数 → 降级
          console.warn('[LLM] 429 重试耗尽，降级到模板引擎')
          fallbackToTemplate(messages, mode, weatherStr, callbacks)
          return
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        break
      } catch (err: any) {
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
          console.warn('[LLM] 请求超时，降级到模板引擎')
          fallbackToTemplate(messages, mode, weatherStr, callbacks)
          return
        }
        attempt++
        if (attempt > maxRetries) {
          console.warn('[LLM] 请求失败，降级到模板引擎:', err.message)
          fallbackToTemplate(messages, mode, weatherStr, callbacks)
          return
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }

    if (!response?.body) {
      fallbackToTemplate(messages, mode, weatherStr, callbacks)
      return
    }

    // 正常流式读取
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
      const parsedArgs = extractJsonObject(rawToolCallArgs)
      if (parsedArgs) {
        detectedToolCall = { name: toolCallName, arguments: parsedArgs }
        callbacks.onToolCall?.(detectedToolCall)
      } else {
        console.warn('[LLM] 解析 Tool Call 参数失败，忽略:', rawToolCallArgs)
      }
    }

    callbacks.onComplete(accumulatedText, detectedToolCall)
  } catch (err: any) {
    console.error('[LLM] 服务异常，降级到模板引擎:', err)
    fallbackToTemplate(messages, mode, weatherStr, callbacks)
  }
}

// ─── 降级方案：本地模板引擎 ─────────────────────────────

const fallbackToTemplate = (
  messages: Array<{ role: string, content: string }>,
  mode: DjMode,
  weatherStr: string,
  callbacks: StreamCallbacks,
) => {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
  const query = lastUserMsg?.content ?? ''

  // 模拟打字机效果
  let fullText = ''

  if (mode === 'dj') {
    const intro = buildDjIntroText(mode, weatherStr)
    // 简单解析用户输入，匹配歌曲推荐
    const genreMatch = query.match(/摇滚|r&b|爵士|古典|民谣|流行|电子|轻音乐|纯音乐|治愈/)
    const moodMatch = query.match(/开心|难过|治愈|放松|励志|伤感|安静|活力/)

    fullText = `${intro.fullText} `

    if (genreMatch) {
      fullText += `你提到想听${genreMatch[0]}风格的音乐，让我为你挑选一首合适的歌曲。`
    } else if (moodMatch) {
      fullText += '感受到你现在的情绪，让我用音乐来回应你的心情。'
    } else {
      fullText += '根据当前的环境和氛围，为你推荐一首好听的歌。'
    }
  } else {
    fullText = generateChatRecommendation(query, '晴天', '周杰伦')
  }

  // 拆分为字符模拟打字机
  const chars = fullText.split('')
  let idx = 0

  const typeNext = () => {
    if (idx < chars.length) {
      const chunk = chars.slice(idx, idx + 3).join('')
      idx += 3
      callbacks.onToken(chunk)
      setTimeout(typeNext, 30)
    } else {
      callbacks.onComplete(fullText)
    }
  }

  typeNext()
}

// ─── 动态建议标签 ───────────────────────────────────────

/**
 * 获取建议标签（优先缓存，LLM 失败时降级到模板引擎）
 */
export const fetchDynamicSuggestions = async(weatherStr: string, mode: DjMode): Promise<string[]> => {
  const cacheKey = `suggestions_${mode}_${weatherStr}`

  // 检查缓存
  const cached = cache.get<string[]>(cacheKey)
  if (cached) return cached

  // 未配置 API Key → 直接使用模板引擎
  if (!djSettings.apiKey) {
    const chips = generateSuggestChips(mode, weatherStr)
    cache.set(cacheKey, chips, 2 * 60 * 1000) // 2 分钟缓存
    return chips
  }

  // 尝试 LLM 获取
  try {
    await globalBucket.acquire()
    const modelName = djSettings.activeModel || 'gpt-4o-mini'
    const baseUrl = djSettings.baseUrl.endsWith('/') ? djSettings.baseUrl : `${djSettings.baseUrl}/`
    const endpoint = `${baseUrl}chat/completions`

    const prompt = `你是一个助手。请根据当前的模式（${mode === 'dj' ? '电台DJ' : '知心聊天'}）、天气情况（${weatherStr}）以及当前日期时间（${new Date().toLocaleString()}），随机生成 4 个适合用户在聊天框发送的简短提问或点歌指令（每条指令控制在 12 个字以内），必须以 JSON 数组格式返回（只返回数组本身，如 ["指令1", "指令2", "指令3", "指令4"]，不要有任何多余的文本）。`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${djSettings.apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    const match = content.match(/\[(.*)\]/s)
    if (match) {
      const arr = JSON.parse(`[${match[1]}]`)
      if (Array.isArray(arr) && arr.length >= 4) {
        const result = arr.slice(0, 4)
        cache.set(cacheKey, result, 5 * 60 * 1000)
        return result
      }
    }
  } catch (err) {
    console.warn('[LLM] 获取动态建议失败，使用模板引擎降级:', err)
  }

  // 降级
  const chips = generateSuggestChips(mode, weatherStr)
  cache.set(cacheKey, chips, 2 * 60 * 1000)
  return chips
}

/**
 * 清除缓存
 */
export const clearLlmCache = () => { cache.clear() }
