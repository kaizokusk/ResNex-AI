// store/milestoneStore.ts
// Feature 4 — Milestone Moment Toasts

import { create } from 'zustand'

export type MilestoneType =
  | 'FIRST_MESSAGE'
  | 'FIRST_PAPER'
  | 'FIRST_SECTION_EDIT'
  | 'FIRST_COMMENT'
  | 'FIRST_SUBMISSION'
  | 'PAPERS_5'
  | 'COMMENTS_10'
  | 'STREAK_3'

interface MilestoneStore {
  achieved: string[]               // loaded from GET /milestones/me on project load
  queue: MilestoneType[]           // pending toasts to display
  setAchieved: (list: string[]) => void
  addToQueue: (m: MilestoneType) => void
  markShown: (m: MilestoneType) => void
}

export const useMilestoneStore = create<MilestoneStore>((set) => ({
  achieved: [],
  queue: [],

  setAchieved: (list) => set({ achieved: list }),

  addToQueue: (m) =>
    set((state) => {
      // Don't add if already achieved or already queued
      if (state.achieved.includes(m) || state.queue.includes(m)) return state
      return { queue: [...state.queue, m] }
    }),

  markShown: (m) =>
    set((state) => ({
      queue: state.queue.filter((x) => x !== m),
      achieved: state.achieved.includes(m) ? state.achieved : [...state.achieved, m],
    })),
}))
