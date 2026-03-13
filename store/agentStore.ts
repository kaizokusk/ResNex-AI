// store/agentStore.ts — Zustand store for the @agent panel state

import { create } from 'zustand'

export interface AgentPanelItem {
  id: string
  projectId: string
  userId: string
  action: string
  sourceMessage: string
  result: string
  context: any[]
  targetSection: string | null
  sharedToChat: boolean
  addedToLatex: boolean
  createdAt: string
}

interface AgentStore {
  isOpen: boolean
  items: AgentPanelItem[]
  pendingAction: { message: string; action: string } | null

  openPanel: () => void
  closePanel: () => void
  togglePanel: () => void

  setPendingAction: (action: { message: string; action: string } | null) => void

  setItems: (items: AgentPanelItem[]) => void
  addItem: (item: AgentPanelItem) => void
  updateItem: (id: string, updates: Partial<AgentPanelItem>) => void

  markAddedToLatex: (id: string) => void
  markSharedToChat: (id: string) => void
  setTargetSection: (id: string, section: string) => void
}

export const useAgentStore = create<AgentStore>((set) => ({
  isOpen: false,
  items: [],
  pendingAction: null,

  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),
  togglePanel: () => set((s) => ({ isOpen: !s.isOpen })),

  setPendingAction: (action) => set({ pendingAction: action }),

  setItems: (items) => set({ items }),
  addItem: (item) => set((s) => ({ items: [item, ...s.items] })),
  updateItem: (id, updates) =>
    set((s) => ({
      items: s.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    })),

  markAddedToLatex: (id) =>
    set((s) => ({
      items: s.items.map((item) => (item.id === id ? { ...item, addedToLatex: true } : item)),
    })),

  markSharedToChat: (id) =>
    set((s) => ({
      items: s.items.map((item) => (item.id === id ? { ...item, sharedToChat: true } : item)),
    })),

  setTargetSection: (id, section) =>
    set((s) => ({
      items: s.items.map((item) => (item.id === id ? { ...item, targetSection: section } : item)),
    })),
}))
