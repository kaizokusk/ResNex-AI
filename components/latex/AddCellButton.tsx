'use client'
import { useRef, useState, useEffect } from 'react'
import { CellType } from '../../lib/cell-types'

const CELL_OPTIONS: { type: CellType; icon: string; label: string; description: string }[] = [
  { type: 'text',     icon: '📝', label: 'Text',     description: 'Plain paragraph' },
  { type: 'heading',  icon: '##', label: 'Heading',  description: 'Section or sub-section heading' },
  { type: 'figure',   icon: '📷', label: 'Figure',   description: 'Upload an image with caption' },
  { type: 'table',    icon: '📊', label: 'Table',    description: 'Editable data table' },
  { type: 'equation', icon: '∑',  label: 'Equation', description: 'Mathematical formula' },
  { type: 'citation', icon: '📚', label: 'Citation', description: 'Reference key (e.g. Smith2020)' },
  { type: 'note',     icon: '🗒', label: 'Note',     description: 'Private reminder — excluded from PDF' },
]

interface Props {
  onAdd: (type: CellType) => void
}

export function AddCellButton({ onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative flex items-center justify-center py-1 group">
      {/* Divider line */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-[#1a1f2e] group-hover:bg-[#252a38] transition-colors" />

      <button
        onClick={() => setOpen((v) => !v)}
        className="relative z-10 flex items-center gap-1 px-3 py-0.5 rounded-full bg-[#0a0c10] border border-[#1a1f2e] hover:border-[#7c6af5] text-[#3d4558] hover:text-[#7c6af5] text-[11px] font-semibold transition-all opacity-0 group-hover:opacity-100"
      >
        <span className="text-base leading-none">+</span>
        <span>Add Cell</span>
        <span className="text-[9px]">▾</span>
      </button>

      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 w-56 bg-[#0d1018] border border-[#252a38] rounded-xl shadow-2xl overflow-hidden">
          {CELL_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              onClick={() => { onAdd(opt.type); setOpen(false) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#1a1f2e] transition-colors text-left"
            >
              <span className="text-[13px] w-5 text-center flex-shrink-0">{opt.icon}</span>
              <div>
                <div className="text-[12px] font-semibold text-[#e8eaf0]">{opt.label}</div>
                <div className="text-[10px] text-[#3d4558]">{opt.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
