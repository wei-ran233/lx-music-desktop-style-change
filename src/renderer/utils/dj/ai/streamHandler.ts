import { validateToolCall, type Context, type Tool } from '@earendil-works/pi-ai'
import { DJ_TOOLS } from './tools'
import { resolveActiveModel } from './modelsManager'
import { executeToolAction, type ToolExecutionContext } from './toolExecutor'
import type { DjMode, StreamCallbacks, ToolCall, WeatherType } from '@renderer/utils/dj/types'

export interface AiConversationOptions {
  mode: DjMode
  weatherStr: string
  weatherType: WeatherType
  systemPrompt: string
  messages: Array<{ role: 'user' | 'assistant', content: string }>
  callbacks: StreamCallbacks
  signal?: AbortSignal
  onFoundMusicCard?: (card: any) => void
}

/**
 * 运行基于 @earendil-works/pi-ai 的全流程 Agent 对话与工具调用闭环
 */
export async function runPiAiConversation(options: AiConversationOptions): Promise<void> {
  const { mode, weatherType, systemPrompt, messages, callbacks, signal, onFoundMusicCard } = options
  const { models, model, apiKey } = resolveActiveModel()

  // 构造标准 pi-ai 格式的初始上下文
  const contextMessages: any[] = messages.map(m => ({
    role: m.role,
    content: [{ type: 'text', text: m.content }],
    timestamp: Date.now(),
  }))

  const context: Context = {
    systemPrompt,
    messages: contextMessages,
    tools: DJ_TOOLS,
  }

  const toolExecCtx: ToolExecutionContext = {
    mode,
    weatherType,
    onFoundMusicCard,
  }

  let accumulatedText = ''
  let accumulatedThinking = ''
  let lastExecutedToolCall: ToolCall | undefined
  const MAX_AGENT_TURNS = 3
  let turn = 0

  while (turn < MAX_AGENT_TURNS) {
    if (signal?.aborted) {
      const abortErr = new Error('请求已取消')
      abortErr.name = 'AbortError'
      throw abortErr
    }
    turn++

    const stream = models.stream(model, context, {
      apiKey: apiKey || undefined,
      signal,
    })

    for await (const event of stream) {
      if (signal?.aborted) break

      switch (event.type) {
        case 'text_delta':
          accumulatedText += event.delta
          callbacks.onToken(event.delta)
          break

        case 'thinking_delta':
          accumulatedThinking += event.delta
          callbacks.onThinkingDelta?.(event.delta)
          break

        case 'thinking_end':
          callbacks.onThinkingEnd?.()
          break

        case 'toolcall_end':
          // 捕获到了一个完整工具调用
          lastExecutedToolCall = {
            name: event.toolCall.name,
            arguments: event.toolCall.arguments || {},
          }
          await callbacks.onToolCall?.(lastExecutedToolCall)
          break

        case 'error':
          throw new Error(event.error.errorMessage || 'AI 生成异常')
      }
    }

    if (signal?.aborted) break

    const finalMessage = await stream.result()
    context.messages.push(finalMessage)

    // 检查模型回复中是否触发了工具调用
    const toolCalls = finalMessage.content.filter(b => b.type === 'toolCall')
    if (!toolCalls || toolCalls.length === 0) {
      // 无工具调用，本轮对话自然完成
      break
    }

    // 执行所有触发的工具，并将结果作为 toolResult 回填上下文
    for (const call of toolCalls) {
      let resultText = ''
      let isError = false
      try {
        const validatedArgs = validateToolCall(context.tools as Tool[], call)
        const execResult = await executeToolAction(call.name, validatedArgs, toolExecCtx)
        resultText = JSON.stringify(execResult)
      } catch (toolErr: any) {
        console.warn(`[StreamHandler] 工具 ${call.name} 执行失败:`, toolErr)
        resultText = JSON.stringify({ error: toolErr.message || '执行失败' })
        isError = true
      }

      context.messages.push({
        role: 'toolResult',
        toolCallId: call.id,
        toolName: call.name,
        content: [{ type: 'text', text: resultText }],
        isError,
        timestamp: Date.now(),
      })
    }
    // 循环继续，进入下一轮让模型根据工具执行结果生成总结/串词
  }

  await callbacks.onComplete(accumulatedText, lastExecutedToolCall)
}
