import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'
import { Cell, CellType } from '../../../../../../lib/cell-types'
import { parseSectionDoc } from '../../../../../../lib/agents/latexConversionAgent'
import { extractTextSummary } from '../../../../../../lib/agents/writingAssistantAgent'
import { searchDocuments } from '../../../../../../lib/semanticSearch'
import { autofillLatexCell } from '../../../../../../lib/agents/latexAutofillAgent'

type Params = { params: Promise<{ id: string }> }

function sectionLabel(fileName: string): string {
  const raw = fileName.replace('sections/', '').replace('.json', '')
  return raw.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function summarizeCell(cell: Cell): string {
  switch (cell.type) {
    case 'text':
    case 'heading':
    case 'note':
      return cell.content?.trim() || ''
    case 'equation':
      return cell.formula?.trim() || ''
    case 'citation':
      return [cell.context, cell.keys.join(', ')].filter(Boolean).join(' | ')
    case 'figure':
      return [cell.caption, cell.fileName].filter(Boolean).join(' | ')
    case 'table':
      return [cell.caption, cell.headers.join(', ')].filter(Boolean).join(' | ')
    default:
      return ''
  }
}

function nearbyContext(cells: Cell[], cellId: string): string {
  const idx = cells.findIndex((cell) => cell.id === cellId)
  if (idx < 0) return ''

  return cells
    .slice(Math.max(0, idx - 2), Math.min(cells.length, idx + 3))
    .filter((cell) => cell.id !== cellId)
    .map((cell) => `${cell.type}: ${summarizeCell(cell)}`)
    .filter(Boolean)
    .join('\n')
}

function formatFileContext(files: { fileName: string; type: string; content: string | null; fileUrl: string | null }[]): string {
  return files
    .slice(0, 8)
    .map((file) => {
      if (file.type === 'CODE') {
        const excerpt = (file.content || '').replace(/\s+/g, ' ').trim().slice(0, 500)
        return `${file.fileName}: ${excerpt || '(empty code file)'}`
      }
      return `${file.fileName}: ${file.fileUrl || file.type}`
    })
    .join('\n')
}

function currentValueForCell(cell: Cell): string {
  switch (cell.type) {
    case 'text':
    case 'heading':
    case 'note':
      return cell.content
    case 'equation':
      return [cell.formula, cell.label].filter(Boolean).join('\n')
    case 'citation':
      return [cell.context || '', cell.keys.join(', ')].filter(Boolean).join('\n')
    default:
      return ''
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { sectionFileName, cellId, cellType } = await req.json()
    if (!sectionFileName || !cellId || !cellType) {
      return NextResponse.json({ error: 'sectionFileName, cellId, and cellType are required' }, { status: 400 })
    }

    const supportedTypes: CellType[] = ['text', 'heading', 'note', 'equation', 'citation']
    if (!supportedTypes.includes(cellType)) {
      return NextResponse.json({ error: `Unsupported cell type: ${cellType}` }, { status: 400 })
    }

    const [project, sectionFile, otherSectionFiles, allFiles, papers] = await Promise.all([
      prisma.project.findUnique({
        where: { id },
        select: { title: true, topic: true, description: true },
      }),
      prisma.latexFile.findUnique({
        where: { projectId_fileName: { projectId: id, fileName: sectionFileName } },
        select: { fileName: true, content: true },
      }),
      prisma.latexFile.findMany({
        where: {
          projectId: id,
          fileName: { startsWith: 'sections/' },
          NOT: { fileName: sectionFileName },
        },
        select: { fileName: true, content: true },
      }),
      prisma.latexFile.findMany({
        where: { projectId: id, NOT: { fileName: sectionFileName } },
        select: { fileName: true, type: true, content: true, fileUrl: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.paper.findMany({
        where: { projectId: id, status: 'ready' },
        select: { title: true, abstract: true, summary: true },
        take: 8,
      }),
    ])

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (!sectionFile) return NextResponse.json({ error: 'Section file not found' }, { status: 404 })

    const cells = parseSectionDoc(sectionFile.content)
    const cell = cells.find((entry) => entry.id === cellId)
    if (!cell || cell.type !== cellType) {
      return NextResponse.json({ error: 'Cell not found in section file' }, { status: 404 })
    }

    const currentValue = currentValueForCell(cell)
    const query = [project.topic, sectionLabel(sectionFileName), currentValue].filter(Boolean).join(' ')
    const passages = query.trim() ? await searchDocuments(id, query, 4) : []

    const result = await autofillLatexCell({
      projectTitle: project.title,
      projectTopic: project.topic,
      projectDescription: project.description,
      sectionName: sectionLabel(sectionFileName),
      cellType,
      currentValue,
      currentCellSummary: summarizeCell(cell),
      nearbySectionContext: nearbyContext(cells, cellId),
      otherSectionsContext: otherSectionFiles
        .map((file) => `${sectionLabel(file.fileName)}: ${extractTextSummary(file.content)}`)
        .filter((line) => !line.endsWith(': '))
        .slice(0, 6)
        .join('\n'),
      fileTreeContext: formatFileContext(allFiles),
      paperContext: papers
        .map((paper) => {
          const summary =
            typeof paper.summary === 'object' && paper.summary !== null && 'summary_short' in (paper.summary as Record<string, unknown>)
              ? String((paper.summary as Record<string, unknown>).summary_short || '')
              : ''
          return `${paper.title}: ${(summary || paper.abstract || '').slice(0, 240)}`
        })
        .join('\n'),
      pdfContext: passages
        .map((passage) => `[Source: ${passage.fileName} | similarity ${passage.similarity.toFixed(2)}] ${passage.content.slice(0, 500)}`)
        .join('\n\n'),
    })

    return NextResponse.json({ result })
  } catch (err: any) {
    console.error('[POST /latex/autofill]', err)
    return NextResponse.json({ error: err.message || 'AI autofill failed' }, { status: 500 })
  }
}
