'use client'

interface Warning {
  claim: string
  suggestion: string
}

interface Props {
  warnings: Warning[]
  onClose: () => void
}

export default function CitationWarnings({ warnings, onClose }: Props) {
  if (warnings.length === 0) return null
  return (
    <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-yellow-800">Missing Citations ({warnings.length})</span>
        <button onClick={onClose} className="text-yellow-600 hover:text-yellow-800 text-xs">Dismiss</button>
      </div>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {warnings.map((w, i) => (
          <div key={i} className="text-xs">
            <p className="text-yellow-900 font-medium">"{w.claim.slice(0, 80)}..."</p>
            <p className="text-yellow-700">Suggestion: {w.suggestion}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
