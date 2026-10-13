/* ============ build-sprites.js — genera las hojas del juego ============
 *
 *   node tools/build-sprites.js            todos los de tools/sprites.config.js
 *   node tools/build-sprites.js luffy      sólo uno
 *
 * Para cada personaje: recorta cada fotograma, quita el fondo, lo reduce con
 * la MISMA escala para todos, saca una paleta común, crea los que faltan
 * (zancada en espejo, pasos de frente, vista de espaldas: tools/animate.js),
 * perfila y los coloca en una tira con los pies alineados. Escribe:
 *   assets/chars/<id>.png        la tira
 *   js/data/sprites-built.js     dónde está cada animación (lo lee el juego)
 */
const fs = require('fs'), path = require('path');
const { decode, encode } = require('./png');
const P = require('./pixelize');
const A = require('./animate');

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
  if (f && f.solo) img = P.largestOnly(img);
  const t = P.trim(img);
  if (!t) throw new Error('Fotograma vacío: ' + JSON.stringify(spec));
  return cfg.flip ? P.flipX(t) : t;
}

/**
 * Formato antiguo (anims: { idle: [...], walk: [...] }) -> el de direcciones:
 * cada fotograma con nombre y todo en la dirección 'right'.
 */
function normalize(cfg) {
  if (cfg.dirs) return cfg;
  const frames = {}, right = {};
  for (const a of ANIMS) right[a] = (cfg.anims[a] || []).map((f, i) => { frames[a + i] = f; return a + i; });
  return Object.assign({}, cfg, { frames, dirs: { right } });
}

/**
 * Expande una entrada de animación en fotogramas { img, ax, bob }:
 *   'nombre'                  tal cual
 *   { run: 'nombre' }         zancada: pose, pose con piernas en espejo (con rebote)
 *   { step: 'nombre' }        andar de frente: un pie, el otro (con rebote)
 *   { step, back: true }      lo mismo, de espaldas
 *   { back: 'nombre' }        vista de espaldas
 */
function expand(e, q, cfg) {
  const name = typeof e === 'string' ? e : e.run || e.step || e.back;
  const base = q[name];
  if (!base) throw new Error('Fotograma desconocido: ' + name);
  const ax = P.anchor(base).x;
  if (typeof e === 'string') return [{ img: base, ax, bob: 0 }];
  if (e.run) {
    // Zancada, piernas juntas (en el aire), zancada con las piernas cambiadas, piernas juntas.
    const hip = Math.round(base.h * (cfg.hip || 0.6));
    const m = A.mirrorLegs(base, ax, hip);
    m.img = P.largestOnly(m.img);                 // fuera motas sueltas del espejo
    const pass = P.largestOnly(A.squeezeLegs(base, ax, hip, cfg.pass || 0.35));
    const passM = P.largestOnly(A.squeezeLegs(m.img, m.ax, hip, cfg.pass || 0.35));
    return [{ img: base, ax, bob: 0 }, { img: pass, ax, bob: 2 }, { img: m.img, ax: m.ax, bob: 0 }, { img: passM, ax: m.ax, bob: 2 }];
  }
  const img = e.back ? A.toBack(base, cfg.back) : base;
  if (e.step) {
    const from = Math.round(base.h * (cfg.knee || 0.8));
    // Pie izquierdo arriba (el cuerpo se apoya a la derecha), quieto, pie derecho arriba, quieto.
    const dy = cfg.lift || 3;
    return [{ img: A.shiftX(A.liftFoot(img, 'L', ax, from, dy), 1), ax, bob: 1 }, { img, ax, bob: 0 },
            { img: A.liftFoot(img, 'R', ax, from, dy), ax: ax + 1, bob: 1 }, { img, ax, bob: 0 }];
  }
  return [{ img, ax, bob: 0 }];
}

function build(id, raw) {
  const cfg = normalize(raw);
  const names = Object.keys(cfg.frames);
  if (!names.length) throw new Error(id + ': sin fotogramas');

  // Escala común: el de referencia (o el primero) mide `height` con el contorno.
  const src = {};
  for (const n of names) src[n] = source(cfg, cfg.frames[n]);
  const ref = src[cfg.ref || names[0]];
  const k = ref.h / (cfg.height - 2);
  const small = {};
  for (const n of names) small[n] = P.downscale(src[n], k);
  const pal = P.medianCut(P.colorsOf(Object.values(small)), cfg.colors || 16);
  const q = {};
  for (const n of names) q[n] = P.quantize(small[n], pal);

  // Fotogramas por dirección (abajo primero: el fotograma 0 es el retrato).
  const list = [], dirs = {};
  for (const d of ['down', 'right', 'up']) {
    if (!cfg.dirs[d]) continue;
    dirs[d] = {};
    for (const a of ANIMS) {
      if (!cfg.dirs[d][a]) continue;
      dirs[d][a] = [];
      for (const e of cfg.dirs[d][a]) for (const fr of expand(e, q, cfg)) {
        const o = P.outline(fr.img, cfg.outline || '#1a1220');
        dirs[d][a].push(list.length);
        list.push({ img: o, ax: fr.ax + 1 - ((e && e.dx) || 0), bob: fr.bob });
      }
    }
  }

  // Celda común: pies abajo y centrados en el punto de apoyo (con hueco arriba para el rebote).
  const half = Math.max(...list.map(f => Math.max(f.ax, f.img.w - f.ax)));
  const fw = half * 2, fh = Math.max(...list.map(f => f.img.h + f.bob));
  const strip = P.blank(fw * list.length, fh);
  list.forEach((f, i) => P.blit(strip, f.img, i * fw + half - f.ax, fh - f.img.h - f.bob));

  const file = 'assets/chars/' + id + '.png';
  fs.mkdirSync(path.join(ROOT, 'assets/chars'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, file), encode(strip));

  console.log(id.padEnd(10), fw + '×' + fh, list.length + ' fotogramas', pal.length + ' colores', '(escala 1/' + k.toFixed(2) + ')',
              Object.keys(dirs).join('/'));
  const f0 = list[0];
  const body = [half - f0.ax, fh - f0.img.h - f0.bob, f0.img.w, f0.img.h];
  const out = { file, fw, fh, scale: 1, anims: dirs.right || dirs.down, fps: cfg.fps || {}, body };
  if (raw.dirs) out.dirs = dirs;
  return out;
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
