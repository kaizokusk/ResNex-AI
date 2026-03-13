'use client'
// components/belonging/NormalizingPanel.tsx
// Feature 3 — Normalizing Struggle Panel
// Shows anonymized aggregate stats about the project's genuine messiness.

import { useEffect, useState, useCallback } from 'react'

interface NormalizeData {
  revisionsThisWeek: number
  openQuestions: number
  draftSections: number
  uncertaintySignals: number
}

interface NormalizingPanelProps {
  projectId: string
}

const REFRESH_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

const TILES = [
  {
    key: 'revisionsThisWeek' as const,
    icon: '🔄',
    label: 'Revisions this week',
    context: 'Edits made by the whole team',
  },
  {
    key: 'openQuestions' as const,
    icon: '❓',
    label: 'Open chat questions',
    context: 'Questions asked in the past 2 weeks',
  },
  {
    key: 'draftSections' as const,
    icon: '📝',
    label: 'Sections in draft',
    context: 'Sections with content, not yet submitted',
  },
  {
    key: 'uncertaintySignals' as const,
    icon: '💬',
    label: '"Not sure" signals',
    context: 'Moments of uncertainty in the past 30 days',
  },
]

function StatTile({
  icon,
  value,
  label,
  context,
  loading,
}: {
  icon: string
  value: number
  label: string
  context: string
  loading: boolean
}) {
  return (
    <div
      className="rounded-xl p-[14px_16px] flex flex-col gap-1"
      style={{
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base leading-none">{icon}</span>
        {loading ? (
          <div className="skeleton h-7 w-12 rounded" />
        ) : (
          <span
            className="text-[22px] font-bold leading-none"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
          >
            {value}
          </span>
        )}
      </div>
      <p
        className="text-[12px] font-medium"
        style={{ fontFamily: 'var(--font-body)', color: 'var(--color-muted)' }}
      >
        {label}
      </p>
      <p
        className="text-[11px]"
        style={{ fontFamily: 'var(--font-body)', color: 'var(--color-faint)' }}
      >
        {context}
      </p>
    </div>
  )
}

export function NormalizingPanel({ projectId }: NormalizingPanelProps) {
  const [data, setData] = useState<NormalizeData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/belonging/normalize`)
      if (res.ok) setData(await res.json())
    } catch {
      // Fail silently — panel still renders with zero values or last known data
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <section
      className="rounded-2xl border p-5"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Header */}
      <div className="mb-4">
        <h3
          className="text-[15px] font-bold mb-1"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
        >
          Research Is Messy — For Everyone
        </h3>
        <p
          className="text-[13px]"
          style={{ fontFamily: 'var(--font-body)', color: 'var(--color-muted)' }}
        >
          Aggregate project activity — no individual attribution
        </p>
      </div>

      {/* 2×2 stat grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {TILES.map(tile => (
          <StatTile
            key={tile.key}
            icon={tile.icon}
            value={data?.[tile.key] ?? 0}
            label={tile.label}
            context={tile.context}
            loading={loading}
          />
        ))}
      </div>

      {/* Normalizing footer — always visible */}
      <div
        className="rounded-xl px-4 py-3 text-[13px]"
        style={{
          background: 'rgba(124,106,245,0.06)',
          border: '1px solid rgba(124,106,245,0.19)',
          color: 'var(--color-violet)',
          fontFamily: 'var(--font-body)',
          lineHeight: 1.6,
        }}
      >
        Reminder: Every researcher you admire has unfinished drafts, unanswered questions, and things they had to look up.
      </div>
    </section>
  )
}
