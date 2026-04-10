import { create } from 'zustand'

type Theme = 'dark' | 'light'
type ActiveTab = 'params' | 'presets'

interface UploadedTexture {
  id: string
  label: string
  url: string
}

interface UIStore {
  theme: Theme
  activeTab: ActiveTab
  fps: number
  uploadedTextures: UploadedTexture[]
  toggleTheme: () => void
  setActiveTab: (tab: ActiveTab) => void
  setFps: (fps: number) => void
  addUploadedTexture: (label: string, objectUrl: string) => void
  removeUploadedTexture: (id: string) => void
}

export const useUIStore = create<UIStore>((set, get) => ({
  theme: 'dark',
  activeTab: 'params',
  fps: 0,
  uploadedTextures: [],
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    set({ theme: next })
    document.documentElement.classList.toggle('dark', next === 'dark')
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
  setFps: (fps) => set({ fps }),
  addUploadedTexture: (label, objectUrl) => {
    const id = crypto.randomUUID()
    set((state) => ({
      uploadedTextures: [...state.uploadedTextures, { id, label, url: objectUrl }],
    }))
  },
  removeUploadedTexture: (id) => {
    const { uploadedTextures } = get()
    const entry = uploadedTextures.find((t) => t.id === id)
    if (entry) URL.revokeObjectURL(entry.url)
    set({ uploadedTextures: uploadedTextures.filter((t) => t.id !== id) })
  },
}))
