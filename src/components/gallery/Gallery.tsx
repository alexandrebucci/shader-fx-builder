import { useShaderStore } from '@/store/shaderStore'
import { SHADER_LIBRARY } from '@/shaders/library'
import { ShaderCard } from './ShaderCard'

export function Gallery() {
  const setShader = useShaderStore((s) => s.setShader)
  const activeId = useShaderStore((s) => s.activeShader?.id)

  const backgrounds = SHADER_LIBRARY.filter((s) => s.category === 'background')
  const imageFx = SHADER_LIBRARY.filter((s) => s.category === 'image-fx')

  return (
    <div className="flex flex-col gap-3 p-2">
      {backgrounds.length > 0 && (
        <section>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-1">
            Backgrounds
          </p>
          <div className="flex flex-col gap-0.5">
            {backgrounds.map((shader) => (
              <ShaderCard
                key={shader.id}
                shader={shader}
                isActive={shader.id === activeId}
                onClick={() => setShader(shader)}
              />
            ))}
          </div>
        </section>
      )}

      {imageFx.length > 0 && (
        <section>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-1">
            Image FX
          </p>
          <div className="flex flex-col gap-0.5">
            {imageFx.map((shader) => (
              <ShaderCard
                key={shader.id}
                shader={shader}
                isActive={shader.id === activeId}
                onClick={() => setShader(shader)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
