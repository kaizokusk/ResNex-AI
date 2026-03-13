// lib/agents/plannerAgent.ts
// Task planner — extracts tasks from chat discussions. Ported from ResNex-AI planner.py

import { Agent, AgentInput, AgentOutput } from './types'
import { callLLM, parseJsonResponse } from '../llm'

const SYSTEM_PROMPT = `You are a project planner for a research team. Given recent chat messages and project context, extract actionable tasks.

Respond in JSON format:
{
  "tasks": [
    {
      "title": "Short task title",
      "description": "Detailed description of what needs to be done",
      "priority": "high|medium|low",
      "assignee": "suggested person or null",
      "status": "proposed"
    }
  ],
  "blockers": ["any blockers identified"],
  "next_steps": ["recommended next steps for the team"]
}

Be specific and actionable. Derive tasks from actual discussion content.`

export const plannerAgent: Agent = {
  id: 'planner',
  name: 'Task Planner',
  description: 'Extracts actionable tasks and next steps from your group chat',

  async run(input: AgentInput): Promise<AgentOutput> {
    const { messages = [], projectContext = '' } = input.context

    let msgText = ''
    for (const m of messages) {
      const sender = m.full_name || m.user_id || 'Unknown'
      msgText += `[${sender}]: ${m.content}\n`
    }

    const userMsg = `Project context:\n${projectContext}\n\nRecent discussion:\n${msgText}\n\nExtract tasks and next steps from this discussion.`

    const raw = await callLLM({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
      language: input.language,
    })

    let parsed: any
    try {
      parsed = parseJsonResponse(raw)
    } catch {
      return { reply: raw }
    }

    const taskList = (parsed.tasks || [])
      .map((t: any, i: number) => `${i + 1}. **${t.title}** (${t.priority}) — ${t.description}`)
      .join('\n')

    const reply = `**Extracted Tasks:**\n${taskList}\n\n**Blockers:** ${(parsed.blockers || []).join(', ') || 'None'}\n\n**Next Steps:** ${(parsed.next_steps || []).join('; ') || 'None'}`

    return {
      reply,
      metadata: { tasks: parsed.tasks, blockers: parsed.blockers, next_steps: parsed.next_steps },
    }
  },
}
