// app/api/projects/[id]/moderation-alerts/[alertId]/route.ts
// Feature 1: Mark a moderation alert as reviewed (admin only)

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; alertId: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, alertId } = await params

  const membership = await prisma.projectMember.findFirst({
    where: { project_id: id, user_id: user.id, role: 'admin' },
  })
  if (!membership) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const alert = await prisma.moderationAlert.update({
    where: { id: alertId },
    data: { reviewed: true },
  })

  return NextResponse.json(alert)
}
