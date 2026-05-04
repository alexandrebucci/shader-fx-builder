# Effet 1 — Fond animé en bandes verticales (slit-scan)

## Objectif

Reproduire un effet d'arrière-plan où une image fixe est découpée en bandes verticales qui translatent verticalement à des vitesses/phases différentes, créant un mouvement organique. Quand les bandes sont en phase, l'image se reconstitue ; quand elles sont déphasées, l'image apparaît "fragmentée" mais reste lisible.

Référence visuelle : photo mode/produit (ex. modèle en kagool orange Adidas) qui ondule en bandes derrière une UI fixe.

## Stack

- WebGL2 (préféré) ou WebGL1 avec extension `OES_standard_derivatives`.
- Pas de dépendance ; un seul shader plein écran.
- HTML/JS vanilla. Un seul `<canvas>` plein écran.

## Structure de fichiers attendue

```
slit-scan/
├── index.html
├── main.js
├── shaders/
│   ├── fullscreen.vert
│   └── slit-scan.frag
└── assets/
    └── photo.jpg        // image source (placeholder fourni)
```

## Pipeline

Une seule passe : on dessine un quad plein écran avec le fragment shader ci-dessous. Pas de framebuffer nécessaire pour cet effet seul.

## Vertex shader (`fullscreen.vert`)

```glsl
#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
```

## Fragment shader (`slit-scan.frag`)

```glsl
#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTex;
uniform vec2  uResolution;
uniform vec2  uTexResolution;
uniform float uTime;

uniform float uBands;        // 10.0
uniform float uAmplitude;    // 0.10  (en unités UV)
uniform float uSpeed;        // 0.35
uniform float uPhaseSpread;  // 1.7
uniform float uSoftness;     // 0.10  (0 = bord franc, 1 = lissage total)
uniform float uMotionBlur;   // 0.7

vec2 coverUv(vec2 uv, vec2 res, vec2 texRes) {
    float ra = res.x / res.y;
    float rt = texRes.x / texRes.y;
    vec2 s = (ra > rt) ? vec2(1.0, rt / ra) : vec2(ra / rt, 1.0);
    return (uv - 0.5) * s + 0.5;
}

float bandOffset(float idx, float t) {
    float a = sin(t * uSpeed         + idx * uPhaseSpread);
    float b = sin(t * uSpeed * 0.61  + idx * uPhaseSpread * 1.73 + 1.3);
    return (a * 0.7 + b * 0.3) * uAmplitude;
}

void main() {
    vec2 uv = coverUv(vUv, uResolution, uTexResolution);

    float xb   = vUv.x * uBands;
    float idx  = floor(xb);
    float frac = fract(xb);

    float offA = bandOffset(idx,       uTime);
    float offB = bandOffset(idx + 1.0, uTime);

    float w = clamp(uSoftness, 0.0, 1.0) * 0.5;
    float k = smoothstep(1.0 - w, 1.0, frac);
    float dy = mix(offA, offB, k);

    vec3 col = vec3(0.0);
    const int N = 6;
    float velocity = dy * uMotionBlur;
    for (int i = 0; i < N; i++) {
        float t = (float(i) + 0.5) / float(N) - 0.5;
        vec2 sUv = vec2(uv.x, uv.y + dy + t * velocity * 0.4);
        sUv = clamp(sUv, vec2(0.0), vec2(1.0));
        col += texture(uTex, sUv).rgb;
    }
    col /= float(N);

    fragColor = vec4(col, 1.0);
}
```

## JS — squelette `main.js`

- Créer le contexte WebGL2 sur un canvas plein écran (`window.devicePixelRatio` clampé à 2).
- Charger l'image `assets/photo.jpg`, créer une texture 2D RGB, `LINEAR` min/mag, `CLAMP_TO_EDGE`.
- Compiler les deux shaders, lier le programme, récupérer les uniforms.
- Créer un VBO pour un quad `-1..1` (deux triangles) lié à `aPosition`.
- Boucle `requestAnimationFrame` :
  - Resize si nécessaire (`canvas.width = innerWidth * dpr`).
  - Mettre à jour `uTime` (en secondes).
  - Bind texture, set uniforms, draw.

## Paramètres exposés (UI dat.gui ou lil-gui)

| Uniform        | Default | Range          | Effet |
|----------------|---------|----------------|-------|
| `uBands`       | 10      | 4 – 24         | Nombre de bandes verticales |
| `uAmplitude`   | 0.10    | 0.0 – 0.25     | Course verticale max |
| `uSpeed`       | 0.35    | 0.0 – 1.5      | Vitesse globale |
| `uPhaseSpread` | 1.7     | 0.0 – 6.28     | Déphasage entre bandes |
| `uSoftness`    | 0.10    | 0.0 – 1.0      | Lissage des frontières |
| `uMotionBlur`  | 0.7     | 0.0 – 1.5      | Flou directionnel |

## Critères d'acceptation

1. Le canvas remplit la fenêtre et reste net en HiDPI.
2. À `uSoftness = 0`, on voit clairement les frontières franches entre bandes (effet "store").
3. À `uSoftness ≈ 0.1` et `uMotionBlur ≈ 0.7`, le rendu est continu, sans "stepping" visible.
4. L'image conserve son ratio d'origine (cover-fit) sans déformation horizontale.
5. Aucun warning console ; 60 fps sur un laptop standard à 1440p.

## Variations à prévoir (commentées, pas activées par défaut)

- Remplacer la somme de sinus par un FBM 2-octaves pour des trajectoires moins prévisibles.
- Mode "wrap" (`fract` sur `sUv.y`) en alternative au `clamp`, à exposer via un booléen `uWrap`.
- Multi-textures : passer un tableau d'images et faire une transition entre deux d'entre elles, déclenchée au clic.

## Image de test

Si pas d'image fournie, générer un placeholder procédural dans le shader (gradient + cercles) avec un commentaire `// TODO: remplacer par texture` pour que la démo tourne immédiatement.
