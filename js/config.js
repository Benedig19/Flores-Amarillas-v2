/* =============================================================================
   config.js  ·  TODO LO QUE PUEDES CAMBIAR VIVE AQUÍ  (v2 · Galaxia de Flores)
   -----------------------------------------------------------------------------
   Esta versión NO tiene panel de edición: tú editas este archivo con tu editor
   de código y listo. Es la única fuente de verdad de la experiencia.

   1) window.dedication  → textos, carta, frases flotantes, fotos y música.
   2) Flores.CONFIG      → colores, partículas, forma, cámara, brillo, tiempos.
   3) Utilidades         → matemática y aleatorio con semilla.

   Este archivo no depende de Three.js (también alimenta el respaldo 2D).
============================================================================= */
window.Flores = window.Flores || {};

/* =============================================================================
   1) CONTENIDO
============================================================================= */
window.dedication = {

  /* --- Identidad --------------------------------------------------------- */
  recipient: 'Luz Karen',      // aparece en el subtítulo y en la carta
  sender: '',                  // tu nombre para firmar; vacío = 🌻

  /* --- Títulos (se ven en oro, como el video) ----------------------------- */
  title: 'Feliz Día de las',
  titleAccent: 'Flores Amarillas',     // segunda línea, más grande y dorada
  subtitle: 'Para {nombre} 💛 porque hay personas que hacen florecer la vida.',

  /* --- Etapa 1 y 2 -------------------------------------------------------- */
  intro: 'Hay un pequeño universo esperándote...',
  openButton: '✨ Abrir sorpresa',
  gathering: 'Reuniendo flores amarillas para ti...',

  /* --- Etapa 3 (mensaje) · \n = salto de línea ---------------------------- */
  message: 'Que nunca te falten motivos para sonreír,\nni flores amarillas que te recuerden lo especial que eres.',
  letterButton: '💌 Abrir carta',

  /* --- La carta · {nombre} se reemplaza por `recipient` ------------------- */
  letterGreeting: 'Querida {nombre},',
  letter: [
    'Hoy quise regalarte algo distinto: un pequeño universo hecho de luz dorada y flores amarillas. No es un ramo que se marchita ni una flor que se lleva el viento; es un jardín que vive en el cielo y que puedes abrir cada vez que quieras.',
    'Dicen que las flores amarillas llevan alegría, y yo creo que también llevan un poco de sol para quien las recibe. Por eso las elegí: porque tú tienes algo de eso. Tu nombre ya lleva la luz por delante, y tu forma de ser también.',
    'Quiero que sepas que tú no vas a estar sin tus flores amarillas. Aunque el día se ponga gris, aunque haya cansancio, aunque las cosas no salgan como esperabas, aquí quedan todas, floreciendo para ti. Cuando necesites recordar lo valiosa que eres, vuelve a este cielo dorado y ábrelas otra vez.',
    'Gracias por ser de esas personas que hacen florecer la vida sin darse cuenta: con una sonrisa, con una palabra a tiempo, con la manera en que haces sentir a los demás que importan. Ojalá pudieras verte con mis ojos; entonces entenderías por qué te escribo esto.',
    'Deseo que nunca te falten motivos para sonreír, ni personas que te abracen cuando lo necesites, ni girasoles que te recuerden hacia dónde mirar cuando haya nubes.',
    'Este corazón es pequeño comparado con todo lo que mereces, pero está hecho con muchísimo cariño.'
  ],
  letterClosing: 'Con todo mi cariño,',
  letterPS: 'P. D.: cuando quieras volver a verlas, las flores seguirán aquí.',

  /* --- Etapa 4 (galería) · pon tus fotos en assets/images/ ---------------- */
  galleryTitle: 'Recuerdos que florecen 🌻',
  galleryButton: 'Continuar 💛',
  photos: [
    'assets/images/imag1.jpeg',
    'assets/images/imag2.jpeg',
    'assets/images/imag3.jpeg',
    'assets/images/imag4.jpeg',
    'assets/images/imag5.jpeg',
  ],
  // Texto corto bajo cada foto (puede tener menos elementos que `photos`).
  captions: ['Tu luz 🌻', 'Un momento que florece', 'Siempre primavera 💛', 'Como el girasol, mira hacia ti'],

  /* --- Final -------------------------------------------------------------- */
  finalMessage: 'Con mucho cariño 💛',
  replayButton: 'Volver a ver el corazón 🌻',

  /* --- Frases doradas que flotan por la galaxia (como en el video) -------- */
  phrases: [
    'Como el girasol, miro hacia ti',
    'Feliz día, pienso en ti con cariño',
    'Esta flor guarda un deseo para ti',
    'Contigo todo florece más bonito',
    'Tu sonrisa es mi día soleado',
    'Que nunca te falte tu luz',
    'Hay flores que no se marchitan',
    'Gracias por existir, {nombre}',
    'Un girasol para tus días grises',
    'Te mereces todo lo amarillo del mundo',
    'Aquí siempre es primavera',
    'Cada estrella tiene tu nombre',
    'Brillas aunque no te des cuenta',
    'Que el mundo te trate bonito',
    'Toda esta luz es tuya',
    'Tu cariño también es dorado',
    'Ojalá pudieras verte con mis ojos',
    'Guardé este cielo para ti',
    'Flores amarillas, corazón lleno',
    'Nunca estarás sin tus flores'
  ],

  /* --- Música ------------------------------------------------------------- */
  // Si el archivo no existe, suena una melodía ambiental generada (sin derechos).
  music: 'assets/music/Flores Amarillas – Floricienta .mp3',
  musicVolume: 0.55,
  heartSound: true,          // campanita al tocar el corazón
  autoplayMusic: true        // intenta sonar al pulsar "Abrir sorpresa"
};

/* =============================================================================
   2) AJUSTES VISUALES
============================================================================= */
Flores.CONFIG = {

  /* --- Paleta (0xRRGGBB) -------------------------------------------------- */
  colores: {
    oro:         0xFFD700,
    ambar:       0xFFC107,
    claro:       0xFFF3A0,
    dorado:      0xF5C542,
    crema:       0xFFF8D6,
    naranja:     0xFF9F1C,
    petaloBase:  0xFFC431,   // pétalos del girasol
    petaloAlto:  0xFFE9A0,   // brillo del pétalo
    centroFlor:  0xC96B08,   // corazón de semillas del girasol
    luzCorazon:  0xFFC94D,
    luzFrases:   0xFFCE5A,   // frases flotantes
    fondoCentro: '#2b1707',  // centro del degradado de fondo
    fondoMedio:  '#100804',
    fondoBorde:  '#020103'   // bordes (casi negro)
  },

  /* --- Cantidad de partículas en equipo potente (se reduce solo en móvil) -- */
  particulas: {
    estrellasLejanas: 3000,
    espiral:          9000,   // polvo de la galaxia en espiral
    polvo:            320,    // motas doradas cerca de la cámara
    bokeh:            34,     // círculos de luz desenfocados
    nebulosas:        14,     // nubes doradas de fondo
    formaPuntos:      7200,   // puntos que forman girasol/corazón
    formaEstrellas:   520,    // destellos sobre la forma
    formaFlores:      210,    // girasoles pequeños sobre la forma
    floresFlotantes:  260,    // girasoles que flotan por la galaxia
    anillos:          2600,   // anillos orbitales dorados
    arco:             2200,   // arco/cúpula de polvo inferior
    chispas:          760,    // reserva para explosiones
    corazonesMini:    110     // reserva de corazoncitos
  },

  /* --- Forma central ------------------------------------------------------ */
  forma: {
    escala:       0.5,     // 0.5 ≈ 16 unidades de ancho
    profundidad:  4.2,     // grosor en Z
    giro:         0.10,    // balanceo lento (radianes)
    respiracion:  0.035,   // cuánto “respira”
    petalos:      8,       // pétalos del girasol
    rimCorazon:   0.62,    // 0..1 · cuánta silueta (contorno) tiene el corazón
    morphInicial: 1,       // 1 = empieza girasol · 0 = empieza corazón
    autoMorph:    true,    // alterna girasol ⇄ corazón solo
    autoMorphCada: 9,      // segundos entre cambios
    morphDuracion: 2.2     // segundos que dura la transformación
  },

  /* --- Anillos orbitales (los del video) ---------------------------------- */
  anillos: {
    cantidad: 3,
    radio:    [9.5, 12.6, 15.8],
    grosor:   [0.5, 0.42, 0.34],
    inclina:  1.30,        // inclinación en X (radianes) → se ven como elipses
    velocidad:[0.30, -0.21, 0.15]
  },

  /* --- Arco de polvo inferior --------------------------------------------- */
  arco: {
    ancho:   46,
    alto:    9.5,
    baseY:  -11.5,
    z:      -4,
    velocidad: 0.16
  },

  /* --- Frases flotantes --------------------------------------------------- */
  frases: {
    cantidad: 26,      // sprites en pantalla
    opacidad: 0.5,
    escala:   3.1,
    deriva:   0.35
  },

  camara: { fov: 55, distancia: 30, parallax: 2.4, distanciaMovil: 40 },

  /* --- Brillo (bloom) propio, sin librerías extra ------------------------- */
  bloom: { fuerza: 0.85, umbral: 0.30, suavidad: 0.28, radio: 1.15 },

  /* --- Calidad: [bajo, medio, alto] --------------------------------------- */
  calidad: { factor: [0.32, 0.64, 1], dpr: [1, 1.5, 2], bloomDesde: 1 },

  /* --- Tiempos ------------------------------------------------------------ */
  tiempos: { union: 7.0, esperaMensaje: 0.55 }
};

/* =============================================================================
   3) UTILIDADES
============================================================================= */
Flores.math = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  smooth: (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); },
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  /* Interpolación suave independiente de los FPS. */
  damp: (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt))
};

/* Aleatorio con semilla (mulberry32): la escena luce igual en cada visita. */
Flores.rng = function (seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* 0xRRGGBB → '#rrggbb' (lo usa el modo 2D y el CSS dinámico). */
Flores.css = (hex) => '#' + ('000000' + hex.toString(16)).slice(-6);

/* Reemplaza {nombre} por el destinatario en cualquier texto. */
Flores.tpl = (txt) => String(txt || '').replace(/\{nombre\}/g, window.dedication.recipient);
