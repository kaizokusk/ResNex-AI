'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ContributionHeatmap } from '@/components/contributors/ContributionHeatmap'
import { Button } from '@/components/ui'

const REFLECT_PROMPTS = [
  "What felt hard today, and why do you think that is?",
  "Where did you feel out of your depth this week? What would help?",
  "Describe a moment you doubted yourself. What would you tell a friend in the same situation?",
  "What's one thing you've learned recently?",
  "What assumptions did you bring to your research that have been challenged?",
  "Who makes you feel most capable? What do they do?",
  "What would you have to believe about yourself to feel fully legitimate here?",
  "When do you feel most like a researcher? When least?",
  "Write about a small win this week — no matter how small.",
  "What would you regret not saying in this project?",
  "What are you still figuring out, and is that okay?",
  "What does 'good enough' look like in your contribution?",
]

function DailyReflect() {
  const today = new Date().toISOString().slice(0, 10)
  const storageKey = `reflect_${today}`
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000
  )
  const prompt = REFLECT_PROMPTS[dayOfYear % REFLECT_PROMPTS.length]
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored) { setText(stored); setSaved(true) }
  }, [storageKey])

  const handleSave = useCallback(() => {
    localStorage.setItem(storageKey, text)
    setSaved(true)
  }, [storageKey, text])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <div
          style={{
            width: 24, height: 24, borderRadius: 8, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
            background: 'rgba(124,106,245,0.12)', border: '1px solid rgba(124,106,245,0.2)',
          }}
        >
          🔮
        </div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-body)', margin: 0 }}>
            Daily Reflect
          </p>
          <p style={{ fontSize: 10, color: saved ? 'var(--color-green)' : 'var(--color-muted)', fontFamily: 'var(--font-body)', margin: 0 }}>
            {saved ? 'Saved today ✓' : 'Private · this device only'}
          </p>
        </div>
      </div>

      <div
        style={{
          borderRadius: 8, padding: '6px 10px', marginBottom: 8,
          background: 'rgba(124,106,245,0.06)', border: '1px solid rgba(124,106,245,0.15)',
        }}
      >
        <p style={{ fontSize: 11, fontStyle: 'italic', lineHeight: 1.5, color: 'var(--color-text)', fontFamily: 'var(--font-body)', margin: 0 }}>
          &ldquo;{prompt}&rdquo;
        </p>
      </div>

      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setSaved(false) }}
        placeholder="Write freely…"
        style={{
          flex: 1, resize: 'none', borderRadius: 8, padding: '8px 10px',
          fontSize: 11, lineHeight: 1.6, outline: 'none',
          background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
          color: 'var(--color-text)', fontFamily: 'var(--font-body)',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        {saved ? (
          <span style={{ fontSize: 11, color: 'var(--color-green)', fontFamily: 'var(--font-body)' }}>Saved ✓</span>
        ) : (
          <button
            onClick={handleSave}
            disabled={text.length < 5}
            style={{
              fontSize: 11, padding: '4px 12px', borderRadius: 6, fontWeight: 500,
              cursor: text.length >= 5 ? 'pointer' : 'default',
              background: text.length >= 5 ? 'var(--color-violet)' : 'var(--color-border)',
              color: text.length >= 5 ? '#fff' : 'var(--color-muted)',
              opacity: text.length >= 5 ? 1 : 0.5, border: 'none', fontFamily: 'var(--font-body)',
            }}
          >
            Save
          </button>
        )}
      </div>
    </div>
  )
}

type DashboardStats = {
  totalActions: number
  activeProjects: number
  currentStreak: number
}

type ContributionDay = {
  date: string
  count: number
}

type ContributionResponse = {
  days: ContributionDay[]
  currentStreak: number
  totalActiveDays: number
}

type ProjectSummary = {
  id: string
  title: string
  status: string
  myRole?: string
}

type AggregateDashboardProps = {
  userId: string
  userName: string
  onCreateProject: () => void
}

const STATUS_MAP: Record<string, { symbol: string; color: string; srLabel: string }> = {
  active: { symbol: '●', color: 'var(--color-success)', srLabel: 'active project' },
  draft: { symbol: '◦', color: 'var(--color-warning)', srLabel: 'draft project' },
  review: { symbol: '⚠', color: 'var(--color-blue)', srLabel: 'project in review' },
  merged: { symbol: '✓', color: 'var(--color-blue)', srLabel: 'merged project' },
  done: { symbol: '✓', color: 'var(--color-muted)', srLabel: 'completed project' },
}

function statDisplay(value: number, fallback: string) {
  return value === 0 ? fallback : value.toString()
}

function projectActivityLevel(days: ContributionDay[]) {
  const recentTotal = days.slice(-7).reduce((sum, day) => sum + day.count, 0)
  return Math.min(10, recentTotal)
}

function statTileAria(label: string, value: number, fallback: string) {
  return value === 0 ? `${fallback} ${label}` : `${value} ${label}`
}

function MiniBar({ level }: { level: number }) {
  return (
    <div aria-hidden="true" className="flex items-center gap-[2px]" style={{ width: 60 }}>
      {Array.from({ length: 6 }, (_, index) => {
        const filled = index < Math.ceil(level / 2)
        return (
          <span
            key={index}
            className="rounded-full"
            style={{
              width: 8,
              height: 4,
              background: filled ? 'var(--color-blue)' : 'var(--color-border)',
              opacity: filled ? 1 : 0.85,
            }}
          />
        )
      })}
    </div>
  )
}

function StatTile({
  value,
  label,
  fallback,
}: {
  value: number
  label: string
  fallback: string
}) {
  const display = statDisplay(value, fallback)
  return (
    <div
      role="img"
      aria-label={statTileAria(label, value, fallback)}
      className="flex flex-1 flex-col gap-1 rounded-xl border"
      style={{
        background: 'var(--color-surface-2)',
        borderColor: 'var(--color-border)',
        padding: '12px 16px',
      }}
    >
      <div
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}
      >
        {label}
      </div>
      <div
        className="text-[22px] font-bold leading-tight"
        style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}
      >
        {display}
      </div>
    </div>
  )
}

export function AggregateDashboard({ userId: _userId, userName, onCreateProject }: AggregateDashboardProps) {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [projectActivity, setProjectActivity] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const firstName = useMemo(() => userName.trim().split(' ')[0] || 'Researcher', [userName])

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      setLoading(true)
      try {
        const [statsRes, projectsRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/projects'),
        ])

        const statsData = statsRes.ok ? (await statsRes.json() as DashboardStats) : null
        const projectsData = projectsRes.ok ? (await projectsRes.json() as ProjectSummary[]) : []

        if (cancelled) return

        setStats(statsData)
        setProjects(Array.isArray(projectsData) ? projectsData : [])

        if (!Array.isArray(projectsData) || projectsData.length === 0) {
          setProjectActivity({})
          return
        }

        const contributionRows = await Promise.all(
          projectsData.map(async (project) => {
            try {
              const response = await fetch(`/api/projects/${project.id}/contributions/me`)
              if (!response.ok) return [project.id, 0] as const
              const data = await response.json() as ContributionResponse
              return [project.id, projectActivityLevel(data.days)] as const
            } catch {
              return [project.id, 0] as const
            }
          })
        )

        if (!cancelled) setProjectActivity(Object.fromEntries(contributionRows))
      } catch (error) {
        if (!cancelled) console.error('[aggregate-dashboard]', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadDashboard()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section
      aria-label="Your research activity summary"
      aria-busy={loading}
      className="mx-auto flex w-full max-w-[700px] flex-col gap-5"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}
          >
            Your Research Activity
          </p>
          <p
            className="mt-0.5 text-[12px]"
            style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}
          >
            A quiet record of the work you&apos;re doing, {firstName}.
          </p>
        </div>
        <Button onClick={onCreateProject}>✦ New Project</Button>
      </div>

      <div className="flex gap-3">
        <StatTile value={stats?.totalActions ?? 0} label="contributions" fallback="Nothing recorded yet ✦" />
        <StatTile value={stats?.activeProjects ?? 0} label="active projects" fallback="Open a project to begin ✦" />
        <StatTile value={stats?.currentStreak ?? 0} label="day streak" fallback="Start today ✦" />
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
        <div style={{ flex: 1 }}>
          <ContributionHeatmap projectId={null} />
        </div>
        <div style={{ width: 200, flexShrink: 0 }}>
          <DailyReflect />
        </div>
      </div>

      <div
        className="rounded-xl border"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', padding: '12px 16px' }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-wider mb-2"
          style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}
        >
          Your Projects
        </p>

        {loading ? (
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="skeleton h-[40px] rounded-lg" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div
            className="rounded-lg border px-3 py-2 text-[12px]"
            style={{
              background: 'var(--color-surface-2)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-muted)',
              fontFamily: 'var(--font-body)',
            }}
          >
            ✦ No projects yet — create one to get started
          </div>
        ) : (
          <div role="list" className="flex flex-col gap-1.5">
            {projects.map((project) => {
              const statusMeta = STATUS_MAP[project.status] ?? {
                symbol: '◦',
                color: 'var(--color-muted)',
                srLabel: 'project status unavailable',
              }
              const roleText = project.myRole === 'admin' ? '✦ admin' : '◦ member'

              return (
                <button
                  key={project.id}
                  type="button"
                  role="listitem"
                  onClick={() => router.push(`/project/${project.id}`)}
                  className="flex min-h-[40px] items-center gap-3 rounded-lg border px-3 text-left transition-colors hover:bg-[var(--color-surface-2)]"
                  style={{
                    background: 'var(--color-surface-2)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="text-sm flex-shrink-0"
                    style={{ color: statusMeta.color }}
                  >
                    {statusMeta.symbol}
                  </span>
                  <span className="sr-only">{statusMeta.srLabel}</span>

                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-[12px] font-semibold"
                      style={{ color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}
                    >
                      {project.title}
                    </div>
                  </div>

                  <MiniBar level={projectActivity[project.id] ?? 0} />

                  <span
                    className="rounded-full border px-2 py-0.5 text-[11px] font-medium flex-shrink-0"
                    style={{
                      borderColor: project.myRole === 'admin' ? 'var(--color-blue)' : 'var(--color-border-2)',
                      color: project.myRole === 'admin' ? 'var(--color-blue)' : 'var(--color-muted)',
                      background: project.myRole === 'admin' ? 'var(--color-blue-12)' : 'var(--color-surface)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {roleText}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
