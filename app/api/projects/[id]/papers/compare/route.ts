// app/api/projects/[id]/papers/compare/route.ts
// POST: compare 2+ papers and return a structured matrix + narrative

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'
import { callLLM, parseJsonResponse } from '../../../../../../lib/llm'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { paper_ids } = await req.json()
  if (!Array.isArray(paper_ids) || paper_ids.length < 2) {
    return NextResponse.json({ error: 'At least 2 paper_ids are required' }, { status: 400 })
  }

  const papers = await prisma.paper.findMany({
    where: { id: { in: paper_ids }, projectId: id, status: 'ready' },
  })

  if (papers.length < 2) {
    return NextResponse.json({ error: 'Not enough ready papers found' }, { status: 422 })
  }

  // Build the comparison matrix directly from stored summary fields (works without LLM)
  const matrixPapers = papers.map((p) => {
    const s = p.summary as any
    return {
      title: p.title,
      problem_addressed: s?.problem_statement || p.abstract?.slice(0, 300) || 'n/a',
      methodology: s?.methodology || 'n/a',
      datasets: s?.datasets || 'n/a',
      findings: s?.findings || 'n/a',
      limitations: s?.limitations || 'n/a',
      novelty: s?.findings || 'n/a', // placeholder; overwritten by LLM if available
    }
  })

  const fallbackResult = {
    narrative_summary: null as string | null,
    comparison_matrix: {
      dimensions: ['problem_addressed', 'methodology', 'datasets', 'findings', 'limitations', 'novelty'],
      papers: matrixPapers,
    },
  }

  // Try LLM for enhanced narrative + novelty — fall back to stored summaries if unavailable
  const papersContext = papers
    .map((p) => {
      const s = p.summary as any
      return `## ${p.title} (${p.year || 'n/a'})
Authors: ${(p.authors as string[]).join(', ') || 'Unknown'}
Problem: ${s?.problem_statement || p.abstract || 'n/a'}
Methodology: ${s?.methodology || 'n/a'}
Datasets: ${s?.datasets || 'n/a'}
Findings: ${s?.findings || 'n/a'}
Limitations: ${s?.limitations || 'n/a'}`
    })
    .join('\n\n')

  const system = `You are a research synthesis expert. Compare the given papers and return a JSON object with:
{
  "narrative_summary": "3-5 paragraph narrative comparing and contrasting the papers",
  "comparison_matrix": {
    "dimensions": ["problem_addressed", "methodology", "datasets", "findings", "limitations", "novelty"],
    "papers": [
      { "title": "...", "problem_addressed": "...", "methodology": "...", "datasets": "...", "findings": "...", "limitations": "...", "novelty": "..." }
    ]
  }
}
Return ONLY valid JSON with no markdown fences.`

  try {
    const raw = await callLLM({
      system,
      messages: [{ role: 'user', content: `Compare these papers:\n\n${papersContext}` }],
      maxTokens: 6000,
    })
    try {
      return NextResponse.json(parseJsonResponse<any>(raw))
    } catch {
      // LLM returned non-JSON — return fallback matrix with raw text as narrative
      return NextResponse.json({ ...fallbackResult, narrative_summary: raw })
    }
  } catch {
    // LLM unavailable — return comparison matrix built from stored summaries
    return NextResponse.json(fallbackResult)
  }
}
