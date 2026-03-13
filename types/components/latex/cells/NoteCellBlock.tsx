'use client'
import { useEffect, useRef } from 'react'
import { NoteCell } from '../../../lib/cell-types'
import { CellAIFillButton } from './CellAIFillButton'

interface Props {
  cell: NoteCell
  onChange: (updated: NoteCell) => void
  onFocus: () => void
  onAutofill: () => void
  autofilling?: boolean
}

export function NoteCellBlock({ cell, onChange, onFocus, onAutofill, autofilling = false }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [cell.content])

  return (
    <div className="bg-[#1a1400] border border-[#3d3000] rounded-lg px-3 py-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[10px]">🗒</span>
        <span className="text-[9px] font-bold text-[#b45309] uppercase tracking-wider">Private Note — not included in PDF</span>
        <div className="ml-auto">
          <CellAIFillButton loading={autofilling} onClick={onAutofill} />
        </div>
      </div>
      <textarea
        ref={ref}
        value={cell.content}
        placeholder="Add a private note or reminder…"
        onFocus={onFocus}
        onChange={(e) => {
          onChange({ ...cell, content: e.target.value })
          const el = ref.current
          if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' }
        }}
        rows={1}
        className="w-full bg-transparent resize-none text-[12px] text-[#d97706] placeholder-[#92400e] focus:outline-none leading-relaxed"
        style={{ minHeight: '1.5rem', overflow: 'hidden' }}
      />
    </div>
  )
}
