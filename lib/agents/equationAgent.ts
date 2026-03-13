import { callPix2Tex } from '@/lib/equation-ocr'
import type { AgentInput, AgentOutput } from './orchestratorAgent'

export async function equationAgent(input: AgentInput): Promise<AgentOutput> {
  const imageUrl = input.attachments[0]?.url || input.message
  const latex = await callPix2Tex(imageUrl)
  return {
    latex: `\\begin{equation}\n  ${latex}\n\\end{equation}`,
    action: 'equation_image',
    targetSection: 'methodology',
    confidence: 0.9
  }
}
