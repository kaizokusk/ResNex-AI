'use client'
// components/latex/FileTreeItem.tsx — single file row in the tree

import { useState } from 'react'
import { LatexFile, useLatexStore } from '../../store/latexStore'

interface Props {
  file: LatexFile
  projectId: string
  isActive: boolean
  onDelete: (id: string) => void
}

function fileIcon(file: LatexFile): string {
  if (file.isMain) return '⭐'
  if (file.fileName.endsWith('.json') && file.fileName.startsWith('sections/')) return '📓'
  if (file.type === 'IMAGE') return '🖼'
  if (file.type === 'DATA') return '📊'
  if (file.fileName.endsWith('.bib')) return '📚'
  return '📄'
}

function displayName(fileName: string): string {
  if (fileName.startsWith('sections/') && fileName.endsWith('.json')) {
    const raw = fileName.replace('sections/', '').replace('.json', '')
    return raw.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return fileName
}

export function FileTreeItem({ file, projectId, isActive, onDelete }: Props) {
  const { setActiveFile, unsavedIds } = useLatexStore()
  const [showMenu, setShowMenu] = useState(false)
  const isUnsaved = unsavedIds.has(file.id)
  const isSection = file.fileName.endsWith('.json') && file.fileName.startsWith('sections/')

  return (
    <div
      className={`group relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer text-xs select-none
        ${isActive ? 'bg-[#1a1f2e] text-[#e8eaf0]' : 'text-[#7a839a] hover:bg-[#0d1018] hover:text-[#e8eaf0]'}`}
      onClick={() => setActiveFile(file.id)}
      onContextMenu={(e) => { e.preventDefault(); setShowMenu(true) }}
    >
      <span className="flex-shrink-0 text-[11px]">{fileIcon(file)}</span>
      <span className="flex-1 truncate font-mono">
        {isSection ? displayName(file.fileName) : file.fileName}
      </span>
      {isUnsaved && <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] flex-shrink-0" title="Unsaved" />}

      {/* Context menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute left-full top-0 ml-1 z-50 bg-[#0d1018] border border-[#252a38] rounded-lg shadow-xl overflow-hidden min-w-[120px]">
            {!file.isMain && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(file.id); setShowMenu(false) }}
                className="w-full px-3 py-2 text-left text-xs text-[#f87171] hover:bg-[#1a1f2e] transition-colors"
              >
                Delete
              </button>
            )}
            {file.isMain && (
              <div className="px-3 py-2 text-xs text-[#3d4558]">Main file</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
