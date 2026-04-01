import type { ShaderDef } from '@/shaders/types'

const VERTEX = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}`

const FRAGMENT = /* glsl */`
uniform float uTime;
uniform vec2  uResolution;
uniform float uAspect;
uniform float uCount;
uniform float uSize;
uniform float uSpeed;
uniform vec3  uColor;
uniform vec3  uBackground;
uniform float uGlow;

varying vec2 vUv;

// #include <noise>

// Hash — deterministic pseudo-random float from a vec2 seed
float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}

void main() {
  // Correct for aspect ratio so circles are round, not ellipses
  vec2 uv = vUv;
  uv.x *= uAspect;

  // Scale UV into grid space: uCount cells per axis
  vec2 grid = uv * uCount;

  // Integer cell index and fractional position within the cell
  vec2 cell  = floor(grid);
  vec2 local = fract(grid);

  // Per-cell seed values
  float seedX = hash(cell);
  float seedY = hash(cell + vec2(7.3, 2.9));

  // Drift using snoise
  float t = uTime * uSpeed;
  float dx = snoise(vec2(cell.x * 0.37 + seedX * 6.28, t * 0.5 + seedY * 3.14)) * 0.35;
  float dy = snoise(vec2(cell.y * 0.37 + seedY * 6.28, t * 0.5 + seedX * 3.14)) * 0.35;

  // Place particle centre at (0.5, 0.5) + drift, clamped within cell
  vec2 center = vec2(0.5) + vec2(dx, dy) * (0.5 - uSize);

  // SDF circle distance
  float dist = length(local - center);

  // Smooth glow
  float glowWidth = uSize * uGlow / uCount;
  float alpha = 1.0 - smoothstep(uSize / uCount - glowWidth, uSize / uCount, dist);

  vec3 col = mix(uBackground, uColor, alpha);
  gl_FragColor = vec4(col, 1.0);
}`

export const particlesField: ShaderDef = {
  id: 'particles-field',
  name: 'Particles Field',
  category: 'background',
  tags: ['particles', 'dots', 'ambient', 'space', 'dark'],
  thumbnail: '',
  description: 'A field of small glowing dots drifting gently in space, rendered entirely in the fragment shader using a grid-based SDF approach.',
  vertex: VERTEX,
  fragment: FRAGMENT,
  params: [
    { id: 'uCount',      label: 'Count',           type: 'range', default: 12.0, min: 4,    max: 30,  step: 1    },
    { id: 'uSize',       label: 'Size',            type: 'range', default: 0.15, min: 0.05, max: 0.4, step: 0.01 },
    { id: 'uSpeed',      label: 'Speed',           type: 'range', default: 0.4,  min: 0,    max: 2,   step: 0.01 },
    { id: 'uColor',      label: 'Particle Color',  type: 'color', default: '#ffffff' },
    { id: 'uBackground', label: 'Background',      type: 'color', default: '#0a0a1a' },
    { id: 'uGlow',       label: 'Glow',            type: 'range', default: 2.0,  min: 1,    max: 5,   step: 0.1  },
  ],
  presets: [
    {
      id: 'starfield',
      label: 'Starfield',
      values: {
        uCount: 20.0, uSize: 0.08, uSpeed: 0.05,
        uColor: '#e8eeff', uBackground: '#000008', uGlow: 1.5,
      },
    },
    {
      id: 'fireflies',
      label: 'Fireflies',
      values: {
        uCount: 8.0, uSize: 0.28, uSpeed: 0.6,
        uColor: '#aaff44', uBackground: '#050d02', uGlow: 4.0,
      },
    },
  ],
}
