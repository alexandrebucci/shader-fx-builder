import { useShaderStore } from '@/store/shaderStore'

export function ErrorOverlay() {
  const compilationErrors = useShaderStore((s) => s.compilationErrors)

  if (!compilationErrors || compilationErrors.length === 0) return null

  return (
    <div className="absolute inset-0 z-20 bg-black/70 overflow-auto p-4 flex flex-col gap-2">
      <p className="text-orange-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
        Shader compilation errors
      </p>
      {compilationErrors.map((err, i) => (
        <div key={i} className="text-red-400 text-xs font-mono leading-relaxed">
          {err.line != null ? (
            <span>
              <span className="text-orange-400">Line {err.line}:</span> {err.message}
            </span>
          ) : (
            <span>{err.message}</span>
          )}
        </div>
      ))}
    </div>
  )
}
