# Spec — Gradient Flow Extended

**Date:** 2026-04-07  
**Status:** Approved  

---

## Context

The `gradient-flow` shader currently exposes 6 params: speed, angle, 3 colors, contrast. This spec adds 9 new params — including a displacement map texture system — to make the shader significantly more expressive.

---

## New Params

| Uniform | Group | Type | Range | Default | Effect |
|---------|-------|------|-------|---------|--------|
| `uDisplacementMap` | Displacement | texture | — | null | Grayscale texture that warps gradient UVs |
| `uDisplacementStrength` | Displacement | range | 0 → 1 | 0.3 | Warp intensity. 0 = linear gradient, 1 = heavy deformation |
| `uDisplacementScale` | Displacement | range | 0.1 → 5 | 1.0 | Tiling of the displacement texture |
| `uDisplacementSpeed` | Displacement | range | 0 → 1 | 0.1 | Drift speed of the displacement texture over time |
| `uScale` | Shape | range | 0.1 → 4 | 1.0 | Zoom on the gradient — compresses or stretches color cycles |
| `uFrequency` | Shape | range | 0.5 → 4 | 1.0 | Number of cosine palette repetitions across the field |
| `uOffset` | Shape | vec2 | −1 → 1 | [0,0] | Shifts the gradient origin in X and Y |
| `uGrain` | Style | range | 0 → 0.3 | 0 | Animated per-frame noise — less "digital" look |
| `uVignette` | Style | range | 0 → 1 | 0 | Darkens edges progressively |

The 3 displacement params (`uDisplacementStrength`, `uDisplacementScale`, `uDisplacementSpeed`) are conditionally visible only when a displacement map is selected (`visibleIf: { param: 'uDisplacementMap', minValue: 1 }` — needs string-based visibility check, see Implementation Notes).

---

## 1. ParamType Extension — `'texture'`

### `src/shaders/types.ts`

Add `'texture'` to `ParamType`:

```ts
export type ParamType = 'range' | 'color' | 'toggle' | 'select' | 'vec2' | 'texture'
```

Add `assets` field to `ParamDef` for bundled texture options:

```ts
export interface TextureAsset {
  id: string
  label: string
  url: string  // Vite static asset URL
}

export interface ParamDef {
  // ... existing fields ...
  assets?: TextureAsset[]  // only for type: 'texture'
}
```

`visibleIf` for displacement sliders uses a new variant:
```ts
visibleIf?: { param: string; notNull: true }  // visible when texture param has a non-null value
```

---

## 2. Bundled Displacement Assets

Three grayscale PNG files in `src/assets/displacement/`:

| File | Label | Description |
|------|-------|-------------|
| `cloud.png` | Cloud | User-provided cloud noise texture |
| `marble.png` | Marble | Sinusoidal vein pattern |
| `voronoi.png` | Voronoi | Cell-based pattern |

Imported in `gradient-flow.ts` via Vite static import:
```ts
import cloudUrl from '@/assets/displacement/cloud.png'
import marbleUrl from '@/assets/displacement/marble.png'
import voronoiUrl from '@/assets/displacement/voronoi.png'
```

`marble.png` and `voronoi.png` are static 256×256 grayscale PNG files committed to the repository alongside `cloud.png`.

---

## 3. Texture System Architecture

### Store — `src/store/uiStore.ts`

New slice to persist uploaded textures across shader switches:

```ts
uploadedTextures: { id: string; label: string; url: string }[]
addUploadedTexture: (label: string, objectUrl: string) => void
removeUploadedTexture: (id: string) => void
```

Object URLs are created via `URL.createObjectURL(file)`. They persist for the session lifetime.

### Uniform value for texture params

The uniform value stored in `shaderStore` for a `texture` param is `string | null` (a URL or null for "no texture").

### `ShaderPlayer` — new method

```ts
setTextureUniform(id: string, url: string | null): void
```

- If `url` is null: sets uniform to a 1×1 black `THREE.DataTexture` (never null — avoids WebGL sampler errors)
- If `url` is a string: uses `THREE.TextureLoader` to load, then sets uniform value
- Wrapping: `THREE.RepeatWrapping` on both axes (supports tiling via `uDisplacementScale`)

`initUniforms` is updated to initialize texture-type params to `{ value: null }`.

### `UniformManager` — texture handling

`setUniform` for texture params sets `uniforms[id].value` directly (already a `THREE.Texture | null`, loaded by ShaderPlayer before calling this).

---

## 4. TextureControl Component

**File:** `src/components/editor/controls/TextureControl.tsx`

Renders a thumbnail grid inside the ParamsPanel:

```
[ Cloud ] [ Marble ] [ Voronoi ] [ my-map.png ✕ ] [ + Upload ]
```

- Bundled textures: `<img src={asset.url}>` thumbnail, 56×56px, rounded
- Uploaded textures: same display + ✕ badge to remove from store
- Selected state: colored border + dot indicator
- Upload: hidden `<input type="file" accept="image/*">`, triggered by + card click
  - On change: `URL.createObjectURL(file)` → `uiStore.addUploadedTexture` → call `onParamChange`
- "None" link below grid to deselect

`ParamsPanel.tsx` adds a case for `type === 'texture'` rendering `<TextureControl>`.

The `onParamChange` callback signature stays `(id: string, value: UniformValue) => void`. For texture params, the value is a URL string. `BuilderPage` detects when `param.type === 'texture'` and routes the call to `playerRef.current.setTextureUniform(id, value as string | null)` instead of the regular `setUniform` path.

---

## 5. GLSL — Updated Fragment Shader

```glsl
uniform float uTime;
uniform float uAspect;
uniform float uSpeed;
uniform float uAngle;
uniform vec3  uColorA;
uniform vec3  uColorB;
uniform vec3  uColorC;
uniform float uContrast;
// New:
uniform sampler2D uDisplacementMap;
uniform float uDisplacementStrength;
uniform float uDisplacementScale;
uniform float uDisplacementSpeed;
uniform float uScale;
uniform float uFrequency;
uniform vec2  uOffset;
uniform float uGrain;
uniform float uVignette;
```

**Logic:**

```glsl
void main() {
  // 1. Sample displacement map (works even when texture is null — returns 0)
  vec2 dispUv = vUv * uDisplacementScale + uTime * uDisplacementSpeed * 0.05;
  float disp = texture2D(uDisplacementMap, dispUv).r;

  // 2. Build UV with scale, aspect, offset, displacement
  vec2 uv = vUv - 0.5;
  uv.x *= uAspect;
  uv += uOffset;
  uv *= uScale;
  uv += (disp - 0.5) * uDisplacementStrength;

  // 3. Project onto gradient direction
  vec2 dir = vec2(cos(uAngle), sin(uAngle));
  float grad = dot(uv, dir) * 1.42 + 0.5;
  float t = (grad + uTime * uSpeed * 0.1) * uFrequency;

  // 4. Cosine palette
  vec3 a = (uColorA + uColorC) * 0.5;
  vec3 b = (uColorA - uColorC) * 0.5 * uContrast;
  vec3 c = vec3(1.0);
  vec3 d = uColorB;
  vec3 color = cosPalette(t, a, b, c, d);

  // 5. Grain
  float grain = fract(sin(dot(vUv + fract(uTime * 0.1), vec2(127.1, 311.7))) * 43758.5453);
  color += (grain - 0.5) * uGrain;

  // 6. Vignette
  float dist = length(vUv - 0.5) * 2.0;
  color *= 1.0 - uVignette * dist * dist;

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
```

**Note on null sampler:** In WebGL, sampling a null/unbound texture2D returns `vec4(0.0)`. Since `disp` would be 0.0, the displacement offset becomes `(0.0 - 0.5) * uDisplacementStrength = -0.5 * strength`, which would shift the UV when no texture is loaded. Fix: initialize `uDisplacementStrength` to 0 by default, so no effect until user sets it.

---

## 6. Presets

### Updated existing presets

`sunset` and `ocean` keep new params at neutral values:
- `uScale: 1.0`, `uFrequency: 1.0`, `uOffset: [0,0]`, `uGrain: 0`, `uVignette: 0`
- `uDisplacementStrength: 0` (no displacement effect)

### New presets

**`smoky`** — Cloud displacement, moderate warp, slow drift:
```ts
{ uSpeed: 0.15, uAngle: 0.5, uColorA: '#2c2c54', uColorB: '#706fd3', uColorC: '#aaa6d0',
  uContrast: 1.1, uScale: 1.2, uFrequency: 1.0, uOffset: [0,0],
  uDisplacementStrength: 0.6, uDisplacementScale: 1.5, uDisplacementSpeed: 0.2,
  uGrain: 0.05, uVignette: 0.4 }
```

**`psychedelic`** — High frequency, grain, no displacement:
```ts
{ uSpeed: 0.8, uAngle: 1.0, uColorA: '#ff006e', uColorB: '#8338ec', uColorC: '#06d6a0',
  uContrast: 1.8, uScale: 0.8, uFrequency: 3.0, uOffset: [0,0],
  uDisplacementStrength: 0, uDisplacementScale: 1.0, uDisplacementSpeed: 0,
  uGrain: 0.15, uVignette: 0.2 }
```

---

## 7. Files Changed

| File | Change |
|------|--------|
| `src/shaders/types.ts` | Add `'texture'` to ParamType, add `TextureAsset` interface, add `assets?` and `visibleIf notNull` to ParamDef |
| `src/shaders/library/backgrounds/gradient-flow.ts` | New uniforms, updated GLSL, new presets |
| `src/assets/displacement/cloud.png` | User-provided texture (copy from three-shader-studio) |
| `src/assets/displacement/marble.png` | Static grayscale asset |
| `src/assets/displacement/voronoi.png` | Static grayscale asset |
| `src/store/uiStore.ts` | Add `uploadedTextures` slice |
| `src/core/player/ShaderPlayer.ts` | Add `setTextureUniform(id, url)` method |
| `src/core/uniforms/UniformManager.ts` | Handle texture param init (value: null) |
| `src/components/editor/controls/TextureControl.tsx` | New component |
| `src/components/editor/ParamsPanel.tsx` | Add `texture` case, wire `setTextureUniform` |
| `src/components/preview/PreviewCanvas.tsx` | Expose `setTextureUniform` via ref |

---

## Implementation Notes

- `visibleIf: { param: 'uDisplacementMap', notNull: true }` requires extending the `visibleIf` type. If this adds complexity, the displacement sliders can be always-visible for MVP (simpler, acceptable UX).
- The `marble.png` and `voronoi.png` assets can be pre-generated images committed to the repo, or generated at build time. Static files are simplest.
- `URL.createObjectURL` URLs are revoked when `uiStore.removeUploadedTexture` is called to avoid memory leaks.
