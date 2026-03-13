// lib/agents/researchSearchAgent.ts
// Feature 2: Personal AI agent with arXiv search, web search, and RAG over uploaded docs

import { Agent, AgentInput, AgentOutput } from './types'
import { callLLM } from '../llm'
import { searchDocuments } from '../semanticSearch'

// ---------------------------------------------------------------------------
// arXiv Atom XML parser
// ---------------------------------------------------------------------------
interface ArxivEntry {
  title: string
  authors: string[]
  abstract: string
  url: string
  published: string
}

function parseArxivXml(xml: string): ArxivEntry[] {
  const entries: ArxivEntry[] = []
  const entryBlocks = xml.match(/<entry>([\s\S]*?)<\/entry>/g) || []

  for (const block of entryBlocks) {
    const title = (block.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.trim() || ''
    const abstract = (block.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1]?.trim() || ''
    const url = (block.match(/<id>([\s\S]*?)<\/id>/) || [])[1]?.trim() || ''
    const published = (block.match(/<published>([\s\S]*?)<\/published>/) || [])[1]?.trim() || ''
    const authorMatches = block.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g)
    const authors = Array.from(authorMatches).map((m) => m[1].trim())

    entries.push({ title, authors, abstract, url, published })
  }

  return entries
}

// ---------------------------------------------------------------------------
// arXiv search (server-side to avoid CORS)
// ---------------------------------------------------------------------------
export async function searchArxiv(query: string, maxResults = 5): Promise<ArxivEntry[]> {
  const encoded = encodeURIComponent(query)
  const url = `http://export.arxiv.org/api/query?search_query=all:${encoded}&max_results=${maxResults}`

  const res = await fetch(url, { headers: { 'User-Agent': 'ResearchCollab/1.0' } })
  if (!res.ok) throw new Error(`arXiv API error: ${res.status}`)

  const xml = await res.text()
  return parseArxivXml(xml)
}

// ---------------------------------------------------------------------------
// Web search via DuckDuckGo Instant Answer API (free, no key required)
// ---------------------------------------------------------------------------
interface WebResult {
  title: string
  url: string
  snippet: string
}

export function shouldUseLiveSearch(query: string): boolean {
  return /\b(latest|recent|current|today|new|news|updated|update|trend|trends|202[4-9]|20[3-9]\d|who is|what is happening|state of the art|best model|best paper|benchmark)\b/i.test(query)
}

function shouldSearchArxiv(query: string): boolean {
  return /\b(paper|papers|study|studies|research|arxiv|preprint|publication|published|benchmark|dataset|method|methodology|model)\b/i.test(query)
}

async function buildLiveSearchContext(query: string): Promise<string> {
  const contextParts: string[] = []

  try {
    const webResults = await searchWeb(query)
    if (webResults.length > 0) {
      contextParts.push(
        'Live web search results:\n' +
          webResults
            .map((r, i) => `[Web ${i + 1}] ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`)
            .join('\n\n')
      )
    }
  } catch (err) {
    console.warn('[researchSearchAgent] web search failed:', err)
  }

  if (shouldSearchArxiv(query)) {
    try {
      const arxivResults = await searchArxiv(query, 3)
      if (arxivResults.length > 0) {
        contextParts.push(
          'Live arXiv results:\n' +
            arxivResults
              .map(
                (r, i) =>
                  `[arXiv ${i + 1}] ${r.title}\nAuthors: ${r.authors.join(', ')}\nPublished: ${r.published}\nURL: ${r.url}\nAbstract: ${r.abstract}`
              )
              .join('\n\n')
        )
      }
    } catch (err) {
      console.warn('[researchSearchAgent] arXiv search failed:', err)
    }
  }

  return contextParts.join('\n\n')
}

export async function searchWeb(query: string): Promise<WebResult[]> {
  const serpKey = process.env.SERPAPI_KEY
  if (serpKey) {
    // Use SerpAPI if key is available
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${serpKey}&num=5`
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      return (data.organic_results || []).slice(0, 5).map((r: any) => ({
        title: r.title,
        url: r.link,
        snippet: r.snippet || '',
      }))
    }
  }

  // Fallback: DuckDuckGo Instant Answer API
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1`
  const res = await fetch(url)
  if (!res.ok) return []

  const data = await res.json()
  const results: WebResult[] = []

  if (data.AbstractText) {
    results.push({ title: data.Heading || query, url: data.AbstractURL || '', snippet: data.AbstractText })
  }

  for (const item of (data.RelatedTopics || []).slice(0, 4)) {
    if (item.Text && item.FirstURL) {
      results.push({ title: item.Text.substring(0, 80), url: item.FirstURL, snippet: item.Text })
    }
  }

  return results.slice(0, 5)
}

// ---------------------------------------------------------------------------
// Agent definition
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are a personal AI research assistant for a STEM student.
You help find, explain, and synthesize academic information.
When given search results or document passages, cite them properly.
Format citations as: [Author et al., Year], [Web 1], or [Source: filename].
If live search results are present, prefer them for time-sensitive or current-information questions.
If no live results are available for a current-events question, say that clearly instead of pretending certainty.`

export const researchSearchAgent: Agent = {
  id: 'research-search',
  name: 'Personal Research Agent',
  description: 'Conversational research agent with arXiv/web search and RAG over uploaded PDFs.',

  async run(input: AgentInput): Promise<AgentOutput> {
    const { messages, context, language } = input
    const { projectId, mode = 'chat' } = context
    const lastUserMsg = messages.filter((m) => m.role === 'user').slice(-1)[0]?.content || ''

    // For chat mode: prepend relevant PDF passages (RAG)
    let ragContext = ''
    if (projectId && mode === 'chat') {
      if (lastUserMsg) {
        const passages = await searchDocuments(projectId, lastUserMsg, 3)
        if (passages.length > 0) {
          ragContext =
            'Relevant passages from uploaded documents:\n' +
            passages
              .map((p) => `[Source: ${p.fileName} | similarity: ${p.similarity.toFixed(2)}]\n${p.content}`)
              .join('\n\n') +
            '\n\n'
        }
      }
    }

    let liveSearchContext = ''
    if (lastUserMsg && shouldUseLiveSearch(lastUserMsg)) {
      liveSearchContext = await buildLiveSearchContext(lastUserMsg)
    }

    const contextBlocks = [SYSTEM_PROMPT]
    if (ragContext) contextBlocks.push(ragContext)
    if (liveSearchContext) contextBlocks.push(liveSearchContext)

    const systemWithRAG = contextBlocks.join('\n\n')

    const reply = await callLLM({ messages, system: systemWithRAG, language })
    return { reply }
  },
}
