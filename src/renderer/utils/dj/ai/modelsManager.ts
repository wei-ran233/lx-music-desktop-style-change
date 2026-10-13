import { createModels, createProvider, type Model, type MutableModels } from '@earendil-works/pi-ai'
import { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy'
import { openaiProvider } from '@earendil-works/pi-ai/providers/openai'
import { deepseekProvider } from '@earendil-works/pi-ai/providers/deepseek'
import { anthropicProvider } from '@earendil-works/pi-ai/providers/anthropic'
import { googleProvider } from '@earendil-works/pi-ai/providers/google'
import { groqProvider } from '@earendil-works/pi-ai/providers/groq'
import { openrouterProvider } from '@earendil-works/pi-ai/providers/openrouter'
import { djSettings } from '@renderer/store/dj'

let cachedModelsCollection: MutableModels | null = null

export function getModelsCollection(): MutableModels {
  if (!cachedModelsCollection) {
    cachedModelsCollection = createModels()
    cachedModelsCollection.setProvider(openaiProvider())
    cachedModelsCollection.setProvider(deepseekProvider())
    cachedModelsCollection.setProvider(anthropicProvider())
    cachedModelsCollection.setProvider(googleProvider())
    cachedModelsCollection.setProvider(groqProvider())
    cachedModelsCollection.setProvider(openrouterProvider())
  }
  return cachedModelsCollection
}

export interface ActiveModelResolution {
  models: MutableModels
  model: Model<any>
  apiKey?: string
}

/**
 * 根据当前 djSettings 与参数解析目标 Provider 和 Model 实例
 */
export function resolveActiveModel(): ActiveModelResolution {
  const collection = getModelsCollection()
  const selected = djSettings.selectedModel || 'openai-compatible'
  const userApiKey = djSettings.apiKey?.trim() || ''

  // 1. 本地 Ollama 引擎
  if (selected === 'ollama' || selected === 'local-ollama') {
    const host = (djSettings.localAiHost || 'http://127.0.0.1:11434').replace(/\/+$/, '')
    const baseUrl = `${host}/v1`
    const modelId = djSettings.localAiModel || djSettings.customModelName || 'qwen2.5:7b'
    const providerId = 'local-ollama'

    const provider = createProvider({
      id: providerId,
      name: 'Ollama 本地引擎',
      baseUrl,
      auth: {
        apiKey: {
          name: 'Ollama 本地认证',
          resolve: async() => ({ auth: { apiKey: userApiKey || 'ollama' }, source: 'local' }),
        },
      },
      models: [
        {
          id: modelId,
          name: `Ollama (${modelId})`,
          api: 'openai-completions',
          provider: providerId,
          baseUrl,
          contextWindow: 32768,
          maxTokens: 4096,
          reasoning: true,
          input: ['text'],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        },
      ],
      api: openAICompletionsApi(),
    })
    collection.setProvider(provider)
    const model = collection.getModel(providerId, modelId)!
    return { models: collection, model, apiKey: userApiKey || 'ollama' }
  }

  // 2. 本地 LM Studio 引擎
  if (selected === 'lmstudio' || selected === 'local-lmstudio') {
    const host = (djSettings.localAiHost || 'http://127.0.0.1:1234').replace(/\/+$/, '')
    const baseUrl = `${host}/v1`
    const modelId = djSettings.localAiModel || djSettings.customModelName || 'default'
    const providerId = 'local-lmstudio'

    const provider = createProvider({
      id: providerId,
      name: 'LM Studio 本地引擎',
      baseUrl,
      auth: {
        apiKey: {
          name: 'LM Studio 本地认证',
          resolve: async() => ({ auth: { apiKey: userApiKey || 'lm-studio' }, source: 'local' }),
        },
      },
      models: [
        {
          id: modelId,
          name: `LM Studio (${modelId})`,
          api: 'openai-completions',
          provider: providerId,
          baseUrl,
          contextWindow: 32768,
          maxTokens: 4096,
          reasoning: true,
          input: ['text'],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        },
      ],
      api: openAICompletionsApi(),
    })
    collection.setProvider(provider)
    const model = collection.getModel(providerId, modelId)!
    return { models: collection, model, apiKey: userApiKey || 'lm-studio' }
  }

  // 3. DeepSeek 原生 Provider
  if (selected === 'deepseek') {
    const modelId = djSettings.customModelName || 'deepseek-chat'
    const model = collection.getModel('deepseek', modelId) || {
      id: modelId,
      name: modelId,
      api: 'openai-completions',
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      contextWindow: 65536,
      maxTokens: 8192,
      reasoning: modelId.includes('reasoner') || modelId.includes('r1'),
      input: ['text'],
      cost: { input: 0.00014, output: 0.00028, cacheRead: 0.000014, cacheWrite: 0.00014 },
    } as Model<any>
    return { models: collection, model, apiKey: userApiKey }
  }

  // 4. 通用 OpenAI-compatible 或 自定义 BaseUrl 模式
  let rawBaseUrl = djSettings.baseUrl?.trim() || ''
  if (!rawBaseUrl) {
    if (selected === 'glm-4.7-flash' || selected === 'glm-4-flash') {
      rawBaseUrl = 'https://open.bigmodel.cn/api/paas/v4'
    } else if (selected === 'qwen-turbo' || selected === 'qwen-plus') {
      rawBaseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    } else {
      rawBaseUrl = 'https://api.openai.com/v1'
    }
  }
  const cleanBaseUrl = rawBaseUrl.replace(/\/+$/, '')
  const modelId = djSettings.customModelName?.trim() || djSettings.activeModel || (selected.startsWith('glm') ? 'glm-4-flash' : selected.startsWith('qwen') ? 'qwen-turbo' : 'gpt-4o-mini')
  const providerId = 'custom-openai-compat'

  const customProvider = createProvider({
    id: providerId,
    name: 'OpenAI-Compatible Provider',
    baseUrl: cleanBaseUrl,
    auth: {
      apiKey: {
        name: 'Custom API Key',
        resolve: async() => ({ auth: { apiKey: userApiKey }, source: 'custom' }),
      },
    },
    models: [
      {
        id: modelId,
        name: modelId,
        api: 'openai-completions',
        provider: providerId,
        baseUrl: cleanBaseUrl,
        contextWindow: 32768,
        maxTokens: 4096,
        reasoning: modelId.includes('r1') || modelId.includes('reason') || modelId.includes('o1') || modelId.includes('o3'),
        input: ['text'],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      },
    ],
    api: openAICompletionsApi(),
  })
  collection.setProvider(customProvider)
  const model = collection.getModel(providerId, modelId)!
  return { models: collection, model, apiKey: userApiKey }
}
