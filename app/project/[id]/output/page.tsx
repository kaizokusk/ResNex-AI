'use client'
// app/project/[id]/output/page.tsx

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { PageHeader } from '../../../../components/layout/PageHeader'
import { Button, Badge, Card, Spinner, ToastProvider, useToast } from '../../../../components/ui'

type OutputSection = 'pdf' | 'methodology' | 'bias' | 'credits' | 'visual'

function BiasReport({ report }: { report: string }) {
  let parsed: any = null
  try { parsed = JSON.parse(report) } catch { }

  if (!parsed) return <p className="text-sm text-[#c8cad0] whitespace-pre-wrap">{report}</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="p-4 bg-[#0a0c10] rounded-lg border border-[#1a1f2e]">
        <p className="text-sm text-[#c8cad0]">{parsed.summary}</p>
      </div>
      {parsed.flags?.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-[#f59e0b] uppercase tracking-wider">
            {parsed.flags.length} Flag{parsed.flags.length !== 1 ? 's' : ''} Found
          </p>
          {parsed.flags.map((flag: any, i: number) => (
            <div key={i} className="p-4 bg-[#f59e0b]/5 border border-[#f59e0b]/15 rounded-lg">
              <p className="text-xs text-[#e8eaf0] mb-2">
                <span className="text-[#f59e0b] font-medium">Flagged: </span>
                "{flag.sentence}"
              </p>
              <p className="text-xs text-[#7a839a] mb-1"><span className="font-medium text-[#c8cad0]">Issue:</span> {flag.issue}</p>
              <p className="text-xs text-[#7a839a]"><span className="font-medium text-[#3ecf8e]">Suggestion:</span> {flag.suggestion}</p>
            </div>
          ))}
        </div>
      )}
      {parsed.flags?.length === 0 && (
        <div className="p-4 bg-[#3ecf8e]/5 border border-[#3ecf8e]/20 rounded-lg text-center">
          <p className="text-sm text-[#3ecf8e] font-medium">✓ No bias flags found</p>
        </div>
      )}
    </div>
  )
}

export default function OutputPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [output, setOutput] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pdfIframeSrc, setPdfIframeSrc] = useState<string | null>(null)
  const [runningBias, setRunningBias] = useState(false)
  const [runningVisual, setRunningVisual] = useState(false)
  const [activeSection, setActiveSection] = useState<OutputSection>('pdf')
  const searchParams = useSearchParams()
  const { success, error, toast } = useToast()
  const pdfUrl = output?.pdfUrl ?? output?.pdf_url ?? null

  // Keep iframe src in sync with the latest compiled URL.
  useEffect(() => {
    setPdfIframeSrc(pdfUrl)
  }, [pdfUrl])

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${id}/output`).then(r => r.ok ? r.json() : null),
      fetch(`/api/projects/${id}/contributorship`).then(r => r.ok ? r.json() : { members: [], timeline: [] }),
    ]).then(([out, contribData]) => {
      setOutput(out)
      setLogs(contribData.timeline || [])
    }).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (searchParams.get('section') === 'pdf') setActiveSection('pdf')
  }, [searchParams])

  async function runBiasAudit() {
    setRunningBias(true)
    try {
      const res = await fetch('/api/ai/bias-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: id }),
      })
      const data = await res.json()
      setOutput((prev: any) => ({ ...(prev || {}), bias_audit_report: JSON.stringify(data) }))
      success('Bias audit complete!')
    } catch { error('Bias audit failed') }
    finally { setRunningBias(false) }
  }

  async function generateVisual() {
    setRunningVisual(true)
    try {
      const res = await fetch('/api/ai/visual-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: id }),
      })
      const data = await res.json()
      setOutput((prev: any) => ({ ...(prev || {}), visual_summary_url: data.image_url }))
      success('Visual summary generated!')
    } catch { error('Visual generation failed') }
    finally { setRunningVisual(false) }
  }

  async function exportPdf() {
    if (!pdfUrl) return error('No compiled PDF yet. Compile from the LaTeX tab first.')

    // Download the compiled PDF (stored as a data: URL) or open the remote URL.
    try {
      if (String(pdfUrl).startsWith('data:application/pdf')) {
        const a = document.createElement('a')
        a.href = pdfUrl
        a.download = 'research-output.pdf'
        a.click()
      } else {
        window.open(pdfUrl, '_blank', 'noopener,noreferrer')
      }
    } catch {
      error('Failed to export PDF')
    }
  }

  const tabs = [
    { label: 'Overview', href: `/project/${id}`, icon: '⬡' },
    { label: 'Chat', href: `/project/${id}/chat`, icon: '💬' },
    { label: 'Discover', href: `/project/${id}/discover`, icon: '🔍' },
    { label: 'Library', href: `/project/${id}/library`, icon: '📚' },
    { label: 'Agents', href: `/project/${id}/agents`, icon: '🤖' },
    { label: 'LaTeX', href: `/project/${id}/latex`, icon: 'τ' },
    { label: 'Output', href: `/project/${id}/output`, icon: '⬇' },
  ]

  const navItems = [
    { key: 'pdf', label: 'Full PDF', icon: '📑' }, 
    { key: 'methodology', label: 'Methodology', icon: '🔬' },
    { key: 'bias', label: 'Bias Audit', icon: '⚖️' },
    { key: 'credits', label: 'Contributor Credits', icon: '👥' },
    { key: 'visual', label: 'Visual Summary', icon: '🖼️' },
  ]

  return (
    <>
      <ToastProvider />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <PageHeader
          title="Final Output"
          subtitle="Compiled PDF, bias audit, and exports"
          tabs={tabs}
          activeTab={`/project/${id}/output`}
          actions={
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={exportPdf}>Export PDF</Button>
              <Button size="sm" onClick={() => router.push(`/project/${id}/latex`)}>LaTeX Editor →</Button>
            </div>
          }
        />

        <div className="flex-1 flex overflow-hidden">
          {/* Left nav */}
          <div className="w-52 flex-shrink-0 border-r border-[#1a1f2e] bg-[#0d1018] py-4 flex flex-col gap-1 px-3">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => {
                  const next = item.key as OutputSection
                  setActiveSection(next)
                  const base = `/project/${id}/output`
                  router.push(next === 'pdf' ? `${base}?section=pdf` : base)
                }}

                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all text-left ${
                  activeSection === item.key
                    ? 'bg-[#4f8ef7]/10 text-[#4f8ef7] border border-[#4f8ef7]/20'
                    : 'text-[#7a839a] hover:text-[#e8eaf0] hover:bg-[#1a1f2e]'
                }`}
              >
                <span>{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Main content */}
          <div className={`flex-1 bg-[#0a0c10] ${activeSection === 'pdf' ? 'overflow-hidden p-4' : 'overflow-y-auto p-8'}`}>
            {loading ? (
              <div className="flex items-center justify-center py-20"><Spinner size={24} /></div>
            ) : (
              <div className={activeSection === 'pdf' ? 'w-full h-full min-h-0' : 'max-w-3xl mx-auto'}>
                {activeSection === 'pdf' && (
                  !pdfUrl ? (
                    <Card className="text-center py-12">
                      <p className="text-[#7a839a] mb-2">No compiled PDF yet.</p>
                      <p className="text-xs text-[#3d4558]">Go to LaTeX and click Compile/Recompile.</p>
                    </Card>
                  ) : (
                    <div className="h-full min-h-0 bg-[#12151c] border border-[#252a38] rounded-xl overflow-hidden">
                      <iframe
                        src={pdfIframeSrc ?? pdfUrl}
                        title="Full PDF"
                        className="w-full h-full border-none"
                      />
                    </div>
                  )
                )}

                {activeSection === 'methodology' && (
                  <div>
                    <h2 className="text-lg font-bold text-[#e8eaf0] mb-6">Methodology Disclosure</h2>
                    {output?.methodology_disclosure ? (
                      <div className="bg-[#12151c] border border-[#252a38] rounded-xl p-8">
                        <p className="text-sm text-[#c8cad0] leading-relaxed whitespace-pre-wrap">
                          {output.methodology_disclosure}
                        </p>
                      </div>
                    ) : (
                      <Card className="text-center py-12">
                        <p className="text-[#7a839a] mb-4">BERA-compliant AI usage disclosure not yet generated.</p>
                        <Button onClick={async () => {
                          const res = await fetch('/api/ai/methodology', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ project_id: id }),
                          })
                          const data = await res.json()
                          setOutput((prev: any) => ({ ...(prev || {}), methodology_disclosure: data.methodology }))
                          success('Methodology disclosure generated!')
                        }}>Generate Disclosure</Button>
                      </Card>
                    )}
                  </div>
                )}

                {activeSection === 'bias' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-bold text-[#e8eaf0]">Bias Audit Report</h2>
                      <Button size="sm" onClick={runBiasAudit} loading={runningBias} variant="secondary">
                        {output?.bias_audit_report ? 'Re-audit' : 'Run Audit'}
                      </Button>
                    </div>
                    {output?.bias_audit_report ? (
                      <div className="bg-[#12151c] border border-[#252a38] rounded-xl p-6">
                        <BiasReport report={output.bias_audit_report} />
                      </div>
                    ) : (
                      <Card className="text-center py-12">
                        <p className="text-[#7a839a] mb-2">No bias audit yet.</p>
                        <p className="text-xs text-[#3d4558] mb-4">Requires a merged document first.</p>
                        <Button onClick={runBiasAudit} loading={runningBias} disabled={!output?.merged_content}>
                          Run Bias Audit
                        </Button>
                      </Card>
                    )}
                  </div>
                )}

                {activeSection === 'credits' && (
                  <div>
                    <h2 className="text-lg font-bold text-[#e8eaf0] mb-6">Contributor Credits</h2>
                    <div className="bg-[#12151c] border border-[#252a38] rounded-xl p-6">
                      {logs.length === 0 ? (
                        <p className="text-sm text-[#7a839a]">No contribution data yet.</p>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {Object.entries(
                            logs.reduce((acc: any, log: any) => {
                              const name = log.user?.full_name || log.user_id || 'Unknown'
                              if (!acc[name]) acc[name] = []
                              acc[name].push(log)
                              return acc
                            }, {})
                          ).map(([name, userLogs]: [string, any]) => (
                            <div key={name} className="p-4 bg-[#0a0c10] rounded-lg border border-[#1a1f2e]">
                              <p className="font-semibold text-sm text-[#e8eaf0] mb-2">{name}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {['created', 'edited', 'ai_prompted', 'reviewed', 'merged'].map(action => {
                                  const count = userLogs.filter((l: any) => l.action === action).length
                                  if (!count) return null
                                  return (
                                    <Badge key={action} color={action === 'ai_prompted' ? 'gray' : action === 'merged' ? 'green' : 'blue'}>
                                      {count}× {action.replace('_', ' ')}
                                    </Badge>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeSection === 'visual' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-bold text-[#e8eaf0]">Visual Summary</h2>
                      <Button size="sm" onClick={generateVisual} loading={runningVisual} variant="secondary">
                        {output?.visual_summary_url ? 'Regenerate' : 'Generate'}
                      </Button>
                    </div>
                    {output?.visual_summary_url ? (
                      <div className="bg-[#12151c] border border-[#252a38] rounded-xl overflow-hidden">
                        <img src={output.visual_summary_url} alt="Visual summary" className="w-full" />
                        <div className="p-4 flex justify-end">
                          <Button size="sm" variant="ghost" onClick={() => window.open(output.visual_summary_url, '_blank')}>
                            Open Full Size
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Card className="text-center py-12">
                        <p className="text-[#7a839a] mb-4">Generate an AI infographic for your research.</p>
                        <Button onClick={generateVisual} loading={runningVisual} disabled={!output?.merged_content}>
                          Generate Visual Summary
                        </Button>
                      </Card>
                    )}
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
