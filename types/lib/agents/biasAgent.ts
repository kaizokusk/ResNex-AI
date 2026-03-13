// lib/agents/biasAgent.ts
// Audits merged content for gendered language, unconscious bias, unequal attribution.

import { Agent, AgentInput, AgentOutput } from './types'
import { callLLM, parseJsonResponse } from '../llm'

const SYSTEM_PROMPT = `Audit the following research document for:
- Gendered language or assumptions
- Unconscious bias in framing or attribution
- Unequal recognition of contributors

Flag specific sentences. Be constructive, not punitive.
Return structured JSON ONLY (no markdown): { "summary": "...", "flags": [{ "sentence": "...", "issue": "...", "suggestion": "..." }] }`

export const biasAgent: Agent = {
  id: 'bias',
  name: 'Bias Auditor',
  description: 'Audits merged content for gendered language, unconscious bias, and unequal attribution.',

  async run(input: AgentInput): Promise<AgentOutput> {
    const { messages, language } = input
    const userMessage = messages[messages.length - 1]?.content || ''

    const raw = await callLLM({ messages: [{ role: 'user', content: userMessage }], system: SYSTEM_PROMPT, language })

    let parsed: any
    try {
      parsed = parseJsonResponse(raw)
    } catch {
      parsed = { summary: raw, flags: [] }
    }

    return {
      reply: raw,
      metadata: parsed,
    }
  },
}
