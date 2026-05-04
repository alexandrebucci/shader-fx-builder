# Effet 2 — Carte glassmorphism (verre dépoli) en WebGL

## Objectif

Reproduire une carte UI rectangulaire à coins arrondis qui se comporte comme un panneau de verre dépoli posé devant une scène de fond : flou prononcé du backdrop, légère teinte claire, bord lumineux (rim light), refraction subtile au niveau du contour.

L'effet doit fonctionner par-dessus n'importe quelle scène de fond animée. Pour la démo, fournir un fond simple (image qui défile, ou gradient animé) — la carte est le sujet.

## Stack

- WebGL2 (préféré).
- HTML/JS vanilla, aucune dépendance externe.
- Plusieurs framebuffers : un pour le fond, plusieurs pour la pyramide de blur.

## Structure de fichiers attendue

```
glass-card/
├── index.html
├── main.js
├── shaders/
│   ├── fullscreen.vert
│   ├── background.frag        // fond de démo (gradient animé ou image)
│   ├── downsample.frag        // copy + half-res
│   ├── blur.frag              // gaussien séparable
│   └── glass-card.frag        // la carte
└── assets/
    └── (optionnel)
```

## Pipeline en 6 passes

```
1. background.frag      → fboBg          (taille écran)
2. downsample.frag      → fboBg_½        (½ résolution)
3. blur.frag (H)        → fboBg_½H       (½ résolution)
4. blur.frag (V)        → fboBg_½B       (½ résolution, blurred)
5. blit fboBg → screen                   (fond net)
6. glass-card.frag      → screen         (la carte, samples fboBg_½B)
```

Pour un blur plus large sans alourdir le shader, ajouter une seconde pyramide (¼ res H+V) et l'utiliser comme `uBgBlurred` à la place du ½.

## Vertex shader plein écran (`fullscreen.vert`)

```glsl
#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
```

## Vertex shader de la carte (`glass-card.vert`)

```glsl
#version 300 es
in vec2 aPosition;          // -1..1 sur le quad de la carte
out vec2 vLocal;            // pixels, centrés sur la carte
out vec2 vScreenUv;         // UV plein écran 0..1

uniform vec2 uCardCenter;   // pixels
uniform vec2 uCardHalfSize; // pixels
uniform vec2 uResolution;

void main() {
    vec2 worldPx = uCardCenter + aPosition * uCardHalfSize;
    vLocal = aPosition * uCardHalfSize;
    vec2 clip = (worldPx / uResolution) * 2.0 - 1.0;
    clip.y *= -1.0;          // origine top-left
    vScreenUv = worldPx / uResolution;
    vScreenUv.y = 1.0 - vScreenUv.y;
    gl_Position = vec4(clip, 0.0, 1.0);
}
```

## Downsample (`downsample.frag`)

Box filter 2×2 sur 4 samples linéaires (équivalent 4-tap kawase).

```glsl
#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTex;
uniform vec2 uTexel;
void main() {
    vec3 c =
        texture(uTex, vUv + vec2(-1.0, -1.0) * uTexel).rgb +
        texture(uTex, vUv + vec2( 1.0, -1.0) * uTexel).rgb +
        texture(uTex, vUv + vec2(-1.0,  1.0) * uTexel).rgb +
        texture(uTex, vUv + vec2( 1.0,  1.0) * uTexel).rgb;
    fragColor = vec4(c * 0.25, 1.0);
}
```

## Blur séparable gaussien (`blur.frag`)

```glsl
#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTex;
uniform vec2 uTexel;     // 1.0 / résolution du FBO source
uniform vec2 uDir;       // (1,0) horizontal | (0,1) vertical

const float W[5] = float[](0.227027, 0.194594, 0.121622, 0.054054, 0.016216);

void main() {
    vec3 col = texture(uTex, vUv).rgb * W[0];
    for (int i = 1; i < 5; i++) {
        vec2 off = uDir * uTexel * float(i);
        col += texture(uTex, vUv + off).rgb * W[i];
        col += texture(uTex, vUv - off).rgb * W[i];
    }
    fragColor = vec4(col, 1.0);
}
```

## Carte (`glass-card.frag`)

```glsl
#version 300 es
precision highp float;

in vec2 vLocal;
in vec2 vScreenUv;
out vec4 fragColor;

uniform sampler2D uBgBlurred;
uniform vec2  uCardHalfSize;
uniform vec2  uResolution;
uniform float uRadius;       // 28.0
uniform float uBorder;       // 1.5
uniform vec3  uTint;         // vec3(1.0)
uniform float uTintAlpha;    // 0.10
uniform float uRefraction;   // 6.0
uniform float uChromaAb;     // 1.5  (px)
uniform float uTime;

float sdRoundRect(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

void main() {
    float d  = sdRoundRect(vLocal, uCardHalfSize, uRadius);
    float aa = fwidth(d);
    float inside = 1.0 - smoothstep(-aa, aa, d);
    if (inside < 0.001) discard;

    // Refraction au bord
    vec2 grad = vec2(dFdx(d), dFdy(d));
    grad = (length(grad) > 1e-5) ? normalize(grad) : vec2(0.0);
    float edgeFactor = 1.0 - smoothstep(0.0, 24.0, -d);
    vec2 refractPx   = -grad * edgeFactor * uRefraction;
    vec2 sampleUv    = vScreenUv + refractPx / uResolution;

    // Aberration chromatique : décalage R/B le long du gradient
    vec2 caOff = -grad * edgeFactor * uChromaAb / uResolution;
    float r = texture(uBgBlurred, sampleUv + caOff).r;
    float g = texture(uBgBlurred, sampleUv          ).g;
    float b = texture(uBgBlurred, sampleUv - caOff).b;
    vec3 blurred = vec3(r, g, b);

    // Teinte
    vec3 col = mix(blurred, uTint, uTintAlpha);

    // Sur-saturation pour compenser le blur
    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(vec3(lum), col, 1.10);

    // Rim light (haut-gauche éclairé)
    float borderMask = 1.0 - smoothstep(0.0, uBorder, abs(d));
    float lightDir   = clamp((-vLocal.x - vLocal.y) /
                             max(uCardHalfSize.x, uCardHalfSize.y), 0.0, 1.0);
    float rim = borderMask * (0.35 + 0.65 * lightDir);
    col += vec3(1.0) * rim * 0.5;

    // Inner shadow bas
    float bottomShade = smoothstep(uCardHalfSize.y - 40.0, uCardHalfSize.y, vLocal.y);
    col *= 1.0 - bottomShade * 0.08;

    // Bruit anti-banding
    float n = fract(sin(dot(vScreenUv, vec2(12.9898, 78.233))) * 43758.5453);
    col += (n - 0.5) * 0.015;

    fragColor = vec4(col, inside * 0.96);
}
```

## Contenu DOM par-dessus

La carte WebGL ne porte que le verre. Le **texte** ("Kagool", description, logo Adidas) doit être un overlay HTML positionné en absolute par-dessus le canvas, aligné sur les coords `uCardCenter` / `uCardHalfSize`. Cela garantit la netteté typo et la sélection du texte.

```html
<div class="glass-overlay">
  <img class="logo" src="logo.svg" />
  <h1>Kagool</h1>
  <hr />
  <p>Fitted kagool with a punchy 90s outdoor edge…</p>
</div>
```

CSS : `position: absolute; pointer-events: none; color: white;` plus un `text-shadow` très léger pour la lisibilité.

## Paramètres exposés

| Uniform       | Default     | Range        | Effet |
|---------------|-------------|--------------|-------|
| `uRadius`     | 28          | 0 – 60       | Coins arrondis |
| `uBorder`     | 1.5         | 0 – 4        | Épaisseur du liseré |
| `uTint`       | (1, 1, 1)   | RGB          | Couleur de teinte |
| `uTintAlpha`  | 0.10        | 0 – 0.4      | Force de la teinte |
| `uRefraction` | 6.0         | 0 – 20       | Distorsion au bord (px) |
| `uChromaAb`   | 1.5         | 0 – 6        | Aberration chromatique (px) |
| Blur radius   | ½ res, 1×HV | —            | À doubler pour flou plus marqué |

## Critères d'acceptation

1. La carte est nettement perçue comme du verre : on lit le fond à travers, mais flouté.
2. Les bords ont une légère brillance (rim) et une distorsion subtile (refraction visible si le fond a des contrastes au niveau du bord).
3. Le texte HTML overlay est parfaitement net, anti-aliasé.
4. Aucune coupure visible entre le quad de la carte et le fond (anti-aliasing du SDF correct).
5. 60 fps en 1440p sur GPU intégré récent.
6. Pas de banding sur les zones de gradient lent du fond (grâce au bruit final).

## Démo de fond

Pour `background.frag`, un fond simple suffit :

```glsl
#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform float uTime;
void main() {
    vec3 a = vec3(0.95, 0.45, 0.15);
    vec3 b = vec3(0.10, 0.20, 0.25);
    float t = 0.5 + 0.5 * sin(uTime * 0.3 + vUv.x * 3.0);
    vec3 col = mix(a, b, smoothstep(0.2, 0.8, vUv.y + 0.2 * sin(vUv.x * 6.0 + uTime)));
    col = mix(col, a, 0.3 * t);
    fragColor = vec4(col, 1.0);
}
```

Idéalement, **on remplacera ce fond par l'effet 1 (slit-scan)** pour reproduire la vidéo finale. Le shader de la carte n'a pas à savoir d'où vient son backdrop : il sample simplement `uBgBlurred`.

## Étapes recommandées d'implémentation

1. Mettre en place le canvas + le quad plein écran + un fond gradient animé (sanity check).
2. Ajouter le pipeline downsample + blur séparable, afficher le résultat plein écran pour vérifier le flou.
3. Ajouter le quad de la carte avec juste le mask SDF (couleur opaque) pour valider la position et les coins.
4. Intégrer le sample du backdrop flouté + tint.
5. Ajouter rim, refraction, aberration, bruit final.
6. Poser l'overlay HTML par-dessus.
