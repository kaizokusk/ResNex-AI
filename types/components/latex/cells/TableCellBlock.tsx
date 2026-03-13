'use client'
import { TableCell } from '../../../lib/cell-types'

interface Props {
  cell: TableCell
  onChange: (updated: TableCell) => void
  onFocus: () => void
  onInfer: () => void
  inferring: boolean
}

export function TableCellBlock({ cell, onChange, onFocus, onInfer, inferring }: Props) {
  function updateHeader(col: number, value: string) {
    const headers = [...cell.headers]
    headers[col] = value
    onChange({ ...cell, headers })
  }

  function updateCell(row: number, col: number, value: string) {
    const rows = cell.rows.map((r) => [...r])
    rows[row][col] = value
    onChange({ ...cell, rows })
  }

  function addRow() {
    onChange({ ...cell, rows: [...cell.rows, cell.headers.map(() => '')] })
  }

  function addCol() {
    onChange({
      ...cell,
      headers: [...cell.headers, `Column ${cell.headers.length + 1}`],
      rows: cell.rows.map((r) => [...r, '']),
    })
  }

  function deleteRow(i: number) {
    if (cell.rows.length <= 1) return
    onChange({ ...cell, rows: cell.rows.filter((_, idx) => idx !== i) })
  }

  function deleteCol(j: number) {
    if (cell.headers.length <= 1) return
    onChange({
      ...cell,
      headers: cell.headers.filter((_, idx) => idx !== j),
      rows: cell.rows.map((r) => r.filter((_, idx) => idx !== j)),
    })
  }

  const cellCls = 'border border-[#252a38] px-2 py-1 text-[11px] bg-transparent focus:outline-none focus:bg-[#0d1018] text-[#c9cdd8] min-w-[80px]'

  return (
    <div className="space-y-2" onClick={onFocus}>
      {/* Caption */}
      <input
        type="text"
        value={cell.caption}
        placeholder="Table caption…"
        onChange={(e) => onChange({ ...cell, caption: e.target.value })}
        className="w-full bg-transparent text-[12px] text-[#7a839a] placeholder-[#3d4558] italic focus:outline-none border-b border-transparent focus:border-[#252a38] pb-0.5 transition-colors"
      />

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="border-collapse">
          <thead>
            <tr>
              {cell.headers.map((h, j) => (
                <th key={j} className="relative group">
                  <input
                    value={h}
                    onChange={(e) => updateHeader(j, e.target.value)}
                    className={`${cellCls} font-bold text-[#e8eaf0] bg-[#1a1f2e]`}
                  />
                  {cell.headers.length > 1 && (
                    <button
                      onClick={() => deleteCol(j)}
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#f87171] text-white text-[8px] items-center justify-center hidden group-hover:flex"
                    >×</button>
                  )}
                </th>
              ))}
              <th>
                <button
                  onClick={addCol}
                  className="px-2 py-1 text-[11px] text-[#3d4558] hover:text-[#7c6af5] transition-colors"
                  title="Add column"
                >+ Col</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {cell.rows.map((row, i) => (
              <tr key={i} className="group/row">
                {row.map((val, j) => (
                  <td key={j}>
                    <input
                      value={val}
                      onChange={(e) => updateCell(i, j, e.target.value)}
                      className={cellCls}
                    />
                  </td>
                ))}
                <td>
                  {cell.rows.length > 1 && (
                    <button
                      onClick={() => deleteRow(i)}
                      className="px-1 text-[11px] text-[#3d4558] hover:text-[#f87171] opacity-0 group-hover/row:opacity-100 transition-all"
                    >×</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={addRow}
        className="text-[11px] text-[#3d4558] hover:text-[#7c6af5] transition-colors"
      >+ Add Row</button>

      {/* Infer button */}
      {(cell.headers.some(Boolean) || cell.rows.some((r) => r.some(Boolean))) && (
        <button
          onClick={onInfer}
          disabled={inferring}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7c6af5] hover:text-[#a78bfa] disabled:opacity-50 transition-colors"
        >
          <span>✨</span>
          <span>{inferring ? 'Generating analysis…' : 'Infer — write analysis of this table'}</span>
        </button>
      )}
    </div>
  )
}
