// POST /api/projects/[id]/sections/[sectionId]/restore
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { restoreVersion } from '@/lib/sections/version'

type Params = { params: Promise<{ id: string; sectionId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, sectionId } = await params

  const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { versionIndex } = await req.json()
  if (typeof versionIndex !== 'number') {
    return NextResponse.json({ error: 'versionIndex required' }, { status: 400 })
  }

  const restoredContent = await restoreVersion(sectionId, versionIndex, user.id)
  return NextResponse.json({ content: restoredContent })
}
