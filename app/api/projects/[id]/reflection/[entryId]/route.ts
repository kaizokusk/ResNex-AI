// app/api/projects/[id]/reflection/[entryId]/route.ts
// Feature 6 — Private Reflection Space
//
// PRIVACY: Reflections are user-private.
// Never expose to other users, admins, or AI agents.

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'

// PATCH /api/projects/[id]/reflection/[entryId]
// Updates content of an existing entry. Validates entry belongs to current user.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; entryId: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, entryId } = await params

  // PRIVACY: confirm entry belongs to current user before updating
  const entry = await prisma.reflectionEntry.findFirst({
    where: { id: entryId, projectId: id, userId: user.id },
  })
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { content } = await req.json()
  if (!content || typeof content !== 'string' || content.trim().length < 1) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  const updated = await prisma.reflectionEntry.update({
    where: { id: entryId },
    data: { content: content.slice(0, 5000) },
    select: {
      id: true,
      promptIndex: true,
      content: true,
      isShared: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json(updated)
}
