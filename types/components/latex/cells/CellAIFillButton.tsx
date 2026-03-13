'use client'

interface Props {
  loading?: boolean
  onClick: () => void
}

export function CellAIFillButton({ loading = false, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[#3d2a6b] bg-[#1a0d2e] px-2.5 py-1 text-[10px] font-bold text-[#a78bfa] transition-colors hover:bg-[#2d1a4e] disabled:opacity-50"
      title="Fill this cell with AI using project references"
    >
      <span>✨</span>
      <span>{loading ? 'Filling…' : 'AI Fill'}</span>
    </button>
  )
}
