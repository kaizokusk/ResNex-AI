// lib/agents/writerAgent.ts
// Literature review writer — ported from ResNex-AI writer.py

import { Agent, AgentInput, AgentOutput } from './types'
import { callLLM, parseJsonResponse } from '../llm'

const SYSTEM_PROMPT = `You are a research writing assistant. Given paper summaries and evidence chunks, draft a literature review section.

Respond in JSON format:
{
  "title": "Section title",
  "content": "The full literature review section text with inline citations like [Paper Title, Year]",
  "citations": [
    {
      "document_id": "id",
      "document_title": "title",
      "citation_key": "AuthorYear"
    }
  ]
}

Guidelines:
- Write in academic style
- Compare and synthesize across papers, don't just summarize each one sequentially
- Use inline citations referencing the paper titles
- Highlight agreements, disagreements, and gaps
- Be thorough but concise (aim for 400-800 words)`

export const writerAgent: Agent = {
  id: 'writer',
  name: 'Literature Review Writer',
  description: 'Drafts a literature review section from your paper library',

  async run(input: AgentInput): Promise<AgentOutput> {
    const { papers = [], topic = '' } = input.context

    let papersText = ''
    for (const p of papers) {
      const s = p.summary || {}
      papersText += `\n--- ${p.title} (ID: ${p.id}) ---\n`
      papersText += `  problem_statement: ${s.problem_statement || 'N/A'}\n`
      papersText += `  methodology: ${s.methodology || 'N/A'}\n`
      papersText += `  findings: ${s.findings || 'N/A'}\n`
      papersText += `  limitations: ${s.limitations || 'N/A'}\n`
      papersText += `  summary: ${s.summary_short || p.abstract || 'N/A'}\n`
    }

    const userMsg = `Topic/focus: ${topic || 'General literature review'}\n\nPaper summaries:\n${papersText}\n\nDraft a related work / literature review section.`

    const raw = await callLLM({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
      language: input.language,
      maxTokens: 4096,
    })

    let parsed: any
    try {
      parsed = parseJsonResponse(raw)
    } catch {
      return { reply: raw }
    }

    return {
      reply: parsed.content || raw,
      metadata: { title: parsed.title, citations: parsed.citations },
    }
  },
}
