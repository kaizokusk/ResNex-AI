'use client'
// app/project/[id]/latex/page.tsx — Three-column LaTeX IDE

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { PageHeader } from '../../../../components/layout/PageHeader'
import { FileTree } from '../../../../components/latex/FileTree'
import { MonacoEditor } from '../../../../components/latex/MonacoEditor'
import { CellEditor } from '../../../../components/latex/CellEditor'
import { PdfPreview } from '../../../../components/latex/PdfPreview'
import { TopActionBar } from '../../../../components/latex/TopActionBar'
import { ConflictBanner } from '../../../../components/latex/ConflictBanner'
import { WritingProgress } from '../../../../components/latex/WritingProgress'
import { useLatexStore } from '../../../../store/latexStore'
import { ToastProvider } from '../../../../components/ui'

export default function LatexPage() {
  const params = useParams()
  const id = params.id as string
  const { setFiles, upsertFile, activeFileId, files } = useLatexStore()
  const socketRef = useRef<Socket | null>(null)
  const [conflict, setConflict] = useState<{ userName: string; fileName: string } | null>(null)

  const tabs = [
    { label: 'Overview',     href: `/project/${id}`, icon: '⬡' },
    { label: 'Chat',         href: `/project/${id}/chat`, icon: '💬' },
    { label: 'Discover',     href: `/project/${id}/discover`, icon: '🔍' },
    { label: 'Library',      href: `/project/${id}/library`, icon: '📚' },
    { label: 'Agents',       href: `/project/${id}/agents`, icon: '🤖' },
    { label: 'LaTeX',        href: `/project/${id}/latex`, icon: 'τ' },
    { label: 'Output',       href: `/project/${id}/output`, icon: '⬇' },
    { label: 'Contributors', href: `/project/${id}/contributors`, icon: '👥' },
  ]

  // Load file list on mount
  useEffect(() => {
    fetch(`/api/projects/${id}/latex/files`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setFiles(data) })
      .catch(console.error)
  }, [id, setFiles])

  // Socket.io — realtime conflict detection + file update notifications
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL
    if (!socketUrl) return

    const socket = io(socketUrl, { transports: ['websocket'] })
    socketRef.current = socket

    socket.emit('join_project', { projectId: id })

    // Another member saved a file — reload it
    socket.on('latex_file_updated', (data: { fileId: string; fileName: string; updatedBy: string }) => {
      fetch(`/api/projects/${id}/latex/files`)
        .then((r) => r.json())
        .then((updated: any[]) => { if (Array.isArray(updated)) setFiles(updated) })
        .catch(console.error)
    })

    // Another member is editing the active file
    socket.on('latex_editing', (data: { fileId: string; userId: string; userName: string }) => {
      if (data.fileId === activeFileId) {
        const file = files.find((f) => f.id === data.fileId)
        setConflict({ userName: data.userName, fileName: file?.fileName ?? data.fileId })
      }
    })

    // Member stopped editing
    socket.on('latex_idle', (data: { fileId: string; userId: string }) => {
      if (data.fileId === activeFileId) {
        setConflict(null)
      }
    })

    return () => { socket.disconnect(); socketRef.current = null }
  }, [id, activeFileId, files, setFiles])

  // Expose socket for MonacoEditor to emit focus/blur events
  const emitEditing = (fileId: string) => socketRef.current?.emit('latex_editing', { projectId: id, fileId })
  const emitIdle    = (fileId: string) => socketRef.current?.emit('latex_idle',    { projectId: id, fileId })

  const activeFile = files.find((f) => f.id === activeFileId)

  return (
    <>
      <ToastProvider />
      <div className="flex flex-col h-screen bg-[#0a0c10] overflow-hidden">
        <PageHeader title="LaTeX Editor" tabs={tabs} />
        <TopActionBar projectId={id} />
        {conflict && <ConflictBanner userName={conflict.userName} fileName={conflict.fileName} />}

        <div className="flex-1 min-h-0 flex flex-row">
          <div className="w-60 flex-shrink-0 h-full overflow-hidden">
            <FileTree projectId={id} onRefresh={() => {
              fetch(`/api/projects/${id}/latex/files`)
                .then((r) => r.json())
                .then((data) => { if (Array.isArray(data)) setFiles(data) })
            }} />
          </div>

          <div className="w-px bg-[#1a1f2e] flex-shrink-0" />

          <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
            {activeFile?.fileName.startsWith('sections/') && activeFile.fileName.endsWith('.json') ? (
              <CellEditor file={activeFile} projectId={id} />
            ) : (
              <MonacoEditor
                projectId={id}
                onFocus={emitEditing}
                onBlur={emitIdle}
              />
            )}
          </div>

          <div className="w-px bg-[#1a1f2e] flex-shrink-0" />

          <div className="w-[400px] flex-shrink-0 h-full overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0 overflow-hidden">
              <PdfPreview projectId={id} />
            </div>
            <WritingProgress projectId={id} />
          </div>
        </div>
      </div>
    </>
  )
}
