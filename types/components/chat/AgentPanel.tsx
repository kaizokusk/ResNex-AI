'use client'
// components/chat/AgentPanel.tsx — Right sidebar panel showing @agent results

import { useEffect } from 'react'
import { useAgentStore } from '../../store/agentStore'
import { AgentResultCard } from './AgentResultCard'
import { Spinner } from '../ui'

interface Props {
  projectId: string
  onShareToChat?: (result: string, action: string) => Promise<void>
}

export function AgentPanel({ projectId, onShareToChat }: Props) {
  const { isOpen, closePanel, items, setItems } = useAgentStore()

  // Load persisted items on mount
  useEffect(() => {
    if (!isOpen) return
    fetch(`/api/projects/${projectId}/chat/agent-flag`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data)
      })
      .catch(console.error)
  }, [isOpen, projectId, setItems])

  if (!isOpen) return null

  return (
    <aside aria-label="AI assistant panel" className="w-72 flex-shrink-0 flex flex-col border-l border-[#1a1f2e] bg-[#0a0c10] h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1f2e]">
        <div>
          <p className="text-xs font-bold text-[#e8eaf0]">🤖 Agent Panel</p>
          <p className="text-[10px] text-[#3d4558]">{items.length} result{items.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          type="button"
          onClick={closePanel}
          aria-label="Close agent panel"
          className="touch-target-expand w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[#1a1f2e] text-[#3d4558] hover:text-[#e8eaf0] transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Items list */}
      <div
        className="flex-1 overflow-y-auto p-3 flex flex-col gap-2"
        aria-live="polite"
        aria-label="AI assistant results"
        aria-relevant="additions text"
      >
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="w-10 h-10 rounded-xl bg-[#7c6af5]/10 border border-[#7c6af5]/20 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c6af5" strokeWidth="2">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
              </svg>
            </div>
            <p className="text-xs font-medium text-[#7a839a]">No agent results yet</p>
            <p className="text-[10px] text-[#3d4558] max-w-[180px]">
              Type <span className="text-[#7c6af5] font-mono">@agent</span> in the chat input to get started.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <AgentResultCard
              key={item.id}
              item={item}
              projectId={projectId}
              onShareToChat={onShareToChat}
            />
          ))
        )}
      </div>

    </aside>
  )
}
