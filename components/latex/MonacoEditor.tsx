'use client'
// components/latex/MonacoEditor.tsx — Monaco code editor with auto-save

import { useEffect, useRef, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { useLatexStore } from '../../store/latexStore'

interface Props {
  projectId: string
  onFocus?: (fileId: string) => void
  onBlur?: (fileId: string) => void
}

export function MonacoEditor({ projectId, onFocus, onBlur }: Props) {
  const { files, activeFileId, localContent, updateLocalContent, markSaved } = useLatexStore()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeFile = files.find((f) => f.id === activeFileId) ?? null

  // Current editor value: local draft if exists, else persisted content
  const value = activeFileId
    ? (localContent[activeFileId] ?? activeFile?.content ?? '')
    : ''

  const saveFile = useCallback(
    async (fileId: string, content: string) => {
      const res = await fetch(`/api/projects/${projectId}/latex/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (res.ok) {
        markSaved(fileId)
        // Emit socket event for other members
        // Socket client should emit 'latex_file_updated' after this
      }
    },
    [projectId, markSaved]
  )

  function handleChange(newValue: string | undefined) {
    if (!activeFileId || newValue === undefined) return
    updateLocalContent(activeFileId, newValue)

    // Debounce 500ms auto-save
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveFile(activeFileId, newValue)
    }, 500)
  }

  // Cmd/Ctrl+S force save
  function handleKeyDown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      if (!activeFileId) return
      const content = localContent[activeFileId] ?? activeFile?.content ?? ''
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveFile(activeFileId, content)
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeFileId, localContent, activeFile])

  // Clean up timer on unmount
  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }, [])

  if (!activeFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0c10]">
        <p className="text-xs text-[#3d4558] text-center">
          Select a file to edit,<br />or click <span className="text-[#7c6af5]">Sync Sections</span> to start.
        </p>
      </div>
    )
  }

  if (activeFile.type === 'IMAGE') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0c10] gap-3">
        <img
          src={activeFile.fileUrl ?? ''}
          alt={activeFile.fileName}
          className="max-w-full max-h-[60vh] rounded-lg border border-[#1a1f2e] object-contain"
        />
        <p className="text-[10px] text-[#3d4558] font-mono">{activeFile.fileName}</p>
        {activeFile.fileUrl && (
          <p className="text-[10px] text-[#4f8ef7] font-mono break-all max-w-xs text-center">
            {activeFile.fileUrl}
          </p>
        )}
      </div>
    )
  }

  if (activeFile.type === 'DATA') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0c10] gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#252a38] flex items-center justify-center text-lg">📊</div>
        <p className="text-xs text-[#7a839a]">{activeFile.fileName}</p>
        {activeFile.fileUrl && (
          <a href={activeFile.fileUrl} target="_blank" rel="noreferrer"
            className="text-[10px] text-[#4f8ef7] hover:underline">
            Download file
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0">
      <Editor
        height="100%"
        defaultLanguage="latex"
        value={value}
        onChange={handleChange}
        onMount={(editor) => {
          editor.onDidFocusEditorText(() => {
            if (activeFileId) onFocus?.(activeFileId)
          })
          editor.onDidBlurEditorText(() => {
            if (activeFileId) onBlur?.(activeFileId)
          })
        }}
        theme="vs-dark"
        options={{
          fontSize: 13,
          fontFamily: 'monospace',
          minimap: { enabled: false },
          wordWrap: 'on',
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          automaticLayout: true,
        }}
      />
    </div>
  )
}
