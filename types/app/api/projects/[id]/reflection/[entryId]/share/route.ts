// app/api/projects/[id]/reflection/[entryId]/share/route.ts
// Feature 6 — Private Reflection Space — Anonymous Share
//
// PRIVACY: Reflections are user-private.
// Never expose to other users, admins, or AI agents.
//
// When shared, the entry content is posted to group chat with NO user attribution.
// The original userId is never included in the chat message payload.

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../../lib/auth'
import { prisma } from '../../../../../../../lib/prisma'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; entryId: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, entryId } = await params

  // PRIVACY: confirm entry belongs to current user
  const entry = await prisma.reflectionEntry.findFirst({
    where: { id: entryId, projectId: id, userId: user.id },
  })
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (entry.isShared) {
    return NextResponse.json({ error: 'Already shared' }, { status: 400 })
  }

  // Mark as shared and create anonymous chat message in a transaction
  const [, chatMessage] = await prisma.$transaction([
    prisma.reflectionEntry.update({
      where: { id: entryId },
      data: { isShared: true },
    }),
    prisma.chatMessage.create({
      data: {
        project_id: id,
        user_id: null,           // NO attribution — anonymous post
        role: 'user',
        content: `[Anonymous question] ${entry.content}`,
        context: 'group_chat',
        messageType: 'text',
      },
    }),
  ])

  // Return the chat message so the client can write it to Firestore
  // (follows existing pattern: API writes to Postgres, client writes to Firestore)
  return NextResponse.json({
    ok: true,
    chatMessageId: chatMessage.id,
    content: chatMessage.content,
  })
}
