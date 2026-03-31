import { useEffect } from 'react'
import { PreviewCanvas } from '@/components/preview/PreviewCanvas'
import { SliderControl } from '@/components/editor/controls/SliderControl'
import { useShaderStore } from '@/store/shaderStore'
import { liquidNoise } from '@/shaders/library/backgrounds/liquid-noise'

export function BuilderPage() {
  const { activeShader, uniformValues, setUniformValue, setShader } = useShaderStore()

  useEffect(() => {
    setShader(liquidNoise)
  }, [setShader])

  const rangeParams = activeShader?.params.filter((p) => p.type === 'range') ?? []

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Canvas */}
      <div className="flex-1 relative">
        <PreviewCanvas />
      </div>

      {/* Params */}
      <div className="w-72 border-l border-border p-4 flex flex-col gap-4 overflow-y-auto">
        <h2 className="text-sm font-semibold">{activeShader?.name}</h2>
        {rangeParams.map((param) => (
          <SliderControl
            key={param.id}
            param={param}
            value={uniformValues[param.id] as number ?? param.default as number}
            onChange={(v) => setUniformValue(param.id, v)}
          />
        ))}
      </div>
    </div>
  )
}
