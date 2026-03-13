import { classifyInput } from './classifier'
import { equationAgent } from './equationAgent'
import { tableAgent } from './tableAgent'
import { figureAgent } from './figureAgent'
import { citationAgent } from './citationAgent'
import { textAgent } from './textAgent'
import { prisma } from '@/lib/prisma'
import { routeToAgent, type LatexAssetRef } from './sectionRouter'
import { callDeepseekV3 } from '@/lib/llm/deepseek'

export type AgentInput = {
  message: string
  attachments: { url: string; type: 'image' | 'pdf' | 'csv'; fileName: string }[]
  projectId: string
  userId: string
  previousItems: any[]
  requestedAction?: string
}

export type AgentOutput = {
  latex: string
  action: string
  targetSection: string
  confidence: number
}

export type SectionAgentInput = {
  section: string
  userInstruction: string
  referencedAssets: LatexAssetRef[]
  existingContent: string
  projectContext: Record<string, string>
  projectId: string
  userId: string
}

export type SectionAgentOutput = {
  content: string
  contentType: 'tiptap' | 'latex'
  action: string
  latex: string
}

export async function orchestratorAgent(input: AgentInput): Promise<AgentOutput> {
  const agentType = await classifyInput(input)
  let result: AgentOutput
  switch (agentType) {
    case 'equation': result = await equationAgent(input); break
    case 'table': result = await tableAgent(input); break
    case 'figure': result = await figureAgent(input); break
    case 'citation': result = await citationAgent(input); break
    default: result = await textAgent(input); break
  }
  await prisma.agentPanelItem.create({
    data: {
      projectId: input.projectId,
      userId: input.userId,
      action: result.action,
      sourceMessage: input.message,
      result: result.latex,
      context: input.previousItems.map(i => ({ action: i.action, result: (i.result || '').slice(0, 100) })),
      targetSection: result.targetSection,
      sharedToChat: false,
      addedToLatex: false,
    }
  })
  return result
}

export async function sectionOrchestrator(input: SectionAgentInput): Promise<SectionAgentOutput> {
  const agentType = routeToAgent(input.section, input.referencedAssets, input.userInstruction)

  // Build context from project
  const contextSummary = Object.entries(input.projectContext)
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${v.slice(0, 150)}`)
    .join('\n')

  // Map to AgentInput for sub-agents
  const agentInput: AgentInput = {
    message: input.userInstruction,
    attachments: input.referencedAssets.map(a => ({
      url: a.url,
      type: a.fileType as 'image' | 'pdf' | 'csv',
      fileName: a.fileName,
    })),
    projectId: input.projectId,
    userId: input.userId,
    previousItems: [],
    requestedAction: 'save_latex',
  }

  let agentResult: AgentOutput
  switch (agentType) {
    case 'equation': agentResult = await equationAgent(agentInput); break
    case 'table':    agentResult = await tableAgent(agentInput);    break
    case 'figure':   agentResult = await figureAgent(agentInput);   break
    case 'citation': agentResult = await citationAgent(agentInput); break
    default: {
      // For text agent in section context, add section + project context to the prompt
      const enrichedInput: AgentInput = {
        ...agentInput,
        message: `Section: ${input.section}\nInstruction: ${input.userInstruction}\n\nProject context:\n${contextSummary}\n\nExisting content in this section:\n${input.existingContent.slice(0, 300)}`,
      }
      agentResult = await textAgent(enrichedInput)
    }
  }

  // Log to AgentPanelItem for contributorship
  await prisma.agentPanelItem.create({
    data: {
      projectId: input.projectId,
      userId: input.userId,
      action: agentResult.action,
      sourceMessage: input.userInstruction,
      result: agentResult.latex,
      context: [],
      targetSection: input.section,
      sharedToChat: false,
      addedToLatex: true,
    }
  })

  return {
    content: agentResult.latex,
    contentType: 'latex',
    action: agentResult.action,
    latex: agentResult.latex,
  }
}
