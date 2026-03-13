'use client'
// components/chat/AgentResultCard.tsx — Individual result card in the Agent Panel

import { useState } from 'react'
import { AgentPanelItem, useAgentStore } from '../../store/agentStore'

const SECTION_OPTIONS = [
  'abstract',
  'introduction',
  'related_work',
  'methodology',
  'experiments',
  'results',
  'conclusion',
  'references',
]

const ACTION_LABELS: Record<string, string> = {
  summarize: 'Summary',
  compare: 'Comparison',
  analyze_image: 'Image Analysis',
  add_to_library: 'Library Import',
  describe_data: 'Results Draft',
}

const ACTION_ICONS: Record<string, string> = {
  summarize: '📝',
  compare: '🔍',
  analyze_image: '🔍',
  add_to_library: '📚',
  describe_data: '📈',
}

interface Props {
  item: AgentPanelItem
  projectId: string
  onShareToChat?: (result: string, action: string) => Promise<void>
}

export function AgentResultCard({ item, projectId, onShareToChat }: Props) {
  const { markSharedToChat, setTargetSection } = useAgentStore()
  const [sharing, setSharing] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function handleShare() {
    setSharing(true)
    try {
      if (onShareToChat) {
        await onShareToChat(item.result, item.action)
      }
      await fetch(`/api/projects/${projectId}/chat/agent-flag`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, sharedToChat: true }),
      })
      markSharedToChat(item.id)
    } finally {
      setSharing(false)
    }
  }

  async function handleSectionChange(section: string) {
    setTargetSection(item.id, section)
    await fetch(`/api/projects/${projectId}/chat/agent-flag`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id, targetSection: section }),
    })
  }

  const preview = item.result.length > 160 ? item.result.slice(0, 160) + '…' : item.result
  const time = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="bg-[#0d1018] border border-[#1a1f2e] rounded-xl p-3 flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{ACTION_ICONS[item.action] || '🤖'}</span>
          <span className="text-xs font-semibold text-[#e8eaf0]">
            {ACTION_LABELS[item.action] || item.action}
          </span>
        </div>
        <span className="text-[10px] text-[#3d4558]">{time}</span>
      </div>

      {/* Result preview */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="cursor-pointer bg-[#0a0c10] border border-[#252a38] rounded-lg p-2 text-xs text-[#c8cad0] font-mono leading-relaxed whitespace-pre-wrap break-words max-h-32 overflow-hidden"
      >
        {expanded ? item.result : preview}
      </div>
      {item.result.length > 160 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-[#4f8ef7] hover:underline text-left"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}

      {/* Target section */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[#3d4558]">Section:</span>
        <select
          value={item.targetSection || ''}
          onChange={(e) => handleSectionChange(e.target.value)}
          className="flex-1 bg-[#0a0c10] border border-[#252a38] rounded-lg px-2 py-1 text-[10px] text-[#e8eaf0] focus:outline-none focus:border-[#4f8ef7]"
        >
          <option value="">Auto-detect</option>
          {SECTION_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5">
        {!item.sharedToChat && (
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex-1 text-[10px] font-bold bg-[#1a1f2e] hover:bg-[#252a38] text-[#7a839a] hover:text-[#e8eaf0] border border-[#252a38] px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {sharing ? '…' : '📤 Share to Chat'}
          </button>
        )}
      </div>
    </div>
  )
}
