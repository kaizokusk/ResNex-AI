// lib/agents/chatSummarizerAgent.ts
// Chat summarizer — summarizes team discussions. Ported from ResNex-AI chat_summarizer.py

import { Agent, AgentInput, AgentOutput } from './types'
import { callLLM, parseJsonResponse } from '../llm'

const SYSTEM_PROMPT = `You are a meeting notes assistant for a research team. Given a sequence of chat messages, produce a structured JSON summary:

{
  "summary": "Concise summary of the discussion (2-3 paragraphs)",
  "decisions": ["decision 1", "decision 2"],
  "action_items": ["action item 1", "action item 2"],
  "open_questions": ["question 1", "question 2"],
  "key_findings": ["finding discussed 1", "finding discussed 2"]
}

Focus on research-relevant content. Capture agreements, disagreements, and next steps.`

export const chatSummarizerAgent: Agent = {
  id: 'chat-summarizer',
  name: 'Meeting Summarizer',
  description: 'Summarizes group chat into decisions, action items, and key findings',

  async run(input: AgentInput): Promise<AgentOutput> {
    const { messages = [] } = input.context

    let msgText = ''
    for (const m of messages) {
      const sender = m.full_name || m.user_id || 'Unknown'
      msgText += `[${sender}]: ${m.content}\n`
    }

    const raw = await callLLM({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Summarize this research team discussion:\n\n${msgText}` }],
      language: input.language,
    })

    let parsed: any
    try {
      parsed = parseJsonResponse(raw)
    } catch {
      return { reply: raw }
    }

    return {
      reply: parsed.summary || raw,
      metadata: {
        decisions: parsed.decisions,
        action_items: parsed.action_items,
        open_questions: parsed.open_questions,
        key_findings: parsed.key_findings,
      },
    }
  },
}
