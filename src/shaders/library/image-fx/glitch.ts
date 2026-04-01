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
uniform vec2  uMouse;
uniform sampler2D uTexture;

uniform float uIntensity;
uniform float uSpeed;
uniform float uBlockSize;
uniform float uRgbSplit;

varying vec2 vUv;

float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

void main() {
  float t = floor(uTime * uSpeed);
  float burst = step(0.6, hash(t * 0.1 + 7.3));
  float strip = floor(vUv.y / uBlockSize);
  float stripRand = hash(strip * 92.37 + t * 0.47);
  float shift = (stripRand * 2.0 - 1.0) * uIntensity * burst;
  shift *= step(0.7, hash(strip * 17.13 + t * 1.31));

  vec2 uvR = clamp(vec2(vUv.x + shift + uRgbSplit * burst, vUv.y), 0.0, 1.0);
  vec2 uvG = clamp(vec2(vUv.x + shift,                     vUv.y), 0.0, 1.0);
  vec2 uvB = clamp(vec2(vUv.x + shift - uRgbSplit * burst, vUv.y), 0.0, 1.0);

  float r = texture2D(uTexture, uvR).r;
  float g = texture2D(uTexture, uvG).g;
  float b = texture2D(uTexture, uvB).b;
  float a = texture2D(uTexture, uvG).a;

  gl_FragColor = vec4(r, g, b, a);
}`

export const glitch: ShaderDef = {
  id: 'glitch',
  name: 'Glitch',
  category: 'image-fx',
  tags: ['digital', 'glitch', 'rgb', 'distortion'],
  thumbnail: '',
  description: 'Digital glitch effect: horizontal block slicing with intermittent RGB channel split',
  vertex: VERTEX,
  fragment: FRAGMENT,
  params: [
    { id: 'uIntensity', label: 'Intensity',  type: 'range', default: 0.05,  min: 0,    max: 0.2,  step: 0.005 },
    { id: 'uSpeed',     label: 'Speed',      type: 'range', default: 8.0,   min: 1,    max: 30,   step: 0.5   },
    { id: 'uBlockSize', label: 'Block Size', type: 'range', default: 0.05,  min: 0.01, max: 0.2,  step: 0.005 },
    { id: 'uRgbSplit',  label: 'RGB Split',  type: 'range', default: 0.01,  min: 0,    max: 0.05, step: 0.002 },
  ],
  presets: [
    {
      id: 'subtle', label: 'Subtle',
      values: { uIntensity: 0.03, uSpeed: 6.0, uBlockSize: 0.04, uRgbSplit: 0.006 },
    },
    {
      id: 'heavy', label: 'Heavy',
      values: { uIntensity: 0.15, uSpeed: 20.0, uBlockSize: 0.08, uRgbSplit: 0.04 },
    },
  ],
}
