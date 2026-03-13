// lib/agents/sectionRouter.ts — routes @agent calls inside LaTeX section blocks

export type AgentType = 'equation' | 'table' | 'figure' | 'citation' | 'text'

export interface LatexAssetRef {
  id: string
  fileType: string  // "image" | "csv" | "pdf"
  fileName: string
  url: string
}

export function routeToAgent(
  section: string,
  referencedAssets: LatexAssetRef[],
  userInstruction: string
): AgentType {
  const hasImage = referencedAssets.some(a => a.fileType === 'image')
  const hasCSV   = referencedAssets.some(a => a.fileType === 'csv')
  const hasPDF   = referencedAssets.some(a => a.fileType === 'pdf')
  const msg      = userInstruction.toLowerCase()

  // File-type rules (highest priority)
  if (hasImage && (msg.includes('equation') || msg.includes('formula'))) return 'equation'
  if (hasImage && (msg.includes('figure') || msg.includes('graph') || msg.includes('plot'))) return 'figure'
  if (hasCSV) return 'table'
  if (hasPDF) return 'citation'

  // Section-based defaults
  if (section === 'Methodology' && hasImage) return 'figure'
  if (section === 'Results' && hasCSV) return 'table'
  if (section === 'Related Work') return 'text'
  if (section === 'References') return 'citation'

  // Instruction keyword fallback
  if (msg.includes('equation') || msg.includes('formula')) return 'equation'
  if (msg.includes('table') || msg.includes('data')) return 'table'
  if (msg.includes('cite') || msg.includes('doi') || msg.includes('arxiv')) return 'citation'
  if (msg.includes('figure') || msg.includes('graph') || msg.includes('image')) return 'figure'

  return 'text'
}
