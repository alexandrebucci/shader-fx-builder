import { useShaderStore } from '@/store/shaderStore'
import {
  SliderControl,
  ColorControl,
  ToggleControl,
  SelectControl,
  Vec2Control,
} from './controls'
import type { ParamDef } from '@/shaders/types'

function ParamRow({ param }: { param: ParamDef }) {
  const uniformValues = useShaderStore((s) => s.uniformValues)
  const setUniformValue = useShaderStore((s) => s.setUniformValue)

  const value = uniformValues[param.id]

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

  if (!activeShader) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-6 text-center">
        Select a shader to get started
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full px-4">
      {activeShader.params.map((param) => (
        <ParamRow key={param.id} param={param} />
      ))}
    </div>
  )
}
