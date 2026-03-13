'use client'
// components/belonging/MilestoneQueue.tsx
// Feature 4 — Milestone Moment Toasts
// Manages the queue of pending milestone toasts.
// Shows one MilestoneMoment at a time with an 800ms gap between appearances.
// Suppressed on the /latex route.

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useMilestoneStore } from '../../store/milestoneStore'
import { MilestoneMoment } from './MilestoneMoment'

interface MilestoneQueueProps {
  projectId: string
}

export function MilestoneQueue({ projectId }: MilestoneQueueProps) {
  const pathname = usePathname()
  const { queue, markShown, setAchieved } = useMilestoneStore()
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [currentMilestone, ...rest] = queue

  // Suppress entirely on the LaTeX editor route
  const isLatexPage = pathname?.includes('/latex')

  // Load already-achieved milestones on project load + check STREAK_3
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`/api/projects/${projectId}/milestones/me`)
        if (res.ok) {
          const achieved: string[] = await res.json()
          setAchieved(achieved)
        }
      } catch {
        // Non-critical: fail silently
      }

      // Always check streak on page load
      try {
        const res = await fetch(`/api/projects/${projectId}/milestones/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trigger: 'STREAK_CHECK' }),
        })
        if (res.ok) {
          const { newMilestones } = await res.json()
          const { addToQueue, achieved } = useMilestoneStore.getState()
          for (const m of newMilestones) {
            if (!achieved.includes(m)) addToQueue(m)
          }
        }
      } catch {
        // Non-critical
      }
    }
    init()
  }, [projectId, setAchieved])

  function handleDismiss() {
    if (!currentMilestone) return
    markShown(currentMilestone)
    // 800ms gap before showing the next one
    if (rest.length > 0) {
      gapTimerRef.current = setTimeout(() => {}, 800)
    }
  }

  // Cleanup gap timer on unmount
  useEffect(() => {
    return () => {
      if (gapTimerRef.current) clearTimeout(gapTimerRef.current)
    }
  }, [])

  if (isLatexPage || !currentMilestone) return null

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
      <div className="pointer-events-auto">
        <MilestoneMoment
          key={currentMilestone}
          milestone={currentMilestone}
          onDismiss={handleDismiss}
        />
      </div>
    </div>
  )
}
