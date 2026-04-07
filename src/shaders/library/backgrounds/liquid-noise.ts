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
uniform float uFlowX;
uniform float uFlowY;
uniform float uPulse;
uniform float uPulseFreq;
uniform float uTimeOffset;
uniform float uSymmetry;
uniform float uVignette;
uniform float uPolar;
uniform float uHueShift;
uniform float uSaturation;
uniform float uGrain;
uniform float uPosterize;

varying vec2 vUv;

// #include <noise>
// #include <color>

float t;
float gAmplitude;

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
    f = sampleNoise(q + vec2(t * uFlowX, t * uFlowY));
  } else if (uDomainWarp < 1.5) {
    float n1 = sampleNoise(q + vec2(t * uFlowX * 3.0, t * uFlowY * 2.0));
    float n2 = sampleNoise(q + vec2(n1 * uDistortion, t * uFlowY * 4.0));
    f = sampleNoise(q + n2 * uDistortion + vec2(t * uFlowX));
  } else {
    float n1 = sampleNoise(q + vec2(t * uFlowX * 3.0, t * uFlowY * 2.0));
    float n2 = sampleNoise(q + vec2(n1 * uDistortion, t * uFlowY * 4.0));
    float n3 = sampleNoise(q + vec2(n2 * uDistortion, t * uFlowY * 3.0));
    f = sampleNoise(q + n3 * uDistortion + vec2(t * uFlowX));
  }
  return clamp(f * gAmplitude, 0.0, 1.0);
}

void main() {
  vec2 uv = vUv;

  // Pixelation (square pixels in screen space)
  if (uPixelation > 1.5) {
    vec2 pixelCount = vec2(uPixelation * uAspect, uPixelation);
    uv = floor(uv * pixelCount) / pixelCount;
  }

  t = uTime * uSpeed + uTimeOffset;
  gAmplitude = uAmplitude * (1.0 + uPulse * sin(t * uPulseFreq * 6.28318));

  vec2 p = (uv - 0.5) * uScale;
  p.x *= uAspect;

  // Rotation
  float cosA = cos(uAngle);
  float sinA = sin(uAngle);
  p = vec2(cosA * p.x - sinA * p.y, sinA * p.x + cosA * p.y);

  // Symmetry
  if (uSymmetry > 0.5 && uSymmetry < 1.5) p.x = abs(p.x);
  else if (uSymmetry > 1.5 && uSymmetry < 2.5) p.y = abs(p.y);
  else if (uSymmetry > 2.5) p = abs(p);

  // Polar coords
  if (uPolar > 0.5) {
    p = vec2(length(p), atan(p.y, p.x) / 6.28318 + 0.5);
  }

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

  // Hue shift + saturation
  if (uHueShift > 0.001 || abs(uSaturation - 1.0) > 0.01) {
    vec3 hsl = rgb2hsl(color);
    hsl.x = fract(hsl.x + uHueShift);
    hsl.y = clamp(hsl.y * uSaturation, 0.0, 1.0);
    color = hsl2rgb(hsl);
  }

  // Posterize
  if (uPosterize >= 2.0) {
    color = floor(color * uPosterize + 0.5) / uPosterize;
  }

  // Vignette
  color *= 1.0 - uVignette * smoothstep(0.3, 0.9, length(vUv - 0.5) * 1.6);

  // Grain
  if (uGrain > 0.001) {
    vec2 grainUv = vUv + vec2(fract(t * 0.1));
    float grain = fract(sin(dot(grainUv, vec2(12.9898, 78.233))) * 43758.5453);
    color += (grain - 0.5) * uGrain;
  }

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
    // --- Animation ---
    {
      id: 'uSpeed',
      label: 'Speed',
      group: 'Animation',
      type: 'range',
      default: 0.4,
      min: 0,
      max: 2,
      step: 0.01,
    },
    {
      id: 'uFlowX',
      label: 'Flow X',
      group: 'Animation',
      type: 'range',
      default: 0.1,
      min: -1,
      max: 1,
      step: 0.01,
    },
    {
      id: 'uFlowY',
      label: 'Flow Y',
      group: 'Animation',
      type: 'range',
      default: 0.05,
      min: -1,
      max: 1,
      step: 0.01,
    },
    {
      id: 'uPulse',
      label: 'Pulse',
      group: 'Animation',
      type: 'range',
      default: 0,
      min: 0,
      max: 1,
      step: 0.01,
    },
    {
      id: 'uPulseFreq',
      label: 'Pulse Freq',
      group: 'Animation',
      type: 'range',
      default: 1.0,
      min: 0.1,
      max: 4,
      step: 0.1,
      visibleIf: { param: 'uPulse', minValue: 0.01 },
    },
    {
      id: 'uTimeOffset',
      label: 'Time Offset',
      group: 'Animation',
      type: 'range',
      default: 0,
      min: 0,
      max: 100,
      step: 0.1,
    },
    // --- Structure ---
    {
      id: 'uScale',
      label: 'Scale',
      group: 'Structure',
      type: 'range',
      default: 2.0,
      min: 0.5,
      max: 6,
      step: 0.1,
    },
    {
      id: 'uAngle',
      label: 'Angle',
      group: 'Structure',
      type: 'range',
      default: 0,
      min: 0,
      max: 6.28,
      step: 0.01,
    },
    {
      id: 'uSymmetry',
      label: 'Symmetry',
      group: 'Structure',
      type: 'select',
      default: '0',
      options: [
        { value: '0', label: 'None' },
        { value: '1', label: 'Mirror H' },
        { value: '2', label: 'Mirror V' },
        { value: '3', label: 'Radial 4' },
      ],
    },
    {
      id: 'uVignette',
      label: 'Vignette',
      group: 'Structure',
      type: 'range',
      default: 0,
      min: 0,
      max: 1,
      step: 0.01,
    },
    {
      id: 'uPolar',
      label: 'Polar',
      group: 'Structure',
      type: 'toggle',
      default: false,
    },
    // --- Noise ---
    {
      id: 'uNoiseType',
      label: 'Noise Type',
      group: 'Noise',
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
      group: 'Noise',
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
      group: 'Noise',
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
      group: 'Noise',
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
      group: 'Noise',
      type: 'range',
      default: 1.0,
      min: 0.1,
      max: 5.0,
      step: 0.1,
    },
    {
      id: 'uAmplitude',
      label: 'Amplitude',
      group: 'Noise',
      type: 'range',
      default: 1.0,
      min: 0.1,
      max: 2.0,
      step: 0.05,
    },
    {
      id: 'uDistortion',
      label: 'Distortion',
      group: 'Noise',
      type: 'range',
      default: 1.2,
      min: 0,
      max: 3,
      step: 0.05,
    },
    {
      id: 'uDomainWarp',
      label: 'Domain Warp',
      group: 'Noise',
      type: 'select',
      default: '1',
      options: [
        { value: '0', label: 'None' },
        { value: '1', label: '1 Pass' },
        { value: '2', label: '2 Passes' },
      ],
    },
    // --- Color ---
    {
      id: 'uColorCount',
      label: 'Color Count',
      group: 'Color',
      type: 'range',
      default: 3,
      min: 2,
      max: 5,
      step: 1,
    },
    {
      id: 'uColor1',
      label: 'Color 1',
      group: 'Color',
      type: 'color',
      default: '#0a0a2e',
    },
    {
      id: 'uColor2',
      label: 'Color 2',
      group: 'Color',
      type: 'color',
      default: '#6b21a8',
    },
    {
      id: 'uColor3',
      label: 'Color 3',
      group: 'Color',
      type: 'color',
      default: '#1a0050',
      visibleIf: { param: 'uColorCount', minValue: 3 },
    },
    {
      id: 'uColor4',
      label: 'Color 4',
      group: 'Color',
      type: 'color',
      default: '#4a0080',
      visibleIf: { param: 'uColorCount', minValue: 4 },
    },
    {
      id: 'uColor5',
      label: 'Color 5',
      group: 'Color',
      type: 'color',
      default: '#7c3aed',
      visibleIf: { param: 'uColorCount', minValue: 5 },
    },
    {
      id: 'uBrightness',
      label: 'Brightness',
      group: 'Color',
      type: 'range',
      default: 1.0,
      min: 0,
      max: 2,
      step: 0.05,
    },
    {
      id: 'uContrast',
      label: 'Contrast',
      group: 'Color',
      type: 'range',
      default: 1.0,
      min: 0.5,
      max: 2,
      step: 0.05,
    },
    {
      id: 'uColorOffset',
      label: 'Color Offset',
      group: 'Color',
      type: 'range',
      default: 0,
      min: 0,
      max: 0.3,
      step: 0.005,
    },
    {
      id: 'uHueShift',
      label: 'Hue Shift',
      group: 'Color',
      type: 'range',
      default: 0,
      min: 0,
      max: 1,
      step: 0.01,
    },
    {
      id: 'uSaturation',
      label: 'Saturation',
      group: 'Color',
      type: 'range',
      default: 1.0,
      min: 0,
      max: 2,
      step: 0.05,
    },
    // --- Post-process ---
    {
      id: 'uBlur',
      label: 'Blur',
      group: 'Post-process',
      type: 'range',
      default: 0,
      min: 0,
      max: 5,
      step: 0.1,
    },
    {
      id: 'uPixelation',
      label: 'Pixelation',
      group: 'Post-process',
      type: 'range',
      default: 1,
      min: 1,
      max: 128,
      step: 1,
    },
    {
      id: 'uGrain',
      label: 'Grain',
      group: 'Post-process',
      type: 'range',
      default: 0,
      min: 0,
      max: 0.5,
      step: 0.005,
    },
    {
      id: 'uPosterize',
      label: 'Posterize',
      group: 'Post-process',
      type: 'range',
      default: 0,
      min: 0,
      max: 16,
      step: 1,
    },
  ],
  presets: [
    {
      id: 'deep-sea',
      label: 'Deep Sea',
      values: {
        uSpeed: 0.2, uFlowX: 0.1, uFlowY: 0.05, uPulse: 0, uPulseFreq: 1.0, uTimeOffset: 0,
        uScale: 2.5, uAngle: 0, uSymmetry: '0', uVignette: 0.3, uPolar: false,
        uNoiseType: '0', uOctaves: 5, uPersistence: 0.5, uLacunarity: 2.0,
        uNoiseFreq: 1.0, uAmplitude: 1.0, uDistortion: 1.0, uDomainWarp: '1',
        uColorCount: 3,
        uColor1: '#001433', uColor2: '#005c99', uColor3: '#00b3b3', uColor4: '#007acc', uColor5: '#00e5ff',
        uBrightness: 0.9, uContrast: 1.1, uColorOffset: 0, uHueShift: 0, uSaturation: 1.0,
        uBlur: 0, uPixelation: 1, uGrain: 0, uPosterize: 0,
      },
    },
    {
      id: 'aurora',
      label: 'Aurora',
      values: {
        uSpeed: 0.3, uFlowX: 0.1, uFlowY: 0.05, uPulse: 0, uPulseFreq: 1.0, uTimeOffset: 0,
        uScale: 2.0, uAngle: 0, uSymmetry: '0', uVignette: 0, uPolar: false,
        uNoiseType: '0', uOctaves: 6, uPersistence: 0.6, uLacunarity: 2.0,
        uNoiseFreq: 1.0, uAmplitude: 1.0, uDistortion: 1.2, uDomainWarp: '1',
        uColorCount: 4,
        uColor1: '#001a0d', uColor2: '#00cc66', uColor3: '#6600cc', uColor4: '#ff66cc', uColor5: '#ffffff',
        uBrightness: 1.0, uContrast: 1.2, uColorOffset: 0, uHueShift: 0, uSaturation: 1.0,
        uBlur: 0, uPixelation: 1, uGrain: 0, uPosterize: 0,
      },
    },
    {
      id: 'molten',
      label: 'Molten',
      values: {
        uSpeed: 0.5, uFlowX: 0.1, uFlowY: 0.05, uPulse: 0, uPulseFreq: 1.0, uTimeOffset: 0,
        uScale: 3.0, uAngle: 0, uSymmetry: '0', uVignette: 0, uPolar: false,
        uNoiseType: '0', uOctaves: 5, uPersistence: 0.5, uLacunarity: 2.0,
        uNoiseFreq: 1.0, uAmplitude: 1.0, uDistortion: 2.5, uDomainWarp: '2',
        uColorCount: 3,
        uColor1: '#1a0000', uColor2: '#cc3300', uColor3: '#ffaa00', uColor4: '#ff6600', uColor5: '#ffdd00',
        uBrightness: 1.2, uContrast: 1.4, uColorOffset: 0, uHueShift: 0, uSaturation: 1.0,
        uBlur: 0, uPixelation: 1, uGrain: 0, uPosterize: 0,
      },
    },
    {
      id: 'monochrome',
      label: 'Monochrome',
      values: {
        uSpeed: 0.4, uFlowX: 0.1, uFlowY: 0.05, uPulse: 0, uPulseFreq: 1.0, uTimeOffset: 0,
        uScale: 2.0, uAngle: 0, uSymmetry: '0', uVignette: 0, uPolar: false,
        uNoiseType: '1', uOctaves: 5, uPersistence: 0.5, uLacunarity: 2.0,
        uNoiseFreq: 1.0, uAmplitude: 1.0, uDistortion: 1.2, uDomainWarp: '1',
        uColorCount: 2,
        uColor1: '#000000', uColor2: '#ffffff', uColor3: '#333333', uColor4: '#999999', uColor5: '#cccccc',
        uBrightness: 1.0, uContrast: 1.8, uColorOffset: 0, uHueShift: 0, uSaturation: 1.0,
        uBlur: 0, uPixelation: 1, uGrain: 0, uPosterize: 0,
      },
    },
    {
      id: 'rainbow',
      label: 'Rainbow',
      values: {
        uSpeed: 0.3, uFlowX: 0.06, uFlowY: 0.06, uPulse: 0, uPulseFreq: 1.0, uTimeOffset: 0,
        uScale: 2.5, uAngle: 0, uSymmetry: '0', uVignette: 0, uPolar: false,
        uNoiseType: '0', uOctaves: 4, uPersistence: 0.5, uLacunarity: 2.0,
        uNoiseFreq: 1.5, uAmplitude: 1.1, uDistortion: 0.8, uDomainWarp: '1',
        uColorCount: 5,
        uColor1: '#ff0044', uColor2: '#ff9900', uColor3: '#00ee55', uColor4: '#0077ff', uColor5: '#cc00ff',
        uBrightness: 1.2, uContrast: 1.2, uColorOffset: 0.04, uHueShift: 0, uSaturation: 1.8,
        uBlur: 0, uPixelation: 1, uGrain: 0, uPosterize: 0,
      },
    },
    {
      id: 'aurora-borealis',
      label: 'Aurora Borealis',
      values: {
        uSpeed: 0.15, uFlowX: 0.0, uFlowY: 0.12, uPulse: 0.1, uPulseFreq: 0.4, uTimeOffset: 20,
        uScale: 3.5, uAngle: 0, uSymmetry: '0', uVignette: 0.3, uPolar: false,
        uNoiseType: '0', uOctaves: 6, uPersistence: 0.6, uLacunarity: 2.0,
        uNoiseFreq: 0.8, uAmplitude: 1.2, uDistortion: 0.6, uDomainWarp: '1',
        uColorCount: 4,
        uColor1: '#000d1a', uColor2: '#00ff88', uColor3: '#00ccff', uColor4: '#8800ff', uColor5: '#ff00aa',
        uBrightness: 1.1, uContrast: 1.5, uColorOffset: 0.01, uHueShift: 0, uSaturation: 1.4,
        uBlur: 0.5, uPixelation: 1, uGrain: 0, uPosterize: 0,
      },
    },
    {
      id: 'hyperspace',
      label: 'Hyperspace',
      values: {
        uSpeed: 1.5, uFlowX: 0.0, uFlowY: 0.8, uPulse: 0.2, uPulseFreq: 2.0, uTimeOffset: 0,
        uScale: 4.0, uAngle: 0, uSymmetry: '0', uVignette: 0.4, uPolar: true,
        uNoiseType: '0', uOctaves: 5, uPersistence: 0.5, uLacunarity: 2.5,
        uNoiseFreq: 2.0, uAmplitude: 1.3, uDistortion: 2.0, uDomainWarp: '2',
        uColorCount: 4,
        uColor1: '#000011', uColor2: '#0033cc', uColor3: '#00aaff', uColor4: '#ffffff', uColor5: '#ff44ff',
        uBrightness: 1.3, uContrast: 1.8, uColorOffset: 0.02, uHueShift: 0, uSaturation: 1.5,
        uBlur: 0, uPixelation: 1, uGrain: 0, uPosterize: 0,
      },
    },
    {
      id: 'underwater',
      label: 'Underwater',
      values: {
        uSpeed: 0.2, uFlowX: 0.05, uFlowY: 0.12, uPulse: 0, uPulseFreq: 1.0, uTimeOffset: 10,
        uScale: 2.0, uAngle: 0, uSymmetry: '2', uVignette: 0.2, uPolar: false,
        uNoiseType: '0', uOctaves: 5, uPersistence: 0.55, uLacunarity: 2.0,
        uNoiseFreq: 1.2, uAmplitude: 1.0, uDistortion: 0.8, uDomainWarp: '1',
        uColorCount: 4,
        uColor1: '#001a33', uColor2: '#006680', uColor3: '#00b3cc', uColor4: '#66ffee', uColor5: '#ffffff',
        uBrightness: 1.0, uContrast: 1.1, uColorOffset: 0.01, uHueShift: 0, uSaturation: 1.2,
        uBlur: 0.5, uPixelation: 1, uGrain: 0.01, uPosterize: 0,
      },
    },
    {
      id: 'beach',
      label: 'Beach',
      values: {
        uSpeed: 0.25, uFlowX: 0.15, uFlowY: 0.05, uPulse: 0, uPulseFreq: 1.0, uTimeOffset: 5,
        uScale: 3.0, uAngle: 0, uSymmetry: '0', uVignette: 0.1, uPolar: false,
        uNoiseType: '0', uOctaves: 4, uPersistence: 0.5, uLacunarity: 2.0,
        uNoiseFreq: 1.0, uAmplitude: 1.0, uDistortion: 1.0, uDomainWarp: '1',
        uColorCount: 4,
        uColor1: '#f0c060', uColor2: '#daa520', uColor3: '#00ccaa', uColor4: '#7ec8e3', uColor5: '#ffffff',
        uBrightness: 1.3, uContrast: 1.0, uColorOffset: 0, uHueShift: 0, uSaturation: 1.1,
        uBlur: 0.3, uPixelation: 1, uGrain: 0.02, uPosterize: 0,
      },
    },
    {
      id: 'sunny-day',
      label: 'Sunny Day',
      values: {
        uSpeed: 0.2, uFlowX: 0.08, uFlowY: 0.03, uPulse: 0, uPulseFreq: 1.0, uTimeOffset: 0,
        uScale: 2.5, uAngle: 0, uSymmetry: '0', uVignette: 0, uPolar: false,
        uNoiseType: '0', uOctaves: 3, uPersistence: 0.45, uLacunarity: 2.0,
        uNoiseFreq: 0.8, uAmplitude: 1.0, uDistortion: 0.5, uDomainWarp: '1',
        uColorCount: 3,
        uColor1: '#fff5cc', uColor2: '#ffdd00', uColor3: '#ff9900', uColor4: '#ffffff', uColor5: '#ffeeaa',
        uBrightness: 1.5, uContrast: 0.9, uColorOffset: 0, uHueShift: 0, uSaturation: 1.3,
        uBlur: 1.0, uPixelation: 1, uGrain: 0, uPosterize: 0,
      },
    },
    {
      id: 'sky',
      label: 'Sky',
      values: {
        uSpeed: 0.15, uFlowX: 0.2, uFlowY: 0.02, uPulse: 0, uPulseFreq: 1.0, uTimeOffset: 0,
        uScale: 4.0, uAngle: 0, uSymmetry: '0', uVignette: 0, uPolar: false,
        uNoiseType: '0', uOctaves: 4, uPersistence: 0.6, uLacunarity: 2.0,
        uNoiseFreq: 0.7, uAmplitude: 1.2, uDistortion: 0.8, uDomainWarp: '1',
        uColorCount: 4,
        uColor1: '#1a6db5', uColor2: '#87ceeb', uColor3: '#c8e8f5', uColor4: '#ffffff', uColor5: '#e8f4fb',
        uBrightness: 1.2, uContrast: 0.9, uColorOffset: 0, uHueShift: 0, uSaturation: 1.0,
        uBlur: 1.5, uPixelation: 1, uGrain: 0, uPosterize: 0,
      },
    },
    {
      id: 'lava',
      label: 'Lava',
      values: {
        uSpeed: 0.35, uFlowX: 0.05, uFlowY: 0.08, uPulse: 0.15, uPulseFreq: 0.5, uTimeOffset: 0,
        uScale: 2.5, uAngle: 0, uSymmetry: '0', uVignette: 0.1, uPolar: false,
        uNoiseType: '0', uOctaves: 6, uPersistence: 0.65, uLacunarity: 2.2,
        uNoiseFreq: 1.0, uAmplitude: 1.3, uDistortion: 2.8, uDomainWarp: '2',
        uColorCount: 5,
        uColor1: '#0a0000', uColor2: '#330000', uColor3: '#cc1100', uColor4: '#ff5500', uColor5: '#ffcc00',
        uBrightness: 1.0, uContrast: 1.8, uColorOffset: 0, uHueShift: 0, uSaturation: 1.3,
        uBlur: 0, uPixelation: 1, uGrain: 0.02, uPosterize: 0,
      },
    },
  ],
}
