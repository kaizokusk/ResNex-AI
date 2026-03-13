// app/api/projects/[id]/milestones/check/route.ts
// Feature 4 — Milestone Moment Toasts
// Receives a trigger action, evaluates milestone conditions, creates new achievements.
// Uses upsert with update:{} to safely handle race conditions.

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'

type MilestoneType =
  | 'FIRST_MESSAGE'
  | 'FIRST_PAPER'
  | 'FIRST_SECTION_EDIT'
  | 'FIRST_COMMENT'
  | 'FIRST_SUBMISSION'
  | 'PAPERS_5'
  | 'COMMENTS_10'
  | 'STREAK_3'

const DAY_MS = 24 * 60 * 60 * 1000

async function currentStreak(projectId: string, userId: string): Promise<number> {
  // Get the past 90 days of contribution events grouped by UTC date
  const since = new Date(Date.now() - 90 * DAY_MS)
  type Row = { date: string }
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT DISTINCT TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date
    FROM "ContributionEvent"
    WHERE "projectId" = ${projectId}
      AND "userId" = ${userId}
      AND "createdAt" >= ${since}
    ORDER BY date DESC
  `
  if (rows.length === 0) return 0

  const todayUtc = new Date().toISOString().slice(0, 10)
  let streak = 0
  let expected = todayUtc

  for (const row of rows) {
    if (row.date === expected) {
      streak++
      // next expected date is one day earlier
      const prev = new Date(new Date(expected).getTime() - DAY_MS)
      expected = prev.toISOString().slice(0, 10)
    } else {
      break
    }
  }
  return streak
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const member = await prisma.projectMember.findFirst({
    where: { project_id: id, user_id: user.id },
  })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const trigger: string = body.trigger || ''

  // Load already-achieved milestones to avoid redundant checks
  const existing = await prisma.milestoneAchievement.findMany({
    where: { projectId: id, userId: user.id },
    select: { milestone: true },
  })
  const achieved = new Set(existing.map((a) => a.milestone))

  const eventWhere = { projectId: id, userId: user.id }
  const candidateMilestones: MilestoneType[] = []

  // Determine which milestones to evaluate based on trigger
  if (trigger === 'CHAT_MESSAGE' && !achieved.has('FIRST_MESSAGE')) {
    candidateMilestones.push('FIRST_MESSAGE')
  }
  if ((trigger === 'PAPER_ADDED' || trigger === 'LIBRARY_UPLOAD')) {
    if (!achieved.has('FIRST_PAPER')) candidateMilestones.push('FIRST_PAPER')
    if (!achieved.has('PAPERS_5')) candidateMilestones.push('PAPERS_5')
  }
  if (trigger === 'SECTION_EDIT' && !achieved.has('FIRST_SECTION_EDIT')) {
    candidateMilestones.push('FIRST_SECTION_EDIT')
  }
  if (trigger === 'COMMENT_LEFT') {
    if (!achieved.has('FIRST_COMMENT')) candidateMilestones.push('FIRST_COMMENT')
    if (!achieved.has('COMMENTS_10')) candidateMilestones.push('COMMENTS_10')
  }
  if (trigger === 'SECTION_SUBMIT' && !achieved.has('FIRST_SUBMISSION')) {
    candidateMilestones.push('FIRST_SUBMISSION')
  }
  if (trigger === 'STREAK_CHECK' && !achieved.has('STREAK_3')) {
    candidateMilestones.push('STREAK_3')
  }

  if (candidateMilestones.length === 0) {
    return NextResponse.json({ newMilestones: [] })
  }

  // Evaluate conditions for each candidate
  const newMilestones: MilestoneType[] = []

  for (const milestone of candidateMilestones) {
    let unlocked = false

    switch (milestone) {
      case 'FIRST_MESSAGE': {
        const count = await prisma.contributionEvent.count({ where: { ...eventWhere, action: 'CHAT_MESSAGE' } })
        unlocked = count >= 1
        break
      }
      case 'FIRST_PAPER': {
        const count = await prisma.contributionEvent.count({ where: { ...eventWhere, action: { in: ['PAPER_ADDED', 'LIBRARY_UPLOAD'] } } })
        unlocked = count >= 1
        break
      }
      case 'FIRST_SECTION_EDIT': {
        const count = await prisma.contributionEvent.count({ where: { ...eventWhere, action: 'SECTION_EDIT' } })
        unlocked = count >= 1
        break
      }
      case 'FIRST_COMMENT': {
        const count = await prisma.contributionEvent.count({ where: { ...eventWhere, action: 'COMMENT_LEFT' } })
        unlocked = count >= 1
        break
      }
      case 'FIRST_SUBMISSION': {
        const count = await prisma.contributionEvent.count({ where: { ...eventWhere, action: 'SECTION_SUBMIT' } })
        unlocked = count >= 1
        break
      }
      case 'PAPERS_5': {
        const count = await prisma.contributionEvent.count({ where: { ...eventWhere, action: { in: ['PAPER_ADDED', 'LIBRARY_UPLOAD'] } } })
        unlocked = count >= 5
        break
      }
      case 'COMMENTS_10': {
        const count = await prisma.contributionEvent.count({ where: { ...eventWhere, action: 'COMMENT_LEFT' } })
        unlocked = count >= 10
        break
      }
      case 'STREAK_3': {
        const streak = await currentStreak(id, user.id)
        unlocked = streak >= 3
        break
      }
    }

    if (unlocked) {
      // Upsert: @@unique constraint prevents duplicates; update:{} is a no-op on conflict
      await prisma.milestoneAchievement.upsert({
        where: { projectId_userId_milestone: { projectId: id, userId: user.id, milestone } },
        create: { projectId: id, userId: user.id, milestone },
        update: {},
      })
      newMilestones.push(milestone)
    }
  }

  return NextResponse.json({ newMilestones })
}
