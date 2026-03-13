// store/projectStore.ts — Zustand: current project state

import { create } from 'zustand'
import { Project, ProjectMember, Section, ContributorshipLog, ChatMessage } from '../types'

interface ProjectState {
  // Current project
  currentProject: Project | null
  members: ProjectMember[]
  mySection: Section | null
  allSections: Section[]
  contributorshipLogs: ContributorshipLog[]
  groupChatMessages: ChatMessage[]

  // Loading states
  isLoadingProject: boolean
  isLoadingSection: boolean
  isSavingSection: boolean

  // Actions
  setCurrentProject: (project: Project) => void
  setMembers: (members: ProjectMember[]) => void
  setMySection: (section: Section | null) => void
  setAllSections: (sections: Section[]) => void
  setContributorshipLogs: (logs: ContributorshipLog[]) => void
  addChatMessage: (message: ChatMessage) => void
  setGroupChatMessages: (messages: ChatMessage[]) => void
  updateMySectionContent: (content: string, wordCount: number) => void
  setLoadingProject: (v: boolean) => void
  setLoadingSection: (v: boolean) => void
  setSavingSection: (v: boolean) => void
  reset: () => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  members: [],
  mySection: null,
  allSections: [],
  contributorshipLogs: [],
  groupChatMessages: [],
  isLoadingProject: false,
  isLoadingSection: false,
  isSavingSection: false,

  setCurrentProject: (project) => set({ currentProject: project }),
  setMembers: (members) => set({ members }),
  setMySection: (section) => set({ mySection: section }),
  setAllSections: (sections) => set({ allSections: sections }),
  setContributorshipLogs: (logs) => set({ contributorshipLogs: logs }),
  addChatMessage: (message) =>
    set((state) => ({ groupChatMessages: [...state.groupChatMessages, message] })),
  setGroupChatMessages: (messages) => set({ groupChatMessages: messages }),
  updateMySectionContent: (content, wordCount) =>
    set((state) => ({
      mySection: state.mySection
        ? { ...state.mySection, content, word_count: wordCount }
        : null,
    })),
  setLoadingProject: (v) => set({ isLoadingProject: v }),
  setLoadingSection: (v) => set({ isLoadingSection: v }),
  setSavingSection: (v) => set({ isSavingSection: v }),
  reset: () =>
    set({
      currentProject: null,
      members: [],
      mySection: null,
      allSections: [],
      contributorshipLogs: [],
      groupChatMessages: [],
    }),
}))
