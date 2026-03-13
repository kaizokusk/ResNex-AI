// lib/agents/mergeAgent.ts
// Merges all submitted sections into one cohesive document. Preserves each author's voice.

import { Agent, AgentInput, AgentOutput } from './types'
import { callLLM } from '../llm'

const SYSTEM_PROMPT = `You are merging {n} independently written sections into
one cohesive research document on {topic}.

Preserve each author's distinct voice and contribution.
Add smooth transitions between sections.
Do NOT add new claims, facts, or content not present in the originals.

Return the complete merged document as clean prose.`

export const mergeAgent: Agent = {
  id: 'merge',
  name: 'Document Merger',
  description: 'Merges all submitted sections into one cohesive document.',

  async run(input: AgentInput): Promise<AgentOutput> {
    const { messages, context, language } = input
    const { sections = [], topic = 'the project' } = context

    const system = SYSTEM_PROMPT
      .replace('{n}', String(sections.length))
      .replace('{topic}', topic)

    const sectionsText = sections
      .map((s: any, i: number) => `--- Section ${i + 1} by ${s.author} (${s.subtopic}) ---\n${s.content}`)
      .join('\n\n')

    const userMessage = messages[messages.length - 1]?.content || sectionsText

    const reply = await callLLM({ messages: [{ role: 'user', content: userMessage }], system, language })
    return { reply }
  },
}
