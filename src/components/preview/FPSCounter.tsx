import { useUIStore } from '@/store/uiStore'

function fpsColor(fps: number): string {
  if (fps >= 55) return 'text-green-400'
  if (fps >= 30) return 'text-yellow-400'
  return 'text-red-400'
}

export function FPSCounter() {
  const fps = useUIStore((s) => s.fps)

  return (
    <div
      className={`absolute top-2 right-2 z-10 rounded px-2 py-0.5 bg-black/60 text-xs font-mono ${fpsColor(fps)}`}
      aria-label={`${fps} frames per second`}
    >
      {fps} FPS
    </div>
  )
}
