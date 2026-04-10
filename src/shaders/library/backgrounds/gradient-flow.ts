import type { ShaderDef } from '@/shaders/types'
import cloudUrl from '@/assets/displacement/cloud.png'
import marbleUrl from '@/assets/displacement/marble.png'
import voronoiUrl from '@/assets/displacement/voronoi.png'

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
uniform sampler2D uDisplacementMap;
uniform float uDisplacementStrength;
uniform float uDisplacementScale;
uniform float uDisplacementSpeed;
uniform float uScale;
uniform float uFrequency;
uniform vec2  uOffset;
uniform float uGrain;
uniform float uVignette;

varying vec2 vUv;

// #include <color>

void main() {
  // Sample displacement map (black DataTexture when none selected → disp = 0)
  vec2 dispUv = vUv * uDisplacementScale + uTime * uDisplacementSpeed * 0.05;
  float disp = texture2D(uDisplacementMap, dispUv).r;

  // Build UV with scale, aspect correction, offset, displacement
  vec2 uv = vUv - 0.5;
  uv.x *= uAspect;
  uv += uOffset;
  uv *= uScale;
  uv += (disp - 0.5) * uDisplacementStrength;

  // Project onto gradient direction
  vec2 dir = vec2(cos(uAngle), sin(uAngle));
  float grad = dot(uv, dir) * 1.42 + 0.5;
  float t = (grad + uTime * uSpeed * 0.1) * uFrequency;

  // Cosine palette
  vec3 a = (uColorA + uColorC) * 0.5;
  vec3 b = (uColorA - uColorC) * 0.5 * uContrast;
  vec3 c = vec3(1.0);
  vec3 d = uColorB;
  vec3 color = cosPalette(t, a, b, c, d);

  // Grain
  float grain = fract(sin(dot(vUv + fract(uTime * 0.1), vec2(127.1, 311.7))) * 43758.5453);
  color += (grain - 0.5) * uGrain;

  // Vignette
  float dist = length(vUv - 0.5) * 2.0;
  color *= 1.0 - uVignette * dist * dist;

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
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
    // Animation
    { id: 'uSpeed', label: 'Speed', type: 'range', group: 'Animation', default: 0.3, min: 0, max: 2, step: 0.01 },
    // Shape
    { id: 'uAngle',     label: 'Angle',     type: 'range', group: 'Shape', default: 0.0,  min: 0,   max: 6.28, step: 0.01 },
    { id: 'uScale',     label: 'Scale',     type: 'range', group: 'Shape', default: 1.0,  min: 0.1, max: 4,    step: 0.05 },
    { id: 'uFrequency', label: 'Frequency', type: 'range', group: 'Shape', default: 1.0,  min: 0.5, max: 4,    step: 0.05 },
    { id: 'uOffset',    label: 'Offset',    type: 'vec2',  group: 'Shape', default: [0, 0], min: -1, max: 1, step: 0.01 },
    // Colors
    { id: 'uColorA',   label: 'Color A',  type: 'color', group: 'Colors', default: '#ff6b6b' },
    { id: 'uColorB',   label: 'Color B',  type: 'color', group: 'Colors', default: '#4ecdc4' },
    { id: 'uColorC',   label: 'Color C',  type: 'color', group: 'Colors', default: '#45b7d1' },
    { id: 'uContrast', label: 'Contrast', type: 'range', group: 'Colors', default: 1.0, min: 0.5, max: 2, step: 0.05 },
    // Style
    { id: 'uGrain',    label: 'Grain',    type: 'range', group: 'Style', default: 0, min: 0, max: 0.3,  step: 0.005 },
    { id: 'uVignette', label: 'Vignette', type: 'range', group: 'Style', default: 0, min: 0, max: 1,    step: 0.01  },
    // Displacement
    {
      id: 'uDisplacementMap', label: 'Map', type: 'texture', group: 'Displacement', default: null,
      assets: [
        { id: 'cloud',   label: 'Cloud',   url: cloudUrl },
        { id: 'marble',  label: 'Marble',  url: marbleUrl },
        { id: 'voronoi', label: 'Voronoi', url: voronoiUrl },
      ],
    },
    {
      id: 'uDisplacementStrength', label: 'Strength', type: 'range', group: 'Displacement',
      default: 0, min: 0, max: 1, step: 0.01,
      visibleIf: { param: 'uDisplacementMap', notNull: true },
    },
    {
      id: 'uDisplacementScale', label: 'Scale', type: 'range', group: 'Displacement',
      default: 1.0, min: 0.1, max: 5, step: 0.05,
      visibleIf: { param: 'uDisplacementMap', notNull: true },
    },
    {
      id: 'uDisplacementSpeed', label: 'Speed', type: 'range', group: 'Displacement',
      default: 0.1, min: 0, max: 1, step: 0.01,
      visibleIf: { param: 'uDisplacementMap', notNull: true },
    },
  ],
  presets: [
    {
      id: 'sunset',
      label: 'Sunset',
      values: {
        uSpeed: 0.3, uAngle: 0.78,
        uColorA: '#ff6b6b', uColorB: '#feca57', uColorC: '#ff9ff3',
        uContrast: 1.2, uScale: 1.0, uFrequency: 1.0, uOffset: [0, 0],
        uGrain: 0, uVignette: 0,
        uDisplacementMap: null, uDisplacementStrength: 0, uDisplacementScale: 1.0, uDisplacementSpeed: 0,
      },
    },
    {
      id: 'ocean',
      label: 'Ocean',
      values: {
        uSpeed: 0.2, uAngle: 1.57,
        uColorA: '#0a3d62', uColorB: '#38ada9', uColorC: '#60a3bc',
        uContrast: 1.0, uScale: 1.0, uFrequency: 1.0, uOffset: [0, 0],
        uGrain: 0, uVignette: 0,
        uDisplacementMap: null, uDisplacementStrength: 0, uDisplacementScale: 1.0, uDisplacementSpeed: 0,
      },
    },
    {
      id: 'smoky',
      label: 'Smoky',
      values: {
        uSpeed: 0.15, uAngle: 0.5,
        uColorA: '#2c2c54', uColorB: '#706fd3', uColorC: '#aaa6d0',
        uContrast: 1.1, uScale: 1.2, uFrequency: 1.0, uOffset: [0, 0],
        uGrain: 0.05, uVignette: 0.4,
        uDisplacementMap: cloudUrl, uDisplacementStrength: 0.6, uDisplacementScale: 1.5, uDisplacementSpeed: 0.2,
      },
    },
    {
      id: 'psychedelic',
      label: 'Psychedelic',
      values: {
        uSpeed: 0.8, uAngle: 1.0,
        uColorA: '#ff006e', uColorB: '#8338ec', uColorC: '#06d6a0',
        uContrast: 1.8, uScale: 0.8, uFrequency: 3.0, uOffset: [0, 0],
        uGrain: 0.15, uVignette: 0.2,
        uDisplacementMap: null, uDisplacementStrength: 0, uDisplacementScale: 1.0, uDisplacementSpeed: 0,
      },
    },
  ],
}
