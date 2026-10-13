/* ============ png.js — leer y escribir PNG sin dependencias (Node) ============
 * Sólo lo que hace falta para las hojas de sprites: 8 bits por canal, sin
 * entrelazado; escala de grises, RGB, RGBA, gris+alfa y paleta (con tRNS).
 *
 *   const { decode, encode } = require('./png');
 *   const img = decode(fs.readFileSync('a.png'));   // { w, h, data: Uint8Array RGBA }
 *   fs.writeFileSync('b.png', encode(img));
 */
const zlib = require('zlib');

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function decode(buf) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('No es un PNG');
  let pos = 8, w = 0, h = 0, depth = 0, type = 0, interlace = 0, pal = null, trns = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), kind = buf.toString('latin1', pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (kind === 'IHDR') {
      w = body.readUInt32BE(0); h = body.readUInt32BE(4);
      depth = body[8]; type = body[9]; interlace = body[12];
    } else if (kind === 'PLTE') pal = body;
    else if (kind === 'tRNS') trns = body;
    else if (kind === 'IDAT') idat.push(body);
    else if (kind === 'IEND') break;
    pos += 12 + len;
  }
  if (interlace) throw new Error('PNG entrelazado: no soportado');
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type];
  if (!ch) throw new Error('Tipo de color PNG no soportado: ' + type);
  if (depth !== 8 && !(type === 3 && depth < 8)) throw new Error('Profundidad no soportada: ' + depth);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = Math.max(1, (ch * depth) >> 3);              // bytes por píxel (para los filtros)
  const stride = Math.ceil(w * ch * depth / 8);
  const px = Buffer.alloc(stride * h);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = px.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? out[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[i] = v & 255;
    }
    prev = out;
  }

  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4, r = y * stride;
    if (type === 3) {
      const per = 8 / depth, byte = px[r + Math.floor(x / per)];
      const idx = depth === 8 ? byte : (byte >> (8 - depth * (x % per + 1))) & ((1 << depth) - 1);
      data[o] = pal[idx * 3]; data[o + 1] = pal[idx * 3 + 1]; data[o + 2] = pal[idx * 3 + 2];
      data[o + 3] = trns && idx < trns.length ? trns[idx] : 255;
    } else {
      const i = r + x * ch;
      if (ch <= 2) { data[o] = data[o + 1] = data[o + 2] = px[i]; data[o + 3] = ch === 2 ? px[i + 1] : 255; }
      else { data[o] = px[i]; data[o + 1] = px[i + 1]; data[o + 2] = px[i + 2]; data[o + 3] = ch === 4 ? px[i + 3] : 255; }
    }
  }
  return { w, h, data };
}

// CRC32 para los trozos del PNG.
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc32(b) { let c = -1; for (const v of b) c = CRC[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }

function chunk(kind, body) {
  const len = Buffer.alloc(4); len.writeUInt32BE(body.length);
  const kb = Buffer.from(kind, 'latin1');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([kb, body])));
  return Buffer.concat([len, kb, body, crc]);
}

/** RGBA de 8 bits (sin filtros: las hojas son pequeñas). */
function encode({ w, h, data }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(data.buffer, data.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

module.exports = { decode, encode };
