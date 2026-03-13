// app/api/projects/[id]/papers/discover/arxiv/route.ts
// POST: search arXiv and return results (no import yet)

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../../lib/auth'
import { prisma } from '../../../../../../../lib/prisma'

function parseArxivXML(xml: string) {
  const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) || []
  return entries.map((entry) => {
    const rawId = entry.match(/<id>(.*?)<\/id>/)?.[1] || ''
    const arxivId = rawId.split('/abs/').pop()?.trim() || rawId.split('/').pop()?.trim() || ''
    const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/\s+/g, ' ').trim() || ''
    const abstract = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.replace(/\s+/g, ' ').trim() || ''
    const published = entry.match(/<published>(.*?)<\/published>/)?.[1]?.slice(0, 10) || ''
    const year = published ? parseInt(published.slice(0, 4)) : undefined
    const authors = [...entry.matchAll(/<name>(.*?)<\/name>/g)].map((m) => m[1].trim())
    const category = entry.match(/arxiv:primary_category[^/]*?term="(.*?)"/)?.[1] || ''

    return {
      arxivId,
      title,
      abstract,
      published,
      year,
      authors,
      primaryCategory: category,
      url: `https://arxiv.org/abs/${arxivId}`,
      pdfUrl: `https://arxiv.org/pdf/${arxivId}`,
    }
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { query, max_results = 15 } = await req.json()
    if (!query?.trim()) return NextResponse.json({ error: 'query is required' }, { status: 400 })

    const encoded = encodeURIComponent(query.trim())
    const queryPath = `/api/query?search_query=all:${encoded}&start=0&max_results=${max_results}&sortBy=relevance`
    const endpoints = [
      // Primary endpoint per arXiv docs.
      'https://export.arxiv.org',
      // Fallbacks: sometimes export.* can rate-limit or block certain networks.
      'https://arxiv.org',
      'http://export.arxiv.org',
    ]

    // arXiv requests clients identify themselves via User-Agent.
    const headers = {
      Accept: 'application/atom+xml',
      'User-Agent': process.env.ARXIV_USER_AGENT ?? 'ResearchCollab/1.0 (arxiv-api)',
    }

    let lastStatus: number | null = null
    let lastBody = ''
    let xml = ''

    for (const base of endpoints) {
      const url = `${base}${queryPath}`
      const res = await fetch(url, { headers })
      if (res.ok) {
        xml = await res.text()
        break
      }

      lastStatus = res.status
      lastBody = await res.text().catch(() => '')
    }

    if (!xml) {
      const hint =
        lastStatus === 429
          ? 'Rate limited by arXiv. Try again in a minute, or reduce max_results.'
          : lastStatus === 403
            ? 'Blocked by arXiv (403). Set ARXIV_USER_AGENT in .env to identify your app.'
            : 'Upstream error from arXiv.'

      return NextResponse.json(
        {
          error: `arXiv API error (${lastStatus ?? 'unknown'})`,
          hint,
          details: lastBody.slice(0, 300),
        },
        { status: 502 }
      )
    }

    const results = parseArxivXML(xml).filter((r) => r.arxivId && r.title)

    return NextResponse.json({ results })
  } catch (err: any) {
    const msg = err?.message || String(err) || 'Internal server error'
    console.error('[POST /papers/discover/arxiv]', msg)
    return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 })
  }
}
