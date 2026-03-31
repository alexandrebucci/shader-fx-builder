import * as THREE from 'three'

export const AUTO_UNIFORMS: Record<string, { value: unknown }> = {
  uTime:       { value: 0 },
  uResolution: { value: new THREE.Vector2(1, 1) },
  uAspect:     { value: 1 },
  uMouse:      { value: new THREE.Vector2(0.5, 0.5) },
}
