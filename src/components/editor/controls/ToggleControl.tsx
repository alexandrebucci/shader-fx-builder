import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import type { ParamDef } from '@/shaders/types'

interface Props {
  param: ParamDef
  value: boolean
  onChange: (value: boolean) => void
}

export function ToggleControl({ param, value, onChange }: Props) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-xs text-muted-foreground">{param.label}</Label>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  )
}
