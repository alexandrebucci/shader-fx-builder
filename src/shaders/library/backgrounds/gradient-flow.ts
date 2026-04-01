import type { ShaderDef } from '@/shaders/types'

const VERTEX = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}`

const FRAGMENT = /* glsl */`
uniform float uTime;
uniform float uAspect;
uniform float uSpeed;
uniform float uAngle;
uniform vec3  uColorA;
uniform vec3  uColorB;
uniform vec3  uColorC;
uniform float uContrast;

varying vec2 vUv;

// #include <color>

void main() {
  // Center UV in [-0.5, 0.5], correct for aspect ratio
  vec2 uv = vUv - 0.5;
  uv.x *= uAspect;

  // Build a unit direction vector from the angle parameter
  vec2 dir = vec2(cos(uAngle), sin(uAngle));

  // Project UV onto direction to get a scalar gradient position
  float grad = dot(uv, dir) * 1.42 + 0.5;

  // Animate the gradient position over time
  float t = grad + uTime * uSpeed * 0.1;

  // Build cosine palette coefficients from the three user colors
  vec3 a = (uColorA + uColorC) * 0.5;
  vec3 b = (uColorA - uColorC) * 0.5 * uContrast;
  vec3 c = vec3(1.0);
  vec3 d = uColorB;

  vec3 color = cosPalette(t, a, b, c, d);

  gl_FragColor = vec4(color, 1.0);
}`

export const gradientFlow: ShaderDef = {
  id: 'gradient-flow',
  name: 'Gradient Flow',
  category: 'background',
  tags: ['gradient', 'smooth', 'colorful', 'animated'],
  thumbnail: '',
  description: 'Smooth animated gradient that flows in a configurable direction using a cosine palette.',
  vertex: VERTEX,
  fragment: FRAGMENT,
  params: [
    { id: 'uSpeed',    label: 'Speed',    type: 'range', default: 0.3,  min: 0,   max: 2,    step: 0.01 },
    { id: 'uAngle',    label: 'Angle',    type: 'range', default: 0.0,  min: 0,   max: 6.28, step: 0.01 },
    { id: 'uColorA',   label: 'Color A',  type: 'color', default: '#ff6b6b' },
    { id: 'uColorB',   label: 'Color B',  type: 'color', default: '#4ecdc4' },
    { id: 'uColorC',   label: 'Color C',  type: 'color', default: '#45b7d1' },
    { id: 'uContrast', label: 'Contrast', type: 'range', default: 1.0,  min: 0.5, max: 2,    step: 0.05 },
  ],
  presets: [
    {
      id: 'sunset',
      label: 'Sunset',
      values: {
        uSpeed: 0.3, uAngle: 0.78,
        uColorA: '#ff6b6b', uColorB: '#feca57', uColorC: '#ff9ff3',
        uContrast: 1.2,
      },
    },
    {
      id: 'ocean',
      label: 'Ocean',
      values: {
        uSpeed: 0.2, uAngle: 1.57,
        uColorA: '#0a3d62', uColorB: '#38ada9', uColorC: '#60a3bc',
        uContrast: 1.0,
      },
    },
  ],
}
