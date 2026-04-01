import { useShaderStore } from '@/store/shaderStore'
import {
  SliderControl,
  ColorControl,
  ToggleControl,
  SelectControl,
  Vec2Control,
} from './controls'
import type { ParamDef, ShaderDef } from '@/shaders/types'
import type { UniformValue } from '@/core/uniforms/types'

function isVisible(
  param: ParamDef,
  uniformValues: Record<string, UniformValue>,
  activeShader: ShaderDef,
): boolean {
  if (!param.visibleIf) return true
  const { param: refId } = param.visibleIf
  const refParam = activeShader.params.find((p) => p.id === refId)
  const currentValue = uniformValues[refId] ?? refParam?.default

  if ('value' in param.visibleIf) {
    return currentValue === param.visibleIf.value
  } else {
    return Number(currentValue) >= param.visibleIf.minValue
  }
}

function ParamRow({ param }: { param: ParamDef }) {
  const value = useShaderStore((s) => s.uniformValues[param.id] ?? param.default)
  const setUniformValue = useShaderStore((s) => s.setUniformValue)

  const control = (() => {
    switch (param.type) {
      case 'range':
        return (
          <SliderControl
            param={param}
            value={value as number}
            onChange={(v) => setUniformValue(param.id, v)}
          />
        )
      case 'color':
        return (
          <ColorControl
            param={param}
            value={value as string}
            onChange={(v) => setUniformValue(param.id, v)}
          />
        )
      case 'toggle':
        return (
          <ToggleControl
            param={param}
            value={value as boolean}
            onChange={(v) => setUniformValue(param.id, v)}
          />
        )
      case 'select':
        return (
          <SelectControl
            param={param}
            value={value as string}
            onChange={(v) => setUniformValue(param.id, v)}
          />
        )
      case 'vec2':
        return (
          <Vec2Control
            param={param}
            value={value as [number, number]}
            onChange={(v) => setUniformValue(param.id, v)}
          />
        )
      default:
        return null
    }
  })()

  return (
    <div className="py-3 border-b border-border last:border-b-0">
      {param.description ? (
        <div title={param.description}>{control}</div>
      ) : (
        control
      )}
    </div>
  )
}

export function ParamsPanel() {
  const activeShader = useShaderStore((s) => s.activeShader)
  const uniformValues = useShaderStore((s) => s.uniformValues)

  if (!activeShader) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-6 text-center">
        Select a shader to get started
      </div>
    )
  }

  const visibleParams = activeShader.params.filter((p) =>
    isVisible(p, uniformValues, activeShader),
  )

  return (
    <div className="overflow-y-auto h-full px-4">
      {visibleParams.map((param) => (
        <ParamRow key={param.id} param={param} />
      ))}
    </div>
  )
}
