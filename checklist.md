# Shader FX Builder — Checklist d'implémentation

> Approche : Vertical Slice. Chaque slice produit quelque chose qui tourne avant de passer à la suite.

---

## Slice 1 — liquid-noise end-to-end ✅
> **Objectif :** Un shader qui tourne, un slider qui change quelque chose.

- [x] Scaffolding projet (Vite + React + TS, deps, shadcn, path aliases, Vitest)
- [x] Types : `ShaderDef`, `ParamDef`, `Preset` (shaders/types.ts)
- [x] Types : `UniformDef`, `UniformValue` (core/uniforms/types.ts)
- [x] `ShaderPlayer` : init, setShader, setUniform, render loop (uTime), destroy
- [x] `liquid-noise` ShaderDef avec noise inline (uSpeed, uScale, uColorA, uColorB, uDistortion)
- [x] `shaderStore` : setShader, setUniformValue, resetUniforms
- [x] `PreviewCanvas` (basic) : mount player, sync activeShader + uniformValues
- [x] `SliderControl` + layout minimal `BuilderPage`
- [x] ✅ Milestone : liquid-noise tourne avec un slider Speed fonctionnel

## Slice 2 — Feature set complet ✅
> **Objectif :** Tous les types de contrôles, uniforms auto, layout final.

- [x] `UniformManager` + `defaults.ts` (uTime, uResolution, uAspect, uMouse)
- [x] `ShaderCompiler` : validation GLSL, parsing erreurs
- [x] `uiStore` (theme, activeTab, fps) + `shaderStore` complet (presets)
- [x] `ColorControl` (react-colorful + swatch + input HEX)
- [x] `ToggleControl` + `SelectControl` + `Vec2Control`
- [x] `ParamsPanel` (rendu dynamique selon param.type)
- [x] `PresetsPanel` (lister, charger, sauvegarder en localStorage)
- [x] `FPSCounter` + `ErrorOverlay`
- [x] `ShaderPlayer` complet : resize (ResizeObserver), mouse tracking, init typed uniforms
- [x] `PreviewCanvas` complet : tous uniforms, FPSCounter + ErrorOverlay overlays
- [x] `BuilderPage` : 3 panneaux, theme toggle, onglets Params / Presets
- [x] ✅ Milestone : liquid-noise avec tous les types de params, UI complète

## Bugs ouverts
- [x] Sliders / controls inutilisables à la souris → canvas `pointer-events-none`, mousemove sur conteneur
- [x] **Régression** : clic et drag sur les sliders (ParamsPanel) non fonctionnels — la valeur ne change pas ; de plus, toute interaction avec un slider provoque un canvas WebGL noir (le shader actif disparaît)
  - **Root cause** : Base UI `onValueChange` appelle le callback avec un `number` scalaire (pas `number[]`). `(scalar as number[])[0]` = `undefined` → uniform `uSpeed` = `undefined` → shader noir. Fix : `Array.isArray(vals) ? vals[0] : vals` dans `SliderControl` et `Vec2Control`.

## Slice 3 — 5 shaders restants + snippets ✅
> **Objectif :** Bibliothèque GLSL et 6 effets fonctionnels.

- [x] `noise.glsl` + `color.glsl` + `math.glsl` snippets
- [x] Système `// #include <name>` câblé dans `ShaderPlayer.setShader()` via `SNIPPETS`
- [x] Refactorer liquid-noise pour utiliser `// #include <noise>`
- [x] `gradient-flow` shader (backgrounds)
- [x] `particles-field` shader (backgrounds)
- [x] `wave-distort` shader (image-fx, DataTexture placeholder)
- [x] `glitch` shader (image-fx)
- [x] `chromatic-aberration` shader (image-fx)
- [x] `SHADER_LIBRARY` index (6 shaders enregistrés)
- [x] ✅ Milestone : 6 shaders compilent et rendent

## Slice 4 — Galerie ✅
> **Objectif :** Découverte intuitive des effets.

- [x] `ShaderCard` (nom, badge catégorie)
- [x] `Gallery` (liste verticale, card active surlignée)
- [x] `GalleryFilters` (stub — no-op pour MVP)
- [x] Connecter galerie → `shaderStore.setShader`
- [x] `BuilderPage` final : galerie + canvas + params en 3 colonnes
- [x] ✅ Milestone : builder complet avec galerie fonctionnelle

---

## Hors périmètre MVP (V1+)
- [ ] Interactions (Phase 4)
- [ ] Image FX scroll (Phase 5)
- [ ] Galerie avec filtres réels (Phase 6)
- [ ] Export HTML / JS / React (Phase 7)
- [ ] Capture PNG / vidéo (Phase 7.5)
- [ ] Partage par URL + react-router-dom (Phase 7.7)
- [ ] Tests Playwright (Phase 8)
- [ ] Web Worker renderer (Phase 8)
