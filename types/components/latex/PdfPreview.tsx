'use client'
// components/latex/PdfPreview.tsx — PDF iframe + compile controls

import { useRouter } from 'next/navigation'
import { useLatexStore } from '../../store/latexStore'

interface Props {
  projectId: string
}

const STATUS_CONFIG = {
  idle:      { label: 'Idle',        color: '#3d4558' },
  compiling: { label: 'Compiling…',  color: '#f59e0b' },
  ready:     { label: '✓ Ready',     color: '#34d399' },
  error:     { label: '✗ Error',     color: '#f87171' },
}

export function PdfPreview({ projectId }: Props) {
  const router = useRouter()
  const { compileStatus, pdfUrl, compileLogs, showLogs, setCompileStatus, toggleLogs } = useLatexStore()
  const status = STATUS_CONFIG[compileStatus]

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
    <div className="flex flex-col h-full bg-[#0a0c10] border-l border-[#1a1f2e]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1a1f2e] flex-shrink-0">
        <button
          onClick={handleCompile}
          disabled={compileStatus === 'compiling'}
          className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-[#7c6af5] hover:bg-[#6b5ce7] text-white disabled:opacity-50 transition-colors"
        >
          {compileStatus === 'compiling' ? 'Compiling…' : 'Recompile'}
        </button>

        <button
          onClick={() => router.push(`/project/${projectId}/output?section=pdf`)}
          disabled={!pdfUrl || compileStatus !== 'ready'}
          className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-[#1a1f2e] hover:bg-[#252a38] text-[#e8eaf0] border border-[#252a38] disabled:opacity-50 transition-colors"
        >
          Full view
        </button>

        <span className="text-[10px] font-mono" style={{ color: status.color }}>
          {status.label}
        </span>
        <div className="flex-1" />
        {compileLogs && (
          <button
            onClick={toggleLogs}
            className="text-[10px] text-[#4f8ef7] hover:underline"
          >
            {showLogs ? 'Hide log' : 'View log'}
          </button>
        )}
      </div>

      {/* Log viewer */}
      {showLogs && compileLogs && (
        <div className="flex-shrink-0 max-h-40 overflow-y-auto bg-[#050608] border-b border-[#1a1f2e] p-2">
          <pre className="text-[9px] font-mono text-[#7a839a] whitespace-pre-wrap">{compileLogs}</pre>
        </div>
      )}

      {/* PDF iframe */}
      <div className="flex-1 min-h-0">
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full border-none"
            title="Compiled PDF"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1a1f2e] flex items-center justify-center text-lg">📄</div>
            <p className="text-xs text-[#3d4558] text-center">
              {compileStatus === 'error'
                ? 'Compilation failed. Check the log.'
                : 'Click Recompile to generate PDF'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
