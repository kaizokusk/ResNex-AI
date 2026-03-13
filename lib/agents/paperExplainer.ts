// lib/agents/paperExplainer.ts
// Teammate's agent — explains uploaded research papers to members.
// Plug-in slot: ready to receive PDF content as context.

import { Agent, AgentInput, AgentOutput } from './types'
import { callLLM } from '../llm'

const SYSTEM_PROMPT = `You are a research paper explainer helping STEM students understand academic papers.

When given a research paper or abstract:
- Explain it in clear, accessible language appropriate for undergraduate students
- Break down complex terminology and jargon
- Highlight the key findings, methodology, and contributions
- Explain how it might be relevant to the student's current research section on {subtopic}

Be encouraging and pedagogical — your goal is to build the student's understanding, not just summarize.`

export const paperExplainer: Agent = {
  id: 'paper-explainer',
  name: 'Paper Explainer',
  description: 'Explains uploaded research papers to members in clear, accessible language.',

  async run(input: AgentInput): Promise<AgentOutput> {
    const { messages, context, language } = input
    const { subtopic = 'their topic' } = context

    const system = SYSTEM_PROMPT.replace('{subtopic}', subtopic)
    const reply = await callLLM({ messages, system, language })

    return { reply }
  },
}
