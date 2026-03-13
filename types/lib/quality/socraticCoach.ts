import { callDeepseekR1 } from '@/lib/llm/deepseek'

export interface HintResult {
  hint: string
  isStructureOnly: boolean
}

export async function getHint(question: string, hintCount: number, sectionContent: string): Promise<HintResult> {
  const isStructureOnly = hintCount >= 2
  const prompt = isStructureOnly
    ? `The student is stuck writing this section. Give them ONLY a structural outline (bullet points) they can fill in. No full sentences. No answers.
Section content so far: "${sectionContent.slice(0, 500)}"
Original question: "${question}"`
    : `The student is stuck on this question: "${question}"
Give ONE helpful hint that points them in the right direction WITHOUT answering the question.
Hint should reference where to look or what to think about, not what the answer is.
Keep it under 2 sentences.`

  const hint = await callDeepseekR1(prompt)
  return { hint, isStructureOnly }
}

export const SOCRATIC_TRIGGERS = {
  paper_imported: "Why did you choose this paper? How does it connect to your research question?",
  words_100_written: "What's the main claim you're making in this section?",
  equation_added: "Can you explain in one sentence what this equation represents in your research?",
  before_submit: "What's the one thing you'd improve with more time?",
  ai_section_filled: "What would you change about this AI-generated content, and why?"
} as const

export type SocraticTrigger = keyof typeof SOCRATIC_TRIGGERS
