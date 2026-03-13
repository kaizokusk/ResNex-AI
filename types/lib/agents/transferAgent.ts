// lib/agents/transferAgent.ts — converts content to LaTeX and pushes to file tree

import { Agent, AgentInput, AgentOutput } from './types'
import { toLatexGraphicPath } from '../latex-assets'
import { callLLM } from '../llm'

export interface TransferInput {
  content: string
  contentType: 'text' | 'image' | 'table' | 'equation'
  targetSection?: string
  fileName?: string   // for image: the filename to use in \includegraphics
}

export interface TransferOutput {
  latex: string
  label?: string
}

// ──────────────────────────────────────────────────────────────────────
// Conversion functions
// ──────────────────────────────────────────────────────────────────────

function textToLatex(content: string, targetSection?: string): string {
  const trimmed = content.trim()
  // If it looks like a heading, make it a subsection; otherwise a paragraph
  if (targetSection) {
    return `\\paragraph{${targetSection}}\n${trimmed}\n`
  }
  return `\\paragraph{}\n${trimmed}\n`
}

function imageToLatex(fileUrl: string, fileName: string, targetSection?: string): string {
  const baseName = fileName.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '')
  const label = `fig:${baseName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`
  const caption = targetSection ? `${targetSection} figure` : baseName

  return `\\begin{figure}[htbp]
  \\centering
  \\includegraphics[width=0.8\\textwidth]{${toLatexGraphicPath(`figures/${fileName}`)}}
  \\caption{${caption}}
  \\label{${label}}
\\end{figure}\n`
}

function tableToLatex(csvContent: string, targetSection?: string): string {
  const lines = csvContent.trim().split('\n').filter(Boolean)
  if (lines.length === 0) return '% Empty table\n'

  const rows = lines.map((line) =>
    line.split(',').map((cell) => cell.trim().replace(/&/g, '\\&'))
  )
  const colCount = Math.max(...rows.map((r) => r.length))
  const colSpec = Array(colCount).fill('l').join(' | ')

  const header = rows[0].join(' & ') + ' \\\\'
  const dataRows = rows.slice(1).map((r) => {
    // Pad row to colCount
    while (r.length < colCount) r.push('')
    return r.join(' & ') + ' \\\\'
  })

  const caption = targetSection ? `${targetSection} data` : 'Data'
  const label = `tab:${(targetSection || 'table').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`

  return `\\begin{table}[htbp]
  \\centering
  \\caption{${caption}}
  \\label{${label}}
  \\begin{tabular}{${colSpec}}
    \\toprule
    ${header}
    \\midrule
    ${dataRows.join('\n    ')}
    \\bottomrule
  \\end{tabular}
\\end{table}\n`
}

function equationToLatex(content: string): string {
  // Strip any existing $$ or \begin{equation} wrappers
  const stripped = content
    .replace(/^\$\$?/, '')
    .replace(/\$\$?$/, '')
    .replace(/\\begin\{equation\}/, '')
    .replace(/\\end\{equation\}/, '')
    .trim()

  const label = `eq:${Date.now()}`
  return `\\begin{equation}
  ${stripped}
  \\label{${label}}
\\end{equation}\n`
}

// ──────────────────────────────────────────────────────────────────────
// Main export
// ──────────────────────────────────────────────────────────────────────

export async function transferConvert(input: TransferInput): Promise<TransferOutput> {
  const { content, contentType, targetSection, fileName } = input

  switch (contentType) {
    case 'image': {
      const name = fileName || 'figure.png'
      // content is the file URL
      const latex = imageToLatex(content, name, targetSection)
      const label = `fig:${name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`
      return { latex, label }
    }

    case 'table': {
      const latex = tableToLatex(content, targetSection)
      const label = `tab:${(targetSection || 'table').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`
      return { latex, label }
    }

    case 'equation': {
      const latex = equationToLatex(content)
      return { latex }
    }

    case 'text':
    default: {
      // Use LLM for better text → LaTeX conversion
      const prompt = `Convert this text to clean LaTeX. Output ONLY the LaTeX snippet with no explanations.
${targetSection ? `It belongs in the "${targetSection}" section.` : ''}
Use \\paragraph or \\subsection as appropriate. Preserve meaning exactly.

TEXT:
${content.slice(0, 2000)}`

      const latex = await callLLM({
        system: 'You are a LaTeX formatter. Output only valid LaTeX code snippets.',
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 1500,
      })
      return { latex: latex.trim() + '\n' }
    }
  }
}

// ──────────────────────────────────────────────────────────────────────
// Chat Agent wrapper
// ──────────────────────────────────────────────────────────────────────

export const transferAgent: Agent = {
  id: 'transfer',
  name: 'Transfer Agent',
  description: 'Converts chat content to LaTeX and pushes it to the file tree. Use /transfer in chat.',

  async run(input: AgentInput): Promise<AgentOutput> {
    const lastMsg = input.messages.filter((m) => m.role === 'user').slice(-1)[0]?.content || ''
    const targetSection = input.context?.targetSection as string | undefined

    const { latex } = await transferConvert({ content: lastMsg, contentType: 'text', targetSection })

    return {
      reply: `Converted to LaTeX:\n\`\`\`latex\n${latex}\`\`\``,
      metadata: { latex, targetSection },
    }
  },
}
