'use client'

interface Props {
  question: string
  onDismiss: () => void
}

export default function SocraticPrompt({ question, onDismiss }: Props) {
  return (
    <div className="fixed bottom-24 right-6 max-w-xs bg-white border border-blue-200 rounded-xl shadow-lg p-3 z-40">
      <div className="flex items-start gap-2">
        <span className="text-lg">?</span>
        <div className="flex-1">
          <p className="text-sm text-gray-700">{question}</p>
        </div>
        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
      </div>
    </div>
  )
}
