# 🌻 Galaxia de Flores Amarillas · v2

Experiencia 3D hecha con **HTML5 + CSS3 + JavaScript ES6 + Three.js + SVG**
(sin React, Vue ni Angular). Una galaxia dorada donde miles de partículas
forman un **girasol que se transforma en corazón**, con anillos orbitales,
arco de polvo, girasoles flotantes, frases doradas, carta, galería y música.

> **Sin panel de edición.** Esta versión se personaliza editando
> `js/config.js` con tu editor de código. Es la única fuente de verdad.

---

## 🚀 Cómo abrirlo

Necesita un servidor local simple (por seguridad del navegador):

```bash
python -m http.server 8080
# abre http://localhost:8080
```

También sirve la extensión **Live Server** de VS Code, o subir la carpeta a
Netlify / Vercel / GitHub Pages (es 100 % estático).

---

## 📁 Estructura

```
index.html          estructura y etapas de la historia
css/style.css       estética dorada, tipografía, responsive
js/config.js        ⭐ TODO lo personalizable: textos, carta, frases, fotos, música, colores
js/textures.js      texturas dibujadas con <canvas> (girasol, destellos, frases…)
js/shaders.js       materiales GLSL de las partículas (incluye el morph)
js/bloom.js         resplandor dorado (post-proceso propio, sin librerías extra)
js/galaxy.js        estrellas, nebulosas, brazo espiral, polvo, bokeh
js/orbits.js        anillos orbitales + arco de polvo + cometa
js/phrases.js       frases doradas que flotan por el espacio
js/heart.js         la forma central: girasol ⇄ corazón + explosiones
js/audio.js         música de fondo + melodía ambiental generada + sonidos
js/app.js           orquesta todo: escena, etapas, parallax, toques, UI
assets/images/      tus fotos (3 a 8)
assets/music/       tu canción (music.mp3)
```

---

## ✏️ Personalizar (todo en `js/config.js`)

| Qué | Dónde |
|---|---|
| Nombre de ella | `dedication.recipient` |
| Título dorado (2 líneas) | `dedication.title`, `dedication.titleAccent` |
| Mensaje y carta | `dedication.message`, `dedication.letter[]` |
| Frases que flotan | `dedication.phrases[]` (usa `{nombre}`) |
| Fotos y pies de foto | `dedication.photos[]`, `dedication.captions[]` |
| Música | `dedication.music` |
| Colores | `Flores.CONFIG.colores` |
| Cantidad de partículas | `Flores.CONFIG.particulas` |
| Forma, pétalos, morph | `Flores.CONFIG.forma` |
| Anillos y arco | `Flores.CONFIG.anillos`, `Flores.CONFIG.arco` |
| Brillo dorado | `Flores.CONFIG.bloom` |

`{nombre}` se reemplaza automáticamente por `recipient` en cualquier texto.

**Fotos:** ponlas en `assets/images/` (foto1.jpg…foto8.jpg). Si falta alguna,
se muestra una tarjeta dorada 🌻 y nunca se ve rota.
**Música:** `assets/music/music.mp3`. Si no existe, suena una melodía
ambiental generada en vivo con Web Audio (sin derechos de autor).

---

## 🎮 Interacciones

- **Clic / toque** en la flor-corazón → explosión de chispas, corazones y
  girasoles + campanita.
- **Botón 💛 / 🌻** (arriba a la derecha) o **barra espaciadora** → transforma
  girasol ⇄ corazón. También se alterna solo cada 9 s
  (`forma.autoMorph`, `forma.autoMorphCada`).
- **💌** (abajo a la derecha) → abre la carta en cualquier momento.
- **Mouse / dedo** → parallax 3D de cámara y galaxia.
- **M** → música. **Esc** → cerrar carta o visor de fotos.
- **Clic en una foto** → visor a pantalla completa.

---

## ⚙️ Rendimiento

- 3 niveles de calidad detectados automáticamente (memoria, núcleos, móvil).
- Medidor de FPS: si baja de 42 reduce partículas; si baja de 26 apaga el bloom.
- El render se pausa cuando la pestaña no está visible.
- La cámara se aleja sola en pantallas verticales para que la forma entre entera.

## 🧱 Notas técnicas

- El morph girasol ⇄ corazón vive **en la GPU**: cada partícula guarda sus dos
  destinos (`position` y `aFlower`) y el shader interpola con `uMorph`.
- El bloom está escrito a mano (umbral → blur separable ×2 → composición), así
  no hace falta `EffectComposer` ni archivos extra de Three.js.
- Todas las texturas se generan con `<canvas>`: cero imágenes externas,
  cero fuentes con derechos de autor.
- Si no hay WebGL, la historia sigue funcionando en modo 2D con CSS.
