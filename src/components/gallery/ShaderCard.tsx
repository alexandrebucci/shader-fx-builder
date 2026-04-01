import { Badge } from '@/components/ui/badge'
import type { ShaderDef } from '@/shaders/types'

interface Props {
  shader: ShaderDef
  isActive: boolean
  onClick: () => void
}

export function ShaderCard({ shader, isActive, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full text-left px-2 py-2 rounded-md transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-1 mb-0.5">
        <span className="text-xs font-medium truncate">{shader.name}</span>
        <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
          {shader.category === 'background' ? 'BG' : 'FX'}
        </Badge>
      </div>
      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
        {shader.description}
      </p>
    </button>
  )
}
