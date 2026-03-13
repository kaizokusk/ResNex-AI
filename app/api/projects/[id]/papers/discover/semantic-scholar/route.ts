// app/api/projects/[id]/papers/discover/semantic-scholar/route.ts
// POST: search Semantic Scholar and return results

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../../lib/auth'
import { prisma } from '../../../../../../../lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { query, limit = 15 } = await req.json()
    if (!query?.trim()) return NextResponse.json({ error: 'query is required' }, { status: 400 })

    const fields = 'paperId,title,authors,year,abstract,citationCount,openAccessPdf,externalIds'
    const encoded = encodeURIComponent(query.trim())
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encoded}&fields=${fields}&limit=${limit}`

    const headers: Record<string, string> = {}
    if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
      headers['x-api-key'] = process.env.SEMANTIC_SCHOLAR_API_KEY
    }
    headers['User-Agent'] = process.env.SEMANTIC_SCHOLAR_USER_AGENT ?? 'ResearchCollab/1.0 (semantic-scholar)'

    const res = await fetch(url, { headers })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      const hint =
        res.status === 429
          ? 'Rate limited by Semantic Scholar. Set SEMANTIC_SCHOLAR_API_KEY in .env, or try again later.'
          : (res.status === 401 || res.status === 403) && !process.env.SEMANTIC_SCHOLAR_API_KEY
            ? 'Semantic Scholar rejected the request. Set SEMANTIC_SCHOLAR_API_KEY in .env.'
            : 'Upstream error from Semantic Scholar.'

      return NextResponse.json(
        { error: `Semantic Scholar API error (${res.status})`, hint, details: body.slice(0, 300) },
        { status: 502 }
      )
    }

    const data = await res.json()
    const results = (data.data || []).map((p: any) => ({
      semanticScholarId: p.paperId,
      title: p.title || '',
      authors: (p.authors || []).map((a: any) => a.name),
      year: p.year,
      abstract: p.abstract || '',
      citationCount: p.citationCount,
      openAccessPdfUrl: p.openAccessPdf?.url || null,
      arxivId: p.externalIds?.ArXiv || null,
      doi: p.externalIds?.DOI || null,
      url: `https://www.semanticscholar.org/paper/${p.paperId}`,
    }))

    return NextResponse.json({ results })
  } catch (err: any) {
    const msg = err?.message || String(err) || 'Internal server error'
    console.error('[POST /papers/discover/semantic-scholar]', msg)
    return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 })
  }
}
