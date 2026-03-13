'use client'
import { useState } from 'react'

interface QualityResult {
  clarity: { score: number; feedback: string }
  evidence: { score: number; feedback: string }
  precision: { score: number; feedback: string }
  completeness: { score: number; feedback: string }
  socraiticQuestion: string
}

interface Props {
  projectId: string
  sectionId: string
  content: string
  onClose: () => void
}

export default function QualityCheck({ projectId, sectionId, content, onClose }: Props) {
  const [result, setResult] = useState<QualityResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [stuckClicked, setStuckClicked] = useState(false)
  const [hint, setHint] = useState('')
  const [hintCount, setHintCount] = useState(0)

  async function check() {
    setLoading(true)
    const res = await fetch(`/api/projects/${projectId}/sections/${sectionId}/quality-check`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })
    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  async function getHint() {
    if (!result) return
    const res = await fetch(`/api/projects/${projectId}/sections/${sectionId}/hint`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: result.socraiticQuestion, hintCount })
    })
    const data = await res.json()
    setHint(data.hint)
    setHintCount(h => h + 1)
    setStuckClicked(true)
  }

  const stars = (score: number) => '⭐'.repeat(score) + '☆'.repeat(5 - score)

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">Section Quality Check</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      {!result && !loading && (
        <button onClick={check} className="w-full bg-blue-600 text-white rounded px-3 py-2 text-sm hover:bg-blue-700">
          Run Quality Check
        </button>
      )}
      {loading && <p className="text-sm text-gray-500 text-center">Analyzing...</p>}
      {result && (
        <div className="space-y-2">
          {(['clarity', 'evidence', 'precision', 'completeness'] as const).map(dim => (
            <div key={dim} className="flex items-start gap-2 text-sm">
              <div className="w-24 capitalize font-medium text-gray-700">{dim}:</div>
              <div>
                <span>{stars(result[dim].score)}</span>
                <span className="text-gray-500 ml-2">{result[dim].feedback}</span>
              </div>
            </div>
          ))}
          <div className="mt-3 p-3 bg-blue-50 rounded text-sm">
            <p className="font-medium text-blue-800 mb-1">Think about this:</p>
            <p className="text-blue-700">"{result.socraiticQuestion}"</p>
            {!stuckClicked && (
              <button onClick={getHint} className="mt-2 text-xs text-blue-600 hover:underline">
                I'm stuck, give me a hint
              </button>
            )}
            {hint && <p className="mt-2 text-xs text-gray-600 bg-white p-2 rounded border">{hint}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
