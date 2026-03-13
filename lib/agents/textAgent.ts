import { callDeepseekV3 } from '@/lib/llm/deepseek'
import type { AgentInput, AgentOutput } from './orchestratorAgent'

function normalizeSection(section: string): string {
  const cleaned = section.trim().toLowerCase().replace(/[^a-z]+/g, '_')
  const map: Record<string, string> = {
    abstract: 'abstract',
    introduction: 'introduction',
    related_work: 'related_work',
    methodology: 'methodology',
    methods: 'methodology',
    experiments: 'experiments',
    results: 'results',
    conclusion: 'conclusion',
  }
  return map[cleaned] || 'results'
}

async function guessSection(text: string): Promise<string> {
  const prompt = `Which section of an academic paper does this text belong to?
Text: "${text.slice(0, 200)}"
Return ONLY one of: abstract | introduction | related_work | methodology | experiments | results | conclusion`
  const result = await callDeepseekV3(prompt)
  return normalizeSection(result)
}

export async function textAgent(input: AgentInput): Promise<AgentOutput> {
  const context = input.previousItems
    .slice(-3)
    .map((i: any) => `Previous: ${i.action} → ${(i.result || '').slice(0, 100)}`)
    .join('\n')

  const requestedAction = input.requestedAction || 'save_latex'
  const taskPrompt =
    requestedAction === 'summarize'
      ? 'Summarize the following content in concise academic prose suitable for a paper section.'
      : requestedAction === 'compare'
      ? 'Analyze and compare the following content with an academic tone and clear contrasts.'
      : 'Convert the following text into clean academic LaTeX content.'

  const prompt = `You are an academic writing assistant.
${taskPrompt}
Context from previous work:\n${context}

Text to process:
"${input.message}"

Return ONLY valid LaTeX-ready content. No preamble. No explanation.`

  const latex = await callDeepseekV3(prompt)
  const targetSection = await guessSection(input.message)

  return {
    latex,
    action: requestedAction,
    targetSection: targetSection.trim(),
    confidence: 0.75
  }
}
