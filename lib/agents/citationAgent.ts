import type { AgentInput, AgentOutput } from './orchestratorAgent'

function extractPaperId(message: string): { type: 'doi' | 'arxiv'; id: string } {
  const doiMatch = message.match(/doi:\s*(10\.\S+)/i)
  if (doiMatch) return { type: 'doi', id: doiMatch[1] }
  const arxivMatch = message.match(/arxiv\.org\/abs\/([\d.]+)/i) || message.match(/arxiv:\s*([\d.]+)/i)
  if (arxivMatch) return { type: 'arxiv', id: arxivMatch[1] }
  throw new Error('No DOI or arXiv ID found in message')
}

async function fetchPaperMetadata(id: { type: string; id: string }) {
  const url = id.type === 'arxiv'
    ? `https://api.semanticscholar.org/graph/v1/paper/arXiv:${id.id}?fields=title,authors,year,externalIds`
    : `https://api.semanticscholar.org/graph/v1/paper/${id.id}?fields=title,authors,year,externalIds`
  const res = await fetch(url)
  const data = await res.json()
  return {
    title: data.title,
    authors: data.authors?.map((a: any) => a.name) || [],
    year: data.year,
    firstAuthorLastName: data.authors?.[0]?.name.split(' ').pop()?.toLowerCase() || 'unknown',
    doi: data.externalIds?.DOI,
    arxivId: data.externalIds?.ArXiv
  }
}

function formatBibTeX(bibKey: string, meta: any): string {
  return `@article{${bibKey},\n  title={${meta.title}},\n  author={${meta.authors.join(' and ')}},\n  year={${meta.year}}\n}`
}

export async function citationAgent(input: AgentInput): Promise<AgentOutput> {
  const id = extractPaperId(input.message)
  const metadata = await fetchPaperMetadata(id)
  const bibKey = `${metadata.firstAuthorLastName}${metadata.year}`
  const bibtex = formatBibTeX(bibKey, metadata)
  return {
    latex: `\\cite{${bibKey}}\n\n% BibTeX:\n% ${bibtex}`,
    action: 'citation',
    targetSection: 'references',
    confidence: 0.95
  }
}
