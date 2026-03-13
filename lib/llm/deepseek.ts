import { callLLM } from '../llm'

export async function callDeepseekV3(prompt: string, systemPrompt?: string): Promise<string> {
  return callLLM({
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
    modelOverride: process.env.OLLAMA_LATEX_MODEL || process.env.HF_MODEL || 'deepseek-v3',
    maxTokens: 2000,
  })
}

export async function callDeepseekR1(prompt: string, systemPrompt?: string): Promise<string> {
  return callLLM({
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
    modelOverride: process.env.OLLAMA_REASONING_MODEL || process.env.HF_REASONING_MODEL || 'deepseek-r1',
    maxTokens: 2000,
  })
}
