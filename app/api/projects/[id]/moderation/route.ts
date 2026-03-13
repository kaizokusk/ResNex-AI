// api/projects/[id]/moderation/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../lib/auth'
import { prisma } from '../../../../../lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Admin only
  const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id, role: 'admin' } })
  if (!member) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const logs = await prisma.moderationLog.findMany({
    where: { project_id: id },
    include: { user: { select: { id: true, full_name: true } } },
    orderBy: { timestamp: 'desc' },
  })
  return NextResponse.json(logs)
}
