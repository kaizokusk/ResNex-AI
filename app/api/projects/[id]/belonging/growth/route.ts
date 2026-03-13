// app/api/projects/[id]/belonging/growth/route.ts
// Feature 5 — Personal Growth Tracker
// Returns baseline and current totals for all four growth dimensions.

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'

type CitationRow = { count: bigint }

async function countCitations(projectId: string, userId: string, since?: Date): Promise<number> {
  if (since) {
    const rows = await prisma.$queryRaw<CitationRow[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "ChatMessage"
      WHERE "project_id" = ${projectId}
        AND "user_id" = ${userId}
        AND "created_at" >= ${since}
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
  const rows = await prisma.$queryRaw<CitationRow[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "ChatMessage"
    WHERE "project_id" = ${projectId}
      AND "user_id" = ${userId}
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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const member = await prisma.projectMember.findUnique({
    where: { project_id_user_id: { project_id: id, user_id: user.id } },
    select: {
      joined_at: true,
      growthBaselineLiterature: true,
      growthBaselineWriting: true,
      growthBaselineDiscussion: true,
      growthBaselineCitations: true,
      growthBaselineSetAt: true,
    },
  })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const where = { projectId: id, userId: user.id }

  // Current totals
  const [currentLiterature, currentWriting, currentDiscussion] = await Promise.all([
    prisma.contributionEvent.count({ where: { ...where, action: { in: ['PAPER_ADDED', 'LIBRARY_UPLOAD'] } } }),
    prisma.contributionEvent.count({ where: { ...where, action: 'SECTION_EDIT' } }),
    prisma.contributionEvent.count({ where: { ...where, action: 'COMMENT_LEFT' } }),
  ])

  const currentCitations = await countCitations(id, user.id)

  const dimensions = [
    {
      key: 'literature',
      label: 'Literature Engagement',
      baseline: member.growthBaselineLiterature,
      current: currentLiterature,
      unit: 'papers engaged',
    },
    {
      key: 'writing',
      label: 'Writing Activity',
      baseline: member.growthBaselineWriting,
      current: currentWriting,
      unit: 'sections contributed',
    },
    {
      key: 'discussion',
      label: 'Peer Discussion',
      baseline: member.growthBaselineDiscussion,
      current: currentDiscussion,
      unit: 'comment threads',
    },
    {
      key: 'citations',
      label: 'Citation Work',
      baseline: member.growthBaselineCitations,
      current: currentCitations,
      unit: 'references added',
    },
  ]

  return NextResponse.json({
    dimensions,
    joinedAt: member.joined_at.toISOString(),
  })
}

