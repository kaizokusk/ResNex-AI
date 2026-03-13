'use client'
// app/project/[id]/page.tsx — Project Dashboard

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { PageHeader } from '../../../components/layout/PageHeader'
import { Avatar, Button, StatusPill, ProgressBar, Badge, Card, Modal, Input, EmptyState, Spinner, ToastProvider, useToast } from '../../../components/ui'
import { Project, ProjectMember, ContributorshipLog } from '../../../types'
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { ModerationAlerts, useModerationAlertCount } from '../../../components/project/ModerationAlerts'
import { ContributionHeatmap } from '../../../components/contributors/ContributionHeatmap'
import { NormalizingPanel } from '../../../components/belonging/NormalizingPanel'
import { GrowthTracker } from '../../../components/belonging/GrowthTracker'
const TABS = (id: string) => [
  { label: 'Overview', href: `/project/${id}`, icon: '⬡' },
  { label: 'Chat', href: `/project/${id}/chat`, icon: '💬' },
  { label: 'Discover', href: `/project/${id}/discover`, icon: '🔍' },
  { label: 'Library', href: `/project/${id}/library`, icon: '📚' },
  { label: 'Agents', href: `/project/${id}/agents`, icon: '🤖' },
  { label: 'LaTeX', href: `/project/${id}/latex`, icon: 'τ' },
  { label: 'Output', href: `/project/${id}/output`, icon: '⬇' },
]

function MemberCard({ member, section, targetWords }: { member: ProjectMember; section?: any; targetWords?: number }) {
  const user = member.user!
  return (
    <Card>
      <div className="flex items-start gap-3">
        <Avatar name={user.full_name} src={user.avatar_url} size={38} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <p className="font-semibold text-sm text-[#e8eaf0] truncate">{user.full_name}</p>
            <StatusPill status={member.section_status} />
          </div>
          <p className="text-xs text-[#7a839a] truncate mb-3">
            {member.assigned_subtopic || 'No subtopic assigned'}
          </p>
          {section && (
            <ProgressBar
              value={section.word_count || 0}
              max={targetWords || 500}
              label="Words"
              color={member.section_status === 'submitted' ? '#3ecf8e' : '#4f8ef7'}
            />
          )}
        </div>
      </div>
      {member.role === 'admin' && (
        <div className="mt-3 pt-3 border-t border-[#1a1f2e]">
          <Badge color="blue">Admin</Badge>
        </div>
      )}
    </Card>
  )
}

function AICoachPanel({ projectId, topic, members, onAssigned }: {
  projectId: string; topic: string; members: ProjectMember[]; onAssigned: () => void
}) {
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { success, error } = useToast()

  async function runCoach() {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          topic,
          members: members.filter(m => m.user).map(m => ({ id: m.user_id, name: m.user!.full_name })),
        }),
      })
      const data = await res.json()
      setAssignments(data.assignments || [])
    } catch (e: any) { error('AI Coach failed') }
    finally { setLoading(false) }
  }

  async function applyAssignments() {
    setLoading(true)
    try {
      await Promise.all(assignments.map(a =>
        fetch(`/api/projects/${projectId}/members/${a.member_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assigned_subtopic: a.subtopic }),
        })
      ))
      success('Subtopics assigned!')
      onAssigned()
    } catch { error('Failed to save assignments') }
    finally { setLoading(false) }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#7c6af5]/15 border border-[#7c6af5]/20 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c6af5" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>
            </svg>
          </div>
          <span className="font-semibold text-sm text-[#e8eaf0]">AI Coach</span>
          <Badge color="gray">Claude</Badge>
        </div>
        <Button size="sm" variant="secondary" onClick={runCoach} loading={loading}>
          Generate Subtopics
        </Button>
      </div>

      {assignments.length > 0 ? (
        <>
          <div className="flex flex-col gap-2 mb-4">
            {assignments.map((a, i) => {
              const member = members.find(m => m.user_id === a.member_id)
              return (
                <div key={i} className="flex items-start gap-3 p-3 bg-[#1a1f2e] rounded-lg">
                  {member?.user && <Avatar name={member.user.full_name} size={28} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#e8eaf0]">{a.subtopic}</p>
                    <p className="text-xs text-[#7a839a] mt-0.5">{a.rationale}</p>
                    <p className="text-xs text-[#3d4558] mt-1">~{a.estimated_word_count} words</p>
                  </div>
                </div>
              )
            })}
          </div>
          <Button onClick={applyAssignments} loading={loading} size="sm" variant="success" className="w-full">
            Apply These Assignments
          </Button>
        </>
      ) : (
        <p className="text-sm text-[#7a839a]">
          AI Coach will analyze your project topic and suggest equitable subtopic assignments for each team member.
        </p>
      )}
    </Card>
  )
}

interface SimpleMsg {
  id: string; content: string; userId: string | null; userFullName: string
  userAvatarUrl?: string; createdAt: Date; messageType?: string
}

function GroupChat({ projectId }: { projectId: string }) {
  const { user } = useUser()
  const [messages, setMessages] = useState<SimpleMsg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [flagged, setFlagged] = useState('')
  const [showMention, setShowMention] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const loadTimeRef = useRef<Date>(new Date())
  const { error } = useToast()

  // Load history from Postgres
  useEffect(() => {
    fetch(`/api/projects/${projectId}/chat`)
      .then(r => r.ok ? r.json() : [])
      .then((msgs: any[]) => {
        setMessages(msgs.map(m => ({
          id: m.id, content: m.content, userId: m.user_id,
          userFullName: m.user?.full_name || (m.user_id === null ? '🤖 ResearchBot' : 'Unknown'),
          userAvatarUrl: m.user?.avatar_url,
          createdAt: new Date(m.created_at),
          messageType: m.messageType,
        })))
        loadTimeRef.current = new Date()
      })
      .catch(console.error)
  }, [projectId])

  // Firebase real-time listener
  useEffect(() => {
    const q = query(collection(db, 'projects', projectId, 'messages'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, snap => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const d = change.doc.data()
          const createdAt = d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(d.createdAt)
          if (createdAt > loadTimeRef.current) {
            const msg: SimpleMsg = { id: change.doc.id, content: d.content, userId: d.userId, userFullName: d.userFullName, userAvatarUrl: d.userAvatarUrl, createdAt }
            setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
          }
        }
      })
    })
    return () => unsub()
  }, [projectId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || sending || !user) return
    setSending(true)
    setFlagged('')
    const content = input
    setInput('')
    try {
      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (res.status === 422) {
        const data = await res.json()
        setFlagged(data.message)
        setInput(content)
        return
      }
      if (!res.ok) throw new Error()
      const saved = await res.json()
      await addDoc(collection(db, 'projects', projectId, 'messages'), {
        content, userId: user.id,
        userFullName: user.fullName || user.firstName || 'Unknown',
        userAvatarUrl: user.imageUrl || null,
        createdAt: serverTimestamp(),
      })
      setMessages(prev => [...prev, {
        id: saved.id, content, userId: user.id,
        userFullName: user.fullName || user.firstName || 'Unknown',
        userAvatarUrl: user.imageUrl, createdAt: new Date(),
        messageType: saved.messageType || 'text',
      }])
      // If agent responded, append bot message
      if (saved.agentReply) {
        setMessages(prev => [...prev, {
          id: `bot-${saved.id}`, content: saved.agentReply, userId: null,
          userFullName: '🤖 ResearchBot', createdAt: new Date(),
          messageType: 'agent_response',
        }])
      }
    } catch { error('Failed to send message'); setInput(content) }
    finally { setSending(false) }
  }

  return (
    <Card className="flex flex-col" style={{ height: '380px' }}>
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[#1a1f2e]">
        <div className="w-2 h-2 rounded-full bg-[#3ecf8e] animate-pulse" />
        <span className="font-semibold text-sm text-[#e8eaf0]">Group Chat</span>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-3 mb-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-[#3d4558]">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === user?.id
            const isBot = msg.messageType === 'agent_response'
            const isShare = msg.messageType === 'research_share'

            if (isBot) {
              return (
                <div key={msg.id} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#7c6af5]/20 text-[#7c6af5] flex items-center justify-center text-[10px] font-bold flex-shrink-0">🤖</div>
                  <div className="max-w-[85%] flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] text-[#7c6af5] px-1 font-medium">ResearchBot</p>
                      <span className="text-[9px] bg-[#7c6af5]/15 text-[#7c6af5] rounded-full px-1.5 py-0.5">bot</span>
                    </div>
                    <div className="px-3 py-2 rounded-xl rounded-tl-sm text-xs bg-[#7c6af5]/10 border border-[#7c6af5]/20 text-[#c8cad0] whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                </div>
              )
            }

            if (isShare) {
              return (
                <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <Avatar name={msg.userFullName} src={msg.userAvatarUrl} size={26} />
                  <div className={`max-w-[80%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && <p className="text-[10px] text-[#7a839a] px-1">{msg.userFullName}</p>}
                    <div className="px-3 py-2 rounded-xl text-xs bg-[#4f8ef7]/10 border border-[#4f8ef7]/20 text-[#c8cad0] whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                <Avatar name={msg.userFullName} src={msg.userAvatarUrl} size={26} />
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  {!isMe && <p className="text-[10px] text-[#7a839a] px-1">{msg.userFullName}</p>}
                  <div className={`px-3 py-2 rounded-xl text-xs ${isMe
                    ? 'bg-[#4f8ef7]/15 text-[#e8eaf0] rounded-tr-sm'
                    : 'bg-[#1a1f2e] text-[#c8cad0] rounded-tl-sm'}`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {flagged && (
        <p className="text-xs text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-lg px-3 py-2 mb-2">
          ⚠ {flagged}
        </p>
      )}

      <form onSubmit={sendMessage} className="flex gap-2 relative">
        {showMention && (
          <div className="absolute bottom-12 left-0 bg-[#1a1f2e] border border-[#252a38] rounded-xl p-2 shadow-xl z-10">
            <button
              type="button"
              onClick={() => { setInput('@researchbot '); setShowMention(false) }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#252a38] transition-colors text-left w-full"
            >
              <span className="text-sm">🤖</span>
              <div>
                <p className="text-xs font-semibold text-[#e8eaf0]">@researchbot</p>
                <p className="text-[10px] text-[#7a839a]">Ask the AI agent</p>
              </div>
            </button>
          </div>
        )}
        <input
          value={input}
          onChange={e => {
            setInput(e.target.value)
            setFlagged('')
            setShowMention(e.target.value.endsWith('@'))
          }}
          placeholder="Message the team... (type @ to mention bot)"
          className="flex-1 bg-[#0a0c10] border border-[#252a38] rounded-lg px-3 py-2 text-xs
            text-[#e8eaf0] placeholder:text-[#3d4558] focus:outline-none focus:border-[#4f8ef7] transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="w-8 h-8 rounded-lg bg-[#4f8ef7] hover:bg-[#3d7de8] disabled:opacity-40
            flex items-center justify-center transition-all flex-shrink-0"
        >
          {sending ? <Spinner size={12} color="white" /> : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
            </svg>
          )}
        </button>
      </form>
    </Card>
  )
}

function ContributorshipTimeline({ logs }: { logs: ContributorshipLog[] }) {
  const actionColors: Record<string, string> = {
    created: '#4f8ef7', edited: '#3ecf8e', ai_prompted: '#7c6af5',
    reviewed: '#f59e0b', merged: '#3ecf8e'
  }
  return (
    <Card>
      <h3 className="font-semibold text-sm text-[#e8eaf0] mb-4">Contributorship Log</h3>
      {logs.length === 0 ? (
        <p className="text-xs text-[#3d4558]">No activity yet.</p>
      ) : (
        <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={log.id} className="flex items-start gap-3 py-2 border-b border-[#1a1f2e] last:border-0">
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                style={{ background: actionColors[log.action] || '#7a839a' }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#c8cad0]">
                  <span className="font-medium">{log.user?.full_name}</span>
                  {' '}<span className="text-[#7a839a]">{log.description}</span>
                </p>
                <p className="text-[10px] text-[#3d4558] mt-0.5">
                  {new Date(log.timestamp).toLocaleString()}
                </p>
              </div>
              <Badge color={
                log.action === 'ai_prompted' ? 'gray' :
                log.action === 'merged' ? 'green' : 'blue'
              }>{log.action}</Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default function ProjectDashboard() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useUser()
  const [project, setProject] = useState<Project | null>(null)
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [logs, setLogs] = useState<ContributorshipLog[]>([])
  const [myRole, setMyRole] = useState<string>('member')
  const [loading, setLoading] = useState(true)
  const [activePanel, setActivePanel] = useState<'overview' | 'moderation'>('overview')
  const alertCount = useModerationAlertCount(id, myRole === 'admin')

  useEffect(() => { fetchProject() }, [id])

  async function fetchProject() {
    try {
      const [pRes, logsRes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch(`/api/projects/${id}/contributorship`),
      ])
      const pData = await pRes.json()
      setProject(pData)
      setMembers(pData.members || [])
      setSections(pData.sections || [])
      setMyRole(pData.myRole || 'member')
      if (logsRes.ok) {
        const data = await logsRes.json()
        setLogs(Array.isArray(data) ? data : (data.timeline || []))
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function triggerMerge() {
    await fetch('/api/ai/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: id }),
    })
    router.push(`/project/${id}/latex`)
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-[#0a0c10]">
      <Spinner size={24} />
    </div>
  )
  if (!project) return <div className="p-8 text-[#7a839a]">Project not found.</div>

  const allSubmitted = members.filter(m => m.role === 'member').every(m => m.section_status === 'submitted')
  const tabs = TABS(id)

  return (
    <>
      <ToastProvider />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <PageHeader
          title={project.title}
          subtitle={`Topic: ${project.topic} · Admin: ${project.admin?.full_name}`}
          status={project.status}
          tabs={tabs}
          actions={
            <div className="flex items-center gap-2">
{myRole === 'admin' && allSubmitted && project.status === 'active' && (
                <Button onClick={triggerMerge} variant="success" size="sm" icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                  </svg>
                }>
                  Merge All Sections
                </Button>
              )}
            </div>
          }
        />

        <div className="flex-1 overflow-y-auto p-8 bg-[#0a0c10]">
          <div className="max-w-6xl mx-auto grid grid-cols-3 gap-6">
            {/* Left column — members / moderation */}
            <div className="col-span-2 flex flex-col gap-6">
              {/* Admin panel tabs */}
              {myRole === 'admin' && (
                <div className="flex gap-1 bg-[#0d1018] border border-[#1a1f2e] rounded-xl p-1 w-fit">
                  <button
                    onClick={() => setActivePanel('overview')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activePanel === 'overview'
                        ? 'bg-[#1a1f2e] text-[#e8eaf0]'
                        : 'text-[#7a839a] hover:text-[#e8eaf0]'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActivePanel('moderation')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      activePanel === 'moderation'
                        ? 'bg-[#1a1f2e] text-[#e8eaf0]'
                        : 'text-[#7a839a] hover:text-[#e8eaf0]'
                    }`}
                  >
                    Moderation
                    {alertCount > 0 && (
                      <span className="bg-[#f43f5e] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {alertCount > 9 ? '9+' : alertCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => router.push(`/project/${id}/admin`)}
                    className="px-4 py-1.5 rounded-lg text-xs font-medium transition-colors text-[#7a839a] hover:text-[#e8eaf0]"
                  >
                    Admin
                  </button>
                </div>
              )}

              {activePanel === 'moderation' && myRole === 'admin' ? (
                <>
                  <h2 className="text-xs font-semibold text-[#3d4558] uppercase tracking-widest">
                    Moderation Alerts
                  </h2>
                  <ModerationAlerts projectId={id} />
                </>
              ) : (
              <>
              {/* Member cards */}
              <div>
                <h2 className="text-xs font-semibold text-[#3d4558] uppercase tracking-widest mb-4">
                  Team Members ({members.length})
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {members.map((m, i) => (
                    <div key={m.id} className={`animate-fade-up delay-${i + 1}`}>
                      <MemberCard
                        member={m}
                        section={sections.find(s => s.member_id === m.user_id)}
                        targetWords={500}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Coach — admin only */}
              {myRole === 'admin' && (
                <AICoachPanel
                  projectId={id}
                  topic={project.topic}
                  members={members}
                  onAssigned={fetchProject}
                />
              )}

              <ContributionHeatmap projectId={id} />

              {/* Contributorship log */}
              <ContributorshipTimeline logs={logs} />
              </>
              )}
            </div>

            {/* Right column — chat */}
            <div className="flex flex-col gap-6">
              <GroupChat projectId={id} />

              <ContributionHeatmap projectId={id} />

              {/* Quick nav */}
              <Card>
                <h3 className="font-semibold text-sm text-[#e8eaf0] mb-3">Quick Access</h3>
                <div className="flex flex-col gap-2">
                  {[
                    { label: 'Review', href: `/project/${id}/review`, icon: '👁', desc: 'Read team sections' },
                    { label: 'Output', href: `/project/${id}/output`, icon: '⬇', desc: 'Merged document' },
                    ...(myRole === 'admin' ? [{ label: 'Admin', href: `/project/${id}/admin`, icon: '⚙', desc: 'Manage project' }] : []),
                  ].map(nav => (
                    <button
                      key={nav.href}
                      onClick={() => router.push(nav.href)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1a1f2e] transition-colors text-left group"
                    >
                      <span className="text-base">{nav.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-[#c8cad0] group-hover:text-[#e8eaf0] transition-colors">{nav.label}</p>
                        <p className="text-xs text-[#3d4558]">{nav.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
              <NormalizingPanel projectId={id} />

              <GrowthTracker projectId={id} />

            </div>
          </div>
        </div>
      </div>
    </>
  )
}
