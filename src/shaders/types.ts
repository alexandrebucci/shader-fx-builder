export type ParamType = 'range' | 'color' | 'toggle' | 'select' | 'vec2'

export interface ParamDef {
  id: string
  label: string
  type: ParamType
  group?: string
  default: number | string | boolean | [number, number]
  min?: number
  max?: number
  step?: number
  options?: { value: string; label: string }[]
  unit?: string
  description?: string
  visibleIf?:
    | { param: string; value: number | string | boolean }
    | { param: string; minValue: number }
}

export interface Preset {
  id: string
  label: string
  values: Record<string, number | string | boolean | [number, number]>
}

export interface ShaderDef {
  id: string
  name: string
  category: 'background' | 'image-fx'
  tags: string[]
  thumbnail: string  // empty string for MVP — thumbnail generation is Phase 6
  description: string
  vertex: string
  fragment: string
  params: ParamDef[]
  presets: Preset[]
}
