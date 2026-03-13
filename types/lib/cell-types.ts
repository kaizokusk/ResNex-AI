// lib/cell-types.ts — Cell data model for notebook-style section authoring

export type CellType = 'text' | 'heading' | 'figure' | 'table' | 'equation' | 'note' | 'citation'

export interface TextCell {
  id: string
  type: 'text'
  content: string
}

export interface HeadingCell {
  id: string
  type: 'heading'
  level: 2 | 3
  content: string
}

export interface FigureCell {
  id: string
  type: 'figure'
  fileUrl: string
  fileName: string
  caption: string
}

export interface TableCell {
  id: string
  type: 'table'
  caption: string
  headers: string[]
  rows: string[][]
}

export interface EquationCell {
  id: string
  type: 'equation'
  formula: string
  label?: string
}

export interface NoteCell {
  id: string
  type: 'note'
  content: string
}

export interface CitationCell {
  id: string
  type: 'citation'
  keys: string[]      // e.g. ["Smith2020", "Jones2021"]
  context?: string    // optional sentence the citation belongs to
}

export type Cell = TextCell | HeadingCell | FigureCell | TableCell | EquationCell | NoteCell | CitationCell

export interface SectionDoc {
  cells: Cell[]
}

function genId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function newCell(type: CellType): Cell {
  const id = genId()
  switch (type) {
    case 'text':     return { id, type, content: '' }
    case 'heading':  return { id, type, level: 2, content: '' }
    case 'figure':   return { id, type, fileUrl: '', fileName: '', caption: '' }
    case 'table':    return { id, type, caption: '', headers: ['Column 1', 'Column 2'], rows: [['', '']] }
    case 'equation': return { id, type, formula: '' }
    case 'note':     return { id, type, content: '' }
    case 'citation': return { id, type, keys: [], context: '' }
  }
}
