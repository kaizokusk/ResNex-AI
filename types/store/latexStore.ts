// store/latexStore.ts — Zustand store for the LaTeX IDE state

import { create } from 'zustand'

export interface LatexFile {
  id: string
  projectId: string
  fileName: string
  type: 'CODE' | 'IMAGE' | 'DATA'
  content: string | null
  fileUrl: string | null
  isMain: boolean
  createdAt: string
  updatedAt: string
}

interface LatexStore {
  // File tree
  files: LatexFile[]
  activeFileId: string | null

  // Editor — unsaved local drafts
  unsavedIds: Set<string>
  localContent: Record<string, string>

  // Compile
  compileStatus: 'idle' | 'compiling' | 'ready' | 'error'
  pdfUrl: string | null
  compileLogs: string | null
  showLogs: boolean

  // Actions
  setFiles: (files: LatexFile[]) => void
  upsertFile: (file: LatexFile) => void
  removeFile: (id: string) => void
  setActiveFile: (id: string | null) => void
  updateLocalContent: (id: string, content: string) => void
  markSaved: (id: string) => void
  setCompileStatus: (status: LatexStore['compileStatus'], pdfUrl?: string | null, logs?: string | null) => void
  toggleLogs: () => void
}

export const useLatexStore = create<LatexStore>((set) => ({
  files: [],
  activeFileId: null,
  unsavedIds: new Set(),
  localContent: {},
  compileStatus: 'idle',
  pdfUrl: null,
  compileLogs: null,
  showLogs: false,

  setFiles: (files) => set({ files }),

  upsertFile: (file) =>
    set((s) => {
      const exists = s.files.find((f) => f.id === file.id)
      return {
        files: exists
          ? s.files.map((f) => (f.id === file.id ? file : f))
          : [...s.files, file],
      }
    }),

  removeFile: (id) =>
    set((s) => ({
      files: s.files.filter((f) => f.id !== id),
      activeFileId: s.activeFileId === id ? null : s.activeFileId,
    })),

  setActiveFile: (id) => set({ activeFileId: id }),

  updateLocalContent: (id, content) =>
    set((s) => {
      const next = new Set(s.unsavedIds)
      next.add(id)
      return { localContent: { ...s.localContent, [id]: content }, unsavedIds: next }
    }),

  markSaved: (id) =>
    set((s) => {
      const next = new Set(s.unsavedIds)
      next.delete(id)
      return { unsavedIds: next }
    }),

  setCompileStatus: (status, pdfUrl, logs) =>
    set((s) => ({
      compileStatus: status,
      pdfUrl: pdfUrl !== undefined ? pdfUrl : s.pdfUrl,
      compileLogs: logs !== undefined ? logs : s.compileLogs,
    })),

  toggleLogs: () => set((s) => ({ showLogs: !s.showLogs })),
}))
