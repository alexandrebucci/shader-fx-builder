# Shader FX Builder — Checklist d'implémentation

> Approche : Vertical Slice. Chaque slice produit quelque chose qui tourne avant de passer à la suite.

---

## Slice 5 — Accordion params + liquid-noise expansion ✅
> **Objectif :** Params groupés en accordéons + 12 nouveaux params sur liquid-noise.
> **Plan complet :** `docs/superpowers/plans/2026-04-02-accordion-params-liquid-noise.md`

- [x] **Task 1** — `group?: string` dans `ParamDef` + fix toggle→float dans `UniformManager` (+ tests)
- [x] **Task 2** — Install shadcn Accordion + refactor `ParamsPanel` avec groupement
- [x] **Task 3** — GLSL liquid-noise : 13 nouveaux uniforms + logique (flow, pulse, symmetry, polar, hue, grain, posterize)
- [x] **Task 4** — Params array : `group` sur tous les params existants + 12 nouveaux params
- [x] **Task 5** — Presets : valeurs neutres pour les nouveaux params

---

## Slice 6 — Gradient Flow Extended + Texture System ✅
> **Objectif :** 9 nouveaux params sur gradient-flow (scale, frequency, offset, grain, vignette, displacement map × 3) + système texture complet (TextureControl, upload, assets statiques).
> **Spec :** `docs/superpowers/specs/2026-04-07-gradient-flow-extended.md`
> **Plan :** `docs/superpowers/plans/2026-04-10-gradient-flow-extended.md`

- [x] **Task 1** — Type extensions: `'texture'` ParamType, `TextureAsset`, `notNull` visibleIf, `null` in UniformValue
- [x] **Task 2** — UniformManager: texture param initializes to null (TDD)
- [x] **Task 3** — uiStore: `uploadedTextures` slice (add + remove + object URL revocation)
- [x] **Task 4** — ShaderPlayer: `setTextureUniform(id, url)` + init in `initUniforms`
- [x] **Task 5** — Assets: generation script + cloud.png + marble.png + voronoi.png
- [x] **Task 6** — gradient-flow.ts: updated GLSL, 9 new grouped params, 4 presets
- [x] **Task 7** — TextureControl: thumbnail grid, upload, None, remove uploaded
- [x] **Task 8** — ParamsPanel: texture case + notNull isVisible
- [x] **Task 9** — PreviewCanvas: texture routing in uniform sync

**Refinements post-implémentation :**
- [x] Déplacement statique : suppression de `uDisplacementSpeed` (dispUv = `vUv * uDisplacementScale`, pas d'animation)
- [x] `uDisplacementScale` max réduit de 5 → 1 (évite les artefacts de répétition)
- [x] `uPixelation` ajouté au groupe Style (range 1–128, même logique que liquid-noise)
- [x] `uDisplacementStrength` default 0 → 0.5
- [x] `ColorControl` : picker rendu via `createPortal` sur `document.body` (fix clipping `overflow:hidden` des accordéons)

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

## Backlog — Nouveaux effets à intégrer
> **Spec docs :** `docs/new-effects/`

### Slit-scan (fond image en bandes verticales déphasées)
> **Doc :** `docs/new-effects/effect-slit-scan.md`
> **Complexité :** faible — single-pass fragment shader, compatible avec `ShaderPlayer` actuel.
> **Pré-requis :** ✅ système texture (Slice 6) — réutilise `TextureControl` + `setTextureUniform`.
> **Catégorie :** `backgrounds`.

- [ ] GLSL `slit-scan.frag` adapté à `ShaderDef` (uniforms : `uTex`, `uTexResolution`, `uBands`, `uAmplitude`, `uSpeed`, `uPhaseSpread`, `uSoftness`, `uMotionBlur`)
- [ ] Helper `coverUv` (déjà similaire à wave-distort) — éventuellement extraire en snippet `cover-uv.glsl`
- [ ] Param `uTex` type `texture` + assets photo placeholders (générer ou réutiliser)
- [ ] Params groupés (Bands / Motion / Style) selon convention Slice 5
- [ ] 2–3 presets (calme, ondulant, fragmenté)
- [ ] Enregistrement dans `SHADER_LIBRARY`

### Glassmorphism (carte verre dépoli)
> **Doc :** `docs/new-effects/effect-glassmorphism.md`
> **Complexité :** élevée — pipeline 6 passes avec FBO pyramide blur, refraction SDF, rim light.
> **Blocage architecture :** `ShaderPlayer` actuel = single-pass. Refactor requis pour pipeline multi-pass + FBOs.
> **Catégorie :** `image-fx` (overlay sur backdrop).

- [ ] Spike : prototyper le pipeline multi-pass dans une branche séparée pour valider
- [ ] Décision architecture : étendre `ShaderPlayer` (passes déclaratives dans `ShaderDef`) vs. composant dédié
- [ ] Si refactor `ShaderPlayer` : `passes: PassDef[]` + gestion FBOs (alloc, resize, ping-pong)
- [ ] GLSL `downsample.frag` + `blur.frag` (gaussien séparable H/V) + `glass-card.frag` (SDF + refraction + rim + chroma ab)
- [ ] Vertex shader spécifique `glass-card.vert` (quad UI positionné en pixels, pas plein écran)
- [ ] Uniforms carte : `uCardCenter`, `uCardHalfSize`, `uRadius`, `uBorder`, `uTint`, `uTintAlpha`, `uRefraction`, `uChromaAb`
- [ ] Composer avec slit-scan en backdrop (cas démo de la doc)
- [ ] Overlay HTML sur le canvas (texte net) — pattern à documenter pour les exports futurs

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
