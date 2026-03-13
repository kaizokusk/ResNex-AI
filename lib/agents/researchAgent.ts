// lib/agents/researchAgent.ts
// Helps members write their section. Guides, does NOT write for them.

import { Agent, AgentInput, AgentOutput } from './types'
import { callLLM } from '../llm'
import { searchArxiv, searchWeb, shouldUseLiveSearch } from './researchSearchAgent'

const SYSTEM_PROMPT = `You are a research assistant helping a student write their section
on {subtopic} for a group project on {topic}.

Help them find information, structure arguments, and cite ideas.
Do NOT write the section for them — guide and suggest only.
If they ask you to write it for them, explain why you won't
and redirect to helping them think through their own ideas.

If live search results are provided, use them for current facts, statistics, and source suggestions.
If a question clearly needs updated information and no live results are available, say so plainly.`

export const researchAgent: Agent = {
  id: 'research',
  name: 'Research Assistant',
  description: 'Guides members in writing their section with web-search capability.',

  async run(input: AgentInput): Promise<AgentOutput> {
    const { messages, context, language } = input
    const { subtopic = 'your topic', topic = 'the project' } = context
    const lastUserMsg = messages.filter((m) => m.role === 'user').slice(-1)[0]?.content || ''

    let liveSearchContext = ''
    if (lastUserMsg && shouldUseLiveSearch(lastUserMsg)) {
      const contextParts: string[] = []

      try {
        const webResults = await searchWeb(lastUserMsg)
        if (webResults.length > 0) {
          contextParts.push(
            'Live web search results:\n' +
              webResults
                .map((r, i) => `[Web ${i + 1}] ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`)
                .join('\n\n')
          )
        }
      } catch (err) {
        console.warn('[researchAgent] web search failed:', err)
      }

      try {
        const arxivResults = await searchArxiv(lastUserMsg, 3)
        if (arxivResults.length > 0) {
          contextParts.push(
            'Relevant arXiv results:\n' +
              arxivResults
                .map(
                  (r, i) =>
                    `[arXiv ${i + 1}] ${r.title}\nAuthors: ${r.authors.join(', ')}\nPublished: ${r.published}\nURL: ${r.url}\nAbstract: ${r.abstract}`
                )
                .join('\n\n')
          )
        }
      } catch (err) {
        console.warn('[researchAgent] arXiv search failed:', err)
      }

      liveSearchContext = contextParts.join('\n\n')
    }

    const systemBase = SYSTEM_PROMPT
      .replace('{subtopic}', subtopic)
      .replace('{topic}', topic)
    const system = liveSearchContext ? `${systemBase}\n\n${liveSearchContext}` : systemBase

    const reply = await callLLM({ messages, system, language })
    return { reply }
  },
}
