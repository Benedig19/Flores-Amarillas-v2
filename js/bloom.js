/* =============================================================================
   bloom.js  ·  Resplandor dorado (post-proceso propio)
   -----------------------------------------------------------------------------
   Three.js "pelado" no trae EffectComposer, así que aquí va un bloom completo
   escrito a mano, en 4 pasadas y sin dependencias extra:

     1) Se renderiza la escena a una textura.
     2) Se extraen las zonas brillantes (umbral suave).
     3) Se difuminan en horizontal y vertical, a media resolución (rápido).
     4) Se suma el resultado sobre la escena original.

   Si algo fallara (GPU antigua), app.js sigue renderizando sin bloom.
============================================================================= */
(function () {
  'use strict';
  if (!window.THREE) return;
  const F = window.Flores;

  const QUAD_VS = [
    'varying vec2 vUv;',
    'void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }'
  ].join('\n');

  const BRIGHT_FS = [
    'uniform sampler2D tTex;',
    'uniform float uThreshold;',
    'uniform float uSoft;',
    'varying vec2 vUv;',
    'void main(){',
    '  vec3 c = texture2D(tTex, vUv).rgb;',
    '  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));',
    '  float k = smoothstep(uThreshold, uThreshold + uSoft, l);',
    '  gl_FragColor = vec4(c * k, 1.0);',
    '}'
  ].join('\n');

  const BLUR_FS = [
    'uniform sampler2D tTex;',
    'uniform vec2 uDir;',       // (1/w,0) u (0,1/h) · ya multiplicado por radio
    'varying vec2 vUv;',
    'void main(){',
    '  vec4 sum = texture2D(tTex, vUv) * 0.2270270270;',
    '  sum += texture2D(tTex, vUv + uDir * 1.3846153846) * 0.3162162162;',
    '  sum += texture2D(tTex, vUv - uDir * 1.3846153846) * 0.3162162162;',
    '  sum += texture2D(tTex, vUv + uDir * 3.2307692308) * 0.0702702703;',
    '  sum += texture2D(tTex, vUv - uDir * 3.2307692308) * 0.0702702703;',
    '  gl_FragColor = sum;',
    '}'
  ].join('\n');

  const COMPOSITE_FS = [
    'uniform sampler2D tBase;',
    'uniform sampler2D tBloom;',
    'uniform float uStrength;',
    'varying vec2 vUv;',
    'void main(){',
    '  vec3 base = texture2D(tBase, vUv).rgb;',
    '  vec3 glow = texture2D(tBloom, vUv).rgb;',
    // Un pelín más cálido en el resplandor: el dorado del video.
    '  glow *= vec3(1.06, 0.98, 0.82);',
    '  vec3 c = base + glow * uStrength;',
    '  c = c / (1.0 + c * 0.16);',            // compresión suave: no “quema”
    '  gl_FragColor = vec4(c, 1.0);',
    '}'
  ].join('\n');

  function target(w, h) {
    return new THREE.WebGLRenderTarget(Math.max(2, Math.floor(w)), Math.max(2, Math.floor(h)), {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false
    });
  }

  F.Bloom = class {
    constructor(renderer, w, h, opts) {
      opts = opts || {};
      this.renderer = renderer;
      this.strength = opts.fuerza === undefined ? 0.85 : opts.fuerza;
      this.radius = opts.radio === undefined ? 1.15 : opts.radio;

      this.rtScene = target(w, h);
      this.rtA = target(w / 2, h / 2);
      this.rtB = target(w / 2, h / 2);

      this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.scene = new THREE.Scene();
      this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
      this.quad.frustumCulled = false;
      this.scene.add(this.quad);

      const mk = (fs, uniforms) => new THREE.ShaderMaterial({
        uniforms, vertexShader: QUAD_VS, fragmentShader: fs,
        depthTest: false, depthWrite: false
      });

      this.mBright = mk(BRIGHT_FS, {
        tTex: { value: null },
        uThreshold: { value: opts.umbral === undefined ? 0.3 : opts.umbral },
        uSoft: { value: opts.suavidad === undefined ? 0.28 : opts.suavidad }
      });
      this.mBlur = mk(BLUR_FS, { tTex: { value: null }, uDir: { value: new THREE.Vector2() } });
      this.mComp = mk(COMPOSITE_FS, {
        tBase: { value: null }, tBloom: { value: null },
        uStrength: { value: this.strength }
      });

      this.setSize(w, h);
    }

    setSize(w, h) {
      this.w = Math.max(2, Math.floor(w));
      this.h = Math.max(2, Math.floor(h));
      this.rtScene.setSize(this.w, this.h);
      this.rtA.setSize(this.w / 2, this.h / 2);
      this.rtB.setSize(this.w / 2, this.h / 2);
    }

    setStrength(v) { this.strength = v; this.mComp.uniforms.uStrength.value = v; }

    _pass(material, destino) {
      this.quad.material = material;
      this.renderer.setRenderTarget(destino || null);
      this.renderer.clear();
      this.renderer.render(this.scene, this.cam);
    }

    render(scene, camera) {
      const r = this.renderer;
      const prevTarget = r.getRenderTarget();

      // 1) Escena → textura
      r.setRenderTarget(this.rtScene);
      r.clear();
      r.render(scene, camera);

      // 2) Zonas brillantes
      this.mBright.uniforms.tTex.value = this.rtScene.texture;
      this._pass(this.mBright, this.rtA);

      // 3) Desenfoque separable (horizontal + vertical)
      const hw = this.w / 2, hh = this.h / 2;
      this.mBlur.uniforms.tTex.value = this.rtA.texture;
      this.mBlur.uniforms.uDir.value.set(this.radius / hw, 0);
      this._pass(this.mBlur, this.rtB);

      this.mBlur.uniforms.tTex.value = this.rtB.texture;
      this.mBlur.uniforms.uDir.value.set(0, this.radius / hh);
      this._pass(this.mBlur, this.rtA);

      // Segunda vuelta: halo más ancho y suave.
      this.mBlur.uniforms.tTex.value = this.rtA.texture;
      this.mBlur.uniforms.uDir.value.set((this.radius * 2.4) / hw, 0);
      this._pass(this.mBlur, this.rtB);

      this.mBlur.uniforms.tTex.value = this.rtB.texture;
      this.mBlur.uniforms.uDir.value.set(0, (this.radius * 2.4) / hh);
      this._pass(this.mBlur, this.rtA);

      // 4) Composición final a pantalla
      this.mComp.uniforms.tBase.value = this.rtScene.texture;
      this.mComp.uniforms.tBloom.value = this.rtA.texture;
      this._pass(this.mComp, prevTarget || null);
    }

    dispose() {
      [this.rtScene, this.rtA, this.rtB].forEach((t) => t.dispose());
      [this.mBright, this.mBlur, this.mComp].forEach((m) => m.dispose());
      this.quad.geometry.dispose();
    }
  };
})();
