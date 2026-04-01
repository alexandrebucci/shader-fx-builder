import type { ShaderDef } from '@/shaders/types'

const VERTEX = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}`

const FRAGMENT = /* glsl */`
uniform float uTime;
uniform vec2 uResolution;
uniform float uAspect;
uniform float uSpeed;
uniform float uScale;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uDistortion;

varying vec2 vUv;

// #include <noise>

void main() {
  vec2 uv = vUv;
  uv.x *= uAspect;
  float t = uTime * uSpeed;
  vec2 p = uv * uScale;
  float n1 = fbm(p + vec2(t * 0.3, t * 0.1));
  float n2 = fbm(p + vec2(n1 * uDistortion, t * 0.2));
  float f = smoothstep(0.0, 1.0, fbm(p + n2 * uDistortion + vec2(t * 0.1)) * 0.5 + 0.5);
  gl_FragColor = vec4(mix(uColorA, uColorB, f), 1.0);
}`

export const liquidNoise: ShaderDef = {
  id: 'liquid-noise',
  name: 'Liquid Noise',
  category: 'background',
  tags: ['organic', 'fluid', 'dark'],
  thumbnail: '',
  description: 'Organic fluid noise using Fractal Brownian Motion',
  vertex: VERTEX,
  fragment: FRAGMENT,
  params: [
    { id: 'uSpeed',      label: 'Speed',       type: 'range', default: 0.4,  min: 0,   max: 2,   step: 0.01 },
    { id: 'uScale',      label: 'Scale',       type: 'range', default: 2.0,  min: 0.5, max: 6,   step: 0.1  },
    { id: 'uColorA',     label: 'Color A',     type: 'color', default: '#0a0a2e' },
    { id: 'uColorB',     label: 'Color B',     type: 'color', default: '#6b21a8' },
    { id: 'uDistortion', label: 'Distortion',  type: 'range', default: 1.2,  min: 0,   max: 3,   step: 0.05 },
  ],
  presets: [
    {
      id: 'ocean',
      label: 'Ocean',
      values: { uSpeed: 0.3, uScale: 2.5, uColorA: '#001a33', uColorB: '#0066cc', uDistortion: 1.5 },
    },
    {
      id: 'lava',
      label: 'Lava',
      values: { uSpeed: 0.6, uScale: 3.0, uColorA: '#1a0000', uColorB: '#ff4400', uDistortion: 2.0 },
    },
  ],
}
