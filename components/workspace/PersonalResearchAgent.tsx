'use client'
// components/workspace/PersonalResearchAgent.tsx — Chat-only personal research agent

import { useState } from 'react'
import { Spinner } from '../ui'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function PersonalResearchAgent({
  projectId,
  onSendToGroup,
}: {
  projectId: string
  onSendToGroup?: (content: string) => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  // track which assistant replies have been shared to group chat
  const [sentIndices, setSentIndices] = useState<Set<number>>(new Set())

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: input }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/research-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, mode: 'chat', messages: newMessages }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.reply || 'No response.' }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Error fetching response.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0c10]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-16">
            <div className="w-14 h-14 rounded-2xl bg-[#7c6af5]/10 border border-[#7c6af5]/20 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c6af5" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#e8eaf0] mb-1">Personal Research Agent</p>
              <p className="text-xs text-[#7a839a] max-w-xs">Ask me anything. I'll search your uploaded PDFs for context.</p>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              {m.role === 'assistant' && (
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-[#7c6af5]/20 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#7c6af5" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold text-[#7c6af5]">Research Agent</span>
                </div>
              )}
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-[#4f8ef7] text-white rounded-tr-sm'
                  : 'bg-[#1a1f2e] text-[#c8cad0] rounded-tl-sm border border-[#252a38]'
              }`}>
                {m.content}
              </div>
              {m.role === 'assistant' && onSendToGroup && (
                <div className="flex items-center gap-1 mt-0.5">
                  <button
                    onClick={() => {
                      onSendToGroup(m.content)
                      setSentIndices(prev => new Set(prev).add(i))
                    }}
                    className="text-[10px] text-[#7c6af5] hover:underline"
                    disabled={sentIndices.has(i)}
                  >
                    {sentIndices.has(i) ? 'Sent' : 'Share to group chat →'}
                  </button>
                  {sentIndices.has(i) && (
                    <span className="text-green-400 text-xs">✓</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-[#7c6af5]/20 flex items-center justify-center flex-shrink-0">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#7c6af5" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <div className="bg-[#1a1f2e] border border-[#252a38] px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#7c6af5] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={send} className="p-4 border-t border-[#1a1f2e] flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a research question..."
          disabled={loading}
          className="flex-1 bg-[#0d1018] border border-[#252a38] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf0] placeholder:text-[#3d4558] focus:outline-none focus:border-[#7c6af5] transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="w-10 h-10 rounded-xl bg-[#7c6af5] hover:bg-[#6b5ce7] disabled:opacity-40 flex items-center justify-center transition-all flex-shrink-0"
        >
          {loading ? <Spinner size={14} color="white" /> : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
            </svg>
          )}
        </button>
      </form>
    </div>
  )
}
