import { callDeepseekR1 } from '@/lib/llm/deepseek'
import type { AgentInput } from './orchestratorAgent'

export async function classifyInput(input: AgentInput): Promise<string> {
  const { attachments, message, requestedAction } = input
  if (requestedAction === 'equation_image') return 'equation'
  if (requestedAction === 'table' || requestedAction === 'describe_data') return 'table'
  if (requestedAction === 'figure_latex' || requestedAction === 'analyze_image') return 'figure'
  if (requestedAction === 'add_to_library' || requestedAction === 'citation') return 'citation'
  if (requestedAction === 'save_latex' || requestedAction === 'summarize' || requestedAction === 'compare') return 'text'

  if (attachments.some(a => a.type === 'csv')) return 'table'
  if (message.includes('doi:') || message.includes('arxiv.org')) return 'citation'
  if (attachments.length === 0 && !looksLikeTable(message)) return 'text'
  if (attachments.some(a => a.type === 'image')) {
    const prompt = `Look at this context and classify what type of content this is.
Message: "${message}"
File name: "${attachments[0].fileName}"
Return ONLY one word: equation | table | figure`
    const classification = await callDeepseekR1(prompt)
    return classification.trim().toLowerCase()
  }
  if (looksLikeTable(message)) return 'table'
  return 'text'
}

function looksLikeTable(text: string): boolean {
  const lines = text.trim().split('\n')
  return lines.length > 1 && lines.every(l => l.includes(',') || l.includes('\t'))
}
