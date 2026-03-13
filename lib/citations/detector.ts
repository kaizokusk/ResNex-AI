import { callDeepseekV3 } from '@/lib/llm/deepseek'

export interface MissingCitation {
  claim: string
  suggestion: string
}

export async function detectMissingCitations(content: string): Promise<MissingCitation[]> {
  const prompt = `Find all factual claims in this academic text that lack a \\cite{} reference.
Return ONLY a JSON array. No markdown.
Format: [{ "claim": "<exact claim text>", "suggestion": "<search query to find a supporting paper>" }]

Text:
"${content.slice(0, 3000)}"`

  const raw = await callDeepseekV3(prompt)
  try {
    const clean = raw.trim().replace(/```json|```/g, '').trim()
    return JSON.parse(clean) as MissingCitation[]
  } catch {
    return []
  }
}
