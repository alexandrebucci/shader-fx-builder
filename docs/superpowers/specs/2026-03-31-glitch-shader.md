---
date: 2026-03-31
title: Glitch Shader
status: implemented
---

# Glitch Shader

## Context

The glitch shader is an `image-fx` effect that applies a digital corruption look to any texture. It combines two visual techniques:

1. **Horizontal block slicing** — the image is divided into thin horizontal strips. On each frame, a subset of strips is shifted left or right by a random amount proportional to `uIntensity`. The strips that shift and by how much are determined by a deterministic hash keyed on `floor(uTime * uSpeed)`, so the pattern changes in discrete bursts rather than smoothly.

2. **RGB channel split (chromatic aberration)** — the red, green, and blue channels of the texture are sampled at slightly different horizontal UV offsets, creating a coloured fringe that emphasises the digital-corruption aesthetic. The offset magnitude is controlled by `uRgbSplit`.

The effect is intermittent. A top-level "burst gate" uses the same hash function to decide whether the glitch is active on a given time slice. When the gate is closed, both the block shift and the channel split collapse to zero, leaving the original image intact. This gives the effect its characteristic on-off rhythm.

---

## Scope

### Included

- `src/shaders/library/image-fx/glitch.ts` — complete shader definition with vertex GLSL, fragment GLSL, params, and presets.
- Inline GLSL hash function (no `#include` dependency).
- Four user-facing params: `uIntensity`, `uSpeed`, `uBlockSize`, `uRgbSplit`.
- Two presets: `subtle`, `heavy`.

### Excluded

- No scan-line or CRT overlay.
- No vertical displacement.
- No pixel-sorting effect.
- No alpha masking or blend-mode parameter.
- No audio-reactive mode.
- No dependency on the snippet system (`// #include` directives).

---

## File

`src/shaders/library/image-fx/glitch.ts`

---

## Full TypeScript Source

```ts
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

// ------------------------------------------------------------------
// Deterministic hash — maps a float seed to a pseudo-random [0, 1]
// ------------------------------------------------------------------
float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

void main() {
  // Discrete time slice — changes at a rate of uSpeed per second.
  float t = floor(uTime * uSpeed);

  // Burst gate: only ~40 % of time slices are "active" glitch frames.
  float burst = step(0.6, hash(t * 0.1 + 7.3));

  // Which horizontal strip does this fragment belong to?
  float strip = floor(vUv.y / uBlockSize);

  // Random shift for this strip on this time slice.
  float stripRand = hash(strip * 92.37 + t * 0.47);

  // Signed shift: remap [0,1] -> [-1,1], then scale by intensity.
  float shift = (stripRand * 2.0 - 1.0) * uIntensity * burst;

  // Only shift strips whose random value exceeds a threshold (~30 % of strips shift).
  shift *= step(0.7, hash(strip * 17.13 + t * 1.31));

  // Build the three per-channel UV offsets.
  vec2 uvR = vec2(vUv.x + shift + uRgbSplit * burst, vUv.y);
  vec2 uvG = vec2(vUv.x + shift,                     vUv.y);
  vec2 uvB = vec2(vUv.x + shift - uRgbSplit * burst, vUv.y);

  // Clamp UVs to [0,1] to avoid texture wrap artefacts.
  uvR = clamp(uvR, 0.0, 1.0);
  uvG = clamp(uvG, 0.0, 1.0);
  uvB = clamp(uvB, 0.0, 1.0);

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
    {
      id:      'uIntensity',
      label:   'Intensity',
      type:    'range',
      default: 0.05,
      min:     0,
      max:     0.2,
      step:    0.005,
    },
    {
      id:      'uSpeed',
      label:   'Speed',
      type:    'range',
      default: 8.0,
      min:     1,
      max:     30,
      step:    0.5,
    },
    {
      id:      'uBlockSize',
      label:   'Block Size',
      type:    'range',
      default: 0.05,
      min:     0.01,
      max:     0.2,
      step:    0.005,
    },
    {
      id:      'uRgbSplit',
      label:   'RGB Split',
      type:    'range',
      default: 0.01,
      min:     0,
      max:     0.05,
      step:    0.002,
    },
  ],
  presets: [
    {
      id:    'subtle',
      label: 'Subtle',
      values: {
        uIntensity: 0.03,
        uSpeed:     6.0,
        uBlockSize: 0.04,
        uRgbSplit:  0.006,
      },
    },
    {
      id:    'heavy',
      label: 'Heavy',
      values: {
        uIntensity: 0.15,
        uSpeed:     20.0,
        uBlockSize: 0.08,
        uRgbSplit:  0.04,
      },
    },
  ],
}
```

---

## Params Reference

| id | label | type | default | min | max | step | Notes |
|---|---|---|---|---|---|---|---|
| `uIntensity` | Intensity | range | 0.05 | 0 | 0.2 | 0.005 | Maximum horizontal shift in UV space |
| `uSpeed` | Speed | range | 8.0 | 1 | 30 | 0.5 | Glitch burst rate (time slices per second) |
| `uBlockSize` | Block Size | range | 0.05 | 0.01 | 0.2 | 0.005 | Height of each horizontal strip in UV space |
| `uRgbSplit` | RGB Split | range | 0.01 | 0 | 0.05 | 0.002 | Per-channel horizontal offset in UV space |

---

## Presets

### `subtle`
Occasional, barely-visible corruption. Good for UI overlays or ambient motion that should not distract.

```
uIntensity: 0.03 | uSpeed: 6.0 | uBlockSize: 0.04 | uRgbSplit: 0.006
```

### `heavy`
Aggressive, rapid tearing. Suitable for intentional glitch art or error-state visuals.

```
uIntensity: 0.15 | uSpeed: 20.0 | uBlockSize: 0.08 | uRgbSplit: 0.04
```

---

## GLSL Design Notes

### Hash function

```glsl
float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}
```

A classic single-input hash using `sin` and a large multiplier. Deterministic — same seed always produces the same output. No external dependency; safe to inline.

### Burst gate

```glsl
float t      = floor(uTime * uSpeed);
float burst  = step(0.6, hash(t * 0.1 + 7.3));
```

`floor(uTime * uSpeed)` quantises continuous time into discrete integer steps. Multiplying by `uSpeed` controls how many steps occur per second. `step(0.6, ...)` makes approximately 40 % of steps "active" (the 40 % where `hash(...) >= 0.6`). The magic constants `0.1` and `7.3` are arbitrary offsets that decorrelate this hash call from the per-strip calls.

### Strip selection

```glsl
float strip     = floor(vUv.y / uBlockSize);
float stripRand = hash(strip * 92.37 + t * 0.47);
shift          *= step(0.7, hash(strip * 17.13 + t * 1.31));
```

Each strip gets its own random value. The second `step(0.7, ...)` means only ~30 % of strips actually shift on any active burst, keeping the corruption localised rather than affecting the entire image uniformly.

### UV clamping

The shifted UVs are clamped to `[0, 1]` before sampling. This prevents edge wrapping (which would produce a stripe of pixels from the opposite side of the image). A production variant could instead use `mix(originalSample, shiftedSample, edgeMask)` to fade the shift near the borders, but clamping is sufficient for MVP.

---

## Acceptance Criteria

- [ ] `src/shaders/library/image-fx/glitch.ts` exists and exports a `glitch` constant typed as `ShaderDef`.
- [ ] `glitch.category` is `'image-fx'`.
- [ ] `glitch.fragment` contains `uTexture` so ShaderPlayer auto-injects the placeholder DataTexture.
- [ ] Shader compiles without errors in Three.js (no WebGL compile errors in console).
- [ ] With all params at default values, the effect is visible but not overwhelming — horizontal tearing occurs in short bursts with a subtle colour fringe.
- [ ] Setting `uIntensity` to `0` and `uRgbSplit` to `0` produces an output visually identical to the original unmodified texture (no shift, no channel split).
- [ ] Setting `uSpeed` to `1` produces slow, infrequent bursts; setting it to `30` produces rapid, near-continuous corruption.
- [ ] `uBlockSize: 0.01` yields fine, pixel-height strips; `uBlockSize: 0.2` yields coarse, tall slabs.
- [ ] Both presets (`subtle`, `heavy`) load without error and produce visually distinct results.
- [ ] No `#include` directives are present in the fragment or vertex strings (self-contained).
- [ ] All existing tests pass (`npm run test` or `vitest run`).
