// api/ai/visual-summary/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'
import { generateVisualSummary } from '../../../../lib/pollinations'

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { project_id } = await req.json()

  const [project, output] = await Promise.all([
    prisma.project.findUnique({ where: { id: project_id } }),
    prisma.finalOutput.findUnique({ where: { project_id } }),
  ])

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const image_url = await generateVisualSummary({
    topic: project.topic,
    mergedContent: output?.merged_content || project.description,
  })

  await prisma.finalOutput.upsert({
    where: { project_id },
    update: { visual_summary_url: image_url },
    create: { project_id, visual_summary_url: image_url },
  })

  return NextResponse.json({ image_url })
}
