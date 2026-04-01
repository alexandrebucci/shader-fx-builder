import { useEffect, useRef } from 'react'
import { ShaderPlayer } from '@/core/player/ShaderPlayer'
import { useShaderStore } from '@/store/shaderStore'
import { useUIStore } from '@/store/uiStore'
import { FPSCounter } from './FPSCounter'
import { ErrorOverlay } from './ErrorOverlay'

export function PreviewCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<ShaderPlayer | null>(null)
  const initialized = useRef(false)  // StrictMode guard

  const activeShader = useShaderStore((s) => s.activeShader)
  const uniformValues = useShaderStore((s) => s.uniformValues)
  const setFps = useUIStore((s) => s.setFps)

  // Mount player once
  useEffect(() => {
    if (initialized.current || !canvasRef.current) return
    initialized.current = true
    const player = new ShaderPlayer()
    player.init(canvasRef.current, (fps) => setFps(fps))
    playerRef.current = player

    const container = containerRef.current
    const handleMouseMove = (e: MouseEvent) => {
      if (!container) return
      const rect = container.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = 1 - (e.clientY - rect.top) / rect.height
      playerRef.current?.setUniform('uMouse', [x, y])
    }
    container?.addEventListener('mousemove', handleMouseMove)

    return () => {
      container?.removeEventListener('mousemove', handleMouseMove)
      player.destroy()
      playerRef.current = null
      initialized.current = false
    }
  }, [])

  // Sync active shader
  useEffect(() => {
    if (!playerRef.current || !activeShader) return
    playerRef.current.setShader(activeShader.vertex, activeShader.fragment)
    playerRef.current.initUniforms(activeShader.params, activeShader.fragment)
  }, [activeShader])

  // Sync uniform values
  useEffect(() => {
    if (!playerRef.current) return
    Object.entries(uniformValues).forEach(([id, value]) => {
      playerRef.current!.setUniform(id, value)
    })
  }, [uniformValues])

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full pointer-events-none" />
      <FPSCounter />
      <ErrorOverlay />
    </div>
  )
}
