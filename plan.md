# Shader FX Builder — Plan

## Concept

Un outil web qui permet à des designers et développeurs web de créer des effets WebGL visuels sans écrire de GLSL. L'utilisateur choisit un shader dans une galerie, ajuste ses paramètres via des sliders, connecte des interactions (hover, scroll, drag), puis exporte le tout sous forme de code intégrable.

Le projet se divise en deux modes d'usage :

- **FX Builder** — créer un effet en standalone (canvas, background animé, overlay)
- **Image FX** — appliquer un effet à des images dans le contexte d'une page, déclenché au scroll

---

## Stack technique

| Rôle | Outil | Raison |
|------|-------|--------|
| Framework | React 18 + TypeScript | Ecosystème, typage, composition |
| Build | Vite | DX rapide, HMR, ESM natif |
| WebGL | Three.js | Ecosystème riche, ShaderMaterial, post-processing, texttures |
| UI Components | shadcn/ui | Slider, Tabs, Select, Sheet, Badge — accessibles, dark theme, customisables |
| Styles | Tailwind CSS | Cohérence avec shadcn, utilitaire |
| Color picker | react-colorful | ~2KB, sans dépendances |
| État global | Zustand | Simple, performant, pas de boilerplate |
| Éditeur code | CodeMirror 6 | Mode GLSL, léger, extensible (mode avancé optionnel) |
| Tests | Vitest + Playwright | Unit + tests visuels |

### Pourquoi Three.js

Three.js est l'écosystème WebGL le plus mature et le plus documenté. Pour ce projet, il apporte plusieurs avantages concrets : `ShaderMaterial` et `RawShaderMaterial` pour les shaders custom, `TextureLoader` pour les images, `EffectComposer` + passes de post-processing si on veut aller plus loin, et une communauté immense avec des exemples pour chaque type d'effet. Le surcoût de bundle (~600KB non minifié, ~170KB gzippé) est acceptable et peut être réduit via tree-shaking avec les imports nommés (`three/src/...`).

### Pourquoi shadcn/ui

shadcn copie les composants directement dans le projet (pas une librairie externe), ce qui permet une customisation complète. Les composants utilisés : `Slider`, `Tabs`, `Select`, `Switch`, `Badge`, `Card`, `Sheet`, `Tooltip`, `Dialog`, `Separator`. Le thème dark est natif et correspond bien à un outil de creative coding.

---

## Architecture

```
src/
│
├── core/                          # Moteur indépendant du framework
│   ├── player/
│   │   ├── ShaderPlayer.ts        # Classe principale Three.js : init, render loop, resize
│   │   ├── ShaderCompiler.ts      # Compilation GLSL, gestion erreurs
│   │   └── WorkerRenderer.ts      # Rendu sur OffscreenCanvas (Web Worker)
│   ├── uniforms/
│   │   ├── UniformManager.ts      # Synchronise le store → uniforms Three.js
│   │   ├── types.ts               # Types : UniformDef, UniformValue, UniformType
│   │   └── defaults.ts            # uTime, uResolution, uAspect, uMouse…
│   └── interactions/
│       ├── InteractionManager.ts  # Orchestrateur des modules
│       ├── MouseInteraction.ts    # uMouse: vec2, uHover: float
│       ├── ScrollInteraction.ts   # uScroll: float, uScrollVelocity: float
│       ├── DragInteraction.ts     # uDrag: vec2, uDragVelocity: vec2
│       └── types.ts               # Interface InteractionModule
│
├── shaders/
│   ├── library/
│   │   ├── backgrounds/           # liquid-noise, gradient-flow, voronoi, particles…
│   │   ├── image-fx/              # wave-distort, glitch, chromatic-aberration…
│   │   ├── scroll-fx/             # parallax-distort, reveal-wipe, zoom-blur…
│   │   └── index.ts               # Export de tous les ShaderDef[]
│   ├── snippets/
│   │   ├── noise.glsl             # Perlin 2D/3D, Simplex, FBM
│   │   ├── sdf.glsl               # Formes SDF : cercle, rect, hexagone
│   │   ├── color.glsl             # HSL↔RGB, palette cosine, grade
│   │   └── math.glsl              # Easing, rotate2D, map/remap
│   └── types.ts                   # Types : ShaderDef, ParamDef, ParamType
│
├── image-fx/
│   ├── ImageFXEngine.ts           # Détection DOM, overlay canvas, lifecycle
│   ├── ScrollProgress.ts          # IntersectionObserver + scroll tracker par image
│   └── ImageFXManager.ts          # API publique : init([selector], options)
│
├── store/
│   ├── shaderStore.ts             # Shader actif, uniforms courants, presets
│   ├── interactionStore.ts        # Bindings interaction → param
│   └── uiStore.ts                 # État UI : sidebar, mode, galerie
│
├── components/
│   ├── gallery/
│   │   ├── Gallery.tsx            # Grille des effets
│   │   ├── ShaderCard.tsx         # Card avec thumbnail + preview au hover
│   │   └── GalleryFilters.tsx     # Catégories, tags, recherche
│   ├── editor/
│   │   ├── ParamsPanel.tsx        # Render dynamique des contrôles
│   │   ├── controls/
│   │   │   ├── SliderControl.tsx
│   │   │   ├── ColorControl.tsx
│   │   │   ├── ToggleControl.tsx
│   │   │   ├── SelectControl.tsx
│   │   │   └── Vec2Control.tsx
│   │   ├── InteractionsPanel.tsx  # Bindings interaction → param
│   │   └── PresetsPanel.tsx       # Presets par shader
│   ├── preview/
│   │   ├── PreviewCanvas.tsx      # Canvas Three.js + resize
│   │   ├── FPSCounter.tsx         # Indicateur FPS
│   │   └── ErrorOverlay.tsx       # Affichage erreurs GLSL
│   └── export/
│       ├── ExportDialog.tsx       # Modal d'export
│       ├── ExportHTML.ts          # Générateur HTML standalone
│       ├── ExportJS.ts            # Générateur module ES
│       └── ExportReact.ts         # Générateur composant React
│
├── pages/
│   ├── BuilderPage.tsx            # Layout principal : sidebar + canvas
│   ├── GalleryPage.tsx            # Galerie complète
│   └── DemoPage.tsx               # Démo scroll FX sur images
│
└── lib/
    ├── utils.ts                   # Helpers généraux
    └── shadcn components…         # Composants shadcn copiés ici
```

---

## Modèle de données

### ShaderDef — définit un effet

```ts
interface ShaderDef {
  id: string
  name: string
  category: 'background' | 'image-fx' | 'scroll-fx' | 'overlay' | 'text'
  tags: string[]
  thumbnail: string
  description: string
  vertex: string
  fragment: string
  params: ParamDef[]
  supportedInteractions: InteractionType[]
  presets: Preset[]
}
```

### ParamDef — définit un paramètre exposé

```ts
interface ParamDef {
  id: string               // nom de l'uniform dans le shader
  label: string            // label affiché à l'utilisateur
  type: 'range' | 'color' | 'toggle' | 'select' | 'vec2'
  default: number | string | boolean | [number, number]
  min?: number
  max?: number
  step?: number
  options?: { value: string; label: string }[]
  unit?: string            // ex: "px", "°", "x"
  description?: string     // tooltip explicatif
}
```

### InteractionBinding — lie une interaction à un paramètre

```ts
interface InteractionBinding {
  interactionType: 'mouse' | 'scroll' | 'drag' | 'click'
  uniformSource: string    // ex: "uScroll"
  targetParam: string      // id du param dans ShaderDef.params
  multiplier: number       // coefficient
  inverted: boolean
  easing: EasingFunction
}
```

---

## Flux utilisateur principal

```
Galerie → Sélection d'un shader
       → Chargement du ShaderDef
       → Initialisation du ShaderPlayer (Three.js)
       → Génération dynamique du ParamsPanel
       → Édition en temps réel via sliders → update uniforms
       → Activation des interactions → binding UI
       → Clic Export → choix du format → téléchargement
```

---

## Système d'export

Chaque format d'export génère du code minimal, auto-contenu :

**HTML standalone**
Un seul fichier `.html` avec Three.js chargé via CDN (`esm.sh` ou `unpkg`) + le shader + le JS d'interactions. Ouvrable directement dans le navigateur.

**Module ES (Vanilla JS)**
```js
import { init } from './shader-fx.js'
const { destroy } = init(canvasElement, { speed: 1.5, colorA: '#ff6b6b' })
```

**React component**
```tsx
import LiquidNoise from './LiquidNoise'
<LiquidNoise speed={1.5} colorA="#ff6b6b" interaction="scroll" />
```

**Image FX (scroll)**
```html
<img src="photo.jpg" data-fx="wave-distort" data-fx-intensity="0.8" />
<script src="image-fx.js"></script>
```

---

## Phases de développement

## Approche d'implémentation : Vertical Slice

Plutôt que de construire couche par couche, le MVP est implémenté en 4 tranches verticales. Chaque tranche produit quelque chose qui tourne.

| Slice | Livrable |
|-------|----------|
| 1 | `liquid-noise` de bout en bout : canvas → ShaderPlayer → `uSpeed` → 1 slider → rendu live |
| 2 | Tous les types de params, auto-uniforms, store complet, layout final |
| 3 | 5 shaders restants + snippets GLSL |
| 4 | Galerie + layout split-screen 3 panneaux |

Toutes les tâches des phases 1–3 sont conservées, l'ordre seul change.

### Layout MVP
Split screen unique (pas de react-router-dom) :
- Galerie verticale scrollable (180px, gauche)
- Canvas WebGL (flex: 1, centre)
- Panneau paramètres (280px, droite) avec onglets Params / Presets

### Hors périmètre MVP
- Interactions (mouse/scroll/drag) → Phase 4
- Image FX scroll → Phase 5
- Export → Phase 7
- Capture PNG/vidéo → Phase 7.5
- Tests Playwright → Phase 8
- react-router-dom + partage URL → Phase 7.7

### MVP — Phase 1 à 3
Player WebGL + panneau de contrôle + 6 shaders de qualité. L'utilisateur peut choisir un shader, ajuster ses paramètres en temps réel et prévisualiser.

### V1 — Phase 4 à 7
Interactions (mouse/scroll/drag) bindables aux params, effets scroll sur images, galerie complète avec filtres, export dans tous les formats.

### V2 — Phase 8
Performance, accessibilité, tests, onboarding, documentation.

---

## Décisions techniques à revisiter en V1

- **Tree-shaking Three.js** : utiliser les imports nommés (`import { WebGLRenderer } from 'three'`) pour réduire le bundle, vérifier avec `rollup-plugin-visualizer`
- **Post-processing** : Three.js `EffectComposer` permet d'ajouter des passes (bloom, FXAA, etc.) sur les effets existants — à envisager pour les effets premium
- **Web Worker pour le rendu** : optionnel pour le MVP, à ajouter si des lags UI sont constatés
- **Système de presets partagés** : une API backend minimale pourrait permettre le partage communautaire (hors scope MVP)

---

## État d'implémentation — 2026-04-02

### MVP (Phases 1–3) — ✅ Terminé

| Slice | Statut | Notes |
|-------|--------|-------|
| 1 — liquid-noise bout en bout | ✅ | Canvas, ShaderPlayer, 1 slider, rendu live |
| 2 — Types de params, store, layout | ✅ | range, color, select, toggle, vec2, ParamsPanel, PresetsPanel |
| 3 — 5 shaders restants + snippets GLSL | ✅ | gradient-flow, particles-field, wave-distort, glitch, chromatic-aberration |
| 4 — Galerie + layout split-screen | ✅ | Galerie verticale 180px, canvas flex, params 280px |

### Améliorations post-MVP appliquées

**liquid-noise — 6 params ajoutés (2026-04-02)**
Fichier : `src/shaders/library/backgrounds/liquid-noise.ts`

| Param | Uniform GLSL | Effet |
|-------|-------------|-------|
| Angle | `uAngle` | Rotation de l'espace de sampling |
| Noise Freq | `uNoiseFreq` | Fréquence du bruit indépendante du zoom |
| Amplitude | `uAmplitude` | Intensité des pics/vallées avant mapping palette |
| Blur | `uBlur` | Blur 5-samples (box average) |
| Color Offset | `uColorOffset` | Décalage chromatique par canal R/G/B |
| Pixelation | `uPixelation` | Quantisation UV en blocs pixel |

Le GLSL a été refactorisé : helper `computeF(vec2 p)` extrait du `main()` pour permettre le multi-sampling (blur + color offset). Variable globale `t` déclarée au niveau module. Les 4 presets ont été mis à jour avec les valeurs neutres des nouveaux params.

### Prochaines étapes (V1)

- [ ] Phase 4 — Interactions (mouse/scroll/drag bindables aux params)
- [ ] Phase 5 — Image FX scroll (canvas overlay sur `<img>`)
- [ ] Phase 7 — Export (HTML standalone, module ES, React component)
- [ ] Phase 7.5 — Capture PNG/vidéo
- [ ] Phase 7.7 — react-router-dom + partage URL
- [ ] Phase 8 — Tests Playwright, accessibilité, onboarding
