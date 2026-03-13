// app/api/projects/[id]/reflection/route.ts
// Feature 6 — Private Reflection Space
//
// PRIVACY: Reflections are user-private.
// Never expose to other users, admins, or AI agents.

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../lib/auth'
import { prisma } from '../../../../../lib/prisma'

// GET /api/projects/[id]/reflection
// Returns the current user's entries only, ordered by createdAt desc.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const member = await prisma.projectMember.findFirst({
    where: { project_id: id, user_id: user.id },
  })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // PRIVACY: always filter by userId — never return other users' reflections
  const entries = await prisma.reflectionEntry.findMany({
    where: { projectId: id, userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      promptIndex: true,
      content: true,
      isShared: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json(entries)
}

// POST /api/projects/[id]/reflection
// Body: { promptIndex, content }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const member = await prisma.projectMember.findFirst({
    where: { project_id: id, user_id: user.id },
  })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { promptIndex, content } = await req.json()

  if (!content || typeof content !== 'string' || content.trim().length < 1) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  const entry = await prisma.reflectionEntry.create({
    data: {
      projectId: id,
      userId: user.id,
      promptIndex: promptIndex ?? 0,
      content: content.slice(0, 5000), // cap at 5000 chars
    },
    select: {
      id: true,
      promptIndex: true,
      content: true,
      isShared: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
