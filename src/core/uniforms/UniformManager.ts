import * as THREE from 'three'
import type { ParamDef } from '@/shaders/types'
import type { UniformValue } from './types'

type ThreeUniformMap = Record<string, { value: unknown }>

export class UniformManager {
  private uniforms: ThreeUniformMap = {}

  initFromParams(params: ParamDef[]): void {
    // Start fresh with auto-uniforms
    this.uniforms = {
      uTime:       { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uAspect:     { value: 1 },
      uMouse:      { value: new THREE.Vector2(0.5, 0.5) },
    }

    for (const param of params) {
      this.uniforms[param.id] = { value: this.toThreeValue(param) }
    }
  }

  setUniform(id: string, value: UniformValue): void {
    if (!(id in this.uniforms)) {
      this.uniforms[id] = { value: this.convertValue(value) }
      return
    }
    const current = this.uniforms[id].value
    if (current instanceof THREE.Color && typeof value === 'string') {
      current.set(value)
    } else if (current instanceof THREE.Vector2 && Array.isArray(value)) {
      current.set((value as [number, number])[0], (value as [number, number])[1])
    } else if (typeof value === 'string' && !value.startsWith('#')) {
      // Numeric string from select param
      const num = parseFloat(value)
      if (!isNaN(num)) {
        this.uniforms[id].value = num
        return
      }
      this.uniforms[id].value = value
    } else {
      this.uniforms[id].value = value
    }
  }

  getAll(): ThreeUniformMap {
    return this.uniforms
  }

  private toThreeValue(param: ParamDef): unknown {
    if (param.type === 'color') return new THREE.Color(param.default as string)
    if (param.type === 'vec2') {
      const v = param.default as [number, number]
      return new THREE.Vector2(v[0], v[1])
    }
    if (param.type === 'select') return parseFloat(param.default as string)
    return param.default
  }

  private convertValue(value: UniformValue): unknown {
    if (typeof value === 'string' && value.startsWith('#')) return new THREE.Color(value)
    if (Array.isArray(value)) return new THREE.Vector2(value[0], value[1])
    return value
  }
}
