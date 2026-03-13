// lib/guardrails.ts
// Citation validation & hallucination checks. Ported from ResNex-AI guardrails.py

export interface Citation {
  document_id?: string
  document_title?: string
  chunk_text?: string
  page_number?: number
  similarity?: number
  [key: string]: unknown
}

export interface GuardrailMeta {
  checked: boolean
  removed: number
  kept: number
}

export interface QAAnswer {
  answer: string
  citations: Citation[]
  confidence: 'high' | 'medium' | 'low'
  _guardrail?: GuardrailMeta
  [key: string]: unknown
}

export interface ContextChunk {
  document_id?: string
  fileName?: string
  content?: string
  text?: string
  [key: string]: unknown
}

function normalizeRef(text: string): string {
  return text
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+\d+$/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Simple fuzzy containment — returns 0-1 score */
function fuzzyContains(haystack: string, needle: string): number {
  if (!needle || !haystack) return 0
  const h = haystack.toLowerCase()
  const n = needle.toLowerCase().slice(0, 200)
  if (h.includes(n)) return 1
  // Check if most words of needle appear in haystack
  const words = n.split(/\s+/).filter((w) => w.length > 3)
  if (words.length === 0) return 0
  const matched = words.filter((w) => h.includes(w)).length
  return matched / words.length
}

/** Remove citations that can't be traced back to any context chunk */
export function validateCitations(answer: QAAnswer, contextChunks: ContextChunk[]): QAAnswer {
  const rawCitations = answer.citations || []
  if (rawCitations.length === 0) {
    answer._guardrail = { checked: true, removed: 0, kept: 0 }
    return answer
  }

  const knownIds = new Set(contextChunks.map((c) => c.document_id).filter(Boolean))
  const knownTitles = contextChunks.map((c) => ({
    raw: c.fileName || '',
    normalized: normalizeRef(c.fileName || ''),
  })).filter((c) => c.raw)
  const chunkTexts = contextChunks.map((c) => c.content || c.text || '')

  const valid: Citation[] = []
  let removed = 0

  for (const cit of rawCitations) {
    const cid = cit.document_id || ''
    const ctitle = cit.document_title || ''
    const normalizedTitle = normalizeRef(ctitle)

    const idOk = cid ? knownIds.has(cid) : false
    const titleOk = normalizedTitle
      ? knownTitles.some(({ normalized }) =>
          normalized.includes(normalizedTitle) ||
          normalizedTitle.includes(normalized) ||
          fuzzyContains(normalized, normalizedTitle) >= 0.6
        )
      : false

    if (!idOk && !titleOk) {
      removed++
      continue
    }

    const quoted = cit.chunk_text || ''
    if (quoted && quoted.length > 20) {
      const bestRatio = chunkTexts.length
        ? Math.max(...chunkTexts.map((c) => fuzzyContains(c, quoted)))
        : 0
      if (bestRatio < 0.4) {
        removed++
        continue
      }
    }

    valid.push(cit)
  }

  answer.citations = valid
  answer._guardrail = { checked: true, removed, kept: valid.length }
  return answer
}

/** Downgrade confidence if answer contains hedging language */
export function checkConfidence(answer: QAAnswer): QAAnswer {
  const text = (answer.answer || '').toLowerCase()
  const hedging = [
    "i'm not sure", 'i am not sure', 'it is unclear',
    'the context does not', 'no relevant information',
    'cannot determine', 'not enough information',
    "i don't have", 'i do not have',
  ]
  if (hedging.some((h) => text.includes(h))) {
    answer.confidence = 'low'
  }
  return answer
}

/** Run all guardrail checks on a QA answer */
export function applyGuardrails(answer: QAAnswer, contextChunks: ContextChunk[]): QAAnswer {
  answer = validateCitations(answer, contextChunks)
  answer = checkConfidence(answer)
  return answer
}
