'use client'
// components/latex/FileTree.tsx — left sidebar file tree

import { useRef } from 'react'
import { useLatexStore, LatexFile } from '../../store/latexStore'
import { sanitizeLatexAssetFileName } from '../../lib/latex-assets'
import { FileTreeItem } from './FileTreeItem'
import { uploadFiles } from '../../lib/uploadthingClient'

interface Props {
  projectId: string
  onRefresh: () => void
}

export function FileTree({ projectId, onRefresh }: Props) {
  const { files, activeFileId, upsertFile, removeFile } = useLatexStore()
  const uploadRef = useRef<HTMLInputElement>(null)

  // Section notebook files (.json in sections/) shown first, grouped separately
  const sectionFiles = files
    .filter((f) => f.fileName.startsWith('sections/') && f.fileName.endsWith('.json'))
    .sort((a, b) => a.fileName.localeCompare(b.fileName))

  const codeFiles = files
    .filter((f) => f.type === 'CODE' && !(f.fileName.startsWith('sections/') && f.fileName.endsWith('.json')))
    .sort((a, b) => {
      if (a.isMain) return -1
      if (b.isMain) return 1
      return a.fileName.localeCompare(b.fileName)
    })

  const assetFiles = files.filter((f) => f.type !== 'CODE').sort((a, b) => a.fileName.localeCompare(b.fileName))

  async function handleNewFile() {
    const name = window.prompt('File name (e.g. sections/intro.tex):')
    if (!name?.trim()) return
    const res = await fetch(`/api/projects/${projectId}/latex/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: name.trim(), type: 'CODE', content: '' }),
    })
    if (res.ok) {
      const file: LatexFile = await res.json()
      upsertFile(file)
    } else {
      const err = await res.json()
      alert(err.error || 'Failed to create file')
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const isImage = file.type.startsWith('image/')
    const isData = file.type === 'text/csv' || file.name.endsWith('.csv')
    const fileType = isImage ? 'IMAGE' : isData ? 'DATA' : 'CODE'

    try {
      const [uploaded] = await uploadFiles('latexAsset', { files: [file] })
      const url = uploaded.url
      const safeFileName = sanitizeLatexAssetFileName(`figures/${file.name}`)

      const res = await fetch(`/api/projects/${projectId}/latex/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: safeFileName, type: fileType, fileUrl: url }),
      })
      if (res.ok) {
        const created: LatexFile = await res.json()
        upsertFile(created)
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to save file record')
      }
    } catch (err: any) {
      alert(err?.message || 'Upload failed')
    }
    e.target.value = ''
  }

  async function handleDelete(fileId: string) {
    if (!confirm('Delete this file?')) return
    const res = await fetch(`/api/projects/${projectId}/latex/files/${fileId}`, { method: 'DELETE' })
    if (res.ok) {
      removeFile(fileId)
    } else {
      const err = await res.json()
      alert(err.error || 'Delete failed')
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0c10] border-r border-[#1a1f2e]">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-[#1a1f2e] flex items-center justify-between">
        <span className="text-[10px] font-bold text-[#3d4558] uppercase tracking-wider">Files</span>
        <div className="flex gap-1">
          <button
            onClick={handleNewFile}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#1a1f2e] text-[#3d4558] hover:text-[#e8eaf0] text-xs transition-colors"
            title="New file"
          >+</button>
          <button
            onClick={() => uploadRef.current?.click()}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#1a1f2e] text-[#3d4558] hover:text-[#e8eaf0] text-xs transition-colors"
            title="Upload image/CSV"
          >↑</button>
          <input ref={uploadRef} type="file" accept="image/*,.csv" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
        {sectionFiles.length === 0 && codeFiles.length === 0 && assetFiles.length === 0 && (
          <p className="text-[10px] text-[#3d4558] text-center mt-4 px-2">
            Pick a template to start, or click + to create files.
          </p>
        )}

        {/* Template section files — notebook cells */}
        {sectionFiles.length > 0 && (
          <>
            <div className="px-2 pt-1 pb-1">
              <span className="text-[9px] font-bold text-[#3d4558] uppercase tracking-wider">📓 Sections</span>
            </div>
            {sectionFiles.map((f) => (
              <FileTreeItem
                key={f.id}
                file={f}
                projectId={projectId}
                isActive={f.id === activeFileId}
                onDelete={handleDelete}
              />
            ))}
            {codeFiles.length > 0 && <div className="h-px bg-[#1a1f2e] my-1" />}
          </>
        )}

        {/* Raw LaTeX / bib files */}
        {codeFiles.map((f) => (
          <FileTreeItem
            key={f.id}
            file={f}
            projectId={projectId}
            isActive={f.id === activeFileId}
            onDelete={handleDelete}
          />
        ))}

        {assetFiles.length > 0 && (
          <>
            <div className="px-2 pt-2 pb-1">
              <span className="text-[9px] font-bold text-[#3d4558] uppercase tracking-wider">Assets</span>
            </div>
            {assetFiles.map((f) => (
              <FileTreeItem
                key={f.id}
                file={f}
                projectId={projectId}
                isActive={f.id === activeFileId}
                onDelete={handleDelete}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
