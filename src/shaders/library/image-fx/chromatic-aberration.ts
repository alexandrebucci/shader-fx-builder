import type { ShaderDef } from '@/shaders/types'

const VERTEX = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}`

const FRAGMENT = /* glsl */`
uniform sampler2D uTexture;
uniform float     uTime;
uniform float     uStrength;
uniform float     uFalloff;
uniform bool      uPulse;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec2  dir  = uv - 0.5;
  float dist = length(dir);
  vec2  norm = dist > 0.0 ? dir / dist : vec2(0.0);
  float falloff = pow(dist, uFalloff);
  float strength = uStrength;
  if (uPulse) {
    strength *= 0.7 + 0.3 * sin(uTime * 1.2);
  }
  vec2 offset = norm * falloff * strength;
  float r = texture2D(uTexture, uv - offset).r;
  float g = texture2D(uTexture, uv         ).g;
  float b = texture2D(uTexture, uv + offset).b;
  float a = texture2D(uTexture, uv).a;
  gl_FragColor = vec4(r, g, b, a);
}`

export const chromaticAberration: ShaderDef = {
  id: 'chromatic-aberration',
  name: 'Chromatic Aberration',
  category: 'image-fx',
  tags: ['lens', 'rgb-split', 'glitch', 'post-process'],
  thumbnail: '',
  description: 'Radial RGB channel split that mimics lens chromatic aberration — fringing is zero at centre and grows toward edges.',
  vertex: VERTEX,
  fragment: FRAGMENT,
  params: [
    { id: 'uStrength', label: 'Strength', type: 'range',  default: 0.015, min: 0,   max: 0.05, step: 0.001 },
    { id: 'uFalloff',  label: 'Falloff',  type: 'range',  default: 1.5,   min: 0.5, max: 3,    step: 0.1   },
    { id: 'uPulse',    label: 'Pulse',    type: 'toggle', default: false },
  ],
  presets: [
    {
      id: 'subtle', label: 'Subtle',
      values: { uStrength: 0.008, uFalloff: 1.5, uPulse: false },
    },
    {
      id: 'strong', label: 'Strong',
      values: { uStrength: 0.04, uFalloff: 2.0, uPulse: true },
    },
  ],
}
