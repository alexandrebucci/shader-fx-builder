---
date: 2026-03-31
title: Slider Pointer Events Bug Fix
status: implemented
---

# Slider Pointer Events Bug Fix

## Context

The controls in the right panel (SliderControl, Vec2Control, ColorControl, ToggleControl) do not respond to mouse drag. The WebGL canvas renders correctly, but parameter values cannot be changed interactively. This makes the tool unusable.

Known facts:
- The layout is three separate flex columns; the canvas column (`flex-1`) and the params column (`w-[280px]`) do not visually overlap
- The controls are Radix UI primitives (shadcn/ui) — Slider uses `pointer capture` on drag
- The bug is present since Slice 2

---

## Scope

### Included

- Investigation and fix of the pointer events issue
- Verification that mouse tracking (`uMouse` uniform) still works on the canvas after fix

### Excluded

- Refactoring control components
- Touch event support (not in MVP scope)

---

## Root Cause Analysis

Three causes to investigate in priority order:

### 1. Three.js canvas capturing pointer events (most likely)

Three.js `WebGLRenderer` calls `canvas.style.touchAction = 'none'` internally, which prevents scroll but doesn't block pointer events. However, Radix UI Slider relies on `pointer capture` (`setPointerCapture`): when the user clicks the slider thumb and drags, Radix calls `thumb.setPointerCapture(pointerId)` so all subsequent `pointermove` events go to the thumb regardless of where the mouse goes.

If the canvas element has `pointer-events: auto` (the default) AND the canvas is somehow intercepting `pointerdown` at the document level, it could release the capture before Radix finishes dragging.

**Check:** In DevTools, select the slider thumb. Drag it. In the Event Listeners panel on `document`, look for `pointermove` or `pointerdown` listeners registered by Three.js.

### 2. Three.js `mousemove` listener on canvas consuming events

`ShaderPlayer.setupMouse()` registers `canvas.addEventListener('mousemove', ...)`. This is a non-capturing listener — it should not intercept events in the params column. **Not the cause** if columns don't overlap.

### 3. CSS `overflow: hidden` on parent clipping pointer events

The canvas column uses `overflow-hidden`. This affects rendering but does **not** block pointer events on siblings. **Not the cause.**

---

## Investigation Steps

1. Open the app in browser DevTools
2. Try dragging a Slider thumb — observe if any JavaScript error occurs
3. In Elements panel, select the `<canvas>` element, check its computed styles for `pointer-events`
4. In the Console, run: `document.querySelector('canvas').style.pointerEvents` — if it's `''` or `'auto'`, that's fine
5. Check if `WebGLRenderer` version being used calls `domElement.addEventListener` with capture phase: search Three.js source for `addEventListener.*true` on the renderer element
6. Try the quick fix below — if it resolves the issue, root cause confirmed

---

## Fix

### Option A — Canvas pointer-events: none + move mouse tracking to container (recommended)

Setting the canvas to `pointer-events: none` prevents it from ever intercepting clicks. Mouse tracking moves to the wrapper div, which still covers the canvas area.

**`src/components/preview/PreviewCanvas.tsx`:**

```diff
  return (
-   <div className="relative w-full h-full">
-     <canvas ref={canvasRef} className="w-full h-full" />
+   <div ref={containerRef} className="relative w-full h-full">
+     <canvas ref={canvasRef} className="w-full h-full pointer-events-none" />
      <FPSCounter />
      <ErrorOverlay />
    </div>
  )
```

Add a `containerRef` and move the `mousemove` listener registration to use the container div instead of the canvas. Pass `containerRef.current` to a new `ShaderPlayer` method or handle it directly in `PreviewCanvas`:

```tsx
const containerRef = useRef<HTMLDivElement>(null)

// In the mount useEffect, after player.init():
useEffect(() => {
  const container = containerRef.current
  if (!container || !playerRef.current) return
  const handleMouseMove = (e: MouseEvent) => {
    const rect = container.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = 1 - (e.clientY - rect.top) / rect.height
    playerRef.current?.setUniform('uMouse', [x, y])
  }
  container.addEventListener('mousemove', handleMouseMove)
  return () => container.removeEventListener('mousemove', handleMouseMove)
}, [])
```

Also remove `setupMouse()` from `ShaderPlayer` since mouse tracking is now handled in `PreviewCanvas`. Or: keep `setupMouse()` in `ShaderPlayer` but change its signature to accept an `HTMLElement` instead of `HTMLCanvasElement`.

**`src/core/player/ShaderPlayer.ts`:**

```diff
- private setupMouse(canvas: HTMLCanvasElement): void {
-   canvas.addEventListener('mousemove', (e) => {
-     const rect = canvas.getBoundingClientRect()
-     const x = (e.clientX - rect.left) / rect.width
-     const y = 1 - (e.clientY - rect.top) / rect.height
-     if (this.material) {
-       ;(this.material.uniforms.uMouse.value as THREE.Vector2).set(x, y)
-     }
-   })
- }
```

And in `init()`:
```diff
- this.setupResize(canvas)
- this.setupMouse(canvas)
+ this.setupResize(canvas)
  // Mouse tracking moved to PreviewCanvas container
```

### Option B — Quick test (if Option A seems risky)

Before implementing Option A, verify the root cause with a one-liner in the browser console:

```js
document.querySelector('canvas').style.pointerEvents = 'none'
```

Then try dragging a slider. If it works → Option A is correct. If sliders still don't work → the issue is elsewhere and needs further investigation.

---

## Verification

After the fix:

1. Open the app (`npm run dev`)
2. Drag the **Speed** slider — value should update live, canvas should react
3. Drag both axes of **Vec2Control** (if a vec2 param is visible)
4. Click a **ColorControl** swatch — color picker should open
5. Click a **ToggleControl** — should toggle state
6. Move mouse over the canvas — the `uMouse` uniform should still update (visible in shaders that use it)
7. Resize the browser window — canvas should resize correctly (ResizeObserver still works)

---

## Acceptance Criteria

- [ ] `SliderControl` responds to mouse drag — value updates live
- [ ] `Vec2Control` both axes respond to drag
- [ ] `ColorControl` opens the color picker on click
- [ ] `ToggleControl` toggles on click
- [ ] The WebGL canvas continues to render and animate after the fix
- [ ] Mouse position (`uMouse` uniform) still updates when hovering over the canvas
- [ ] No TypeScript errors introduced
- [ ] All existing tests pass
