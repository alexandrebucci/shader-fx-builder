import { describe, it, expect } from 'vitest'
import { UniformManager } from '../UniformManager'
import { liquidNoise } from '@/shaders/library/backgrounds/liquid-noise'

describe('UniformManager', () => {
  it('initializes uniforms from ShaderDef params', () => {
    const mgr = new UniformManager()
    mgr.initFromParams(liquidNoise.params)
    const all = mgr.getAll()
    expect(all.uSpeed.value).toBe(0.4)
  })

  it('setUniform updates a float value', () => {
    const mgr = new UniformManager()
    mgr.initFromParams(liquidNoise.params)
    mgr.setUniform('uSpeed', 1.0)
    expect(mgr.getAll().uSpeed.value).toBe(1.0)
  })

  it('getAll includes auto-uniforms (uTime, uResolution, uMouse)', () => {
    const mgr = new UniformManager()
    mgr.initFromParams(liquidNoise.params)
    const all = mgr.getAll()
    expect('uTime' in all).toBe(true)
    expect('uResolution' in all).toBe(true)
    expect('uMouse' in all).toBe(true)
  })

  it('color param initializes as THREE.Color', () => {
    const mgr = new UniformManager()
    mgr.initFromParams(liquidNoise.params)
    const all = mgr.getAll()
    // uColor1 default is '#0a0a2e' — should be a THREE.Color instance
    expect(all.uColor1.value).toBeTruthy()
    expect(typeof (all.uColor1.value as any).r).toBe('number')
  })

  it('toggle param initializes as 1.0 when default is true', () => {
    const mgr = new UniformManager()
    mgr.initFromParams([
      { id: 'uPolar', label: 'Polar', type: 'toggle', default: false },
    ])
    expect(mgr.getAll().uPolar.value).toBe(0.0)
  })

  it('setUniform converts boolean true to 1.0', () => {
    const mgr = new UniformManager()
    mgr.initFromParams([
      { id: 'uPolar', label: 'Polar', type: 'toggle', default: false },
    ])
    mgr.setUniform('uPolar', true)
    expect(mgr.getAll().uPolar.value).toBe(1.0)
  })

  it('setUniform converts boolean false to 0.0', () => {
    const mgr = new UniformManager()
    mgr.initFromParams([
      { id: 'uPolar', label: 'Polar', type: 'toggle', default: false },
    ])
    mgr.setUniform('uPolar', false)
    expect(mgr.getAll().uPolar.value).toBe(0.0)
  })
})
