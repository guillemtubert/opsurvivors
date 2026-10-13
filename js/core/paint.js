/* ============ paint.js — pintar pixel art con luz, tramado y contorno ============
 * Herramientas comunes para los objetos del mapa (world/props.js) y los
 * personajes articulados (core/doll.js): así todo comparte estilo.
 *
 * Cada píxel toma un tono de una rampa de colores (de oscuro a claro) según
 * la luz, que viene de arriba a la izquierda, con tramado ordenado en el
 * borde entre tonos. Al final, contorno oscuro alrededor de la silueta y,
 * opcionalmente, líneas interiores donde una pieza tapa a otra.
 *
 *   const cv = G.Paint.canvas(w, h);
 *   cv.part = 3;                      // (opcional) pieza a la que pertenece lo que se pinta
 *   G.Paint.ball(cv, cx, cy, rx, ry, ramp, { z, tex, clip })
 *   G.Paint.stroke(cv, x0, y0, x1, y1, w0, w1, ramp, z)
 *   cv.flat = true                    // sombreado limpio por bloques, sin tramado (personajes)
 *   G.Paint.finish(cv, { inner: true }) -> <canvas>
 */
G.Paint = (() => {
  const OUTLINE = [26, 18, 32];
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  const LIGHT = (() => { const v = [-0.55, -0.65, 0.55], m = Math.hypot(...v); return v.map(x => x / m); })();

  const rgb = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  /** Rampa de tonos (de oscuro a claro) a partir de unos pocos colores. */
  const ramp = (...hex) => hex.map(rgb);
  const sh = (hex, k) => G.U.shade(hex, k);

  function canvas(w, h) {
    const data = new Uint8ClampedArray(w * h * 4);
    const depth = new Float32Array(w * h).fill(-1e9);     // lo de delante tapa lo de detrás
    const parts = new Int16Array(w * h).fill(-1);
    return {
      w, h, data, depth, parts, part: 0, ox: 0, oy: 0,     // ox/oy: desplaza todo lo que se pinta
      set(x, y, c, z = 0) {
        x = (x + this.ox) | 0; y = (y + this.oy) | 0;
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const i = y * w + x;
        if (z < depth[i]) return;
        depth[i] = z; parts[i] = this.part;
        data[i * 4] = c[0]; data[i * 4 + 1] = c[1]; data[i * 4 + 2] = c[2]; data[i * 4 + 3] = 255;
      }
    };
  }

  /** Tono de la rampa según la luz (0..1), con tramado en (x, y). */
  function tone(pal, l, x, y, flat = false) {
    // Sin tramado: luz más suave y redondeo al tono más cercano.
    if (flat) return pal[G.U.clamp(Math.floor((0.5 + (l - 0.5) * 0.8) * pal.length), 0, pal.length - 1)];
    const v = G.U.clamp(l, 0, 0.999) * pal.length + BAYER[(y & 3) * 4 + (x & 3)] - 0.5;
    return pal[G.U.clamp(Math.floor(v), 0, pal.length - 1)];
  }

  /**
   * Bola (elipsoide) sombreada.
   *   z     profundidad base (lo más alto tapa)
   *   tex   grumos (hojas, pelo)
   *   clip  (x, y) => bool: sólo pinta donde devuelve true
   *   light desplaza la luz (+ más clara, - más oscura)
   */
  function ball(cv, cx, cy, rx, ry, pal, o = {}) {
    const { z = 0, tex = 0, clip = null, light = 0 } = typeof o === 'number' ? { tex: o } : o;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, q = nx * nx + ny * ny;
      if (q > 1 || (clip && !clip(x, y))) continue;
      const nz = Math.sqrt(1 - q);
      let l = 0.2 + light + 0.8 * Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
      if (tex) l += (G.U.hash(x >> 1, y >> 1, 77) - 0.5) * tex + (G.U.hash(x, y, 78) - 0.5) * tex * 0.4;
      cv.set(x, y, tone(pal, l, x, y, cv.flat && !tex), z + nz);
    }
  }

  /** Trazo grueso entre dos puntos, sombreado como un cilindro (troncos, brazos, piernas). */
  function stroke(cv, x0, y0, x1, y1, w0, w1, pal, z = 0, light = 0) {
    const len = Math.hypot(x1 - x0, y1 - y0), steps = Math.ceil(len * 2) + 1;
    const nx = -(y1 - y0) / (len || 1), ny = (x1 - x0) / (len || 1);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, cx = G.U.lerp(x0, x1, t), cy = G.U.lerp(y0, y1, t), hw = G.U.lerp(w0, w1, t) / 2;
      for (let o = -hw; o <= hw; o += 0.5) {
        const k = o / (hw || 1);                            // -1 .. 1 a lo ancho
        const l = 0.55 + light - k * 0.4 * Math.sign(nx || 1) + 0.1 * Math.sqrt(Math.max(0, 1 - k * k));
        const x = cx + nx * o, y = cy + ny * o;
        cv.set(x, y, tone(pal, l, x | 0, y | 0, cv.flat), z + Math.sqrt(Math.max(0, 1 - k * k)) * 0.1);
      }
    }
  }

  /** Rectángulo sombreado de arriba (claro) a abajo (oscuro). */
  function rect(cv, x0, y0, w, h, pal, z = 0, light = 0) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const l = 0.75 + light - (y - y0) / Math.max(1, h) * 0.45 - (x - x0) / Math.max(1, w) * 0.15;
      cv.set(x, y, tone(pal, l, x, y, cv.flat), z);
    }
  }

  /** Un píxel de un color fijo (ojos, detalles). */
  function dot(cv, x, y, hex, z = 99) { cv.set(x, y, typeof hex === 'string' ? rgb(hex) : hex, z); }

  /** Contorno de 1 px alrededor de todo lo pintado. */
  function outline(cv) {
    const { w, h, data } = cv;
    const solid = i => data[i * 4 + 3] > 0;
    const add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (solid(i)) continue;
      if ((x > 0 && solid(i - 1)) || (x < w - 1 && solid(i + 1)) || (y > 0 && solid(i - w)) || (y < h - 1 && solid(i + w))) add.push(i);
    }
    for (const i of add) { data[i * 4] = OUTLINE[0]; data[i * 4 + 1] = OUTLINE[1]; data[i * 4 + 2] = OUTLINE[2]; data[i * 4 + 3] = 255; }
  }

  /**
   * Líneas interiores: donde una pieza tapa a otra que está claramente detrás
   * (más de `gap` de profundidad), el píxel de la de detrás se oscurece.
   */
  function innerLines(cv, gap = 5) {
    const { w, h, data, depth, parts } = cv;
    const mark = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!data[i * 4 + 3] || parts[i] < 0) continue;
      for (const j of [i - 1, i + 1, i - w, i + w]) {
        if (j < 0 || j >= w * h || (j === i - 1 && x === 0) || (j === i + 1 && x === w - 1)) continue;
        if (data[j * 4 + 3] && parts[j] !== parts[i] && parts[j] >= 0 && depth[j] > depth[i] + gap) { mark.push(i); break; }
      }
    }
    for (const i of mark) {
      data[i * 4] = (data[i * 4] * 0.35 + OUTLINE[0] * 0.65) | 0;
      data[i * 4 + 1] = (data[i * 4 + 1] * 0.35 + OUTLINE[1] * 0.65) | 0;
      data[i * 4 + 2] = (data[i * 4 + 2] * 0.35 + OUTLINE[2] * 0.65) | 0;
    }
  }

  function finish(cv, o = {}) {
    if (o.inner) innerLines(cv, o.gap);
    outline(cv);
    const c = document.createElement('canvas');
    c.width = cv.w; c.height = cv.h;
    c.getContext('2d').putImageData(new ImageData(cv.data, cv.w, cv.h), 0, 0);
    return c;
  }

  return { canvas, tone, ball, stroke, rect, dot, outline, innerLines, finish, ramp, rgb, sh };
})();
