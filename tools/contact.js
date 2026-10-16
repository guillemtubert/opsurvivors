/* ============ contact.js — hoja de contactos numerada de una hoja de sprites ============
 *
 *   node tools/contact.js <hoja.png> <salida.png> [fondo=#ffffff] [umbral=30] [junta=6]
 *   (junta: distancia a la que se juntan los trozos de una figura; -1 = no juntar, para atlas apretados)
 *
 * Quita el fondo liso, separa cada figura (componentes conexos) y las dibuja en
 * una cuadrícula con su número encima, en orden de lectura (filas de arriba
 * abajo, de izquierda a derecha). Imprime los recuadros [x, y, w, h] de cada
 * número: así se eligen los fotogramas de cada dirección para sprites.config.js.
 */
const fs = require('fs');
const { decode, encode } = require('./png');
const P = require('./pixelize');

const [, , src, dst, bg = '#ffffff', thr = '30', gapArg = '6'] = process.argv;
if (!src || !dst) { console.log('Uso: node tools/contact.js <hoja.png> <salida.png> [fondo] [umbral]'); process.exit(1); }

const img = P.removeFlatBg(decode(fs.readFileSync(src)), bg, +thr, 2, 1, false);
let boxes = P.components(img, +gapArg, 200);
const hs = boxes.map(b => b.h).sort((a, b) => a - b), med = hs[hs.length >> 1];
boxes = boxes.filter(b => b.h > med * 0.45);

// Orden de lectura: agrupa por filas (centros a menos de media altura) y ordena por x.
boxes.sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2));
const rows = [];
for (const b of boxes) {
  const r = rows.find(r => Math.abs(r.cy - (b.y + b.h / 2)) < med * 0.5);
  if (r) r.list.push(b); else rows.push({ cy: b.y + b.h / 2, list: [b] });
}
const ordered = rows.flatMap(r => r.list.sort((a, b) => a.x - b.x));

// Cifras de 3×5 para numerar.
const DIG = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001',
             '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'];
const CELL = 130, LAB = 22, COLS = 10, maxH = Math.max(...ordered.map(b => b.h)), k = (CELL - 8) / maxH;
const W = COLS * CELL, H = Math.ceil(ordered.length / COLS) * (CELL + LAB);
const out = { w: W, h: H, data: Buffer.alloc(W * H * 4, 255) };
const put = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; out.data[i] = c[0]; out.data[i + 1] = c[1]; out.data[i + 2] = c[2]; out.data[i + 3] = 255; };

ordered.forEach((b, n) => {
  const cx = (n % COLS) * CELL, cy = Math.floor(n / COLS) * (CELL + LAB);
  String(n).split('').forEach((d, j) => {
    for (let p = 0; p < 15; p++) if (DIG[d][p] === '1')
      for (let a = 0; a < 3; a++) for (let c = 0; c < 3; c++) put(cx + 4 + j * 12 + (p % 3) * 3 + a, cy + 3 + Math.floor(p / 3) * 3 + c, [200, 30, 30]);
  });
  // La figura, escalada con la misma k para todas (se ven los tamaños relativos), sobre gris claro.
  for (let y = 0; y < CELL - 4; y++) for (let x = 0; x < CELL - 4; x++) {
    const sx = b.x + Math.floor(x / k), sy = b.y + Math.floor(y / k);
    if (sx >= b.x + b.w || sy >= b.y + b.h) { put(cx + 2 + x, cy + LAB + y, [235, 235, 235]); continue; }
    const i = (sy * img.w + sx) * 4;
    put(cx + 2 + x, cy + LAB + y, img.data[i + 3] < 128 ? [235, 235, 235] : [img.data[i], img.data[i + 1], img.data[i + 2]]);
  }
});
fs.writeFileSync(dst, encode(out));
ordered.forEach((b, n) => console.log(n + ': [' + [b.x, b.y, b.w, b.h].join(', ') + ']'));
