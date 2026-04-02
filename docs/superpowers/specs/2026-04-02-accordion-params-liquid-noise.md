# Accordion Params Panel + Liquid Noise Expansion

**Date:** 2026-04-02  
**Scope:** All shaders (data model) + liquid-noise (12 new params)

---

## 1. Data Model

### ParamDef — new field

```ts
interface ParamDef {
  id: string
  label: string
  type: 'range' | 'color' | 'toggle' | 'select' | 'vec2'
  group?: string   // ← new optional field
  default: number | string | boolean | [number, number]
  min?: number
  max?: number
  step?: number
  options?: { value: string; label: string }[]
  unit?: string
  description?: string
  visibleIf?: { param: string; value?: string; minValue?: number }
}
```

- `group` is a free string — no global registry.
- If absent, the param falls into a `"General"` group rendered at the top.
- Group order follows the order of first appearance in the `params` array.

---

## 2. ParamsPanel — Accordion UI

### Behavior

- Groups params by `group` field, preserving first-appearance order.
- Each group renders as a shadcn `<Accordion>` item.
- All accordions open by default (no state persistence for MVP).
- `visibleIf` is evaluated before grouping. Hidden params are excluded from their group's count. If all params in a group are hidden, the accordion item is not rendered.
- Shaders with no `group` on any param render a flat list (current behavior preserved).

### Component structure

```
ParamsPanel
└── if any param has group → AccordionGrouped
│     └── Accordion (shadcn)
│           └── AccordionItem per group
│                 └── AccordionContent → existing control components
└── else → flat list (current behavior)
```

No new control components needed. Existing `SliderControl`, `ColorControl`, etc. are reused as-is.

---

## 3. Liquid Noise — Param Groups + 12 New Params

### Full param table (existing + new)

| Group | Param | Type | New? | Range / Options | Default |
|-------|-------|------|------|-----------------|---------|
| Animation | uSpeed | range | — | 0–2 | 0.4 |
| Animation | uFlowX | range | ✅ | -1–1 | 0.1 |
| Animation | uFlowY | range | ✅ | -1–1 | 0.05 |
| Animation | uPulse | range | ✅ | 0–1 | 0 |
| Animation | uPulseFreq | range | ✅ | 0.1–4 | 1.0 |
| Animation | uTimeOffset | range | ✅ | 0–100 | 0 |
| Structure | uScale | range | — | 0.5–6 | 2.0 |
| Structure | uAngle | range | — | 0–6.28 | 0 |
| Structure | uSymmetry | select | ✅ | None/Mirror H/Mirror V/Radial 4 | None |
| Structure | uVignette | range | ✅ | 0–1 | 0 |
| Structure | uPolar | toggle | ✅ | — | false |
| Noise | uNoiseType | select | — | FBM/Simplex | FBM |
| Noise | uOctaves | range | — | 1–8 | 5 |
| Noise | uPersistence | range | — | 0.1–1.0 | 0.5 |
| Noise | uLacunarity | range | — | 1.0–4.0 | 2.0 |
| Noise | uNoiseFreq | range | — | 0.1–5.0 | 1.0 |
| Noise | uAmplitude | range | — | 0.1–2.0 | 1.0 |
| Noise | uDistortion | range | — | 0–3 | 1.2 |
| Noise | uDomainWarp | select | — | None/1 Pass/2 Passes | 1 Pass |
| Color | uColorCount | range | — | 2–5 | 3 |
| Color | uColor1–5 | color | — | — | (existing) |
| Color | uBrightness | range | — | 0–2 | 1.0 |
| Color | uContrast | range | — | 0.5–2 | 1.0 |
| Color | uColorOffset | range | — | 0–0.3 | 0 |
| Color | uHueShift | range | ✅ | 0–1 | 0 |
| Color | uSaturation | range | ✅ | 0–2 | 1.0 |
| Post-process | uBlur | range | — | 0–5 | 0 |
| Post-process | uPixelation | range | — | 1–128 | 1 |
| Post-process | uGrain | range | ✅ | 0–0.5 | 0 |
| Post-process | uPosterize | range | ✅ | 0–16 | 0 |

### visibleIf rules for new params

- `uPulseFreq` → `visibleIf: { param: 'uPulse', minValue: 0.01 }`
- `uOctaves`, `uPersistence`, `uLacunarity` → already `visibleIf: { param: 'uNoiseType', value: '0' }` (unchanged)

---

## 4. GLSL Changes (liquid-noise fragment)

### New uniforms to declare

```glsl
uniform float uFlowX;
uniform float uFlowY;
uniform float uPulse;
uniform float uPulseFreq;
uniform float uTimeOffset;
uniform float uSymmetry;   // 0=None, 1=MirrorH, 2=MirrorV, 3=Radial4
uniform float uVignette;
uniform float uPolar;      // 0.0 or 1.0
uniform float uHueShift;
uniform float uSaturation;
uniform float uGrain;
uniform float uPosterize;
```

### Behavioral changes

**FlowX/FlowY:** Replace hardcoded `vec2(0.1, 0.05)` and `vec2(0.3, 0.1)` offsets in `computeF` with `vec2(uFlowX, uFlowY)` scaled per warp pass.

**Pulse:** Modulate `uAmplitude` with `1.0 + uPulse * sin(t * uPulseFreq * 6.28)` before calling `computeF`.

**TimeOffset:** Add `uTimeOffset` to `t` when computing `t = uTime * uSpeed + uTimeOffset`.

**Symmetry:** Applied to `p` after aspect correction and rotation:
- Mirror H (`uSymmetry == 1.0`): `p.x = abs(p.x)`
- Mirror V (`uSymmetry == 2.0`): `p.y = abs(p.y)`
- Radial 4 (`uSymmetry == 3.0`): `p = abs(p)`

**Polar:** Applied to `p` before noise sampling: `p = vec2(length(p), atan(p.y, p.x))`.

**Vignette:** After color computation: `color *= 1.0 - uVignette * length(uv - 0.5) * 2.0`.

**HueShift + Saturation:** Applied to final `color` in HSL space using `color.glsl` helpers (rgb2hsl / hsl2rgb).

**Grain:** `color += (hash(vUv + t) - 0.5) * uGrain` using a simple hash function inlined.

**Posterize:** `color = floor(color * uPosterize) / uPosterize` when `uPosterize >= 2.0`.

---

## 5. Presets

All 4 existing presets (deep-sea, aurora, molten, monochrome) updated with neutral values for all new params:
- uFlowX: existing hardcoded value (0.1), uFlowY: 0.05
- uPulse: 0, uPulseFreq: 1.0, uTimeOffset: 0
- uSymmetry: '0', uVignette: 0, uPolar: false
- uHueShift: 0, uSaturation: 1.0
- uGrain: 0, uPosterize: 0

---

## 6. UniformManager — Toggle Fix

`toggle` params currently pass a raw `boolean` to Three.js, which is invalid for `uniform float` in GLSL. Fix required in `UniformManager`:

- `toThreeValue`: add `if (param.type === 'toggle') return param.default === true ? 1.0 : 0.0`
- `setUniform`: add `if (typeof value === 'boolean') return this.uniforms[id].value = value ? 1.0 : 0.0`

This fix is needed before `uPolar` (and any future toggle param) can work correctly.

---

## 7. Out of Scope

- Accordion state persistence (localStorage) — V1+
- Group field on existing non-liquid-noise shaders — V1+ (they render flat for now)
- EdgeDetect, Threshold — too GPU-heavy for MVP
