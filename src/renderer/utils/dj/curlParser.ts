export interface ParsedCurlResult {
  baseUrl: string
  apiKey: string
  modelName: string
  headers: Record<string, string>
  rawBody: string
}

/**
 * 解析标准与自定义 cURL 命令字符串
 */
export const parseCurlCommand = (curlStr: string): ParsedCurlResult => {
  const result: ParsedCurlResult = {
    baseUrl: '',
    apiKey: '',
    modelName: '',
    headers: {},
    rawBody: '',
  }

  if (!curlStr?.trim()) return result

  const cleanCurl = curlStr.replace(/\\\n/g, ' ').replace(/\\\r\n/g, ' ')

  // 1. 匹配 URL
  const urlMatch = cleanCurl.match(/curl\s+(?:-[A-Za-z0-9]+\s+)*['"]?([^'"]\S+)/i) ?? cleanCurl.match(/(https?:\/\/[^\s'"]+)/i)
  if (urlMatch?.[1]) {
    const fullUrl = urlMatch[1].trim()
    if (fullUrl.endsWith('/chat/completions')) {
      result.baseUrl = fullUrl.replace(/\/chat\/completions$/, '/')
    } else {
      result.baseUrl = fullUrl
    }
  }

  // 2. 匹配 Headers (如 -H "Authorization: Bearer xxx")
  const headerRegex = /-H\s+['"]([^'"]+)['"]/gi
  let match: RegExpExecArray | null
  while ((match = headerRegex.exec(cleanCurl)) !== null) {
    const headerLine = match[1]
    const colonIndex = headerLine.indexOf(':')
    if (colonIndex > -1) {
      const key = headerLine.slice(0, colonIndex).trim()
      const value = headerLine.slice(colonIndex + 1).trim()
      result.headers[key] = value

      if (key.toLowerCase() === 'authorization') {
        const bearerMatch = value.match(/Bearer\s+(.+)/i)
        if (bearerMatch?.[1]) {
          result.apiKey = bearerMatch[1].trim()
        }
      }
    }
  }

  // 3. 匹配 -d 或 --data / --data-raw JSON payload
  const bodyMatch = cleanCurl.match(/(?:--data-raw|--data|-d)\s+['"]?(\{[\s\S]*?\})['"]?(?=\s+-[HhA-Za-z]|\s*$)/) ??
    cleanCurl.match(/(\{[\s\S]*"model"[\s\S]*\})/)

  if (bodyMatch?.[1]) {
    result.rawBody = bodyMatch[1].trim()
    try {
      const parsedBody = JSON.parse(result.rawBody)
      if (parsedBody.model) {
        result.modelName = String(parsedBody.model)
      }
    } catch {
      const modelRegexMatch = result.rawBody.match(/"model"\s*:\s*"([^"]+)"/)
      if (modelRegexMatch?.[1]) {
        result.modelName = modelRegexMatch[1]
      }
    }
  }

  return result
}
