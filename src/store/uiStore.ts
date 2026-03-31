import { create } from 'zustand'

type Theme = 'dark' | 'light'
type ActiveTab = 'params' | 'presets'

interface UIStore {
  theme: Theme
  activeTab: ActiveTab
  fps: number
  toggleTheme: () => void
  setActiveTab: (tab: ActiveTab) => void
  setFps: (fps: number) => void
}

export const useUIStore = create<UIStore>((set, get) => ({
  theme: 'dark',
  activeTab: 'params',
  fps: 0,
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    set({ theme: next })
    document.documentElement.classList.toggle('dark', next === 'dark')
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
  setFps: (fps) => set({ fps }),
}))
