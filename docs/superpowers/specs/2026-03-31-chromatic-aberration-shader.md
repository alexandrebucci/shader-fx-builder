---
date: 2026-03-31
title: Chromatic Aberration Shader
status: implemented
---

# Chromatic Aberration Shader

## Context

Chromatic aberration is a lens artifact caused by a glass element failing to focus all wavelengths of light to the same point. The result is a colour fringing effect: red, green, and blue channels appear slightly offset from one another, with the offset growing toward the edges of the frame. The centre of the lens has no fringing; the corners have the most.

This shader replicates that artefact as a post-process image-fx pass. It splits an input texture into its R, G, and B channels and re-samples each at a radially displaced UV position. The displacement direction is always away from the image centre, matching the geometry of a real lens. A falloff exponent controls how aggressively the effect builds toward the edges. An optional pulse toggle animates the strength with a slow sine wave so the aberration breathes rather than staying fully static.

---

## Scope

### Included

- `src/shaders/library/image-fx/chromatic-aberration.ts` — the complete `ShaderDef` export.
- Three params: `uStrength`, `uFalloff`, `uPulse`.
- Two presets: `subtle`, `strong`.
- GLSL that samples `uTexture` with per-channel UV offsets derived from the radial direction and a distance-based falloff.
- Optional sine-wave animation of `uStrength` when `uPulse` is `true`.

### Excluded

- No barrel/pincushion distortion of UVs (pure channel split only).
- No per-channel colour tint control.
- No vignette or blur layered on top.
- No axis-locked (horizontal-only or vertical-only) aberration mode.
- No UI changes beyond the standard param panel.

---

## File

```
src/shaders/library/image-fx/chromatic-aberration.ts
```

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
uniform sampler2D uTexture;
uniform float     uTime;
uniform float     uStrength;
uniform float     uFalloff;
uniform bool      uPulse;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;

  // Radial direction from image centre
  vec2  dir  = uv - 0.5;
  float dist = length(dir);

  // Normalise direction; avoid divide-by-zero at exact centre
  vec2  norm = dist > 0.0 ? dir / dist : vec2(0.0);

  // Distance-based falloff: effect is zero at centre, grows toward edges
  float falloff = pow(dist, uFalloff);

  // Optional slow pulse — animate strength with a gentle sine wave
  float strength = uStrength;
  if (uPulse) {
    strength *= 0.7 + 0.3 * sin(uTime * 1.2);
  }

  // Per-channel UV offset
  vec2 offset = norm * falloff * strength;

  float r = texture2D(uTexture, uv - offset).r;
  float g = texture2D(uTexture, uv         ).g;
  float b = texture2D(uTexture, uv + offset).b;

  // Preserve alpha from the unshifted sample
  float a = texture2D(uTexture, uv).a;

  gl_FragColor = vec4(r, g, b, a);
}`

export const chromaticAberration: ShaderDef = {
  id:          'chromatic-aberration',
  name:        'Chromatic Aberration',
  category:    'image-fx',
  tags:        ['lens', 'rgb-split', 'glitch', 'post-process'],
  thumbnail:   '',
  description: 'Radial RGB channel split that mimics lens chromatic aberration — fringing is zero at centre and grows toward edges.',
  vertex:   VERTEX,
  fragment: FRAGMENT,
  params: [
    {
      id:      'uStrength',
      label:   'Strength',
      type:    'range',
      default: 0.015,
      min:     0,
      max:     0.05,
      step:    0.001,
    },
    {
      id:      'uFalloff',
      label:   'Falloff',
      type:    'range',
      default: 1.5,
      min:     0.5,
      max:     3,
      step:    0.1,
    },
    {
      id:      'uPulse',
      label:   'Pulse',
      type:    'toggle',
      default: false,
    },
  ],
  presets: [
    {
      id:     'subtle',
      label:  'Subtle',
      values: { uStrength: 0.008, uFalloff: 1.5, uPulse: false },
    },
    {
      id:     'strong',
      label:  'Strong',
      values: { uStrength: 0.04, uFalloff: 2.0, uPulse: true },
    },
  ],
}
```

---

## Params

| id | label | type | default | min | max | step | notes |
|----|-------|------|---------|-----|-----|------|-------|
| `uStrength` | Strength | range | `0.015` | `0` | `0.05` | `0.001` | Maximum UV offset magnitude at the outermost corner |
| `uFalloff` | Falloff | range | `1.5` | `0.5` | `3` | `0.1` | Exponent applied to the radial distance; higher values push the effect further into the corners |
| `uPulse` | Pulse | toggle | `false` | — | — | — | When on, multiplies strength by `0.7 + 0.3 * sin(uTime * 1.2)` for a slow breathing animation |

---

## Presets

### `subtle`

Low strength, default falloff, no animation. Adds a barely-perceptible lens character without calling attention to itself. Suitable for photographic or UI backgrounds.

```ts
{ uStrength: 0.008, uFalloff: 1.5, uPulse: false }
```

### `strong`

Higher strength, steeper falloff, pulse on. The fringing is clearly visible at the corners and slowly breathes. Suitable for glitch aesthetics or retro CRT looks.

```ts
{ uStrength: 0.04, uFalloff: 2.0, uPulse: true }
```

---

## GLSL Design Notes

**Radial direction.** `dir = uv - 0.5` points from the image centre outward. Normalising it gives the displacement axis. The guard `dist > 0.0` prevents a NaN at `uv == vec2(0.5)` (the exact centre pixel), which would otherwise produce `0.0 / 0.0`.

**Falloff.** `pow(dist, uFalloff)` raises the raw distance (0–~0.71 for a square canvas) to the falloff power. At `uFalloff = 1.0` the offset grows linearly with distance. At `uFalloff = 2.0` it grows quadratically, concentrating the effect in the extreme corners. At `uFalloff = 0.5` the effect spreads more evenly across the whole frame.

**Channel sampling.** R is sampled at `uv - offset` (shifted toward centre), G at the unmodified `uv`, B at `uv + offset` (shifted away from centre). This matches the conventional representation of chromatic aberration in photography (red fringing on the inside, blue on the outside).

**Pulse.** The multiplier `0.7 + 0.3 * sin(uTime * 1.2)` keeps the strength in the range `[0.7, 1.0]` relative to `uStrength`, so it never disappears entirely. The factor `1.2` gives a period of roughly 5 seconds, which reads as a slow organic pulse rather than a fast flash.

**Alpha.** Alpha is taken from the unshifted sample to avoid fringing on transparency edges at the image boundary.

---

## Acceptance Criteria

- [ ] `src/shaders/library/image-fx/chromatic-aberration.ts` exists and exports a `ShaderDef` with `id: 'chromatic-aberration'` and `category: 'image-fx'`.
- [ ] The fragment shader declares `uniform sampler2D uTexture` and `ShaderPlayer` auto-injects a placeholder `DataTexture` without any manual wiring.
- [ ] At `uStrength = 0` and with `uPulse = false`, all three channels are sampled at exactly `uv` and the output is identical to the input texture (no visible aberration).
- [ ] The RGB fringing is visibly zero at the centre of the canvas and increases toward the corners for any `uStrength > 0`.
- [ ] Increasing `uFalloff` concentrates the effect further into the corners; decreasing it spreads it more evenly across the frame.
- [ ] With `uPulse = true`, the aberration strength visibly oscillates over time; with `uPulse = false`, the effect is static.
- [ ] The `subtle` preset renders with barely-perceptible fringing visible only near the canvas corners.
- [ ] The `strong` preset renders with clearly visible RGB fringing in the outer third of the canvas, and the effect pulses when `uPulse` is `true`.
- [ ] The shader compiles without GLSL errors in both Chrome and Firefox WebGL contexts.
- [ ] All existing tests pass (`npm run test` or `vitest run`).
