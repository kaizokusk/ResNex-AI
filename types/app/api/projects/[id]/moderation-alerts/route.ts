// app/api/projects/[id]/moderation-alerts/route.ts
// Feature 1: Admin-only moderation alerts CRUD

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../lib/auth'
import { prisma } from '../../../../../lib/prisma'

// GET /api/projects/[id]/moderation-alerts — all unreviewed alerts (admin only)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const membership = await prisma.projectMember.findFirst({
    where: { project_id: id, user_id: user.id, role: 'admin' },
  })
  if (!membership) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const alerts = await prisma.moderationAlert.findMany({
    where: { projectId: id, reviewed: false },
    orderBy: { createdAt: 'desc' },
  })

  // Attach reporter info
  const enriched = await Promise.all(
    alerts.map(async (alert) => {
      const reporter = await prisma.user.findUnique({
        where: { id: alert.reportedUserId },
        select: { id: true, full_name: true, avatar_url: true },
      })
      return { ...alert, reporter }
    })
  )

  return NextResponse.json(enriched)
}
