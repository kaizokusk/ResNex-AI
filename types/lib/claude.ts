// lib/claude.ts — Claude API wrapper for all AI calls

import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const MODEL = 'claude-sonnet-4-20250514'
export const MAX_TOKENS = 4096

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Single-turn Claude call (most API endpoints)
 */
export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  language = 'en'
): Promise<string> {
  const langNote =
    language !== 'en'
      ? `\n\nIMPORTANT: Respond in the user's language: ${language}.`
      : ''

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt + langNote,
    messages: [{ role: 'user', content: userMessage }],
  })

  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')
}

/**
 * Multi-turn Claude call (research assistant chat)
 */
export async function callClaudeMultiTurn(
  systemPrompt: string,
  messages: ClaudeMessage[],
  language = 'en'
): Promise<string> {
  const langNote =
    language !== 'en'
      ? `\n\nIMPORTANT: Respond in the user's language: ${language}.`
      : ''

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt + langNote,
    messages,
  })

  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')
}

/**
 * Claude call with web search enabled (research agent)
 */
export async function callClaudeWithSearch(
  systemPrompt: string,
  messages: ClaudeMessage[],
  language = 'en'
): Promise<string> {
  const langNote =
    language !== 'en'
      ? `\n\nIMPORTANT: Respond in the user's language: ${language}.`
      : ''

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt + langNote,
    tools: [{ type: 'web_search_20250305', name: 'web_search' } as any],
    messages,
  })

  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')
}

/**
 * Parse JSON from Claude response (strips markdown fences if present)
 */
export function parseJsonResponse<T>(raw: string): T {
  const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  return JSON.parse(clean) as T
}
