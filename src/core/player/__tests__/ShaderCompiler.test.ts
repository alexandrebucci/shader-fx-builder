import { describe, it, expect } from 'vitest'
import { ShaderCompiler } from '../ShaderCompiler'

describe('ShaderCompiler.resolveIncludes', () => {
  it('replaces // #include <name> with snippet content', () => {
    const result = ShaderCompiler.resolveIncludes(
      '// #include <math>\nvoid main() {}',
      { math: 'float PI = 3.14;' }
    )
    expect(result).toContain('float PI = 3.14;')
    expect(result).not.toContain('// #include <math>')
  })

  it('leaves source unchanged when no includes', () => {
    const src = 'void main() {}'
    expect(ShaderCompiler.resolveIncludes(src, {})).toBe(src)
  })
})

describe('ShaderCompiler.parseErrors', () => {
  it('parses Three.js GLSL error format', () => {
    const raw = 'THREE.WebGLProgram: shader error\n\nERROR: 0:12: \'vec5\' : undeclared identifier\n'
    const errors = ShaderCompiler.parseErrors(raw)
    expect(errors).toHaveLength(1)
    expect(errors[0].line).toBe(12)
    expect(errors[0].message).toContain('vec5')
    expect(errors[0].type).toBe('error')
  })

  it('returns empty array for empty string', () => {
    expect(ShaderCompiler.parseErrors('')).toHaveLength(0)
  })
})
