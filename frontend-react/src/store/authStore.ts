import { create } from 'zustand'
import type { User } from '../types'

interface AuthStore {
  token: string | null
  user: User | null
  isMaster: boolean
  login: (token: string, user: User, isMaster?: boolean) => void
  logout: () => void
  isAuthenticated: () => boolean
  isAdmin: () => boolean
  isSystemAdmin: () => boolean
}

// Initialize from localStorage for page refreshes
function loadInitialState(): Pick<AuthStore, 'token' | 'user' | 'isMaster'> {
  const token = localStorage.getItem('grc_token')
  try {
    const userRaw = localStorage.getItem('grc_user')
    const user: User | null = userRaw ? (JSON.parse(userRaw) as User) : null
    return { token, user, isMaster: false }
  } catch {
    return { token: null, user: null, isMaster: false }
  }
}

const initial = loadInitialState()

export const useAuthStore = create<AuthStore>((set, get) => ({
  token: initial.token,
  user: initial.user,
  isMaster: initial.isMaster,

  login: (token, user, isMaster = false) => {
    localStorage.setItem('grc_token', token)
    localStorage.setItem('grc_user', JSON.stringify(user))
    set({ token, user, isMaster })
  },

  logout: () => {
    const isDemo = get().user?.isDemo
    localStorage.removeItem('grc_token')
    localStorage.removeItem('grc_user')
    set({ token: null, user: null, isMaster: false })
    window.location.href = isDemo ? '/landing' : '/login'
  },

  isAuthenticated: () => !!get().token,

  isAdmin: () => get().user?.role === 'admin',

  isSystemAdmin: () => !!localStorage.getItem('grc_system_token'),
}))
