import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { postAnnouncement } from '@/lib/integrations/googleClassroom'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { courseId, message, accessToken } = await req.json()
  if (!courseId || !accessToken) return NextResponse.json({ error: 'courseId and accessToken required' }, { status: 400 })

  const project = await prisma.project.findUnique({ where: { id }, include: { finalOutput: true } })
  const pdfUrl = project?.finalOutput?.pdf_url

  await postAnnouncement(accessToken, courseId, message || `ResearchCollab submission: ${project?.title}`, pdfUrl || undefined)
  return NextResponse.json({ shared: true })
}
