// api/projects/[id]/sections/mine/route.ts — GET/PATCH my section, POST submit

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../lib/auth'
import { recordContributionEventWithThrottle } from '../../../../../../lib/contribution-events'
import { prisma } from '../../../../../../lib/prisma'

// GET /api/projects/[id]/sections/mine
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const section = await prisma.section.findFirst({
    where: { project_id: id, member_id: user.id },
  })

  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  return NextResponse.json(section)
}

// PATCH /api/projects/[id]/sections/mine — auto-save content
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { content, word_count } = body

  const section = await prisma.section.upsert({
    where: {
      project_id_member_id: { project_id: id, member_id: user.id },
    },
    update: { content, word_count },
    create: {
      project_id: id,
      member_id: user.id,
      subtopic: 'Unassigned',
      content,
      word_count,
    },
  })

  // Log edit to contributorship
  await prisma.contributorshipLog.create({
    data: {
      project_id: id,
      user_id: user.id,
      action: 'edited',
      description: `Added ${word_count} words to section`,
    },
  })

  // Update member's section status to in_progress
  await prisma.projectMember.updateMany({
    where: { project_id: id, user_id: user.id },
    data: { section_status: 'in_progress' },
  })

  void (async () => {
    const sixtySecondsAgo = new Date(Date.now() - 60_000)
    const recentEdit = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "ContributionEvent"
      WHERE "projectId" = ${id}
        AND "userId" = ${user.id}
        AND "action" = 'SECTION_EDIT'
        AND "createdAt" >= ${sixtySecondsAgo}
      ORDER BY "createdAt" DESC
      LIMIT 1
    `

    if (recentEdit.length === 0) {
      await prisma.$executeRaw`
        INSERT INTO "ContributionEvent" ("id", "projectId", "userId", "action", "createdAt")
        VALUES (md5(random()::text || clock_timestamp()::text), ${id}, ${user.id}, 'SECTION_EDIT', NOW())
      `
    }
  })().catch((error) => {
    console.error('[contribution-event] section edit insert failed:', error)
  })

  void recordContributionEventWithThrottle({
    prisma,
    projectId: id,
    userId: user.id,
    action: 'SECTION_EDIT',
    logLabel: 'section edit insert',
    dedupeWindowMs: 60_000,
  })

  return NextResponse.json(section)
}
