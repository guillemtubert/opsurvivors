/* ============ util.js — helpers compartidos ============ */
window.G = window.G || {};

/** Unidades de mundo por píxel de arte. Todo el juego se pinta a resolución
 *  de arte (×1/PX) y luego se escala sin suavizado: así TODO es pixel art. */
G.PX = 2;
/** Lado de un tile en unidades de mundo (16 px de arte). */
G.TILE = 32;
/** Altura a la que vuelan proyectiles y efectos sobre el plano del suelo. */
G.LIFT = 14;

G.U = {
  clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
  lerp(a, b, t) { return a + (b - a) * t; },
  rand(a, b) { return a + Math.random() * (b - a); },
  randInt(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },

  /** Elige n elementos distintos al azar. */
  pickN(arr, n) {
    const c = arr.slice();
    const out = [];
    while (out.length < n && c.length) out.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]);
    return out;
  },

  dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); },
  dist2(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; },
  norm(x, y) { const m = Math.hypot(x, y); return m > 1e-6 ? [x / m, y / m] : [0, 0]; },

  /** Interpolación independiente del framerate. */
  damp(a, b, rate, dt) { return b + (a - b) * Math.exp(-rate * dt); },

  /** Hash determinista 2D -> [0,1). Para generar el mapa siempre igual. */
  hash(x, y, seed = 0) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  },

  /** Ruido de valor suavizado (0..1). */
  noise(x, y, seed = 0) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const s = t => t * t * (3 - 2 * t);
    const h = G.U.hash;
    const a = h(xi, yi, seed), b = h(xi + 1, yi, seed), c = h(xi, yi + 1, seed), d = h(xi + 1, yi + 1, seed);
    const u = s(xf), v = s(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  },

  /** Ruido fractal de 3 octavas (0..1). */
  fbm(x, y, seed = 0) {
    return (G.U.noise(x, y, seed) * 0.57 + G.U.noise(x * 2.03, y * 2.03, seed + 17) * 0.29 +
            G.U.noise(x * 4.1, y * 4.1, seed + 41) * 0.14);
  },

  /** "3:07" a partir de segundos. */
  mmss(s) {
    const m = Math.floor(s / 60);
    return m + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  },

  /** 1234567 -> "1.234.567" */
  fmt(n) { return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); },

  /** Aclara (k>0) u oscurece (k<0) un color #rrggbb. */
  shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      .map(v => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  },

  /** Colores de los "elementos" de los ataques. */
  ELEM_COLOR: {
    rubber: '#ff5f5f', slash: '#d8f0ff', fire: '#ff8a2a', storm: '#ffe14d',
    shot: '#c9a46a', haki: '#b06bff', ice: '#8fe0ff', sand: '#e0c070', flower: '#ff8ad8', medic: '#7fe08a'
  },
  ELEM_NAME: {
    rubber: 'Goma', slash: 'Espada', fire: 'Fuego', storm: 'Clima', shot: 'Pólvora',
    haki: 'Haki', ice: 'Hielo', sand: 'Arena', flower: 'Flor', medic: 'Médico'
  }
};
