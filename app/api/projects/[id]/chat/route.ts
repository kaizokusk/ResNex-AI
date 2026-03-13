// api/projects/[id]/chat/route.ts — GET last 50 messages, POST new message with moderation

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../lib/auth'
import { recordContributionEvent } from '../../../../../lib/contribution-events'
import { prisma } from '../../../../../lib/prisma'
import { moderateWithContextAndAlert } from '../../../../../lib/moderation'
import { callLLM } from '../../../../../lib/llm'
import { researchSearchAgent, searchArxiv } from '../../../../../lib/agents/researchSearchAgent'
import { getAgent } from '../../../../../lib/agents'

// GET /api/projects/[id]/chat
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const member = await prisma.projectMember.findFirst({
      where: { project_id: id, user_id: user.id },
    })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const messages = await prisma.chatMessage.findMany({
      where: { project_id: id, context: 'group_chat' },
      select: {
        id: true, content: true, role: true, created_at: true, attachments: true,
        isAnonymous: true,
        user_id: true, user: { select: { id: true, full_name: true, avatar_url: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    })

    // Mask sender identity for anonymous messages the current user did not write
    const masked = messages.reverse().map((m) => {
      if (m.isAnonymous && m.user_id !== user.id) {
        return { ...m, user_id: null, user: null }
      }
      return m
    })

    return NextResponse.json(masked)
  } catch (err: any) {
    const msg = err?.message || String(err) || 'Internal server error'
    console.error('[GET /api/projects/[id]/chat]', msg)
    return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 })
  }
}

// POST /api/projects/[id]/chat — send message with moderation gate
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const member = await prisma.projectMember.findFirst({
    where: { project_id: id, user_id: user.id },
  })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { content, messageType, attachments = [], isAnonymous = false } = body

  if (!content?.trim() && attachments.length === 0) {
    return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
  }

  // Fetch last 10 group chat messages for context moderation
  const recentMessages = await prisma.chatMessage.findMany({
    where: { project_id: id, context: 'group_chat' },
    include: { user: { select: { full_name: true } } },
    orderBy: { created_at: 'desc' },
    take: 10,
  })
  const contextMessages = recentMessages.reverse().map((m) => ({
    role: m.role,
    content: m.content,
    userName: m.user?.full_name || 'Unknown',
  }))

  // Find project admin id for alert creation
  const project = await prisma.project.findUnique({ where: { id }, select: { admin_id: true } })
  const adminId = project?.admin_id || user.id

  // Context-aware moderation gate
  const modResult = await moderateWithContextAndAlert({
    newMessage: content,
    contextMessages,
    context: 'group_chat',
    userId: user.id,
    projectId: id,
    adminId,
  })

  if (!modResult.pass) {
    return NextResponse.json({
      error: 'Message flagged',
      moderation: true,
      message: 'Your message was flagged for potentially discriminatory content. Please revise.',
      severity: modResult.severity,
    }, { status: 422 })
  }

  const message = await prisma.chatMessage.create({
    data: {
      project_id: id,
      user_id: user.id,
      role: 'user',
      content: content || '',
      context: 'group_chat',
      messageType: messageType || (attachments.length > 0 ? 'file' : 'text'),
      attachments,
      isAnonymous: !!isAnonymous,
    },
    include: { user: { select: { id: true, full_name: true, avatar_url: true } } },
  })

  void recordContributionEvent({
    prisma,
    projectId: id,
    userId: user.id,
    action: 'CHAT_MESSAGE',
    logLabel: 'chat message insert',
  })

  // --- Feature 3: @mention detection ---
  const agentName = (process.env.AGENT_NAME || 'researchbot').toLowerCase()
  const mentionRegex = new RegExp(`@${agentName}\\s*(.*)`, 'i')
  const mentionMatch = content.match(mentionRegex)

  if (mentionMatch) {
    const command = mentionMatch[1].trim()

    // Fetch last 10 messages as agent context
    const contextMsgs = await prisma.chatMessage.findMany({
      where: { project_id: id, context: 'group_chat' },
      orderBy: { created_at: 'desc' },
      take: 10,
    })
    const agentMessages = contextMsgs
      .reverse()
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    let agentReply = ''

    try {
      if (/^search\s+(.+)/i.test(command)) {
        // Route to arXiv search
        const query = command.replace(/^search\s+/i, '')
        const results = await searchArxiv(query, 3)
        const formatted = results
          .map((r, i) => `[${i + 1}] **${r.title}**\n${r.authors.slice(0, 2).join(', ')} (${r.published.slice(0, 4)})\n${r.abstract.slice(0, 200)}...\n${r.url}`)
          .join('\n\n')
        agentReply = `Here are arXiv results for "${query}":\n\n${formatted}`
      } else if (/^summarize/i.test(command)) {
        const mergeAgent = getAgent('merge')
        if (mergeAgent) {
          const recentContent = agentMessages
            .slice(-10)
            .map((m) => m.content)
            .join('\n')
          const out = await mergeAgent.run({
            messages: [{ role: 'user', content: `Summarize these messages:\n${recentContent}` }],
            context: { sections: [], topic: 'group chat' },
            language: user.language,
          })
          agentReply = out.reply
        }
      } else if (/^explain\s+(.+)/i.test(command)) {
        const resAgent = getAgent('research')
        if (resAgent) {
          const out = await resAgent.run({
            messages: [...agentMessages, { role: 'user', content: command }],
            context: {},
            language: user.language,
          })
          agentReply = out.reply
        }
      } else if (/^transfer(\s+\S+)?/i.test(command)) {
        // /transfer [targetFile?] — takes the last AI message and pushes to LaTeX
        const targetFileMatch = command.match(/^transfer\s+(\S+)/i)
        const targetFile = targetFileMatch?.[1] || 'main.tex'
        const lastAiMsg = agentMessages.filter((m) => m.role === 'assistant').slice(-1)[0]?.content || content
        // Detect content type
        const contentType =
          lastAiMsg.includes('\\begin{equation}') || lastAiMsg.includes('$') ? 'equation'
          : lastAiMsg.includes(',') && lastAiMsg.split('\n')[0].includes(',') ? 'table'
          : 'text'
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/projects/${id}/latex/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-internal': '1' },
            body: JSON.stringify({ content: lastAiMsg, contentType, targetFile }),
          })
          if (res.ok) {
            agentReply = `✓ Transferred to \`${targetFile}\` as ${contentType} block.`
          } else {
            agentReply = 'Transfer failed. Make sure you have a LaTeX file set up.'
          }
        } catch {
          agentReply = 'Transfer failed — could not reach the LaTeX API.'
        }
      } else {
        // Default: research-search agent with full context
        const out = await researchSearchAgent.run({
          messages: [...agentMessages, { role: 'user', content: command || content }],
          context: { projectId: id, mode: 'chat' },
          language: user.language,
        })
        agentReply = out.reply
      }
    } catch (err) {
      console.error('[chat:mention] agent error:', err)
      agentReply = 'Sorry, I encountered an error. Please try again.'
    }

    if (agentReply) {
      await prisma.chatMessage.create({
        data: {
          project_id: id,
          user_id: null,
          role: 'assistant',
          content: agentReply,
          context: 'group_chat',
          messageType: 'agent_response',
        },
      })
    }

    return NextResponse.json({ ...message, agentReply }, { status: 201 })
  }

  return NextResponse.json(message, { status: 201 })
}
