// lib/moderation.ts
// MODULE 10 + Feature 1: Message moderation with context-window discrimination detection

import { callLLM, parseJsonResponse } from './llm'
import { ModerationContext, ModerationResult } from '../types'

// ---------------------------------------------------------------------------
// Simple single-message moderation (used outside group chat)
// ---------------------------------------------------------------------------

const MODERATION_SYSTEM = `You are a content moderator for an academic research platform.

Check if the message contains:
- Discrimination (gender, caste, religion, race, disability, socioeconomic)
- Harassment or personal attacks on individuals
- Hate speech of any kind

Respond ONLY with JSON (no markdown, no extra text):
{ "pass": true } if clean
{ "pass": false, "reason": "brief reason" } if flagged

Note: Academic critique of ideas is allowed.
Personal attacks on people are not.
Be strict but fair.`

export async function moderateContent(
  content: string,
  context: ModerationContext
): Promise<ModerationResult> {
  const userMessage = `Context: ${context}\n\nContent to moderate:\n${content}`

  try {
    const raw = await callLLM({
      messages: [{ role: 'user', content: userMessage }],
      system: MODERATION_SYSTEM,
    })
    return parseJsonResponse<ModerationResult>(raw)
  } catch (err) {
    console.error('[moderation] parse error:', err)
    return { pass: true }
  }
}

/**
 * Convenience: moderate and optionally log to DB if flagged.
 * Used by API routes.
 */
export async function moderateAndLog(params: {
  content: string
  context: ModerationContext
  userId: string
  projectId: string
}): Promise<ModerationResult> {
  const result = await moderateContent(params.content, params.context)

  if (!result.pass) {
    const { prisma } = await import('./prisma')
    await prisma.moderationLog.create({
      data: {
        content: params.content,
        user_id: params.userId,
        project_id: params.projectId,
        context: params.context,
        reason: result.reason || 'flagged',
      },
    })
  }

  return result
}

// ---------------------------------------------------------------------------
// Feature 1: Context-aware discrimination detection (group chat)
// ---------------------------------------------------------------------------

const CONTEXT_MODERATION_SYSTEM = `You are a content moderator for an academic research platform.
Review this conversation and check if the LAST message is discriminatory,
harassing, or harmful IN CONTEXT of the conversation history.
Consider patterns across messages, not just the isolated message.
Check for: gender/caste/religion/race discrimination, personal attacks,
coordinated harassment, hate speech.
Return JSON only: { "pass": bool, "reason": string, "severity": "low"|"medium"|"high" }`

export interface ContextModerationResult {
  pass: boolean
  reason: string
  severity: 'low' | 'medium' | 'high'
}

export async function moderateWithContext(
  newMessage: string,
  contextMessages: { role: string; content: string; userName: string }[],
  context: ModerationContext
): Promise<ContextModerationResult> {
  // Build conversation history string from last 10 messages
  const history = contextMessages
    .slice(-10)
    .map((m) => `[${m.userName}]: ${m.content}`)
    .join('\n')

  const userPrompt = `Conversation history:\n${history}\n\nNew message to evaluate:\n${newMessage}\n\nContext: ${context}`

  try {
    const raw = await callLLM({
      messages: [{ role: 'user', content: userPrompt }],
      system: CONTEXT_MODERATION_SYSTEM,
    })
    return parseJsonResponse<ContextModerationResult>(raw)
  } catch (err) {
    console.error('[moderation:context] parse error:', err)
    return { pass: true, reason: '', severity: 'low' }
  }
}

/**
 * Context-aware moderation + create ModerationAlert if flagged.
 * Returns the result plus the created alert id (if any).
 */
export async function moderateWithContextAndAlert(params: {
  newMessage: string
  contextMessages: { role: string; content: string; userName: string }[]
  context: ModerationContext
  userId: string
  projectId: string
  adminId: string
}): Promise<ContextModerationResult & { alertId?: string }> {
  const result = await moderateWithContext(
    params.newMessage,
    params.contextMessages,
    params.context
  )

  if (!result.pass) {
    const { prisma } = await import('./prisma')

    // Log to basic moderation log
    await prisma.moderationLog.create({
      data: {
        content: params.newMessage,
        user_id: params.userId,
        project_id: params.projectId,
        context: params.context,
        reason: result.reason || 'flagged',
      },
    })

    // Create detailed ModerationAlert for admin
    const alert = await prisma.moderationAlert.create({
      data: {
        projectId: params.projectId,
        reportedUserId: params.userId,
        adminId: params.adminId,
        messages: params.contextMessages.slice(-10) as any,
        flaggedMsg: params.newMessage,
        reason: result.reason,
        severity: result.severity,
      },
    })

    return { ...result, alertId: alert.id }
  }

  return result
}
