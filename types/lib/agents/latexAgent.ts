// lib/agents/latexAgent.ts — LatexArchitect agent
// sync(): builds main.tex + refs.bib from approved sections + papers
// debug(): reads compiler log and suggests fixes
// Also exported as a chat Agent for slash command use

import { Agent, AgentInput, AgentOutput } from './types'
import { callLLM } from '../llm'

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

export interface SyncInput {
  sections: {
    subtopic: string
    content: string   // TipTap JSON string or plain text
    member?: { full_name: string }
  }[]
  papers: {
    title: string
    authors: string[]
    year?: number | null
    doi?: string | null
    arxivId?: string | null
    url?: string | null
    abstract?: string | null
  }[]
  projectId: string
  projectTitle?: string
  projectTopic?: string
  members?: { full_name: string }[]
  template?: 'ieee' | 'acm' | 'generic'
}

export interface SyncOutput {
  mainTex: string
  refsBib: string
}

export interface DebugInput {
  logs: string
  mainTex: string
}

export interface DebugOutput {
  suggestions: { line: number; issue: string; fix: string }[]
  fixedTex?: string
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function extractPlainText(content: string): string {
  // If it looks like TipTap JSON, extract text nodes
  if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(content)
      return extractTextFromTipTap(parsed)
    } catch {
      // fall through to plain text
    }
  }
  return content
}

function extractTextFromTipTap(node: any): string {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (node.text) return node.text
  if (node.content && Array.isArray(node.content)) {
    return node.content.map(extractTextFromTipTap).join('\n')
  }
  return ''
}

function sanitizeLatex(text: string): string {
  return text
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\^/g, '\\^{}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/</g, '\\textless{}')
    .replace(/>/g, '\\textgreater{}')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\\/g, '\\textbackslash{}')
}

function sectionToLatex(subtopic: string, content: string): string {
  const plain = extractPlainText(content)
  const safeSubtopic = sanitizeLatex(subtopic)

  // Split into paragraphs
  const paragraphs = plain
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter(Boolean)

  const body = paragraphs.join('\n\n')
  return `\\section{${safeSubtopic}}\n\n${body}\n`
}

function paperToBibtex(paper: SyncInput['papers'][number], index: number): string {
  const key = paper.arxivId
    ? `arxiv${paper.arxivId.replace(/\./g, '')}`
    : paper.doi
    ? `doi${paper.doi.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`
    : `ref${index + 1}`

  const authors = paper.authors.length > 0 ? paper.authors.join(' and ') : 'Unknown'
  const year = paper.year ?? new Date().getFullYear()
  const title = (paper.title || 'Untitled').replace(/[{}]/g, '')

  let entry = `@article{${key},\n`
  entry += `  author = {${authors}},\n`
  entry += `  title  = {${title}},\n`
  entry += `  year   = {${year}},\n`
  if (paper.doi) entry += `  doi    = {${paper.doi}},\n`
  if (paper.arxivId) entry += `  note   = {arXiv:${paper.arxivId}},\n`
  if (paper.url) entry += `  url    = {${paper.url}},\n`
  entry += `}`
  return entry
}

// ──────────────────────────────────────────────────────────────────────
// Sync
// ──────────────────────────────────────────────────────────────────────

export async function latexSync(input: SyncInput): Promise<SyncOutput> {
  const { sections, papers, projectTitle = 'Research Paper', projectTopic = '', members = [], template = 'generic' } = input

  const authorList = members.length > 0
    ? members.map((m) => m.full_name).join(' \\and ')
    : 'Author'

  const sectionBlocks = sections
    .map((s) => sectionToLatex(s.subtopic, s.content))
    .join('\n\n')

  const hasBib = papers.length > 0
  const bibLine = hasBib ? '\\bibliography{refs}' : ''
  const bibStyleLine = hasBib ? '\\bibliographystyle{plain}' : ''

  const mainTex = `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{hyperref}
\\usepackage{graphicx}
\\usepackage{amsmath}
\\usepackage{booktabs}
${hasBib ? '\\usepackage{natbib}' : ''}

\\title{${sanitizeLatex(projectTitle)}}
\\author{${authorList}}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{abstract}
${sanitizeLatex(projectTopic)}
\\end{abstract}

${sectionBlocks}

${bibStyleLine}
${bibLine}

\\end{document}
`

  const refsBib = hasBib
    ? papers.map((p, i) => paperToBibtex(p, i)).join('\n\n')
    : ''

  return { mainTex: mainTex.trim(), refsBib }
}

// ──────────────────────────────────────────────────────────────────────
// Debug
// ──────────────────────────────────────────────────────────────────────

export async function latexDebug(input: DebugInput): Promise<DebugOutput> {
  const prompt = `You are a LaTeX expert. Analyze this compiler log and suggest fixes.

COMPILER LOG:
${input.logs.slice(0, 3000)}

Return a JSON object with this shape:
{
  "suggestions": [
    { "line": <number or 0 if unknown>, "issue": "<what is wrong>", "fix": "<how to fix it>" }
  ]
}
Return ONLY valid JSON.`

  const raw = await callLLM({
    system: 'You are a LaTeX compiler expert. Output only valid JSON.',
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 1500,
  })

  try {
    const parsed = JSON.parse(raw)
    return { suggestions: parsed.suggestions ?? [] }
  } catch {
    return { suggestions: [{ line: 0, issue: 'Could not parse log', fix: 'Check the raw log for error lines starting with !' }] }
  }
}

// ──────────────────────────────────────────────────────────────────────
// Chat Agent wrapper (for /latex slash command in chat)
// ──────────────────────────────────────────────────────────────────────

export const latexAgent: Agent = {
  id: 'latex',
  name: 'LaTeX Architect',
  description: 'Helps structure and fix LaTeX documents. Use /latex or @latex in chat.',

  async run(input: AgentInput): Promise<AgentOutput> {
    const lastMessage = input.messages.filter((m) => m.role === 'user').slice(-1)[0]?.content || ''

    const reply = await callLLM({
      system: `You are a LaTeX expert helping researchers format their academic paper.
Answer questions about LaTeX syntax, packages, and formatting.
If given a code snippet with errors, provide the corrected version.
Keep answers concise and include code examples where helpful.`,
      messages: [{ role: 'user', content: lastMessage }],
      maxTokens: 1500,
    })

    return { reply }
  },
}
