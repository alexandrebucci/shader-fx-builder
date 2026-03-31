export type UniformType = 'float' | 'vec2' | 'vec3' | 'int' | 'bool'

export type UniformValue = number | string | boolean | [number, number]

export interface UniformDef {
  id: string
  type: UniformType
}
