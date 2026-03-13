// app/api/projects/[id]/papers/agents/qa/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../../lib/auth'
import { prisma } from '../../../../../../../lib/prisma'
import { searchDocuments } from '../../../../../../../lib/semanticSearch'
import { callLLM, parseJsonResponse } from '../../../../../../../lib/llm'
import { applyGuardrails, QAAnswer } from '../../../../../../../lib/guardrails'
import { searchArxiv, searchWeb, shouldUseLiveSearch } from '../../../../../../../lib/agents/researchSearchAgent'

const SYSTEM = `You are a research assistant answering questions grounded in workspace documents. You MUST:
1. Only use information from the provided context chunks
2. Cite sources with document title
3. If the context doesn't contain enough information, say so explicitly

Respond in JSON format:
{
  "answer": "Your detailed answer here",
  "citations": [{"document_id":"fileName","document_title":"title","chunk_text":"relevant quoted text","page_number":1}],
  "confidence": "high|medium|low"
}
Never fabricate citations or information not present in the context.`

function parseStructuredAnswer(raw: string): QAAnswer | null {
  try {
    return parseJsonResponse<QAAnswer>(raw)
  } catch {
    const firstBrace = raw.indexOf('{')
    const lastBrace = raw.lastIndexOf('}')
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(raw.slice(firstBrace, lastBrace + 1)) as QAAnswer
      } catch {
        return null
      }
    }
    return null
  }
}

function buildInsufficientContextAnswer(chunks: Awaited<ReturnType<typeof searchDocuments>>): QAAnswer {
  const fallbackCitations = chunks.slice(0, 3).map((c) => ({
    document_id: c.fileName,
    document_title: c.fileName,
    chunk_text: c.content.slice(0, 240),
  }))

  return {
    answer:
      "I can't answer that reliably from the indexed papers. The retrieved context does not contain enough direct evidence for a grounded answer.",
    citations: fallbackCitations,
    confidence: 'low',
  }
}

async function buildLiveSearchFallback(question: string, language: string) {
  const [webResults, arxivResults] = await Promise.all([
    searchWeb(question).catch(() => []),
    searchArxiv(question, 3).catch(() => []),
  ])

  const contextParts: string[] = []

  if (webResults.length > 0) {
    contextParts.push(
      'Web results:\n' +
        webResults
          .map((r, i) => `[Web ${i + 1}] ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`)
          .join('\n\n')
    )
  }

  if (arxivResults.length > 0) {
    contextParts.push(
      'arXiv results:\n' +
        arxivResults
          .map(
            (r, i) =>
              `[arXiv ${i + 1}] ${r.title}\nAuthors: ${r.authors.join(', ')}\nPublished: ${r.published}\nURL: ${r.url}\nAbstract: ${r.abstract}`
          )
          .join('\n\n')
    )
  }

  if (contextParts.length === 0) return null

  const system = `You are a research assistant answering questions from live web and arXiv search results.
Use only the provided results.
Be explicit that this answer is from live search fallback, not the indexed workspace papers.
Respond in JSON format:
{
  "answer": "Grounded answer here",
  "citations": [{"document_id":"source-id","document_title":"source title","chunk_text":"supporting snippet","page_number":1}],
  "confidence": "high|medium|low"
}
Never fabricate citations or information not present in the search results.`

  const raw = await callLLM({
    system,
    messages: [
      {
        role: 'user',
        content: `Question: ${question}\n\nLive search results:\n${contextParts.join('\n\n')}`,
      },
    ],
    language,
  })

  const parsed = parseStructuredAnswer(raw)
  if (!parsed) return null

  const citations = [
    ...webResults.map((r, i) => ({
      index: i + 1,
      documentTitle: `[Web] ${r.title}`,
      chunkText: r.snippet,
      similarity: 0,
    })),
    ...arxivResults.map((r, i) => ({
      index: webResults.length + i + 1,
      documentTitle: `[arXiv] ${r.title}`,
      chunkText: r.abstract,
      similarity: 0,
    })),
  ]

  return {
    answer: `${parsed.answer}\n\nNote: This answer used live web/arXiv fallback because the indexed papers did not contain enough direct evidence.`,
    citations,
    confidence: parsed.confidence || 'medium',
  }
}

function findChunkSimilarity(
  chunks: Awaited<ReturnType<typeof searchDocuments>>,
  citation: { document_id?: string; document_title?: string }
): number {
  const byId = citation.document_id
    ? chunks.find((ch) => ch.fileName === citation.document_id)
    : null
  if (byId) return byId.similarity

  const title = (citation.document_title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  if (!title) return 0

  const byTitle = chunks.find((ch) => {
    const fileName = ch.fileName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    return fileName.includes(title) || title.includes(fileName)
  })

  return byTitle?.similarity ?? 0
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { question, top_k = 8 } = await req.json()
  if (!question?.trim()) return NextResponse.json({ error: 'question is required' }, { status: 400 })

  const chunks = await searchDocuments(id, question, top_k)

  if (chunks.length === 0) {
    return NextResponse.json({
      answer: 'No papers have been indexed yet. Import papers via the Discover tab first.',
      citations: [],
      confidence: 'low',
    })
  }

  const context = chunks.map((c, i) => `[${i + 1}] From "${c.fileName}":\n${c.content}`).join('\n\n')
  const userMsg = `Question: ${question}\n\nContext from papers:\n${context}`

  let raw: string
  try {
    raw = await callLLM({ system: SYSTEM, messages: [{ role: 'user', content: userMsg }] })
  } catch (err: any) {
    return NextResponse.json({ error: `LLM unavailable: ${err.message}` }, { status: 502 })
  }

  const parsed = parseStructuredAnswer(raw)
  if (!parsed) {
    const insufficient = buildInsufficientContextAnswer(chunks)
    const citations = insufficient.citations.map((c, i) => ({
      index: i + 1,
      documentTitle: c.document_title || c.document_id || '',
      chunkText: c.chunk_text,
      similarity: chunks.find((ch) => ch.fileName === c.document_id)?.similarity ?? 0,
    }))
    return NextResponse.json({ answer: insufficient.answer, citations, confidence: insufficient.confidence })
  }

  const contextChunks = chunks.map((c) => ({ document_id: c.fileName, fileName: c.fileName, content: c.content }))
  const safe = applyGuardrails(parsed, contextChunks)

  const hasGroundedCitation = (safe.citations || []).length > 0

  const admitsInsufficientContext = /not enough information|does not contain enough|cannot answer|can't answer|insufficient context|cannot determine/i.test(
    safe.answer || ''
  )

  if (!hasGroundedCitation && !admitsInsufficientContext) {
    if (shouldUseLiveSearch(question)) {
      const liveFallback = await buildLiveSearchFallback(question, user.language)
      if (liveFallback) {
        return NextResponse.json({
          answer: liveFallback.answer,
          citations: liveFallback.citations,
          confidence: liveFallback.confidence,
          _guardrail: safe._guardrail,
          source: 'live-search-fallback',
        })
      }
    }

    const insufficient = buildInsufficientContextAnswer(chunks)
    const citations = insufficient.citations.map((c, i) => ({
      index: i + 1,
      documentTitle: c.document_title || c.document_id || '',
      chunkText: c.chunk_text,
      similarity: findChunkSimilarity(chunks, c),
    }))
    return NextResponse.json({
      answer: insufficient.answer,
      citations,
      confidence: insufficient.confidence,
      _guardrail: safe._guardrail,
    })
  }

  if (admitsInsufficientContext && shouldUseLiveSearch(question)) {
    const liveFallback = await buildLiveSearchFallback(question, user.language)
    if (liveFallback) {
      return NextResponse.json({
        answer: liveFallback.answer,
        citations: liveFallback.citations,
        confidence: liveFallback.confidence,
        _guardrail: safe._guardrail,
        source: 'live-search-fallback',
      })
    }
  }

  const citations = (safe.citations || []).map((c, i) => ({
    index: i + 1,
    documentTitle: c.document_title || c.document_id || '',
    chunkText: c.chunk_text,
    similarity: findChunkSimilarity(chunks, c),
  }))

  return NextResponse.json({ answer: safe.answer, citations, confidence: safe.confidence, _guardrail: safe._guardrail })
}
