// app/api/projects/[id]/latex/sync/route.ts
// POST: Run LatexArchitect sync — rebuild main.tex + refs.bib from approved sections + papers

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'
import { latexSync } from '../../../../../../lib/agents/latexAgent'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Admin only
  const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (member.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  // Fetch project with members, submitted sections, and ready papers
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      members: { include: { user: true } },
    },
  })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const sections = await prisma.section.findMany({
    where: { project_id: id, submitted: true },
    include: { member: true },
  })

  const papers = await prisma.paper.findMany({
    where: { projectId: id, status: 'ready' },
  })

  // Run sync agent
  const { mainTex, refsBib } = await latexSync({
    sections: sections.map((s) => ({
      subtopic: s.subtopic,
      content: s.content,
      member: s.member,
    })),
    papers,
    projectId: id,
    projectTitle: project.title,
    projectTopic: project.topic,
    members: project.members.map((m) => m.user),
  })

  const filesUpdated: string[] = []

  // Upsert main.tex
  await prisma.latexFile.upsert({
    where: { projectId_fileName: { projectId: id, fileName: 'main.tex' } },
    create: { projectId: id, fileName: 'main.tex', type: 'CODE', content: mainTex, isMain: true },
    update: { content: mainTex, isMain: true },
  })
  filesUpdated.push('main.tex')

  // Unset isMain on any other files (in case of duplicates)
  await prisma.latexFile.updateMany({
    where: { projectId: id, fileName: { not: 'main.tex' }, isMain: true },
    data: { isMain: false },
  })

  // Upsert refs.bib only if there are papers
  if (refsBib) {
    await prisma.latexFile.upsert({
      where: { projectId_fileName: { projectId: id, fileName: 'refs.bib' } },
      create: { projectId: id, fileName: 'refs.bib', type: 'CODE', content: refsBib, isMain: false },
      update: { content: refsBib },
    })
    filesUpdated.push('refs.bib')
  }

  return NextResponse.json({
    filesUpdated,
    sectionsIncluded: sections.length,
    papersIncluded: papers.length,
  })
}
