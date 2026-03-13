// GET /api/projects/[id]/streak — returns streak + today's member contributions
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkAndUpdateStreak } from '@/lib/streaks/tracker'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const project = await prisma.project.findUnique({
    where: { id },
    include: { members: { include: { user: { select: { id: true, full_name: true, avatar_url: true } } } } },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Check and possibly update streak
  const { teamStreak, longestStreak, allContributed } = await checkAndUpdateStreak(id)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const contributions = await prisma.dailyContribution.findMany({
    where: { projectId: id, date: { gte: today } },
  })

  const contributionMap = new Map(contributions.map(c => [c.userId, c.actions]))
  const memberStatus = project.members.map(m => ({
    userId: m.user_id,
    name: m.user.full_name,
    avatarUrl: m.user.avatar_url,
    contributed: contributionMap.has(m.user_id),
    actions: contributionMap.get(m.user_id) || [],
  }))

  return NextResponse.json({
    teamStreak,
    longestStreak,
    lastStreakDate: project.lastStreakDate,
    allContributed,
    memberStatus,
  })
}
