// lib/agents/latexConversionAgent.ts
// Converts SectionDoc cell JSON → LaTeX string
// Then assembles main.tex from template skeleton + converted sections

import { callLLM } from '../llm'
import { Cell, SectionDoc } from '../cell-types'
import { toLatexGraphicPath } from '../latex-assets'
import { LatexTemplate } from '../latex-templates'

// ─── Public API ─────────────────────────────────────────────────────────────

export async function convertCells(
  cells: Cell[],
  sectionName: string,
): Promise<string> {
  const parts: string[] = []

  for (const cell of cells) {
    const latex = await cellToLatex(cell, sectionName)
    if (latex) parts.push(latex)
  }

  return parts.join('\n\n')
}

export function assembleMainTex(
  skeleton: string,
  sectionContents: Record<string, string>, // { 'introduction': '...latex...' }
): string {
  let result = skeleton
  for (const [name, content] of Object.entries(sectionContents)) {
    result = result.replace(`%%SECTION:${name}%%`, content)
  }
  // Remove any unreplaced placeholders (sections with no content)
  result = result.replace(/%%SECTION:[^%]+%%/g, '% (section not written yet)')
  return result
}

// ─── Cell → LaTeX ────────────────────────────────────────────────────────────

export async function cellToLatex(cell: Cell, sectionName: string): Promise<string> {
  switch (cell.type) {
    case 'note':
      return '' // private — excluded entirely

    case 'heading':
      return cell.level === 2
        ? `\\subsection{${escapeLatex(cell.content)}}`
        : `\\subsubsection{${escapeLatex(cell.content)}}`

    case 'figure': {
      if (!cell.fileName) return ''
      const cap = escapeLatex(cell.caption || '')
      const label = `fig:${cell.id.slice(0, 8)}`
      return [
        '\\begin{figure}[h]',
        '\\centering',
        `\\includegraphics[width=0.9\\linewidth]{${toLatexGraphicPath(cell.fileName)}}`,
        `\\caption{${cap}}`,
        `\\label{${label}}`,
        '\\end{figure}',
      ].join('\n')
    }

    case 'table': {
      // tabularx auto-expands columns to fill line width (inspired by ai-latex-editor)
      const cols = `{\\linewidth}{${cell.headers.map(() => 'X').join(' ')}}`
      const headerRow = cell.headers.map(escapeLatex).join(' & ') + ' \\\\'
      const dataRows = cell.rows.map((r) => r.map(escapeLatex).join(' & ') + ' \\\\').join('\n')
      const cap = escapeLatex(cell.caption || '')
      const label = `tab:${cell.id.slice(0, 8)}`
      return [
        '\\begin{table}[h]',
        '\\centering',
        `\\caption{${cap}}`,
        `\\label{${label}}`,
        `\\begin{tabularx}${cols}`,
        '\\toprule',
        headerRow,
        '\\midrule',
        dataRows,
        '\\bottomrule',
        '\\end{tabularx}',
        '\\end{table}',
      ].join('\n')
    }

    case 'equation': {
      const label = cell.label ? `\n\\label{${cell.label}}` : ''
      // Use align for multi-line equations (containing \\), equation for single-line
      const env = cell.formula.includes('\\\\') ? 'align' : 'equation'
      return `\\begin{${env}}${label}\n${cell.formula}\n\\end{${env}}`
    }

    case 'citation': {
      if (!cell.keys.length) return ''
      const cite = `\\cite{${cell.keys.join(', ')}}`
      return cell.context ? `${escapeLatex(cell.context)} ${cite}.` : cite
    }

    case 'text': {
      if (!cell.content.trim()) return ''
      // LLM pass: clean grammar + escape LaTeX special chars
      try {
        const cleaned = await cleanTextForLatex(cell.content)
        return cleaned
      } catch {
        return escapeLatex(cell.content)
      }
    }

    default:
      return ''
  }
}

// ─── LLM text pass ───────────────────────────────────────────────────────────

async function cleanTextForLatex(text: string): Promise<string> {
  // For short text, just escape — avoid LLM call overhead
  if (text.trim().length < 60) return escapeLatex(text)

  const result = await callLLM({
    messages: [{
      role: 'user',
      content: `Convert the following plain English academic text to clean LaTeX paragraphs.
Escape all special characters (%, &, $, #, ~, _ when not in math mode, ^ when not in math mode).
Do not add any \\section, \\subsection, or other structural commands.
Do not add \\begin or \\end environments.
Output only the LaTeX paragraph text, no explanation.

Text:
${text}`,
    }],
    maxTokens: 600,
  })
  return result.trim()
}

// ─── Utility ────────────────────────────────────────────────────────────────

export function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/%/g, '\\%')
    .replace(/&/g, '\\&')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
}

/** Parse SectionDoc JSON safely */
export function parseSectionDoc(content: string | null): Cell[] {
  if (!content) return []
  try {
    const doc: SectionDoc = JSON.parse(content)
    return doc.cells ?? []
  } catch {
    return []
  }
}
