// api/projects/[id]/sections/[sectionId]/comments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getAuthUser } from '../../../../../../../lib/auth'
import { recordContributionEvent } from '../../../../../../../lib/contribution-events'
import { prisma } from '../../../../../../../lib/prisma'
import { moderateAndLog } from '../../../../../../../lib/moderation'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; sectionId: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, sectionId } = await params

  // Comments stored as chat messages with context = workspace and content tagged with section ID
  const comments = await prisma.chatMessage.findMany({
    where: { project_id: id, context: 'workspace', content: { startsWith: `[section:${sectionId}]` } },
    include: { user: { select: { id: true, full_name: true, avatar_url: true } } },
    orderBy: { created_at: 'asc' },
  })
  return NextResponse.json(comments.map(c => ({ ...c, content: c.content.replace(`[section:${sectionId}] `, '') })))
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; sectionId: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, sectionId } = await params
  const { content } = await req.json()

  const modResult = await moderateAndLog({ content, context: 'comment', userId: user.id, projectId: id })
  if (!modResult.pass) {
    return NextResponse.json({
      error: 'Message flagged',
      message: 'Your comment may contain discriminatory or harmful language. Please revise before posting.',
    }, { status: 422 })
  }

  const comment = await prisma.chatMessage.create({
    data: {
      project_id: id,
      user_id: user.id,
      role: 'user',
      content: `[section:${sectionId}] ${content}`,
      context: 'workspace',
    },
    include: { user: { select: { id: true, full_name: true, avatar_url: true } } },
  })

  void prisma.$executeRaw`
    INSERT INTO "ContributionEvent" ("id", "projectId", "userId", "action", "createdAt")
    VALUES (md5(random()::text || clock_timestamp()::text), ${id}, ${user.id}, 'COMMENT_LEFT', NOW())
  `
    .catch((error) => {
      console.error('[contribution-event] comment insert failed:', error)
    })

  void recordContributionEvent({
    prisma,
    projectId: id,
    userId: user.id,
    action: 'COMMENT_LEFT',
    logLabel: 'comment insert',
  })

  return NextResponse.json({ ...comment, content })
}
