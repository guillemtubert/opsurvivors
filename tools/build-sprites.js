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
CONFIG.chars = Object.assign({}, CONFIG.chars, require('./enemy.config.js').chars);   // enemigos normales (auto-enemy.js)
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

/** Hoja con fondo liso (JPG negro, blanco...): se limpia una vez entera y se guarda. */
function sheetOf(cfg) {
  if (!cfg.bgFlat) return load(cfg.sheet);
  const key = cfg.sheet + '#sinfondo';
  if (!cache.has(key)) {
    const o = cfg.bgFlat;
    let im = P.removeFlatBg(load(cfg.sheet), o.color || '#000000', o.thr || 14, o.r || 3, o.fringe === undefined ? 1 : o.fringe, o.pockets === 'auto' ? 'auto' : !!o.pockets);
    if (o.despill) im = P.despill(im, o.color, o.despill);
    cache.set(key, im);
  }
  return cache.get(key);
}

/**
 * Fotograma montado a partir de piezas (atlas como el de Imu, que guarda la
 * cabeza y el cuerpo por separado): la cabeza se centra sobre el cuello (la
 * fila más alta del cuerpo) y baja `overlap` píxeles para encajar.
 */
function compose(cfg, spec) {
  const piece = box => {
    let img = P.crop(sheetOf(cfg), ...box);
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
  let img = Array.isArray(spec) ? P.crop(sheetOf(cfg), ...spec) : load(path.join(cfg.dir || '', spec));
  if (cfg.bg) img = P.removeBg(img, cfg.bg, 6);
  if (f && f.solo) img = P.largestOnly(img);
  const t = P.trim(img);
  if (!t) throw new Error('Fotograma vacío: ' + JSON.stringify(spec));
  return cfg.flip ? P.flipX(t) : t;
}

/** Factor de reducción común de los atlas de Treasure Cruise (ver el config). */
function commonK() { return CONFIG.scale.factor; }

const DIRS8 = ['down', 'down-right', 'right', 'up-right', 'up', 'up-left', 'left', 'down-left'];

/**
 * Distribución 'rows4x2' (la de las hojas de 8 direcciones hechas para el
 * juego): 4 filas iguales, cada una con un bloque a la izquierda y otro a la
 * derecha de la mitad, en el sentido de las agujas del reloj desde abajo:
 *   abajo | abajo-derecha · derecha | arriba-derecha · arriba | arriba-izquierda · izquierda | abajo-izquierda
 * Los recuadros de cada paso se detectan solos.
 */
function layoutRows4x2(cfg) {
  const im = sheetOf(cfg), bandH = Math.floor(im.h / 4), out = {};
  const order = [['down', 'down-right'], ['right', 'up-right'], ['up', 'up-left'], ['left', 'down-left']];
  for (let r = 0; r < 4; r++) {
    const boxes = P.components(P.crop(im, 0, r * bandH, im.w, bandH), 6, cfg.minPx || 3000)
      .map(b => [b.x, b.y + r * bandH, b.w, b.h]).sort((a, b) => a[0] - b[0]);
    out[order[r][0]] = boxes.filter(b => b[0] + b[2] / 2 < im.w / 2);
    out[order[r][1]] = boxes.filter(b => b[0] + b[2] / 2 >= im.w / 2);
    for (const d of order[r]) if (!out[d].length) throw new Error('rows4x2: no hay pasos para ' + d);
  }
  return out;
}

/**
 * Distribución 'walk5' (la que se le pide a Gemini con tools/gemini-8d.js): 5 filas
 * (abajo, diagonal abajo, de lado, diagonal arriba, arriba) × 4 pasos. Las tres filas
 * del medio miran a un lado (walkFacing: 'left' o 'right'); el otro lado sale en espejo.
 * Se cortan solas: cada fila es una franja y en ella se toman las 4 figuras más grandes.
 */
function layoutWalk5(cfg) {
  const im = sheetOf(Object.assign({}, cfg, { sheet: cfg.walkSheet || cfg.sheet, bgFlat: cfg.walkBg || cfg.bgFlat }));
  const bandH = im.h / 5, L = (cfg.walkFacing || 'left') === 'left';
  const rows = [['down'], [L ? 'down-left' : 'down-right'], [L ? 'left' : 'right'], [L ? 'up-left' : 'up-right'], ['up']];
  const out = {};
  for (let r = 0; r < 5; r++) {
    const y0 = Math.round(r * bandH);
    const boxes = P.components(P.crop(im, 0, y0, im.w, Math.round(bandH)), 6, cfg.minPx || 800)
      .sort((a, b) => b.n - a.n).slice(0, 4)               // las 4 figuras más grandes
      .map(b => [b.x, b.y + y0, b.w, b.h]).sort((a, b) => a[0] - b[0]);
    if (boxes.length < 2) throw new Error('walk5: la fila ' + (r + 1) + ' tiene ' + boxes.length + ' figuras');
    out[rows[r][0]] = boxes;
  }
  const mirror = L ? { 'down-right': 'down-left', right: 'left', 'up-right': 'up-left' } : { 'down-left': 'down-right', left: 'right', 'up-left': 'up-right' };
  for (const [d, m] of Object.entries(mirror)) out[d] = { mirror: m };
  return out;
}

function build(id, cfg, K) {
  const order = [];                          // [{ anim, src, dx, dir }]
  if (cfg.layout === 'rows4x2') cfg = Object.assign({}, cfg, { dirs8: layoutRows4x2(cfg) });
  if (cfg.layout === 'walk5') cfg = Object.assign({}, cfg, { dirs8: layoutWalk5(cfg) });
  if (cfg.dirs8) {
    // 8 direcciones: los pasos de cada una, en orden. { mirror: 'right' } = los de otra, en espejo.
    const srcs = {};
    for (const d of DIRS8) {
      const spec = cfg.dirs8[d];
      if (!spec) throw new Error(id + ': falta la dirección ' + d);
      if (spec.mirror) continue;
      srcs[d] = spec.map(f => ({ src: source(Object.assign({}, cfg, { sheet: cfg.walkSheet || cfg.sheet, bgFlat: cfg.walkBg || cfg.bgFlat, bg: cfg.walkSheet ? null : cfg.bg }), f), dx: (f && f.dx) || 0 }));
    }
    for (const d of DIRS8) {
      const m = cfg.dirs8[d].mirror;
      const list = m ? srcs[m].map(o => ({ src: P.flipX(o.src), dx: -o.dx })) : srcs[d];
      if (!list) throw new Error(id + ': ' + d + ' copia a ' + m + ', que no tiene pasos propios');
      for (const o of list) order.push({ anim: 'walk', dir: d, src: o.src, dx: o.dx });
    }
    // Poses de lado (mirando a la derecha) para atacar y recibir daño, opcionales.
    for (const a of ['attack', 'hurt']) for (const f of (cfg.anims && cfg.anims[a]) || []) order.push({ anim: a, src: source(cfg, f), dx: (f && f.dx) || 0, side: true });
  } else {
    for (const a of ANIMS) for (const f of cfg.anims[a] || []) order.push({ anim: a, src: source(cfg, f), dx: (f && f.dx) || 0 });
    if (!order.length || order[0].anim !== 'idle') throw new Error(id + ': hace falta al menos un fotograma de idle');
  }

  // Escala: la común (con su talla) o, si la hoja es de otra resolución, su alto propio.
  // (Con 8 direcciones y poses de otra hoja, cada hoja lleva su escala: sideHeight.)
  const k = cfg.height ? order[0].src.h / (cfg.height - 2) : K / (cfg.size || 1);
  // sideRef: alto en el atlas de una pose de pie (así las poses agachadas no salen enormes).
  const kSide = cfg.sideHeight && order.find(o => o.side) ? (cfg.sideRef || order.find(o => o.side).src.h) / (cfg.sideHeight - 2) : k;
  // Sin motas sueltas (restos del fondo que quedan como puntos al reducir).
  const small = order.map(o => P.dropSpecks(P.downscale(o.src, o.side ? kSide : k, 0.5, cfg.accent || null)));
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

  let anims = {}, dirs = null;
  if (cfg.dirs8) {
    // Por dirección: andar 1-2-3-2 (ida y vuelta) y quieto = el paso del medio.
    // 3 pasos: ida y vuelta (1-2-3-2). 4 o más: ciclo completo en bucle (1-2-3-4).
    dirs = {};
    order.forEach((o, i) => { if (o.dir) (dirs[o.dir] = dirs[o.dir] || { walk: [] }).walk.push(i); });
    for (const d of DIRS8) {
      const w = dirs[d].walk, mid = w[w.length >> 1];
      dirs[d] = { idle: [cfg.idleStep !== undefined ? w[cfg.idleStep] : mid], walk: w.length <= 3 ? w.concat(w.slice(1, -1).reverse()) : w };
    }
    anims = { idle: dirs.down.idle, walk: dirs.right.walk };
    order.forEach((o, i) => { if (o.side) (anims[o.anim] = anims[o.anim] || []).push(i); });
  } else {
    order.forEach((o, i) => (anims[o.anim] = anims[o.anim] || []).push(i));
  }
  const heights = dirs ? '8 direcciones, alto ' + Math.min(...done.map(d => d.h)) + '-' + Math.max(...done.map(d => d.h))
    : ANIMS.filter(a => anims[a]).map(a => a + ' ' + anims[a].map(i => done[i].h).join('/')).join(' · ');
  console.log(id.padEnd(8), 'celda ' + fw + '×' + fh, '·', heights, '·', pal.length + ' colores');
  // Cuerpo (radio de choque y retrato): el primer fotograma quieto.
  const i0 = anims.idle[0];
  const body = [half - anchors[i0], fh - done[i0].h, done[i0].w, done[i0].h];
  const out = { file, fw, fh, scale: 1, anims, fps: cfg.fps || {}, body };
  if (dirs) out.dirs = dirs;
  return out;
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
console.log('escala común de los atlas 1/' + K.toFixed(2));
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
