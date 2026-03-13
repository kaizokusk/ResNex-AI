'use client'
// components/latex/TopActionBar.tsx — Template picker + Sync + Compile

import { useState } from 'react'
import { useLatexStore } from '../../store/latexStore'
import { TemplatePicker } from './TemplatePicker'
import { ConvertButton } from './ConvertButton'

interface Props {
  projectId: string
}

export function TopActionBar({ projectId }: Props) {
  const { setFiles, setCompileStatus } = useLatexStore()
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  async function handleSync() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/latex/sync`, { method: 'POST' })
      const raw = await res.text()
      let data: any = {}
      try {
        data = raw ? JSON.parse(raw) : {}
      } catch {
        throw new Error(`Sync failed (${res.status}): ${raw.slice(0, 300)}`)
      }
      if (res.ok) {
        // Reload file list
        const filesRes = await fetch(`/api/projects/${projectId}/latex/files`)
        if (filesRes.ok) {
          const filesRaw = await filesRes.text()
          try {
            setFiles(filesRaw ? JSON.parse(filesRaw) : [])
          } catch {
            // Avoid crashing the toolbar if the server responds with non-JSON (e.g. dev error page).
            setFiles([])
          }
        }
        setSyncMsg(`Synced ${data.sectionsIncluded} sections, ${data.papersIncluded} papers`)
      } else {
        setSyncMsg(data.error || 'Sync failed')
      }
    } catch (err: any) {
      setSyncMsg(err.message)
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(null), 4000)
    }
  }

  async function handleCompile() {
    setCompileStatus('compiling', null, null)
    try {
      const res = await fetch(`/api/projects/${projectId}/latex/compile`, { method: 'POST' })
      const text = await res.text()
      let data: any = {}
      try { data = JSON.parse(text) } catch {
        setCompileStatus('error', null, `Server error (${res.status}): ${text.slice(0, 300)}`)
        return
      }
      if (data.success) {
        setCompileStatus('ready', data.pdfUrl, data.logs ?? null)
      } else {
        setCompileStatus('error', null, data.logs || data.error || 'Compilation failed')
      }
    } catch (err: any) {
      setCompileStatus('error', null, err.message)
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1a1f2e] bg-[#0a0c10] flex-shrink-0">
      <TemplatePicker projectId={projectId} onApplied={() => {
        // file list refresh is handled inside TemplatePicker via setFiles
      }} />

      <div className="w-px h-4 bg-[#1a1f2e] mx-1" />

      <ConvertButton projectId={projectId} />

      <div className="w-px h-4 bg-[#1a1f2e] mx-1" />

      <button
        onClick={handleSync}
        disabled={syncing}
        className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-[#1a1f2e] hover:bg-[#252a38] text-[#e8eaf0] border border-[#252a38] disabled:opacity-50 transition-colors"
      >
        {syncing ? 'Syncing…' : '⟳ Sync'}
      </button>
      <button
        onClick={handleCompile}
        className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-[#7c6af5] hover:bg-[#6b5ce7] text-white transition-colors"
      >
        ⚡ Compile
      </button>
      {syncMsg && (
        <span className="text-[10px] text-[#34d399] font-mono">{syncMsg}</span>
      )}
    </div>
  )
}
