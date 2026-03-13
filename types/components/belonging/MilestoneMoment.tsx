'use client'
// components/belonging/MilestoneMoment.tsx
// Feature 4 — Milestone Moment Toasts
// Renders a single milestone toast in the bottom-right corner.

import { useEffect, useState } from 'react'
import type { MilestoneType } from '../../store/milestoneStore'

interface MilestoneMeta {
  icon: string
  title: string
  body: string
  accent: string
}

const MILESTONE_META: Record<MilestoneType, MilestoneMeta> = {
  FIRST_MESSAGE: {
    icon: '💬',
    title: 'First message sent',
    body: 'Your voice is now part of this project.',
    accent: 'var(--color-blue)',
  },
  FIRST_PAPER: {
    icon: '📄',
    title: 'First paper added',
    body: 'You built the foundation.',
    accent: 'var(--color-green)',
  },
  FIRST_SECTION_EDIT: {
    icon: '✍️',
    title: 'First draft written',
    body: 'Collaboration takes courage.',
    accent: 'var(--color-green)',
  },
  FIRST_COMMENT: {
    icon: '💬',
    title: 'First comment left',
    body: 'Your voice shapes this research.',
    accent: 'var(--color-blue)',
  },
  FIRST_SUBMISSION: {
    icon: '🎯',
    title: 'Section submitted',
    body: "That's a real milestone.",
    accent: 'var(--color-violet)',
  },
  PAPERS_5: {
    icon: '📚',
    title: 'Five papers reviewed',
    body: 'This is what deep reading looks like.',
    accent: 'var(--color-green)',
  },
  COMMENTS_10: {
    icon: '🗣️',
    title: '10 comments',
    body: "You've been shaping this project.",
    accent: 'var(--color-blue)',
  },
  STREAK_3: {
    icon: '🔥',
    title: '3 days in a row',
    body: 'Consistency is the rarest research skill.',
    accent: 'var(--color-amber)',
  },
}

interface MilestoneMomentProps {
  milestone: MilestoneType
  onDismiss: () => void
}

export function MilestoneMoment({ milestone, onDismiss }: MilestoneMomentProps) {
  const [exiting, setExiting] = useState(false)
  const meta = MILESTONE_META[milestone]

  function dismiss() {
    setExiting(true)
    setTimeout(onDismiss, 300)
  }

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    const timer = setTimeout(dismiss, 6000)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`relative w-[340px] rounded-2xl p-[20px_22px] animate-fade-up transition-all duration-300 ${
        exiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}
      style={{
        background: `linear-gradient(135deg, ${meta.accent}18, var(--color-surface-2))`,
        border: `1px solid ${meta.accent}40`,
      }}
    >
      {/* Decorative glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-20px',
          right: '-20px',
          width: '120px',
          height: '120px',
          background: `radial-gradient(circle, ${meta.accent}25, transparent 70%)`,
        }}
      />

      {/* Dismiss button */}
      <button
        onClick={dismiss}
        className="absolute top-3 right-4 transition-colors"
        style={{ color: 'var(--color-muted)' }}
        aria-label="Dismiss milestone toast"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      <div className="flex gap-4 items-start">
        {/* Icon area */}
        <div
          className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-[22px]"
          style={{
            background: `${meta.accent}20`,
            border: `1px solid ${meta.accent}40`,
          }}
        >
          {meta.icon}
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          {/* Label */}
          <p
            className="text-[11px] uppercase tracking-[0.1em] mb-1"
            style={{ color: meta.accent, fontFamily: 'var(--font-body)' }}
          >
            Milestone reached
          </p>
          {/* Title */}
          <p
            className="text-[16px] font-bold leading-tight mb-1"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
          >
            {meta.title}
          </p>
          {/* Body */}
          <p
            className="text-[13px]"
            style={{ fontFamily: 'var(--font-body)', color: 'var(--color-muted)' }}
          >
            {meta.body}
          </p>
        </div>
      </div>
    </div>
  )
}
