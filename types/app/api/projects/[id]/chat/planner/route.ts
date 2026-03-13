// app/api/projects/[id]/chat/planner/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'
import { plannerAgent } from '../../../../../../lib/agents/plannerAgent'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { message_limit = 30 } = await req.json().catch(() => ({}))
  const project = await prisma.project.findUnique({ where: { id } })

  const rawMessages = await prisma.chatMessage.findMany({
    where: { project_id: id, context: 'group_chat', role: 'user' },
    orderBy: { created_at: 'desc' },
    take: message_limit,
    include: { user: { select: { full_name: true } } },
  })

  const messages = rawMessages.reverse().map((m) => ({ full_name: m.user?.full_name || 'Unknown', content: m.content }))

  if (messages.length === 0) return NextResponse.json({ error: 'No chat messages to analyze.' }, { status: 422 })

  const projectContext = project ? `Project: ${project.title}\nTopic: ${project.topic}\n${project.description || ''}` : ''

  try {
    const result = await plannerAgent.run({ messages: [], context: { messages, projectContext }, language: user.language })
    return NextResponse.json({ tasks: result.metadata?.tasks || [], blockers: result.metadata?.blockers || [], next_steps: result.metadata?.next_steps || [], message_count: messages.length })
  } catch (err: any) {
    const msg = err?.message || String(err) || 'Unknown error'
    // Surface HF billing/usage failures as 402 so the client can handle it distinctly.
    if (/\b402\b/.test(msg) || /Payment Required/i.test(msg) || /credits/i.test(msg)) {
      return NextResponse.json(
        {
          error: 'LLM provider billing/usage issue',
          details: msg,
          hint: 'Try switching to a smaller HF_MODEL or enable HuggingFace Inference Providers credits.',
        },
        { status: 402 }
      )
    }
    return NextResponse.json({ error: 'LLM unavailable', details: msg }, { status: 502 })
  }
}
