---
date: 2026-03-31
title: Wave Distort Shader
status: implemented
---

# Wave Distort Shader

## Context

`wave-distort` is an `image-fx` shader that applies sinusoidal UV distortion to a texture,
producing an animated wave or ripple effect. The distortion offsets UV coordinates along one
or both axes using a sine wave whose frequency, amplitude, speed, and direction are all
user-controlled.

**DataTexture placeholder:** The `ShaderPlayer` detects the presence of `uTexture` in the
fragment source and automatically injects a 256×256 gradient `DataTexture`. This means the
shader renders a visible, animated wave effect inside the builder without requiring the user
to supply a real image. Once the user attaches an actual image the effect applies identically.

---

## Scope

### Included

- `src/shaders/library/image-fx/wave-distort.ts` — new shader definition file.
- GLSL: sinusoidal UV offset on X axis, Y axis, or both, animated by `uTime`.
- Four params: `uFrequency`, `uAmplitude`, `uSpeed`, `uDirection`.
- Two presets: `gentle` and `strong`.

### Excluded

- No new subdirectory index or barrel export changes (that is a separate indexing task).
- No edge-clamping or border-mode control (out of scope for MVP).
- No scroll-based or mouse-driven animation (mouse input is available via `uMouse` but not
  wired to this shader).
- No custom vertex distortion (UV-only distortion in the fragment shader).

---

## File

```
src/shaders/library/image-fx/wave-distort.ts   ← new file (new image-fx/ subdirectory)
```

The `image-fx/` subdirectory does not yet exist under `library/`. Create it alongside this file.

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
uniform float     uFrequency;
uniform float     uAmplitude;
uniform float     uSpeed;
uniform int       uDirection; // 0 = both, 1 = horizontal, 2 = vertical

varying vec2 vUv;

void main() {
  float t = uTime * uSpeed;

  // Sinusoidal offset on each axis.
  // uDirection controls which axes receive distortion:
  //   0 (both)       — X shifted by sin(vUv.y * freq + t), Y shifted by sin(vUv.x * freq + t)
  //   1 (horizontal) — only X shifted
  //   2 (vertical)   — only Y shifted
  float offX = sin(vUv.y * uFrequency + t) * uAmplitude;
  float offY = sin(vUv.x * uFrequency + t) * uAmplitude;

  if (uDirection == 1) { offY = 0.0; }
  if (uDirection == 2) { offX = 0.0; }

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
      default: 'both',
      options: [
        { value: 'both',       label: 'Both' },
        { value: 'horizontal', label: 'Horizontal' },
        { value: 'vertical',   label: 'Vertical' },
      ],
      description: 'Which axes receive the sinusoidal distortion.',
    },
  ],
  presets: [
    {
      id: 'gentle',
      label: 'Gentle',
      values: {
        uFrequency:  6.0,
        uAmplitude:  0.015,
        uSpeed:      0.5,
        uDirection:  'both',
      },
    },
    {
      id: 'strong',
      label: 'Strong',
      values: {
        uFrequency:  18.0,
        uAmplitude:  0.07,
        uSpeed:      2.0,
        uDirection:  'both',
      },
    },
  ],
}
```

---

## Params Reference

| id            | type   | default | min  | max  | step  | notes                                         |
|---------------|--------|---------|------|------|-------|-----------------------------------------------|
| `uFrequency`  | range  | 8.0     | 1    | 30   | 0.5   | Wave cycles across UV space                   |
| `uAmplitude`  | range  | 0.03    | 0    | 0.1  | 0.005 | UV offset magnitude                           |
| `uSpeed`      | range  | 1.0     | 0    | 3    | 0.05  | Multiplied into `uTime` before sine           |
| `uDirection`  | select | 'both'  | —    | —    | —     | 'both' / 'horizontal' / 'vertical'            |

---

## GLSL Notes

### Direction encoding

`uDirection` is declared as `uniform int` in the fragment shader. The Zustand param store
holds a string (`'both'`, `'horizontal'`, `'vertical'`). The uniform setter in
`ShaderPlayer` (or the upstream uniform-mapping layer) must convert these string values to
integers before uploading:

```
'both'       → 0
'horizontal' → 1
'vertical'   → 2
```

If the current uniform-mapping layer does not handle `select`-type params with integer
uniforms, the fragment shader can alternatively use `#define` constants and a float uniform,
e.g.:

```glsl
// Fallback if int uniforms are not supported
uniform float uDirection; // 0.0 = both, 1.0 = horizontal, 2.0 = vertical

if (uDirection > 0.5 && uDirection < 1.5) { offY = 0.0; }  // horizontal
if (uDirection > 1.5)                     { offX = 0.0; }  // vertical
```

Use whichever matches the project's existing uniform-upload convention. Check
`src/core/player/ShaderPlayer.ts` before implementing.

### UV clamping

`texture2D` on a `DataTexture` defaults to `ClampToEdgeWrapping`. At high amplitude values
the distorted UV will clamp at the edges, producing a visible border stretch. This is
acceptable for MVP. A `RepeatWrapping` or `MirroredRepeatWrapping` option is out of scope.

---

## Presets

### gentle

Subtle undulation. Suitable for soft background overlays.

```
uFrequency: 6.0  |  uAmplitude: 0.015  |  uSpeed: 0.5  |  uDirection: both
```

### strong

Aggressive ripple. Suitable for psychedelic / motion-graphic effects.

```
uFrequency: 18.0  |  uAmplitude: 0.07  |  uSpeed: 2.0  |  uDirection: both
```

---

## Acceptance Criteria

- [ ] `src/shaders/library/image-fx/wave-distort.ts` exists and exports `waveDistort` typed
      as `ShaderDef`.
- [ ] The shader compiles without GLSL errors in Three.js (`ShaderMaterial` does not log
      errors to the console on load).
- [ ] The DataTexture placeholder renders an animated wave in `ShaderPlayer` at default
      param values.
- [ ] Changing `uFrequency` between 1 and 30 visually alters the number of wave cycles.
- [ ] Changing `uAmplitude` between 0 and 0.1 visually scales the distortion from none to
      strong.
- [ ] Setting `uSpeed` to 0 freezes the animation; increasing it speeds the wave up.
- [ ] Selecting `uDirection = 'horizontal'` distorts only the X axis (vertical bands, no
      vertical shear).
- [ ] Selecting `uDirection = 'vertical'` distorts only the Y axis (horizontal bands, no
      horizontal shear).
- [ ] Selecting `uDirection = 'both'` distorts both axes simultaneously.
- [ ] The `gentle` preset applies without error and produces a visibly subtle wave.
- [ ] The `strong` preset applies without error and produces a visibly aggressive wave.
- [ ] All existing tests pass (`vitest run`).
