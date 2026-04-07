---
date: 2026-03-31
title: Particles Field Shader
status: implemented
---

# Particles Field Shader

## Context

The `particles-field` shader renders a field of small glowing dots drifting slowly across a dark background. There is no geometry instancing and no vertex-level work beyond the standard fullscreen quad — every particle is computed in the fragment shader by tiling UV space into a grid, placing one particle per cell with a per-cell noise-driven offset, and rendering the dot using an SDF circle with a smooth glow falloff.

The effect is a good complement to `liquid-noise` in the `background` category: where that shader is organic and continuous, this one is discrete and spatial. Typical use cases are ambient UI backgrounds, loading screens, and data-visualisation dashboards.

The `// #include <noise>` snippet is required for particle drift. This spec assumes the snippet system described in `2026-03-31-glsl-snippet-system.md` is already implemented and that `snoise(vec2)` is available after the include resolves.

---

## Scope

### Included

- `src/shaders/library/backgrounds/particles-field.ts` — new shader file with complete VERTEX and FRAGMENT GLSL strings and a valid `ShaderDef` export.
- 6 user-facing params: `uCount`, `uSize`, `uSpeed`, `uColor`, `uBackground`, `uGlow`.
- 2 presets: `starfield` and `fireflies`.

### Excluded

- No geometry, no instancing, no BufferGeometry, no Points object — pure fragment shader on a fullscreen quad.
- No per-particle opacity variation (uniform glow only).
- No particle trails or motion blur.
- No interaction with `uMouse` (the uniform is available but not used in this shader).
- No changes to any existing file.

---

## File

**Exact path:** `src/shaders/library/backgrounds/particles-field.ts`

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
uniform float uCount;
uniform float uSize;
uniform float uSpeed;
uniform vec3  uColor;
uniform vec3  uBackground;
uniform float uGlow;

varying vec2 vUv;

// #include <noise>

// Hash — deterministic pseudo-random float from a vec2 seed
float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}

void main() {
  // Correct for aspect ratio so circles are round, not ellipses
  vec2 uv = vUv;
  uv.x *= uAspect;

  // Scale UV into grid space: uCount cells per axis
  vec2 grid = uv * uCount;

  // Integer cell index and fractional position within the cell
  vec2 cell  = floor(grid);
  vec2 local = fract(grid);          // [0, 1) within cell

  // Per-cell seed values used to individualise each particle
  float seedX = hash(cell);
  float seedY = hash(cell + vec2(7.3, 2.9));

  // Drift: use snoise evaluated at a slowly-moving point.
  // Two independent noise samples give x and y displacement.
  float t = uTime * uSpeed;
  float dx = snoise(vec2(cell.x * 0.37 + seedX * 6.28, t * 0.5 + seedY * 3.14)) * 0.35;
  float dy = snoise(vec2(cell.y * 0.37 + seedY * 6.28, t * 0.5 + seedX * 3.14)) * 0.35;

  // Place particle centre at (0.5, 0.5) inside the cell + drift offset,
  // clamped so the particle can never leave its cell.
  vec2 center = vec2(0.5) + vec2(dx, dy) * (0.5 - uSize);

  // SDF circle: signed distance from local position to particle centre,
  // normalised so 0 = edge and negative = inside.
  float dist = length(local - center);

  // Smooth glow using smoothstep.
  // uGlow controls how wide the falloff is relative to the cell size.
  // A uGlow of 1 gives a hard edge; larger values give a softer halo.
  float glowWidth = uSize * uGlow / uCount;
  float alpha = 1.0 - smoothstep(uSize / uCount - glowWidth, uSize / uCount, dist);

  // Composite particle colour over background
  vec3 col = mix(uBackground, uColor, alpha);
  gl_FragColor = vec4(col, 1.0);
}`

export const particlesField: ShaderDef = {
  id: 'particles-field',
  name: 'Particles Field',
  category: 'background',
  tags: ['particles', 'dots', 'ambient', 'space', 'dark'],
  thumbnail: '',
  description: 'A field of small glowing dots drifting gently in space, rendered entirely in the fragment shader using a grid-based SDF approach.',
  vertex: VERTEX,
  fragment: FRAGMENT,
  params: [
    {
      id: 'uCount',
      label: 'Count',
      type: 'range',
      default: 12.0,
      min: 4,
      max: 30,
      step: 1,
    },
    {
      id: 'uSize',
      label: 'Size',
      type: 'range',
      default: 0.15,
      min: 0.05,
      max: 0.4,
      step: 0.01,
    },
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
      id: 'uColor',
      label: 'Particle Color',
      type: 'color',
      default: '#ffffff',
    },
    {
      id: 'uBackground',
      label: 'Background',
      type: 'color',
      default: '#0a0a1a',
    },
    {
      id: 'uGlow',
      label: 'Glow',
      type: 'range',
      default: 2.0,
      min: 1,
      max: 5,
      step: 0.1,
    },
  ],
  presets: [
    {
      id: 'starfield',
      label: 'Starfield',
      values: {
        uCount: 20.0,
        uSize: 0.08,
        uSpeed: 0.05,
        uColor: '#e8eeff',
        uBackground: '#000008',
        uGlow: 1.5,
      },
    },
    {
      id: 'fireflies',
      label: 'Fireflies',
      values: {
        uCount: 8.0,
        uSize: 0.28,
        uSpeed: 0.6,
        uColor: '#aaff44',
        uBackground: '#050d02',
        uGlow: 4.0,
      },
    },
  ],
}
```

---

## GLSL Design Notes

These notes exist to prevent ambiguity during implementation — do not deviate from them without updating this spec.

### Grid-based particle placement

UV space is scaled by `uCount` to produce `grid` coordinates. `floor(grid)` gives the integer cell index; `fract(grid)` gives the local [0, 1) position within the cell. Every cell contains exactly one particle. This is O(1) per fragment — no loop over all particles.

### Particle drift

Two calls to `snoise(vec2)` (provided by `// #include <noise>`) produce independent x and y displacement values in roughly [-0.35, 0.35] cell-units. The seeds `seedX` and `seedY` (derived from `hash()`) ensure each cell drifts independently. The displacement is multiplied by `(0.5 - uSize)` to guarantee the centre never moves within `uSize` of the cell boundary, preventing visible clipping at cell edges.

### SDF circle and glow

`dist = length(local - center)` is the Euclidean distance from the fragment to the particle centre in grid space (not screen space — no additional normalisation is needed because the grid is already uniform after the aspect-ratio correction on `uv.x`).

The glow falloff uses a single `smoothstep`:

```
alpha = 1.0 - smoothstep(innerEdge, outerEdge, dist)
```

where:
- `outerEdge = uSize / uCount` — the outer radius of the glow in UV units
- `innerEdge = outerEdge - uGlow * uSize / uCount` — the inner edge of the transition band

At `uGlow = 1.0` the transition band equals one `uSize` unit, giving a visually hard edge. At `uGlow = 5.0` the band is five times wider, producing a soft nebula-like halo.

### Aspect ratio correction

`uv.x *= uAspect` is applied once at the start of `main()`, before `grid = uv * uCount`. Because both x and y are then divided identically by `uCount` in the cell arithmetic, and `dist` is computed with `length()`, the circles remain round at any viewport ratio.

### `hash()` function

A custom `hash(vec2)` is defined inline in the fragment shader (not part of any snippet). It returns a stable pseudo-random float in [0, 1) for a given cell coordinate. It must not be replaced by `snoise` or any time-dependent function — it is used only for per-cell seed generation.

---

## Registration

After the file is created, add `particlesField` to the shader library index so it appears in the UI.

File: `src/shaders/library/index.ts` (or whichever barrel file exports all shaders)

```ts
export { particlesField } from './backgrounds/particles-field'
```

If a `shaderList` array is maintained in the same or a separate file, append `particlesField` to it.

---

## Acceptance Criteria

- [ ] `src/shaders/library/backgrounds/particles-field.ts` exists and exports `particlesField` typed as `ShaderDef`.
- [ ] `particlesField.id` equals `'particles-field'`.
- [ ] `particlesField.category` equals `'background'`.
- [ ] `particlesField.params` contains exactly 6 entries with ids: `uCount`, `uSize`, `uSpeed`, `uColor`, `uBackground`, `uGlow` — in that order.
- [ ] `uCount` has `type: 'range'`, `default: 12.0`, `min: 4`, `max: 30`, `step: 1`.
- [ ] `uSize` has `type: 'range'`, `default: 0.15`, `min: 0.05`, `max: 0.4`, `step: 0.01`.
- [ ] `uSpeed` has `type: 'range'`, `default: 0.4`, `min: 0`, `max: 2`, `step: 0.01`.
- [ ] `uColor` has `type: 'color'`, `default: '#ffffff'`.
- [ ] `uBackground` has `type: 'color'`, `default: '#0a0a1a'`.
- [ ] `uGlow` has `type: 'range'`, `default: 2.0`, `min: 1`, `max: 5`, `step: 0.1`.
- [ ] `particlesField.presets` contains exactly 2 entries with ids `'starfield'` and `'fireflies'`.
- [ ] The FRAGMENT string contains `// #include <noise>` (the snippet include for `snoise`).
- [ ] The FRAGMENT string does NOT inline the simplex noise implementation (no `mod289`, `permute`, or `snoise` function bodies).
- [ ] The FRAGMENT string contains a `hash(vec2)` helper function defined inline.
- [ ] The VERTEX string passes `uv` into `vUv` and sets `gl_Position = vec4(position, 1.0)`.
- [ ] The shader compiles without errors in Three.js (no `gl.getProgramInfoLog` warnings in the browser console).
- [ ] All existing shader tests pass (`npm run test` / `vitest run`).
- [ ] Rendered output shows a grid of glowing dots on a dark background that drift slowly over time.
- [ ] At `uCount: 20, uSize: 0.08` (starfield preset) each dot is small and moves imperceptibly slowly.
- [ ] At `uCount: 8, uSize: 0.28, uGlow: 4.0` (fireflies preset) dots are large, green-tinted, and have a visible soft halo.
- [ ] Dots are circular (not elliptical) at both 16:9 and 4:3 viewport ratios.
- [ ] `particlesField` is exported from the library index and appears in the shader picker UI.
