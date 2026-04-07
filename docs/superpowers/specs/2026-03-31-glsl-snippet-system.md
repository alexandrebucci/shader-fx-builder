---
date: 2026-03-31
title: GLSL Snippet System
status: implemented
---

# GLSL Snippet System

## Context

Shader GLSL code currently duplicates utility functions (noise, math helpers, color conversions) inline inside each shader definition. This violates DRY and makes it hard to share battle-tested implementations across shaders.

The `ShaderCompiler.resolveIncludes()` method already supports a `// #include <name>` directive but it is never passed any snippets — every call uses the default empty record.

This spec describes how to:
1. Create canonical GLSL snippet files for noise, color, and math utilities.
2. Export them as a typed `SNIPPETS` record from an index module.
3. Wire the snippets into `ShaderPlayer.setShader()`.
4. Refactor `liquid-noise.ts` to use `// #include <noise>` instead of inline noise code.

---

## Scope

### Included

- `src/shaders/snippets/noise.glsl` — simplex noise 2D (`snoise`) and fractal Brownian motion (`fbm`).
- `src/shaders/snippets/color.glsl` — HSL↔RGB helpers and cosine palette function.
- `src/shaders/snippets/math.glsl` — easing functions, `rotate2D` matrix, `remap`/`map` helpers.
- `src/shaders/snippets/index.ts` — imports the three `.glsl` files as strings and exports `SNIPPETS`.
- `src/core/player/ShaderPlayer.ts` — `setShader()` updated to pass `SNIPPETS` to `resolveIncludes()`.
- `src/shaders/library/backgrounds/liquid-noise.ts` — inline noise functions removed, replaced with `// #include <noise>`.

### Excluded

- No new UI to browse snippets.
- No runtime snippet hot-reloading.
- No per-shader opt-out mechanism.
- No changes to `ShaderCompiler.resolveIncludes()` itself.
- No other shaders refactored (only `liquid-noise.ts`).

---

## File Structure

```
src/shaders/snippets/
  noise.glsl          ← new
  color.glsl          ← new
  math.glsl           ← new
  index.ts            ← new

src/core/player/
  ShaderPlayer.ts     ← modified (setShader only)

src/shaders/library/backgrounds/
  liquid-noise.ts     ← modified (FRAGMENT string only)
```

---

## Snippet Content

### `src/shaders/snippets/noise.glsl`

Extracted verbatim from the current `liquid-noise.ts` FRAGMENT string.

```glsl
// Simplex noise 2D — Stefan Gustavson / ashima
vec3 mod289v3(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec2 mod289v2(vec2 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289v3(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289v2(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Fractal Brownian Motion — 5 octaves
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * snoise(p); p *= 2.0; a *= 0.5;
  }
  return v;
}
```

### `src/shaders/snippets/color.glsl`

```glsl
// HSL to RGB
// h, s, l all in [0, 1]
vec3 hsl2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

// RGB to HSL
// Returns h, s, l all in [0, 1]
vec3 rgb2hsl(vec3 c) {
  float maxC = max(max(c.r, c.g), c.b);
  float minC = min(min(c.r, c.g), c.b);
  float l = (maxC + minC) * 0.5;
  if (maxC == minC) return vec3(0.0, 0.0, l);
  float d = maxC - minC;
  float s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);
  float h;
  if (maxC == c.r)      h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
  else if (maxC == c.g) h = (c.b - c.r) / d + 2.0;
  else                  h = (c.r - c.g) / d + 4.0;
  return vec3(h / 6.0, s, l);
}

// Cosine palette — Inigo Quilez
// Returns a color by cycling through a cosine curve
// a, b, c, d are vec3 palette coefficients
vec3 cosPalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}
```

### `src/shaders/snippets/math.glsl`

```glsl
// Remap value from [inMin, inMax] to [outMin, outMax]
float remap(float value, float inMin, float inMax, float outMin, float outMax) {
  return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

// Alias: map (same as remap, shorter name)
float map(float value, float inMin, float inMax, float outMin, float outMax) {
  return remap(value, inMin, inMax, outMin, outMax);
}

// Rotate a 2D vector by angle (radians)
mat2 rotate2D(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

// Smooth cubic ease-in-out (Ken Perlin)
float smootherstep(float edge0, float edge1, float x) {
  x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

// Ease-in quadratic
float easeInQuad(float t) {
  return t * t;
}

// Ease-out quadratic
float easeOutQuad(float t) {
  return t * (2.0 - t);
}

// Ease-in-out quadratic
float easeInOutQuad(float t) {
  return t < 0.5 ? 2.0 * t * t : -1.0 + (4.0 - 2.0 * t) * t;
}
```

---

## `src/shaders/snippets/index.ts`

Vite (and the project's build setup) supports importing `.glsl` files as raw strings via `?raw` query parameter. Use that to read each file at build time.

```ts
import noiseGlsl  from './noise.glsl?raw'
import colorGlsl  from './color.glsl?raw'
import mathGlsl   from './math.glsl?raw'

export const SNIPPETS: Record<string, string> = {
  noise: noiseGlsl,
  color: colorGlsl,
  math:  mathGlsl,
}
```

> **Note for the implementer:** If the project uses a different bundler or raw-import convention, adjust the import syntax accordingly (e.g. `import noiseGlsl from './noise.glsl'` with a Webpack raw-loader, or `fs.readFileSync` in a Node context). The contract is that each value in `SNIPPETS` is the full file content as a plain string.

---

## ShaderPlayer Change

File: `src/core/player/ShaderPlayer.ts`

Add the import of `SNIPPETS` at the top of the file, alongside the existing `ShaderCompiler` import:

```diff
  import { ShaderCompiler } from './ShaderCompiler'
+ import { SNIPPETS } from '@/shaders/snippets'
```

Update `setShader()`:

```diff
  setShader(vertex: string, fragment: string): void {
    if (!this.material) return
-   this.material.vertexShader = ShaderCompiler.resolveIncludes(vertex)
-   this.material.fragmentShader = ShaderCompiler.resolveIncludes(fragment)
+   this.material.vertexShader = ShaderCompiler.resolveIncludes(vertex, SNIPPETS)
+   this.material.fragmentShader = ShaderCompiler.resolveIncludes(fragment, SNIPPETS)
    this.material.needsUpdate = true
  }
```

No other methods change.

---

## liquid-noise Refactor

File: `src/shaders/library/backgrounds/liquid-noise.ts`

### Before (current FRAGMENT string, lines 10–65)

The FRAGMENT string contains the following inline functions before `void main()`:

```glsl
vec3 mod289v3(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec2 mod289v2(vec2 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289v3(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  ...
}

float fbm(vec2 p) {
  ...
}
```

### After

Remove all of the above functions and replace with a single include directive at the top of the FRAGMENT string, immediately after the uniform/varying declarations:

```diff
  const FRAGMENT = /* glsl */`
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uAspect;
  uniform float uSpeed;
  uniform float uScale;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uDistortion;

  varying vec2 vUv;

- vec3 mod289v3(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
- vec2 mod289v2(vec2 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
- vec3 permute(vec3 x) { return mod289v3(((x*34.0)+1.0)*x); }
-
- float snoise(vec2 v) {
-   const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
-   vec2 i = floor(v + dot(v, C.yy));
-   vec2 x0 = v - i + dot(i, C.xx);
-   vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
-   vec4 x12 = x0.xyxy + C.xxzz;
-   x12.xy -= i1;
-   i = mod289v2(i);
-   vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
-   vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
-   m = m*m; m = m*m;
-   vec3 x = 2.0 * fract(p * C.www) - 1.0;
-   vec3 h = abs(x) - 0.5;
-   vec3 ox = floor(x + 0.5);
-   vec3 a0 = x - ox;
-   m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
-   vec3 g;
-   g.x  = a0.x  * x0.x  + h.x  * x0.y;
-   g.yz = a0.yz * x12.xz + h.yz * x12.yw;
-   return 130.0 * dot(m, g);
- }
-
- float fbm(vec2 p) {
-   float v = 0.0; float a = 0.5;
-   for (int i = 0; i < 5; i++) {
-     v += a * snoise(p); p *= 2.0; a *= 0.5;
-   }
-   return v;
- }
+ // #include <noise>

  void main() {
    ...
  }`
```

The rest of the file (the `void main()` block, `liquidNoise` export, `params`, `presets`) is unchanged.

---

## Acceptance Criteria

- [ ] `src/shaders/snippets/noise.glsl` exists and contains `snoise` and `fbm` exactly as extracted from `liquid-noise.ts`.
- [ ] `src/shaders/snippets/color.glsl` exists and contains `hsl2rgb`, `rgb2hsl`, and `cosPalette`.
- [ ] `src/shaders/snippets/math.glsl` exists and contains `remap`, `map`, `rotate2D`, `smootherstep`, `easeInQuad`, `easeOutQuad`, `easeInOutQuad`.
- [ ] `src/shaders/snippets/index.ts` exports a `SNIPPETS` record with keys `noise`, `color`, `math` whose values are the raw GLSL file contents.
- [ ] `ShaderPlayer.setShader()` passes `SNIPPETS` as the second argument to both `resolveIncludes()` calls.
- [ ] `liquid-noise.ts` FRAGMENT string no longer contains the inline `mod289v3`, `mod289v2`, `permute`, `snoise`, or `fbm` function bodies.
- [ ] `liquid-noise.ts` FRAGMENT string contains exactly `// #include <noise>` in place of those functions.
- [ ] The liquid-noise shader renders identically before and after the refactor (visual regression: no change in output).
- [ ] `ShaderCompiler.resolveIncludes()` is not modified.
- [ ] All existing tests pass (`npm run test` or `vitest run`).
