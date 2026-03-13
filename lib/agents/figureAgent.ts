import { callInternVL2 } from '@/lib/llm/internvl'
import { prisma } from '@/lib/prisma'
import { sanitizeLatexAssetFileName } from '@/lib/latex-assets'
import type { AgentInput, AgentOutput } from './orchestratorAgent'

async function getNextFigureIndex(projectId: string): Promise<number> {
  const doc = await prisma.latexDocument.findUnique({ where: { project_id: projectId } })
  return ((doc?.figures as any[])?.length || 0) + 1
}

export async function figureAgent(input: AgentInput): Promise<AgentOutput> {
  const attachment = input.attachments[0]
  const imageUrl = attachment.url
  const caption = await callInternVL2(imageUrl, 'Describe this graph or figure in one concise academic sentence.')
  const figureIndex = await getNextFigureIndex(input.projectId)
  // Use sanitized local path — not the CDN URL — so LaTeX compilation can resolve the file
  const localPath = sanitizeLatexAssetFileName(`figures/${attachment.fileName}`)
  const latex = `\\begin{figure}[h]\n  \\centering\n  \\includegraphics[width=0.8\\linewidth]{${localPath}}\n  \\caption{${caption}}\n  \\label{fig:${figureIndex}}\n\\end{figure}`
  return {
    latex,
    action: 'figure_upload',
    targetSection: 'experiments',
    confidence: 0.8
  }
}
