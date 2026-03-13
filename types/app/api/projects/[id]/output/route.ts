// app/api/projects/[id]/output/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../lib/auth'
import { prisma } from '../../../../../lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const output = await prisma.finalOutput.findUnique({ where: { project_id: id } })
  const project = await prisma.project.findUnique({ where: { id }, select: { pdfUrl: true } })

  return NextResponse.json({
    ...(output ?? {}),
    pdfUrl: project?.pdfUrl ?? null,
  })
}
