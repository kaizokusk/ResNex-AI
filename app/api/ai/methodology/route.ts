// api/ai/methodology/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'
import { callLLM } from '../../../../lib/llm'

const SYSTEM = `Generate a methodology disclosure paragraph explaining how AI was used
in this research project. Mention: which AI tools were used, for which tasks,
and how human oversight was maintained.
Write in first-person plural (we). Be transparent and academically
appropriate per BERA 2024 ethical guidelines.`

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { project_id } = await req.json()
  const project = await prisma.project.findUnique({ where: { id: project_id } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const methodology = await callLLM({
    system: SYSTEM,
    messages: [{ role: 'user', content: `Project: ${project.title}\nTopic: ${project.topic}\nDescription: ${project.description}` }],
    language: user.language,
  })

  await prisma.finalOutput.upsert({
    where: { project_id },
    update: { methodology_disclosure: methodology },
    create: { project_id, methodology_disclosure: methodology },
  })

  return NextResponse.json({ methodology })
}
