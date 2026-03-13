'use client'
// app/project/[id]/discover/page.tsx
// Discover papers from arXiv and Semantic Scholar, import into project library

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '../../../../components/layout/PageHeader'
import { Spinner, ToastProvider, useToast } from '../../../../components/ui'

const TABS = (id: string) => [
  { label: 'Overview', href: `/project/${id}` , icon: '⬡' },
  { label: 'Chat', href: `/project/${id}/chat` , icon: '💬' },
  { label: 'Discover', href: `/project/${id}/discover` , icon: '🔍' },
  { label: 'Library', href: `/project/${id}/library` , icon: '📚' },
  { label: 'Agents', href: `/project/${id}/agents` , icon: '🤖' },
  { label: 'LaTeX', href: `/project/${id}/latex` , icon: 'τ' },
  { label: 'Output', href: `/project/${id}/output` , icon: '⬇' },
]

type Source = 'arxiv' | 'semantic-scholar'

interface ArxivResult {
  arxivId: string
  title: string
  abstract: string
  authors: string[]
  year?: number
  published: string
  primaryCategory: string
  url: string
  pdfUrl: string
}

interface SSResult {
  semanticScholarId: string
  title: string
  abstract: string
  authors: string[]
  year?: number
  citationCount?: number
  openAccessPdfUrl?: string
  arxivId?: string
  doi?: string
  url: string
}

type ImportStatus = 'idle' | 'importing' | 'imported' | 'duplicate' | 'error'

export default function DiscoverPage() {
  const { id } = useParams<{ id: string }>()
  const { success, error } = useToast()
  const [source, setSource] = useState<Source>('arxiv')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [arxivResults, setArxivResults] = useState<ArxivResult[]>([])
  const [ssResults, setSSResults] = useState<SSResult[]>([])
  const [importing, setImporting] = useState<Record<string, ImportStatus>>({})
  const [searched, setSearched] = useState(false)

  async function doSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    setArxivResults([])
    setSSResults([])
    try {
      if (source === 'arxiv') {
        const res = await fetch(`/api/projects/${id}/papers/discover/arxiv`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, max_results: 15 }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          error(
            (data.error || `arXiv search failed (${res.status})`) +
              (data.hint ? ` — ${data.hint}` : '') +
              (data.details ? ` (${String(data.details).slice(0, 120)})` : '')
          )
          return
        }
        setArxivResults(data.results || [])
      } else {
        const res = await fetch(`/api/projects/${id}/papers/discover/semantic-scholar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, limit: 15 }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          error(
            (data.error || `Semantic Scholar search failed (${res.status})`) +
              (data.hint ? ` — ${data.hint}` : '') +
              (data.details ? ` (${String(data.details).slice(0, 120)})` : '')
          )
          return
        }
        setSSResults(data.results || [])
      }
    } catch {
      error('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function importPaper(paper: ArxivResult | SSResult, key: string) {
    setImporting((p) => ({ ...p, [key]: 'importing' }))
    try {
      let body: any
      if (source === 'arxiv') {
        const a = paper as ArxivResult
        body = { title: a.title, authors: a.authors, abstract: a.abstract, year: a.year, arxivId: a.arxivId, url: a.url, fileUrl: a.pdfUrl }
      } else {
        const s = paper as SSResult
        body = { title: s.title, authors: s.authors, abstract: s.abstract, year: s.year, arxivId: s.arxivId, doi: s.doi, url: s.url, fileUrl: s.openAccessPdfUrl }
      }

      const res = await fetch(`/api/projects/${id}/papers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (data.duplicate) {
        setImporting((p) => ({ ...p, [key]: 'duplicate' }))
      } else {
        setImporting((p) => ({ ...p, [key]: 'imported' }))
        success(`"${paper.title.slice(0, 40)}..." added to library`)
      }
    } catch {
      setImporting((p) => ({ ...p, [key]: 'error' }))
      error('Import failed')
    }
  }

  const results = source === 'arxiv' ? arxivResults : ssResults
  const tabs = TABS(id)

  return (
    <>
      <ToastProvider />
      <div className="flex flex-col h-screen overflow-hidden">
        <PageHeader
          title="Discover Papers"
          subtitle="Search arXiv and Semantic Scholar, import papers into your project library"
          tabs={tabs}
        />

        <div className="flex-1 overflow-y-auto p-6 bg-[#0a0c10]">
          <div className="max-w-4xl mx-auto">
            {/* Source toggle */}
            <div className="flex gap-2 mb-4">
              {(['arxiv', 'semantic-scholar'] as Source[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setSource(s); setArxivResults([]); setSSResults([]); setSearched(false) }}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    source === s
                      ? 'bg-[#4f8ef7] text-white'
                      : 'bg-[#1a1f2e] text-[#7a839a] hover:text-[#e8eaf0] border border-[#252a38]'
                  }`}
                >
                  {s === 'arxiv' ? 'arXiv' : 'Semantic Scholar'}
                </button>
              ))}
            </div>

            {/* Search form */}
            <form onSubmit={doSearch} className="flex gap-2 mb-6">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={source === 'arxiv' ? 'Search arXiv (e.g. transformer attention mechanism)...' : 'Search Semantic Scholar...'}
                className="flex-1 bg-[#0d1018] border border-[#252a38] rounded-xl px-4 py-3 text-sm text-[#e8eaf0] placeholder:text-[#3d4558] focus:outline-none focus:border-[#4f8ef7] transition-all"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-6 py-3 bg-[#4f8ef7] hover:bg-[#3d7de8] text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {loading ? <Spinner size={14} color="white" /> : null}
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>

            {/* Results */}
            {searched && !loading && results.length === 0 && (
              <p className="text-sm text-[#7a839a] text-center py-8">No results found. Try different keywords.</p>
            )}

            <div className="flex flex-col gap-3">
              {(source === 'arxiv' ? arxivResults : ssResults).map((paper, i) => {
                const key = source === 'arxiv'
                  ? (paper as ArxivResult).arxivId || `r-${i}`
                  : (paper as SSResult).semanticScholarId || `r-${i}`
                const status = importing[key] || 'idle'

                return (
                  <div key={key} className="bg-[#0d1018] border border-[#1a1f2e] rounded-xl p-4 hover:border-[#252a38] transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-[#e8eaf0] leading-snug mb-1.5">{paper.title}</h3>
                        <p className="text-xs text-[#7a839a] mb-2">
                          {paper.authors.slice(0, 4).join(', ')}{paper.authors.length > 4 ? ' et al.' : ''}
                          {paper.year && <span className="ml-2 text-[#3d4558]">({paper.year})</span>}
                          {source === 'semantic-scholar' && (paper as SSResult).citationCount != null && (
                            <span className="ml-2 text-[#4f8ef7]">{(paper as SSResult).citationCount} citations</span>
                          )}
                          {source === 'arxiv' && (paper as ArxivResult).primaryCategory && (
                            <span className="ml-2 bg-[#1a1f2e] text-[#7a839a] px-1.5 py-0.5 rounded font-mono text-[10px]">
                              {(paper as ArxivResult).primaryCategory}
                            </span>
                          )}
                        </p>
                        {paper.abstract && (
                          <p className="text-xs text-[#7a839a] leading-relaxed line-clamp-2">{paper.abstract}</p>
                        )}
                        <a
                          href={paper.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-[#4f8ef7] hover:underline mt-1.5 inline-block"
                        >
                          View on {source === 'arxiv' ? 'arXiv' : 'Semantic Scholar'} →
                        </a>
                      </div>

                      <div className="flex-shrink-0">
                        {status === 'imported' ? (
                          <span className="text-[10px] bg-[#3ecf8e]/15 text-[#3ecf8e] px-3 py-1.5 rounded-lg font-bold border border-[#3ecf8e]/20">
                            ✓ Imported
                          </span>
                        ) : status === 'importing' ? (
                          <span className="text-[10px] bg-[#f59e0b]/15 text-[#f59e0b] px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 border border-[#f59e0b]/20">
                            <Spinner size={10} color="#f59e0b" /> Importing...
                          </span>
                        ) : status === 'duplicate' ? (
                          <span className="text-[10px] bg-[#1a1f2e] text-[#7a839a] px-3 py-1.5 rounded-lg font-bold border border-[#252a38]">
                            Already in library
                          </span>
                        ) : status === 'error' ? (
                          <button
                            onClick={() => importPaper(paper, key)}
                            className="text-[10px] bg-[#f43f5e]/15 text-[#f43f5e] px-3 py-1.5 rounded-lg font-bold border border-[#f43f5e]/20 hover:bg-[#f43f5e]/25"
                          >
                            Retry
                          </button>
                        ) : (
                          <button
                            onClick={() => importPaper(paper, key)}
                            className="text-[10px] bg-[#4f8ef7]/15 text-[#4f8ef7] px-3 py-1.5 rounded-lg font-bold hover:bg-[#4f8ef7]/25 transition-colors border border-[#4f8ef7]/20"
                          >
                            + Import
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
