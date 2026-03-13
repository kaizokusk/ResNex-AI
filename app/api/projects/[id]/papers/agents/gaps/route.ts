// app/api/projects/[id]/papers/agents/gaps/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../../lib/auth'
import { prisma } from '../../../../../../../lib/prisma'
import { callLLM, parseJsonResponse } from '../../../../../../../lib/llm'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const papers = await prisma.paper.findMany({ where: { projectId: id, status: 'ready' } })

  if (papers.length === 0) {
    return NextResponse.json({ gaps: [], message: 'No ready papers found. Import and process papers first.' })
  }

  const papersContext = papers.map((p) => {
    const s = p.summary as any
    return `"${p.title}" (${p.year || 'n/a'})
- Problem: ${s?.problem_statement || p.abstract?.slice(0, 200) || 'n/a'}
- Methodology: ${s?.methodology || 'n/a'}
- Findings: ${s?.findings || 'n/a'}
- Limitations: ${s?.limitations || 'n/a'}`
  }).join('\n\n')

  const system = `You are a research gap analyst. Given a set of papers, identify concrete research gaps and future directions.
Return a JSON object:
{
  "gaps": [{"title":"Short gap title","description":"2-3 sentence explanation","evidence":"Which paper(s) hint at this","opportunity":"How to address this"}],
  "synthesis": "1-2 paragraph synthesis of the research landscape"
}
Return ONLY valid JSON with no markdown fences. Identify 4-7 distinct gaps.`

  let raw: string
  try {
    raw = await callLLM({
      system,
      messages: [{ role: 'user', content: `Analyze these papers for research gaps:\n\n${papersContext}` }],
      maxTokens: 4096,
    })
  } catch (err: any) {
    return NextResponse.json({ error: `LLM unavailable: ${err.message}` }, { status: 502 })
  }

  try {
    return NextResponse.json(parseJsonResponse<any>(raw))
  } catch {
    return NextResponse.json({ gaps: [], synthesis: raw, message: 'LLM returned unstructured text.' })
  }
}
