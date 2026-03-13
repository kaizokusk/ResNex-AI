'use client'
// app/dashboard/page.tsx — Main dashboard with sidebar + project tabs

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { AggregateDashboard } from '../../components/dashboard/AggregateDashboard'
import { Sidebar } from '../../components/layout/Sidebar'
import { Modal, Button, Input, Textarea, ToastProvider, useToast } from '../../components/ui'
import { Project } from '../../types'

function CreateProjectModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: (p: Project) => void
}) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [createdProject, setCreatedProject] = useState<Project | null>(null)
  const [emailInput, setEmailInput] = useState('')
  const [invites, setInvites] = useState<string[]>([])
  const [inviting, setInviting] = useState(false)
  const { error: showError, success } = useToast()

  function handleClose() {
    onClose()
    setTimeout(() => { setStep(1); setTitle(''); setDescription(''); setTopic(''); setInvites([]); setEmailInput(''); setCreatedProject(null) }, 300)
  }

  async function handleCreate() {
    if (!title || !description || !topic) return
    setLoading(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, topic }),
      })
      if (!res.ok) throw new Error(await res.text())
      const project = await res.json()
      setCreatedProject(project)
      onCreated(project)
      setStep(2)
    } catch (e: any) {
      showError(e.message || 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  function addEmail() {
    const email = emailInput.trim().toLowerCase()
    if (!email || !email.includes('@') || invites.includes(email)) return
    setInvites(prev => [...prev, email])
    setEmailInput('')
  }

  async function handleInviteAndGo() {
    if (!createdProject) return
    setInviting(true)
    try {
      await Promise.all(invites.map(email =>
        fetch(`/api/projects/${createdProject.id}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, role: 'member' }),
        })
      ))
      if (invites.length > 0) success(`Invited ${invites.length} member${invites.length > 1 ? 's' : ''}`)
    } catch { showError('Some invites may have failed — you can add more from Admin settings') }
    finally {
      setInviting(false)
      handleClose()
      router.push(`/project/${createdProject.id}`)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={step === 1 ? 'Create New Project' : 'Invite Team Members'}>
      {step === 1 ? (
        <div className="flex flex-col gap-4">
          <div className="flex gap-1.5 mb-1">
            <div className="h-1 flex-1 rounded-full bg-[#4f8ef7]" />
            <div className="h-1 flex-1 rounded-full bg-[#252a38]" />
          </div>
          <Input
            label="Project Title"
            placeholder="e.g. AI Ethics in STEM Education"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <Input
            label="Research Topic"
            placeholder="e.g. Bias in AI Assessment Tools"
            value={topic}
            onChange={e => setTopic(e.target.value)}
          />
          <Textarea
            label="Description"
            placeholder="Brief description of the research goals..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
          <div className="flex gap-3 justify-end mt-2">
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button onClick={handleCreate} loading={loading} disabled={!title || !description || !topic}>
              Next: Invite Members
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex gap-1.5 mb-1">
            <div className="h-1 flex-1 rounded-full bg-[#4f8ef7]" />
            <div className="h-1 flex-1 rounded-full bg-[#4f8ef7]" />
          </div>
          <p className="text-xs text-[#7a839a]">
            Add team members by email. They'll be able to log in and join <span className="text-[#e8eaf0] font-medium">{title}</span>. You can also add more later from Admin settings.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEmail() } }}
              placeholder="teammate@university.edu"
              className="flex-1 bg-[#0a0c10] border border-[#252a38] rounded-lg px-3 py-2 text-sm
                text-[#e8eaf0] placeholder:text-[#3d4558] focus:outline-none focus:border-[#4f8ef7] transition-all"
            />
            <Button variant="secondary" size="sm" onClick={addEmail} disabled={!emailInput.trim()}>Add</Button>
          </div>
          {invites.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {invites.map(email => (
                <div key={email} className="flex items-center gap-2 px-3 py-2 bg-[#1a1f2e] rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-[#4f8ef7]/20 flex items-center justify-center text-[10px] font-bold text-[#4f8ef7]">
                    {email[0].toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm text-[#c8cad0] truncate">{email}</span>
                  <button onClick={() => setInvites(prev => prev.filter(e => e !== email))}
                    className="text-[#3d4558] hover:text-[#f87171] transition-colors text-xs">✕</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3 justify-between mt-2">
            <Button variant="ghost" onClick={() => { handleClose(); router.push(`/project/${createdProject!.id}`) }}>
              Skip, go to project
            </Button>
            <Button onClick={handleInviteAndGo} loading={inviting}>
              {invites.length > 0 ? `Invite ${invites.length} & Open` : 'Open Project'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function ProfileSetupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [fullName, setFullName] = useState('')
  const [affiliation, setAffiliation] = useState('')
  const [saving, setSaving] = useState(false)
  const { success, error } = useToast()

  async function handleSave() {
    if (!fullName.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, affiliation }),
      })
      if (!res.ok) throw new Error()
      success('Profile saved!')
      onClose()
    } catch { error('Failed to save profile') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Complete your profile">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-[#7a839a]">Tell us a bit about yourself to get started.</p>
        <Input
          label="Full Name"
          placeholder="e.g. Priya Sharma"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
        />
        <Input
          label="University / Affiliation"
          placeholder="e.g. IIT Delhi"
          value={affiliation}
          onChange={e => setAffiliation(e.target.value)}
        />
        <div className="flex gap-3 justify-end mt-2">
          <Button variant="ghost" onClick={onClose}>Skip</Button>
          <Button onClick={handleSave} loading={saving} disabled={!fullName.trim()}>
            Save Profile
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [showCreate, setShowCreate] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [myRoles, setMyRoles] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isLoaded) return
    fetchProjects()
    // Check if profile needs completion
    fetch('/api/user').then(r => r.ok ? r.json() : null).then(u => {
      if (u && !u.affiliation) setShowProfile(true)
    }).catch(() => {})
  }, [isLoaded])

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects')
      const text = await res.text()
      if (!text) { console.error('[fetchProjects] empty response'); return }
      const data = JSON.parse(text)
      if (!Array.isArray(data)) { console.error('[fetchProjects] server error:', data); return }
      setProjects(data)
      const roles: Record<string, string> = {}
      data.forEach((p: any) => { if (p.myRole) roles[p.id] = p.myRole })
      setMyRoles(roles)
    } catch (e) {
      console.error('[fetchProjects]', e)
    } finally {
      setLoadingProjects(false)
    }
  }

  function handleSelect(id: string) {
    setSelectedId(id)
    router.push(`/project/${id}`)
  }

  if (!isLoaded) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0c10]">
      <div className="animate-spin w-6 h-6 border-2 border-[#4f8ef7] border-t-transparent rounded-full" />
    </div>
  )

  return (
    <>
      <ToastProvider />
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          projects={projects}
          loading={loadingProjects}
          selectedId={selectedId}
          onSelect={handleSelect}
          onCreateProject={() => setShowCreate(true)}
          myRole={myRoles}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 bg-[#0a0c10] overflow-y-auto"
          style={{ padding: '28px 36px' }}
        >
          <AggregateDashboard
            userId={user?.id ?? ''}
            userName={user?.fullName || user?.firstName || 'Researcher'}
            onCreateProject={() => setShowCreate(true)}
          />
        </main>
      </div>
      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(p) => { setProjects(prev => [p, ...prev]); handleSelect(p.id) }}
      />
      <ProfileSetupModal open={showProfile} onClose={() => setShowProfile(false)} />
    </>
  )
}
