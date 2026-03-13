'use client'
// components/chat/AgentPopover.tsx — Actions adapt based on attached file types

export type FileType = 'image' | 'pdf' | 'csv'

interface AgentAction {
  id: string
  icon: string
  label: string
  description: string
}

const DEFAULT_ACTIONS: AgentAction[] = [
  { id: 'summarize', icon: '📝', label: 'Summarize & Save', description: 'Summarize for paper section' },
  { id: 'compare', icon: '🔍', label: 'Analyze & Compare', description: 'Compare with library papers' },
]

const FILE_ACTIONS: Record<FileType, AgentAction[]> = {
  image: [
    { id: 'analyze_image', icon: '🔍', label: 'Analyze image content', description: 'Describe and summarize the image' },
  ],
  pdf: [
    { id: 'summarize', icon: '📄', label: 'Extract & summarize content', description: 'Summarize PDF for paper section' },
    { id: 'add_to_library', icon: '📚', label: 'Add to paper library', description: 'Import as reference paper' },
    { id: 'compare', icon: '🔍', label: 'Analyze & compare with papers', description: 'Compare with library papers' },
  ],
  csv: [
    { id: 'describe_data', icon: '📈', label: 'Describe data for Results', description: 'Write results text from data' },
  ],
}

interface Props {
  onSelect: (action: string) => void
  onClose: () => void
  fileTypes?: FileType[]
}

export function AgentPopover({ onSelect, onClose, fileTypes = [] }: Props) {
  const actions =
    fileTypes.length > 0
      ? fileTypes
          .flatMap((ft) => FILE_ACTIONS[ft] || [])
          .filter((a, i, arr) => arr.findIndex((b) => b.id === a.id) === i)
      : DEFAULT_ACTIONS

  const label =
    fileTypes.length > 0
      ? `@agent — ${fileTypes.join(' + ')} attached`
      : '@agent — Choose action'

  return (
    <div
      className="absolute bottom-full left-0 mb-2 bg-[#0d1018] border border-[#252a38] rounded-xl shadow-xl overflow-hidden z-50"
      style={{ minWidth: '260px' }}
    >
      <div className="px-3 py-2 border-b border-[#1a1f2e]">
        <p className="text-[10px] font-bold text-[#3d4558] uppercase tracking-wider">{label}</p>
      </div>
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => { onSelect(action.id); onClose() }}
          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#1a1f2e] transition-colors text-left"
        >
          <span className="text-base flex-shrink-0">{action.icon}</span>
          <div>
            <p className="text-xs font-semibold text-[#e8eaf0]">{action.label}</p>
            <p className="text-[10px] text-[#3d4558]">{action.description}</p>
          </div>
        </button>
      ))}
    </div>
  )
}
