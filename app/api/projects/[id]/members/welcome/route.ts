// app/api/projects/[id]/members/welcome/route.ts
// Feature 1 — Belonging Welcome Strip

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const member = await prisma.projectMember.findUnique({
    where: { project_id_user_id: { project_id: id, user_id: user.id } },
    select: { hasSeenWelcome: true },
  })

  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  return NextResponse.json({ hasSeenWelcome: member.hasSeenWelcome })
}

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const member = await prisma.projectMember.findUnique({
    where: { project_id_user_id: { project_id: id, user_id: user.id } },
    select: { id: true },
  })

  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  await prisma.projectMember.update({
    where: { id: member.id },
    data: { hasSeenWelcome: true },
  })

  return NextResponse.json({ ok: true })
}
