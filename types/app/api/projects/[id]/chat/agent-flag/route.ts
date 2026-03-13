// app/api/projects/[id]/chat/agent-flag/route.ts
// POST: Create an AgentPanelItem from a flagged chat message
// PATCH: Update targetSection or mark addedToLatex / sharedToChat
// GET: List agent panel items for current user

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'
import { callLLM, callLLMVision } from '../../../../../../lib/llm'
import { orchestratorAgent } from '../../../../../../lib/agents/orchestratorAgent'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const items = await prisma.agentPanelItem.findMany({
    where: { projectId: id, userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(items)
}

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { message, action, targetSection, attachments = [] } = await req.json()
  if (!action) {
    return NextResponse.json({ error: 'action is required' }, { status: 400 })
  }

  const validActions = ['summarize', 'compare', 'analyze_image', 'add_to_library', 'describe_data']
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: `Invalid action. Use one of: ${validActions.join(', ')}` }, { status: 400 })
  }

  const previousItems = await prisma.agentPanelItem.findMany({
    where: { projectId: id, userId: user.id },
    orderBy: { createdAt: 'asc' },
    take: 5,
  })

  const previousContext = previousItems.map((p) => ({
    action: p.action,
    result: p.result.slice(0, 400),
  }))

  const orchestratedActions = ['summarize', 'compare', 'add_to_library', 'describe_data']
  if (orchestratedActions.includes(action)) {
    try {
      const output = await orchestratorAgent({
        message: message || 'Process the attached file(s)',
        attachments,
        projectId: id,
        userId: user.id,
        previousItems,
        requestedAction: action,
      })

      const created = await prisma.agentPanelItem.findFirst({
        where: {
          projectId: id,
          userId: user.id,
          action: output.action,
          result: output.latex,
        },
        orderBy: { createdAt: 'desc' },
      })

      if (!created) {
        return NextResponse.json({ error: 'Failed to persist agent result' }, { status: 500 })
      }

      return NextResponse.json(created)
    } catch (err: any) {
      return NextResponse.json({ error: `Agent orchestration failed: ${err.message}` }, { status: 502 })
    }
  }

  const systemPrompts: Record<string, string> = {
    analyze_image: `You are an image analysis assistant for academic research. Based on the context and any image URLs provided, describe the content, identify key information relevant for a research paper, and summarize findings concisely.`,
  }

  // Build user content — include attachment URLs as context
  const attachmentContext =
    (attachments as { url: string; type: string; fileName: string }[]).length > 0
      ? `\n\nAttached files:\n${(attachments as { url: string; type: string; fileName: string }[])
          .map((a) => `- [${a.type}] ${a.fileName}: ${a.url}`)
          .join('\n')}`
      : ''

  const userContent = (message || 'Process the attached file(s)') + attachmentContext

  const contextNote =
    previousContext.length > 0
      ? `\n\nPrevious agent outputs for context:\n${previousContext.map((p, i) => `[${i + 1}] ${p.action}: ${p.result}`).join('\n')}`
      : ''

  const imageActions = ['analyze_image']
  const imageUrls = (attachments as { url: string; type: string; fileName: string }[])
    .filter((a) => a.type === 'image')
    .map((a) => a.url)

  let result: string
  try {
    if (imageActions.includes(action) && imageUrls.length > 0) {
      // Use vision — Claude actually sees the image(s)
      result = await callLLMVision({
        imageUrls,
        textPrompt: message || 'Process the attached image(s)',
        system: systemPrompts[action] + contextNote,
        maxTokens: 2000,
      })
    } else {
      result = await callLLM({
        system: systemPrompts[action] + contextNote,
        messages: [{ role: 'user', content: userContent }],
        maxTokens: 2000,
      })
    }
  } catch (err: any) {
    return NextResponse.json({ error: `LLM error: ${err.message}` }, { status: 502 })
  }

  const item = await prisma.agentPanelItem.create({
    data: {
      projectId: id,
      userId: user.id,
      action,
      sourceMessage: userContent,
      result,
      context: previousContext,
      targetSection: targetSection || null,
    },
  })

  return NextResponse.json(item)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { itemId, targetSection, addedToLatex, sharedToChat } = await req.json()
  if (!itemId) return NextResponse.json({ error: 'itemId is required' }, { status: 400 })

  // Verify ownership
  const item = await prisma.agentPanelItem.findFirst({
    where: { id: itemId, userId: user.id, projectId: id },
  })
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

  const updated = await prisma.agentPanelItem.update({
    where: { id: itemId },
    data: {
      ...(targetSection !== undefined && { targetSection }),
      ...(addedToLatex !== undefined && { addedToLatex }),
      ...(sharedToChat !== undefined && { sharedToChat }),
    },
  })

  return NextResponse.json(updated)
}
