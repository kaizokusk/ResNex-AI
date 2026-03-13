// POST /api/projects/[id]/latex/suggest
// AI suggests cell content for a section based on project context

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'
import { suggestSection, extractTextSummary } from '../../../../../../lib/agents/writingAssistantAgent'
import { getTemplate } from '../../../../../../lib/latex-templates'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { sectionFileName } = await req.json()
    if (!sectionFileName) return NextResponse.json({ error: 'sectionFileName required' }, { status: 400 })

    const project = await prisma.project.findUnique({
      where: { id },
      select: { title: true, topic: true, latexTemplateId: true },
    })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const template = project.latexTemplateId ? getTemplate(project.latexTemplateId) : null
    const sectionNameRaw = sectionFileName.replace('sections/', '').replace('.json', '')
    const sectionName = sectionNameRaw.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    const templateSection = template?.sections.find((s) => s.name === sectionNameRaw)

    // Load all section files for context
    const allFiles = await prisma.latexFile.findMany({
      where: { projectId: id, fileName: { startsWith: 'sections/' } },
      select: { fileName: true, content: true },
    })

    const completedSections = allFiles
      .filter((f) => f.fileName !== sectionFileName)
      .map((f) => ({
        name: f.fileName.replace('sections/', '').replace('.json', '').replace(/-/g, ' '),
        textSummary: extractTextSummary(f.content),
      }))
      .filter((s) => s.textSummary.length > 0)

    // Load project papers
    const papers = await prisma.paper.findMany({
      where: { projectId: id, status: 'ready' },
      select: { title: true, abstract: true },
      take: 8,
    })

    const cells = await suggestSection({
      projectId: id,
      projectTitle: project.title,
      projectTopic: project.topic,
      sectionName,
      templateLabel: template?.label ?? 'Research Paper',
      papers: papers.map((p) => ({ title: p.title, abstract: p.abstract ?? undefined })),
      sectionDescription: templateSection?.description ?? `Write the ${sectionName} section`,
      wordTarget: templateSection?.wordTarget ?? 300,
      completedSections,
    })

    return NextResponse.json({ cells })
  } catch (err: any) {
    console.error('[POST /latex/suggest]', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
