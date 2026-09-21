/* =============================================================================
   shaders.js  ·  Materiales de partículas (GLSL)
   -----------------------------------------------------------------------------
   POINTS_VS  → partículas ambientales (galaxia, polvo, anillos, arco, flores).
   MORPH_VS   → la forma central: vuela desde el espacio y se transforma
                girasol ⇄ corazón (uMorph) sin recalcular geometría en la CPU.
   BURST_VS   → explosiones al tocar (posición y alfa actualizados en CPU).
============================================================================= */
(function () {
  'use strict';
  if (!window.THREE) return;
  const F = window.Flores;

  /* --------------------------------------------------------------------- */
  const POINTS_VS = [
    'attribute float aSize;',
    'attribute float aPhase;',
    'attribute vec3 aColor;',
    'uniform float uTime;',
    'uniform float uScale;',
    'uniform float uSize;',
    'uniform float uDrift;',
    'uniform float uRise;',
    'uniform float uOrbit;',   // giro alrededor del eje Y (anillos)
    'uniform vec3  uBox;',
    'uniform float uTwinkle;',
    'uniform float uOpacity;',
    'varying vec3  vColor;',
    'varying float vAlpha;',
    'void main() {',
    '  vec3 p = position;',
    '  float ph = aPhase * 6.2831853;',
    '  if (uOrbit != 0.0) {',
    '    float a = uTime * uOrbit * (0.85 + aPhase * 0.3);',
    '    float cs = cos(a), sn = sin(a);',
    '    p = vec3(p.x * cs - p.z * sn, p.y, p.x * sn + p.z * cs);',
    '  }',
    '  p += vec3(sin(uTime * 0.21 + ph), cos(uTime * 0.17 + ph * 1.7), sin(uTime * 0.13 + ph * 2.3)) * uDrift;',
    '  float edge = 1.0;',
    '  if (uRise > 0.0) {',
    '    p.y = mod(p.y + uTime * uRise * (0.4 + aPhase) + uBox.y * 0.5, uBox.y) - uBox.y * 0.5;',
    '    edge = 1.0 - smoothstep(0.72, 1.0, abs(p.y) / (uBox.y * 0.5));',
    '  }',
    '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
    '  float tw = 1.0 - uTwinkle * (0.5 + 0.5 * sin(uTime * (0.5 + aPhase * 1.5) + ph * 3.0));',
    '  vAlpha = uOpacity * tw * edge;',
    '  vColor = aColor;',
    '  gl_PointSize = clamp(aSize * uSize * uScale / max(-mv.z, 0.1), 0.0, 240.0);',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');

  const POINTS_FS = [
    'uniform sampler2D uMap;',
    'varying vec3  vColor;',
    'varying float vAlpha;',
    'void main() {',
    '  vec4 tx = texture2D(uMap, vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y));',
    '  if (tx.a < 0.01) discard;',
    '  gl_FragColor = vec4(vColor * tx.rgb, tx.a * vAlpha);',
    '}'
  ].join('\n');

  /* La textura del girasol a color ya trae su propio color: no lo tiñe. */
  const POINTS_FS_TINT = [
    'uniform sampler2D uMap;',
    'varying vec3  vColor;',
    'varying float vAlpha;',
    'void main() {',
    '  vec4 tx = texture2D(uMap, vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y));',
    '  if (tx.a < 0.01) discard;',
    '  gl_FragColor = vec4(mix(tx.rgb, vColor, 0.25), tx.a * vAlpha);',
    '}'
  ].join('\n');

  /* --------------------------------------------------------------------- */
  const MORPH_VS = [
    'attribute vec3  aStart;',   // de dónde viene la partícula (espacio lejano)
    'attribute vec3  aFlower;',  // destino girasol
    'attribute float aDelay;',
    'attribute float aSize;',
    'attribute float aPhase;',
    'attribute vec3  aColor;',
    'attribute vec3  aColorB;',  // color cuando es corazón
    'uniform float uTime;',
    'uniform float uScale;',
    'uniform float uSize;',
    'uniform float uForm;',      // 0..1 formación inicial
    'uniform float uMorph;',     // 0 = corazón · 1 = girasol
    'uniform float uAppear;',
    'uniform float uPulse;',     // onda al tocar
    'uniform float uGlow;',
    'uniform float uSpin;',      // giro propio de la forma
    'uniform float uTwinkle;',
    'uniform float uOpacity;',
    'varying vec3  vColor;',
    'varying float vAlpha;',
    'void main() {',
    '  float ph = aPhase * 6.2831853;',
    '  vec3 target = mix(position, aFlower, uMorph);',
    // Durante la transformación las partículas se abren hacia fuera (bonito).
    '  float swell = sin(uMorph * 3.14159265) * 1.35;',
    '  target += normalize(target + vec3(0.0001)) * swell * (0.35 + aPhase * 0.9);',
    // Formación inicial: cada partícula llega con un retraso propio.
    '  float p = clamp((uForm - aDelay * 0.60) / 0.40, 0.0, 1.0);',
    '  float e = 1.0 - pow(1.0 - p, 3.0);',
    '  vec3 q = mix(aStart, target, e);',
    // Espiral de entrada + giro suave permanente de la forma.
    '  float ang = (1.0 - e) * 3.4 + uSpin;',
    '  float cs = cos(ang), sn = sin(ang);',
    '  q = vec3(q.x * cs - q.z * sn, q.y, q.x * sn + q.z * cs);',
    '  float travel = sin(e * 3.14159265);',
    '  q += vec3(sin(uTime * 0.9 + ph), cos(uTime * 0.8 + ph * 1.3), sin(uTime * 0.7 + ph * 1.9)) * (0.5 * travel);',
    '  q += vec3(sin(uTime * 0.6 + ph * 2.0), cos(uTime * 0.5 + ph * 3.0), sin(uTime * 0.55 + ph * 4.0)) * 0.15 * e;',
    '  q += normalize(q + vec3(0.0001)) * uPulse * (0.7 + aPhase * 1.4);',
    '  vec4 mv = modelViewMatrix * vec4(q, 1.0);',
    '  float tw = 1.0 - uTwinkle * (0.5 + 0.5 * sin(uTime * (0.8 + aPhase * 2.0) + ph * 5.0));',
    '  vAlpha = uOpacity * uAppear * tw * (0.78 + 0.5 * uGlow);',
    '  vColor = mix(aColorB, aColor, uMorph);',
    '  float grow = 0.55 + 0.45 * e + 0.35 * uPulse + 0.25 * swell;',
    '  gl_PointSize = clamp(aSize * uSize * grow * uScale / max(-mv.z, 0.1), 0.0, 240.0);',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');

  /* --------------------------------------------------------------------- */
  const BURST_VS = [
    'attribute float aSize;',
    'attribute float aAlpha;',
    'attribute vec3  aColor;',
    'uniform float uScale;',
    'varying vec3  vColor;',
    'varying float vAlpha;',
    'void main() {',
    '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
    '  vColor = aColor;',
    '  vAlpha = aAlpha;',
    '  gl_PointSize = clamp(aSize * uScale / max(-mv.z, 0.1), 0.0, 256.0);',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');

  function base(extra) {
    return Object.assign({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending
    }, extra);
  }

  F.Shaders = {
    /* Uniforms compartidos por todos los materiales (tiempo y escala de punto). */
    shared() { return { uTime: { value: 0 }, uScale: { value: 800 } }; },

    points(map, shared, o) {
      o = o || {};
      const box = o.box || [60, 34, 46];
      const m = new THREE.ShaderMaterial(base({
        uniforms: Object.assign({
          uMap:     { value: map },
          uSize:    { value: o.size === undefined ? 1 : o.size },
          uOpacity: { value: o.opacity === undefined ? 1 : o.opacity },
          uDrift:   { value: o.drift || 0 },
          uRise:    { value: o.rise || 0 },
          uOrbit:   { value: o.orbit || 0 },
          uBox:     { value: new THREE.Vector3(box[0], box[1], box[2]) },
          uTwinkle: { value: o.twinkle === undefined ? 0.5 : o.twinkle }
        }, shared),
        vertexShader: POINTS_VS,
        fragmentShader: o.keepColor ? POINTS_FS_TINT : POINTS_FS
      }));
      if (o.normalBlend) m.blending = THREE.NormalBlending;
      m.userData.baseOpacity = m.uniforms.uOpacity.value;
      return m;
    },

    morph(map, shared, formUniforms, o) {
      o = o || {};
      const m = new THREE.ShaderMaterial(base({
        uniforms: Object.assign({
          uMap:     { value: map },
          uSize:    { value: o.size === undefined ? 1 : o.size },
          uOpacity: { value: o.opacity === undefined ? 1 : o.opacity },
          uTwinkle: { value: o.twinkle === undefined ? 0.5 : o.twinkle }
        }, shared, formUniforms),
        vertexShader: MORPH_VS,
        fragmentShader: POINTS_FS
      }));
      m.userData.baseOpacity = m.uniforms.uOpacity.value;
      return m;
    },

    burst(map, shared) {
      return new THREE.ShaderMaterial(base({
        uniforms: Object.assign({ uMap: { value: map } }, shared),
        vertexShader: BURST_VS,
        fragmentShader: POINTS_FS
      }));
    }
  };
})();
