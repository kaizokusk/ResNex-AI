// app/api/projects/[id]/papers/route.ts
// GET: list papers | POST: import a paper | DELETE: remove a paper | PATCH: retry failed paper

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../lib/auth'
import { recordContributionEvent } from '../../../../../lib/contribution-events'
import { prisma } from '../../../../../lib/prisma'
import { indexDocument } from '../../../../../lib/embeddings'
import { callLLM, parseJsonResponse } from '../../../../../lib/llm'

async function summarizePaper(title: string, abstract: string, text: string) {
  const system = `You are a research paper analyst. Given a paper's title, abstract, and content excerpt, return a JSON object with exactly these fields:
{
  "summary_short": "2-3 sentence plain-language overview",
  "problem_statement": "the problem the paper addresses",
  "methodology": "research methods and approach",
  "datasets": "datasets or benchmarks used (or 'Not specified')",
  "findings": "key results and contributions",
  "limitations": "limitations acknowledged by the authors",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}
Return ONLY valid JSON with no markdown fences.`

  const userMsg = `Title: ${title}\n\nAbstract: ${abstract || 'Not available'}\n\nContent excerpt:\n${text.slice(0, 4000)}`
  const raw = await callLLM({ system, messages: [{ role: 'user', content: userMsg }] })
  return parseJsonResponse<object>(raw)
}

// GET /api/projects/[id]/papers
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const papers = await prisma.paper.findMany({
    where: { projectId: id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(papers)
}

// POST /api/projects/[id]/papers
// Body: { title, authors?, abstract?, year?, arxivId?, doi?, url?, fileUrl? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, authors = [], abstract = '', year, arxivId, doi, url, fileUrl } = body

  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  // Check for duplicate
  const existing = await prisma.paper.findFirst({
    where: {
      projectId: id,
      OR: [
        ...(arxivId ? [{ arxivId }] : []),
        { title },
      ],
    },
  })
  if (existing) return NextResponse.json({ duplicate: true, paper: existing })

  // Create paper record immediately
  const paper = await prisma.paper.create({
    data: {
      projectId: id,
      title,
      authors,
      abstract,
      year,
      arxivId,
      doi,
      url,
      fileUrl: fileUrl || (arxivId ? `https://arxiv.org/pdf/${arxivId}` : null),
      status: 'processing',
    },
  })

  void prisma.$executeRaw`
    INSERT INTO "ContributionEvent" ("id", "projectId", "userId", "action", "createdAt")
    VALUES (md5(random()::text || clock_timestamp()::text), ${id}, ${user.id}, 'PAPER_ADDED', NOW())
  `
    .catch((error) => {
      console.error('[contribution-event] paper add insert failed:', error)
    })

  void recordContributionEvent({
    prisma,
    projectId: id,
    userId: user.id,
    action: 'PAPER_ADDED',
    logLabel: 'paper add insert',
  })

  // Background: index for RAG + summarize
  const pdfUrl = paper.fileUrl
  ;(async () => {
    try {
      let extractedText = abstract || ''

      if (pdfUrl) {
        const { extractTextFromPDF } = await import('../../../../../lib/embeddings')

        // Fetch PDF text first — arXiv requires a User-Agent header
        try {
          extractedText = await extractTextFromPDF(pdfUrl)
        } catch (err) {
          console.warn('[papers] PDF fetch failed, using abstract only:', err)
          extractedText = abstract || ''
        }

        // Index chunks for RAG (only if we got text) — pass pre-extracted text to avoid double fetch
        if (extractedText && extractedText.length > 100) {
          try {
            await indexDocument(id, user.id, title, pdfUrl, extractedText)
          } catch (err) {
            console.warn('[papers] indexDocument failed, skipping RAG index:', err)
          }
        }
      }

      let summary: object | null = null
      try {
        summary = await summarizePaper(title, abstract || '', extractedText)
      } catch (err) {
        console.warn('[papers] summarizePaper failed, storing plain summary:', err)
        summary = { summary_short: extractedText.slice(0, 300) || abstract || title }
      }

      await prisma.paper.update({
        where: { id: paper.id },
        data: { status: 'ready', summary },
      })
    } catch (err) {
      console.error('[papers] background processing failed:', err)
      await prisma.paper.update({
        where: { id: paper.id },
        data: { status: 'failed', summary: { error: String(err) } },
      }).catch(() => {})
    }
  })()

  return NextResponse.json(paper, { status: 202 })
}

// DELETE /api/projects/[id]/papers  Body: { paperId }
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { paperId } = await req.json()
  if (!paperId) return NextResponse.json({ error: 'paperId is required' }, { status: 400 })

  await prisma.paper.deleteMany({ where: { id: paperId, projectId: id } })
  return NextResponse.json({ ok: true })
}

// PATCH /api/projects/[id]/papers  Body: { paperId }  — re-queue a failed paper
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { paperId } = await req.json()
  if (!paperId) return NextResponse.json({ error: 'paperId is required' }, { status: 400 })

  const paper = await prisma.paper.findFirst({ where: { id: paperId, projectId: id } })
  if (!paper) return NextResponse.json({ error: 'Paper not found' }, { status: 404 })

  await prisma.paper.update({ where: { id: paperId }, data: { status: 'processing', summary: undefined } })

  const pdfUrl = paper.fileUrl
  const abstract = paper.abstract || ''
  const title = paper.title

  ;(async () => {
    try {
      let extractedText = abstract
      if (pdfUrl) {
        const { extractTextFromPDF } = await import('../../../../../lib/embeddings')
        try { extractedText = await extractTextFromPDF(pdfUrl) } catch { extractedText = abstract }
        if (extractedText && extractedText.length > 100) {
          try { await indexDocument(id, user.id, title, pdfUrl, extractedText) } catch { /* skip */ }
        }
      }
      let summary: object | null = null
      try { summary = await summarizePaper(title, abstract, extractedText) } catch {
        summary = { summary_short: extractedText.slice(0, 300) || abstract || title }
      }
      await prisma.paper.update({ where: { id: paperId }, data: { status: 'ready', summary } })
    } catch (err) {
      console.error('[papers] retry failed:', err)
      await prisma.paper.update({ where: { id: paperId }, data: { status: 'failed', summary: { error: String(err) } } }).catch(() => {})
    }
  })()

  return NextResponse.json({ ok: true, status: 'processing' })
}
