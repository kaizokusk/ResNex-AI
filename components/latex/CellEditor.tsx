'use client'
// components/latex/CellEditor.tsx
// Notebook-style cell editor for .json section files

import { useEffect, useRef, useState } from 'react'
import { Cell, CellType, SectionDoc, TextCell, newCell } from '../../lib/cell-types'
import { LatexFile, useLatexStore } from '../../store/latexStore'
import { AddCellButton } from './AddCellButton'
import { TextCellBlock } from './cells/TextCellBlock'
import { HeadingCellBlock } from './cells/HeadingCellBlock'
import { FigureCellBlock } from './cells/FigureCellBlock'
import { TableCellBlock } from './cells/TableCellBlock'
import { EquationCellBlock } from './cells/EquationCellBlock'
import { NoteCellBlock } from './cells/NoteCellBlock'
import { CitationCellBlock } from './cells/CitationCellBlock'
import { useToast } from '../ui'

interface Props {
  file: LatexFile
  projectId: string
}

function sectionLabel(fileName: string): string {
  const raw = fileName.replace('sections/', '').replace('.json', '')
  return raw.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function wordCount(cells: Cell[]): number {
  return cells.reduce((acc, cell) => {
    if (cell.type === 'text' || cell.type === 'note' || cell.type === 'heading') {
      return acc + (cell.content?.trim().split(/\s+/).filter(Boolean).length ?? 0)
    }
    return acc
  }, 0)
}

export function CellEditor({ file, projectId }: Props) {
  const { updateLocalContent, markSaved } = useLatexStore()
  const { error, success } = useToast()
  const [cells, setCells] = useState<Cell[]>([])
  const [activeCellId, setActiveCellId] = useState<string | null>(null)
  const [inferringId, setInferringId] = useState<string | null>(null)
  const [autofillingId, setAutofillingId] = useState<string | null>(null)
  const [suggesting, setSuggesting] = useState(false)
  const [suggestMode, setSuggestMode] = useState<'fill' | 'append' | null>(null)
  const [showSuggestMenu, setShowSuggestMenu] = useState(false)
  const saveTimer = useRef<NodeJS.Timeout>()

  // Parse cells when file changes
  useEffect(() => {
    try {
      const doc: SectionDoc = JSON.parse(file.content || '{}')
      setCells(doc.cells ?? [])
    } catch {
      setCells([])
    }
    setActiveCellId(null)
  }, [file.id])

  // Persist changes
  function updateCells(next: Cell[]) {
    setCells(next)
    const json = JSON.stringify({ cells: next })
    updateLocalContent(file.id, json)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(json), 800)
  }

  async function save(json: string) {
    try {
      await fetch(`/api/projects/${projectId}/latex/files/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: json }),
      })
      markSaved(file.id)
    } catch {
      // Will retry on next change
    }
  }

  function insertCell(type: CellType, afterIndex: number) {
    const cell = newCell(type)
    const next = [...cells]
    next.splice(afterIndex + 1, 0, cell)
    updateCells(next)
    setActiveCellId(cell.id)
  }

  function updateCell(updated: Cell) {
    updateCells(cells.map((c) => (c.id === updated.id ? updated : c)))
  }

  function deleteCell(id: string) {
    updateCells(cells.filter((c) => c.id !== id))
    setActiveCellId(null)
  }

  function moveCell(id: string, dir: -1 | 1) {
    const idx = cells.findIndex((c) => c.id === id)
    if (idx < 0) return
    const next = [...cells]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    updateCells(next)
  }

  async function handleSuggest(mode: 'fill' | 'append') {
    setSuggestMode(mode)
    setSuggesting(true)
    setShowSuggestMenu(false)
    try {
      const res = await fetch(`/api/projects/${projectId}/latex/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionFileName: file.fileName }),
      })
      if (!res.ok) return
      const { cells: suggested } = await res.json()
      if (!Array.isArray(suggested) || suggested.length === 0) return

      if (mode === 'fill') {
        updateCells(suggested)
      } else {
        updateCells([...cells, ...suggested])
      }
    } catch {
      // Silent fail
    } finally {
      setSuggesting(false)
      setSuggestMode(null)
    }
  }

  async function handleInfer(cell: Cell) {
    if (cell.type !== 'figure' && cell.type !== 'table') return
    setInferringId(cell.id)
    try {
      const sectionName = sectionLabel(file.fileName)
      const res = await fetch(`/api/projects/${projectId}/latex/infer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionName,
          cellType: cell.type,
          figure: cell.type === 'figure' ? { fileUrl: cell.fileUrl, fileName: cell.fileName, caption: cell.caption } : undefined,
          table: cell.type === 'table' ? { headers: cell.headers, rows: cell.rows, caption: cell.caption } : undefined,
        }),
      })
      if (!res.ok) return
      const { text } = await res.json()
      if (!text) return

      const textCell = newCell('text') as TextCell
      textCell.content = text
      const idx = cells.findIndex((c) => c.id === cell.id)
      const next = [...cells]
      next.splice(idx + 1, 0, textCell)
      updateCells(next)
      setActiveCellId(textCell.id)
    } catch {
      // Infer failed silently
    } finally {
      setInferringId(null)
    }
  }

  async function handleAutofill(cell: Cell) {
    if (!['text', 'heading', 'note', 'equation', 'citation'].includes(cell.type)) return

    setAutofillingId(cell.id)
    try {
      const res = await fetch(`/api/projects/${projectId}/latex/autofill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionFileName: file.fileName,
          cellId: cell.id,
          cellType: cell.type,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        error(data.error || 'AI fill failed')
        return
      }

      const { result } = await res.json()
      if (!result || typeof result !== 'object') {
        error('AI fill returned no usable result')
        return
      }

      switch (cell.type) {
        case 'text':
        case 'heading':
        case 'note':
          if (typeof result.content === 'string' && result.content.trim()) {
            updateCell({ ...cell, content: result.content })
            success('Cell filled with AI')
          } else {
            error('AI fill returned empty content')
          }
          break
        case 'equation':
          if (typeof result.formula === 'string' && result.formula.trim()) {
            updateCell({ ...cell, formula: result.formula, label: result.label || undefined })
            success('Equation filled with AI')
          } else {
            error('AI fill returned empty equation content')
          }
          break
        case 'citation':
          if (Array.isArray(result.keys) || typeof result.context === 'string') {
            updateCell({
              ...cell,
              keys: Array.isArray(result.keys) ? result.keys.filter(Boolean) : cell.keys,
              context: typeof result.context === 'string' ? result.context : cell.context,
            })
            success('Citation suggestions added')
          } else {
            error('AI fill returned no citation data')
          }
          break
      }
    } catch {
      error('AI fill failed')
    } finally {
      setAutofillingId(null)
    }
  }

  const label = sectionLabel(file.fileName)
  const words = wordCount(cells)

  return (
    <div className="flex flex-col h-full bg-[#0a0c10]">
      {/* Section header */}
      <div className="px-8 pt-6 pb-3 border-b border-[#1a1f2e] flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-[#e8eaf0]">{label}</h1>
          <p className="text-[10px] text-[#3d4558] mt-0.5">{words} words · {cells.length} cells</p>
        </div>
        <div className="flex items-center gap-2 relative">
          <span className="text-[10px] text-[#3d4558] italic">Auto-saves</span>
          <div className="relative">
            <button
              onClick={() => setShowSuggestMenu((v) => !v)}
              disabled={suggesting}
              className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#1a0d2e] border border-[#3d2a6b] text-[#a78bfa] hover:bg-[#2d1a4e] disabled:opacity-50 transition-colors"
            >
              <span>✨</span>
              <span>{suggesting ? 'Generating…' : 'AI Suggest'}</span>
              <span className="text-[9px]">▾</span>
            </button>
            {showSuggestMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-[#0d1018] border border-[#252a38] rounded-xl shadow-2xl overflow-hidden">
                <button
                  onClick={() => handleSuggest('fill')}
                  className="w-full px-3 py-2.5 text-left hover:bg-[#1a1f2e] transition-colors"
                >
                  <div className="text-[11px] font-semibold text-[#e8eaf0]">Fill section</div>
                  <div className="text-[10px] text-[#3d4558]">Replace with AI-generated cells</div>
                </button>
                <button
                  onClick={() => handleSuggest('append')}
                  className="w-full px-3 py-2.5 text-left hover:bg-[#1a1f2e] transition-colors border-t border-[#1a1f2e]"
                >
                  <div className="text-[11px] font-semibold text-[#e8eaf0]">Add below</div>
                  <div className="text-[10px] text-[#3d4558]">Append AI cells to existing content</div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cells */}
      <div className="flex-1 overflow-y-auto px-8 py-4">
        {/* Add cell at top */}
        <AddCellButton onAdd={(type) => insertCell(type, -1)} />

        {cells.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#3d4558] text-sm">This section is empty.</p>
            <p className="text-[#3d4558] text-[11px] mt-1">Click "+ Add Cell" above to start writing.</p>
          </div>
        )}

        {cells.map((cell, idx) => {
          const isActive = activeCellId === cell.id
          return (
            <div key={cell.id} className="group/cell relative">
              {/* Cell wrapper */}
              <div
                className={`relative rounded-xl px-4 py-3 transition-all
                  ${isActive
                    ? 'bg-[#0d1018] ring-1 ring-[#252a38]'
                    : 'hover:bg-[#0d1018]/50'}`}
              >
                {/* Cell type badge + controls */}
                <div className="absolute right-3 top-2 flex items-center gap-1 opacity-0 group-hover/cell:opacity-100 transition-opacity">
                  <span className="text-[9px] text-[#3d4558] uppercase font-bold">{cell.type}</span>
                  <button
                    onClick={() => moveCell(cell.id, -1)}
                    disabled={idx === 0}
                    className="w-5 h-5 flex items-center justify-center rounded text-[#3d4558] hover:text-[#e8eaf0] hover:bg-[#1a1f2e] disabled:opacity-20 transition-colors text-[10px]"
                    title="Move up"
                  >↑</button>
                  <button
                    onClick={() => moveCell(cell.id, 1)}
                    disabled={idx === cells.length - 1}
                    className="w-5 h-5 flex items-center justify-center rounded text-[#3d4558] hover:text-[#e8eaf0] hover:bg-[#1a1f2e] disabled:opacity-20 transition-colors text-[10px]"
                    title="Move down"
                  >↓</button>
                  <button
                    onClick={() => deleteCell(cell.id)}
                    className="w-5 h-5 flex items-center justify-center rounded text-[#3d4558] hover:text-[#f87171] hover:bg-[#1a1f2e] transition-colors text-[10px]"
                    title="Delete cell"
                  >×</button>
                </div>

                {/* Cell content */}
                {cell.type === 'text' && (
                  <TextCellBlock
                    cell={cell}
                    onChange={updateCell}
                    isActive={isActive}
                    onFocus={() => setActiveCellId(cell.id)}
                    onAutofill={() => handleAutofill(cell)}
                    autofilling={autofillingId === cell.id}
                  />
                )}
                {cell.type === 'heading' && (
                  <HeadingCellBlock
                    cell={cell}
                    onChange={updateCell}
                    onFocus={() => setActiveCellId(cell.id)}
                    onAutofill={() => handleAutofill(cell)}
                    autofilling={autofillingId === cell.id}
                  />
                )}
                {cell.type === 'figure' && (
                  <FigureCellBlock
                    cell={cell}
                    onChange={updateCell}
                    onFocus={() => setActiveCellId(cell.id)}
                    onInfer={() => handleInfer(cell)}
                    inferring={inferringId === cell.id}
                  />
                )}
                {cell.type === 'table' && (
                  <TableCellBlock
                    cell={cell}
                    onChange={updateCell}
                    onFocus={() => setActiveCellId(cell.id)}
                    onInfer={() => handleInfer(cell)}
                    inferring={inferringId === cell.id}
                  />
                )}
                {cell.type === 'equation' && (
                  <EquationCellBlock
                    cell={cell}
                    onChange={updateCell}
                    onFocus={() => setActiveCellId(cell.id)}
                    onAutofill={() => handleAutofill(cell)}
                    autofilling={autofillingId === cell.id}
                  />
                )}
                {cell.type === 'note' && (
                  <NoteCellBlock
                    cell={cell}
                    onChange={updateCell}
                    onFocus={() => setActiveCellId(cell.id)}
                    onAutofill={() => handleAutofill(cell)}
                    autofilling={autofillingId === cell.id}
                  />
                )}
                {cell.type === 'citation' && (
                  <CitationCellBlock
                    cell={cell}
                    onChange={updateCell}
                    onFocus={() => setActiveCellId(cell.id)}
                    onAutofill={() => handleAutofill(cell)}
                    autofilling={autofillingId === cell.id}
                  />
                )}
              </div>

              {/* Add cell after this one */}
              <AddCellButton onAdd={(type) => insertCell(type, idx)} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
