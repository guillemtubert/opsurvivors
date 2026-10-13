/* ============ pixelize.js — de ilustración a pixel art ============
 * Funciones puras sobre imágenes { w, h, data: Uint8Array RGBA }. Las usan el
 * generador (tools/build-sprites.js, en Node) y el taller (tools/sprites.html,
 * en el navegador), así los dos convierten exactamente igual.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Pixelize = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  function blank(w, h) { return { w, h, data: new Uint8Array(w * h * 4) }; }

  function rgbOf(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

  /** Quita un color de fondo (con tolerancia por canal, de media). */
  function removeBg(img, hex, tol = 8) {
    const out = { w: img.w, h: img.h, data: Uint8Array.from(img.data) };
    const [br, bg, bb] = rgbOf(hex), d = out.data;
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i] - br) + Math.abs(d[i + 1] - bg) + Math.abs(d[i + 2] - bb) <= tol * 3) d[i + 3] = 0;
    }
    return out;
  }

  /**
   * Quita un fondo liso (JPG sin transparencia: negro, blanco...) sin comerse
   * lo del mismo color que haya en el personaje: sólo se borran las zonas de
   * ese color ANCHAS conectadas al borde (contornos y detalles son finos y se
   * quedan) y luego `fringe` píxeles más alrededor, para limpiar el borde.
   *   color  color del fondo        thr  diferencia máxima por canal (0-255)
   *   r      media anchura mínima de una zona de fondo
   *   pockets  también las bolsas de fondo encerradas por el dibujo (entre brazo y cuerpo)
   */
  function removeFlatBg(img, color = '#000000', thr = 14, r = 3, fringe = 1, pockets = false) {
    const { w, h, data } = img, N = w * h;
    const [R, Gc, B] = rgbOf(color);
    const dark = new Uint8Array(N);                     // "parecido al fondo"
    for (let i = 0; i < N; i++) dark[i] = Math.max(Math.abs(data[i * 4] - R), Math.abs(data[i * 4 + 1] - Gc), Math.abs(data[i * 4 + 2] - B)) <= thr ? 1 : 0;
    // Erosión separable: oscuro con todo su entorno (2r+1)² también oscuro.
    const tmp = new Uint8Array(N), thick = new Uint8Array(N);
    for (let y = 0; y < h; y++) {
      let run = 0;
      const row = y * w;
      for (let x = 0; x < w; x++) { run = dark[row + x] ? run + 1 : 0; tmp[row + x] = run; }
    }
    // tmp = longitud de racha oscura que acaba en x; una ventana [x-r, x+r] es toda oscura si tmp[x+r] >= 2r+1.
    const hor = new Uint8Array(N);
    for (let y = 0; y < h; y++) for (let x = r; x < w - r; x++) hor[y * w + x] = tmp[y * w + x + r] >= 2 * r + 1 ? 1 : 0;
    for (let x = 0; x < w; x++) {
      let run = 0;
      for (let y = 0; y < h; y++) { run = hor[y * w + x] ? run + 1 : 0; tmp[y * w + x] = run; }
    }
    for (let x = 0; x < w; x++) for (let y = r; y < h - r; y++) thick[y * w + x] = tmp[(y + r) * w + x] >= 2 * r + 1 ? 1 : 0;
    // Relleno desde el borde por las zonas anchas.
    const bg = new Uint8Array(N), stack = [];
    for (let x = 0; x < w; x++) { stack.push(x + r * w, (h - 1 - r) * w + x); }
    for (let y = 0; y < h; y++) { stack.push(y * w + r, y * w + w - 1 - r); }
    if (pockets) for (let p = 0; p < N; p++) if (thick[p]) stack.push(p);
    while (stack.length) {
      const p = stack.pop();
      if (p < 0 || p >= N || bg[p] || !thick[p]) continue;
      bg[p] = 1;
      const x = p % w;
      stack.push(p + w, p - w);
      if (x > 0) stack.push(p - 1);
      if (x < w - 1) stack.push(p + 1);
    }
    // El fondo ocupa también el margen de la erosión (r) y `fringe` más, sólo sobre oscuro.
    let cur = bg;
    for (let k = 0; k < r + fringe; k++) {
      const nxt = Uint8Array.from(cur);
      for (let p = 0; p < N; p++) {
        if (cur[p] || !dark[p]) continue;
        const x = p % w;
        if ((p >= w && cur[p - w]) || (p < N - w && cur[p + w]) || (x > 0 && cur[p - 1]) || (x < w - 1 && cur[p + 1])) nxt[p] = 1;
      }
      cur = nxt;
    }
    const out = { w, h, data: Uint8Array.from(data) };
    for (let p = 0; p < N; p++) if (cur[p]) out.data[p * 4 + 3] = 0;
    return out;
  }

  function crop(img, x, y, w, h) {
    const out = blank(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const sx = x + i, sy = y + j;
      if (sx < 0 || sy < 0 || sx >= img.w || sy >= img.h) continue;
      const s = (sy * img.w + sx) * 4, o = (j * w + i) * 4;
      out.data[o] = img.data[s]; out.data[o + 1] = img.data[s + 1]; out.data[o + 2] = img.data[s + 2]; out.data[o + 3] = img.data[s + 3];
    }
    return out;
  }

  /** Recorta los bordes transparentes. Devuelve null si no queda nada. */
  function trim(img, alpha = 32) {
    let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
      if (img.data[(y * img.w + x) * 4 + 3] >= alpha) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    return x1 < 0 ? null : crop(img, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  }

  /** Grupos de píxeles visibles (8 vecinos), unidos si están a menos de `gap`. Orden de lectura. */
  function components(img, gap = 2, minPx = 4) {
    const { w, h, data } = img;
    const seen = new Uint8Array(w * h), out = [], stack = [];
    for (let s = 0; s < w * h; s++) {
      if (seen[s] || data[s * 4 + 3] < 128) continue;
      let x0 = w, y0 = h, x1 = 0, y1 = 0, n = 0;
      stack.push(s); seen[s] = 1;
      while (stack.length) {
        const p = stack.pop(), x = p % w, y = (p / w) | 0;
        n++;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (!seen[q] && data[q * 4 + 3] >= 128) { seen[q] = 1; stack.push(q); }
        }
      }
      if (n >= minPx) out.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, n });
      if (out.length > 4000) break;
    }
    let merged = true;
    while (merged) {
      merged = false;
      for (let i = 0; i < out.length && !merged; i++) for (let j = i + 1; j < out.length; j++) {
        const a = out[i], b = out[j];
        if (a.x - gap <= b.x + b.w && b.x - gap <= a.x + a.w && a.y - gap <= b.y + b.h && b.y - gap <= a.y + a.h) {
          const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
          out[i] = { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y, n: a.n + b.n };
          out.splice(j, 1);
          merged = true;
          break;
        }
      }
    }
    out.sort((a, b) => Math.abs(a.y - b.y) > Math.min(a.h, b.h) / 2 ? a.y - b.y : a.x - b.x);
    return out;
  }

  /**
   * Deja sólo la figura principal: el grupo de píxeles (8 vecinos, alfa >= 128)
   * más grande y su borde suavizado. Quita humo, chispas o restos sueltos.
   */
  function largestOnly(img) {
    const { w, h, data } = img;
    const label = new Int32Array(w * h).fill(-1), stack = [];
    let best = -1, bestN = 0, id = 0;
    for (let s = 0; s < w * h; s++) {
      if (label[s] >= 0 || data[s * 4 + 3] < 128) continue;
      let n = 0;
      stack.push(s); label[s] = id;
      while (stack.length) {
        const p = stack.pop(), x = p % w, y = (p / w) | 0;
        n++;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (label[q] < 0 && data[q * 4 + 3] >= 128) { label[q] = id; stack.push(q); }
        }
      }
      if (n > bestN) { bestN = n; best = id; }
      id++;
    }
    const out = blank(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let keep = label[i] === best;
      // Píxeles semitransparentes del borde de la figura.
      if (!keep && data[i * 4 + 3] && data[i * 4 + 3] < 128) {
        for (let dy = -1; dy <= 1 && !keep; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h && label[ny * w + nx] === best) { keep = true; break; }
        }
      }
      if (keep) out.data.set(data.subarray(i * 4, i * 4 + 4), i * 4);
    }
    return out;
  }

  /**
   * Reduce dividiendo el tamaño entre k (k > 1). Cada píxel nuevo es la media
   * de su zona, pesada por la opacidad (los bordes no se ensucian de fondo).
   * Devuelve colores sin cuantizar y alfa 0/255 (umbral `cut`).
   */
  /**
   * `accent` (opcional) conserva detalles pequeños sobre zonas oscuras, que la
   * media borraría (los ojos de Imu, los filos claros de su túnica):
   *   { dark: 0.22, rim: '#4a4458', rimMin: 0.1 }
   * Si al menos un 4% del bloque es de un color intenso, se queda ese color.
   * Si no, en un bloque más oscuro que `dark` con al menos `rimMin` de
   * píxeles claros, sale `rim`.
   */
  function downscale(img, k, cut = 0.5, accent = null) {
    const w = Math.max(1, Math.round(img.w / k)), h = Math.max(1, Math.round(img.h / k));
    const out = blank(w, h), sd = img.data;
    const rim = accent && accent.rim ? rgbOf(accent.rim) : null;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sx0 = Math.floor(x * k), sx1 = Math.max(sx0 + 1, Math.floor((x + 1) * k));
      const sy0 = Math.floor(y * k), sy1 = Math.max(sy0 + 1, Math.floor((y + 1) * k));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      let vr = 0, vg = 0, vb = 0, vn = 0, light = 0;          // color intenso y píxeles claros
      for (let yy = sy0; yy < sy1 && yy < img.h; yy++) for (let xx = sx0; xx < sx1 && xx < img.w; xx++) {
        const i = (yy * img.w + xx) * 4, al = sd[i + 3] / 255;
        r += sd[i] * al; g += sd[i + 1] * al; b += sd[i + 2] * al; a += al; n++;
        if (accent && al > 0.5) {
          const mx = Math.max(sd[i], sd[i + 1], sd[i + 2]), mn = Math.min(sd[i], sd[i + 1], sd[i + 2]);
          if (mx > 120 && (mx - mn) / mx > 0.5) { vr += sd[i]; vg += sd[i + 1]; vb += sd[i + 2]; vn++; }
          else if (mx > 150) light++;
        }
      }
      const j = (y * w + x) * 4;
      if (n && a / n >= cut) {
        let cr = r / a, cg = g / a, cb = b / a;
        if (accent) {
          if (vn / n >= 0.04) { cr = vr / vn; cg = vg / vn; cb = vb / vn; }
          else if (rim && Math.max(cr, cg, cb) / 255 < (accent.dark || 0.22) && light / n >= (accent.rimMin || 0.1)) [cr, cg, cb] = rim;
        }
        out.data[j] = Math.round(cr); out.data[j + 1] = Math.round(cg); out.data[j + 2] = Math.round(cb); out.data[j + 3] = 255;
      }
    }
    return out;
  }

  /** Todos los colores opacos de varias imágenes (para una paleta común). */
  function colorsOf(imgs) {
    const out = [];
    for (const im of imgs) for (let i = 0; i < im.data.length; i += 4) if (im.data[i + 3]) out.push([im.data[i], im.data[i + 1], im.data[i + 2]]);
    return out;
  }

  /** Paleta de n colores por corte de la mediana. */
  function medianCut(colors, n) {
    if (!colors.length) return [[0, 0, 0]];
    const boxes = [colors];
    while (boxes.length < n) {
      let bi = -1, best = -1, ch = 0;
      boxes.forEach((b, i) => {
        if (b.length < 2) return;
        for (let c = 0; c < 3; c++) {
          let lo = 255, hi = 0;
          for (const p of b) { if (p[c] < lo) lo = p[c]; if (p[c] > hi) hi = p[c]; }
          // Las cajas con muchos píxeles pesan más: los colores grandes salen mejor.
          const score = (hi - lo) * Math.sqrt(b.length);
          if (score > best) { best = score; bi = i; ch = c; }
        }
      });
      if (bi < 0 || best < 4) break;
      const b = boxes[bi].sort((p, q) => p[ch] - q[ch]);
      boxes.splice(bi, 1, b.slice(0, b.length >> 1), b.slice(b.length >> 1));
    }
    return boxes.map(b => {
      const s = [0, 0, 0];
      for (const p of b) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; }
      return s.map(v => Math.round(v / b.length));
    });
  }

  function nearest(pal, r, g, b) {
    let best = pal[0], bd = Infinity;
    for (const p of pal) {
      const d = (p[0] - r) ** 2 * 0.3 + (p[1] - g) ** 2 * 0.59 + (p[2] - b) ** 2 * 0.11;
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  function quantize(img, pal) {
    const out = { w: img.w, h: img.h, data: Uint8Array.from(img.data) }, d = out.data;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const c = nearest(pal, d[i], d[i + 1], d[i + 2]);
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
    }
    return out;
  }

  /** Añade un borde de 1 px alrededor de la silueta (la imagen crece 1 px por lado). */
  function outline(img, hex = '#1a1220') {
    const [r, g, b] = rgbOf(hex);
    const w = img.w + 2, h = img.h + 2, out = blank(w, h);
    const solid = new Uint8Array(w * h);
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
      const s = (y * img.w + x) * 4;
      if (!img.data[s + 3]) continue;
      const j = (y + 1) * w + x + 1;
      solid[j] = 1;
      out.data.set(img.data.subarray(s, s + 4), j * 4);
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const j = y * w + x;
      if (solid[j]) continue;
      if ((x > 0 && solid[j - 1]) || (x < w - 1 && solid[j + 1]) || (y > 0 && solid[j - w]) || (y < h - 1 && solid[j + w])) {
        out.data[j * 4] = r; out.data[j * 4 + 1] = g; out.data[j * 4 + 2] = b; out.data[j * 4 + 3] = 255;
      }
    }
    return out;
  }

  /**
   * Punto de apoyo (los pies): x = centro de los píxeles visibles de la parte
   * baja (el 35% inferior), y = última fila. Así un brazo estirado no
   * desplaza al personaje.
   */
  function anchor(img) {
    let sx = 0, n = 0;
    const from = Math.floor(img.h * 0.65);
    for (let y = from; y < img.h; y++) for (let x = 0; x < img.w; x++) {
      if (img.data[(y * img.w + x) * 4 + 3]) { sx += x; n++; }
    }
    return { x: n ? Math.round(sx / n) : img.w >> 1, y: img.h };
  }

  /** Pega `src` en `dst` en (x, y). */
  function blit(dst, src, x, y) {
    for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) {
      const s = (j * src.w + i) * 4;
      if (!src.data[s + 3]) continue;
      const dx = x + i, dy = y + j;
      if (dx < 0 || dy < 0 || dx >= dst.w || dy >= dst.h) continue;
      dst.data.set(src.data.subarray(s, s + 4), (dy * dst.w + dx) * 4);
    }
  }

  function flipX(img) {
    const out = blank(img.w, img.h);
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
      const s = (y * img.w + x) * 4;
      out.data.set(img.data.subarray(s, s + 4), (y * img.w + img.w - 1 - x) * 4);
    }
    return out;
  }

  return { blank, rgbOf, removeBg, removeFlatBg, crop, trim, components, largestOnly, downscale, colorsOf, medianCut, nearest, quantize, outline, anchor, blit, flipX };
});
