// api/projects/[id]/members/route.ts — POST invite member (admin only)

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getAuthUser } from '../../../../../lib/auth'
import { prisma } from '../../../../../lib/prisma'

// POST /api/projects/[id]/members — invite member by email
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const currentUser = await getAuthUser()
  if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { id } = await params

  // Must be admin
  const myMembership = await prisma.projectMember.findFirst({
    where: { project_id: id, user_id: currentUser.id, role: 'admin' },
  })
  if (!myMembership) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await req.json()
  const { email, role = 'member' } = body

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // Find or create invited user
  let invitedUser = await prisma.user.findUnique({ where: { email } })
  if (!invitedUser) {
    // Create placeholder — they'll fill in their name on first login
    invitedUser = await prisma.user.create({
      data: {
        email,
        full_name: email.split('@')[0], // placeholder
        language: 'en',
      },
    })
  }

  // Check if already a member
  const existing = await prisma.projectMember.findFirst({
    where: { project_id: id, user_id: invitedUser.id },
  })
  if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 409 })

  const member = await prisma.projectMember.create({
    data: {
      project_id: id,
      user_id: invitedUser.id,
      role,
    },
    include: { user: true },
  })

  return NextResponse.json(member, { status: 201 })
}
