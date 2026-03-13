// api/projects/[id]/sections/route.ts — GET all submitted sections
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../lib/auth'
import { prisma } from '../../../../../lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const sections = await prisma.section.findMany({
    where: { project_id: id, submitted: true },
    include: { member: { select: { id: true, full_name: true, avatar_url: true } } },
    orderBy: { submitted_at: 'asc' },
  })
  return NextResponse.json(sections)
}
