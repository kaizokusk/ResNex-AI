import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string; paperId: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, paperId } = await params
  const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { tags } = await req.json()
  const existing = await prisma.paper.findFirst({ where: { id: paperId, projectId: id } })
  if (!existing) return NextResponse.json({ error: 'Paper not found' }, { status: 404 })

  const summary = {
    ...(((existing.summary as Record<string, unknown> | null) || {})),
    tags: Array.isArray(tags) ? tags : [],
  }

  const paper = await prisma.paper.update({
    where: { id: paperId },
    data: { summary }
  })
  return NextResponse.json(paper)
}
