'use client'
// app/project/[id]/layout.tsx
// Wraps all project sub-pages with the sidebar

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Sidebar } from '../../../components/layout/Sidebar'
import { Modal, Button, Input, Textarea, ToastProvider, useToast } from '../../../components/ui'
import { WelcomeStrip } from '../../../components/belonging/WelcomeStrip'
import { MilestoneQueue } from '../../../components/belonging/MilestoneQueue'
import { Project } from '../../../types'

function CreateProjectModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: (p: Project) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const { error: showError, success } = useToast()

  async function handleCreate() {
    if (!title || !description || !topic) return
    setLoading(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, topic }),
      })
      if (!res.ok) throw new Error()
      const project = await res.json()
      success('Project created!')
      onCreated(project)
      onClose()
      setTitle(''); setDescription(''); setTopic('')
    } catch { showError('Failed to create project') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create New Project">
      <div className="flex flex-col gap-4">
        <Input id="create-title" label="Project Title" placeholder="e.g. AI Ethics in STEM Education" value={title} onChange={e => setTitle(e.target.value)} />
        <Input id="create-topic" label="Research Topic" placeholder="e.g. Bias in AI Assessment Tools" value={topic} onChange={e => setTopic(e.target.value)} />
        <Textarea label="Description" placeholder="Brief description of the research goals..." value={description} onChange={e => setDescription(e.target.value)} rows={3} />
        <div className="flex gap-3 justify-end mt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} loading={loading} disabled={!title || !description || !topic}>Create Project</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const pathname = usePathname()
  const { user: clerkUser } = useUser()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [myRoles, setMyRoles] = useState<Record<string, string>>({})

  // Suppress WelcomeStrip on the LaTeX editor page
  const isLatexPage = pathname?.includes('/latex')
  const firstName = clerkUser?.firstName || clerkUser?.fullName?.split(' ')[0] || 'researcher'

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then((data: any[]) => {
        setProjects(data)
        const roles: Record<string, string> = {}
        data.forEach(p => { if (p.myRole) roles[p.id] = p.myRole })
        setMyRoles(roles)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <ToastProvider />
      <div className="flex h-screen overflow-hidden">
        <nav aria-label="Project navigation">
        <Sidebar
          projects={projects}
          loading={loading}
          selectedId={params.id}
          onSelect={id => router.push(`/project/${id}`)}
          onCreateProject={() => setShowCreate(true)}
          myRole={myRoles}
        />
        </nav>
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-hidden flex flex-col">
          {!isLatexPage && (
            <Suspense fallback={null}>
              <WelcomeStrip
                projectId={params.id}
                userName={firstName}
              />
            </Suspense>
          )}
          {children}
        </main>
      </div>
      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={p => { setProjects(prev => [p, ...prev]); router.push(`/project/${p.id}`) }}
      />
      {/* Milestone toasts — persists across tab navigation, suppressed inside MilestoneQueue on /latex */}
      <MilestoneQueue projectId={params.id} />
      {/* Screen reader live announcer — used by toasts and milestone notifications */}
      <div id="sr-announcer" aria-live="polite" aria-atomic="true" className="sr-only" />
    </>
  )
}
