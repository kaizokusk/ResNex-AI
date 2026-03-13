'use client'
import { useState } from 'react'
import { CitationCell } from '../../../lib/cell-types'
import { CellAIFillButton } from './CellAIFillButton'

interface Props {
  cell: CitationCell
  onChange: (updated: CitationCell) => void
  onFocus: () => void
  onAutofill: () => void
  autofilling?: boolean
}

export function CitationCellBlock({ cell, onChange, onFocus, onAutofill, autofilling = false }: Props) {
  const [draft, setDraft] = useState('')

  function addKey() {
    const trimmed = draft.trim().replace(/,/g, '')
    if (!trimmed || cell.keys.includes(trimmed)) { setDraft(''); return }
    onChange({ ...cell, keys: [...cell.keys, trimmed] })
    setDraft('')
  }

  function removeKey(key: string) {
    onChange({ ...cell, keys: cell.keys.filter((k) => k !== key) })
  }

  return (
    <div className="space-y-2" onClick={onFocus}>
      <div className="flex items-center justify-end">
        <CellAIFillButton loading={autofilling} onClick={onAutofill} />
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[12px]">📚</span>
        {cell.keys.map((k) => (
          <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1a1f2e] text-[11px] text-[#a78bfa] font-mono">
            {k}
            <button onClick={() => removeKey(k)} className="text-[#3d4558] hover:text-[#f87171] transition-colors">×</button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          placeholder="Add citation key (e.g. Smith2020)"
          onChange={(e) => setDraft(e.target.value)}
          onFocus={onFocus}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addKey() }
          }}
          onBlur={addKey}
          className="flex-1 min-w-[180px] bg-transparent text-[12px] font-mono text-[#c9cdd8] placeholder-[#3d4558] focus:outline-none"
        />
      </div>
      <input
        type="text"
        value={cell.context || ''}
        placeholder="Optional: sentence using this citation…"
        onChange={(e) => onChange({ ...cell, context: e.target.value || undefined })}
        className="w-full bg-transparent text-[12px] text-[#7a839a] placeholder-[#3d4558] italic focus:outline-none"
      />
      {cell.keys.length > 0 && (
        <p className="text-[10px] text-[#3d4558] font-mono">→ \cite{`{${cell.keys.join(', ')}}`}</p>
      )}
    </div>
  )
}
