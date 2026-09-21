/* =============================================================================
   phrases.js  ·  Frases doradas que flotan por el espacio
   -----------------------------------------------------------------------------
   Igual que en el video: pequeños mensajes escritos en oro que derivan por la
   galaxia, aparecen y se desvanecen. Los textos salen de
   `dedication.phrases` (config.js) y se dibujan con canvas, sin fuentes de pago.
============================================================================= */
(function () {
  'use strict';
  if (!window.THREE) return;
  const F = window.Flores, C = F.CONFIG, M = F.math;

  F.Phrases = class {
    constructor(factor) {
      const cfg = C.frases;
      const lista = (window.dedication.phrases || []).map(F.tpl).filter(Boolean);
      this.group = new THREE.Group();
      this.items = [];
      this.fade = 0;
      if (!lista.length) return;

      const total = Math.max(6, Math.round(cfg.cantidad * (0.45 + 0.55 * factor)));
      const rnd = F.rng(101);

      // Una textura por frase (se comparten entre sprites repetidos).
      this.textures = lista.map((txt) => F.Textures.phrase(txt));

      for (let i = 0; i < total; i++) {
        const tex = this.textures[i % this.textures.length];
        const mat = new THREE.SpriteMaterial({
          map: tex, transparent: true, opacity: 0, depthWrite: false, depthTest: false,
          blending: THREE.AdditiveBlending
        });
        const sp = new THREE.Sprite(mat);
        const aspect = (tex.userData && tex.userData.aspect) || 6;
        sp.userData = {
          aspect,
          base: cfg.opacidad * (0.55 + 0.7 * rnd()),
          vel: new THREE.Vector3((rnd() - 0.5) * cfg.deriva, (0.05 + rnd() * 0.22), (rnd() - 0.5) * 0.12),
          life: rnd(),                       // ciclo 0..1
          speed: 0.035 + rnd() * 0.045,
          scale: cfg.escala * (0.62 + rnd() * 0.75)
        };
        this._place(sp, rnd, true);
        this.group.add(sp);
        this.items.push(sp);
      }
      this._rnd = rnd;
    }

    /* Coloca la frase evitando el centro (donde vive la flor-corazón). */
    _place(sp, rnd, inicial) {
      let x, y, r;
      let tries = 0;
      do {
        x = (rnd() - 0.5) * 68;
        y = (rnd() - 0.5) * 40 - (inicial ? 0 : 6);
        r = Math.sqrt(x * x + y * y);
        tries++;
      } while (r < 13 && tries < 12);
      const z = -26 + rnd() * 34;
      sp.position.set(x, y, z);
      const s = sp.userData.scale * (1 + (z + 26) / 90);
      sp.scale.set(s * sp.userData.aspect, s, 1);
    }

    setFade(v) { this.fade = v; }

    setDensity(f) {
      const visibles = Math.max(3, Math.floor(this.items.length * f));
      for (let i = 0; i < this.items.length; i++) this.items[i].visible = i < visibles;
    }

    update(dt) {
      if (!this.items.length) return;
      const rnd = this._rnd;
      for (let i = 0; i < this.items.length; i++) {
        const sp = this.items[i];
        const u = sp.userData;
        u.life += dt * u.speed;
        if (u.life >= 1) { u.life = 0; this._place(sp, rnd, false); }
        sp.position.addScaledVector(u.vel, dt);
        // Entra y sale con suavidad (nunca aparece de golpe).
        const inOut = Math.min(M.smooth(0, 0.18, u.life), 1 - M.smooth(0.78, 1, u.life));
        sp.material.opacity = u.base * inOut * this.fade;
      }
    }

    dispose() {
      this.items.forEach((s) => s.material.dispose());
      (this.textures || []).forEach((t) => t.dispose());
    }
  };
})();
