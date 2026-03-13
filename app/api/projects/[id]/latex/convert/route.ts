// POST /api/projects/[id]/latex/convert
// Converts all .json section files → updates main.tex with LaTeX content

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'
import { getTemplate } from '../../../../../../lib/latex-templates'
import { convertCells, assembleMainTex, parseSectionDoc } from '../../../../../../lib/agents/latexConversionAgent'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const { compileAfter = false, previewSection } = body

    const project = await prisma.project.findUnique({
      where: { id },
      select: { title: true, latexTemplateId: true },
    })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const template = project.latexTemplateId ? getTemplate(project.latexTemplateId) : null

    // Load all section .json files
    const sectionFiles = await prisma.latexFile.findMany({
      where: { projectId: id, fileName: { startsWith: 'sections/' } },
    })

    // If preview mode — return LaTeX for one section only, no save
    if (previewSection) {
      const file = sectionFiles.find((f) => f.fileName === previewSection)
      if (!file) return NextResponse.json({ error: 'Section not found' }, { status: 404 })
      const cells = parseSectionDoc(file.content)
      const sectionName = file.fileName.replace('sections/', '').replace('.json', '').replace(/-/g, ' ')
      const latex = await convertCells(cells, sectionName)
      return NextResponse.json({ latex })
    }

    // Full conversion — convert all sections
    const sectionContents: Record<string, string> = {}
    let sectionsConverted = 0
    const logs: string[] = []

    for (const file of sectionFiles) {
      const sectionName = file.fileName.replace('sections/', '').replace('.json', '')
      const cells = parseSectionDoc(file.content)
      if (cells.length === 0) {
        sectionContents[sectionName] = '% (section not written yet)'
        logs.push(`⬜ ${sectionName} — empty, skipped`)
        continue
      }
      try {
        const displayName = sectionName.replace(/-/g, ' ')
        sectionContents[sectionName] = await convertCells(cells, displayName)
        sectionsConverted++
        logs.push(`✅ ${sectionName} — converted (${cells.length} cells)`)
      } catch (err: any) {
        logs.push(`❌ ${sectionName} — error: ${err.message}`)
        sectionContents[sectionName] = `% Conversion error: ${err.message}`
      }
    }

    // Assemble main.tex
    const skeleton = template?.mainTexSkeleton
      ?? `\\documentclass{article}\n\\begin{document}\n%%SECTION:body%%\n\\bibliographystyle{plain}\n\\bibliography{refs}\n\\end{document}`

    const mainTex = assembleMainTex(
      skeleton.replace('%%TITLE%%', project.title),
      sectionContents,
    )

    // Upsert main.tex
    await prisma.latexFile.upsert({
      where: { projectId_fileName: { projectId: id, fileName: 'main.tex' } },
      update: { content: mainTex },
      create: { projectId: id, fileName: 'main.tex', type: 'CODE', content: mainTex, isMain: true },
    })

    // Optionally trigger compile — delegate to the dedicated compile endpoint
    let compileResult = null
    if (compileAfter) {
      try {
        const origin = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
        const cr = await fetch(`${origin}/api/projects/${id}/latex/compile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        compileResult = await cr.json()
      } catch {
        compileResult = { success: false }
      }
    }

    return NextResponse.json({
      success: true,
      sectionsConverted,
      logs: logs.join('\n'),
      compileResult,
    })
  } catch (err: any) {
    console.error('[POST /latex/convert]', err)
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 })
  }
}
