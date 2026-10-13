/* ============ world.js — islas infinitas pintadas en pixel art ============
 * Terreno por tile (16 px de arte = G.TILE unidades de mundo):
 *   0 mar profundo (frena mucho) · 1 agua (frena) · 2 arena · 3 suelo
 * El suelo se hornea por chunks de 16×16 tiles escribiendo píxel a píxel en un
 * ImageData (orillas con espuma, bordes de hierba...). Los objetos (árboles,
 * palmeras, rocas, barriles) se dibujan cada frame ordenados por altura junto
 * a los personajes, para que puedas pasar por detrás de una palmera.
 *
 * Barriles y cajas se rompen y sueltan cosas. Árboles y rocas bloquean.
 */
G.World = (() => {
  const T = 16;                 // px de arte por tile
  const CH = 16;                // tiles por chunk
  const SPAWN_SAFE = 4;         // tiles sin objetos alrededor del origen

  const BIOMES = [
    { name: 'East Blue', sub: 'Villa Foosha', music: 'sea',
      ground: ['#4f9a45', '#56a24b', '#47903f'], speck: '#3c7a35', light: '#7cc45a', path: ['#a08050', '#94764a'],
      sand: ['#efd9a0', '#e8d095', '#f4e2b0'], sandDot: '#d4b878',
      water: '#3a8ad8', deep: '#2a6ab8', foam: '#e8f6ff', sparkle: '#bfe4ff',
      tree: 'tree', palm: 'palm', leaf: ['#2f7535', '#45943f', '#64b252', '#8ad06a'], trunk: ['#5b3b22', '#7a5130'],
      rock: ['#6e7680', '#8f98a3', '#b1bac4'], flowers: ['#f4d65c', '#f39ac0', '#ffffff'], tuft: ['#3c7a35', '#6ab854'] },
    { name: 'Alabasta', sub: 'Desierto del Reino de la Arena', music: 'sea',
      ground: ['#e0b46a', '#d8ac62', '#e6bc74'], speck: '#c49452', light: '#f0cc8a', path: ['#c89a5a', '#bc8e50'],
      sand: ['#f2d698', '#ecce8e', '#f6deaa'], sandDot: '#d8b070',
      water: '#3ab0c0', deep: '#2a8aa0', foam: '#d8fbff', sparkle: '#b8f0f8',
      tree: 'cactus', palm: 'palm', leaf: ['#3f7a3a', '#56963f', '#78b452', '#9ad06a'], trunk: ['#7a5a30', '#9a7440'],
      rock: ['#a0784a', '#bc9460', '#d6b07a'], flowers: ['#e06a4a', '#f4d65c', '#ffffff'], tuft: ['#a08040', '#c4a050'] },
    { name: 'Skypiea', sub: 'La isla del cielo', music: 'sea',
      ground: ['#eef3fa', '#e4ecf7', '#f7faff'], speck: '#cdd9ec', light: '#ffffff', path: ['#d6e2f2', '#ccd8ea'],
      sand: ['#cfe0f5', '#c4d8f0', '#dae8f8'], sandDot: '#aac4e4',
      water: '#7ab8f0', deep: '#5a98e0', foam: '#ffffff', sparkle: '#e8f4ff',
      tree: 'cloudtree', palm: 'palm', leaf: ['#3f9a6a', '#56b07a', '#7acc90', '#a8e6b4'], trunk: ['#8a6a4a', '#a8865c'],
      rock: ['#a8b8cc', '#c4d2e2', '#e0eaf4'], flowers: ['#ffe14d', '#ff9ec4', '#ffffff'], tuft: ['#c4d4e8', '#ffffff'] },
    { name: 'Thriller Bark', sub: 'El barco-isla fantasma', music: 'sea',
      ground: ['#4a4458', '#504a60', '#443e52'], speck: '#3a3446', light: '#64607a', path: ['#3a3640', '#34303a'],
      sand: ['#5e5a50', '#58544a', '#66625a'], sandDot: '#4a463e',
      water: '#3a4a3a', deep: '#2a362a', foam: '#7a8a6a', sparkle: '#9aac88',
      tree: 'dead', palm: 'dead', leaf: ['#3a3048', '#4a3e5a', '#5e5070', '#74688a'], trunk: ['#2e2638', '#463a50'],
      rock: ['#4a4656', '#625e70', '#7c788a'], flowers: ['#9a8ad0', '#5fe0c0', '#c9cfdc'], tuft: ['#3a3446', '#5a5470'] }
  ];

  // ---------------- dibujos de los objetos (por bioma) ----------------
  const PROPS = {
    tree: { solid: 11, rows: [
      '......kkkk..........', '....kk3333kk........', '...k32223333kk......', '..k3222222333k......', '.k322112222333k.....',
      '.k22111122223333k...', 'k2211111122222333k..', 'k21111111122222333k.', 'k2111111111222223k..', '.k111111111122223k..',
      '.k1111111111122k....', '..k1111111111kk.....', '...kk11111kk........', '.....kkttkk.........', '......kTtk..........',
      '......kTtk..........', '......kTtk..........', '.....kTTttk.........', '....kkkkkkkk........'],
      pal: b => ({ 1: b.leaf[0], 2: b.leaf[1], 3: b.leaf[2], T: b.trunk[0], t: b.trunk[1] }), ox: 7, oy: 18 },
    palm: { solid: 9, rows: [
      '.....kk....kk.......', '...kk22k..k22kk.....', '..k2333kkk3332k.....', '.k23k..k22k..k32k...', 'k2k...k2332k...k2k..',
      'kk...k23k.k32k..kk..', '.....k2k...k2k......', '......kkTk..kk......', '.......kTk..........', '.......kTtk.........',
      '........kTk.........', '........kTtk........', '........kTtk........', '.......kTtk.........', '.......kTtk.........',
      '.......kTtk.........', '......kTTttk........', '.....kkkkkkkk.......'],
      pal: b => ({ 2: b.leaf[1], 3: b.leaf[2], T: b.trunk[0], t: b.trunk[1] }), ox: 8, oy: 17 },
    cactus: { solid: 8, rows: [
      '....kkk.....', '...k232k....', '...k232k.kk.', '.kkk232kk23k', 'k23k232k232k', 'k232232232k.',
      'k232232kkk..', '.kkk232k....', '...k232k....', '...k232k....', '...k232k....', '..kkkkkkk...'],
      pal: b => ({ 2: b.leaf[1], 3: b.leaf[2] }), ox: 5, oy: 11 },
    cloudtree: { solid: 10, rows: [
      '.....kkkkkk.........', '...kkwwwwwwkk.......', '..kwwwwwwwwwwk......', '.kwwwwwwwwwwwwk.....', 'kwwwwwwwwwwwwwwk....',
      'kwWwwwwwwwwwwWWk....', '.kWWwwwwwwwWWWk.....', '..kkWWWWWWWWkk......', '....kkkTtkkk........', '......kTtk..........',
      '......kTtk..........', '......kTtk..........', '.....kTTttk.........', '....kkkkkkkk........'],
      pal: b => ({ T: b.trunk[0], t: b.trunk[1], w: '#ffffff', W: '#d8e4f4' }), ox: 7, oy: 13 },
    dead: { solid: 9, rows: [
      '.k.......k......', 'kTk..k..kTk.....', '.kTk.kk.kTk..k..', '..kTkTk.kTk.kTk.', '...kTTkkTTkkTk..',
      '....kTTTTTTTk...', '.....kTTTtk.....', '......kTtk......', '......kTtk......', '......kTtk......',
      '.....kTTttk.....', '....kkkkkkkk....'],
      pal: b => ({ T: b.trunk[0], t: b.trunk[1] }), ox: 7, oy: 11 },
    rock: { solid: 9, rows: [
      '....kkkkk.....', '..kk33322kk...', '.k3332222221k.', 'k333222222211k', 'k322222222111k', 'k222222221111k',
      '.k2222211111k.', '..kkkkkkkkkk..'],
      pal: b => ({ 1: b.rock[0], 2: b.rock[1], 3: b.rock[2] }), ox: 7, oy: 7 },
    barrel: { solid: 7, hp: 18, rows: [
      '..kkkkkk..', '.kbBBBBbk.', 'kbbbbbbbbk', 'kXXXXXXXXk', 'kbBbbbbBbk', 'kbBbbbbBbk',
      'kbBbbbbBbk', 'kXXXXXXXXk', 'kbbbbbbbbk', '.kbbbbbbk.', '..kkkkkk..'],
      pal: () => ({ b: '#9a6434', B: '#b87a42' }), ox: 5, oy: 10 },
    crate: { solid: 7, hp: 26, rows: [
      'kkkkkkkkkkkk', 'kbbbbbbbbbBk', 'kbkkkkkkkkBk', 'kbkbBbbbkkBk', 'kbkbbBbkbkBk', 'kbkbbbkbbkBk',
      'kbkbbkbBbkBk', 'kbkbkbbbBkBk', 'kbkkkkkkkkBk', 'kbbbbbbbbbBk', 'kkkkkkkkkkkk'],
      pal: () => ({ b: '#b88a4a', B: '#8a6434' }), ox: 6, oy: 10 },
    tuft: { rows: ['.1..1.1.', '.11.111.', '1121121.', '.222222.'],
      pal: b => ({ 1: b.tuft[1], 2: b.tuft[0] }), ox: 4, oy: 3 },
    flower: { rows: ['.a.', 'aya', '.a.', '.g.'],
      pal: b => ({ a: b.flowers[0], y: '#fff6b0', g: b.tuft[0] }), ox: 1, oy: 3 },
    flower2: { rows: ['.a.', 'aya', '.a.', '.g.'],
      pal: b => ({ a: b.flowers[1], y: '#fff6b0', g: b.tuft[0] }), ox: 1, oy: 3 },
    shell: { rows: ['.kkk.', 'kpPpk', 'kPpPk', '.kkk.'],
      pal: () => ({ p: '#ffc0c8', P: '#e8909c' }), ox: 2, oy: 3 }
  };

  let seed = 1, biome = 0;
  const chunks = new Map();             // "cx,cy" -> canvas
  const broken = new Set();             // "tx,ty" de barriles rotos
  const damage = new Map();             // "tx,ty" -> { hp, flash }
  const propCache = new Map();          // "bioma/prop" -> { img, white }

  function B() { return BIOMES[biome]; }

  function reset(s) {
    seed = s | 0;
    chunks.clear(); broken.clear(); damage.clear();
  }

  function setBiome(i) {
    biome = ((i % BIOMES.length) + BIOMES.length) % BIOMES.length;
    chunks.clear();
  }

  // ---------------- terreno ----------------

  const terrCache = new Map();
  function terrain(tx, ty) {
    // Lo cerca del origen siempre es tierra: se empieza en una isla.
    const d = Math.hypot(tx, ty);
    let n = G.U.fbm(tx * 0.05, ty * 0.05, seed);
    if (d < 9) n += (9 - d) * 0.04;
    if (n < 0.26) return 0;
    if (n < 0.33) return 1;
    if (n < 0.39) return 2;
    return 3;
  }

  function terrAt(tx, ty) {
    const k = ((tx & 0xffff) << 16) | (ty & 0xffff);
    let v = terrCache.get(k);
    if (v === undefined) {
      v = terrain(tx, ty);
      if (terrCache.size > 200000) terrCache.clear();
      terrCache.set(k, v);
    }
    return v;
  }

  /** Camino de tierra dentro del suelo (vetas de ruido). */
  function isPath(tx, ty) { return Math.abs(G.U.noise(tx * 0.09, ty * 0.09, seed + 99) - 0.5) < 0.024; }

  /** Objeto de un tile (o null). Mismo resultado siempre para la misma semilla. */
  function propAt(tx, ty) {
    if (Math.abs(tx) < SPAWN_SAFE && Math.abs(ty) < SPAWN_SAFE) return null;
    const t = terrAt(tx, ty);
    const h = G.U.hash(tx, ty, seed + 5);
    const b = B();
    let p = null;
    if (t === 3) {
      if (isPath(tx, ty)) p = h < 0.04 ? 'flower' : null;
      else if (h < 0.045) p = b.tree;
      else if (h < 0.06) p = 'rock';
      else if (h < 0.072) p = 'barrel';
      else if (h < 0.08) p = 'crate';
      else if (h < 0.2) p = 'tuft';
      else if (h < 0.24) p = 'flower';
      else if (h < 0.27) p = 'flower2';
    } else if (t === 2) {
      if (h < 0.03) p = b.palm;
      else if (h < 0.04) p = 'crate';
      else if (h < 0.05) p = 'barrel';
      else if (h < 0.09) p = 'shell';
    } else if (t === 1 && h < 0.012) p = 'rock';
    if (p && broken.has(tx + ',' + ty)) return null;
    return p;
  }

  /** Desplazamiento del objeto dentro de su tile (para que no parezca rejilla). */
  function jitter(tx, ty) {
    return [Math.floor(G.U.hash(tx, ty, seed + 8) * 7) - 3, Math.floor(G.U.hash(tx, ty, seed + 9) * 5) - 2];
  }

  // ---------------- horneado del suelo ----------------

  function rgb32(hex) {
    const n = parseInt(hex.slice(1), 16);
    return (255 << 24) | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255);
  }

  function bake(cx, cy) {
    const b = B();
    const c = document.createElement('canvas');
    c.width = c.height = CH * T;
    const x = c.getContext('2d');
    const img = x.createImageData(CH * T, CH * T);
    const buf = new Uint32Array(img.data.buffer);
    const P = {
      g: b.ground.map(rgb32), sp: rgb32(b.speck), li: rgb32(b.light), pa: b.path.map(rgb32),
      sa: b.sand.map(rgb32), sd: rgb32(b.sandDot), wa: rgb32(b.water), de: rgb32(b.deep),
      fo: rgb32(b.foam), wl: rgb32(G.U.shade(b.water, 0.18)), gd: rgb32(G.U.shade(b.ground[0], -0.18)),
      sw: rgb32(G.U.shade(b.sand[0], -0.12))
    };
    const tx0 = cx * CH, ty0 = cy * CH;

    for (let j = 0; j < CH; j++) {
      for (let i = 0; i < CH; i++) {
        const tx = tx0 + i, ty = ty0 + j;
        const t = terrAt(tx, ty);
        // Vecinos más "altos": de ahí salen orillas y bordes.
        const nb = [];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const r = terrAt(tx + dx, ty + dy);
          if (r > t) nb.push(dx, dy, r);
        }
        const path = t === 3 && isPath(tx, ty);
        for (let py = 0; py < T; py++) {
          for (let px = 0; px < T; px++) {
            const ax = tx * T + px, ay = ty * T + py;
            const hh = G.U.hash(ax, ay, 3);
            // Distancia al vecino más alto (0 = pegado al borde).
            let dmin = 9, rmax = t;
            for (let n = 0; n < nb.length; n += 3) {
              const dx = nb[n], dy = nb[n + 1];
              const ddx = dx < 0 ? px : dx > 0 ? T - 1 - px : 0;
              const ddy = dy < 0 ? py : dy > 0 ? T - 1 - py : 0;
              const d = Math.max(ddx, ddy);
              if (d < dmin) { dmin = d; rmax = nb[n + 2]; }
            }
            let col;
            if (t <= 1) {
              col = t === 0 ? P.de : P.wa;
              if (t === 0 && rmax >= 1 && dmin <= 2) col = P.wa;
              if (rmax >= 2) {
                if (dmin === 0) col = P.fo;
                else if (dmin === 1) col = (ax + ay) & 1 ? P.fo : P.wl;
                else if (dmin === 2) col = P.wl;
              }
              // Olas: rayitas claras.
              if (dmin > 2 && ((ax * 3 + ay * 7) % 41 === 0 || (hh < 0.006))) col = P.wl;
            } else if (t === 2) {
              col = P.sa[(hh * 3) | 0];
              if (hh > 0.97) col = P.sd;
              if (rmax === 3 && dmin <= 1) col = dmin === 0 || ((ax + ay) & 1) ? P.g[0] : col;
              else if (rmax === 3 && dmin === 2 && hh < 0.3) col = P.g[1];
            } else {
              if (path) {
                col = P.pa[hh < 0.5 ? 0 : 1];
              } else {
                col = P.g[(hh * 3) | 0];
                if (hh > 0.985) col = P.sp;
                else if (hh < 0.012) col = P.li;
                // Briznas: un píxel claro sobre uno oscuro.
                const bl = G.U.hash(ax >> 2, ay >> 2, 11);
                if (bl < 0.08 && (ax & 3) === 1) { if ((ay & 3) === 1) col = P.li; else if ((ay & 3) === 2) col = P.sp; }
              }
            }
            buf[(j * T + py) * CH * T + i * T + px] = col;
          }
        }
      }
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  function chunk(cx, cy) {
    const k = cx + ',' + cy;
    let c = chunks.get(k);
    if (!c) {
      c = bake(cx, cy);
      chunks.set(k, c);
      if (chunks.size > 80) {
        // Suelta los más viejos (el Map guarda el orden de inserción).
        const first = chunks.keys().next().value;
        chunks.delete(first);
      }
    }
    return c;
  }

  /** Pinta el suelo visible. Máximo `budget` chunks nuevos por frame. */
  function drawGround(ctx) {
    const cam = G.Camera, S = CH * G.TILE;
    const x0 = Math.floor((cam.x - cam.w / 2) / S), x1 = Math.floor((cam.x + cam.w / 2) / S);
    const y0 = Math.floor((cam.y - cam.h / 2) / S), y1 = Math.floor((cam.y + cam.h / 2) / S);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      ctx.drawImage(chunk(cx, cy), cx * S, cy * S, S, S);
    }
  }

  // ---------------- objetos ----------------

  function propImg(name) {
    const k = biome + '/' + name;
    let p = propCache.get(k);
    if (!p) {
      const d = PROPS[name];
      const img = G.Pix.paint(d.rows, d.pal(B()));
      p = { img, white: G.Pix.white(img) };
      propCache.set(k, p);
    }
    return p;
  }

  /** Mete en `list` los objetos visibles: { y, draw(ctx) } para ordenar por altura. */
  function collectProps(list, now) {
    const cam = G.Camera, TL = G.TILE;
    const x0 = Math.floor((cam.x - cam.w / 2) / TL) - 1, x1 = Math.floor((cam.x + cam.w / 2) / TL) + 1;
    const y0 = Math.floor((cam.y - cam.h / 2) / TL) - 1, y1 = Math.floor((cam.y + cam.h / 2) / TL) + 2;
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const name = propAt(tx, ty);
      if (!name) continue;
      const d = PROPS[name];
      const [jx, jy] = jitter(tx, ty);
      const fx = (tx * T + T / 2 + jx) * G.PX, fy = (ty * T + T / 2 + jy) * G.PX;
      const dmg = damage.get(tx + ',' + ty);
      const flat = !d.solid;
      list.push({
        y: flat ? fy - 1000 : fy,                 // lo plano siempre debajo
        draw(ctx) {
          const p = propImg(name);
          let sx = 0;
          if (dmg && now - dmg.at < 0.15) sx = Math.sin(now * 90) * 2;
          const img = dmg && now - dmg.at < 0.08 ? p.white : p.img;
          ctx.drawImage(img, fx - d.ox * G.PX + sx, fy - d.oy * G.PX, img.width * G.PX, img.height * G.PX);
        }
      });
    }
  }

  /** Objetos sólidos cercanos a (x, y): [{ x, y, r, tx, ty, name }] */
  function solidsNear(x, y, rad) {
    const TL = G.TILE, out = [];
    const tx0 = Math.floor((x - rad) / TL) - 1, tx1 = Math.floor((x + rad) / TL) + 1;
    const ty0 = Math.floor((y - rad) / TL) - 1, ty1 = Math.floor((y + rad) / TL) + 1;
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const name = propAt(tx, ty);
      if (!name || !PROPS[name].solid) continue;
      const [jx, jy] = jitter(tx, ty);
      out.push({ x: (tx * T + T / 2 + jx) * G.PX, y: (ty * T + T / 2 + jy) * G.PX - 3, r: PROPS[name].solid * G.PX * 0.75, tx, ty, name });
    }
    return out;
  }

  /** Empuja un círculo fuera de los objetos sólidos. Devuelve [x, y]. */
  function resolve(x, y, r) {
    for (const s of solidsNear(x, y, r + 24)) {
      const dx = x - s.x, dy = y - s.y, min = r + s.r;
      const d2 = dx * dx + dy * dy;
      if (d2 < min * min) {
        const d = Math.sqrt(d2) || 0.01;
        x = s.x + dx / d * min; y = s.y + dy / d * min;
      }
    }
    return [x, y];
  }

  function isFree(x, y, r) {
    return !solidsNear(x, y, r + 24).some(s => G.U.dist2(x, y, s.x, s.y) < (r + s.r) ** 2);
  }

  /** 0 tierra · 1 agua · 2 mar profundo */
  function waterAt(x, y) {
    const t = terrAt(Math.floor(x / G.TILE), Math.floor(y / G.TILE));
    return t === 0 ? 2 : t === 1 ? 1 : 0;
  }

  /** Daña barriles y cajas dentro del círculo. */
  function hitBreakables(x, y, r, dmg, now) {
    for (const s of solidsNear(x, y, r + 20)) {
      const d = PROPS[s.name];
      if (!d.hp) continue;
      if (G.U.dist2(x, y, s.x, s.y) > (r + s.r) ** 2) continue;
      const k = s.tx + ',' + s.ty;
      const st = damage.get(k) || { hp: d.hp, at: -1 };
      if (now - st.at < 0.12) continue;           // un golpe por ataque
      st.hp -= dmg; st.at = now;
      damage.set(k, st);
      G.Audio.sfx('hit');
      if (st.hp <= 0) {
        broken.add(k); damage.delete(k);
        G.FX.burst(s.x, s.y - 8, '#b87a42', 14, 140);
        G.Pickups.dropBreakable(s.x, s.y);
      }
    }
  }

  return {
    BIOMES, reset, setBiome, get biome() { return biome; }, get info() { return B(); },
    drawGround, collectProps, resolve, isFree, waterAt, hitBreakables, solidsNear
  };
})();
