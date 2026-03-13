import { callDeepseekV3 } from '@/lib/llm/deepseek'

export async function autoTagPaper(summary: string): Promise<string[]> {
  const prompt = `Extract 3-5 concise topic tags from this paper summary.
Return ONLY a JSON array of lowercase strings. No markdown, no explanation.
Example: ["transformer", "attention", "nlp"]

Summary: "${summary.slice(0, 1000)}"`

  const raw = await callDeepseekV3(prompt)
  try {
    const clean = raw.trim().replace(/```json|```/g, '').trim()
    const tags = JSON.parse(clean) as string[]
    return tags.slice(0, 5).map(t => t.toLowerCase().replace(/\s+/g, '-'))
  } catch {
    return []
  }
}
