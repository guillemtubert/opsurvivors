/* ============ mapmask.js — colisiones de los mapas dibujados ============
 * Convierte la imagen de una isla en una máscara por píxel de mapa:
 *   0 tierra (se anda) · 1 agua somera (se anda más lento) · 2 bloqueado (mar profundo, muros, edificios, cajas)
 * El mar es el azul conectado con el borde de la imagen. Los tejados y las
 * franjas azules de los muros no tocan el borde, así que cuentan como sólidos.
 * gates: rectángulos en píxeles de la imagen por donde sí se pasa (las puertas).
 */
const MapMask = (() => {
  function build(data, w, h, gates = [], solids = []) {
    const n = w * h;
    const r = (i) => data[i * 4], g = (i) => data[i * 4 + 1], b = (i) => data[i * 4 + 2];
    const blue = new Uint8Array(n);
    for (let i = 0; i < n; i++) blue[i] = b(i) > r(i) + 22 && b(i) > g(i) ? 1 : 0;

    // Mar: flood fill desde el borde sobre píxeles azules.
    const sea = new Uint8Array(n);
    const stack = [];
    const push = (i) => { if (blue[i] && !sea[i]) { sea[i] = 1; stack.push(i); } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (stack.length) {
      const i = stack.pop(), x = i % w, y = (i / w) | 0;
      if (x > 0) push(i - 1);
      if (x < w - 1) push(i + 1);
      if (y > 0) push(i - w);
      if (y < h - 1) push(i + w);
    }

    const mask = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const R = r(i), G = g(i), B = b(i);
      const lum = (R + G + B) / 3, mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      if (sea[i]) mask[i] = lum > 150 ? 1 : 2;
      else if (blue[i]) mask[i] = 2;
      else if (lum < 60) mask[i] = 2;                              // contornos
      else if (lum >= 215 && mx - mn <= 40) mask[i] = 2;           // muros y edificios blancos
      else if (R > G + 15 && G > B && lum > 50 && lum < 140 && R < 175) mask[i] = 2;  // madera
    }
    for (const sd of solids) {
      for (let y = sd.y; y < sd.y + sd.h; y++) for (let x = sd.x; x < sd.x + sd.w; x++) {
        if (x >= 0 && y >= 0 && x < w && y < h && !sea[y * w + x]) mask[y * w + x] = 2;
      }
    }
    for (const gt of gates) {
      for (let y = gt.y; y < gt.y + gt.h; y++) for (let x = gt.x; x < gt.x + gt.w; x++) {
        if (x >= 0 && y >= 0 && x < w && y < h && !sea[y * w + x]) mask[y * w + x] = 0;
      }
    }
    return mask;
  }
  return { build };
})();
if (typeof module === 'object' && module.exports) module.exports = MapMask;
if (typeof G !== 'undefined') G.MapMask = MapMask;
