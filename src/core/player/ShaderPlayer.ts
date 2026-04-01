import * as THREE from 'three'
import type { ParamDef } from '@/shaders/types'
import type { UniformValue } from '../uniforms/types'
import { UniformManager } from '../uniforms/UniformManager'
import { ShaderCompiler } from './ShaderCompiler'
import { SNIPPETS } from '@/shaders/snippets'

const DEFAULT_VERTEX = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}`

const DEFAULT_FRAGMENT = /* glsl */`
uniform float uTime;
varying vec2 vUv;
void main() {
  gl_FragColor = vec4(vUv, sin(uTime) * 0.5 + 0.5, 1.0);
}`

export class ShaderPlayer {
  private renderer: THREE.WebGLRenderer | null = null
  private scene = new THREE.Scene()
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private material: THREE.ShaderMaterial | null = null
  private geometry: THREE.BufferGeometry | null = null
  private rafId: number | null = null
  private startTime = 0
  private resizeObserver: ResizeObserver | null = null
  private uniformManager = new UniformManager()
  private onFps?: (fps: number) => void
  private frameCount = 0
  private lastFpsTime = 0

  init(canvas: HTMLCanvasElement, onFps?: (fps: number) => void): void {
    this.onFps = onFps
    this.uniformManager.initFromParams([])  // seed auto-uniforms before first tick

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.geometry = new THREE.PlaneGeometry(2, 2)
    this.material = new THREE.ShaderMaterial({
      vertexShader: DEFAULT_VERTEX,
      fragmentShader: DEFAULT_FRAGMENT,
      uniforms: this.uniformManager.getAll() as Record<string, THREE.IUniform>,
    })

    const mesh = new THREE.Mesh(this.geometry, this.material)
    this.scene.add(mesh)

    this.setupResize(canvas)
    this.handleResize(canvas)
    this.startTime = performance.now()
    this.lastFpsTime = performance.now()
    this.tick()
  }

  private tick = (): void => {
    this.rafId = requestAnimationFrame(this.tick)
    if (!this.renderer || !this.material) return

    const now = performance.now()
    this.material.uniforms.uTime.value = (now - this.startTime) / 1000

    this.frameCount++
    if (now - this.lastFpsTime >= 1000) {
      this.onFps?.(this.frameCount)
      this.frameCount = 0
      this.lastFpsTime = now
    }

    try {
      this.renderer.render(this.scene, this.camera)
    } catch {
      // Shader runtime error — silently skip frame
    }
  }

  private setupResize(canvas: HTMLCanvasElement): void {
    this.resizeObserver = new ResizeObserver(() => this.handleResize(canvas))
    this.resizeObserver.observe(canvas.parentElement ?? canvas)
  }

  private handleResize(canvas: HTMLCanvasElement): void {
    if (!this.renderer) return
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (w === 0 || h === 0) return
    this.renderer.setSize(w, h, false)
    const uniforms = this.material?.uniforms
    if (uniforms) {
      ;(uniforms.uResolution.value as THREE.Vector2).set(w, h)
      uniforms.uAspect.value = w / h
    }
  }

  setShader(vertex: string, fragment: string): void {
    if (!this.material) return
    this.material.vertexShader = ShaderCompiler.resolveIncludes(vertex, SNIPPETS)
    this.material.fragmentShader = ShaderCompiler.resolveIncludes(fragment, SNIPPETS)
    this.material.needsUpdate = true
  }

  initUniforms(params: ParamDef[], fragment?: string): void {
    this.uniformManager.initFromParams(params)

    // Inject placeholder texture for image-fx shaders
    if (fragment?.includes('uTexture')) {
      this.uniformManager.getAll()['uTexture'] = { value: ShaderPlayer.createPlaceholderTexture() }
    }

    if (this.material) {
      this.material.uniforms = this.uniformManager.getAll() as Record<string, THREE.IUniform>
      this.material.needsUpdate = true
    }
  }

  setUniform(id: string, value: UniformValue): void {
    this.uniformManager.setUniform(id, value)
  }

  static createPlaceholderTexture(): THREE.DataTexture {
    const size = 256
    const data = new Uint8Array(size * size * 4)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4
        data[i]     = Math.floor((x / size) * 200 + 55)
        data[i + 1] = Math.floor((y / size) * 150 + 50)
        data[i + 2] = Math.floor(((x + y) / (size * 2)) * 180 + 75)
        data[i + 3] = 255
      }
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
    tex.needsUpdate = true
    return tex
  }

  destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
    this.resizeObserver?.disconnect()
    this.geometry?.dispose()
    this.material?.dispose()
    this.renderer?.dispose()
    this.renderer = null
    this.material = null
    this.geometry = null
    this.rafId = null
  }
}
