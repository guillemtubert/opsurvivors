/* ============ build-sprites.js — genera las hojas del juego ============
 *
 *   node tools/build-sprites.js            todos los de tools/sprites.config.js
 *   node tools/build-sprites.js luffy      sólo uno
 *
 * Para cada personaje: recorta cada fotograma del atlas, quita el fondo, lo
 * reduce con la ESCALA COMÚN (la misma para todos los personajes: ver el
 * config), saca una paleta propia, perfila y los coloca en una tira con los
 * pies alineados. Sólo poses originales: no se inventa ningún fotograma.
 * Escribe:
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

/**
 * Fotograma montado a partir de piezas (atlas como el de Imu, que guarda la
 * cabeza y el cuerpo por separado): la cabeza se centra sobre el cuello (la
 * fila más alta del cuerpo) y baja `overlap` píxeles para encajar.
 */
function compose(cfg, spec) {
  const piece = box => {
    let img = P.crop(load(cfg.sheet), ...box);
    if (cfg.bg) img = P.removeBg(img, cfg.bg, 6);
    return P.trim(img);
  };
  const body = piece(spec.body), head = piece(spec.head);
  let neck = 0, n = 0;
  for (let x = 0; x < body.w; x++) if (body.data[x * 4 + 3] > 128) { neck += x; n++; }
  const cx = Math.round(neck / Math.max(1, n)) + (spec.dx || 0);
  const left = Math.min(0, cx - (head.w >> 1));
  const w = Math.max(body.w, cx + head.w - (head.w >> 1)) - left;
  const h = body.h + head.h - (spec.overlap || 0);
  const out = P.blank(w, h);
  P.blit(out, body, -left, h - body.h);
  P.blit(out, head, cx - (head.w >> 1) - left, 0);
  return out;
}

/** Un fotograma del config -> imagen recortada y sin fondo, a resolución original. */
function source(cfg, f) {
  if (f && f.body) return cfg.flip ? P.flipX(compose(cfg, f)) : compose(cfg, f);
  const spec = f && f.f !== undefined ? f.f : f;
  let img = Array.isArray(spec) ? P.crop(load(cfg.sheet), ...spec) : load(path.join(cfg.dir || '', spec));
  if (cfg.bg) img = P.removeBg(img, cfg.bg, 6);
  if (f && f.solo) img = P.largestOnly(img);
  const t = P.trim(img);
  if (!t) throw new Error('Fotograma vacío: ' + JSON.stringify(spec));
  return cfg.flip ? P.flipX(t) : t;
}

/** Factor de reducción común: el primer fotograma de idle del de referencia mide `height`. */
function commonK() {
  const { ref, height } = CONFIG.scale;
  const cfg = CONFIG.chars[ref];
  return source(cfg, cfg.anims.idle[0]).h / (height - 2);
}

function build(id, cfg, K) {
  const order = [];                          // [{ anim, src, dx }]
  for (const a of ANIMS) for (const f of cfg.anims[a] || []) order.push({ anim: a, src: source(cfg, f), dx: (f && f.dx) || 0 });
  if (!order.length || order[0].anim !== 'idle') throw new Error(id + ': hace falta al menos un fotograma de idle');

  const k = K / (cfg.size || 1);
  const small = order.map(o => P.downscale(o.src, k, 0.5, cfg.accent || null));
  const pal = P.medianCut(P.colorsOf(small), cfg.colors || 16);
  // Detalles reservados (accent): los colores intensos, aunque sean pocos píxeles,
  // tienen sitio fijo en la paleta (si no, la mediana los descarta: ojos de Imu).
  if (cfg.accent) {
    const vivid = P.colorsOf(small).filter(([r, g, b]) => { const mx = Math.max(r, g, b); return mx > 120 && (mx - Math.min(r, g, b)) / mx > 0.5; });
    if (vivid.length) pal.push(...P.medianCut(vivid, 2));
  }
  const done = small.map(s => P.outline(P.quantize(s, pal), cfg.outline || '#1a1220'));

  // Celda común: pies abajo y centrados en el punto de apoyo de cada fotograma.
  const anchors = done.map((d, i) => P.anchor(d).x - order[i].dx);
  const half = Math.max(...done.map((d, i) => Math.max(anchors[i], d.w - anchors[i])));
  const fw = half * 2, fh = Math.max(...done.map(d => d.h));
  const strip = P.blank(fw * done.length, fh);
  done.forEach((d, i) => P.blit(strip, d, i * fw + half - anchors[i], fh - d.h));

  const file = 'assets/chars/' + id + '.png';
  fs.mkdirSync(path.join(ROOT, 'assets/chars'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, file), encode(strip));

  const anims = {};
  order.forEach((o, i) => (anims[o.anim] = anims[o.anim] || []).push(i));
  const heights = ANIMS.filter(a => anims[a]).map(a => a + ' ' + anims[a].map(i => done[i].h).join('/')).join(' · ');
  console.log(id.padEnd(8), 'celda ' + fw + '×' + fh, '·', heights, '·', pal.length + ' colores');
  const body = [half - anchors[0], fh - done[0].h, done[0].w, done[0].h];
  return { file, fw, fh, scale: 1, anims, fps: cfg.fps || {}, body };
}

// ---------------- principal ----------------
const only = process.argv[2];
if (only && !CONFIG.chars[only]) { console.error('No está en el config:', only); process.exit(1); }
const prev = (() => {
  // Conserva los ya generados que no se rehacen ahora.
  try {
    global.G = {};
    new Function('G', fs.readFileSync(OUT_JS, 'utf8'))(global.G);
    return global.G.CUSTOM_SPRITES || {};
  } catch (e) { return {}; }
})();
const K = commonK();
console.log('escala común 1/' + K.toFixed(2) + ' (' + CONFIG.scale.ref + ' de pie = ' + CONFIG.scale.height + ' px)');
const out = only ? Object.assign({}, prev) : {};
for (const [id, cfg] of Object.entries(CONFIG.chars)) {
  if (only && id !== only) continue;
  out[id] = build(id, cfg, K);
}

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
