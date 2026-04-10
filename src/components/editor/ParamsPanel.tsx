import { useShaderStore } from '@/store/shaderStore'
import {
  SliderControl,
  ColorControl,
  ToggleControl,
  SelectControl,
  Vec2Control,
  TextureControl,
} from './controls'
import type { ParamDef, ShaderDef } from '@/shaders/types'
import type { UniformValue } from '@/core/uniforms/types'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

function isVisible(
  param: ParamDef,
  uniformValues: Record<string, UniformValue>,
  activeShader: ShaderDef,
): boolean {
  if (!param.visibleIf) return true
  const { param: refId } = param.visibleIf
  const refParam = activeShader.params.find((p) => p.id === refId)
  const currentValue = uniformValues[refId] ?? refParam?.default

  if ('notNull' in param.visibleIf) {
    return currentValue !== null && currentValue !== undefined && currentValue !== ''
  }
  if ('value' in param.visibleIf) {
    return currentValue === param.visibleIf.value
  }
  return Number(currentValue) >= param.visibleIf.minValue
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
      case 'texture':
        return (
          <TextureControl
            param={param}
            value={value as string | null}
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

function groupParams(
  params: ParamDef[],
): { name: string; params: ParamDef[] }[] {
  const groups: { name: string; params: ParamDef[] }[] = []
  const groupIndex: Record<string, number> = {}

  for (const param of params) {
    const name = param.group ?? 'General'
    if (!(name in groupIndex)) {
      groupIndex[name] = groups.length
      groups.push({ name, params: [] })
    }
    groups[groupIndex[name]].params.push(param)
  }

  return groups
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

  const hasGroups = visibleParams.some((p) => p.group !== undefined)

  if (!hasGroups) {
    return (
      <div className="overflow-y-auto h-full px-4">
        {visibleParams.map((param) => (
          <ParamRow key={param.id} param={param} />
        ))}
      </div>
    )
  }

  const groups = groupParams(visibleParams)

  return (
    <div className="overflow-y-auto h-full">
      <Accordion
        type="multiple"
        defaultValue={groups.map((g) => g.name)}
        className="w-full"
      >
        {groups.map((group) => (
          <AccordionItem key={group.name} value={group.name}>
            <AccordionTrigger className="px-4 text-sm font-medium">
              {group.name}
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-0">
              {group.params.map((param) => (
                <ParamRow key={param.id} param={param} />
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
