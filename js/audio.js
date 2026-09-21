/* =============================================================================
   audio.js  ·  Música de fondo (play/pausa) + sonidos de la escena
   -----------------------------------------------------------------------------
   · Si existe `dedication.music`, se reproduce ese archivo en bucle.
   · Si no existe (o el navegador lo bloquea), se genera EN VIVO una melodía
     ambiental dorada con Web Audio: pad cálido + arpegio pentatónico + eco.
     Nunca queda en silencio y no usa música con derechos de autor.
============================================================================= */
(function () {
  'use strict';
  const F = window.Flores;

  F.Audio = class {
    constructor() {
      this.ctx = null;
      this.playing = false;
      this.usingFallback = false;
      this._nodes = null;
      this._timer = null;
      this._step = 0;
      this._triedFile = false;

      this.el = new Audio();
      this.el.loop = true;
      this.el.preload = 'auto';
      this.el.volume = 0;
      this.el.crossOrigin = 'anonymous';
      this.targetVolume = window.dedication.musicVolume || 0.55;
    }

    _ensureCtx() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = AC ? new AC() : null;
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    }

    async toggle() {
      if (this.playing) { this.pause(); return false; }
      await this.play();
      return this.playing;
    }

    async play() {
      // 1) Intento con el archivo del usuario.
      if (!this.usingFallback && window.dedication.music) {
        if (!this._triedFile) { this._triedFile = true; this.el.src = window.dedication.music; }
        try {
          await this.el.play();
          this.playing = true;
          this._fadeEl(this.targetVolume, 1.6);
          return;
        } catch (e) { /* sin archivo o bloqueado → melodía generada */ }
      }
      // 2) Melodía ambiental generada.
      this._startAmbient();
    }

    pause() {
      this.playing = false;
      if (this.usingFallback) this._stopAmbient();
      else { this._fadeEl(0, 0.6); setTimeout(() => { if (!this.playing) this.el.pause(); }, 650); }
    }

    _fadeEl(to, secs) {
      const from = this.el.volume, t0 = performance.now(), ms = secs * 1000;
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / ms);
        this.el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
        if (k < 1) requestAnimationFrame(step);
      };
      step();
    }

    /* ---------- Melodía ambiental generada -------------------------------- */
    _startAmbient() {
      const ctx = this._ensureCtx();
      if (!ctx) return;
      this.usingFallback = true;
      this.playing = true;

      const master = ctx.createGain();
      master.gain.value = 0.0001;
      master.gain.exponentialRampToValueAtTime(0.16 * (this.targetVolume / 0.55), ctx.currentTime + 3);
      master.connect(ctx.destination);

      // Eco suave: da sensación de espacio (galaxia).
      const delay = ctx.createDelay(1.2);
      delay.delayTime.value = 0.42;
      const fb = ctx.createGain(); fb.gain.value = 0.32;
      const wet = ctx.createGain(); wet.gain.value = 0.45;
      delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);

      const filtro = ctx.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = 1900;
      filtro.connect(master);
      filtro.connect(delay);

      // Pad: acorde cálido que respira.
      const pad = [130.81, 164.81, 196.00, 246.94].map((f, i) => {
        const o = ctx.createOscillator();
        o.type = i % 2 ? 'triangle' : 'sine';
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.value = 0.10 / (1 + i * 0.4);
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.05 + i * 0.013;
        const lg = ctx.createGain(); lg.gain.value = 3.5;
        lfo.connect(lg); lg.connect(o.detune);
        o.connect(g); g.connect(filtro);
        o.start(); lfo.start();
        return { o, lfo };
      });

      // Arpegio pentatónico dorado, una nota cada ~1.1 s.
      const escala = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
      this._step = 0;
      const nota = () => {
        if (!this.playing || !this.usingFallback) return;
        const now = ctx.currentTime;
        const f = escala[Math.floor(Math.random() * escala.length)] * (Math.random() < 0.25 ? 0.5 : 1);
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.085, now + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
        o.connect(g); g.connect(filtro);
        o.start(now); o.stop(now + 2.6);
      };
      nota();
      this._timer = setInterval(nota, 1150);
      this._nodes = { master, pad, ctx, filtro, delay };
    }

    _stopAmbient() {
      if (this._timer) { clearInterval(this._timer); this._timer = null; }
      if (!this._nodes) return;
      const { master, pad, ctx } = this._nodes;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      setTimeout(() => {
        pad.forEach(({ o, lfo }) => { try { o.stop(); lfo.stop(); } catch (e) { /* ya parado */ } });
      }, 1000);
      this._nodes = null;
    }

    /* ---------- Campanita al tocar la flor-corazón ------------------------- */
    chime() {
      if (!window.dedication.heartSound) return;
      const ctx = this._ensureCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      [880, 1108.73, 1318.51].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, now + i * 0.03);
        g.gain.exponentialRampToValueAtTime(0.075, now + 0.04 + i * 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.0 + i * 0.06);
        o.connect(g); g.connect(ctx.destination);
        o.start(now + i * 0.03);
        o.stop(now + 1.2 + i * 0.06);
      });
    }

    /* Sonido suave al transformar girasol ⇄ corazón. */
    swoosh() {
      const ctx = this._ensureCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.2;
      o.type = 'triangle';
      o.frequency.setValueAtTime(320, now);
      o.frequency.exponentialRampToValueAtTime(1200, now + 0.55);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.05, now + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      o.connect(f); f.connect(g); g.connect(ctx.destination);
      o.start(now); o.stop(now + 0.9);
    }
  };
})();
