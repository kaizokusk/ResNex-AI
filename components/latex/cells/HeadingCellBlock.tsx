'use client'
import { HeadingCell } from '../../../lib/cell-types'
import { CellAIFillButton } from './CellAIFillButton'

interface Props {
  cell: HeadingCell
  onChange: (updated: HeadingCell) => void
  onFocus: () => void
  onAutofill: () => void
  autofilling?: boolean
}

export function HeadingCellBlock({ cell, onChange, onFocus, onAutofill, autofilling = false }: Props) {
  const isH2 = cell.level === 2

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <CellAIFillButton loading={autofilling} onClick={onAutofill} />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange({ ...cell, level: isH2 ? 3 : 2 })}
          className="flex-shrink-0 text-[9px] font-bold text-[#3d4558] hover:text-[#7c6af5] px-1.5 py-0.5 rounded border border-[#252a38] hover:border-[#7c6af5] transition-colors"
          title="Toggle heading level"
        >
          {isH2 ? '##' : '###'}
        </button>

        <input
          type="text"
          value={cell.content}
          placeholder={isH2 ? 'Subsection heading…' : 'Sub-subsection heading…'}
          onFocus={onFocus}
          onChange={(e) => onChange({ ...cell, content: e.target.value })}
          className={`flex-1 bg-transparent focus:outline-none placeholder-[#3d4558] text-[#e8eaf0] font-semibold
            ${isH2 ? 'text-[15px]' : 'text-[13px]'}`}
        />
      </div>
    </div>
  )
}
