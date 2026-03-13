// lib/hooks/useMilestoneCheck.ts
// Feature 4 — Milestone Moment Toasts
// Call after any ContributionEvent-generating action to check for newly unlocked milestones.

import { useCallback } from 'react'
import { useMilestoneStore } from '../../store/milestoneStore'

type ContributionTrigger =
  | 'CHAT_MESSAGE'
  | 'PAPER_ADDED'
  | 'LIBRARY_UPLOAD'
  | 'SECTION_EDIT'
  | 'COMMENT_LEFT'
  | 'SECTION_SUBMIT'
  | 'STREAK_CHECK'

export function useMilestoneCheck(projectId: string) {
  const { addToQueue, achieved } = useMilestoneStore()

  const checkMilestone = useCallback(
    async (trigger: ContributionTrigger) => {
      try {
        const res = await fetch(`/api/projects/${projectId}/milestones/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trigger }),
        })
        if (!res.ok) return
        const { newMilestones }: { newMilestones: string[] } = await res.json()
        for (const m of newMilestones) {
          if (!achieved.includes(m)) {
            addToQueue(m as Parameters<typeof addToQueue>[0])
          }
        }
      } catch {
        // Non-critical — milestone checks are fire-and-forget
      }
    },
    [projectId, addToQueue, achieved]
  )

  return { checkMilestone }
}
