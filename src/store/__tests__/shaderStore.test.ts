import { describe, it, expect, beforeEach } from 'vitest'
import { useShaderStore } from '../shaderStore'
import { liquidNoise } from '@/shaders/library/backgrounds/liquid-noise'

beforeEach(() => {
  useShaderStore.setState({
    activeShader: null,
    uniformValues: {},
    compilationErrors: null,
    presets: [],
  })
})

describe('shaderStore', () => {
  it('setShader loads defaults into uniformValues', () => {
    useShaderStore.getState().setShader(liquidNoise)
    const { uniformValues, activeShader } = useShaderStore.getState()
    expect(activeShader?.id).toBe('liquid-noise')
    expect(uniformValues.uSpeed).toBe(0.4)
    expect(uniformValues.uColor1).toBe('#0a0a2e')
  })

  it('setUniformValue updates a single value', () => {
    useShaderStore.getState().setShader(liquidNoise)
    useShaderStore.getState().setUniformValue('uSpeed', 1.5)
    expect(useShaderStore.getState().uniformValues.uSpeed).toBe(1.5)
  })

  it('resetUniforms restores defaults', () => {
    useShaderStore.getState().setShader(liquidNoise)
    useShaderStore.getState().setUniformValue('uSpeed', 1.5)
    useShaderStore.getState().resetUniforms()
    expect(useShaderStore.getState().uniformValues.uSpeed).toBe(0.4)
  })
})
