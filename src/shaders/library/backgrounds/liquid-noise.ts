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
uniform float uAngle;
uniform float uNoiseType;
uniform float uOctaves;
uniform float uPersistence;
uniform float uLacunarity;
uniform float uNoiseFreq;
uniform float uAmplitude;
uniform float uDistortion;
uniform float uDomainWarp;
uniform float uColorCount;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
uniform vec3 uColor5;
uniform float uBrightness;
uniform float uContrast;
uniform float uBlur;
uniform float uColorOffset;
uniform float uPixelation;

varying vec2 vUv;

// #include <noise>

float t;

float customFbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  float freq = 1.0;
  float norm = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= int(uOctaves)) break;
    v += a * snoise(p * freq);
    norm += a;
    freq *= uLacunarity;
    a *= uPersistence;
  }
  return v / norm * 0.5 + 0.5;
}

float sampleNoise(vec2 p) {
  if (uNoiseType < 0.5) return customFbm(p);
  return snoise(p) * 0.5 + 0.5;
}

vec3 getColor(int i) {
  if (i == 0) return uColor1;
  if (i == 1) return uColor2;
  if (i == 2) return uColor3;
  if (i == 3) return uColor4;
  return uColor5;
}

vec3 paletteGradient(float f, int count) {
  float scaled = f * float(count - 1);
  int idx = clamp(int(scaled), 0, count - 2);
  float t2 = scaled - float(idx);
  return mix(getColor(idx), getColor(idx + 1), t2);
}

float computeF(vec2 p) {
  vec2 q = p * uNoiseFreq;
  float f;
  if (uDomainWarp < 0.5) {
    f = sampleNoise(q + vec2(t * 0.1, t * 0.05));
  } else if (uDomainWarp < 1.5) {
    float n1 = sampleNoise(q + vec2(t * 0.3, t * 0.1));
    float n2 = sampleNoise(q + vec2(n1 * uDistortion, t * 0.2));
    f = sampleNoise(q + n2 * uDistortion + vec2(t * 0.1));
  } else {
    float n1 = sampleNoise(q + vec2(t * 0.3, t * 0.1));
    float n2 = sampleNoise(q + vec2(n1 * uDistortion, t * 0.2));
    float n3 = sampleNoise(q + vec2(n2 * uDistortion, t * 0.15));
    f = sampleNoise(q + n3 * uDistortion + vec2(t * 0.1));
  }
  return clamp(f * uAmplitude, 0.0, 1.0);
}

void main() {
  vec2 uv = vUv;

  // Pixelation
  if (uPixelation > 1.5) {
    uv = floor(uv * uPixelation) / uPixelation;
  }

  t = uTime * uSpeed;
  vec2 p = (uv - 0.5) * uScale;
  p.x *= uAspect;

  // Rotation
  float cosA = cos(uAngle);
  float sinA = sin(uAngle);
  p = vec2(cosA * p.x - sinA * p.y, sinA * p.x + cosA * p.y);

  // Blur: 5-sample box average
  float f;
  if (uBlur > 0.01) {
    float r = uBlur * 0.05;
    f  = computeF(p);
    f += computeF(p + vec2(r, 0.0));
    f += computeF(p - vec2(r, 0.0));
    f += computeF(p + vec2(0.0, r));
    f += computeF(p - vec2(0.0, r));
    f /= 5.0;
  } else {
    f = computeF(p);
  }
  f = smoothstep(0.0, 1.0, f);

  // Color with optional per-channel offset (chromatic shift)
  vec3 color;
  int count = int(uColorCount);
  if (uColorOffset > 0.005) {
    float fR = smoothstep(0.0, 1.0, computeF(p + vec2(uColorOffset, 0.0)));
    float fB = smoothstep(0.0, 1.0, computeF(p - vec2(uColorOffset, 0.0)));
    vec3 cR = paletteGradient(fR, count);
    vec3 cG = paletteGradient(f,  count);
    vec3 cB = paletteGradient(fB, count);
    color = vec3(cR.r, cG.g, cB.b);
  } else {
    color = paletteGradient(f, count);
  }

  color = (color - 0.5) * uContrast + 0.5;
  color *= uBrightness;
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
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
    {
      id: 'uSpeed',
      label: 'Speed',
      type: 'range',
      default: 0.4,
      min: 0,
      max: 2,
      step: 0.01,
    },
    {
      id: 'uScale',
      label: 'Scale',
      type: 'range',
      default: 2.0,
      min: 0.5,
      max: 6,
      step: 0.1,
    },
    {
      id: 'uAngle',
      label: 'Angle',
      type: 'range',
      default: 0,
      min: 0,
      max: 6.28,
      step: 0.01,
    },
    {
      id: 'uNoiseType',
      label: 'Noise Type',
      type: 'select',
      default: '0',
      options: [
        { value: '0', label: 'FBM' },
        { value: '1', label: 'Simplex' },
      ],
    },
    {
      id: 'uOctaves',
      label: 'Octaves',
      type: 'range',
      default: 5,
      min: 1,
      max: 8,
      step: 1,
      visibleIf: { param: 'uNoiseType', value: '0' },
    },
    {
      id: 'uPersistence',
      label: 'Persistence',
      type: 'range',
      default: 0.5,
      min: 0.1,
      max: 1.0,
      step: 0.05,
      visibleIf: { param: 'uNoiseType', value: '0' },
    },
    {
      id: 'uLacunarity',
      label: 'Lacunarity',
      type: 'range',
      default: 2.0,
      min: 1.0,
      max: 4.0,
      step: 0.1,
      visibleIf: { param: 'uNoiseType', value: '0' },
    },
    {
      id: 'uNoiseFreq',
      label: 'Noise Freq',
      type: 'range',
      default: 1.0,
      min: 0.1,
      max: 5.0,
      step: 0.1,
    },
    {
      id: 'uAmplitude',
      label: 'Amplitude',
      type: 'range',
      default: 1.0,
      min: 0.1,
      max: 2.0,
      step: 0.05,
    },
    {
      id: 'uDistortion',
      label: 'Distortion',
      type: 'range',
      default: 1.2,
      min: 0,
      max: 3,
      step: 0.05,
    },
    {
      id: 'uDomainWarp',
      label: 'Domain Warp',
      type: 'select',
      default: '1',
      options: [
        { value: '0', label: 'None' },
        { value: '1', label: '1 Pass' },
        { value: '2', label: '2 Passes' },
      ],
    },
    {
      id: 'uColorCount',
      label: 'Color Count',
      type: 'range',
      default: 3,
      min: 2,
      max: 5,
      step: 1,
    },
    {
      id: 'uColor1',
      label: 'Color 1',
      type: 'color',
      default: '#0a0a2e',
    },
    {
      id: 'uColor2',
      label: 'Color 2',
      type: 'color',
      default: '#6b21a8',
    },
    {
      id: 'uColor3',
      label: 'Color 3',
      type: 'color',
      default: '#1a0050',
      visibleIf: { param: 'uColorCount', minValue: 3 },
    },
    {
      id: 'uColor4',
      label: 'Color 4',
      type: 'color',
      default: '#4a0080',
      visibleIf: { param: 'uColorCount', minValue: 4 },
    },
    {
      id: 'uColor5',
      label: 'Color 5',
      type: 'color',
      default: '#7c3aed',
      visibleIf: { param: 'uColorCount', minValue: 5 },
    },
    {
      id: 'uBrightness',
      label: 'Brightness',
      type: 'range',
      default: 1.0,
      min: 0,
      max: 2,
      step: 0.05,
    },
    {
      id: 'uContrast',
      label: 'Contrast',
      type: 'range',
      default: 1.0,
      min: 0.5,
      max: 2,
      step: 0.05,
    },
    {
      id: 'uBlur',
      label: 'Blur',
      type: 'range',
      default: 0,
      min: 0,
      max: 5,
      step: 0.1,
    },
    {
      id: 'uColorOffset',
      label: 'Color Offset',
      type: 'range',
      default: 0,
      min: 0,
      max: 0.3,
      step: 0.005,
    },
    {
      id: 'uPixelation',
      label: 'Pixelation',
      type: 'range',
      default: 1,
      min: 1,
      max: 128,
      step: 1,
    },
  ],
  presets: [
    {
      id: 'deep-sea',
      label: 'Deep Sea',
      values: {
        uSpeed: 0.2,
        uScale: 2.5,
        uAngle: 0,
        uNoiseType: '0',
        uOctaves: 5,
        uPersistence: 0.5,
        uLacunarity: 2.0,
        uNoiseFreq: 1.0,
        uAmplitude: 1.0,
        uDistortion: 1.0,
        uDomainWarp: '1',
        uColorCount: 3,
        uColor1: '#001433',
        uColor2: '#005c99',
        uColor3: '#00b3b3',
        uColor4: '#007acc',
        uColor5: '#00e5ff',
        uBrightness: 0.9,
        uContrast: 1.1,
        uBlur: 0,
        uColorOffset: 0,
        uPixelation: 1,
      },
    },
    {
      id: 'aurora',
      label: 'Aurora',
      values: {
        uSpeed: 0.3,
        uScale: 2.0,
        uAngle: 0,
        uNoiseType: '0',
        uOctaves: 6,
        uPersistence: 0.6,
        uLacunarity: 2.0,
        uNoiseFreq: 1.0,
        uAmplitude: 1.0,
        uDistortion: 1.2,
        uDomainWarp: '1',
        uColorCount: 4,
        uColor1: '#001a0d',
        uColor2: '#00cc66',
        uColor3: '#6600cc',
        uColor4: '#ff66cc',
        uColor5: '#ffffff',
        uBrightness: 1.0,
        uContrast: 1.2,
        uBlur: 0,
        uColorOffset: 0,
        uPixelation: 1,
      },
    },
    {
      id: 'molten',
      label: 'Molten',
      values: {
        uSpeed: 0.5,
        uScale: 3.0,
        uAngle: 0,
        uNoiseType: '0',
        uOctaves: 5,
        uPersistence: 0.5,
        uLacunarity: 2.0,
        uNoiseFreq: 1.0,
        uAmplitude: 1.0,
        uDistortion: 2.5,
        uDomainWarp: '2',
        uColorCount: 3,
        uColor1: '#1a0000',
        uColor2: '#cc3300',
        uColor3: '#ffaa00',
        uColor4: '#ff6600',
        uColor5: '#ffdd00',
        uBrightness: 1.2,
        uContrast: 1.4,
        uBlur: 0,
        uColorOffset: 0,
        uPixelation: 1,
      },
    },
    {
      id: 'monochrome',
      label: 'Monochrome',
      values: {
        uSpeed: 0.4,
        uScale: 2.0,
        uAngle: 0,
        uNoiseType: '1',
        uOctaves: 5,
        uPersistence: 0.5,
        uLacunarity: 2.0,
        uNoiseFreq: 1.0,
        uAmplitude: 1.0,
        uDistortion: 1.2,
        uDomainWarp: '1',
        uColorCount: 2,
        uColor1: '#000000',
        uColor2: '#ffffff',
        uColor3: '#333333',
        uColor4: '#999999',
        uColor5: '#cccccc',
        uBrightness: 1.0,
        uContrast: 1.8,
        uBlur: 0,
        uColorOffset: 0,
        uPixelation: 1,
      },
    },
  ],
}
