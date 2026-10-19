import type { DjVoice } from './voices'

export interface VoiceTable { section: string, rows: string[][] }

export const sanitizeVoiceList = (input: unknown): DjVoice[] => {
  if (!Array.isArray(input)) return []
  const seen = new Set<string>()
  return input.filter((voice): voice is DjVoice => {
    if (!voice || typeof voice.id !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{5,159}$/.test(voice.id) ||
      typeof voice.name !== 'string' || !voice.name.trim() || voice.name.length > 120 || typeof voice.language !== 'string' || seen.has(voice.id)) return false
    seen.add(voice.id)
    return true
  }).slice(0, 1000).map(({ id, name, language }) => ({ id, name: name.trim(), language: language.slice(0, 160) }))
}

/** Parse public document tables as data, preserving row-spanned category columns. */
export const parseVolcengineVoiceTables = (tables: VoiceTable[]): DjVoice[] => {
  const matched = tables.filter(table => /语音合成(?:模型)?\s*2\.0/.test(table.section))
  // Older document layouts have no semantic headings; their first voice table is TTS 2.0.
  const selected = matched.length ? matched : tables.filter(table => table.rows[0]?.some(cell => /voice_type|音色\s*ID/i.test(cell))).slice(0, 1)
  const voices: DjVoice[] = []
  for (const table of selected) {
    for (const sourceRow of table.rows.slice(1)) {
      const row = sourceRow.map(cell => cell.replace(/[\u200B-\u200D\uFEFF]/g, '').trim())
      const idIndex = row.findIndex(cell => /^(?:[a-z]{2}_(?:male|female)_|ICL_)[A-Za-z0-9_-]+$/.test(cell.trim()))
      if (idIndex < 1) continue
      const id = row[idIndex].trim()
      // S2S-only families must never leak into the TTS 2.0 selector.
      if (/_jupiter_|^saturn_/.test(id)) continue
      voices.push({ id, name: row[idIndex - 1].trim(), language: row[idIndex + 1]?.trim() ?? '' })
    }
  }
  return sanitizeVoiceList(voices)
}
