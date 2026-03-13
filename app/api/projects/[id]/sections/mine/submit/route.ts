// api/projects/[id]/sections/mine/submit/route.ts
// POST — submit section (runs moderation scan first)

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../../lib/auth'
import { recordContributionEvent } from '../../../../../../../lib/contribution-events'
import { prisma } from '../../../../../../../lib/prisma'
import { moderateAndLog } from '../../../../../../../lib/moderation'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const section = await prisma.section.findFirst({
    where: { project_id: id, member_id: user.id },
  })
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })
  if (section.submitted) return NextResponse.json({ error: 'Already submitted' }, { status: 400 })

  // Run moderation scan on full content
  const modResult = await moderateAndLog({
    content: section.content,
    context: 'section',
    userId: user.id,
    projectId: id,
  })

  if (!modResult.pass) {
    return NextResponse.json({
      error: 'Content flagged',
      message: 'Your section may contain discriminatory or harmful language. Please revise before submitting.',
      reason: modResult.reason,
    }, { status: 422 })
  }

  // Mark as submitted
  const updated = await prisma.section.update({
    where: { id: section.id },
    data: { submitted: true, submitted_at: new Date() },
  })

  // Update member status
  await prisma.projectMember.updateMany({
    where: { project_id: id, user_id: user.id },
    data: { section_status: 'submitted' },
  })

  // Log to contributorship
  await prisma.contributorshipLog.create({
    data: {
      project_id: id,
      user_id: user.id,
      action: 'edited',
      description: 'Submitted section for review',
    },
  })

  void prisma.$executeRaw`
    INSERT INTO "ContributionEvent" ("id", "projectId", "userId", "action", "createdAt")
    VALUES (md5(random()::text || clock_timestamp()::text), ${id}, ${user.id}, 'SECTION_SUBMIT', NOW())
  `
    .catch((error) => {
      console.error('[contribution-event] section submit insert failed:', error)
    })

  void recordContributionEvent({
    prisma,
    projectId: id,
    userId: user.id,
    action: 'SECTION_SUBMIT',
    logLabel: 'section submit insert',
  })

  return NextResponse.json(updated)
}
