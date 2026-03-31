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

vec3 mod289v3(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec2 mod289v2(vec2 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289v3(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289v2(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * snoise(p); p *= 2.0; a *= 0.5;
  }
  return v;
}

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
