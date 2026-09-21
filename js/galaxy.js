/* =============================================================================
   galaxy.js  ·  La galaxia dorada que rodea a la flor-corazón
   -----------------------------------------------------------------------------
   Capas: estrellas lejanas · nebulosas doradas · brazo espiral · polvo cercano
          · bokeh desenfocado. Todo con partículas aditivas.
============================================================================= */
(function () {
  'use strict';
  if (!window.THREE) return;
  const F = window.Flores, C = F.CONFIG, M = F.math;

  /* Paleta dorada ponderada, compartida por todos los módulos. */
  let PALETTE = null;
  const WEIGHTS = [0.26, 0.20, 0.20, 0.16, 0.10, 0.08];
  F.pickGold = function (rnd, out) {
    if (!PALETTE) {
      const c = C.colores;
      PALETTE = [c.oro, c.ambar, c.claro, c.dorado, c.crema, 0xFFB300].map((h) => new THREE.Color(h));
    }
    let r = rnd(), i = 0, acc = WEIGHTS[0];
    while (r > acc && i < WEIGHTS.length - 1) { i++; acc += WEIGHTS[i]; }
    return out.copy(PALETTE[i]);
  };

  /* Constructor genérico de nubes de puntos (lo reutilizan orbits y heart). */
  function buildPoints(count, material, fill) {
    const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
    const size = new Float32Array(count), ph = new Float32Array(count);
    fill(pos, col, size, ph);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
    const pts = new THREE.Points(g, material);
    pts.frustumCulled = false;
    pts.renderOrder = 1;
    pts.userData.count = count;
    return pts;
  }
  F.buildPoints = buildPoints;

  F.Galaxy = class {
    constructor(shared, factor, tex) {
      const P = C.particulas, rnd = F.rng(7), tmp = new THREE.Color();
      this.group = new THREE.Group();   // lejos (parallax suave)
      this.near = new THREE.Group();    // cerca (parallax fuerte)
      this.fade = [];
      this.layers = [];
      this.nebula = [];

      /* --- 1. Estrellas lejanas --- */
      const nFar = Math.round(P.estrellasLejanas * factor);
      const mFar = F.Shaders.points(tex.glow, shared, { size: 1, opacity: 0.9, twinkle: 0.7 });
      this.far = buildPoints(nFar, mFar, (pos, col, size, ph) => {
        for (let i = 0; i < nFar; i++) {
          const r = 120 + rnd() * 95, th = rnd() * Math.PI * 2, fi = Math.acos(2 * rnd() - 1);
          pos[i * 3] = r * Math.sin(fi) * Math.cos(th);
          pos[i * 3 + 1] = r * Math.cos(fi);
          pos[i * 3 + 2] = r * Math.sin(fi) * Math.sin(th);
          tmp.setHex(rnd() < 0.7 ? C.colores.crema : (rnd() < 0.5 ? C.colores.claro : C.colores.oro));
          const b = 0.45 + 0.55 * rnd();
          col[i * 3] = tmp.r * b; col[i * 3 + 1] = tmp.g * b; col[i * 3 + 2] = tmp.b * b;
          size[i] = 0.25 + rnd() * rnd() * 0.95;
          ph[i] = rnd();
        }
      });
      this.group.add(this.far);
      this._reg(this.far, mFar);

      /* --- 2. Nebulosas doradas --- */
      this._nebula(tex, rnd, Math.max(6, Math.round(P.nebulosas * (0.5 + 0.5 * factor))));

      /* --- 3. Brazo espiral --- */
      const nSp = Math.round(P.espiral * factor);
      const mSp = F.Shaders.points(tex.glow, shared, { size: 1, opacity: 0.85, twinkle: 0.45, drift: 0.25 });
      const R = 48, ARMS = 3;
      const cIn = new THREE.Color(C.colores.claro);
      const cMid = new THREE.Color(C.colores.oro);
      const cOut = new THREE.Color(0xC77800);
      this.spiral = buildPoints(nSp, mSp, (pos, col, size, ph) => {
        for (let i = 0; i < nSp; i++) {
          const arm = i % ARMS;
          const r = Math.pow(rnd(), 1.55) * R + 1.2;
          const t = r / R;
          const a = arm * (Math.PI * 2 / ARMS) + r * 0.11 + (rnd() - 0.5) * 0.55 * (1 - 0.6 * t);
          const rr = r + (rnd() - 0.5) * 3.2;
          pos[i * 3] = Math.cos(a) * rr;
          pos[i * 3 + 1] = (rnd() - 0.5) * 2.4 * (1 - 0.7 * t);
          pos[i * 3 + 2] = Math.sin(a) * rr;
          tmp.copy(cIn).lerp(cMid, M.smooth(0, 0.5, t)).lerp(cOut, M.smooth(0.45, 1, t));
          const b = (0.4 + 0.6 * rnd()) * (1 - 0.35 * t);
          col[i * 3] = tmp.r * b; col[i * 3 + 1] = tmp.g * b; col[i * 3 + 2] = tmp.b * b;
          size[i] = (0.18 + rnd() * rnd() * 0.75) * (1 + 1.1 * (1 - t));
          ph[i] = rnd();
        }
      });
      this.pivot = new THREE.Group();
      this.pivot.position.set(0, 2, -36);
      this.pivot.rotation.set(1.12, 0, -0.35);
      this.pivot.add(this.spiral);
      this.group.add(this.pivot);
      this._reg(this.spiral, mSp);

      /* --- 4. Polvo dorado cercano --- */
      const nDust = Math.round(P.polvo * factor);
      const mDust = F.Shaders.points(tex.glow, shared, {
        size: 1, opacity: 0.9, twinkle: 0.6, drift: 0.6, rise: 0.35, box: [66, 38, 46]
      });
      this.dust = buildPoints(nDust, mDust, (pos, col, size, ph) => {
        for (let i = 0; i < nDust; i++) {
          pos[i * 3] = (rnd() - 0.5) * 66;
          pos[i * 3 + 1] = (rnd() - 0.5) * 38;
          pos[i * 3 + 2] = -14 + rnd() * 38;
          F.pickGold(rnd, tmp);
          const b = 0.5 + 0.5 * rnd();
          col[i * 3] = tmp.r * b; col[i * 3 + 1] = tmp.g * b; col[i * 3 + 2] = tmp.b * b;
          size[i] = 0.07 + rnd() * rnd() * 0.26;
          ph[i] = rnd();
        }
      });
      this.near.add(this.dust);
      this._reg(this.dust, mDust);

      /* --- 5. Bokeh --- */
      const nBok = Math.max(8, Math.round(P.bokeh * factor));
      const mBok = F.Shaders.points(tex.bokeh, shared, {
        size: 1, opacity: 0.15, twinkle: 0.35, drift: 1.2, rise: 0.15, box: [74, 42, 50]
      });
      this.bokeh = buildPoints(nBok, mBok, (pos, col, size, ph) => {
        for (let i = 0; i < nBok; i++) {
          pos[i * 3] = (rnd() - 0.5) * 74;
          pos[i * 3 + 1] = (rnd() - 0.5) * 42;
          pos[i * 3 + 2] = rnd() < 0.6 ? 6 + rnd() * 22 : -30 + rnd() * 25;
          F.pickGold(rnd, tmp);
          col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
          size[i] = 0.8 + rnd() * rnd() * 2.6;
          ph[i] = rnd();
        }
      });
      this.near.add(this.bokeh);
      this._reg(this.bokeh, mBok);

      this.spiralSpeed = 0.018;
    }

    _reg(points, material) { this.layers.push(points); this.fade.push(material); }

    _nebula(tex, rnd, n) {
      const tints = [0xFFB300, 0xFF8F00, 0xFFE082, 0xFFCA28, 0xFFA733, 0xFFD54F];
      for (let i = 0; i < n; i++) {
        const mat = new THREE.SpriteMaterial({
          map: tex.clouds[i % tex.clouds.length],
          color: tints[Math.floor(rnd() * tints.length)],
          transparent: true, opacity: 0, depthWrite: false, depthTest: false, fog: false,
          blending: THREE.AdditiveBlending
        });
        const s = new THREE.Sprite(mat);
        const size = 48 + rnd() * 58;
        s.scale.set(size, size, 1);
        s.position.set((rnd() - 0.5) * 130, (rnd() - 0.5) * 76, -48 - rnd() * 58);
        mat.rotation = rnd() * Math.PI * 2;
        s.userData.base = 0.12 + rnd() * 0.16;
        s.userData.rot = (rnd() - 0.5) * 0.02;
        this.group.add(s);
        this.nebula.push(s);
      }
    }

    /* Aparición/desaparición global (0..1). */
    setFade(v) {
      for (let i = 0; i < this.fade.length; i++) {
        const m = this.fade[i];
        m.uniforms.uOpacity.value = m.userData.baseOpacity * v;
      }
      for (let i = 0; i < this.nebula.length; i++) {
        const s = this.nebula[i];
        s.material.opacity = s.userData.base * v;
      }
    }

    /* Reduce partículas visibles sin recrear buffers (rendimiento adaptativo). */
    setDensity(f) {
      for (let i = 0; i < this.layers.length; i++) {
        const p = this.layers[i];
        p.geometry.setDrawRange(0, Math.max(1, Math.floor(p.userData.count * f)));
      }
    }

    update(dt, px, py) {
      this.spiral.rotation.y += dt * this.spiralSpeed;
      for (let i = 0; i < this.nebula.length; i++) {
        const s = this.nebula[i];
        s.material.rotation += s.userData.rot * dt;
      }
      this.group.rotation.y = px * 0.05;
      this.group.rotation.x = -py * 0.035;
      this.near.position.x = -px * 1.6;
      this.near.position.y = -py * 0.9;
    }

    dispose() {
      const kill = (o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); };
      this.layers.forEach(kill);
      this.nebula.forEach(kill);
    }
  };
})();
