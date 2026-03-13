// api/projects/[id]/members/[memberId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, memberId } = await params

  // Admin only
  const myMembership = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id, role: 'admin' } })
  if (!myMembership) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await req.json()
  const updated = await prisma.projectMember.update({
    where: { id: memberId },
    data: {
      ...(body.assigned_subtopic !== undefined && { assigned_subtopic: body.assigned_subtopic }),
      ...(body.section_status && { section_status: body.section_status }),
    },
    include: { user: true },
  })

  // Also update the section's subtopic if it exists
  if (body.assigned_subtopic !== undefined) {
    await prisma.section.updateMany({
      where: { project_id: id, member_id: updated.user_id },
      data: { subtopic: body.assigned_subtopic },
    })
  }

  return NextResponse.json(updated)
}
