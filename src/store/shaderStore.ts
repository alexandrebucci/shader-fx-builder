import { create } from 'zustand'
import type { ShaderDef, Preset } from '@/shaders/types'
import type { UniformValue } from '@/core/uniforms/types'
import type { CompilationError } from '@/core/player/ShaderCompiler'
import { SHADER_LIBRARY } from '@/shaders/library'

interface ShaderStore {
  shaders: ShaderDef[]
  activeShader: ShaderDef | null
  uniformValues: Record<string, UniformValue>
  compilationErrors: CompilationError[] | null
  presets: Preset[]
  setShader: (shader: ShaderDef) => void
  setUniformValue: (id: string, value: UniformValue) => void
  resetUniforms: () => void
  setCompilationErrors: (errors: CompilationError[] | null) => void
  savePreset: (label: string) => void
  loadPreset: (presetId: string) => void
}

export const useShaderStore = create<ShaderStore>((set, get) => ({
  shaders: SHADER_LIBRARY,
  activeShader: null,
  uniformValues: {},
  compilationErrors: null,
  presets: [],

  setShader: (shader) => {
    const defaults: Record<string, UniformValue> = {}
    shader.params.forEach((p) => { defaults[p.id] = p.default })
    set({
      activeShader: shader,
      uniformValues: defaults,
      compilationErrors: null,
      presets: shader.presets,
    })
  },

  setUniformValue: (id, value) =>
    set((state) => ({ uniformValues: { ...state.uniformValues, [id]: value } })),

  resetUniforms: () => {
    const { activeShader } = get()
    if (!activeShader) return
    const defaults: Record<string, UniformValue> = {}
    activeShader.params.forEach((p) => { defaults[p.id] = p.default })
    set({ uniformValues: defaults })
  },

  setCompilationErrors: (errors) => set({ compilationErrors: errors }),

  savePreset: (label) => {
    const { uniformValues, presets } = get()
    const newPreset: Preset = {
      id: `user-${Date.now()}`,
      label,
      values: { ...uniformValues },
    }
    const updated = [...presets, newPreset]
    set({ presets: updated })
    try {
      localStorage.setItem('shader-fx-presets', JSON.stringify(updated))
    } catch { /* ignore */ }
  },

  loadPreset: (presetId) => {
    const { presets } = get()
    const preset = presets.find((p) => p.id === presetId)
    if (!preset) return
    set({ uniformValues: { ...preset.values } })
  },
}))
