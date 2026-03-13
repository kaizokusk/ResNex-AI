// api/ai/merge/route.ts — Merge all submitted sections (admin only)

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'
import { mergeAgent } from '../../../../lib/agents/mergeAgent'

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { project_id } = body

  // Admin only
  const membership = await prisma.projectMember.findFirst({
    where: { project_id, user_id: user.id, role: 'admin' },
  })
  if (!membership) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const project = await prisma.project.findUnique({ where: { id: project_id } })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // Get all submitted sections with author info
  const sections = await prisma.section.findMany({
    where: { project_id, submitted: true },
    include: { member: { select: { full_name: true } } },
  })

  if (sections.length === 0) {
    return NextResponse.json({ error: 'No submitted sections' }, { status: 400 })
  }

  const sectionsForMerge = sections.map((s) => ({
    author: s.member.full_name,
    subtopic: s.subtopic,
    content: s.content,
  }))

  const sectionsText = sectionsForMerge
    .map((s, i) => `--- Section ${i + 1} by ${s.author} (${s.subtopic}) ---\n${s.content}`)
    .join('\n\n')

  const result = await mergeAgent.run({
    messages: [{ role: 'user', content: sectionsText }],
    context: { sections: sectionsForMerge, topic: project.topic },
    language: user.language,
  })

  // Save merged content
  await prisma.finalOutput.upsert({
    where: { project_id },
    update: { merged_content: result.reply },
    create: { project_id, merged_content: result.reply },
  })

  // Update project status to merged
  await prisma.project.update({
    where: { id: project_id },
    data: { status: 'merged' },
  })

  // Log merge action
  await prisma.contributorshipLog.create({
    data: {
      project_id,
      user_id: user.id,
      action: 'merged',
      description: `Merged ${sections.length} sections into final document`,
    },
  })

  return NextResponse.json({ merged_content: result.reply })
}
