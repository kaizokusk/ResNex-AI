// app/api/projects/[id]/papers/agents/writer/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../../lib/auth'
import { prisma } from '../../../../../../../lib/prisma'
import { writerAgent } from '../../../../../../../lib/agents/writerAgent'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { paper_ids, topic = '' } = await req.json()

  const where: any = { projectId: id, status: 'ready' }
  if (Array.isArray(paper_ids) && paper_ids.length > 0) where.id = { in: paper_ids }

  const papers = await prisma.paper.findMany({ where })

  if (papers.length === 0) {
    return NextResponse.json({ error: 'No ready papers found. Import and process papers first.' }, { status: 422 })
  }

  try {
    const result = await writerAgent.run({ messages: [], context: { papers, topic }, language: user.language })
    return NextResponse.json({ content: result.reply, title: result.metadata?.title, citations: result.metadata?.citations, paper_count: papers.length })
  } catch (err: any) {
    return NextResponse.json({ error: `LLM unavailable: ${err.message}` }, { status: 502 })
  }
}
