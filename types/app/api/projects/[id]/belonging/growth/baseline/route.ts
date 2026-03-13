// app/api/projects/[id]/belonging/growth/baseline/route.ts
// Feature 5 — Personal Growth Tracker
// POST: compute and store the 7-day baseline for the current user.
// Idempotent — if baseline already exists (growthBaselineSetAt is set), returns 200 without overwriting.

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../../lib/auth'
import { prisma } from '../../../../../../../lib/prisma'

type CitationRow = { count: bigint }

async function countCitationsInWindow(projectId: string, userId: string, since: Date, until: Date): Promise<number> {
  const rows = await prisma.$queryRaw<CitationRow[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "ChatMessage"
    WHERE "project_id" = ${projectId}
      AND "user_id" = ${userId}
      AND "created_at" >= ${since}
      AND "created_at" < ${until}
      AND (
        "content" ~* 'arxiv:'
        OR "content" ~* 'doi:'
        OR "content" ~* '10\.[0-9]{4,}/'
        OR "content" ~* 'et al\.'
        OR "content" ~* '\[\d+\]'
      )
  `
  return Number(rows[0]?.count ?? 0)
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const member = await prisma.projectMember.findUnique({
    where: { project_id_user_id: { project_id: id, user_id: user.id } },
    select: { id: true, joined_at: true, growthBaselineSetAt: true },
  })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Idempotent: if baseline already set, return without overwriting
  if (member.growthBaselineSetAt) {
    return NextResponse.json({ ok: true, alreadySet: true })
  }

  const joinedAt = member.joined_at
  const baselineEnd = new Date(joinedAt.getTime() + 7 * 24 * 60 * 60 * 1000)
  const eventWhere = { projectId: id, userId: user.id, createdAt: { gte: joinedAt, lt: baselineEnd } }

  const [baselineLiterature, baselineWriting, baselineDiscussion, baselineCitations] = await Promise.all([
    prisma.contributionEvent.count({ where: { ...eventWhere, action: { in: ['PAPER_ADDED', 'LIBRARY_UPLOAD'] } } }),
    prisma.contributionEvent.count({ where: { ...eventWhere, action: 'SECTION_EDIT' } }),
    prisma.contributionEvent.count({ where: { ...eventWhere, action: 'COMMENT_LEFT' } }),
    countCitationsInWindow(id, user.id, joinedAt, baselineEnd),
  ])

  await prisma.projectMember.update({
    where: { id: member.id },
    data: {
      growthBaselineLiterature: baselineLiterature,
      growthBaselineWriting: baselineWriting,
      growthBaselineDiscussion: baselineDiscussion,
      growthBaselineCitations: baselineCitations,
      growthBaselineSetAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true, alreadySet: false })
}
