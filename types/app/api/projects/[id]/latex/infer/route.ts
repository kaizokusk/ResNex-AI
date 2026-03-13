// app/api/projects/[id]/latex/infer/route.ts
// POST: AI infers an academic paragraph from a figure or table cell

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'
import { callLLM } from '../../../../../../lib/llm'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const project = await prisma.project.findUnique({ where: { id }, select: { topic: true, title: true } })
    const { sectionName, cellType, figure, table } = await req.json()

    if (!cellType || !sectionName) {
      return NextResponse.json({ error: 'cellType and sectionName required' }, { status: 400 })
    }

    let prompt = ''

    if (cellType === 'figure' && figure) {
      prompt = `You are a research writing assistant for a paper on "${project?.topic || 'the research topic'}".

Write one academic paragraph describing and analysing the figure below for the "${sectionName}" section of a research paper.

Figure filename: ${figure.fileName || 'figure'}
Figure caption: ${figure.caption || '(no caption provided)'}

Instructions:
- Write 2–4 sentences in third-person academic English
- Reference the figure naturally (e.g. "As shown in Figure X..." or "Figure X illustrates...")
- Do not include LaTeX syntax — plain text only
- Do not hallucinate specific numbers unless they appear in the caption`
    } else if (cellType === 'table' && table) {
      const headerRow = table.headers?.join(' | ') || ''
      const dataRows = (table.rows || []).map((r: string[]) => r.join(' | ')).join('\n')

      prompt = `You are a research writing assistant for a paper on "${project?.topic || 'the research topic'}".

Write one academic paragraph interpreting the table below for the "${sectionName}" section of a research paper.

Table caption: ${table.caption || '(no caption)'}
Headers: ${headerRow}
Data:
${dataRows}

Instructions:
- Write 3–5 sentences in third-person academic English
- Identify the best-performing entry and highlight key trends or differences
- Reference the table naturally (e.g. "As shown in Table X..." or "Table X presents...")
- Do not include LaTeX syntax — plain text only`
    } else {
      return NextResponse.json({ error: 'Invalid cellType or missing data' }, { status: 400 })
    }

    const result = await callLLM({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 300,
    })

    return NextResponse.json({ text: result.trim() })
  } catch (err: any) {
    console.error('[POST /latex/infer]', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
