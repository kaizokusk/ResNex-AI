'use client'
import { useState } from 'react'
import { useLatexStore } from '../../store/latexStore'

interface Props {
  projectId: string
}

type Stage = 'idle' | 'converting' | 'done' | 'error'

export function ConvertButton({ projectId }: Props) {
  const { setFiles, setCompileStatus } = useLatexStore()
  const [stage, setStage] = useState<Stage>('idle')
  const [msg, setMsg] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  async function runConvert(compileAfter: boolean) {
    setShowConfirm(false)
    setStage('converting')
    setMsg(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/latex/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compileAfter }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setStage('error')
        setMsg(data.error || 'Conversion failed')
        return
      }

      // Reload file list (main.tex was updated)
      const filesRes = await fetch(`/api/projects/${projectId}/latex/files`)
      if (filesRes.ok) setFiles(await filesRes.json())

      setStage('done')
      setMsg(`✓ ${data.sectionsConverted} sections converted`)

      if (data.compileResult?.success && data.compileResult?.pdfUrl) {
        setCompileStatus('ready', data.compileResult.pdfUrl, null)
      }

      setTimeout(() => { setStage('idle'); setMsg(null) }, 5000)
    } catch (err: any) {
      setStage('error')
      setMsg(err.message || 'Network error')
    }
  }

  const label = stage === 'converting'
    ? 'Converting…'
    : stage === 'done'
    ? '✓ Converted'
    : stage === 'error'
    ? '✗ Error'
    : '⚙ Convert to LaTeX'

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={stage === 'converting'}
        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50
          ${stage === 'done'    ? 'bg-[#052e16] border-[#34d399] text-[#34d399]' :
            stage === 'error'   ? 'bg-[#1a0000] border-[#f87171] text-[#f87171]' :
            'bg-[#1a1f2e] border-[#252a38] text-[#e8eaf0] hover:bg-[#252a38]'}`}
      >
        {label}
      </button>

      {msg && stage === 'error' && (
        <span className="text-[10px] text-[#f87171] font-mono">{msg}</span>
      )}
      {msg && stage === 'done' && (
        <span className="text-[10px] text-[#34d399] font-mono">{msg}</span>
      )}

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0d1018] border border-[#252a38] rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1a1f2e]">
              <h2 className="text-sm font-bold text-[#e8eaf0]">Convert to LaTeX</h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-[12px] text-[#7a839a] leading-relaxed">
                All section files will be converted from notebook cells to LaTeX syntax.
                <code className="text-[#a78bfa]"> main.tex</code> will be updated.
              </p>
            </div>
            <div className="px-5 py-3 border-t border-[#1a1f2e] flex gap-2 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="text-[11px] px-4 py-1.5 rounded-lg bg-[#1a1f2e] text-[#7a839a] hover:text-[#e8eaf0] transition-colors"
              >Cancel</button>
              <button
                onClick={() => runConvert(false)}
                className="text-[11px] font-bold px-4 py-1.5 rounded-lg bg-[#1a1f2e] border border-[#252a38] text-[#e8eaf0] hover:bg-[#252a38] transition-colors"
              >Convert</button>
              <button
                onClick={() => runConvert(true)}
                className="text-[11px] font-bold px-4 py-1.5 rounded-lg bg-[#7c6af5] hover:bg-[#6b5ce7] text-white transition-colors"
              >Convert + Compile ▶</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
