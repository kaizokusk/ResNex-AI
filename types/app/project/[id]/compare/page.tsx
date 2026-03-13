'use client'
// app/project/[id]/compare/page.tsx
// Select 2+ papers from library and compare them with AI

import { useState, useEffect } from 'react'
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

const DIMENSIONS = ['problem_addressed', 'methodology', 'datasets', 'findings', 'limitations', 'novelty']

export default function ComparePage() {
  const { id } = useParams<{ id: string }>()
  const { error } = useToast()
  const [papers, setPapers] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    fetch(`/api/projects/${id}/papers`)
      .then((r) => r.json())
      .then((data) => setPapers(data.filter((p: any) => p.status === 'ready')))
      .catch(console.error)
  }, [id])

  function toggle(paperId: string) {
    setSelectedIds((prev) =>
      prev.includes(paperId) ? prev.filter((x) => x !== paperId) : [...prev, paperId]
    )
  }

  async function handleCompare() {
    if (selectedIds.length < 2) return error('Select at least 2 papers')
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`/api/projects/${id}/papers/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paper_ids: selectedIds }),
      })
      if (!res.ok) throw new Error(await res.text())
      setResult(await res.json())
    } catch {
      error('Comparison failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const tabs = TABS(id)

  return (
    <>
      <ToastProvider />
      <div className="flex flex-col h-screen overflow-hidden">
        <PageHeader
          title="Compare Papers"
          subtitle="Select 2+ papers from your library to generate a side-by-side AI comparison"
          tabs={tabs}
        />

        <div className="flex-1 flex overflow-hidden">
          {/* Paper selector */}
          <div className="w-72 flex-shrink-0 flex flex-col border-r border-[#1a1f2e] bg-[#0d1018]">
            <div className="p-4 border-b border-[#1a1f2e]">
              <p className="text-xs font-semibold text-[#7a839a] mb-3">
                Select papers to compare ({selectedIds.length} selected)
              </p>
              <button
                onClick={handleCompare}
                disabled={selectedIds.length < 2 || loading}
                className="w-full bg-[#4f8ef7] hover:bg-[#3d7de8] text-white py-2.5 rounded-xl font-bold text-xs disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Spinner size={12} color="white" /> : null}
                {loading ? 'Comparing...' : `Compare (${selectedIds.length})`}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {papers.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-xs text-[#3d4558]">No processed papers yet.</p>
                  <p className="text-[10px] text-[#3d4558] mt-1">Import papers via Discover and wait for processing.</p>
                </div>
              ) : (
                papers.map((paper) => (
                  <button
                    key={paper.id}
                    onClick={() => toggle(paper.id)}
                    className={`w-full text-left px-4 py-3 border-b border-[#1a1f2e] hover:bg-[#1a1f2e] flex items-start gap-3 transition-colors ${selectedIds.includes(paper.id) ? 'bg-[#4f8ef7]/10' : ''}`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${selectedIds.includes(paper.id) ? 'bg-[#4f8ef7] border-[#4f8ef7]' : 'border-[#3d4558]'}`}>
                      {selectedIds.includes(paper.id) && (
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#e8eaf0] truncate leading-snug">{paper.title}</p>
                      {paper.year && <p className="text-[10px] text-[#3d4558] mt-0.5">{paper.year}</p>}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Comparison result */}
          <div className="flex-1 overflow-y-auto p-6 bg-[#0a0c10]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Spinner size={28} />
                <p className="text-sm text-[#7a839a]">Generating comparison matrix...</p>
              </div>
            ) : !result ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-xs">
                  <div className="w-14 h-14 rounded-2xl bg-[#1a1f2e] border border-[#252a38] flex items-center justify-center mx-auto mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3d4558" strokeWidth="1.5">
                      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[#7a839a] mb-1">Side-by-side comparison</p>
                  <p className="text-xs text-[#3d4558]">Select 2+ papers from the left and click Compare. AI will generate a structured matrix of methods, findings, and gaps.</p>
                </div>
              </div>
            ) : (
              <div className="max-w-5xl">
                <h2 className="text-lg font-bold text-[#e8eaf0] mb-4">Comparison Results</h2>

                {/* Narrative */}
                {result.narrative_summary && (
                  <div className="bg-[#0d1018] border border-[#1a1f2e] rounded-xl p-5 mb-6">
                    <h3 className="text-[10px] font-bold text-[#3d4558] uppercase tracking-wider mb-3">Narrative Summary</h3>
                    <p className="text-sm text-[#c8cad0] leading-relaxed whitespace-pre-wrap">{result.narrative_summary}</p>
                  </div>
                )}

                {/* Matrix table */}
                {result.comparison_matrix?.papers?.length > 0 && (
                  <div className="bg-[#0d1018] border border-[#1a1f2e] rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#1a1f2e]">
                            <th className="text-left p-4 text-[10px] font-bold text-[#3d4558] uppercase tracking-wider w-32">
                              Dimension
                            </th>
                            {result.comparison_matrix.papers.map((p: any, i: number) => (
                              <th key={i} className="text-left p-4 text-[10px] font-bold text-[#7a839a] uppercase tracking-wider">
                                {p.title?.slice(0, 35)}{p.title?.length > 35 ? '...' : ''}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(result.comparison_matrix.dimensions || DIMENSIONS).map((dim: string) => (
                            <tr key={dim} className="border-b border-[#1a1f2e] last:border-0">
                              <td className="p-4 font-semibold text-xs text-[#7a839a] capitalize whitespace-nowrap align-top">
                                {dim.replace(/_/g, ' ')}
                              </td>
                              {result.comparison_matrix.papers.map((p: any, i: number) => (
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
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
