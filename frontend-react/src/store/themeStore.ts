import { create } from 'zustand'

type Theme = 'light' | 'dark'

interface ThemeStore {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
}

const savedTheme = (localStorage.getItem('grc_theme') as Theme | null) ?? 'light'
applyTheme(savedTheme)

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: savedTheme,

  setTheme: (theme) => {
    localStorage.setItem('grc_theme', theme)
    applyTheme(theme)
    set({ theme })
  },

  toggle: () => {
    const next: Theme = get().theme === 'light' ? 'dark' : 'light'
    get().setTheme(next)
  },
}))
