/* ============ build-props.js — objetos del mapa a partir de pixel art ampliado ============
 *
 *   node tools/build-props.js            todos los de PROPS
 *   node tools/build-props.js merry      sólo uno
 *
 * Para dibujos que YA son pixel art pero vienen ampliados (y suavizados) en
 * una imagen grande: detecta el tamaño real de cada píxel por la regularidad
 * de los bordes, toma el color dominante del centro de cada celda (así el
 * suavizado no deja colores intermedios), quita el fondo por colores, recorta
 * y le pone el mismo contorno oscuro que al resto de objetos. Resultado: un
 * píxel del PNG = un píxel de arte del juego.
 *
 *   assets/ref/props/<original>   original (NO se sube: ver .gitignore)
 *   opciones: bg (colores de fondo) · tol · crop [x0, y0, x1, y1] · flip (espejo) · zoom (más grande)
 *   assets/props/<id>.png         lo que usa el juego (world/props.js)
 */
const fs = require('fs'), path = require('path');
const { decode, encode } = require('./png');

const ROOT = path.join(__dirname, '..');
const OUTLINE = [26, 18, 32];             // el de core/paint.js

const PROPS = {
  // Going Merry de perfil, proa a la derecha: fuera el cielo y el mar (la espuma se queda).
  merry: { src: 'assets/ref/props/going-merry.png', bg: ['#0a84d1', '#1dbcd9'], tol: 40 },
  // Thousand Sunny (ThousandSunny1, convertida del .jpeg): fondo azul liso. Se corta por la línea
  // del agua (lo de debajo es suelo y un trozo blanco) y se voltea, que mira a la izquierda.
  sunny: { src: 'assets/ref/props/thousand-sunny.png', bg: ['#9ebdfe'], tol: 40, crop: [0, 0, 414, 433], flip: true, zoom: 1.5 }
};

const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const diff = (d, i, c) => Math.abs(d[i] - c[0]) + Math.abs(d[i + 1] - c[1]) + Math.abs(d[i + 2] - c[2]);

/** Tamaño del píxel ampliado y desfase de la rejilla: el periodo en que más bordes coinciden. */
function pitch(img) {
  const { w, h, data } = img, edges = [];
  for (let y = 0; y < h; y += 3) for (let x = 1; x < w; x++) {
    const i = (y * w + x) * 4;
    if (diff(data, i, [data[i - 4], data[i - 3], data[i - 2]]) > 60) edges.push(x);
  }
  let best = { k: 0 };
  for (let p = 3; p <= 16; p += 0.01) {
    let c = 0, s = 0;
    for (const e of edges) { c += Math.cos(2 * Math.PI * e / p); s += Math.sin(2 * Math.PI * e / p); }
    const k = Math.hypot(c, s) / edges.length;
    if (k > best.k) best = { k, p, phase: ((Math.atan2(s, c) / (2 * Math.PI) * p) + p) % p };
  }
  return best;
}

function build(id) {
  const cfg = PROPS[id];
  const src = path.join(ROOT, cfg.src);
  if (!fs.existsSync(src)) throw new Error('No existe: ' + cfg.src + ' (los originales se quedan en local)');
  let img = decode(fs.readFileSync(src));
  // crop [x0, y0, x1, y1]: sólo esa parte del original.
  if (cfg.crop) {
    const [x0, y0, x1, y1] = cfg.crop, w = x1 - x0, h = y1 - y0, d = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) d.set(img.data.subarray(((y0 + y) * img.w + x0) * 4, ((y0 + y) * img.w + x1) * 4), y * w * 4);
    img = { w, h, data: d };
  }
  // zoom: sale más grande (cada píxel del original ocupa más de uno; mejor 1.5 o 2 que valores raros).
  const det = pitch(img), k = det.k, p = det.p / (cfg.zoom || 1), phase = det.phase % p;
  const n = Math.floor((img.w - phase) / p), m = Math.floor((img.h - phase) / p);
  const bg = cfg.bg.map(hex);
  const out = new Uint8Array(n * m * 4);
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
    // Color más repetido en el interior de la celda (sin el borde suavizado).
    const votes = new Map();
    const mg = Math.min(1.5, p * 0.2);     // margen dentro de la celda (menos si la celda es pequeña)
    for (let y = Math.ceil(phase + j * p + mg); y < phase + (j + 1) * p - mg; y++) {
      for (let x = Math.ceil(phase + i * p + mg); x < phase + (i + 1) * p - mg; x++) {
        const q = (y * img.w + x) * 4, key = (img.data[q] >> 3) << 10 | (img.data[q + 1] >> 3) << 5 | (img.data[q + 2] >> 3);
        const v = votes.get(key) || { n: 0, q };
        v.n++; votes.set(key, v);
      }
    }
    let top = null;
    for (const v of votes.values()) if (!top || v.n > top.n) top = v;
    const o = (j * n + i) * 4, d = img.data;
    if (!top || bg.some(c => diff(d, top.q, c) <= cfg.tol)) continue;
    out[o] = d[top.q]; out[o + 1] = d[top.q + 1]; out[o + 2] = d[top.q + 2]; out[o + 3] = 255;
  }
  // Recorte con 1 px de margen para el contorno.
  let x0 = n, y0 = m, x1 = -1, y1 = -1;
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) if (out[(j * n + i) * 4 + 3]) {
    x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, j); y1 = Math.max(y1, j);
  }
  const W = x1 - x0 + 3, H = y1 - y0 + 3, res = new Uint8Array(W * H * 4);
  for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
    const a = (j * n + i) * 4, b = ((j - y0 + 1) * W + (i - x0 + 1)) * 4;
    for (let c = 0; c < 4; c++) res[b + c] = out[a + c];
  }
  const solid = q => res[q * 4 + 3] > 0, add = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const q = y * W + x;
    if (!solid(q) && ((x > 0 && solid(q - 1)) || (x < W - 1 && solid(q + 1)) || (y > 0 && solid(q - W)) || (y < H - 1 && solid(q + W)))) add.push(q);
  }
  for (const q of add) { res.set(OUTLINE, q * 4); res[q * 4 + 3] = 255; }
  // flip: en espejo (los barcos del juego miran a la derecha).
  if (cfg.flip) for (let y = 0; y < H; y++) for (let x = 0; x < W >> 1; x++) {
    const a = (y * W + x) * 4, b = (y * W + W - 1 - x) * 4;
    for (let c = 0; c < 4; c++) { const t = res[a + c]; res[a + c] = res[b + c]; res[b + c] = t; }
  }

  const file = path.join(ROOT, 'assets/props', id + '.png');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, encode({ w: W, h: H, data: res }));
  console.log(id + ': píxel de ' + p.toFixed(2) + ' (coherencia ' + k.toFixed(2) + ') -> ' + W + '×' + H + '  ' + path.relative(ROOT, file));
}

const only = process.argv[2];
for (const id of Object.keys(PROPS)) if (!only || only === id) build(id);
