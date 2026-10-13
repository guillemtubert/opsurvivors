/* ============ animate.js — fotogramas nuevos a partir de los que hay ============
 * Treasure Cruise sólo trae una pose de correr y vistas de lado/tres cuartos.
 * Aquí se sacan las que faltan editando los píxeles de las convertidas (ya
 * reducidas y con paleta, todavía sin contorno):
 *
 *   mirrorLegs(img, ax, hipY)       la misma zancada con las piernas al revés
 *   squeezeLegs(img, ax, hipY, k)   piernas juntas bajo el cuerpo (paso intermedio de la zancada)
 *   liftFoot(img, side, ax, fromY)  un pie levantado (andar de frente o de espaldas)
 *   shiftX(img, dx)                 todo desplazado dx píxeles (balanceo)
 *   toBack(img, opt)                vista de espaldas: cara -> pelo, pecho -> ropa
 *
 * Imágenes { w, h, data } como en pixelize.js. `ax` = x del punto de apoyo.
 */
const P = require('./pixelize');

function px(img, x, y) { const i = (y * img.w + x) * 4; return img.data.subarray(i, i + 4); }
function copy(img) { return { w: img.w, h: img.h, data: Uint8Array.from(img.data) }; }

/**
 * Piernas en espejo respecto al punto de apoyo: la pierna de delante pasa
 * atrás y viceversa (el otro paso de la zancada). La imagen se ensancha si
 * hace falta para que quepan. Devuelve { img, ax }.
 */
function mirrorLegs(img, ax, hipY) {
  const half = Math.max(ax, img.w - 1 - ax);
  const w = half * 2 + 1, off = half - ax;
  const out = P.blank(w, img.h);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const p = px(img, x, y);
    if (!p[3]) continue;
    const nx = y >= hipY ? (2 * ax - x) + off : x + off;
    if (nx >= 0 && nx < w) out.data.set(p, (y * w + nx) * 4);
  }
  return { img: out, ax: half };
}

/**
 * Cierra las piernas hacia el punto de apoyo: cuanto más abajo, más juntas
 * (a los pies llega el factor k). De una zancada sale el paso intermedio.
 */
function squeezeLegs(img, ax, hipY, k = 0.35) {
  const out = copy(img);
  for (let y = hipY; y < img.h; y++) {
    const kk = 1 + (k - 1) * Math.min(1, (y - hipY) / Math.max(1, img.h - 1 - hipY));
    for (let x = 0; x < img.w; x++) out.data[(y * img.w + x) * 4 + 3] = 0;
    for (let x = 0; x < img.w; x++) {
      const sx = Math.round(ax + (x - ax) / kk);
      if (sx < 0 || sx >= img.w) continue;
      const p = px(img, sx, y);
      if (p[3]) out.data.set(p, (y * img.w + x) * 4);
    }
  }
  return out;
}

/** Todo desplazado dx píxeles en horizontal (la imagen crece para que quepa). */
function shiftX(img, dx) {
  const out = P.blank(img.w + Math.abs(dx), img.h);
  P.blit(out, img, Math.max(0, dx), 0);
  return out;
}

/** Levanta `dy` píxeles la parte baja de una pierna ('L' = a la izquierda del apoyo). */
function liftFoot(img, side, ax, fromY, dy = 2) {
  const out = copy(img);
  const inSide = x => side === 'L' ? x < ax : x >= ax;
  for (let y = Math.max(0, fromY - dy); y < img.h; y++) for (let x = 0; x < img.w; x++) {
    if (inSide(x)) out.data[(y * img.w + x) * 4 + 3] = 0;
  }
  for (let y = fromY; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    if (!inSide(x)) continue;
    const p = px(img, x, y);
    if (p[3]) out.data.set(p, ((y - dy) * img.w + x) * 4);
  }
  // Lo que quedó tapado por encima del corte (muslo) vuelve si el pie no lo cubre.
  for (let y = Math.max(0, fromY - dy); y < fromY; y++) for (let x = 0; x < img.w; x++) {
    const i = (y * img.w + x) * 4;
    if (inSide(x) && !out.data[i + 3] && img.data[i + 3]) out.data.set(px(img, x, y), i);
  }
  return out;
}

// ---------------- vista de espaldas ----------------

function hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: mx ? d / mx : 0, v: mx / 255 };
}
const is = {
  // Piel: naranja apagado. El amarillo de la paja (tono > 34) no cuenta.
  skin: c => c.h >= 5 && c.h <= 34 && c.s >= 0.15 && c.s <= 0.78 && c.v > 0.4,
  red: c => (c.h < 14 || c.h > 340) && c.s > 0.4 && c.v > 0.25,
  dark: c => c.v < 0.3,
  pale: c => c.s < 0.18 && c.v > 0.7
};

/** Tono de una rampa según el brillo original (conserva el sombreado). */
function shadeFrom(ramp, v) { return ramp[Math.min(ramp.length - 1, Math.floor(v * ramp.length * 1.15))]; }

/**
 * Vista de espaldas a partir de la de frente/tres cuartos:
 *   opt.headTo   fila (fracción del alto) donde acaba la cabeza
 *   opt.torsoTo  fila donde acaba el torso
 *   opt.hair     rampa del pelo (de oscuro a claro) -> cara, ojos y boca
 *   opt.top      rampa de la ropa -> la piel del pecho que queda entre la ropa
 *   opt.topIs    clase de color de la ropa ('red' por defecto)
 *   opt.torsoW   media anchura del pecho (fracción del ancho): lo de fuera son brazos
 */
function toBack(img, opt) {
  const out = copy(img);
  const headTo = Math.round(img.h * opt.headTo), torsoTo = Math.round(img.h * opt.torsoTo);
  const hair = opt.hair.map(P.rgbOf), top = opt.top.map(P.rgbOf), topIs = is[opt.topIs || 'red'];
  for (let y = 0; y < torsoTo; y++) {
    // Extensión de la ropa en esta fila (lo de fuera son los brazos).
    let x0 = img.w, x1 = -1;
    if (y >= headTo) for (let x = 0; x < img.w; x++) {
      const p = px(img, x, y);
      if (p[3] && topIs(hsv(p[0], p[1], p[2]))) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    }
    for (let x = 0; x < img.w; x++) {
      const p = px(img, x, y);
      if (!p[3]) continue;
      const c = hsv(p[0], p[1], p[2]);
      if (y < headTo) {
        if (is.skin(c) || is.dark(c) || is.pale(c)) out.data.set([...shadeFrom(hair, c.v), 255], (y * img.w + x) * 4);
      } else if (x > x0 && x < x1 && Math.abs(x - (x0 + x1) / 2) <= img.w * (opt.torsoW || 0.2) && (is.skin(c) || is.pale(c))) {
        out.data.set([...shadeFrom(top, c.v), 255], (y * img.w + x) * 4);
      }
    }
  }
  return out;
}

module.exports = { mirrorLegs, squeezeLegs, liftFoot, shiftX, toBack };
