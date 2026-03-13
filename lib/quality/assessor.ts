import { callDeepseekV3 } from '@/lib/llm/deepseek'

export interface QualityResult {
  clarity: { score: number; feedback: string }
  evidence: { score: number; feedback: string }
  precision: { score: number; feedback: string }
  completeness: { score: number; feedback: string }
  socraiticQuestion: string
}

export async function assessSection(content: string): Promise<QualityResult> {
  const prompt = `Assess this academic writing on 4 dimensions (score 1-5 each).
Return ONLY valid JSON, no markdown, no explanation.

Content:
"${content.slice(0, 2000)}"

Return:
{
  "clarity": { "score": <1-5>, "feedback": "<one sentence>" },
  "evidence": { "score": <1-5>, "feedback": "<one sentence>" },
  "precision": { "score": <1-5>, "feedback": "<one sentence>" },
  "completeness": { "score": <1-5>, "feedback": "<one sentence>" },
  "socraiticQuestion": "<one Socratic question to deepen thinking>"
}`

  const raw = await callDeepseekV3(prompt)
  try {
    return JSON.parse(raw.trim()) as QualityResult
  } catch {
    return {
      clarity: { score: 3, feedback: 'Assessment unavailable' },
      evidence: { score: 3, feedback: 'Assessment unavailable' },
      precision: { score: 3, feedback: 'Assessment unavailable' },
      completeness: { score: 3, feedback: 'Assessment unavailable' },
      socraiticQuestion: 'What is the central claim of this section?'
    }
  }
}
