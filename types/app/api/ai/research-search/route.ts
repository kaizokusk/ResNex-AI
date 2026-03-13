// app/api/ai/research-search/route.ts
// Feature 2: Personal AI research agent — chat, arXiv search, web search

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'
import { researchSearchAgent, searchArxiv, searchWeb } from '../../../../lib/agents/researchSearchAgent'
import { callLLM } from '../../../../lib/llm'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { projectId, query, mode = 'chat', messages = [] } = body

    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

    // Verify membership
    const member = await prisma.projectMember.findFirst({
      where: { project_id: projectId, user_id: user.id },
    })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // --- arXiv search mode ---
    if (mode === 'arxiv') {
      if (!query) return NextResponse.json({ error: 'query required for arxiv mode' }, { status: 400 })

      const results = await searchArxiv(query, 5)

      // Ask LLM to summarize and format with citations
      const resultsText = results
        .map(
          (r, i) =>
            `[${i + 1}] ${r.title}\nAuthors: ${r.authors.join(', ')}\nPublished: ${r.published}\nURL: ${r.url}\nAbstract: ${r.abstract}`
        )
        .join('\n\n')

      const summary = await callLLM({
        messages: [
          {
            role: 'user',
            content: `Summarize and format these arXiv search results for the query "${query}" with proper academic citations:\n\n${resultsText}`,
          },
        ],
        system:
          'You are a research assistant. Format arXiv results clearly with citations like [Author et al., Year]. Include links.',
        language: user.language,
      })

      return NextResponse.json({ mode: 'arxiv', results, summary })
    }

    // --- Web search mode ---
    if (mode === 'web') {
      if (!query) return NextResponse.json({ error: 'query required for web mode' }, { status: 400 })

      const results = await searchWeb(query)

      const resultsText = results
        .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`)
        .join('\n\n')

      const summary = await callLLM({
        messages: [
          {
            role: 'user',
            content: `Summarize these web search results for the query "${query}":\n\n${resultsText}`,
          },
        ],
        system: 'You are a research assistant. Synthesize web search results clearly, noting sources.',
        language: user.language,
      })

      return NextResponse.json({ mode: 'web', results, summary })
    }

    // --- Chat mode (default) with RAG ---
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'messages required for chat mode' }, { status: 400 })
    }

    const output = await researchSearchAgent.run({
      messages,
      context: { projectId, mode: 'chat' },
      language: user.language,
    })

    return NextResponse.json({ mode: 'chat', reply: output.reply })
  } catch (err: any) {
    const msg = err?.message || String(err) || 'Internal server error'
    // If upstream indicates "payment required"/credits depleted, surface as 402 not 500.
    if (/\b402\b/.test(msg) || /Payment Required/i.test(msg) || /credits/i.test(msg)) {
      return NextResponse.json({ error: 'LLM provider billing/usage issue', details: msg }, { status: 402 })
    }
    return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 })
  }
}
