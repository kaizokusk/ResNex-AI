// GET /api/projects/[id]/sections/[sectionId]/versions
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getVersions } from '@/lib/sections/version'

type Params = { params: Promise<{ id: string; sectionId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, sectionId } = await params

  const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const versions = await getVersions(sectionId)
  return NextResponse.json(versions)
}
