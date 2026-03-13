'use client'
// components/belonging/WelcomeStrip.tsx
// Feature 1 — Belonging Welcome Strip

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface WelcomeStripProps {
  projectId: string
  userName: string
  onDismiss?: () => void
}

export function WelcomeStrip({ projectId, userName, onDismiss }: WelcomeStripProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const searchParams = useSearchParams()
  const debugMode = searchParams.get('debug') === 'belonging'

  useEffect(() => {
    async function checkWelcome() {
      if (debugMode) {
        setIsVisible(true)
        setLoaded(true)
        return
      }
      try {
        const res = await fetch(`/api/projects/${projectId}/members/welcome`)
        if (!res.ok) return
        const data = await res.json()
        if (!data.hasSeenWelcome) setIsVisible(true)
      } catch {
        // Fail silently — do not block navigation
      } finally {
        setLoaded(true)
      }
    }
    checkWelcome()
  }, [projectId, debugMode])

  async function handleDismiss() {
    setIsExiting(true)
    if (!debugMode) {
      try {
        await fetch(`/api/projects/${projectId}/members/welcome`, { method: 'PATCH' })
      } catch {
        // Fire and forget
      }
    }
    setTimeout(() => {
      setIsVisible(false)
      onDismiss?.()
    }, 300)
  }

  if (!loaded || !isVisible) return null

  const displayName = userName || 'researcher'

  return (
    <div className="px-8 pt-6 pb-0">
    <div
      className={`relative overflow-hidden rounded-[14px] animate-fade-up transition-all duration-300 ${
        isExiting ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'
      }`}
      style={{
        padding: '22px 28px',
        background: 'linear-gradient(135deg, rgba(79,142,247,0.06), rgba(124,106,245,0.03))',
        border: '1px solid rgba(79,142,247,0.19)',
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
          background: 'radial-gradient(circle, rgba(124,106,245,0.15), transparent 70%)',
        }}
      />

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-4 transition-colors"
        style={{ color: 'var(--color-muted)' }}
        aria-label="Dismiss welcome message"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Headline */}
      <h2
        className="mb-2"
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '20px',
          fontWeight: 700,
          color: 'var(--color-text)',
          lineHeight: 1.3,
        }}
      >
        You belong here, {displayName}.
      </h2>

      {/* Body copy */}
      <p
        className="mb-4 max-w-2xl"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          color: 'var(--color-muted)',
          lineHeight: 1.7,
        }}
      >
        This is a space to think out loud, ask questions, and build together. There&apos;s no expectation of being an expert — only of being curious and present. Every collaborator here started where you are now.
      </p>

      {/* Tag pills */}
      <div className="flex flex-wrap gap-2">
        {['Ask any question', 'Draft ideas freely', 'Revise without judgment', 'Learn by doing'].map(tag => (
          <span
            key={tag}
            style={{
              background: 'rgba(79,142,247,0.08)',
              border: '1px solid rgba(79,142,247,0.19)',
              borderRadius: '99px',
              padding: '4px 12px',
              fontSize: '12px',
              color: 'var(--color-blue)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
    </div>
  )
}
