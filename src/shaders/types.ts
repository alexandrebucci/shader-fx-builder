export type ParamType = 'range' | 'color' | 'toggle' | 'select' | 'vec2' | 'texture'

export interface TextureAsset {
  id: string
  label: string
  url: string
}

export interface ParamDef {
  id: string
  label: string
  type: ParamType
  group?: string
  default: number | string | boolean | [number, number] | null
  min?: number
  max?: number
  step?: number
  options?: { value: string; label: string }[]
  unit?: string
  description?: string
  assets?: TextureAsset[]
  visibleIf?:
    | { param: string; value: number | string | boolean }
    | { param: string; minValue: number }
    | { param: string; notNull: true }
}

export interface Preset {
  id: string
  label: string
  values: Record<string, number | string | boolean | [number, number] | null>
}

export interface ShaderDef {
  id: string
  name: string
  category: 'background' | 'image-fx'
  tags: string[]
  thumbnail: string
  description: string
  vertex: string
  fragment: string
  params: ParamDef[]
  presets: Preset[]
}
