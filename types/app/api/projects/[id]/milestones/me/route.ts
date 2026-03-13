// app/api/projects/[id]/milestones/me/route.ts
// Feature 4 — Milestone Moment Toasts
// Returns array of achieved milestone keys for the current user in this project.

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const member = await prisma.projectMember.findFirst({
    where: { project_id: id, user_id: user.id },
  })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const achievements = await prisma.milestoneAchievement.findMany({
    where: { projectId: id, userId: user.id },
    select: { milestone: true },
  })

  return NextResponse.json(achievements.map((a) => a.milestone))
}
