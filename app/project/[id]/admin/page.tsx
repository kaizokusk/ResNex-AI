'use client'
// app/project/[id]/admin/page.tsx

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '../../../../components/layout/PageHeader'
import { Button, Input, Select, Avatar, StatusPill, Badge, Card, Modal, ToastProvider, useToast } from '../../../../components/ui'

export default function AdminPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [members, setMembers] = useState<any[]>([])
  const [project, setProject] = useState<any>(null)
  const [modLogs, setModLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [projectStatus, setProjectStatus] = useState('')
  const [activeTab, setActiveTab] = useState<'members' | 'moderation' | 'settings'>('members')
  const { success, error } = useToast()

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${id}`).then(r => r.json()),
      fetch(`/api/projects/${id}/moderation`).then(r => r.ok ? r.json() : []),
    ]).then(([proj, logs]) => {
      setProject(proj)
      setMembers(proj.members || [])
      setModLogs(logs)
      setProjectStatus(proj.status)
    }).finally(() => setLoading(false))
  }, [id])

  async function inviteMember() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await fetch(`/api/projects/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: 'member' }),
      })
      if (res.status === 409) { error('Already a member'); return }
      if (!res.ok) throw new Error()
      const member = await res.json()
      setMembers(prev => [...prev, member])
      setInviteEmail('')
      success(`${inviteEmail} invited!`)
    } catch { error('Failed to invite member') }
    finally { setInviting(false) }
  }

  async function updateSubtopic(memberId: string, subtopic: string) {
    await fetch(`/api/projects/${id}/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_subtopic: subtopic }),
    })
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, assigned_subtopic: subtopic } : m))
  }

  async function updateStatus(newStatus: string) {
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setProjectStatus(newStatus)
    success('Status updated!')
  }

  const tabs = [
    { label: 'Overview', href: `/project/${id}`, icon: '⬡' },
    { label: 'Chat', href: `/project/${id}/chat`, icon: '💬' },
    { label: 'Discover', href: `/project/${id}/discover`, icon: '🔍' },
    { label: 'Library', href: `/project/${id}/library`, icon: '📚' },
    { label: 'Agents', href: `/project/${id}/agents`, icon: '🤖' },
    { label: 'LaTeX', href: `/project/${id}/latex`, icon: 'τ' },
    { label: 'Output', href: `/project/${id}/output`, icon: '⬇' },
    { label: 'Admin ⚙', href: `/project/${id}/admin`, icon: '⚙' },
  ]

  return (
    <>
      <ToastProvider />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <PageHeader
          title="Admin Panel"
          subtitle="Manage members, subtopics, and project settings"
          tabs={tabs}
          activeTab={`/project/${id}/admin`}
        />

        <div className="flex-1 overflow-y-auto p-8 bg-[#0a0c10]">
          <div className="max-w-3xl mx-auto flex flex-col gap-6">
            {/* Sub-nav */}
            <div className="flex gap-1 bg-[#12151c] border border-[#252a38] p-1 rounded-xl w-fit">
              {(['members', 'moderation', 'settings'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                    activeTab === tab ? 'bg-[#4f8ef7] text-white' : 'text-[#7a839a] hover:text-[#e8eaf0]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'members' && (
              <div className="flex flex-col gap-4">
                {/* Invite */}
                <Card>
                  <h3 className="font-semibold text-sm text-[#e8eaf0] mb-4">Invite Member</h3>
                  <div className="flex gap-3">
                    <Input
                      placeholder="colleague@university.edu"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && inviteMember()}
                      className="flex-1"
                    />
                    <Button onClick={inviteMember} loading={inviting} disabled={!inviteEmail.trim()}>
                      Invite
                    </Button>
                  </div>
                </Card>

                {/* Member list */}
                <Card>
                  <h3 className="font-semibold text-sm text-[#e8eaf0] mb-4">Team Members ({members.length})</h3>
                  <div className="flex flex-col gap-3">
                    {members.map(m => (
                      <div key={m.id} className="flex items-center gap-3 p-3 bg-[#0a0c10] rounded-lg border border-[#1a1f2e]">
                        <Avatar name={m.user?.full_name || 'User'} size={32} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#e8eaf0]">{m.user?.full_name}</p>
                          <p className="text-xs text-[#7a839a]">{m.user?.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusPill status={m.section_status} />
                          <Badge color={m.role === 'admin' ? 'blue' : 'gray'}>{m.role}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Subtopic assignments */}
                <Card>
                  <h3 className="font-semibold text-sm text-[#e8eaf0] mb-4">Subtopic Assignments</h3>
                  <div className="flex flex-col gap-3">
                    {members.filter(m => m.role === 'member').map(m => (
                      <div key={m.id} className="flex items-center gap-3">
                        <Avatar name={m.user?.full_name || 'User'} size={28} />
                        <span className="text-sm text-[#c8cad0] w-32 truncate">{m.user?.full_name}</span>
                        <input
                          defaultValue={m.assigned_subtopic || ''}
                          onBlur={e => updateSubtopic(m.id, e.target.value)}
                          placeholder="Assign a subtopic..."
                          className="flex-1 bg-[#0a0c10] border border-[#252a38] rounded-lg px-3 py-1.5 text-xs
                            text-[#e8eaf0] placeholder:text-[#3d4558] focus:outline-none focus:border-[#4f8ef7]"
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'moderation' && (
              <Card>
                <h3 className="font-semibold text-sm text-[#e8eaf0] mb-4">
                  Moderation Log
                  {modLogs.length > 0 && <Badge color="red" className="ml-2">{modLogs.length} flagged</Badge>}
                </h3>
                {modLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-2xl mb-2">✓</p>
                    <p className="text-sm text-[#3ecf8e]">No flagged messages</p>
                    <p className="text-xs text-[#3d4558] mt-1">All content has passed moderation</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {modLogs.map((log, i) => (
                      <div key={i} className="p-4 bg-[#ef4444]/5 border border-[#ef4444]/15 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-[#e8eaf0]">{log.user?.full_name}</span>
                          <div className="flex items-center gap-2">
                            <Badge color="gray">{log.context}</Badge>
                            <span className="text-[10px] text-[#3d4558]">{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                        <p className="text-xs text-[#c8cad0] mb-1 italic">"{log.content}"</p>
                        <p className="text-xs text-[#ef4444]">Reason: {log.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {activeTab === 'settings' && (
              <Card>
                <h3 className="font-semibold text-sm text-[#e8eaf0] mb-4">Project Settings</h3>
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-xs text-[#7a839a] mb-2 uppercase tracking-wider font-medium">Project Status</p>
                    <div className="flex gap-2 flex-wrap">
                      {['draft', 'active', 'review', 'merged', 'done'].map(s => (
                        <button
                          key={s}
                          onClick={() => updateStatus(s)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                            projectStatus === s
                              ? 'bg-[#4f8ef7] text-white'
                              : 'bg-[#1a1f2e] text-[#7a839a] hover:text-[#e8eaf0] border border-[#252a38]'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-[#1a1f2e]">
                    <p className="text-xs text-[#7a839a] mb-1 uppercase tracking-wider font-medium">Trigger Merge</p>
                    <p className="text-xs text-[#7a839a] mb-3">Merge all submitted sections into the final document.</p>
                    <Button
                      variant="success"
                      onClick={async () => {
                        const res = await fetch('/api/ai/merge', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ project_id: id }),
                        })
                        if (res.ok) { success('Merge started! Check Output page.') }
                        else error('Merge failed')
                      }}
                    >
                      Trigger AI Merge
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
