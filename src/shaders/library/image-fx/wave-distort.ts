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
uniform float     uFrequency;
uniform float     uAmplitude;
uniform float     uSpeed;
uniform float     uDirection; // 0.0 = both, 1.0 = horizontal, 2.0 = vertical

varying vec2 vUv;

void main() {
  float t = uTime * uSpeed;

  float offX = sin(vUv.y * uFrequency + t) * uAmplitude;
  float offY = sin(vUv.x * uFrequency + t) * uAmplitude;

  if (uDirection > 0.5 && uDirection < 1.5) { offY = 0.0; }
  if (uDirection > 1.5)                     { offX = 0.0; }

  vec2 distortedUv = vUv + vec2(offX, offY);

  gl_FragColor = texture2D(uTexture, distortedUv);
}`

export const waveDistort: ShaderDef = {
  id: 'wave-distort',
  name: 'Wave Distort',
  category: 'image-fx',
  tags: ['wave', 'ripple', 'distort', 'uv', 'animated'],
  thumbnail: '',
  description: 'Applies sinusoidal UV distortion to a texture, creating an animated wave or ripple effect.',
  vertex: VERTEX,
  fragment: FRAGMENT,
  params: [
    {
      id: 'uFrequency',
      label: 'Frequency',
      type: 'range',
      default: 8.0,
      min: 1,
      max: 30,
      step: 0.5,
      description: 'Number of wave cycles across the texture.',
    },
    {
      id: 'uAmplitude',
      label: 'Amplitude',
      type: 'range',
      default: 0.03,
      min: 0,
      max: 0.1,
      step: 0.005,
      description: 'Distortion strength in UV space.',
    },
    {
      id: 'uSpeed',
      label: 'Speed',
      type: 'range',
      default: 1.0,
      min: 0,
      max: 3,
      step: 0.05,
      description: 'Animation speed multiplier.',
    },
    {
      id: 'uDirection',
      label: 'Direction',
      type: 'select',
      default: '0',
      options: [
        { value: '0', label: 'Both' },
        { value: '1', label: 'Horizontal' },
        { value: '2', label: 'Vertical' },
      ],
      description: 'Which axes receive the sinusoidal distortion.',
    },
  ],
  presets: [
    {
      id: 'gentle',
      label: 'Gentle',
      values: { uFrequency: 6.0, uAmplitude: 0.015, uSpeed: 0.5, uDirection: '0' },
    },
    {
      id: 'strong',
      label: 'Strong',
      values: { uFrequency: 18.0, uAmplitude: 0.07, uSpeed: 2.0, uDirection: '0' },
    },
  ],
}
