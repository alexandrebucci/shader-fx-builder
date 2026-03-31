import * as THREE from 'three'
import type { UniformValue } from '../uniforms/types'

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

  init(canvas: HTMLCanvasElement): void {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)

    this.material = new THREE.ShaderMaterial({
      vertexShader: DEFAULT_VERTEX,
      fragmentShader: DEFAULT_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(canvas.clientWidth, canvas.clientHeight) },
        uAspect: { value: canvas.clientWidth / canvas.clientHeight },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      },
    })

    this.geometry = new THREE.PlaneGeometry(2, 2)
    const mesh = new THREE.Mesh(this.geometry, this.material)
    this.scene.add(mesh)

    this.startTime = performance.now()
    this.tick()
  }

  private tick = (): void => {
    this.rafId = requestAnimationFrame(this.tick)
    if (!this.renderer || !this.material) return
    this.material.uniforms.uTime.value = (performance.now() - this.startTime) / 1000
    this.renderer.render(this.scene, this.camera)
  }

  setShader(vertex: string, fragment: string): void {
    if (!this.material) return
    this.material.vertexShader = vertex
    this.material.fragmentShader = fragment
    this.material.needsUpdate = true
  }

  setUniform(id: string, value: UniformValue): void {
    if (!this.material) return
    if (!(id in this.material.uniforms)) {
      this.material.uniforms[id] = { value: this.toThreeValue(id, value) }
    } else {
      const current = this.material.uniforms[id].value
      if (current instanceof THREE.Vector2 && Array.isArray(value)) {
        current.set((value as [number, number])[0], (value as [number, number])[1])
      } else if (current instanceof THREE.Color && typeof value === 'string') {
        current.set(value)
      } else {
        this.material.uniforms[id].value = value
      }
    }
  }

  private toThreeValue(id: string, value: UniformValue): unknown {
    if (typeof value === 'string' && value.startsWith('#')) return new THREE.Color(value)
    if (Array.isArray(value) && value.length === 2) return new THREE.Vector2(value[0], value[1])
    return value
  }

  destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
    this.geometry?.dispose()
    this.material?.dispose()
    this.renderer?.dispose()
    this.renderer = null
    this.material = null
    this.geometry = null
    this.rafId = null
  }
}
