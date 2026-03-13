'use client'
// components/belonging/ReflectionHistory.tsx
// Feature 6 — Private Reflection Space
// Shows the user's past reflection entries (read-only).
// PRIVACY: API returns only the current user's entries; no data from other users is shown.

import { useState } from 'react'

interface ReflectionEntry {
  id: string
  content: string
  promptIndex: number
  isShared: boolean
  createdAt: string
}

interface ReflectionHistoryProps {
  entries: ReflectionEntry[]
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ReflectionHistory({ entries }: ReflectionHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (entries.length === 0) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
      >
        <p className="text-[13px]" style={{ color: 'var(--color-muted)' }}>
          Your past reflections will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] uppercase tracking-[0.08em]" style={{ color: 'var(--color-muted)' }}>
        Past reflections
      </p>

      {entries.map((entry) => {
        const isExpanded = expandedId === entry.id
        const preview = entry.content.slice(0, 100)
        const hasMore = entry.content.length > 100

        return (
          <div
            key={entry.id}
            className="rounded-xl p-4 transition-colors cursor-pointer"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
            }}
            onClick={() => setExpandedId(isExpanded ? null : entry.id)}
          >
            {/* Row: date + shared badge */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px]" style={{ color: 'var(--color-muted)' }}>
                {formatDate(entry.createdAt)}
              </p>
              {entry.isShared && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    background: 'var(--color-violet)18',
                    color: 'var(--color-violet)',
                    border: '1px solid var(--color-violet)30',
                  }}
                >
                  Shared anonymously
                </span>
              )}
            </div>

            {/* Content */}
            <p
              className="text-[13px] leading-relaxed"
              style={{ color: 'var(--color-text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            >
              {isExpanded ? entry.content : preview}
              {!isExpanded && hasMore && (
                <span style={{ color: 'var(--color-muted)' }}>…</span>
              )}
            </p>

            {hasMore && (
              <p className="text-[11px] mt-2" style={{ color: 'var(--color-violet)' }}>
                {isExpanded ? 'Show less' : 'Read more'}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
