/* ============ build-sprites.js — genera las hojas del juego ============
 *
 *   node tools/build-sprites.js            todos los de tools/sprites.config.js
 *   node tools/build-sprites.js luffy      sólo uno
 *
 * Para cada personaje: recorta cada fotograma, quita el fondo, lo reduce con
 * la MISMA escala para todos, saca una paleta común, perfila y los coloca en
 * una tira con los pies alineados. Escribe:
 *   assets/chars/<id>.png        la tira
 *   js/data/sprites-built.js     dónde está cada animación (lo lee el juego)
 */
const fs = require('fs'), path = require('path');
const { decode, encode } = require('./png');
const P = require('./pixelize');

const ROOT = path.join(__dirname, '..');
const CONFIG = require('./sprites.config.js');
const OUT_JS = path.join(ROOT, 'js/data/sprites-built.js');
const ANIMS = ['idle', 'walk', 'attack', 'hurt'];

const cache = new Map();
function load(file) {
  let img = cache.get(file);
  if (!img) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) throw new Error('No existe: ' + file);
    img = decode(fs.readFileSync(p));
    cache.set(file, img);
  }
  return img;
}

/** Un fotograma del config -> imagen recortada y sin fondo, a resolución original. */
function source(cfg, f) {
  const spec = f && f.f !== undefined ? f.f : f;
  let img = Array.isArray(spec) ? P.crop(load(cfg.sheet), ...spec) : load(path.join(cfg.dir || '', spec));
  if (cfg.bg) img = P.removeBg(img, cfg.bg, 6);
  const t = P.trim(img);
  if (!t) throw new Error('Fotograma vacío: ' + JSON.stringify(spec));
  return cfg.flip ? P.flipX(t) : t;
}

function build(id, cfg) {
  const order = [];                          // [{ anim, src, dx }]
  for (const a of ANIMS) for (const f of cfg.anims[a] || []) order.push({ anim: a, src: source(cfg, f), dx: (f && f.dx) || 0 });
  if (!order.length || order[0].anim !== 'idle') throw new Error(id + ': hace falta al menos un fotograma de idle');

  // Escala común: el primer fotograma de idle mide `height` (con el contorno).
  const k = order[0].src.h / (cfg.height - 2);
  const small = order.map(o => P.downscale(o.src, k));
  const pal = P.medianCut(P.colorsOf(small), cfg.colors || 16);
  const done = small.map(s => P.outline(P.quantize(s, pal), cfg.outline || '#1a1220'));

  // Celda común: pies abajo y centrados en el punto de apoyo de cada fotograma.
  const anchors = done.map((d, i) => { const a = P.anchor(d); return { x: a.x - order[i].dx, y: a.y }; });
  const half = Math.max(...done.map((d, i) => Math.max(anchors[i].x, d.w - anchors[i].x)));
  const fw = half * 2, fh = Math.max(...done.map(d => d.h));
  const strip = P.blank(fw * done.length, fh);
  done.forEach((d, i) => P.blit(strip, d, i * fw + half - anchors[i].x, fh - d.h));

  const file = 'assets/chars/' + id + '.png';
  fs.mkdirSync(path.join(ROOT, 'assets/chars'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, file), encode(strip));

  const anims = {};
  order.forEach((o, i) => (anims[o.anim] = anims[o.anim] || []).push(i));
  console.log(id.padEnd(10), fw + '×' + fh, done.length + ' fotogramas', pal.length + ' colores', '(escala 1/' + k.toFixed(2) + ')');
  const body = [half - anchors[0].x, fh - done[0].h, done[0].w, done[0].h];
  return { file, fw, fh, scale: 1, anims, fps: cfg.fps || {}, body };
}

// ---------------- principal ----------------
const only = process.argv[2];
const prev = (() => {
  // Conserva los ya generados que no se rehacen ahora.
  try {
    global.G = {};
    new Function('G', fs.readFileSync(OUT_JS, 'utf8'))(global.G);
    return global.G.CUSTOM_SPRITES || {};
  } catch (e) { return {}; }
})();
const out = only ? Object.assign({}, prev) : {};
for (const [id, cfg] of Object.entries(CONFIG)) {
  if (only && id !== only) continue;
  out[id] = build(id, cfg);
}
if (only && !CONFIG[only]) { console.error('No está en el config:', only); process.exit(1); }

const body = Object.entries(out).map(([id, v]) => '  ' + id + ': ' + JSON.stringify(v)).join(',\n');
fs.writeFileSync(OUT_JS,
`/* ============ sprites-built.js — GENERADO por tools/build-sprites.js ============
 * No editar a mano: cambia tools/sprites.config.js y vuelve a generar.
 */
G.CUSTOM_SPRITES = Object.assign(G.CUSTOM_SPRITES || {}, {
${body}
});
`);
console.log('->', path.relative(ROOT, OUT_JS));
