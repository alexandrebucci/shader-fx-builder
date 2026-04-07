---
date: 2026-03-31
title: Gradient Flow Shader
status: implemented
---

# Gradient Flow Shader

## Context

`gradient-flow` is a clean, animated background shader that smoothly transitions between three designer-supplied colors. The gradient moves in a configurable direction using a rotation angle; the animation speed is independently controllable. Color mixing is done with a cosine palette approach that naturally produces vibrant, smooth transitions — no noise, no turbulence, just pure flowing color.

The target audience is designers who want a polished, attention-grabbing animated background without the organic complexity of noise-based shaders. The effect is similar to what you might see on modern SaaS landing pages or in motion-design tooling.

The shader belongs in the `background` category alongside `liquid-noise`.

---

## Scope

### Included

- `src/shaders/library/backgrounds/gradient-flow.ts` — new shader definition.
- GLSL vertex + fragment shaders, self-contained (no noise functions needed).
- `// #include <color>` used for the `cosPalette` function (requires the snippet system from `2026-03-31-glsl-snippet-system.md` to be implemented first).
- 6 params: `uSpeed`, `uAngle`, `uColorA`, `uColorB`, `uColorC`, `uContrast`.
- 2 presets: `sunset`, `ocean`.

### Excluded

- No noise or distortion.
- No image-fx variant.
- No per-pixel UV warping.
- No changes to `ShaderPlayer`, `ShaderCompiler`, or any existing file.
- No UI changes.

---

## File

**`src/shaders/library/backgrounds/gradient-flow.ts`**

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
  // Range is roughly [-0.7, 0.7] for a full-screen diagonal; normalize to [0, 1]
  float grad = dot(uv, dir) * 1.42 + 0.5;

  // Animate the gradient position over time
  float t = grad + uTime * uSpeed * 0.1;

  // Build cosine palette coefficients from the three user colors.
  // a  = midpoint  (average of colorA and colorC)
  // b  = amplitude (half the range; scaled by uContrast)
  // c  = frequency (fixed at 1.0 — one full cycle per unit of t)
  // d  = phase     (derived from colorB to shift the hue peak)
  vec3 a = (uColorA + uColorC) * 0.5;
  vec3 b = (uColorA - uColorC) * 0.5 * uContrast;
  vec3 c = vec3(1.0);
  vec3 d = uColorB;               // colorB acts as the mid-cycle phase color

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
    {
      id: 'uSpeed',
      label: 'Speed',
      type: 'range',
      default: 0.3,
      min: 0,
      max: 2,
      step: 0.01,
    },
    {
      id: 'uAngle',
      label: 'Angle',
      type: 'range',
      default: 0.0,
      min: 0,
      max: 6.28,
      step: 0.01,
    },
    {
      id: 'uColorA',
      label: 'Color A',
      type: 'color',
      default: '#ff6b6b',
    },
    {
      id: 'uColorB',
      label: 'Color B',
      type: 'color',
      default: '#4ecdc4',
    },
    {
      id: 'uColorC',
      label: 'Color C',
      type: 'color',
      default: '#45b7d1',
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
  ],
  presets: [
    {
      id: 'sunset',
      label: 'Sunset',
      values: {
        uSpeed: 0.3,
        uAngle: 0.78,
        uColorA: '#ff6b6b',
        uColorB: '#feca57',
        uColorC: '#ff9ff3',
        uContrast: 1.2,
      },
    },
    {
      id: 'ocean',
      label: 'Ocean',
      values: {
        uSpeed: 0.2,
        uAngle: 1.57,
        uColorA: '#0a3d62',
        uColorB: '#38ada9',
        uColorC: '#60a3bc',
        uContrast: 1.0,
      },
    },
  ],
}
```

---

## GLSL Notes for the Implementer

### Cosine palette formula

`cosPalette` is defined in `src/shaders/snippets/color.glsl` (from the snippet system spec) as:

```glsl
vec3 cosPalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}
```

The shader maps the three user colors onto the palette coefficients as follows:

| Coefficient | Meaning | Derived from |
|-------------|---------|--------------|
| `a` | DC offset / midpoint color | `(uColorA + uColorC) * 0.5` |
| `b` | Amplitude (swing around midpoint) | `(uColorA - uColorC) * 0.5 * uContrast` |
| `c` | Frequency | `vec3(1.0)` (one cycle per unit `t`) |
| `d` | Phase offset | `uColorB` (controls the mid-cycle hue) |

This means:
- At `t = 0.0`, output ≈ `uColorA`.
- At `t = 0.5`, output peaks toward `uColorB` (phase-shifted by `d`).
- At `t = 1.0`, output ≈ `uColorC`.
- Colors cycle smoothly and continuously as `t` changes with time.

### Gradient projection

The screen-space UV is centered at `(0, 0)` and aspect-corrected before being projected onto the angle direction vector:

```glsl
vec2 uv = vUv - 0.5;       // [0,1] → [-0.5, 0.5]
uv.x *= uAspect;            // correct for non-square canvases
vec2 dir = vec2(cos(uAngle), sin(uAngle));
float grad = dot(uv, dir) * 1.42 + 0.5;  // remap diagonal range to [0, 1]
```

The factor `1.42` normalises the maximum diagonal projection (`sqrt(0.5^2 + 0.5^2) ≈ 0.707`) so the full gradient band spans the visible screen at every angle. Aspect correction is applied to `uv.x` only (not to `dir`) so `uAngle = 0` always means "left-to-right" regardless of canvas shape.

### Animation

```glsl
float t = grad + uTime * uSpeed * 0.1;
```

`uTime` is injected by `ShaderPlayer` (seconds since start). The `* 0.1` factor makes the default `uSpeed = 0.3` feel gentle — at full speed (`2.0`) the palette cycles once roughly every 5 seconds.

### Color uniform packing

`uColorA`, `uColorB`, `uColorC` are declared as `vec3` in GLSL. The UI passes hex strings (`'#ff6b6b'`); the existing color param pipeline already converts hex → `THREE.Color` → `vec3` before uploading the uniform, matching the pattern in `liquid-noise.ts`.

---

## Params Reference

| id | label | type | default | min | max | step |
|----|-------|------|---------|-----|-----|------|
| `uSpeed` | Speed | range | `0.3` | `0` | `2` | `0.01` |
| `uAngle` | Angle | range | `0.0` | `0` | `6.28` | `0.01` |
| `uColorA` | Color A | color | `'#ff6b6b'` | — | — | — |
| `uColorB` | Color B | color | `'#4ecdc4'` | — | — | — |
| `uColorC` | Color C | color | `'#45b7d1'` | — | — | — |
| `uContrast` | Contrast | range | `1.0` | `0.5` | `2` | `0.05` |

---

## Presets

### sunset

| param | value |
|-------|-------|
| `uSpeed` | `0.3` |
| `uAngle` | `0.78` (~45°) |
| `uColorA` | `'#ff6b6b'` (coral red) |
| `uColorB` | `'#feca57'` (golden yellow) |
| `uColorC` | `'#ff9ff3'` (soft pink) |
| `uContrast` | `1.2` |

### ocean

| param | value |
|-------|-------|
| `uSpeed` | `0.2` |
| `uAngle` | `1.57` (~90°, top-to-bottom) |
| `uColorA` | `'#0a3d62'` (deep navy) |
| `uColorB` | `'#38ada9'` (teal) |
| `uColorC` | `'#60a3bc'` (sky blue) |
| `uContrast` | `1.0` |

---

## Dependencies

This shader depends on the snippet system described in `docs/superpowers/specs/2026-03-31-glsl-snippet-system.md`. Specifically, `ShaderPlayer.setShader()` must pass `SNIPPETS` to `ShaderCompiler.resolveIncludes()` before `// #include <color>` will resolve correctly.

**Implement the snippet system spec before implementing this shader.**

---

## Acceptance Criteria

- [ ] File `src/shaders/library/backgrounds/gradient-flow.ts` exists and exports `gradientFlow` as a named export.
- [ ] `gradientFlow.id` is `'gradient-flow'`, `gradientFlow.category` is `'background'`.
- [ ] The FRAGMENT string contains `// #include <color>` and does not inline `cosPalette` or any other snippet function body.
- [ ] The FRAGMENT string declares uniforms `uSpeed`, `uAngle`, `uColorA`, `uColorB`, `uColorC`, `uContrast` with the correct GLSL types (`float` for ranges, `vec3` for colors).
- [ ] `gradientFlow.params` contains exactly 6 entries matching the params table above (correct `id`, `type`, `default`, `min`, `max`, `step` where applicable).
- [ ] `gradientFlow.presets` contains exactly 2 entries: `{ id: 'sunset', ... }` and `{ id: 'ocean', ... }` with values matching the presets tables above.
- [ ] At `uAngle = 0.0` the gradient flows left-to-right (visually verifiable in the preview).
- [ ] At `uAngle = 1.57` the gradient flows top-to-bottom.
- [ ] Setting `uSpeed = 0` freezes the animation completely.
- [ ] Setting `uContrast = 0.5` produces a visibly washed-out, low-contrast gradient; `uContrast = 2.0` produces vivid, saturated colors.
- [ ] Both presets render without WebGL errors in the browser console.
- [ ] The shader compiles without GLSL errors (no red screen, no `THREE.WebGLProgram` compile error in console).
- [ ] All existing tests pass (`npm run test` or `vitest run`).
- [ ] TypeScript compiles without errors (`tsc --noEmit`).
