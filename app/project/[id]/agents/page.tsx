'use client'
// app/project/[id]/agents/page.tsx
// AI Agents: Q&A with citations, gap finder — powered by paper library

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { PageHeader } from '../../../../components/layout/PageHeader'
import { Spinner, ToastProvider, useToast } from '../../../../components/ui'
import { PersonalResearchAgent } from '../../../../components/workspace/PersonalResearchAgent'

const TABS = (id: string) => [
  { label: 'Overview', href: `/project/${id}`, icon: '⬡' },
  { label: 'Chat', href: `/project/${id}/chat`, icon: '💬' },
  { label: 'Discover', href: `/project/${id}/discover`, icon: '🔍' },
  { label: 'Library', href: `/project/${id}/library`, icon: '📚' },
  { label: 'Agents', href: `/project/${id}/agents`, icon: '🤖' },
  { label: 'LaTeX', href: `/project/${id}/latex`, icon: 'τ' },
  { label: 'Output', href: `/project/${id}/output`, icon: '⬇' },
]

type AgentTab = 'qa' | 'gaps' | 'writer' | 'planner' | 'summarizer' | 'research'

interface Message {
  role: 'user' | 'agent'
  content: string
  citations?: { index: number; documentTitle: string; similarity: number }[]
}

function QAPanel({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { error } = useToast()
  const sessionKey = `agents:qa:${projectId}`

  useEffect(() => {
    try { const raw = sessionStorage.getItem(sessionKey); if (raw) setMessages(JSON.parse(raw)) } catch {}
  }, [sessionKey])

  useEffect(() => {
    try { sessionStorage.setItem(sessionKey, JSON.stringify(messages)) } catch {}
  }, [messages, sessionKey])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: question }])
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/papers/agents/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      setMessages((m) => [...m, { role: 'agent', content: data.answer, citations: data.citations }])
    } catch {
      error('Q&A agent failed. Please try again.')
      setMessages((m) => m.slice(0, -1))
      setInput(question)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-12">
            <div className="w-14 h-14 rounded-2xl bg-[#7c6af5]/10 border border-[#7c6af5]/20 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c6af5" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#e8eaf0] mb-1">Source-Grounded Q&A</p>
              <p className="text-xs text-[#7a839a] max-w-xs">Ask any question about your library papers. Every answer cites its sources.</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                'What methods are used across these papers?',
                'What datasets are commonly used?',
                'What are the main limitations?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs bg-[#1a1f2e] border border-[#252a38] text-[#7a839a] hover:text-[#e8eaf0] px-3 py-1.5 rounded-lg transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] flex flex-col gap-2 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              {m.role === 'agent' && (
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-[#7c6af5]/20 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#7c6af5" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold text-[#7c6af5]">Librarian</span>
                </div>
              )}
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-[#4f8ef7] text-white rounded-tr-sm'
                  : 'bg-[#1a1f2e] text-[#c8cad0] rounded-tl-sm border border-[#252a38]'
              }`}>
                {m.content}
              </div>
              {m.citations && m.citations.length > 0 && (
                <div className="flex flex-col gap-1 w-full">
                  {m.citations.map((c) => (
                    <div key={c.index} className="flex items-center gap-1.5 text-[10px] bg-[#7c6af5]/10 border border-[#7c6af5]/20 rounded-lg px-2 py-1 text-[#7c6af5]">
                      <span className="font-bold">[{c.index}]</span>
                      <span className="truncate">{c.documentTitle}</span>
                    </div>
                  ))}
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
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#7c6af5] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="p-4 border-t border-[#1a1f2e] flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your papers..."
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

function GapsPanel({ projectId }: { projectId: string }) {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const { error } = useToast()
  const sessionKey = `agents:gaps:${projectId}`

  useEffect(() => {
    try { const raw = sessionStorage.getItem(sessionKey); if (raw) setResult(JSON.parse(raw)) } catch {}
  }, [sessionKey])

  useEffect(() => {
    try { if (result) sessionStorage.setItem(sessionKey, JSON.stringify(result)) } catch {}
  }, [result, sessionKey])

  async function findGaps() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/papers/agents/gaps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      setResult(await res.json())
    } catch {
      error('Gap finder failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-[#e8eaf0] mb-1">Research Gap Finder</h3>
            <p className="text-xs text-[#7a839a]">Analyzes all ready papers in your library to identify unexplored areas and future directions.</p>
          </div>
          <button
            onClick={findGaps}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#7c6af5] hover:bg-[#6b5ce7] text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors flex-shrink-0"
          >
            {loading ? <Spinner size={14} color="white" /> : null}
            {loading ? 'Analyzing...' : 'Find Gaps'}
          </button>
        </div>

        {!result && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#1a1f2e] border border-[#252a38] flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3d4558" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
            </div>
            <p className="text-sm text-[#7a839a] mb-1">No analysis yet</p>
            <p className="text-xs text-[#3d4558]">Click "Find Gaps" to analyze your paper library.</p>
          </div>
        )}

        {result?.message && (
          <div className="p-4 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-xl text-sm text-[#f59e0b]">
            {result.message}
          </div>
        )}

        {result?.synthesis && (
          <div className="bg-[#0d1018] border border-[#1a1f2e] rounded-xl p-5 mb-6">
            <h4 className="text-[10px] font-bold text-[#3d4558] uppercase tracking-wider mb-3">Research Landscape</h4>
            <p className="text-sm text-[#c8cad0] leading-relaxed">{result.synthesis}</p>
          </div>
        )}

        {result?.gaps?.length > 0 && (
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-bold text-[#7a839a] uppercase tracking-wider">
              {result.gaps.length} Research Gaps Identified
            </h4>
            {result.gaps.map((gap: any, i: number) => (
              <div key={i} className="bg-[#0d1018] border border-[#1a1f2e] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-[#7c6af5]/15 border border-[#7c6af5]/20 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-[#7c6af5]">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-sm text-[#e8eaf0] mb-1.5">{gap.title}</h5>
                    <p className="text-xs text-[#c8cad0] leading-relaxed mb-2">{gap.description}</p>
                    {gap.evidence && (
                      <p className="text-[10px] text-[#7a839a] mb-1">
                        <span className="font-semibold text-[#3d4558]">Evidence: </span>{gap.evidence}
                      </p>
                    )}
                    {gap.opportunity && (
                      <p className="text-[10px] text-[#4f8ef7]">
                        <span className="font-semibold">Opportunity: </span>{gap.opportunity}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Writer Panel ────────────────────────────────────────────────────────
function WriterPanel({ projectId }: { projectId: string }) {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { error } = useToast()
  const sessionKey = `agents:writer:${projectId}`

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(sessionKey)
      if (raw) { const s = JSON.parse(raw); setResult(s.result); setTopic(s.topic ?? '') }
    } catch {}
  }, [sessionKey])

  useEffect(() => {
    try { if (result) sessionStorage.setItem(sessionKey, JSON.stringify({ result, topic })) } catch {}
  }, [result, topic, sessionKey])

  async function draft() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/papers/agents/writer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      })
      if (!res.ok) {
        const d = await res.json()
        error(d.error || 'Writer agent failed')
        return
      }
      setResult(await res.json())
    } catch {
      error('Writer agent failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h3 className="font-semibold text-[#e8eaf0] mb-1">Literature Review Writer</h3>
          <p className="text-xs text-[#7a839a]">Drafts a literature review section synthesizing all ready papers in your library.</p>
        </div>

        <div className="flex gap-2 mb-6">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Optional focus topic (e.g. 'attention mechanisms in NLP')..."
            className="flex-1 bg-[#0d1018] border border-[#252a38] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf0] placeholder:text-[#3d4558] focus:outline-none focus:border-[#7c6af5] transition-all"
          />
          <button
            onClick={draft}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#7c6af5] hover:bg-[#6b5ce7] text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors flex-shrink-0"
          >
            {loading ? <Spinner size={14} color="white" /> : null}
            {loading ? 'Writing...' : 'Draft Review'}
          </button>
        </div>

        {result && (
          <div className="flex flex-col gap-4">
            {result.title && (
              <h2 className="text-lg font-bold text-[#e8eaf0]">{result.title}</h2>
            )}
            <div className="bg-[#0d1018] border border-[#1a1f2e] rounded-xl p-5">
              <p className="text-sm text-[#c8cad0] leading-relaxed whitespace-pre-wrap">{result.content}</p>
            </div>
            {result.citations?.length > 0 && (
              <div className="bg-[#0d1018] border border-[#1a1f2e] rounded-xl p-4">
                <h4 className="text-[10px] font-bold text-[#3d4558] uppercase tracking-wider mb-3">References</h4>
                <div className="flex flex-col gap-1.5">
                  {result.citations.map((c: any, i: number) => (
                    <div key={i} className="text-xs text-[#7a839a]">
                      <span className="font-semibold text-[#7c6af5]">[{c.citation_key || i + 1}]</span>{' '}
                      {c.document_title}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-[10px] text-[#3d4558]">Synthesized from {result.paper_count} papers</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Planner Panel ────────────────────────────────────────────────────────
interface Member { id: string; full_name: string; avatar_url?: string | null }
interface TaskAssignment { mode: 'manual' | 'volunteer'; memberId: string; memberName: string }
interface ManualTask { title: string; description: string; priority: 'high' | 'medium' | 'low' }

const STORAGE_KEY = (projectId: string) => `planner:${projectId}`

function loadPlannerState(projectId: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(projectId))
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

function savePlannerState(projectId: string, state: { result: any; manualTasks: ManualTask[]; assignments: Record<number, TaskAssignment[]> }) {
  try { localStorage.setItem(STORAGE_KEY(projectId), JSON.stringify(state)) } catch {}
}

function PlannerPanel({ projectId }: { projectId: string }) {
  const { user: clerkUser } = useUser()
  const [members, setMembers] = useState<Member[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTask, setNewTask] = useState<ManualTask>({ title: '', description: '', priority: 'medium' })
  const [loading, setLoading] = useState(false)
  const { error } = useToast()

  // Hydrate from localStorage on mount
  const saved = loadPlannerState(projectId)
  const [result, setResult] = useState<any>(saved?.result ?? null)
  const [manualTasks, setManualTasks] = useState<ManualTask[]>(saved?.manualTasks ?? [])
  const [assignments, setAssignments] = useState<Record<number, TaskAssignment[]>>(saved?.assignments ?? {})

  // Persist to localStorage whenever relevant state changes
  useEffect(() => {
    savePlannerState(projectId, { result, manualTasks, assignments })
  }, [result, manualTasks, assignments, projectId])

  // Fetch project members for assignment dropdown
  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then(r => r.json())
      .then(d => {
        if (d?.members) {
          setMembers(d.members.map((m: any) => ({
            id: m.user_id,
            full_name: m.user?.full_name || 'Unknown',
            avatar_url: m.user?.avatar_url,
          })))
        }
      })
      .catch(() => {})
  }, [projectId])

  async function extract() {
    setLoading(true)
    setResult(null)
    setAssignments({})
    try {
      const res = await fetch(`/api/projects/${projectId}/chat/planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const d = await res.json()
        error(d.error || 'Planner failed')
        return
      }
      setResult(await res.json())
    } catch {
      error('Planner agent failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function volunteer(i: number) {
    const me = members.find(m => m.id === clerkUser?.id) ||
               members.find(m => m.full_name === clerkUser?.fullName)
    const memberId = me?.id || clerkUser?.id || 'me'
    const memberName = me?.full_name || clerkUser?.fullName || 'You'
    setAssignments(prev => {
      const existing = prev[i] || []
      if (existing.some(a => a.memberId === memberId)) return prev // already on it
      return { ...prev, [i]: [...existing, { mode: 'volunteer', memberId, memberName }] }
    })
  }

  function manualAssign(i: number, memberId: string) {
    const member = members.find(m => m.id === memberId)
    if (!member) return
    setAssignments(prev => {
      const existing = prev[i] || []
      if (existing.some(a => a.memberId === memberId)) return prev // already assigned
      return { ...prev, [i]: [...existing, { mode: 'manual', memberId, memberName: member.full_name }] }
    })
  }

  function removeAssignee(taskIdx: number, memberId: string) {
    setAssignments(prev => ({
      ...prev,
      [taskIdx]: (prev[taskIdx] || []).filter(a => a.memberId !== memberId),
    }))
  }

  function addManualTask() {
    if (!newTask.title.trim()) return
    setManualTasks(prev => [...prev, { ...newTask }])
    setNewTask({ title: '', description: '', priority: 'medium' })
    setShowAddForm(false)
  }

  function removeManualTask(i: number) {
    setManualTasks(prev => prev.filter((_, idx) => idx !== i))
  }

  // Combined tasks: AI-extracted + manually added
  const allTasks = [
    ...(result?.tasks || []),
    ...manualTasks.map(t => ({ ...t, assignee: null, _manual: true })),
  ]

  const priorityColor: Record<string, string> = {
    high: 'bg-[#f43f5e]/15 text-[#f43f5e] border-[#f43f5e]/20',
    medium: 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/20',
    low: 'bg-[#3ecf8e]/15 text-[#3ecf8e] border-[#3ecf8e]/20',
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-[#e8eaf0] mb-1">Task Planner</h3>
            <p className="text-xs text-[#7a839a]">Extract tasks from group chat or add them manually. Assign or volunteer.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(v => !v)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1a1f2e] hover:bg-[#252a38] border border-[#252a38] text-[#e8eaf0] rounded-xl text-sm font-bold transition-colors"
            >
              + Add Task
            </button>
            <button
              onClick={extract}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#7c6af5] hover:bg-[#6b5ce7] text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors"
            >
              {loading ? <Spinner size={14} color="white" /> : null}
              {loading ? 'Analyzing...' : 'Extract from Chat'}
            </button>
          </div>
        </div>

        {/* Manual task entry form */}
        {showAddForm && (
          <div className="bg-[#0d1018] border border-[#252a38] rounded-xl p-4 mb-5 flex flex-col gap-3">
            <p className="text-xs font-semibold text-[#e8eaf0]">New Task</p>
            <input
              value={newTask.title}
              onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
              placeholder="Task title…"
              className="bg-[#1a1f2e] border border-[#252a38] rounded-lg px-3 py-2 text-sm text-[#e8eaf0] placeholder:text-[#3d4558] focus:outline-none focus:border-[#7c6af5]"
            />
            <textarea
              value={newTask.description}
              onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
              placeholder="Description (optional)…"
              rows={2}
              className="bg-[#1a1f2e] border border-[#252a38] rounded-lg px-3 py-2 text-sm text-[#e8eaf0] placeholder:text-[#3d4558] focus:outline-none focus:border-[#7c6af5] resize-none"
            />
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {(['high', 'medium', 'low'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setNewTask(prev => ({ ...prev, priority: p }))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors capitalize ${
                      newTask.priority === p
                        ? priorityColor[p]
                        : 'bg-transparent border-[#252a38] text-[#3d4558] hover:text-[#7a839a]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => { setShowAddForm(false); setNewTask({ title: '', description: '', priority: 'medium' }) }}
                  className="px-3 py-1.5 text-xs text-[#7a839a] hover:text-[#e8eaf0] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addManualTask}
                  disabled={!newTask.title.trim()}
                  className="px-4 py-1.5 bg-[#7c6af5] hover:bg-[#6b5ce7] disabled:opacity-40 text-white text-xs rounded-lg font-bold transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {!result && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#1a1f2e] border border-[#252a38] flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3d4558" strokeWidth="1.5">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </div>
            <p className="text-sm text-[#7a839a]">Click "Extract Tasks" to analyze your chat.</p>
          </div>
        )}

        {allTasks.length > 0 && (
          <div className="flex flex-col gap-3 mb-6">
            <h4 className="text-xs font-bold text-[#7a839a] uppercase tracking-wider">{allTasks.length} Task{allTasks.length !== 1 ? 's' : ''}</h4>
            {allTasks.map((t: any, i: number) => {
              const taskAssignees = assignments[i] || []
              const isManual = !!t._manual
              const manualIdx = i - (result?.tasks?.length || 0)
              return (
                <div key={i} className="bg-[#0d1018] border border-[#1a1f2e] rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5 ${priorityColor[t.priority] || priorityColor.medium}`}>
                      {t.priority}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-sm text-[#e8eaf0]">{t.title}</p>
                        {isManual && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20">
                            MANUAL
                          </span>
                        )}
                        {isManual && (
                          <button onClick={() => removeManualTask(manualIdx)} className="ml-auto text-[10px] text-[#3d4558] hover:text-red-400 transition-colors">
                            🗑
                          </button>
                        )}
                      </div>
                      {t.description && <p className="text-xs text-[#7a839a] mb-3">{t.description}</p>}

                      {/* Current assignees */}
                      {taskAssignees.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {taskAssignees.map(a => (
                            <div key={a.memberId} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                              a.mode === 'volunteer'
                                ? 'bg-[#3ecf8e]/10 border-[#3ecf8e]/20 text-[#3ecf8e]'
                                : 'bg-[#4f8ef7]/10 border-[#4f8ef7]/20 text-[#4f8ef7]'
                            }`}>
                              <span>{a.mode === 'volunteer' ? '✋' : '👤'}</span>
                              <span>{a.memberName}</span>
                              <button
                                onClick={() => removeAssignee(i, a.memberId)}
                                className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity"
                              >×</button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Always-visible add more controls */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => volunteer(i)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3ecf8e]/10 hover:bg-[#3ecf8e]/20 border border-[#3ecf8e]/20 text-[#3ecf8e] text-xs rounded-lg transition-colors font-medium"
                        >
                          ✋ Volunteer
                        </button>
                        {members.length > 0 && (
                          <select
                            value=""
                            onChange={e => { if (e.target.value) manualAssign(i, e.target.value) }}
                            className="flex-1 min-w-[140px] bg-[#1a1f2e] border border-[#252a38] rounded-lg px-2.5 py-1.5 text-xs text-[#7a839a] focus:outline-none focus:border-[#4f8ef7] cursor-pointer"
                          >
                            <option value="" disabled>Assign to…</option>
                            {members.map(m => (
                              <option key={m.id} value={m.id}>{m.full_name}</option>
                            ))}
                          </select>
                        )}
                        {t.assignee && taskAssignees.length === 0 && (
                          <span className="text-[10px] text-[#3d4558]">AI suggested: {t.assignee}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {result?.blockers?.length > 0 && (
          <div className="bg-[#f43f5e]/10 border border-[#f43f5e]/20 rounded-xl p-4 mb-4">
            <h4 className="text-[10px] font-bold text-[#f43f5e] uppercase tracking-wider mb-2">Blockers</h4>
            {result.blockers.map((b: string, i: number) => (
              <p key={i} className="text-xs text-[#c8cad0]">• {b}</p>
            ))}
          </div>
        )}

        {result?.next_steps?.length > 0 && (
          <div className="bg-[#4f8ef7]/10 border border-[#4f8ef7]/20 rounded-xl p-4">
            <h4 className="text-[10px] font-bold text-[#4f8ef7] uppercase tracking-wider mb-2">Next Steps</h4>
            {result.next_steps.map((s: string, i: number) => (
              <p key={i} className="text-xs text-[#c8cad0]">• {s}</p>
            ))}
          </div>
        )}

        {result && <p className="text-[10px] text-[#3d4558] mt-3">Analyzed {result.message_count} messages</p>}
      </div>
    </div>
  )
}

// ── Chat Summarizer Panel ────────────────────────────────────────────────
function SummarizerPanel({ projectId }: { projectId: string }) {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const { error } = useToast()
  const sessionKey = `agents:summarizer:${projectId}`

  useEffect(() => {
    try { const raw = sessionStorage.getItem(sessionKey); if (raw) setResult(JSON.parse(raw)) } catch {}
  }, [sessionKey])

  useEffect(() => {
    try { if (result) sessionStorage.setItem(sessionKey, JSON.stringify(result)) } catch {}
  }, [result, sessionKey])

  async function summarize() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/chat/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const d = await res.json()
        error(d.error || 'Summarizer failed')
        return
      }
      setResult(await res.json())
    } catch {
      error('Summarizer failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-[#e8eaf0] mb-1">Meeting Summarizer</h3>
            <p className="text-xs text-[#7a839a]">Summarizes your group chat into decisions, action items, and key findings.</p>
          </div>
          <button
            onClick={summarize}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#7c6af5] hover:bg-[#6b5ce7] text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors"
          >
            {loading ? <Spinner size={14} color="white" /> : null}
            {loading ? 'Summarizing...' : 'Summarize Chat'}
          </button>
        </div>

        {!result && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#1a1f2e] border border-[#252a38] flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3d4558" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p className="text-sm text-[#7a839a]">Click "Summarize Chat" to generate meeting notes.</p>
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-4">
            <div className="bg-[#0d1018] border border-[#1a1f2e] rounded-xl p-5">
              <h4 className="text-[10px] font-bold text-[#3d4558] uppercase tracking-wider mb-3">Summary</h4>
              <p className="text-sm text-[#c8cad0] leading-relaxed whitespace-pre-wrap">{result.summary}</p>
            </div>

            {[
              { key: 'decisions', label: 'Decisions', color: '#3ecf8e' },
              { key: 'action_items', label: 'Action Items', color: '#4f8ef7' },
              { key: 'open_questions', label: 'Open Questions', color: '#f59e0b' },
              { key: 'key_findings', label: 'Key Findings', color: '#7c6af5' },
            ].map(({ key, label, color }) =>
              result[key]?.length > 0 ? (
                <div key={key} className="bg-[#0d1018] border border-[#1a1f2e] rounded-xl p-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color }}>{label}</h4>
                  {result[key].map((item: string, i: number) => (
                    <p key={i} className="text-xs text-[#c8cad0] mb-1">• {item}</p>
                  ))}
                </div>
              ) : null
            )}

            <p className="text-[10px] text-[#3d4558]">Based on {result.message_count} messages</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AgentsPage() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<AgentTab>('qa')
  const tabs = TABS(id)

  const myAgentTabs: { key: AgentTab; label: string; icon: string; desc: string }[] = [
    { key: 'research', label: 'Personal Research Agent', icon: '🤖', desc: 'Chat, arXiv & web search' },
    { key: 'qa', label: 'Q&A with Citations', icon: '🔍', desc: 'Ask questions, get cited answers' },
    { key: 'gaps', label: 'Gap Finder', icon: '🔬', desc: 'Find research opportunities' },
    { key: 'writer', label: 'Lit Review Writer', icon: '✍️', desc: 'Draft literature review sections' },
    { key: 'summarizer', label: 'Meeting Summarizer', icon: '📝', desc: 'Summarize group discussions' },
  ]

  const teamAgentTabs: { key: AgentTab; label: string; icon: string; desc: string }[] = [
    { key: 'planner', label: 'Task Planner', icon: '📋', desc: 'Extract tasks from group chat' },
  ]

  function AgentButton({ t, shared }: { t: { key: AgentTab; label: string; icon: string; desc: string }; shared?: boolean }) {
    return (
      <button
        onClick={() => setActiveTab(t.key)}
        className={`w-full text-left px-3 py-3 rounded-xl transition-all ${
          activeTab === t.key
            ? 'bg-[#7c6af5]/15 border border-[#7c6af5]/20'
            : 'hover:bg-[#1a1f2e] border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm">{t.icon}</span>
          <span className={`text-xs font-semibold flex-1 ${activeTab === t.key ? 'text-[#e8eaf0]' : 'text-[#7a839a]'}`}>
            {t.label}
          </span>
          {shared && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#3ecf8e]/15 text-[#3ecf8e] border border-[#3ecf8e]/20 flex-shrink-0">
              TEAM
            </span>
          )}
        </div>
        <p className="text-[10px] text-[#3d4558] ml-5">{t.desc}</p>
      </button>
    )
  }

  return (
    <>
      <ToastProvider />
      <div className="flex flex-col h-screen overflow-hidden">
        <PageHeader
          title="AI Agents"
          subtitle="Research agents powered by your paper library"
          tabs={tabs}
          activeTab={tabs[4].href}
        />

        <div className="flex-1 flex overflow-hidden">
          {/* Agent selector sidebar */}
          <div className="w-56 flex-shrink-0 flex flex-col border-r border-[#1a1f2e] bg-[#0d1018] p-3 gap-1 overflow-y-auto">
            {/* Personal agents */}
            <p className="text-[10px] font-bold text-[#3d4558] uppercase tracking-widest px-2 pt-1 pb-1">My Agents</p>
            {myAgentTabs.map((t) => <AgentButton key={t.key} t={t} />)}

            {/* Team agents */}
            <div className="border-t border-[#1a1f2e] my-2" />
            <p className="text-[10px] font-bold text-[#3d4558] uppercase tracking-widest px-2 pb-1">Team</p>
            {teamAgentTabs.map((t) => <AgentButton key={t.key} t={t} shared />)}
          </div>

          {/* Agent panel */}
          <div className="flex-1 overflow-hidden bg-[#0a0c10]">
            {activeTab === 'research' && (
              <PersonalResearchAgent
                projectId={id}
                onSendToGroup={async (content) => {
                  await fetch(`/api/projects/${id}/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content, messageType: 'research_share' }),
                  }).catch(console.error)
                }}
              />
            )}
            {activeTab === 'qa' && <QAPanel projectId={id} />}
            {activeTab === 'gaps' && <GapsPanel projectId={id} />}
            {activeTab === 'writer' && <WriterPanel projectId={id} />}
            {activeTab === 'planner' && <PlannerPanel projectId={id} />}
            {activeTab === 'summarizer' && <SummarizerPanel projectId={id} />}
          </div>
        </div>
      </div>
    </>
  )
}
