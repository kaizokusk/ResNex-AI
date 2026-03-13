import { callDeepseekV3 } from '@/lib/llm/deepseek'
import type { AgentInput, AgentOutput } from './orchestratorAgent'

async function fetchAndParseCSV(url: string): Promise<string> {
  const res = await fetch(url)
  return res.text()
}

export async function tableAgent(input: AgentInput): Promise<AgentOutput> {
  let rawData: string
  if (input.attachments.some(a => a.type === 'csv')) {
    rawData = await fetchAndParseCSV(input.attachments[0].url)
  } else {
    rawData = input.message
  }
  const prompt = `Convert this data into a clean LaTeX table.
Return ONLY the LaTeX table code, no explanation.
Data:
${rawData}`
  const latex = await callDeepseekV3(prompt)
  return {
    latex,
    action: input.requestedAction === 'describe_data' ? 'describe_data' : 'table',
    targetSection: 'results',
    confidence: 0.85
  }
}
