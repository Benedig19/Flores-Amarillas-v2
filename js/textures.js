/* =============================================================================
   textures.js  ·  Texturas generadas con <canvas> (cero imágenes externas)
   -----------------------------------------------------------------------------
   Todas se dibujan en BLANCO y se colorean después desde el shader o el sprite,
   así una misma textura sirve para oro, ámbar, crema, etc.
   Excepción: `sunflower` y `sunflowerSolid` llevan color propio (girasol real).
============================================================================= */
(function () {
  'use strict';
  if (!window.THREE) return;
  const F = window.Flores;

  function canvasOf(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h || w;
    return c;
  }

  function toTexture(c) {
    const t = new THREE.CanvasTexture(c);
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return t;
  }

  F.Textures = {

    /* Punto de luz suave: la partícula base de toda la galaxia. */
    glow() {
      const s = 128, c = canvasOf(s), g = c.getContext('2d');
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0.00, 'rgba(255,255,255,1)');
      gr.addColorStop(0.14, 'rgba(255,255,255,0.82)');
      gr.addColorStop(0.42, 'rgba(255,255,255,0.22)');
      gr.addColorStop(1.00, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
      return toTexture(c);
    },

    /* Destello de 8 puntas (los brillos que “chispean”). */
    star() {
      const s = 128, c = canvasOf(s), g = c.getContext('2d');
      g.translate(s / 2, s / 2);
      const halo = g.createRadialGradient(0, 0, 0, 0, 0, s * 0.22);
      halo.addColorStop(0, 'rgba(255,255,255,1)');
      halo.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = halo;
      g.beginPath(); g.arc(0, 0, s * 0.22, 0, Math.PI * 2); g.fill();
      const ray = (len, wid, rot) => {
        g.save(); g.rotate(rot);
        const lg = g.createLinearGradient(0, 0, len, 0);
        lg.addColorStop(0, 'rgba(255,255,255,0.95)');
        lg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = lg;
        g.beginPath(); g.moveTo(0, -wid); g.lineTo(len, 0); g.lineTo(0, wid); g.closePath(); g.fill();
        g.restore();
      };
      for (let i = 0; i < 4; i++) ray(s * 0.50, s * 0.030, i * Math.PI / 2);
      for (let i = 0; i < 4; i++) ray(s * 0.27, s * 0.018, Math.PI / 4 + i * Math.PI / 2);
      return toTexture(c);
    },

    /* Círculo desenfocado (bokeh de cámara). */
    bokeh() {
      const s = 128, c = canvasOf(s), g = c.getContext('2d');
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0.00, 'rgba(255,255,255,0.26)');
      gr.addColorStop(0.70, 'rgba(255,255,255,0.40)');
      gr.addColorStop(0.90, 'rgba(255,255,255,0.85)');
      gr.addColorStop(1.00, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
      return toTexture(c);
    },

    /* Corazón sólido (mini-corazones de las explosiones). */
    heart() {
      const s = 128, c = canvasOf(s), g = c.getContext('2d');
      g.translate(s / 2, s / 2 + 4);
      g.shadowColor = 'rgba(255,255,255,1)';
      g.shadowBlur = 14;
      g.fillStyle = 'rgba(255,255,255,0.95)';
      g.beginPath();
      for (let i = 0; i <= 90; i++) {
        const t = (i / 90) * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        const px = x * 2.35, py = (y + 2.6) * 2.35;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath(); g.fill();
      return toTexture(c);
    },

    /* Girasol en blanco (se colorea desde el shader: sirve para la forma). */
    flower() {
      return F.Textures._sunflower(128, false);
    },

    /* Girasol con color propio: los que flotan por la galaxia, como el video. */
    sunflower() {
      return F.Textures._sunflower(160, true);
    },

    _sunflower(s, colored) {
      const c = canvasOf(s), g = c.getContext('2d');
      const C = F.CONFIG.colores;
      const hex = (h) => '#' + ('000000' + h.toString(16)).slice(-6);
      g.translate(s / 2, s / 2);
      const R = s * 0.40;
      const petals = 13;                      // girasol real: muchos pétalos finos

      // Halo dorado alrededor de la flor.
      const halo = g.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 1.25);
      halo.addColorStop(0, colored ? 'rgba(255,205,80,0.40)' : 'rgba(255,255,255,0.32)');
      halo.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = halo;
      g.beginPath(); g.arc(0, 0, R * 1.25, 0, Math.PI * 2); g.fill();

      // Dos coronas de pétalos (la de atrás, girada, da volumen).
      const corona = (rot, scale, alpha) => {
        for (let i = 0; i < petals; i++) {
          g.save();
          g.rotate(rot + (i / petals) * Math.PI * 2);
          const pr = R * scale;
          const grd = g.createLinearGradient(0, -pr * 0.25, 0, -pr * 1.05);
          if (colored) {
            grd.addColorStop(0, 'rgba(255,238,170,' + alpha + ')');
            grd.addColorStop(0.45, hex(C.petaloBase));
            grd.addColorStop(1, 'rgba(240,150,10,' + (alpha * 0.75) + ')');
          } else {
            grd.addColorStop(0, 'rgba(255,255,255,' + alpha + ')');
            grd.addColorStop(0.5, 'rgba(255,255,255,' + (alpha * 0.85) + ')');
            grd.addColorStop(1, 'rgba(255,255,255,0)');
          }
          g.fillStyle = grd;
          // Pétalo en forma de gota puntiaguda.
          g.beginPath();
          g.moveTo(0, -pr * 0.18);
          g.quadraticCurveTo(pr * 0.24, -pr * 0.62, 0, -pr * 1.02);
          g.quadraticCurveTo(-pr * 0.24, -pr * 0.62, 0, -pr * 0.18);
          g.closePath();
          g.fill();
          g.restore();
        }
      };
      corona(Math.PI / petals, 0.86, 0.75);
      corona(0, 1.0, 0.95);

      // Centro de semillas.
      const centro = g.createRadialGradient(-R * 0.08, -R * 0.08, R * 0.02, 0, 0, R * 0.34);
      if (colored) {
        centro.addColorStop(0, '#8a4a03');
        centro.addColorStop(0.55, hex(C.centroFlor));
        centro.addColorStop(1, 'rgba(255,190,70,0.85)');
      } else {
        centro.addColorStop(0, 'rgba(255,255,255,1)');
        centro.addColorStop(0.5, 'rgba(255,255,255,0.9)');
        centro.addColorStop(1, 'rgba(255,255,255,0.35)');
      }
      g.fillStyle = centro;
      g.beginPath(); g.arc(0, 0, R * 0.34, 0, Math.PI * 2); g.fill();

      // Textura de semillas en espiral (phyllotaxis) — detalle fino y realista.
      if (colored) {
        g.fillStyle = 'rgba(60,28,2,0.55)';
        const gold = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < 90; i++) {
          const rr = R * 0.33 * Math.sqrt(i / 90);
          const a = i * gold;
          g.beginPath();
          g.arc(Math.cos(a) * rr, Math.sin(a) * rr, R * 0.022, 0, Math.PI * 2);
          g.fill();
        }
      }
      return toTexture(c);
    },

    /* Trazo suave para los anillos orbitales (halo elíptico). */
    ring() {
      const s = 256, c = canvasOf(s), g = c.getContext('2d');
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0.00, 'rgba(255,255,255,0)');
      gr.addColorStop(0.72, 'rgba(255,255,255,0)');
      gr.addColorStop(0.86, 'rgba(255,255,255,0.85)');
      gr.addColorStop(0.94, 'rgba(255,255,255,0.28)');
      gr.addColorStop(1.00, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
      return toTexture(c);
    },

    /* Nube dorada de fondo (nebulosa). */
    cloud(seed) {
      const s = 256, c = canvasOf(s), g = c.getContext('2d');
      const rnd = F.rng(seed);
      for (let i = 0; i < 46; i++) {
        const x = s * (0.22 + 0.56 * rnd()), y = s * (0.22 + 0.56 * rnd());
        const r = s * (0.08 + 0.2 * rnd());
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,0.13)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, s, s);
      }
      g.globalCompositeOperation = 'destination-in';
      const m = g.createRadialGradient(s / 2, s / 2, s * 0.08, s / 2, s / 2, s * 0.5);
      m.addColorStop(0, 'rgba(0,0,0,1)');
      m.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = m; g.fillRect(0, 0, s, s);
      return toTexture(c);
    },

    /* Fondo: degradado radial cálido → negro. */
    background() {
      const C = F.CONFIG.colores;
      const c = canvasOf(512), g = c.getContext('2d');
      const gr = g.createRadialGradient(256, 232, 0, 256, 232, 420);
      gr.addColorStop(0.00, C.fondoCentro);
      gr.addColorStop(0.42, C.fondoMedio);
      gr.addColorStop(1.00, C.fondoBorde);
      g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
      return toTexture(c);
    },

    /* Frase dorada escrita en canvas → sprite flotante (como en el video). */
    phrase(text) {
      const pad = 16, fontSize = 30;
      const probe = canvasOf(8, 8).getContext('2d');
      probe.font = '500 ' + fontSize + 'px Quicksand, Poppins, system-ui, sans-serif';
      const w = Math.min(760, Math.ceil(probe.measureText(text).width) + pad * 2);
      const h = fontSize + pad * 2;
      const c = canvasOf(w, h), g = c.getContext('2d');
      g.font = probe.font;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.shadowColor = 'rgba(255,190,60,0.95)';
      g.shadowBlur = 16;
      const grd = g.createLinearGradient(0, 0, w, 0);
      grd.addColorStop(0, '#FFE9A8');
      grd.addColorStop(0.5, '#FFD34D');
      grd.addColorStop(1, '#FFB020');
      g.fillStyle = grd;
      g.fillText(text, w / 2, h / 2);
      const t = toTexture(c);
      t.userData = { aspect: w / h };
      return t;
    }
  };
})();
