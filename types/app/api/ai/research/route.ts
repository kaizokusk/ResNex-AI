// api/ai/research/route.ts — Research assistant chat (context-aware, uses web search)

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'
import { researchAgent } from '../../../../lib/agents/researchAgent'

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { project_id, messages, section_subtopic } = body

  // Get project topic for context
  const project = await prisma.project.findUnique({
    where: { id: project_id },
    select: { topic: true },
  })

  const result = await researchAgent.run({
    messages,
    context: {
      subtopic: section_subtopic,
      topic: project?.topic || 'research',
    },
    language: user.language,
  })

  // Log AI prompt to contributorship
  await prisma.contributorshipLog.create({
    data: {
      project_id,
      user_id: user.id,
      action: 'ai_prompted',
      description: 'Used AI research assistant',
    },
  })

  // Save AI response to chat messages
  await prisma.chatMessage.create({
    data: {
      project_id,
      role: 'assistant',
      content: result.reply,
      context: 'workspace',
    },
  })

  return NextResponse.json({ reply: result.reply })
}
