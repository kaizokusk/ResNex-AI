// app/api/projects/[id]/chat/summarize/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'
import { chatSummarizerAgent } from '../../../../../../lib/agents/chatSummarizerAgent'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { message_limit = 50 } = await req.json().catch(() => ({}))

  const rawMessages = await prisma.chatMessage.findMany({
    where: { project_id: id, context: 'group_chat', role: 'user' },
    orderBy: { created_at: 'desc' },
    take: message_limit,
    include: { user: { select: { full_name: true } } },
  })

  const messages = rawMessages.reverse().map((m) => ({ full_name: m.user?.full_name || 'Unknown', content: m.content }))

  if (messages.length === 0) return NextResponse.json({ error: 'No chat messages to summarize.' }, { status: 422 })

  try {
    const result = await chatSummarizerAgent.run({ messages: [], context: { messages }, language: user.language })
    return NextResponse.json({ summary: result.reply, decisions: result.metadata?.decisions || [], action_items: result.metadata?.action_items || [], open_questions: result.metadata?.open_questions || [], key_findings: result.metadata?.key_findings || [], message_count: messages.length })
  } catch (err: any) {
    return NextResponse.json({ error: `LLM unavailable: ${err.message}` }, { status: 502 })
  }
}
