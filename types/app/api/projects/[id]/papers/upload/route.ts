// app/api/projects/[id]/papers/upload/route.ts
// Direct PDF upload: accepts multipart/form-data, extracts text inline, no external storage needed

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../lib/auth'
import { recordContributionEvent } from '../../../../../../lib/contribution-events'
import { prisma } from '../../../../../../lib/prisma'
import { indexDocument } from '../../../../../../lib/embeddings'
import { callLLM, parseJsonResponse } from '../../../../../../lib/llm'

async function summarizePaper(title: string, abstract: string, text: string) {
  const system = `You are a research paper analyst. Return a JSON object:
{"summary_short":"2-3 sentence overview","problem_statement":"problem addressed","methodology":"research methods","datasets":"datasets used or Not specified","findings":"key results","limitations":"limitations","keywords":["k1","k2","k3"]}
Return ONLY valid JSON with no markdown fences.`
  const userMsg = `Title: ${title}\n\nAbstract: ${abstract || 'Not available'}\n\nContent:\n${text.slice(0, 4000)}`
  try {
    const raw = await callLLM({ system, messages: [{ role: 'user', content: userMsg }] })
    return parseJsonResponse<object>(raw)
  } catch {
    return { summary_short: text.slice(0, 300) || abstract || title }
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let text = ''
  let title = 'Uploaded Paper'

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    title = file.name.replace(/\.pdf$/i, '')

    // Extract text from uploaded PDF buffer
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require('pdf-parse')
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    text = result.text || ''
  } catch (err) {
    console.warn('[upload] PDF parse failed:', err)
    // Continue with no text
  }

  // Create paper record immediately
  const paper = await prisma.paper.create({
    data: {
      projectId: id,
      title,
      status: 'processing',
    },
  })

  void prisma.$executeRaw`
    INSERT INTO "ContributionEvent" ("id", "projectId", "userId", "action", "createdAt")
    VALUES (md5(random()::text || clock_timestamp()::text), ${id}, ${user.id}, 'LIBRARY_UPLOAD', NOW())
  `
    .catch((error) => {
      console.error('[contribution-event] library upload insert failed:', error)
    })

  void recordContributionEvent({
    prisma,
    projectId: id,
    userId: user.id,
    action: 'LIBRARY_UPLOAD',
    logLabel: 'library upload insert',
  })

  // Background: index + summarize
  ;(async () => {
    try {
      if (text && text.length > 100) {
        try {
          await indexDocument(id, user.id, title, `upload:${paper.id}`, text)
        } catch (err) {
          console.warn('[upload] indexDocument failed:', err)
        }
      }

      const summary = await summarizePaper(title, '', text)

      await prisma.paper.update({
        where: { id: paper.id },
        data: { status: 'ready', summary },
      })
    } catch (err) {
      console.error('[upload] background failed:', err)
      await prisma.paper.update({
        where: { id: paper.id },
        data: { status: 'failed', summary: { error: String(err) } },
      }).catch(() => {})
    }
  })()

  return NextResponse.json(paper, { status: 202 })
}
