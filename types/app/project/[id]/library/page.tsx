'use client'
// app/project/[id]/library/page.tsx
// Paper library: view imported papers, upload PDFs, read AI summaries
// Compare mode: check 2+ ready papers → auto-switches right panel to comparison matrix

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '../../../../components/layout/PageHeader'
import { Spinner, ToastProvider, useToast } from '../../../../components/ui'

const TABS = (id: string) => [
  { label: 'Overview', href: `/project/${id}`, icon: '⬡' },
  { label: 'Chat', href: `/project/${id}/chat`, icon: '💬' },
  { label: 'Discover', href: `/project/${id}/discover`, icon: '🔍' },
  { label: 'Library', href: `/project/${id}/library`, icon: '📚' },
  { label: 'Agents', href: `/project/${id}/agents`, icon: '🤖' },
  { label: 'LaTeX', href: `/project/${id}/latex`, icon: 'τ' },
  { label: 'Output', href: `/project/${id}/output`, icon: '⬇' },
]

const statusColors: Record<string, string> = {
  ready: 'bg-[#3ecf8e]/15 text-[#3ecf8e] border-[#3ecf8e]/20',
  pending: 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/20',
  processing: 'bg-[#4f8ef7]/15 text-[#4f8ef7] border-[#4f8ef7]/20',
  failed: 'bg-[#f43f5e]/15 text-[#f43f5e] border-[#f43f5e]/20',
}

const statusSymbols: Record<string, string> = {
  ready: '✓', pending: '◦', processing: '⟳', failed: '✕',
}

function StatusBadge({ status }: { status: string }) {
  const symbol = statusSymbols[status] ?? '●'
  return (
    <span
      aria-label={status}
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${statusColors[status] || 'bg-[#1a1f2e] text-[#7a839a] border-[#252a38]'}`}
    >
      <span aria-hidden="true">{symbol} </span>
      {status}
    </span>
  )
}

function SummaryCard({ label, text }: { label: string; text?: string }) {
  if (!text) return null
  return (
    <div className="bg-[#0d1018] border border-[#1a1f2e] rounded-xl p-4">
      <h4 className="text-[10px] font-bold text-[#3d4558] uppercase tracking-wider mb-2">{label}</h4>
      <p className="text-sm text-[#c8cad0] leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  )
}

export default function LibraryPage() {
  const { id } = useParams<{ id: string }>()
  const { success, error } = useToast()
  const [papers, setPapers] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [retryingAll, setRetryingAll] = useState(false)
  const [reanalyzing, setReanalyzing] = useState(false)
  const [checkedIds, setCheckedIds] = useState<string[]>([])
  const [comparing, setComparing] = useState(false)
  const [compareResult, setCompareResult] = useState<any>(null)

  const refresh = useCallback(() => {
    fetch(`/api/projects/${id}/papers`)
      .then((r) => r.json())
      .then(setPapers)
      .catch(console.error)
  }, [id])

  async function retryAllFailed() {
    const failed = papers.filter((p) => p.status === 'failed' || p.status === 'processing')
    if (failed.length === 0) return
    setRetryingAll(true)
    try {
      await Promise.all(
        failed.map((p) =>
          fetch(`/api/projects/${id}/papers`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paperId: p.id }),
          })
        )
      )
      success(`Retrying ${failed.length} paper${failed.length > 1 ? 's' : ''}...`)
      refresh()
    } catch {
      error('Retry failed. Please try again.')
    } finally {
      setRetryingAll(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    refresh()
    setLoading(false)
    // Poll every 8s to pick up status changes from background processing
    const iv = setInterval(refresh, 8000)
    return () => clearInterval(iv)
  }, [refresh])

  async function reanalyzeAll() {
    if (papers.length === 0) return
    setReanalyzing(true)
    try {
      await Promise.all(
        papers.map((p) =>
          fetch(`/api/projects/${id}/papers`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paperId: p.id }),
          })
        )
      )
      success(`Re-analyzing ${papers.length} paper${papers.length !== 1 ? 's' : ''}...`)
      refresh()
    } catch {
      error('Re-analyze failed. Please try again.')
    } finally {
      setReanalyzing(false)
    }
  }

  function toggleCheck(e: React.MouseEvent, paperId: string) {
    e.stopPropagation()
    setCheckedIds(prev => prev.includes(paperId) ? prev.filter(x => x !== paperId) : [...prev, paperId])
    setCompareResult(null)
  }

  async function handleCompare() {
    setComparing(true)
    setCompareResult(null)
    try {
      const res = await fetch(`/api/projects/${id}/papers/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paper_ids: checkedIds }),
      })
      if (!res.ok) throw new Error(await res.text())
      setCompareResult(await res.json())
    } catch {
      error('Comparison failed. Please try again.')
    } finally {
      setComparing(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/projects/${id}/papers/upload`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('upload')

      success(`"${file.name}" added to library — summarizing...`)
      refresh()
    } catch {
      error("Upload didn't finish. Check the file is under 50MB and try again.")
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const tabs = TABS(id)

  return (
    <>
      <ToastProvider />
      <div className="flex flex-col h-screen overflow-hidden">
        <PageHeader
          title="Paper Library"
          subtitle={`${papers.length} paper${papers.length !== 1 ? 's' : ''} · AI summaries generated automatically`}
          tabs={tabs}
          activeTab={tabs[3].href}
        />

        <div className="library-layout flex-1 flex overflow-hidden">
          {/* Paper list sidebar */}
          <div className="library-list w-72 flex-shrink-0 flex flex-col border-r border-[#1a1f2e] bg-[#0d1018]">
            <div className="p-4 border-b border-[#1a1f2e]">
              <label
                className={`flex items-center justify-center gap-2 bg-[#4f8ef7] hover:bg-[#3d7de8] text-white px-4 py-2.5 rounded-xl cursor-pointer font-bold text-xs uppercase tracking-wide transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {uploading ? <Spinner size={12} color="white" /> : null}
                {uploading ? 'Uploading...' : '+ Upload PDF'}
                <input type="file" accept=".pdf" onChange={handleUpload} className="hidden" />
              </label>
              <p className="text-[10px] text-[#3d4558] text-center mt-2">or import via Discover tab</p>
              {papers.some((p) => p.status === 'failed' || p.status === 'processing') && (
                <button
                  onClick={retryAllFailed}
                  disabled={retryingAll}
                  className="mt-2 w-full flex items-center justify-center gap-2 bg-[#f59e0b]/15 hover:bg-[#f59e0b]/25 text-[#f59e0b] border border-[#f59e0b]/20 px-4 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {retryingAll ? <Spinner size={10} color="#f59e0b" /> : null}
                  {retryingAll ? 'Retrying...' : `Retry All Failed (${papers.filter(p => p.status === 'failed' || p.status === 'processing').length})`}
                </button>
              )}
              {papers.length > 0 && (
                <button
                  onClick={reanalyzeAll}
                  disabled={reanalyzing}
                  className="mt-2 w-full flex items-center justify-center gap-2 bg-[#7c3aed]/15 hover:bg-[#7c3aed]/25 text-[#a78bfa] border border-[#7c3aed]/20 px-4 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {reanalyzing ? <Spinner size={10} color="#a78bfa" /> : null}
                  {reanalyzing ? 'Re-analyzing...' : 'Re-analyze All Summaries'}
                </button>
              )}
              {checkedIds.length >= 2 && (
                <button
                  onClick={handleCompare}
                  disabled={comparing}
                  className="mt-2 w-full flex items-center justify-center gap-2 bg-[#4f8ef7]/15 hover:bg-[#4f8ef7]/25 text-[#4f8ef7] border border-[#4f8ef7]/20 px-4 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {comparing ? <Spinner size={10} color="#4f8ef7" /> : null}
                  {comparing ? 'Comparing...' : `Compare (${checkedIds.length})`}
                </button>
              )}
            </div>

            <div
              className="flex-1 overflow-y-auto"
              role="list"
              aria-label="Research papers"
            >
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner size={16} />
                </div>
              ) : papers.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-xs text-[#3d4558]">No papers yet.</p>
                  <p className="text-[10px] text-[#3d4558] mt-1">Upload a PDF or use the Discover tab to import.</p>
                </div>
              ) : (
                papers.map((paper) => {
                  const isChecked = checkedIds.includes(paper.id)
                  const isSelected = selected?.id === paper.id
                  const isReady = paper.status === 'ready'
                  return (
                    <div
                      key={paper.id}
                      role="listitem"
                      className={`relative border-b border-[#1a1f2e] transition-colors ${isChecked || isSelected ? 'border-l-2 border-l-[#4f8ef7]' : ''}`}
                    >
                      {isReady && (
                        <div
                          onClick={(e) => toggleCheck(e, paper.id)}
                          role="checkbox"
                          aria-checked={isChecked}
                          aria-label={`Select ${paper.title} for comparison`}
                          tabIndex={0}
                          onKeyDown={(e) => e.key === ' ' && toggleCheck(e as any, paper.id)}
                          className={`absolute top-3 left-2 z-10 w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${isChecked ? 'bg-[#4f8ef7] border-[#4f8ef7]' : 'border-[#3d4558] bg-transparent hover:border-[#4f8ef7]'}`}
                        >
                          {isChecked && (
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <path d="M20 6L9 17l-5-5"/>
                            </svg>
                          )}
                        </div>
                      )}
                      <button
                        aria-selected={isSelected}
                        onClick={() => setSelected(paper)}
                        className={`w-full text-left hover:bg-[#1a1f2e] transition-colors ${isChecked || isSelected ? 'bg-[#4f8ef7]/10' : ''} ${isReady ? 'pl-8 pr-4 py-3' : 'px-4 py-3'}`}
                      >
                        <p className="font-medium text-sm text-[#e8eaf0] truncate leading-snug mb-1">
                          {paper.title}
                        </p>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={paper.status} />
                          {paper.year && <span className="text-[10px] text-[#3d4558]">{paper.year}</span>}
                        </div>
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Paper detail */}
          <div
            className="library-detail flex-1 overflow-y-auto p-6 bg-[#0a0c10]"
            aria-label="Paper details"
            aria-live="polite"
          >
            {checkedIds.length >= 2 ? (
              <div className="max-w-5xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[#e8eaf0]">Comparing {checkedIds.length} papers</h2>
                  <button
                    onClick={() => { setCheckedIds([]); setCompareResult(null) }}
                    className="text-xs text-[#7a839a] hover:text-[#e8eaf0] border border-[#252a38] hover:border-[#2e3548] px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Clear selection
                  </button>
                </div>
                {comparing ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <Spinner size={28} />
                    <p className="text-sm text-[#7a839a]">Generating comparison matrix...</p>
                  </div>
                ) : !compareResult ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center max-w-xs">
                      <div className="w-14 h-14 rounded-2xl bg-[#1a1f2e] border border-[#252a38] flex items-center justify-center mx-auto mb-4">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3d4558" strokeWidth="1.5">
                          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-[#7a839a] mb-1">{checkedIds.length} papers selected</p>
                      <p className="text-xs text-[#3d4558]">Click "Compare ({checkedIds.length})" in the left panel to generate a structured comparison matrix.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {compareResult.narrative_summary && (
                      <div className="bg-[#0d1018] border border-[#1a1f2e] rounded-xl p-5 mb-6">
                        <h3 className="text-[10px] font-bold text-[#3d4558] uppercase tracking-wider mb-3">Narrative Summary</h3>
                        <p className="text-sm text-[#c8cad0] leading-relaxed whitespace-pre-wrap">{compareResult.narrative_summary}</p>
                      </div>
                    )}
                    {compareResult.comparison_matrix?.papers?.length > 0 && (
                      <div className="bg-[#0d1018] border border-[#1a1f2e] rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-[#1a1f2e]">
                                <th className="text-left p-4 text-[10px] font-bold text-[#3d4558] uppercase tracking-wider w-32">
                                  Dimension
                                </th>
                                {compareResult.comparison_matrix.papers.map((p: any, i: number) => (
                                  <th key={i} className="text-left p-4 text-[10px] font-bold text-[#7a839a] uppercase tracking-wider">
                                    {p.title?.slice(0, 35)}{p.title?.length > 35 ? '...' : ''}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(compareResult.comparison_matrix.dimensions || DIMENSIONS).map((dim: string) => (
                                <tr key={dim} className="border-b border-[#1a1f2e] last:border-0">
                                  <td className="p-4 font-semibold text-xs text-[#7a839a] capitalize whitespace-nowrap align-top">
                                    {dim.replace(/_/g, ' ')}
                                  </td>
                                  {compareResult.comparison_matrix.papers.map((p: any, i: number) => (
                                    <td key={i} className="p-4 text-xs text-[#c8cad0] leading-relaxed align-top">
                                      {p[dim] || '—'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : !selected ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#1a1f2e] border border-[#252a38] flex items-center justify-center mx-auto mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3d4558" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <p className="text-sm text-[#3d4558]">Select a paper to view its summary</p>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-[#e8eaf0] mb-2 leading-tight">{selected.title}</h2>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <StatusBadge status={selected.status} />
                    {selected.year && <span className="text-xs text-[#7a839a]">({selected.year})</span>}
                    {selected.arxivId && (
                      <a
                        href={`https://arxiv.org/abs/${selected.arxivId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#4f8ef7] hover:underline"
                      >
                        arXiv:{selected.arxivId}
                      </a>
                    )}
                    {selected.doi && <span className="text-xs text-[#7a839a]">DOI: {selected.doi}</span>}
                  </div>
                  {selected.authors?.length > 0 && (
                    <p className="text-xs text-[#7a839a]">
                      {(selected.authors as string[]).join(', ')}
                    </p>
                  )}
                </div>

                {selected.abstract && (
                  <div className="bg-[#0d1018] border border-[#1a1f2e] rounded-xl p-4 mb-4">
                    <h4 className="text-[10px] font-bold text-[#3d4558] uppercase tracking-wider mb-2">Abstract</h4>
                    <p className="text-sm text-[#c8cad0] leading-relaxed">{selected.abstract}</p>
                  </div>
                )}

                {selected.summary ? (
                  <div className="space-y-3">
                    <SummaryCard label="Short Summary" text={(selected.summary as any).summary_short} />
                    <SummaryCard label="Problem Statement" text={(selected.summary as any).problem_statement} />
                    <SummaryCard label="Methodology" text={(selected.summary as any).methodology} />
                    <SummaryCard label="Datasets" text={(selected.summary as any).datasets} />
                    <SummaryCard label="Key Findings" text={(selected.summary as any).findings} />
                    <SummaryCard label="Limitations" text={(selected.summary as any).limitations} />
                    {(selected.summary as any).keywords?.length > 0 && (
                      <div className="bg-[#0d1018] border border-[#1a1f2e] rounded-xl p-4">
                        <h4 className="text-[10px] font-bold text-[#3d4558] uppercase tracking-wider mb-2">Keywords</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {((selected.summary as any).keywords as string[]).map((k, i) => (
                            <span key={i} className="bg-[#4f8ef7]/10 text-[#4f8ef7] text-xs px-2 py-0.5 rounded-full border border-[#4f8ef7]/20">
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : selected.status === 'processing' || selected.status === 'pending' ? (
                  <div className="flex items-center gap-3 p-4 bg-[#0d1018] border border-[#1a1f2e] rounded-xl">
                    <Spinner size={16} />
                    <p className="text-sm text-[#7a839a]">Generating AI summary — this takes a minute...</p>
                  </div>
                ) : selected.status === 'failed' ? (
                  <div className="p-4 bg-[#f43f5e]/10 border border-[#f43f5e]/20 rounded-xl flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-[#f43f5e] font-semibold">Processing failed</p>
                      {(selected.summary as any)?.error && (
                        <p className="text-xs text-[#f43f5e]/70 mt-1 font-mono break-all">{(selected.summary as any).error}</p>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        await fetch(`/api/projects/${id}/papers`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ paperId: selected.id }),
                        })
                        setSelected((p: any) => ({ ...p, status: 'processing' }))
                        refresh()
                      }}
                      className="flex-shrink-0 text-xs bg-[#f43f5e]/20 hover:bg-[#f43f5e]/30 text-[#f43f5e] px-3 py-1.5 rounded-lg font-bold transition-colors border border-[#f43f5e]/30"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-[#7a839a]">Summary not available.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
