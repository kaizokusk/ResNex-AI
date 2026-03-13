// app/api/projects/[id]/latex/template/route.ts
// GET: current template id for this project
// POST: apply a template — creates section .json files + main.tex skeleton

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'
import { getTemplate, TEMPLATES } from '../../../../../../lib/latex-templates'

type Params = { params: Promise<{ id: string }> }

// GET /api/projects/[id]/latex/template
// Returns current templateId + list of all available templates
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const project = await prisma.project.findUnique({ where: { id }, select: { latexTemplateId: true, title: true } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const templateList = TEMPLATES.map((t) => ({
      id: t.id,
      label: t.label,
      description: t.description,
      category: t.category,
      sectionCount: t.sections.length,
    }))

    return NextResponse.json({ currentTemplateId: project.latexTemplateId, templates: templateList })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

// POST /api/projects/[id]/latex/template
// Body: { templateId: string, overwriteMain?: boolean }
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { templateId, overwriteMain = false } = body

    const template = getTemplate(templateId)
    if (!template) return NextResponse.json({ error: `Unknown template: ${templateId}` }, { status: 400 })

    const project = await prisma.project.findUnique({ where: { id }, select: { title: true } })
    const projectTitle = project?.title ?? 'Untitled Paper'

    const filesCreated: string[] = []

    // Create a blank cell-doc JSON for each section
    const emptyCellDoc = JSON.stringify({ cells: [] })

    for (const section of template.sections) {
      const fileName = `sections/${section.name}.json`
      await prisma.latexFile.upsert({
        where: { projectId_fileName: { projectId: id, fileName } },
        update: {},  // don't overwrite if already has content
        create: {
          projectId: id,
          fileName,
          type: 'CODE',
          content: emptyCellDoc,
          isMain: false,
        },
      })
      filesCreated.push(fileName)
    }

    // Build main.tex from template skeleton
    const mainTex = template.mainTexSkeleton.replace('%%TITLE%%', projectTitle)

    const existingMain = await prisma.latexFile.findFirst({
      where: { projectId: id, isMain: true },
    })

    let mainTexUpdated = false
    if (!existingMain || overwriteMain) {
      await prisma.latexFile.upsert({
        where: { projectId_fileName: { projectId: id, fileName: 'main.tex' } },
        update: { content: mainTex },
        create: {
          projectId: id,
          fileName: 'main.tex',
          type: 'CODE',
          content: mainTex,
          isMain: true,
        },
      })
      mainTexUpdated = true
      filesCreated.push('main.tex')
    }

    // Ensure refs.bib exists
    const bibExists = await prisma.latexFile.findFirst({ where: { projectId: id, fileName: 'refs.bib' } })
    if (!bibExists) {
      await prisma.latexFile.create({
        data: {
          projectId: id,
          fileName: 'refs.bib',
          type: 'CODE',
          content: '% Bibliography — add your references here\n',
          isMain: false,
        },
      })
      filesCreated.push('refs.bib')
    }

    // Save template id on project
    await prisma.project.update({
      where: { id },
      data: { latexTemplateId: templateId },
    })

    return NextResponse.json({
      templateId,
      filesCreated,
      mainTexUpdated,
      sections: template.sections.map((s) => ({ name: s.name, label: s.label, fileName: `sections/${s.name}.json` })),
    })
  } catch (err: any) {
    console.error('[POST /latex/template]', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
