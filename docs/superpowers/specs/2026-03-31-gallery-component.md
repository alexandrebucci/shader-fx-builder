---
date: 2026-03-31
title: Gallery Component (Slice 4)
status: implemented
---

# Gallery Component — Slice 4

## Context

Slice 3 completes the shader library (6 effects). Slice 4 makes them discoverable: a vertical scrollable gallery on the left panel lets the user switch between shaders with one click.

The `BuilderPage` already has a 180px left column placeholder (`<p className="text-xs text-muted-foreground">Gallery</p>`). This spec replaces that placeholder with real components.

---

## Scope

### Included

- `ShaderCard` — card component for one shader (name, category badge, description)
- `Gallery` — vertical list of ShaderCards, grouped by category, connects to store
- `GalleryFilters` — no-op stub (real filters are Phase 6 / V1)
- `BuilderPage` update — import and render Gallery, remove the placeholder
- `shaderStore` no changes needed (already has `activeShader` and `setShader`)

### Excluded

- Hover preview (requires a second WebGL context — deferred to V1)
- Search / text filter (Phase 6)
- Drag-to-reorder
- Thumbnail images (always `''` for MVP)

---

## Files

```
src/components/gallery/
  ShaderCard.tsx      ← new
  Gallery.tsx         ← new
  GalleryFilters.tsx  ← new (stub)

src/pages/
  BuilderPage.tsx     ← modified (replace placeholder, add Gallery import)
```

---

## ShaderCard

**File:** `src/components/gallery/ShaderCard.tsx`

```tsx
import { Badge } from '@/components/ui/badge'
import type { ShaderDef } from '@/shaders/types'

interface Props {
  shader: ShaderDef
  isActive: boolean
  onClick: () => void
}

export function ShaderCard({ shader, isActive, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full text-left px-2 py-2 rounded-md transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-1 mb-0.5">
        <span className="text-xs font-medium truncate">{shader.name}</span>
        <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
          {shader.category === 'background' ? 'BG' : 'FX'}
        </Badge>
      </div>
      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
        {shader.description}
      </p>
    </button>
  )
}
```

---

## Gallery

**File:** `src/components/gallery/Gallery.tsx`

Reads `SHADER_LIBRARY` (from the library index created in Slice 3). Groups shaders by category. Reads `activeShader.id` from `shaderStore` to highlight the active card.

```tsx
import { useShaderStore } from '@/store/shaderStore'
import { SHADER_LIBRARY } from '@/shaders/library'
import { ShaderCard } from './ShaderCard'

export function Gallery() {
  const setShader = useShaderStore((s) => s.setShader)
  const activeId = useShaderStore((s) => s.activeShader?.id)

  const backgrounds = SHADER_LIBRARY.filter((s) => s.category === 'background')
  const imageFx = SHADER_LIBRARY.filter((s) => s.category === 'image-fx')

  return (
    <div className="flex flex-col gap-3 p-2">
      {backgrounds.length > 0 && (
        <section>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-1">
            Backgrounds
          </p>
          <div className="flex flex-col gap-0.5">
            {backgrounds.map((shader) => (
              <ShaderCard
                key={shader.id}
                shader={shader}
                isActive={shader.id === activeId}
                onClick={() => setShader(shader)}
              />
            ))}
          </div>
        </section>
      )}

      {imageFx.length > 0 && (
        <section>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-1">
            Image FX
          </p>
          <div className="flex flex-col gap-0.5">
            {imageFx.map((shader) => (
              <ShaderCard
                key={shader.id}
                shader={shader}
                isActive={shader.id === activeId}
                onClick={() => setShader(shader)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
```

---

## GalleryFilters (stub)

**File:** `src/components/gallery/GalleryFilters.tsx`

```tsx
// Phase 6 — no-op stub for MVP
export function GalleryFilters() {
  return null
}
```

---

## BuilderPage diff

File: `src/pages/BuilderPage.tsx`

```diff
+ import { Gallery } from '@/components/gallery/Gallery'
  import { liquidNoise } from '@/shaders/library/backgrounds/liquid-noise'

  // In the JSX, replace the placeholder div content:
  {/* Gallery column */}
- <div className="w-[180px] border-r border-border overflow-y-auto shrink-0 p-2">
-   <p className="text-xs text-muted-foreground">Gallery</p>
- </div>
+ <div className="w-[180px] border-r border-border overflow-y-auto shrink-0">
+   <Gallery />
+ </div>
```

Also update the `useEffect` initialisation: instead of hardcoding `liquidNoise`, use `SHADER_LIBRARY[0]` so the first shader in the library loads by default:

```diff
+ import { SHADER_LIBRARY } from '@/shaders/library'
- import { liquidNoise } from '@/shaders/library/backgrounds/liquid-noise'

  useEffect(() => {
-   setShader(liquidNoise)
+   if (SHADER_LIBRARY.length > 0) setShader(SHADER_LIBRARY[0])
  }, [])
```

---

## Acceptance Criteria

- [ ] `ShaderCard` renders shader name, category badge (`BG` or `FX`), truncated description
- [ ] Active shader card has a visually distinct background (matches `bg-accent` or equivalent)
- [ ] Clicking an inactive card calls `shaderStore.setShader(shader)` and the WebGL canvas switches to that shader
- [ ] `Gallery` groups shaders under "Backgrounds" and "Image FX" section labels
- [ ] All 6 shaders from `SHADER_LIBRARY` appear in the gallery
- [ ] `GalleryFilters` exists and renders null without errors
- [ ] The left panel (180px) scrolls independently when the list overflows
- [ ] `BuilderPage` no longer renders the `<p>Gallery</p>` placeholder
- [ ] Initial shader loaded is `SHADER_LIBRARY[0]` (no hardcoded `liquidNoise` import in BuilderPage)
- [ ] All existing tests pass
