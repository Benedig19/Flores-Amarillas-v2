/* =============================================================================
   app.js  ·  Orquesta toda la experiencia
   -----------------------------------------------------------------------------
   Escena 3D · etapas de la historia · parallax · toques y explosiones ·
   transformación girasol ⇄ corazón · música · carta · galería con visor ·
   calidad adaptativa · respaldo 2D si no hay WebGL.
============================================================================= */
(function () {
  'use strict';
  const F = window.Flores, C = F.CONFIG, M = F.math;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const state = {
    stage: 'intro',
    tier: 1,
    px: 0, py: 0, tx: 0, ty: 0,
    formVisible: false,
    running: true,
    fps: { acc: 0, frames: 0, level: 1 }
  };

  /* =========================================================================
     0) TEXTOS → DOM
  ========================================================================= */
  function paintText() {
    const d = window.dedication;
    const t = F.tpl;

    document.title = (t(d.title) + ' ' + t(d.titleAccent)).trim() || 'Flores Amarillas';
    $('#txt-intro').textContent = t(d.intro);
    $('#btn-open').textContent = t(d.openButton);
    $('#txt-gathering').textContent = t(d.gathering);
    $('#title-line1').textContent = t(d.title);
    $('#title-line2').textContent = t(d.titleAccent);
    $('#txt-subtitle').textContent = t(d.subtitle);
    $('#txt-message').innerHTML = t(d.message).split('\n')
      .map((l) => '<span>' + escapeHTML(l) + '</span>').join('');
    $('#btn-letter').textContent = t(d.letterButton);

    $('#letter-greeting').textContent = t(d.letterGreeting);
    $('#letter-body').innerHTML = (d.letter || [])
      .map((p) => '<p>' + escapeHTML(t(p)) + '</p>').join('');
    $('#letter-closing').textContent = t(d.letterClosing);
    $('#letter-ps').textContent = t(d.letterPS);
    $('#letter-sender').textContent = d.sender || '🌻';

    $('#gallery-title').textContent = t(d.galleryTitle);
    $('#btn-gallery-continue').textContent = t(d.galleryButton);
    $('#txt-final').textContent = t(d.finalMessage);
    $('#btn-replay').textContent = t(d.replayButton);

    buildGallery();
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* Galería: 3 a 8 fotos. Si una falta, se muestra una tarjeta dorada 🌻. */
  function buildGallery() {
    const d = window.dedication;
    const grid = $('#gallery-grid');
    grid.innerHTML = '';
    (d.photos || []).slice(0, 8).forEach((src, i) => {
      const cap = (d.captions && d.captions[i]) || '';
      const card = document.createElement('figure');
      card.className = 'photo-card';
      card.style.animationDelay = (i * 0.08) + 's';
      const img = new Image();
      img.alt = cap || 'Recuerdo';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.onerror = () => { card.classList.add('missing'); img.remove(); };
      img.onload = () => card.classList.add('ready');
      img.src = src;
      card.appendChild(img);
      if (cap) {
        const fc = document.createElement('figcaption');
        fc.textContent = cap;
        card.appendChild(fc);
      }
      card.addEventListener('click', () => openLightbox(src, cap, card.classList.contains('missing')));
      grid.appendChild(card);
    });
  }

  function openLightbox(src, cap, missing) {
    if (missing) return;
    const lb = $('#lightbox');
    $('#lightbox-img').src = src;
    $('#lightbox-cap').textContent = cap || '';
    lb.classList.add('open');
  }

  /* =========================================================================
     1) CALIDAD
  ========================================================================= */
  function detectTier() {
    const mem = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    const movil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    let tier = 2;
    if (movil || mem <= 4 || cores <= 4) tier = 1;
    if (movil && (mem <= 2 || cores <= 2)) tier = 0;
    return tier;
  }

  /* Distancia de cámara según la pantalla: en vertical hay que alejarse. */
  function cameraDistance() {
    const aspect = window.innerWidth / window.innerHeight;
    if (aspect >= 1.6) return C.camara.distancia;
    if (aspect >= 1.0) return C.camara.distancia * 1.12;
    return M.lerp(C.camara.distancia * 1.2, C.camara.distanciaMovil, M.smooth(1.0, 0.5, aspect));
  }

  /* =========================================================================
     2) ESCENA 3D
  ========================================================================= */
  function initScene() {
    state.tier = detectTier();
    const factor = C.calidad.factor[state.tier];
    const dpr = Math.min(window.devicePixelRatio || 1, C.calidad.dpr[state.tier]);

    const canvas = $('#scene');
    const renderer = new THREE.WebGLRenderer({
      canvas, antialias: state.tier > 1, alpha: false, powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight);
    if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    else if ('outputEncoding' in renderer && THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(C.camara.fov, window.innerWidth / window.innerHeight, 0.1, 420);
    camera.position.set(0, 0, cameraDistance());

    const tex = {
      glow: F.Textures.glow(),
      star: F.Textures.star(),
      bokeh: F.Textures.bokeh(),
      heart: F.Textures.heart(),
      flower: F.Textures.flower(),
      sunflower: F.Textures.sunflower(),
      ring: F.Textures.ring(),
      clouds: [F.Textures.cloud(3), F.Textures.cloud(11), F.Textures.cloud(29)],
      background: F.Textures.background()
    };
    scene.background = tex.background;

    const shared = F.Shaders.shared();
    const galaxy = new F.Galaxy(shared, factor, tex);
    const orbits = new F.Orbits(shared, factor, tex);
    const heart = new F.Heart(shared, factor, tex);
    const phrases = new F.Phrases(factor);

    scene.add(galaxy.group, galaxy.near, orbits.group, heart.group, phrases.group);
    galaxy.setFade(0);
    orbits.setFade(0);
    phrases.setFade(0);

    // Bloom propio (si el equipo lo aguanta).
    let bloom = null;
    if (state.tier >= C.calidad.bloomDesde) {
      try {
        bloom = new F.Bloom(renderer, window.innerWidth * dpr, window.innerHeight * dpr, C.bloom);
      } catch (e) { console.warn('[Flores] bloom no disponible:', e); bloom = null; }
    }

    Object.assign(state, { scene, camera, renderer, galaxy, orbits, heart, phrases, shared, tex, factor, bloom, dpr });
    state.clock = new THREE.Clock();
    state.fadeTarget = 0;
    state.fade = 0;

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(onResize, 250));
    onResize();
    renderer.setAnimationLoop(tick);
  }

  function onResize() {
    const { camera, renderer, bloom, dpr } = state;
    if (!camera || !renderer) return;
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? C.camara.fov + 6 : C.camara.fov;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    state.camZ = cameraDistance();
    if (bloom) bloom.setSize(w * dpr, h * dpr);
    // Escala de las partículas: un punto debe verse igual en cualquier pantalla.
    state.shared.uScale.value = h * 0.75;
  }

  /* =========================================================================
     3) PUNTERO: parallax, toques y explosiones
  ========================================================================= */
  const _v = new THREE.Vector3();
  const _plane = new THREE.Vector3();

  function bindPointer() {
    const setTarget = (cx, cy) => {
      state.tx = M.clamp((cx / window.innerWidth) * 2 - 1, -1, 1);
      state.ty = M.clamp((cy / window.innerHeight) * 2 - 1, -1, 1);
    };
    window.addEventListener('mousemove', (e) => setTarget(e.clientX, e.clientY), { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (e.touches[0]) setTarget(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    const canvas = $('#scene');
    canvas.addEventListener('click', (e) => onTap(e.clientX, e.clientY));
    canvas.addEventListener('touchend', (e) => {
      if (e.changedTouches[0]) onTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }, { passive: true });
  }

  /* ¿El toque cayó sobre la forma central? (comparación en pantalla: rápido
     y exacto aunque las partículas se muevan en el shader). */
  function tapSobreForma(cx, cy) {
    const { camera, heart } = state;
    _v.set(0, 0, 0).applyMatrix4(heart.group.matrixWorld).project(camera);
    const sx = (_v.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-_v.y * 0.5 + 0.5) * window.innerHeight;
    _v.set(8.5 * C.forma.escala * 2, 0, 0).applyMatrix4(heart.group.matrixWorld).project(camera);
    const rx = Math.abs((_v.x * 0.5 + 0.5) * window.innerWidth - sx);
    const d = Math.hypot(cx - sx, cy - sy);
    return { hit: d < rx * 1.1, dist: d, radio: rx };
  }

  /* Convierte el toque a un punto del plano z=0 en coordenadas de la forma. */
  function puntoEnPlano(cx, cy) {
    const { camera, heart } = state;
    const nx = (cx / window.innerWidth) * 2 - 1;
    const ny = -(cy / window.innerHeight) * 2 + 1;
    _plane.set(nx, ny, 0.5).unproject(camera);
    _plane.sub(camera.position).normalize();
    const t = -camera.position.z / _plane.z;
    _plane.multiplyScalar(t).add(camera.position);
    return heart.group.worldToLocal(_plane.clone());
  }

  function onTap(cx, cy) {
    if (!state.formVisible) return;
    const test = tapSobreForma(cx, cy);
    const p = puntoEnPlano(cx, cy);
    state.heart.burst(p, test.hit ? 1 : 0.45);
    if (state.audio) state.audio.chime();
    pulseGlow(test.hit);
  }

  function pulseGlow(fuerte) {
    const g = $('#heart-glow');
    if (!g) return;
    g.classList.remove('pulse', 'pulse-soft');
    void g.offsetWidth;
    g.classList.add(fuerte ? 'pulse' : 'pulse-soft');
  }

  /* =========================================================================
     4) BUCLE
  ========================================================================= */
  function tick() {
    if (!state.running) return;
    const dt = Math.min(state.clock.getDelta(), 0.05);
    const t = state.clock.elapsedTime;
    state.shared.uTime.value = t;

    // Aparición global suave de la galaxia.
    state.fade = M.damp(state.fade, state.fadeTarget, 1.4, dt);
    state.galaxy.setFade(state.fade);
    state.orbits.setFade(state.fade);
    state.phrases.setFade(state.fade * 0.95);

    state.px = M.damp(state.px, state.tx, 4, dt);
    state.py = M.damp(state.py, state.ty, 4, dt);

    state.galaxy.update(dt, state.px, state.py);
    state.orbits.update(dt, t, state.heart.uPulseV.value);
    state.heart.update(dt, t);
    state.phrases.update(dt);

    // Cámara con parallax.
    const p = C.camara.parallax;
    state.camera.position.x = M.damp(state.camera.position.x, state.px * p, 3, dt);
    state.camera.position.y = M.damp(state.camera.position.y, -state.py * p * 0.7, 3, dt);
    state.camera.position.z = M.damp(state.camera.position.z, state.camZ, 2, dt);
    state.camera.lookAt(0, 0.4, 0);

    // Render (con bloom si está activo).
    if (state.bloom) state.bloom.render(state.scene, state.camera);
    else { state.renderer.setRenderTarget(null); state.renderer.render(state.scene, state.camera); }

    adaptQuality(dt);
    syncMorphButton();
  }

  /* Baja la calidad sola si el equipo no rinde (y nunca sube de golpe). */
  function adaptQuality(dt) {
    const f = state.fps;
    f.acc += dt; f.frames++;
    if (f.acc < 2) return;
    const fps = f.frames / f.acc;
    f.acc = 0; f.frames = 0;
    if (fps < 26 && f.level > 0.45) {
      f.level = 0.45;
      applyDensity(f.level);
      if (state.bloom) { state.bloom.dispose(); state.bloom = null; }
    } else if (fps < 42 && f.level > 0.7) {
      f.level = 0.7;
      applyDensity(f.level);
      if (state.bloom) state.bloom.setStrength(C.bloom.fuerza * 0.7);
    }
  }

  function applyDensity(v) {
    state.galaxy.setDensity(v);
    state.orbits.setDensity(v);
    state.heart.setDensity(v);
    state.phrases.setDensity(v);
  }

  /* =========================================================================
     5) ETAPAS
  ========================================================================= */
  function goStage(name) {
    state.stage = name;
    $$('.stage').forEach((el) => el.classList.remove('active'));
    const el = document.getElementById('stage-' + name);
    if (el) el.classList.add('active');
    document.body.dataset.stage = name;
    document.body.classList.toggle('con-forma', state.formVisible);
  }

  function startExperience() {
    if (window.dedication.autoplayMusic && state.audio && !state.audio.playing) {
      state.audio.play().then(() => setAudioIcon(true)).catch(() => {});
    }
    goStage('gathering');
    state.fadeTarget = 1;
    setTimeout(() => {
      goStage('heart');
      state.formVisible = true;
      document.body.classList.add('con-forma');
      state.heart.startForming();
    }, 1500);
    setTimeout(() => goStage('message'),
      1500 + C.tiempos.union * 1000 * C.tiempos.esperaMensaje);
  }

  function setAudioIcon(playing) {
    const b = $('#audio-toggle');
    b.classList.toggle('is-playing', playing);
    b.setAttribute('aria-label', playing ? 'Pausar música' : 'Reproducir música');
  }

  function syncMorphButton() {
    const b = $('#morph-toggle');
    if (!b) return;
    const girasol = state.heart.esGirasol;
    if (b.dataset.forma === (girasol ? 'flor' : 'corazon')) return;
    b.dataset.forma = girasol ? 'flor' : 'corazon';
    b.textContent = girasol ? '💛' : '🌻';
    b.setAttribute('aria-label', girasol ? 'Convertir en corazón' : 'Convertir en girasol');
    b.title = girasol ? 'Convertir en corazón' : 'Convertir en girasol';
  }

  /* =========================================================================
     6) INTERFAZ
  ========================================================================= */
  function bindUI() {
    $('#btn-open').addEventListener('click', startExperience);
    $('#btn-letter').addEventListener('click', () => goStage('letter'));
    $('#letter-fab').addEventListener('click', () => goStage('letter'));
    $('#btn-letter-close').addEventListener('click', () => goStage(state.stage === 'letter' ? 'message' : state.stage));
    $('#btn-letter-continue').addEventListener('click', () => goStage('gallery'));
    $('#btn-gallery-continue').addEventListener('click', () => goStage('final'));
    $('#btn-replay').addEventListener('click', () => goStage('heart'));

    $('#audio-toggle').addEventListener('click', async () => {
      const playing = await state.audio.toggle();
      setAudioIcon(playing);
    });

    const morph = $('#morph-toggle');
    if (morph) morph.addEventListener('click', () => {
      state.heart.morphTo();
      if (state.audio) state.audio.swoosh();
      pulseGlow(true);
    });

    $('#lightbox').addEventListener('click', () => $('#lightbox').classList.remove('open'));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        $('#lightbox').classList.remove('open');
        if (state.stage === 'letter') goStage('message');
      }
      if (e.code === 'Space' && state.formVisible) {
        e.preventDefault();
        state.heart.morphTo();
        if (state.audio) state.audio.swoosh();
      }
      if (e.key === 'm' || e.key === 'M') $('#audio-toggle').click();
    });

    // Pausa el render cuando la pestaña no se ve (ahorra batería).
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        state.running = false;
        if (state.renderer) state.renderer.setAnimationLoop(null);
      } else if (state.renderer) {
        state.running = true;
        state.clock.getDelta();
        state.renderer.setAnimationLoop(tick);
      }
    });
  }

  /* =========================================================================
     7) ARRANQUE
  ========================================================================= */
  let _booted = false;
  function boot() {
    if (_booted) return;
    _booted = true;
    paintText();
    if (!window.THREE) { showFallback(); return; }
    try {
      state.audio = new F.Audio();
      initScene();
      bindPointer();
      bindUI();
      goStage('intro');
      document.body.classList.add('listo');
    } catch (err) {
      console.error('[Flores] fallo al iniciar la escena 3D:', err);
      showFallback();
    }
  }

  /* Respaldo 2D: sin WebGL la historia sigue funcionando (con CSS). */
  function showFallback() {
    document.body.classList.add('fallback-2d', 'listo');
    goStage('intro');
    const ir = (a, b) => { const el = $(a); if (el) el.addEventListener('click', b); };
    ir('#btn-open', () => { state.formVisible = true; goStage('message'); });
    ir('#btn-letter', () => goStage('letter'));
    ir('#letter-fab', () => goStage('letter'));
    ir('#btn-letter-close', () => goStage('message'));
    ir('#btn-letter-continue', () => goStage('gallery'));
    ir('#btn-gallery-continue', () => goStage('final'));
    ir('#btn-replay', () => goStage('message'));
    ir('#lightbox', () => $('#lightbox').classList.remove('open'));
    const audio = new F.Audio();
    state.audio = audio;
    ir('#audio-toggle', async () => setAudioIcon(await audio.toggle()));
  }

  /* Espera a que las fuentes estén listas: así las frases doradas se dibujan
     en canvas con la tipografía correcta. */
  function arrancar() {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(boot).catch(boot);
      setTimeout(boot, 2500);   // por si las fuentes tardan demasiado
    } else boot();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
