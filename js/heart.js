/* =============================================================================
   heart.js  ·  LA FORMA CENTRAL: girasol ⇄ corazón
   -----------------------------------------------------------------------------
   Como en el video: miles de partículas doradas forman un girasol que se
   transforma en un corazón y viceversa, respira, brilla y reacciona al tocarla.

   Cada partícula guarda DOS destinos (corazón en `position`, girasol en
   `aFlower`) y el shader interpola entre ambos con `uMorph`. No se recalcula
   nada en la CPU: la transformación es prácticamente gratis.
============================================================================= */
(function () {
  'use strict';
  if (!window.THREE) return;
  const F = window.Flores, C = F.CONFIG, M = F.math;
  const TAU = Math.PI * 2;

  /* Curva clásica del corazón. */
  function heartXY(t) {
    return [
      16 * Math.pow(Math.sin(t), 3),
      13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
    ];
  }

  F.Heart = class {
    constructor(shared, factor, tex) {
      const P = C.particulas, S = C.forma, rnd = F.rng(21), tmp = new THREE.Color();
      this.group = new THREE.Group();
      this.cfg = S;

      /* Uniforms que controlan la forma (compartidos por sus 3 capas). */
      this.uForm   = { value: 0 };
      this.uAppear = { value: 0 };
      this.uGlowV  = { value: 0.5 };
      this.uPulseV = { value: 0 };
      this.uMorph  = { value: S.morphInicial };
      this.uSpin   = { value: 0 };
      const U = {
        uForm: this.uForm, uAppear: this.uAppear, uGlow: this.uGlowV,
        uPulse: this.uPulseV, uMorph: this.uMorph, uSpin: this.uSpin
      };

      /* ------------------------------------------------------------------
         1) Nube principal de puntos
      ------------------------------------------------------------------ */
      const nPts = Math.round(P.formaPuntos * factor);
      const mPts = F.Shaders.morph(tex.glow, shared, U, { size: 0.50, opacity: 0.95, twinkle: 0.35 });
      this.points = this._build(nPts, mPts, rnd, tmp, {
        heart: () => this._heartPoint(rnd, S.rimCorazon),
        flower: () => this._flowerPoint(rnd, S.petalos),
        size: 1
      });
      this.group.add(this.points);

      /* ------------------------------------------------------------------
         2) Destellos (textura de estrella): los brillos que chispean
      ------------------------------------------------------------------ */
      const nStar = Math.round(P.formaEstrellas * factor);
      const mStar = F.Shaders.morph(tex.star, shared, U, { size: 0.55, opacity: 0.95, twinkle: 0.6 });
      this.stars = this._build(nStar, mStar, rnd, tmp, {
        heart: () => this._heartPoint(rnd, 0.85),
        flower: () => this._flowerPoint(rnd, S.petalos, true),
        size: 1.35
      });
      this.group.add(this.stars);

      /* ------------------------------------------------------------------
         3) Flores pequeñas sobre la forma
      ------------------------------------------------------------------ */
      const nFl = Math.round(P.formaFlores * factor);
      const mFl = F.Shaders.morph(tex.flower, shared, U, { size: 0.50, opacity: 0.9, twinkle: 0.18 });
      this.flowers = this._build(nFl, mFl, rnd, tmp, {
        heart: () => this._heartPoint(rnd, 0.35),
        flower: () => this._flowerPoint(rnd, S.petalos),
        size: 3.2
      });
      this.group.add(this.flowers);

      /* ------------------------------------------------------------------
         4) Girasoles flotando libres por la galaxia
      ------------------------------------------------------------------ */
      const nFloat = Math.round(P.floresFlotantes * factor);
      const mFloat = F.Shaders.points(tex.sunflower, shared, {
        size: 0.50, opacity: 0.95, twinkle: 0.2, drift: 0.45, rise: 0.16,
        box: [70, 40, 50], keepColor: true, normalBlend: true
      });
      this.floating = F.buildPoints(nFloat, mFloat, (pos, col, size, ph) => {
        for (let i = 0; i < nFloat; i++) {
          // Evita el centro para no tapar la forma.
          let x, y, tries = 0;
          do { x = (rnd() - 0.5) * 70; y = (rnd() - 0.5) * 40; tries++; }
          while (x * x + y * y < 120 && tries < 10);
          pos[i * 3] = x;
          pos[i * 3 + 1] = y;
          pos[i * 3 + 2] = -24 + rnd() * 46;
          tmp.setHex(rnd() < 0.7 ? C.colores.petaloBase : C.colores.petaloAlto);
          col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
          size[i] = 1.4 + rnd() * rnd() * 3.2;
          ph[i] = rnd();
        }
      });
      this.floating.renderOrder = 3;
      this.group.add(this.floating);
      this.floatingMat = mFloat;

      /* ------------------------------------------------------------------
         5) Reserva de explosión (chispas + mini-corazones + girasoles)
      ------------------------------------------------------------------ */
      this.burstSparks = this._burstLayer(P.chispas, F.Shaders.burst(tex.star, shared));
      this.burstHearts = this._burstLayer(P.corazonesMini, F.Shaders.burst(tex.heart, shared));
      this.burstFlowers = this._burstLayer(Math.round(P.corazonesMini * 0.6), F.Shaders.burst(tex.flower, shared));
      this.group.add(this.burstSparks, this.burstHearts, this.burstFlowers);
      this._particles = [];

      this.breathe = 0;
      this.elapsed = 0;
      this.formDuration = C.tiempos.union;

      /* Estado del morph. */
      this._morphFrom = S.morphInicial;
      this._morphTo = S.morphInicial;
      this._morphT = 1;
      this._autoTimer = 0;
    }

    /* ---------- Muestreo de formas ---------------------------------------- */

    /* Punto del corazón: `rim` decide qué proporción va al contorno. */
    _heartPoint(rnd, rim) {
      const t = rnd() * TAU;
      const [hx, hy] = heartXY(t);
      let s;
      if (rnd() < rim) s = 0.90 + rnd() * 0.12;   // silueta luminosa
      else s = Math.sqrt(rnd()) * 0.92;           // relleno
      return [hx * s, hy * s + 1.2, 1];
    }

    /* Punto del girasol: núcleo de semillas + pétalos. */
    _flowerPoint(rnd, petalos, soloBorde) {
      if (!soloBorde && rnd() < 0.24) {
        // Núcleo (semillas).
        const a = rnd() * TAU, r = 5.0 * Math.sqrt(rnd());
        return [Math.cos(a) * r, Math.sin(a) * r, 0];
      }
      const th = rnd() * TAU;
      const lobe = Math.pow(Math.abs(Math.cos(petalos * th * 0.5)), 0.55);
      const rmax = 5.6 + 10.6 * lobe;
      const k = soloBorde ? (0.78 + rnd() * 0.24) : Math.sqrt(0.18 + 0.82 * rnd());
      const r = rmax * k;
      return [Math.cos(th) * r, Math.sin(th) * r, 1];
    }

    /* ---------- Construcción de una capa ---------------------------------- */
    _build(count, material, rnd, tmp, opt) {
      const S = this.cfg;
      const pos = new Float32Array(count * 3);       // destino corazón
      const flo = new Float32Array(count * 3);       // destino girasol
      const start = new Float32Array(count * 3);     // origen en el espacio
      const delay = new Float32Array(count);
      const size = new Float32Array(count);
      const ph = new Float32Array(count);
      const colA = new Float32Array(count * 3);      // color girasol
      const colB = new Float32Array(count * 3);      // color corazón

      for (let i = 0; i < count; i++) {
        // --- destino corazón
        const h = opt.heart();
        const zH = (rnd() - 0.5) * S.profundidad * (1 - Math.min(1, Math.abs(h[1]) / 16) * 0.4);
        pos[i * 3] = h[0] * S.escala;
        pos[i * 3 + 1] = h[1] * S.escala;
        pos[i * 3 + 2] = zH;

        // --- destino girasol
        const f = opt.flower();
        const esPetalo = f[2] === 1;
        const zF = (rnd() - 0.5) * S.profundidad * (esPetalo ? 0.35 : 0.9);
        flo[i * 3] = f[0] * S.escala;
        flo[i * 3 + 1] = f[1] * S.escala;
        flo[i * 3 + 2] = zF;

        // --- origen lejano
        const r = 62 + rnd() * 72, th = rnd() * TAU, fi = Math.acos(2 * rnd() - 1);
        start[i * 3] = r * Math.sin(fi) * Math.cos(th);
        start[i * 3 + 1] = r * Math.cos(fi) * 0.6 + 4;
        start[i * 3 + 2] = r * Math.sin(fi) * Math.sin(th) - 20;

        delay[i] = rnd();
        size[i] = (0.55 + rnd() * rnd() * 0.95) * (opt.size || 1);
        ph[i] = rnd();

        // --- colores
        const cf = esPetalo
          ? (rnd() < 0.72 ? C.colores.petaloBase : C.colores.petaloAlto)
          : (rnd() < 0.6 ? C.colores.centroFlor : C.colores.naranja);
        tmp.setHex(cf);
        let b = 0.75 + 0.35 * rnd();
        colA[i * 3] = tmp.r * b; colA[i * 3 + 1] = tmp.g * b; colA[i * 3 + 2] = tmp.b * b;

        tmp.setHex(rnd() < 0.55 ? C.colores.luzCorazon : (rnd() < 0.6 ? C.colores.oro : C.colores.ambar));
        b = 0.78 + 0.35 * rnd();
        colB[i * 3] = tmp.r * b; colB[i * 3 + 1] = tmp.g * b; colB[i * 3 + 2] = tmp.b * b;
      }

      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aFlower', new THREE.BufferAttribute(flo, 3));
      g.setAttribute('aStart', new THREE.BufferAttribute(start, 3));
      g.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1));
      g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
      g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
      g.setAttribute('aColor', new THREE.BufferAttribute(colA, 3));
      g.setAttribute('aColorB', new THREE.BufferAttribute(colB, 3));
      const pts = new THREE.Points(g, material);
      pts.frustumCulled = false;
      pts.renderOrder = 2;
      pts.userData.count = count;
      return pts;
    }

    _burstLayer(n, material) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1));
      g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(n), 1));
      const pts = new THREE.Points(g, material);
      pts.frustumCulled = false;
      pts.renderOrder = 4;
      pts.userData.n = n;
      return pts;
    }

    /* ---------- API pública ------------------------------------------------ */

    setDensity(f) {
      [this.points, this.stars, this.flowers, this.floating].forEach((p) => {
        p.geometry.setDrawRange(0, Math.max(1, Math.floor(p.userData.count * f)));
      });
    }

    /* Arranca la formación (las partículas vuelan desde el espacio). */
    startForming() {
      this.elapsed = 0;
      this.uForm.value = 0;
      this.uAppear.value = 1;
    }

    /* Cambia de forma. destino: 0 = corazón · 1 = girasol · undefined = alterna */
    morphTo(destino) {
      const actual = this.uMorph.value;
      const t = destino === undefined ? (actual > 0.5 ? 0 : 1) : destino;
      if (Math.abs(t - this._morphTo) < 0.01 && this._morphT < 1) return;
      this._morphFrom = actual;
      this._morphTo = t;
      this._morphT = 0;
      this._autoTimer = 0;
      return t;
    }

    get esGirasol() { return this.uMorph.value > 0.5; }

    /* Explosión de partículas en un punto local de la forma. */
    burst(point, fuerza) {
      fuerza = fuerza || 1;
      const rnd = Math.random;
      const tmp = new THREE.Color();
      const capas = [
        { pts: this.burstSparks, n: this.burstSparks.userData.n, vel: [7, 10], size: [0.5, 1.6], grav: 1.4, vida: [0.9, 0.7], color: () => (rnd() < 0.5 ? C.colores.oro : C.colores.claro) },
        { pts: this.burstHearts, n: this.burstHearts.userData.n, vel: [3, 4], size: [2.4, 2.6], grav: 0.6, vida: [1.1, 0.6], color: () => C.colores.luzCorazon },
        { pts: this.burstFlowers, n: this.burstFlowers.userData.n, vel: [2.5, 4.5], size: [2.6, 3.4], grav: 0.5, vida: [1.2, 0.7], color: () => C.colores.petaloBase }
      ];
      this._particles.length = 0;
      capas.forEach((capa) => {
        const at = capa.pts.geometry.attributes;
        for (let i = 0; i < capa.n; i++) {
          const dir = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
          const speed = (capa.vel[0] + rnd() * capa.vel[1]) * fuerza;
          at.position.array[i * 3] = point.x;
          at.position.array[i * 3 + 1] = point.y;
          at.position.array[i * 3 + 2] = point.z;
          tmp.setHex(capa.color());
          at.aColor.array[i * 3] = tmp.r;
          at.aColor.array[i * 3 + 1] = tmp.g;
          at.aColor.array[i * 3 + 2] = tmp.b;
          at.aSize.array[i] = capa.size[0] + rnd() * capa.size[1];
          at.aAlpha.array[i] = 1;
          this._particles.push({
            at, idx: i, vel: dir.multiplyScalar(speed),
            life: 0, max: capa.vida[0] + rnd() * capa.vida[1], grav: capa.grav
          });
        }
        at.aColor.needsUpdate = true;
        at.aSize.needsUpdate = true;
      });
      this.uPulseV.value = 1;
    }

    update(dt, t) {
      const S = this.cfg;

      /* Formación inicial. */
      if (this.uForm.value < 1) {
        this.elapsed += dt;
        this.uForm.value = M.clamp(this.elapsed / this.formDuration, 0, 1);
      }

      /* Transformación girasol ⇄ corazón. */
      if (this._morphT < 1) {
        this._morphT = M.clamp(this._morphT + dt / S.morphDuracion, 0, 1);
        const e = M.easeInOut(this._morphT);
        this.uMorph.value = M.lerp(this._morphFrom, this._morphTo, e);
        this.uSpin.value = Math.sin(this._morphT * Math.PI) * 0.75;   // giro durante el cambio
      } else {
        this.uSpin.value = M.damp(this.uSpin.value, 0, 3, dt);
        if (S.autoMorph && this.uForm.value >= 1) {
          this._autoTimer += dt;
          if (this._autoTimer > S.autoMorphCada) this.morphTo();
        }
      }

      /* Respiración, balanceo y brillo. */
      this.breathe += dt;
      const b = 1 + Math.sin(this.breathe * 1.15) * S.respiracion;
      this.group.scale.set(b, b, b);
      this.group.rotation.y = Math.sin(this.breathe * 0.25) * S.giro;
      this.group.rotation.z = Math.sin(this.breathe * 0.19) * 0.03;
      this.uGlowV.value = 0.5 + 0.5 * Math.sin(this.breathe * 1.15);

      /* El pulso del toque decae. */
      this.uPulseV.value = M.damp(this.uPulseV.value, 0, 3, dt);

      /* Física de las explosiones (solo las partículas vivas). */
      if (this._particles.length) {
        const vivos = [];
        for (let i = 0; i < this._particles.length; i++) {
          const p = this._particles[i];
          p.life += dt;
          const k = p.life / p.max;
          if (k >= 1) { p.at.aAlpha.array[p.idx] = 0; continue; }
          const i3 = p.idx * 3;
          p.at.position.array[i3] += p.vel.x * dt;
          p.at.position.array[i3 + 1] += p.vel.y * dt - p.grav * dt * k;
          p.at.position.array[i3 + 2] += p.vel.z * dt;
          p.vel.multiplyScalar(1 - dt * 0.9);
          p.at.aAlpha.array[p.idx] = 1 - k * k;
          vivos.push(p);
        }
        this._particles = vivos;
        [this.burstSparks, this.burstHearts, this.burstFlowers].forEach((l) => {
          l.geometry.attributes.position.needsUpdate = true;
          l.geometry.attributes.aAlpha.needsUpdate = true;
        });
      }
    }

    dispose() {
      [this.points, this.stars, this.flowers, this.floating,
       this.burstSparks, this.burstHearts, this.burstFlowers].forEach((p) => {
        if (p.geometry) p.geometry.dispose();
        if (p.material) p.material.dispose();
      });
    }
  };
})();
