import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getHint } from '@/lib/quality/socraticCoach'

type Params = { params: Promise<{ id: string; sectionId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, sectionId } = await params
  const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { question, hintCount } = await req.json()
  const section = await prisma.section.findUnique({ where: { id: sectionId } })
  const result = await getHint(question, hintCount || 0, section?.content || '')
  return NextResponse.json(result)
}
