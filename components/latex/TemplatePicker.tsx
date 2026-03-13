'use client'
// components/latex/TemplatePicker.tsx
// Dropdown to pick a paper template + confirmation modal

import { useEffect, useRef, useState } from 'react'
import { useLatexStore } from '../../store/latexStore'

interface TemplateInfo {
  id: string
  label: string
  description: string
  category: string
  sectionCount: number
}

interface Props {
  projectId: string
  onApplied: () => void  // refresh file tree after applying
}

const CATEGORY_LABELS: Record<string, string> = {
  'ai-conference': '🤖 AI Conferences',
  'conference':    '📋 Conferences',
  'journal':       '📰 Journals',
  'thesis':        '🎓 Thesis',
  'other':         '📄 Other',
}

const CATEGORY_ORDER = ['ai-conference', 'conference', 'journal', 'thesis', 'other']

export function TemplatePicker({ projectId, onApplied }: Props) {
  const { setFiles } = useLatexStore()
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<TemplateInfo[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<TemplateInfo | null>(null)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  // Load templates + current template id
  useEffect(() => {
    fetch(`/api/projects/${projectId}/latex/template`)
      .then((r) => r.json())
      .then((d) => {
        if (d.templates) setTemplates(d.templates)
        if (d.currentTemplateId) setCurrentId(d.currentTemplateId)
      })
      .catch(console.error)
  }, [projectId])

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const currentTemplate = templates.find((t) => t.id === currentId)

  async function applyTemplate(template: TemplateInfo, overwriteMain: boolean) {
    setApplying(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/latex/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id, overwriteMain }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to apply template'); return }

      setCurrentId(template.id)
      setConfirming(null)
      setOpen(false)

      // Refresh file list
      const filesRes = await fetch(`/api/projects/${projectId}/latex/files`)
      if (filesRes.ok) setFiles(await filesRes.json())
      onApplied()
    } catch (err: any) {
      setError(err.message || 'Failed to apply template')
    } finally {
      setApplying(false)
    }
  }

  // Group templates by category
  const grouped = CATEGORY_ORDER.reduce<Record<string, TemplateInfo[]>>((acc, cat) => {
    const items = templates.filter((t) => t.category === cat)
    if (items.length) acc[cat] = items
    return acc
  }, {})

  return (
    <>
      {/* Trigger button */}
      <div className="relative" ref={dropRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg bg-[#1a1f2e] hover:bg-[#252a38] text-[#e8eaf0] border border-[#252a38] transition-colors"
        >
          <span>📋</span>
          <span>{currentTemplate ? currentTemplate.label : 'Pick Template'}</span>
          <span className="text-[#3d4558]">▾</span>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute left-0 top-full mt-1 z-50 w-72 bg-[#0d1018] border border-[#252a38] rounded-xl shadow-2xl overflow-hidden">
            <div className="px-3 py-2 border-b border-[#1a1f2e]">
              <p className="text-[10px] font-bold text-[#3d4558] uppercase tracking-wider">Select Paper Template</p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <div className="px-3 pt-2 pb-1">
                    <span className="text-[9px] font-bold text-[#3d4558] uppercase tracking-wider">
                      {CATEGORY_LABELS[cat] || cat}
                    </span>
                  </div>
                  {items.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setOpen(false); setConfirming(t) }}
                      className={`w-full text-left px-3 py-2 hover:bg-[#1a1f2e] transition-colors
                        ${t.id === currentId ? 'bg-[#1a1f2e]' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#e8eaf0]">{t.label}</span>
                        {t.id === currentId && (
                          <span className="text-[9px] text-[#34d399] font-bold">active</span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#3d4558] mt-0.5 leading-tight">{t.description}</p>
                      <p className="text-[9px] text-[#3d4558] mt-0.5">{t.sectionCount} sections</p>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0d1018] border border-[#252a38] rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1a1f2e]">
              <h2 className="text-sm font-bold text-[#e8eaf0]">Apply Template</h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="rounded-lg bg-[#1a1f2e] px-4 py-3">
                <p className="text-xs font-bold text-[#e8eaf0]">{confirming.label}</p>
                <p className="text-[11px] text-[#7a839a] mt-1">{confirming.description}</p>
                <p className="text-[11px] text-[#7a839a] mt-1">{confirming.sectionCount} section files will be created</p>
              </div>
              <p className="text-[11px] text-[#7a839a] leading-relaxed">
                Existing section files won&apos;t be overwritten.
                {currentId
                  ? ' Your current main.tex will be replaced with the new template skeleton.'
                  : ' A new main.tex skeleton will be created.'}
              </p>
              {error && <p className="text-[11px] text-[#f87171]">{error}</p>}
            </div>
            <div className="px-5 py-3 border-t border-[#1a1f2e] flex gap-2 justify-end">
              <button
                onClick={() => { setConfirming(null); setError(null) }}
                disabled={applying}
                className="text-[11px] px-4 py-1.5 rounded-lg bg-[#1a1f2e] text-[#7a839a] hover:text-[#e8eaf0] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => applyTemplate(confirming, true)}
                disabled={applying}
                className="text-[11px] font-bold px-4 py-1.5 rounded-lg bg-[#7c6af5] hover:bg-[#6b5ce7] text-white disabled:opacity-50 transition-colors"
              >
                {applying ? 'Applying…' : 'Apply Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
