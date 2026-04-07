---
date: 2026-03-31
title: Shader Library Index
status: implemented
---

# Shader Library Index

## Context

As Slice 3 completes, the project will contain six ShaderDef files spread across two subdirectories (`backgrounds/` and `image-fx/`). Without a central index, any module that needs the full list of shaders — the sidebar picker, the store initialiser, tests — must import each file individually and maintain that list in sync manually.

A single `src/shaders/library/index.ts` solves this by:

- Providing one canonical `SHADER_LIBRARY` array that is the authoritative source of all shaders.
- Running a lightweight `validateShaderLibrary()` check at startup so structural mistakes (duplicate IDs, missing params, unknown param types) surface as console warnings in development rather than as silent runtime bugs.
- Making `shaderStore.ts` trivially easy to initialise from real data instead of a hardcoded stub.

## Scope

### Included

- `src/shaders/library/index.ts` — new file, full implementation.
- `src/store/shaderStore.ts` — minimal change: import `SHADER_LIBRARY` and expose it via a new `shaders` field; no logic removed.

### Excluded

- The six ShaderDef source files themselves (they are assumed to exist and export a valid `ShaderDef` by Slice 3).
- Any UI changes (sidebar, picker).
- Unit tests for `validateShaderLibrary` (covered in a separate test spec).
- Preset persistence or migration logic.

## Files

| Action   | Path                                  |
|----------|---------------------------------------|
| Create   | `src/shaders/library/index.ts`        |
| Modify   | `src/store/shaderStore.ts`            |

## Full source for `index.ts`

```ts
// src/shaders/library/index.ts

import type { ShaderDef } from '@/shaders/types'

import { liquidNoise }          from './backgrounds/liquid-noise'
import { gradientFlow }         from './backgrounds/gradient-flow'
import { particlesField }       from './backgrounds/particles-field'
import { waveDistort }          from './image-fx/wave-distort'
import { glitch }               from './image-fx/glitch'
import { chromaticAberration }  from './image-fx/chromatic-aberration'

export const SHADER_LIBRARY: ShaderDef[] = [
  liquidNoise,
  gradientFlow,
  particlesField,
  waveDistort,
  glitch,
  chromaticAberration,
]

const VALID_PARAM_TYPES = new Set(['range', 'color', 'toggle', 'select', 'vec2'])

export function validateShaderLibrary(): void {
  const seenIds = new Set<string>()

  for (const shader of SHADER_LIBRARY) {
    // Check for duplicate IDs
    if (seenIds.has(shader.id)) {
      console.warn(
        `[shader-library] Duplicate shader ID: "${shader.id}". ` +
        `Each ShaderDef must have a unique id.`
      )
    }
    seenIds.add(shader.id)

    // Check that every shader has at least one param
    if (!shader.params || shader.params.length === 0) {
      console.warn(
        `[shader-library] Shader "${shader.id}" has no params. ` +
        `Every ShaderDef must expose at least one ParamDef.`
      )
    }

    // Check that every param has a recognised type
    for (const param of shader.params ?? []) {
      if (!VALID_PARAM_TYPES.has(param.type)) {
        console.warn(
          `[shader-library] Shader "${shader.id}", param "${param.id}" ` +
          `has unknown type "${param.type}". ` +
          `Valid types: ${[...VALID_PARAM_TYPES].join(', ')}.`
        )
      }
    }
  }
}

// Run validation once when the module is first imported.
validateShaderLibrary()
```

### Design notes

- `validateShaderLibrary` **never throws**. It emits `console.warn` so development builds surface problems without crashing the app.
- The function is exported so tests can call it directly and spy on `console.warn`.
- `validateShaderLibrary()` is called at module-load time (bottom of file) so it runs automatically when any module imports from `index.ts`, without requiring callers to remember to invoke it.
- `VALID_PARAM_TYPES` mirrors the union defined in `src/shaders/types.ts` (`'range' | 'color' | 'toggle' | 'select' | 'vec2'`). If that union changes, this set must be updated in sync. A future refactor could derive the set from the type at build time.

## Exact diff for `shaderStore.ts`

The current `shaderStore.ts` does **not** contain a hardcoded shader array. It manages only the _active_ shader and its runtime state (uniform values, compilation errors, presets). The change required is therefore minimal: add `SHADER_LIBRARY` as a readable field so any component that needs the full list (e.g. a sidebar picker) can read it from the store rather than importing `index.ts` directly.

```diff
--- a/src/store/shaderStore.ts
+++ b/src/store/shaderStore.ts
@@ -1,6 +1,7 @@
 import { create } from 'zustand'
 import type { ShaderDef, Preset } from '@/shaders/types'
 import type { UniformValue } from '@/core/uniforms/types'
 import type { CompilationError } from '@/core/player/ShaderCompiler'
+import { SHADER_LIBRARY } from '@/shaders/library'

 interface ShaderStore {
   activeShader: ShaderDef | null
+  shaders: ShaderDef[]
   uniformValues: Record<string, UniformValue>
   compilationErrors: CompilationError[] | null
   presets: Preset[]
@@ -19,6 +21,7 @@ export const useShaderStore = create<ShaderStore>((set, get) => ({
   activeShader: null,
+  shaders: SHADER_LIBRARY,
   uniformValues: {},
   compilationErrors: null,
   presets: [],
```

No existing logic is removed. The `setShader`, `setUniformValue`, `resetUniforms`, `setCompilationErrors`, `savePreset`, and `loadPreset` actions are unchanged.

After the change, a sidebar component can access the list as:

```ts
const shaders = useShaderStore((s) => s.shaders)
```

## Acceptance criteria

- [ ] `src/shaders/library/index.ts` exists and compiles without TypeScript errors (`tsc --noEmit`).
- [ ] `SHADER_LIBRARY` exported from `index.ts` contains exactly 6 entries, one for each ShaderDef listed in the scope.
- [ ] All 6 entries satisfy the `ShaderDef` interface (TypeScript structurally verifies this at import time).
- [ ] `validateShaderLibrary()` is called automatically on module load — no manual invocation required by callers.
- [ ] When two shaders share the same `id`, `validateShaderLibrary()` emits a `console.warn` containing the duplicate ID and does not throw.
- [ ] When a shader has zero params, `validateShaderLibrary()` emits a `console.warn` containing the shader ID and does not throw.
- [ ] When a param has an unknown type, `validateShaderLibrary()` emits a `console.warn` containing the shader ID, param ID, and the bad type, and does not throw.
- [ ] `shaderStore.ts` imports `SHADER_LIBRARY` from `@/shaders/library`.
- [ ] `useShaderStore` exposes a `shaders` field typed as `ShaderDef[]` whose value is `SHADER_LIBRARY`.
- [ ] Existing store actions (`setShader`, `setUniformValue`, `resetUniforms`, `setCompilationErrors`, `savePreset`, `loadPreset`) remain unchanged and all existing tests pass.
