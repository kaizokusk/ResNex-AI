// lib/agents/types.ts — Agent interface (this file NEVER changes)

export interface AgentInput {
  messages: { role: 'user' | 'assistant'; content: string }[]
  context: Record<string, any> // project, section, user, language etc.
  language: string             // auto-detected from user profile
}

export interface AgentOutput {
  reply: string
  metadata?: Record<string, any>
}

export interface Agent {
  id: string       // unique slug e.g. 'paper-explainer'
  name: string     // display name
  description: string
  run: (input: AgentInput) => Promise<AgentOutput>
}
