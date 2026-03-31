import { useEffect, useRef } from 'react'
import { useShaderStore } from '@/store/shaderStore'
import { ShaderPlayer } from '@/core/player/ShaderPlayer'

export function PreviewCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playerRef = useRef<ShaderPlayer | null>(null)
  const initialized = useRef(false)

  const activeShader = useShaderStore((s) => s.activeShader)
  const uniformValues = useShaderStore((s) => s.uniformValues)

  useEffect(() => {
    if (!canvasRef.current || initialized.current) return
    initialized.current = true
    const player = new ShaderPlayer()
    playerRef.current = player
    player.init(canvasRef.current)
    return () => {
      player.destroy()
      playerRef.current = null
      initialized.current = false
    }
  }, [])

  useEffect(() => {
    if (!playerRef.current || !activeShader) return
    playerRef.current.setShader(activeShader.vertex, activeShader.fragment)
  }, [activeShader])

  useEffect(() => {
    if (!playerRef.current) return
    Object.entries(uniformValues).forEach(([id, value]) => {
      playerRef.current!.setUniform(id, value)
    })
  }, [uniformValues])

  return <canvas ref={canvasRef} className="w-full h-full block" />
}
