// store/userStore.ts — Zustand: auth + user info

import { create } from 'zustand'
import { User } from '../types'

interface UserState {
  user: User | null
  isLoaded: boolean
  setUser: (user: User | null) => void
  setLoaded: (v: boolean) => void
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoaded: false,
  setUser: (user) => set({ user }),
  setLoaded: (v) => set({ isLoaded: v }),
}))
