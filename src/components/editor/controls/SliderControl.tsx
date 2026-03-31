import { Slider } from '@/components/ui/slider'
import type { ParamDef } from '@/shaders/types'

interface Props {
  param: ParamDef
  value: number
  onChange: (value: number) => void
}

export function SliderControl({ param, value, onChange }: Props) {
  const isModified = value !== param.default

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center text-xs">
        <span className={isModified ? 'text-foreground' : 'text-muted-foreground'}>
          {param.label}
        </span>
        <span className="font-mono text-muted-foreground">
          {value.toFixed(2)}{param.unit ?? ''}
        </span>
      </div>
      <Slider
        min={param.min ?? 0}
        max={param.max ?? 1}
        step={param.step ?? 0.01}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  )
}
