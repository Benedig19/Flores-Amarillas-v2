/* =============================================================================
   orbits.js  ·  Anillos orbitales + arco de polvo dorado
   -----------------------------------------------------------------------------
   Reproduce dos elementos clave del video de referencia:
   1) Anillos elípticos de polvo que giran alrededor de la forma central.
   2) Un arco/cúpula de partículas en la parte baja, con una “cometa” de luz
      que lo recorre de lado a lado.
============================================================================= */
(function () {
  'use strict';
  if (!window.THREE) return;
  const F = window.Flores, C = F.CONFIG;

  F.Orbits = class {
    constructor(shared, factor, tex) {
      const P = C.particulas, A = C.anillos, ARC = C.arco;
      const rnd = F.rng(53), tmp = new THREE.Color();
      this.group = new THREE.Group();
      this.layers = [];
      this.fade = [];

      /* ------------------------------------------------------------------
         1) ANILLOS ORBITALES
         Cada anillo es un disco fino de puntos; el shader los hace girar
         (uOrbit) sin coste de CPU. La inclinación los convierte en elipses.
      ------------------------------------------------------------------ */
      this.rings = [];
      const perRing = Math.max(120, Math.round((P.anillos * factor) / A.cantidad));
      for (let k = 0; k < A.cantidad; k++) {
        const radio = A.radio[k % A.radio.length];
        const grosor = A.grosor[k % A.grosor.length];
        const vel = A.velocidad[k % A.velocidad.length];
        const mat = F.Shaders.points(tex.glow, shared, {
          size: 1, opacity: 0.78 - k * 0.12, twinkle: 0.55, orbit: vel
        });
        const pts = F.buildPoints(perRing, mat, (pos, col, size, ph) => {
          for (let i = 0; i < perRing; i++) {
            const a = rnd() * Math.PI * 2;
            // Densidad mayor cerca del radio nominal (borde nítido, halo suave).
            const r = radio + (rnd() + rnd() - 1) * grosor * 2.4;
            pos[i * 3] = Math.cos(a) * r;
            pos[i * 3 + 1] = (rnd() + rnd() - 1) * grosor * 0.5;
            pos[i * 3 + 2] = Math.sin(a) * r;
            F.pickGold(rnd, tmp);
            const b = 0.45 + 0.55 * rnd();
            col[i * 3] = tmp.r * b; col[i * 3 + 1] = tmp.g * b; col[i * 3 + 2] = tmp.b * b;
            size[i] = 0.10 + rnd() * rnd() * 0.40;
            ph[i] = rnd();
          }
        });
        const holder = new THREE.Group();
        holder.rotation.x = A.inclina + (k - 1) * 0.06;
        holder.rotation.z = (k - 1) * 0.05;
        holder.add(pts);
        this.group.add(holder);
        this.rings.push({ holder, pts, wobble: 0.04 + k * 0.02, phase: k * 1.7 });
        this._reg(pts, mat);
      }

      /* ------------------------------------------------------------------
         2) ARCO DE POLVO INFERIOR (parábola ancha)
      ------------------------------------------------------------------ */
      const nArc = Math.round(P.arco * factor);
      const mArc = F.Shaders.points(tex.glow, shared, {
        size: 1, opacity: 0.85, twinkle: 0.5, drift: 0.22
      });
      const half = ARC.ancho * 0.5;
      this.arc = F.buildPoints(nArc, mArc, (pos, col, size, ph) => {
        for (let i = 0; i < nArc; i++) {
          // u∈(-1..1) con más densidad hacia los extremos: da el efecto “cúpula”.
          let u = rnd() * 2 - 1;
          u = Math.sign(u) * Math.pow(Math.abs(u), 0.72);
          const curva = 1 - u * u;                       // parábola
          const disp = (rnd() + rnd() - 1);              // dispersión gaussiana
          pos[i * 3] = u * half + disp * 1.4;
          pos[i * 3 + 1] = ARC.baseY + curva * ARC.alto + disp * 1.1 - Math.pow(Math.abs(u), 3) * 1.5;
          pos[i * 3 + 2] = ARC.z + (rnd() - 0.5) * 7;
          F.pickGold(rnd, tmp);
          const b = (0.45 + 0.55 * rnd()) * (0.55 + 0.45 * curva);
          col[i * 3] = tmp.r * b; col[i * 3 + 1] = tmp.g * b; col[i * 3 + 2] = tmp.b * b;
          size[i] = 0.09 + rnd() * rnd() * 0.42;
          ph[i] = rnd();
        }
      });
      this.group.add(this.arc);
      this._reg(this.arc, mArc);

      /* --- Cometa que recorre el arco --- */
      const nComet = 70;
      const mComet = F.Shaders.points(tex.star, shared, { size: 1, opacity: 0.95, twinkle: 0.3 });
      this.comet = F.buildPoints(nComet, mComet, (pos, col, size, ph) => {
        for (let i = 0; i < nComet; i++) {
          pos[i * 3] = 0; pos[i * 3 + 1] = ARC.baseY; pos[i * 3 + 2] = ARC.z;
          tmp.setHex(i < 10 ? C.colores.crema : C.colores.oro);
          col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
          size[i] = (i < 10 ? 0.9 : 0.45) * (1 - i / nComet) + 0.08;
          ph[i] = rnd();
        }
      });
      this.group.add(this.comet);
      this._reg(this.comet, mComet);
      this._cometT = 0;
      this._arcCfg = ARC;

      /* --- Halo central: núcleo de luz de donde “nace” todo --- */
      const haloMat = new THREE.SpriteMaterial({
        map: tex.glow, color: C.colores.luzCorazon, transparent: true,
        opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending
      });
      this.halo = new THREE.Sprite(haloMat);
      this.halo.scale.set(16, 16, 1);
      this.halo.position.set(0, 0.6, -1);
      this.group.add(this.halo);
      this.haloBase = 0.55;
    }

    _reg(points, material) { this.layers.push(points); this.fade.push(material); }

    setFade(v) {
      for (let i = 0; i < this.fade.length; i++) {
        const m = this.fade[i];
        m.uniforms.uOpacity.value = m.userData.baseOpacity * v;
      }
      this.halo.material.opacity = this.haloBase * v;
      this._fade = v;
    }

    setDensity(f) {
      for (let i = 0; i < this.layers.length; i++) {
        const p = this.layers[i];
        if (p === this.comet) continue;      // la cometa siempre completa
        p.geometry.setDrawRange(0, Math.max(1, Math.floor(p.userData.count * f)));
      }
    }

    update(dt, t, pulse) {
      const ARC = this._arcCfg;

      // Balanceo suave de los anillos: parecen “respirar” con la forma.
      for (let i = 0; i < this.rings.length; i++) {
        const r = this.rings[i];
        r.holder.rotation.z = Math.sin(t * 0.25 + r.phase) * r.wobble;
        r.holder.rotation.x = C.anillos.inclina + Math.sin(t * 0.18 + r.phase) * 0.05;
        const s = 1 + pulse * 0.12;
        r.holder.scale.set(s, s, s);
      }

      // Cometa: avanza por la parábola y deja estela.
      this._cometT += dt * ARC.velocidad;
      const u = Math.sin(this._cometT * Math.PI);
      const arr = this.comet.geometry.attributes.position.array;
      const n = arr.length / 3;
      for (let i = n - 1; i > 0; i--) {           // desplaza la estela
        arr[i * 3] = arr[(i - 1) * 3];
        arr[i * 3 + 1] = arr[(i - 1) * 3 + 1];
        arr[i * 3 + 2] = arr[(i - 1) * 3 + 2];
      }
      const half = ARC.ancho * 0.5;
      arr[0] = u * half;
      arr[1] = ARC.baseY + (1 - u * u) * ARC.alto;
      arr[2] = ARC.z + 0.5;
      this.comet.geometry.attributes.position.needsUpdate = true;

      // Núcleo de luz latiendo.
      const s = 16 + Math.sin(t * 1.1) * 1.6 + pulse * 10;
      this.halo.scale.set(s, s, 1);
      this.halo.material.opacity = (this.haloBase + pulse * 0.4) * (this._fade === undefined ? 1 : this._fade);
    }

    dispose() {
      this.layers.forEach((o) => { o.geometry.dispose(); o.material.dispose(); });
      this.halo.material.dispose();
    }
  };
})();
