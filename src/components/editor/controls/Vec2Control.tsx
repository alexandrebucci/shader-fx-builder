import { Slider } from '@/components/ui/slider'
import type { ParamDef } from '@/shaders/types'

interface Props {
  param: ParamDef
  value: [number, number]
  onChange: (value: [number, number]) => void
}

export function Vec2Control({ param, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">{param.label}</span>
      {(['X', 'Y'] as const).map((axis, i) => (
        <div key={axis} className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{axis}</span>
            <span className="font-mono">{value[i].toFixed(2)}</span>
          </div>
          <Slider
            min={param.min ?? 0}
            max={param.max ?? 1}
            step={param.step ?? 0.01}
            value={[value[i]]}
            onValueChange={([v]) => {
              const next: [number, number] = [...value] as [number, number]
              next[i] = v
              onChange(next)
            }}
          />
        </div>
      ))}
    </div>
  )
}
