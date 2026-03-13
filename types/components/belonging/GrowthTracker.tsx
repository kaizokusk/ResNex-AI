'use client'
// components/belonging/GrowthTracker.tsx
// Feature 5 — Personal Growth Tracker
// Shows before/after progress across four dimensions since joining the project.

import { useEffect, useState, useRef } from 'react'
import { useIntersectionObserver } from '../../lib/hooks/useIntersectionObserver'

interface GrowthDimension {
  key: string
  label: string
  baseline: number
  current: number
  unit: string
}

interface GrowthData {
  dimensions: GrowthDimension[]
  joinedAt: string
}

interface GrowthTrackerProps {
  projectId: string
}

function growthBadge(baseline: number, current: number): { text: string; color: string } {
  if (baseline === 0) {
    return { text: 'New skill ✦', color: 'var(--color-green)' }
  }
  if (current > baseline) {
    const pct = Math.round(((current - baseline) / baseline) * 100)
    return { text: `+${pct}%`, color: 'var(--color-green)' }
  }
  return { text: String(current), color: 'var(--color-muted)' }
}

function DimensionRow({
  dim,
  animate,
}: {
  dim: GrowthDimension
  animate: boolean
}) {
  const maxValue = Math.max(dim.current, dim.baseline, 1)
  const baselinePct = (dim.baseline / maxValue) * 100
  const currentPct = (dim.current / maxValue) * 100
  const badge = growthBadge(dim.baseline, dim.current)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span
          className="text-[13px] font-medium"
          style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text)' }}
        >
          {dim.label}
        </span>
        <span
          className="text-[12px] font-semibold"
          style={{ color: badge.color, fontFamily: 'var(--font-body)' }}
        >
          {badge.text}
        </span>
      </div>

      {/* Progress bar stack */}
      <div
        className="relative h-[6px] rounded-full overflow-hidden"
        style={{ background: 'var(--color-faint)' }}
      >
        {/* Baseline layer */}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${baselinePct}%`,
            background: 'var(--color-border-2)',
          }}
        />
        {/* Current layer (on top) */}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: animate ? `${currentPct}%` : '0%',
            background: 'linear-gradient(90deg, var(--color-blue), var(--color-violet))',
            transition: animate ? 'width 1s ease' : 'none',
          }}
        />
      </div>

      <p
        className="text-[11px]"
        style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}
      >
        {dim.current} {dim.unit} now
        {dim.baseline > 0 ? ` · ${dim.baseline} at start` : ''}
      </p>
    </div>
  )
}

export function GrowthTracker({ projectId }: GrowthTrackerProps) {
  const [data, setData] = useState<GrowthData | null>(null)
  const [loading, setLoading] = useState(true)
  const sectionRef = useRef<HTMLElement | null>(null)
  const { ref, isVisible } = useIntersectionObserver({ threshold: 0.1 })

  // Merge refs
  function setRef(el: HTMLElement | null) {
    sectionRef.current = el
    ;(ref as React.MutableRefObject<HTMLElement | null>).current = el
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/projects/${projectId}/belonging/growth`)
        if (res.ok) setData(await res.json())
      } catch {
        // Fail silently — show skeleton or empty state
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  return (
    <section
      ref={setRef}
      className="rounded-2xl border p-5"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Header */}
      <div className="mb-5">
        <h3
          className="text-[15px] font-bold mb-1"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
        >
          How You&apos;ve Grown in This Project
        </h3>
        <p
          className="text-[13px]"
          style={{ fontFamily: 'var(--font-body)', color: 'var(--color-muted)' }}
        >
          Comparing your activity from when you joined to now
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex flex-col gap-2">
              <div className="skeleton h-4 w-2/3 rounded" />
              <div className="skeleton h-[6px] w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {(data?.dimensions ?? []).map(dim => (
            <DimensionRow key={dim.key} dim={dim} animate={isVisible} />
          ))}
          {(!data || data.dimensions.length === 0) && (
            <p
              className="text-[13px]"
              style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}
            >
              Start contributing to see your growth here.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
