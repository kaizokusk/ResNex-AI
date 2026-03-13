// app/api/projects/[id]/belonging/normalize/route.ts
// Feature 3 — Normalizing Struggle Panel
// Returns aggregate project stats to normalize imposter syndrome.
// Cached 10 minutes per project (in-memory).

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'

// Simple in-memory cache: projectId -> { data, expiresAt }
const cache = new Map<string, { data: NormalizeResponse; expiresAt: number }>()
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

interface NormalizeResponse {
  revisionsThisWeek: number
  openQuestions: number
  draftSections: number
  uncertaintySignals: number
}

const UNCERTAINTY_KEYWORDS = ['not sure', 'unsure', 'unclear', 'maybe', '?']

function buildUncertaintyFilter() {
  // case-insensitive OR filter across all uncertainty patterns
  return UNCERTAINTY_KEYWORDS.map(kw => ({
    content: { contains: kw, mode: 'insensitive' as const },
  }))
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const member = await prisma.projectMember.findFirst({
    where: { project_id: id, user_id: user.id },
  })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Serve from cache if still valid
  const cached = cache.get(id)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data)
  }

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [revisionsThisWeek, openQuestions, draftSections, uncertaintySignals] = await Promise.all([
    // Revisions this week: SECTION_EDIT ContributionEvents in past 7 days, all members
    prisma.contributionEvent.count({
      where: {
        projectId: id,
        action: 'SECTION_EDIT',
        createdAt: { gte: sevenDaysAgo },
      },
    }),

    // Open questions: ChatMessages in past 14 days with '?' from users (group chat only)
    prisma.chatMessage.count({
      where: {
        project_id: id,
        role: 'user',
        context: 'group_chat',
        content: { contains: '?' },
        created_at: { gte: fourteenDaysAgo },
      },
    }),

    // Draft sections: not submitted, has content
    prisma.section.count({
      where: {
        project_id: id,
        submitted: false,
        word_count: { gt: 0 },
      },
    }),

    // Uncertainty signals: comments + chat messages in past 30 days matching keyword list
    prisma.chatMessage.count({
      where: {
        project_id: id,
        role: 'user',
        created_at: { gte: thirtyDaysAgo },
        OR: buildUncertaintyFilter(),
      },
    }),
  ])

  const data: NormalizeResponse = {
    revisionsThisWeek,
    openQuestions,
    draftSections,
    uncertaintySignals,
  }

  cache.set(id, { data, expiresAt: Date.now() + CACHE_TTL_MS })

  return NextResponse.json(data)
}
