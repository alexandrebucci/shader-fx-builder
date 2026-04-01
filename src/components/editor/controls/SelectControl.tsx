import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ParamDef } from '@/shaders/types'

interface Props {
  param: ParamDef
  value: string
  onChange: (value: string) => void
}

export function SelectControl({ param, value, onChange }: Props) {
  const isModified = value !== param.default

  return (
    <div className="flex flex-col gap-1.5">
      <span className={`text-xs ${isModified ? 'text-foreground' : 'text-muted-foreground'}`}>{param.label}</span>
      <Select value={value} onValueChange={(v) => v !== null && onChange(v)}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(param.options ?? []).map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
