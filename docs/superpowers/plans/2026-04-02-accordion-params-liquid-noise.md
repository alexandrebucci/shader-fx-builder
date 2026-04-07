# Accordion Params Panel + Liquid Noise Expansion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `group` field to `ParamDef`, group params into accordions in `ParamsPanel`, and expand `liquid-noise` with 12 new params across 4 categories (Animation, Structure, Color, Post-process).

**Architecture:** `ParamDef.group` is a free string. `ParamsPanel` detects when any param has a `group` and switches to accordion rendering using shadcn's `Accordion`. `liquid-noise` adds 13 new uniforms to its GLSL and 12 new `ParamDef` entries, plus assigns `group` to all existing params. `UniformManager` gets a toggle→float fix so `uPolar` (toggle type) works as `uniform float` in GLSL.

**Tech Stack:** React 18 + TypeScript, shadcn/ui Accordion, Three.js uniforms, Vitest.

**Spec:** `docs/superpowers/specs/2026-04-02-accordion-params-liquid-noise.md`

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `src/shaders/types.ts` | Modify | Add `group?: string` to `ParamDef` |
| `src/core/uniforms/UniformManager.ts` | Modify | Convert `boolean` → `1.0`/`0.0` for toggle params |
| `src/core/uniforms/__tests__/UniformManager.test.ts` | Modify | Add toggle→float test |
| `src/components/ui/accordion.tsx` | Create | shadcn install |
| `src/components/editor/ParamsPanel.tsx` | Modify | Accordion grouping logic |
| `src/shaders/library/backgrounds/liquid-noise.ts` | Modify | GLSL + 12 new params + groups + presets |

---

## Task 1: Add `group` to `ParamDef` + fix toggle→float in `UniformManager`

**Files:**
- Modify: `src/shaders/types.ts`
- Modify: `src/core/uniforms/UniformManager.ts`
- Modify: `src/core/uniforms/__tests__/UniformManager.test.ts`

- [x] **Step 1: Write the failing tests**

In `src/core/uniforms/__tests__/UniformManager.test.ts`, add after the last existing `it()`:

```ts
it('toggle param initializes as 1.0 when default is true', () => {
  const mgr = new UniformManager()
  mgr.initFromParams([
    { id: 'uPolar', label: 'Polar', type: 'toggle', default: false },
  ])
  expect(mgr.getAll().uPolar.value).toBe(0.0)
})

it('setUniform converts boolean true to 1.0', () => {
  const mgr = new UniformManager()
  mgr.initFromParams([
    { id: 'uPolar', label: 'Polar', type: 'toggle', default: false },
  ])
  mgr.setUniform('uPolar', true)
  expect(mgr.getAll().uPolar.value).toBe(1.0)
})

it('setUniform converts boolean false to 0.0', () => {
  const mgr = new UniformManager()
  mgr.initFromParams([
    { id: 'uPolar', label: 'Polar', type: 'toggle', default: false },
  ])
  mgr.setUniform('uPolar', false)
  expect(mgr.getAll().uPolar.value).toBe(0.0)
})
```

- [x] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/core/uniforms/__tests__/UniformManager.test.ts
```

Expected: last 3 tests FAIL (toggle initializes as `false` boolean, not `0.0` float).

- [x] **Step 3: Add `group` to `ParamDef` in `src/shaders/types.ts`**

Replace the `ParamDef` interface:

```ts
export interface ParamDef {
  id: string
  label: string
  type: ParamType
  group?: string
  default: number | string | boolean | [number, number]
  min?: number
  max?: number
  step?: number
  options?: { value: string; label: string }[]
  unit?: string
  description?: string
  visibleIf?:
    | { param: string; value: number | string | boolean }
    | { param: string; minValue: number }
}
```

- [x] **Step 4: Fix toggle→float in `src/core/uniforms/UniformManager.ts`**

Replace `toThreeValue`:

```ts
private toThreeValue(param: ParamDef): unknown {
  if (param.type === 'color') return new THREE.Color(param.default as string)
  if (param.type === 'vec2') {
    const v = param.default as [number, number]
    return new THREE.Vector2(v[0], v[1])
  }
  if (param.type === 'select') return parseFloat(param.default as string)
  if (param.type === 'toggle') return (param.default as boolean) ? 1.0 : 0.0
  return param.default
}
```

In `setUniform`, add a boolean check at the top of the method, before the existing `if (!(id in this.uniforms))` block:

```ts
setUniform(id: string, value: UniformValue): void {
  if (typeof value === 'boolean') {
    if (!(id in this.uniforms)) this.uniforms[id] = { value: value ? 1.0 : 0.0 }
    else this.uniforms[id].value = value ? 1.0 : 0.0
    return
  }
  if (!(id in this.uniforms)) {
    // ... rest unchanged
```

- [x] **Step 5:** Run tests to verify they pass**

```bash
npx vitest run src/core/uniforms/__tests__/UniformManager.test.ts
```

Expected: all tests PASS.

- [x] **Step 6:** Commit**

```bash
git add src/shaders/types.ts src/core/uniforms/UniformManager.ts src/core/uniforms/__tests__/UniformManager.test.ts
git commit -m "feat: add group field to ParamDef and fix toggle uniform to float conversion"
```

---

## Task 2: Install Accordion + update `ParamsPanel`

**Files:**
- Create: `src/components/ui/accordion.tsx` (via shadcn)
- Modify: `src/components/editor/ParamsPanel.tsx`

- [ ] **Step 1: Install shadcn Accordion**

```bash
npx shadcn@latest add accordion
```

Expected: creates `src/components/ui/accordion.tsx`.

- [ ] **Step 2: Update `src/components/editor/ParamsPanel.tsx`**

Replace the entire file:

```tsx
import { useShaderStore } from '@/store/shaderStore'
import {
  SliderControl,
  ColorControl,
  ToggleControl,
  SelectControl,
  Vec2Control,
} from './controls'
import type { ParamDef, ShaderDef } from '@/shaders/types'
import type { UniformValue } from '@/core/uniforms/types'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

function isVisible(
  param: ParamDef,
  uniformValues: Record<string, UniformValue>,
  activeShader: ShaderDef,
): boolean {
  if (!param.visibleIf) return true
  const { param: refId } = param.visibleIf
  const refParam = activeShader.params.find((p) => p.id === refId)
  const currentValue = uniformValues[refId] ?? refParam?.default

  if ('value' in param.visibleIf) {
    return currentValue === param.visibleIf.value
  } else {
    return Number(currentValue) >= param.visibleIf.minValue
  }
}

function ParamRow({ param }: { param: ParamDef }) {
  const value = useShaderStore((s) => s.uniformValues[param.id] ?? param.default)
  const setUniformValue = useShaderStore((s) => s.setUniformValue)

  const control = (() => {
    switch (param.type) {
      case 'range':
        return (
          <SliderControl
            param={param}
            value={value as number}
            onChange={(v) => setUniformValue(param.id, v)}
          />
        )
      case 'color':
        return (
          <ColorControl
            param={param}
            value={value as string}
            onChange={(v) => setUniformValue(param.id, v)}
          />
        )
      case 'toggle':
        return (
          <ToggleControl
            param={param}
            value={value as boolean}
            onChange={(v) => setUniformValue(param.id, v)}
          />
        )
      case 'select':
        return (
          <SelectControl
            param={param}
            value={value as string}
            onChange={(v) => setUniformValue(param.id, v)}
          />
        )
      case 'vec2':
        return (
          <Vec2Control
            param={param}
            value={value as [number, number]}
            onChange={(v) => setUniformValue(param.id, v)}
          />
        )
      default:
        return null
    }
  })()

  return (
    <div className="py-3 border-b border-border last:border-b-0">
      {param.description ? (
        <div title={param.description}>{control}</div>
      ) : (
        control
      )}
    </div>
  )
}

function groupParams(
  params: ParamDef[],
): { name: string; params: ParamDef[] }[] {
  const groups: { name: string; params: ParamDef[] }[] = []
  const groupIndex: Record<string, number> = {}

  for (const param of params) {
    const name = param.group ?? 'General'
    if (!(name in groupIndex)) {
      groupIndex[name] = groups.length
      groups.push({ name, params: [] })
    }
    groups[groupIndex[name]].params.push(param)
  }

  return groups
}

export function ParamsPanel() {
  const activeShader = useShaderStore((s) => s.activeShader)
  const uniformValues = useShaderStore((s) => s.uniformValues)

  if (!activeShader) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-6 text-center">
        Select a shader to get started
      </div>
    )
  }

  const visibleParams = activeShader.params.filter((p) =>
    isVisible(p, uniformValues, activeShader),
  )

  const hasGroups = visibleParams.some((p) => p.group !== undefined)

  if (!hasGroups) {
    return (
      <div className="overflow-y-auto h-full px-4">
        {visibleParams.map((param) => (
          <ParamRow key={param.id} param={param} />
        ))}
      </div>
    )
  }

  const groups = groupParams(visibleParams)

  return (
    <div className="overflow-y-auto h-full">
      <Accordion
        type="multiple"
        defaultValue={groups.map((g) => g.name)}
        className="w-full"
      >
        {groups.map((group) => (
          <AccordionItem key={group.name} value={group.name}>
            <AccordionTrigger className="px-4 text-sm font-medium">
              {group.name}
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-0">
              {group.params.map((param) => (
                <ParamRow key={param.id} param={param} />
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
```

- [x] **Step 3: Verify app compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [x] **Step 4: Commit**

```bash
git add src/components/ui/accordion.tsx src/components/editor/ParamsPanel.tsx
git commit -m "feat: group params into accordions in ParamsPanel"
```

---

## Task 3: Liquid-noise GLSL — new uniforms + updated logic

**Files:**
- Modify: `src/shaders/library/backgrounds/liquid-noise.ts` (FRAGMENT constant only)

- [ ] **Step 1: Replace the FRAGMENT constant**

Replace the entire `const FRAGMENT = /* glsl */\`...\`` with:

```ts
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

  // Pixelation
  if (uPixelation > 1.5) {
    uv = floor(uv * uPixelation) / uPixelation;
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/shaders/library/backgrounds/liquid-noise.ts
git commit -m "feat: add 12 new uniforms to liquid-noise GLSL (flow, pulse, symmetry, polar, hue, grain, posterize)"
```

---

## Task 4: Liquid-noise params array — add groups + 12 new params

**Files:**
- Modify: `src/shaders/library/backgrounds/liquid-noise.ts` (params array only)

- [ ] **Step 1: Replace the `params` array in the `liquidNoise` export**

Replace the entire `params: [...]` array with:

```ts
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/shaders/library/backgrounds/liquid-noise.ts
git commit -m "feat: add groups and 12 new params to liquid-noise"
```

---

## Task 5: Update liquid-noise presets

**Files:**
- Modify: `src/shaders/library/backgrounds/liquid-noise.ts` (presets array only)

- [ ] **Step 1: Replace the `presets` array**

Replace the entire `presets: [...]` array with:

```ts
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
],
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: all tests PASS.

- [x] **Step 3: Commit**

```bash
git add src/shaders/library/backgrounds/liquid-noise.ts
git commit -m "feat: update liquid-noise presets with neutral values for new params"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All 5 sections covered — `group` in ParamDef (Task 1), UniformManager toggle fix (Task 1), Accordion UI (Task 2), GLSL changes (Task 3), params array (Task 4), presets (Task 5). Section 6 (toggle fix) now in Task 1.
- [x] **No placeholders:** All steps have exact code.
- [x] **Type consistency:** `gAmplitude` declared as `float` globally in GLSL and used in `computeF`. `uFlowX`/`uFlowY` defaults 0.1/0.05 match original hardcoded values. `uPolar` default is `false` (boolean) → converted to 0.0 by the UniformManager fix in Task 1.
- [x] **Shadcn accordion:** Installed before `ParamsPanel` is modified.
- [x] **`// #include <color>`:** Added to FRAGMENT in Task 3 — `rgb2hsl`/`hsl2rgb` from `color.glsl` are available.
