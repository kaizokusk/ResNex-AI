// lib/agents/writingAssistantAgent.ts
// Suggests notebook cells for a given section using project context

import { callLLM } from '../llm'
import { Cell } from '../cell-types'

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export interface SuggestInput {
  projectId: string
  projectTitle: string
  projectTopic: string
  sectionName: string        // e.g. "Introduction"
  templateLabel: string      // e.g. "NeurIPS"
  sectionDescription: string // from template registry
  wordTarget: number
  completedSections: { name: string; textSummary: string }[]
  papers: { title: string; abstract?: string }[]
}

export async function suggestSection(input: SuggestInput): Promise<Cell[]> {
  const papersBlock = input.papers.length
    ? input.papers.slice(0, 5).map((p) => `- ${p.title}${p.abstract ? ': ' + p.abstract.slice(0, 150) + '…' : ''}`).join('\n')
    : 'No papers in library yet.'

  const doneBlock = input.completedSections.length
    ? input.completedSections.map((s) => `${s.name}: ${s.textSummary.slice(0, 200)}`).join('\n')
    : 'None yet.'

  const prompt = `You are a research writing assistant. Generate content for the "${input.sectionName}" section of a ${input.templateLabel} paper.

Paper: "${input.projectTitle}"
Topic: ${input.projectTopic}
Section goal: ${input.sectionDescription}
Target length: ~${input.wordTarget} words

Already written sections:
${doneBlock}

Reference papers:
${papersBlock}

Return a JSON array of cell objects. Each cell must have "type" and relevant fields.
Allowed types and their required fields:
- { "type": "text", "content": "..." }
- { "type": "heading", "level": 2, "content": "..." }
- { "type": "heading", "level": 3, "content": "..." }
- { "type": "citation", "keys": ["AuthorYear"], "context": "optional sentence" }

Rules:
- Write in academic third-person English
- Use "text" cells for prose paragraphs (keep each ~100–150 words)
- Use "heading" level 2 for subsections
- Add "citation" cells where references would naturally appear (use placeholder keys like "Author2023")
- Do NOT include figure or table cells (user adds those manually)
- Return ONLY valid JSON array, no markdown, no explanation

Example output:
[
  {"type":"text","content":"Deep learning has revolutionised..."},
  {"type":"heading","level":2,"content":"Motivation"},
  {"type":"text","content":"Despite recent advances..."},
  {"type":"citation","keys":["Smith2020"],"context":"as demonstrated by prior work"}
]`

  const raw = await callLLM({
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 2000,
  })

  try {
    // Extract JSON array from response
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return fallbackCells(input.sectionName)
    const parsed = JSON.parse(match[0])
    if (!Array.isArray(parsed)) return fallbackCells(input.sectionName)

    // Attach IDs and validate
    return parsed
      .filter((c: any) => c.type && typeof c.type === 'string')
      .map((c: any) => ({ ...c, id: genId() })) as Cell[]
  } catch {
    return fallbackCells(input.sectionName)
  }
}

function fallbackCells(sectionName: string): Cell[] {
  return [
    { id: genId(), type: 'text', content: `Write your ${sectionName} section here.` },
  ]
}

/** Extract plain text summary from a section's cells for context */
export function extractTextSummary(cellsJson: string | null): string {
  if (!cellsJson) return ''
  try {
    const doc = JSON.parse(cellsJson)
    const cells: Cell[] = doc.cells ?? []
    return cells
      .filter((c) => c.type === 'text' || c.type === 'heading')
      .map((c) => (c as any).content ?? '')
      .join(' ')
      .slice(0, 300)
  } catch {
    return ''
  }
}
