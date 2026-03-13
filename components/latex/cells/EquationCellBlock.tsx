'use client'
import { EquationCell } from '../../../lib/cell-types'
import { CellAIFillButton } from './CellAIFillButton'

interface Props {
  cell: EquationCell
  onChange: (updated: EquationCell) => void
  onFocus: () => void
  onAutofill: () => void
  autofilling?: boolean
}

export function EquationCellBlock({ cell, onChange, onFocus, onAutofill, autofilling = false }: Props) {
  return (
    <div className="space-y-1.5" onClick={onFocus}>
      <div className="flex items-center justify-end">
        <CellAIFillButton loading={autofilling} onClick={onAutofill} />
      </div>
      <div className="flex items-center gap-2 bg-[#0d1018] rounded-lg px-3 py-2 border border-[#252a38]">
        <span className="text-[#7c6af5] font-bold text-sm flex-shrink-0">∑</span>
        <input
          type="text"
          value={cell.formula}
          placeholder="LaTeX formula, e.g.  E = mc^2  or  \frac{a}{b}"
          onChange={(e) => onChange({ ...cell, formula: e.target.value })}
          className="flex-1 bg-transparent text-[12px] font-mono text-[#c9cdd8] placeholder-[#3d4558] focus:outline-none"
        />
      </div>
      {cell.formula && (
        <p className="text-[10px] text-[#3d4558] px-1">
          Will render as: <code className="text-[#7c6af5]">\begin{'{'+'equation'+'}'}{cell.formula}\end{'{'+'equation'+'}'}</code>
        </p>
      )}
      <input
        type="text"
        value={cell.label || ''}
        placeholder="Label (optional, e.g. eq:loss)"
        onChange={(e) => onChange({ ...cell, label: e.target.value || undefined })}
        className="w-full bg-transparent text-[11px] text-[#3d4558] placeholder-[#3d4558] focus:outline-none focus:text-[#7a839a] font-mono"
      />
    </div>
  )
}
