import { callLLM, parseJsonResponse } from '../llm'
import { CellType } from '../cell-types'

export interface LatexAutofillContext {
  projectTitle: string
  projectTopic: string
  projectDescription?: string
  sectionName: string
  cellType: CellType
  currentValue: string
  currentCellSummary: string
  nearbySectionContext: string
  otherSectionsContext: string
  fileTreeContext: string
  paperContext: string
  pdfContext: string
}

export interface LatexAutofillResult {
  content?: string
  formula?: string
  label?: string
  keys?: string[]
  context?: string
}

function tryParseLooseJson(raw: string): LatexAutofillResult | null {
  try {
    return parseJsonResponse<LatexAutofillResult>(raw)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0]) as LatexAutofillResult
    } catch {
      return null
    }
  }
}

function responseShape(cellType: CellType): string {
  switch (cellType) {
    case 'text':
    case 'heading':
    case 'note':
      return '{ "content": "..." }'
    case 'equation':
      return '{ "formula": "...", "label": "optional" }'
    case 'citation':
      return '{ "keys": ["Key2024"], "context": "optional sentence" }'
    default:
      return '{ "content": "..." }'
  }
}

function cellSpecificRules(cellType: CellType): string {
  switch (cellType) {
    case 'text':
      return [
        '- Return one polished academic paragraph or short multi-paragraph block for this cell only.',
        '- Keep factual claims grounded in the provided references.',
        '- Do not add section headings, bullet lists, or markdown.',
        '- Output plain text suitable for later LaTeX conversion.',
      ].join('\n')
    case 'heading':
      return [
        '- Return a concise heading title only.',
        '- Do not include numbering, punctuation, markdown, or LaTeX commands.',
      ].join('\n')
    case 'note':
      return [
        '- Return a private working note for the author, not final paper prose.',
        '- Keep it actionable and concise.',
      ].join('\n')
    case 'equation':
      return [
        '- Return only LaTeX math in "formula". Do not wrap it in $...$ or an equation environment.',
        '- Use "label" only if a stable reference name is useful.',
      ].join('\n')
    case 'citation':
      return [
        '- Return likely BibTeX keys as placeholders if exact keys are unknown.',
        '- Use "context" for the sentence that the citation cell should attach to.',
      ].join('\n')
    default:
      return '- Return content for this cell only.'
  }
}

function cleanResult(cellType: CellType, raw: LatexAutofillResult): LatexAutofillResult {
  switch (cellType) {
    case 'text':
    case 'heading':
    case 'note':
      return { content: (raw.content || '').trim() }
    case 'equation':
      return {
        formula: (raw.formula || '').trim(),
        label: raw.label?.trim() || undefined,
      }
    case 'citation':
      return {
        keys: Array.isArray(raw.keys)
          ? raw.keys.map((k) => String(k).trim()).filter(Boolean).slice(0, 8)
          : [],
        context: raw.context?.trim() || undefined,
      }
    default:
      return raw
  }
}

function fallbackResult(cellType: CellType, currentValue: string): LatexAutofillResult {
  const trimmed = currentValue.trim()
  switch (cellType) {
    case 'text':
    case 'heading':
    case 'note':
      return { content: trimmed }
    case 'equation':
      return { formula: trimmed }
    case 'citation':
      return { keys: [], context: trimmed || undefined }
    default:
      return { content: trimmed }
  }
}

function rawTextFallback(cellType: CellType, raw: string, currentValue: string): LatexAutofillResult {
  const cleaned = raw.replace(/```(?:json)?/g, '').trim()
  if (!cleaned) return fallbackResult(cellType, currentValue)

  switch (cellType) {
    case 'text':
    case 'heading':
    case 'note':
      return { content: cleaned }
    case 'equation':
      return { formula: cleaned }
    case 'citation':
      return { keys: [], context: cleaned }
    default:
      return fallbackResult(cellType, currentValue)
  }
}

export async function autofillLatexCell(input: LatexAutofillContext): Promise<LatexAutofillResult> {
  const system = `You are an in-editor research writing assistant for a collaborative LaTeX workspace.
You are filling exactly one notebook cell, not an entire section.
Use the user's existing text as the primary intent signal and use the provided project references to ground or refine the output.
If the references are insufficient for a factual claim, stay conservative.
Return ONLY valid JSON matching this shape:
${responseShape(input.cellType)}`

  const prompt = [
    `Project title: ${input.projectTitle}`,
    `Project topic: ${input.projectTopic}`,
    `Project description: ${input.projectDescription || 'Not provided'}`,
    `Section: ${input.sectionName}`,
    `Cell type: ${input.cellType}`,
    '',
    'Current cell seed:',
    input.currentCellSummary || '(empty)',
    '',
    'Nearby cells in this section:',
    input.nearbySectionContext || 'None',
    '',
    'Other section summaries:',
    input.otherSectionsContext || 'None',
    '',
    'Relevant LaTeX/file-tree files:',
    input.fileTreeContext || 'None',
    '',
    'Project papers:',
    input.paperContext || 'None',
    '',
    'Relevant PDF passages from indexed uploads:',
    input.pdfContext || 'None',
    '',
    'Rules:',
    cellSpecificRules(input.cellType),
  ].join('\n')

  try {
    const raw = await callLLM({
      system,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 1200,
    })
    const parsed = tryParseLooseJson(raw)
    if (parsed) return cleanResult(input.cellType, parsed)
    return cleanResult(input.cellType, rawTextFallback(input.cellType, raw, input.currentValue))
  } catch (err: any) {
    throw new Error(err?.message || 'AI autofill failed')
  }
}
