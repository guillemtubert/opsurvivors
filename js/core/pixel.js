/* ============ pixel.js — pixel art desde mapas de caracteres ============
 * Cada sprite es una lista de filas; cada carácter es un píxel y la paleta
 * dice su color ('.' = transparente). Las filas pueden llevar '|' cada 4
 * píxeles para contar fácil: se quitan al cargar.
 *
 *   G.Pix.paint(rows, pal)          -> canvas a resolución de arte
 *   G.Pix.sprite(id)                -> { w, h, frames, flip, white, whiteFlip }
 *                                       frames: [quieto, paso A, paso B]
 *   G.Pix.url(canvas)               -> data URL (para el DOM)
 *
 * Si hay una hoja propia en js/data/custom-sprites.js, se usa en su lugar.
 */
G.Pix = (() => {
  /** Colores comunes a todos los sprites (cada uno puede sobrescribirlos). */
  const BASE = {
    k: '#1a1220', s: '#f8c99c', S: '#d99a6c', w: '#f4f1ea', W: '#c4bdb0', m: '#a8433a', x: '#aeb8c4', X: '#6f7a88'
  };

  function clean(rows, width, warn = false) {
    const out = rows.map(r => r.replace(/\|/g, ''));
    const w = width || Math.max(...out.map(r => r.length));
    return out.map((r, i) => {
      if (warn && r.length !== w) console.warn('[Pix] fila', i, 'mide', r.length, 'y no', w, ':', r);
      return r.padEnd(w, '.').slice(0, w);
    });
  }

  function paint(rows, pal) {
    rows = clean(rows);
    const h = rows.length, w = rows[0].length;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    const p = Object.assign({}, BASE, pal);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const ch = rows[j][i];
        if (ch === '.' || ch === ' ') continue;
        const col = p[ch];
        if (!col) continue;
        x.fillStyle = col;
        x.fillRect(i, j, 1, 1);
      }
    }
    return c;
  }

  function white(img) {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, c.width, c.height);
    return c;
  }

  function flip(img) {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const x = c.getContext('2d');
    x.translate(img.width, 0);
    x.scale(-1, 1);
    x.drawImage(img, 0, 0);
    return c;
  }

  /**
   * Fotogramas de andar a partir del dibujo quieto: en cada paso un pie se
   * levanta un píxel (las 3 últimas filas de una mitad suben).
   */
  function stepRows(rows, side) {
    const h = rows.length, w = rows[0].length, half = w / 2;
    const out = rows.slice();
    const from = h - 3;
    for (let j = from; j < h; j++) {
      const src = j + 1 < h ? rows[j + 1] : '.'.repeat(w);
      const a = out[j].split('');
      for (let i = 0; i < w; i++) {
        if ((side === 0 && i < half) || (side === 1 && i >= half)) a[i] = src[i];
      }
      out[j] = a.join('');
    }
    return out;
  }

  const cache = new Map();

  function build(frames) {
    return {
      w: frames[0].width, h: frames[0].height, frames,
      flip: frames.map(flip), white: frames.map(white), whiteFlip: frames.map(f => white(flip(f)))
    };
  }

  function sprite(id) {
    let s = cache.get(id);
    if (s) return s;
    const def = G.SPRITES[id];
    if (!def) throw new Error('Sprite desconocido: ' + id);
    const rows = clean(def.rows, 16, true);
    s = build([paint(rows, def.pal), paint(stepRows(rows, 0), def.pal), paint(stepRows(rows, 1), def.pal)]);
    s.scale = def.scale || 1;
    cache.set(id, s);
    return s;
  }

  /**
   * Hojas propias (js/data/custom-sprites.js, hechas con tools/sprites.html):
   * una tira horizontal de fotogramas mirando a la derecha. Se cargan al
   * arrancar y sustituyen al dibujo en código sin tocar nada más.
   * Resuelve siempre (si una falla, se queda el dibujo en código).
   */
  function preloadCustom() {
    const all = Object.entries(G.CUSTOM_SPRITES || {}).map(([id, cfg]) => new Promise(done => {
      const img = new Image();
      img.onload = () => {
        const fw = cfg.fw || img.height, fh = cfg.fh || img.height;
        const n = Math.max(1, Math.floor(img.width / fw));
        const frames = [];
        for (let i = 0; i < n; i++) {
          const c = document.createElement('canvas');
          c.width = fw; c.height = fh;
          c.getContext('2d').drawImage(img, i * fw, 0, fw, fh, 0, 0, fw, fh);
          frames.push(c);
        }
        // Siempre 3: quieto, paso A, paso B.
        while (frames.length < 3) frames.push(frames[frames.length - 1]);
        const s = build(frames.slice(0, 3));
        s.scale = cfg.scale || 1;
        s.file = cfg.file; s.n = n;
        cache.set(id, s);
        done();
      };
      img.onerror = () => { console.warn('[Pix] no se pudo cargar', cfg.file); done(); };
      img.src = cfg.file;
    }));
    return Promise.all(all);
  }

  /** Canvas a tamaño ×k (para retratos del DOM). */
  function big(img, k) {
    const c = document.createElement('canvas');
    c.width = img.width * k; c.height = img.height * k;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }

  const urls = new Map();
  function url(img) {
    let u = urls.get(img);
    if (!u) { u = img.toDataURL(); urls.set(img, u); }
    return u;
  }

  /** <img> pixelado de un sprite, para el DOM. */
  function portrait(id, size) {
    const s = sprite(id);
    const w = Math.round(size * s.w / s.h);
    // Hoja propia: abierto con doble clic (file://) el navegador no deja sacar
    // un data URL de una imagen del disco, así que se recorta con CSS.
    if (s.file) {
      return '<span class="px" style="display:inline-block;width:' + w + 'px;height:' + size + 'px;background:url(' + s.file +
        ') 0 0 / ' + (w * s.n) + 'px ' + size + 'px no-repeat;image-rendering:pixelated"></span>';
    }
    return '<img class="px" src="' + url(s.frames[0]) + '" width="' + Math.round(size * s.w / s.h) + '" height="' + size + '" alt="">';
  }

  return { paint, sprite, white, flip, big, url, portrait, clean, preloadCustom };
})();
