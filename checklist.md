# Shader FX Builder — Checklist d'implémentation

> Approche : Vertical Slice. Chaque slice produit quelque chose qui tourne avant de passer à la suite.

---

## Slice 1 — liquid-noise end-to-end
> **Objectif :** Un shader qui tourne, un slider qui change quelque chose.

- [ ] Scaffolding projet (Vite + React + TS, deps, shadcn, path aliases, Vitest)
- [ ] Types : `ShaderDef`, `ParamDef`, `Preset` (shaders/types.ts)
- [ ] Types : `UniformDef`, `UniformValue` (core/uniforms/types.ts)
- [ ] `ShaderPlayer` : init, setShader, setUniform, render loop (uTime), destroy
- [ ] `liquid-noise` ShaderDef avec noise inline (uSpeed, uScale, uColorA, uColorB, uDistortion)
- [ ] `shaderStore` : setShader, setUniformValue, resetUniforms
- [ ] `PreviewCanvas` (basic) : mount player, sync activeShader + uniformValues
- [ ] `SliderControl` + layout minimal `BuilderPage`
- [ ] ✅ Milestone : liquid-noise tourne avec un slider Speed fonctionnel

## Slice 2 — Feature set complet
> **Objectif :** Tous les types de contrôles, uniforms auto, layout final.

- [ ] `UniformManager` + `defaults.ts` (uTime, uResolution, uAspect, uMouse)
- [ ] `ShaderCompiler` : validation GLSL, parsing erreurs
- [ ] `uiStore` (theme, activeTab, fps) + `shaderStore` complet (presets)
- [ ] `ColorControl` (react-colorful + swatch + input HEX)
- [ ] `ToggleControl` + `SelectControl` + `Vec2Control`
- [ ] `ParamsPanel` (rendu dynamique selon param.type)
- [ ] `PresetsPanel` (lister, charger, sauvegarder en localStorage)
- [ ] `FPSCounter` + `ErrorOverlay`
- [ ] `ShaderPlayer` complet : resize (ResizeObserver), mouse tracking, init typed uniforms
- [ ] `PreviewCanvas` complet : tous uniforms, erreurs, flag StrictMode
- [ ] `BuilderPage` : 3 panneaux, theme toggle, onglets Params / Presets
- [ ] ✅ Milestone : liquid-noise avec tous les types de params, UI complète

## Slice 3 — 5 shaders restants + snippets
> **Objectif :** Bibliothèque GLSL et 6 effets fonctionnels.

- [ ] `noise.glsl` + `color.glsl` + `math.glsl` snippets
- [ ] Système `// #include <name>` dans `ShaderCompiler.resolveIncludes()`
- [ ] Refactorer liquid-noise pour utiliser `// #include <noise>`
- [ ] `gradient-flow` shader (backgrounds)
- [ ] `particles-field` shader (backgrounds)
- [ ] `wave-distort` shader (image-fx, DataTexture placeholder)
- [ ] `glitch` shader (image-fx)
- [ ] `chromatic-aberration` shader (image-fx)
- [ ] `SHADER_LIBRARY` index + validation au démarrage
- [ ] ✅ Milestone : 6 shaders compilent et rendent

## Slice 4 — Galerie
> **Objectif :** Découverte intuitive des effets.

- [ ] `ShaderCard` (nom, badge catégorie, preview au hover)
- [ ] `Gallery` (liste verticale, card active surlignée)
- [ ] `GalleryFilters` (stub — no-op pour MVP)
- [ ] Connecter galerie → `shaderStore.setShader`
- [ ] `BuilderPage` final : galerie + canvas + params en 3 colonnes
- [ ] ✅ Milestone : builder complet avec galerie fonctionnelle

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
