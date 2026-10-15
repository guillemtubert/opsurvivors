/* ============ props.js — árboles, palmeras, rocas, barriles... a escala de los personajes ============
 * Se pintan píxel a píxel (con G.Paint) con formas sencillas (bolas, cilindros, trazos) y
 * luz desde arriba a la izquierda: cada píxel toma un tono de una rampa de
 * 4-5 colores, con tramado ordenado en los bordes de cada tono, y al final un
 * contorno oscuro (el mismo que llevan los personajes). Así casan con los
 * sprites de One Piece Treasure Cruise pasados a pixel art.
 *
 *   G.Props.make(name, biome)  -> { img, ox, oy }   (ox, oy = pies, en píxeles de arte)
 *   G.Props.META[name]         -> { solid, hp, big } (solid = radio en píxeles de arte)
 */
G.Props = (() => {
  // Las herramientas de pintar son comunes con los personajes (core/paint.js).
  const { canvas, tone, ball, stroke, finish, ramp, rgb, sh } = G.Paint;

  // ---------------- los objetos ----------------
  // Cada uno pinta en un lienzo con margen de 1 px para el contorno.

  const PAINT = {
    tree(b) {
      const cv = canvas(50, 60);
      const leaf = ramp(sh(b.leaf[0], -0.35), b.leaf[0], b.leaf[1], b.leaf[2], b.leaf[3]);
      const bark = ramp(sh(b.trunk[0], -0.35), b.trunk[0], b.trunk[1], sh(b.trunk[1], 0.25));
      stroke(cv, 25, 58, 25, 34, 10, 7, bark);
      stroke(cv, 25, 56, 19, 59, 4, 2, bark); stroke(cv, 25, 56, 31, 59, 4, 2, bark);   // raíces
      // Copa: bolas de detrás hacia delante.
      ball(cv, 25, 16, 15, 13, leaf, { tex: 0.35 });
      ball(cv, 12, 24, 11, 10, leaf, { tex: 0.35 });
      ball(cv, 38, 24, 11, 10, leaf, { tex: 0.35 });
      ball(cv, 18, 31, 11, 8, leaf, { tex: 0.35, z: 0.3 });
      ball(cv, 33, 31, 11, 8, leaf, { tex: 0.35, z: 0.3 });
      ball(cv, 25, 25, 12, 10, leaf, { tex: 0.35, z: 0.5 });
      return { cv, ox: 25, oy: 58 };
    },

    palm(b) {
      const cv = canvas(56, 66);
      const bark = ramp(sh(b.trunk[0], -0.3), b.trunk[0], b.trunk[1], sh(b.trunk[1], 0.3));
      const leaf = ramp(sh(b.leaf[0], -0.3), b.leaf[0], b.leaf[1], b.leaf[2], b.leaf[3]);
      // Tronco curvo con anillos.
      const P = t => [G.U.lerp(G.U.lerp(25, 19, t), G.U.lerp(19, 30, t), t), G.U.lerp(G.U.lerp(64, 42, t), G.U.lerp(42, 20, t), t)];
      for (let i = 0; i < 12; i++) {
        const [x0, y0] = P(i / 12), [x1, y1] = P((i + 1) / 12);
        stroke(cv, x0, y0, x1, y1, G.U.lerp(8, 5, i / 12), G.U.lerp(8, 5, (i + 1) / 12), i % 2 ? bark : bark.slice(0, 3));
      }
      // Hojas: trazos que caen con la gravedad.
      const crown = [30, 19];
      for (const [a, len] of [[-2.9, 24], [-2.3, 20], [-0.85, 20], [-0.25, 24], [3.4, 18], [0.35, 19], [-1.6, 14]]) {
        let [x, y] = crown;
        for (let s = 0; s < len; s++) {
          const nx = crown[0] + Math.cos(a) * s, ny = crown[1] + Math.sin(a) * s + s * s * 0.035;
          const w = G.U.lerp(5, 1.5, s / len);
          stroke(cv, x, y, nx, ny, w, w, leaf, 1 - s / len);
          x = nx; y = ny;
        }
      }
      // Cocos.
      const coco = ramp('#3a2414', '#5e3a1e', '#86562e');
      ball(cv, 27, 22, 3, 3, coco, { tex: 0, z: 2 }); ball(cv, 32, 22, 3, 3, coco, { tex: 0, z: 2 }); ball(cv, 30, 25, 3, 3, coco, { tex: 0, z: 2.2 });
      return { cv, ox: 25, oy: 64 };
    },

    cactus(b) {
      const cv = canvas(32, 46);
      const g = ramp(sh(b.leaf[0], -0.35), b.leaf[0], b.leaf[1], b.leaf[2], b.leaf[3]);
      stroke(cv, 16, 44, 16, 6, 11, 11, g); ball(cv, 16, 7, 5.5, 4, g, { tex: 0, z: 0.1 });
      stroke(cv, 10, 24, 5, 24, 6, 6, g, -0.1); stroke(cv, 5, 26, 5, 13, 6, 6, g); ball(cv, 5, 13, 3, 2.5, g, { tex: 0, z: 0.1 });
      stroke(cv, 22, 30, 27, 30, 6, 6, g, -0.1); stroke(cv, 27, 32, 27, 18, 6, 6, g); ball(cv, 27, 18, 3, 2.5, g, { tex: 0, z: 0.1 });
      // Espinas: puntitos claros.
      for (let i = 0; i < 26; i++) {
        const x = 12 + Math.floor(G.U.hash(i, 1, 5) * 9), y = 8 + Math.floor(G.U.hash(i, 2, 5) * 34);
        cv.set(x, y, rgb('#f4f0d0'), 5);
      }
      return { cv, ox: 16, oy: 44 };
    },

    cloudtree(b) {
      const cv = canvas(50, 58);
      const bark = ramp(sh(b.trunk[0], -0.3), b.trunk[0], b.trunk[1], sh(b.trunk[1], 0.3));
      const cloud = ramp('#9fb4d4', '#c8d6ea', '#e6eef8', '#ffffff');
      stroke(cv, 25, 56, 25, 32, 7, 5, bark);
      ball(cv, 25, 17, 15, 12, cloud, { tex: 0.12 });
      ball(cv, 11, 25, 10, 9, cloud, { tex: 0.12, z: 0.2 });
      ball(cv, 39, 25, 10, 9, cloud, { tex: 0.12, z: 0.2 });
      ball(cv, 25, 28, 13, 9, cloud, { tex: 0.12, z: 0.4 });
      return { cv, ox: 25, oy: 56 };
    },

    dead(b) {
      const cv = canvas(46, 56);
      const bark = ramp(sh(b.trunk[0], -0.35), b.trunk[0], b.trunk[1], sh(b.trunk[1], 0.25));
      stroke(cv, 23, 54, 23, 22, 9, 6, bark);
      stroke(cv, 23, 30, 10, 16, 5, 2, bark); stroke(cv, 13, 19, 6, 18, 2, 1, bark);
      stroke(cv, 23, 26, 36, 12, 5, 2, bark); stroke(cv, 32, 16, 40, 17, 2, 1, bark);
      stroke(cv, 23, 22, 21, 6, 4, 2, bark); stroke(cv, 22, 12, 27, 5, 2, 1, bark);
      stroke(cv, 23, 52, 16, 55, 4, 2, bark); stroke(cv, 23, 52, 30, 55, 4, 2, bark);
      return { cv, ox: 23, oy: 54 };
    },

    rock(b) {
      const cv = canvas(32, 22);
      const r = ramp(sh(b.rock[0], -0.3), b.rock[0], b.rock[1], b.rock[2], sh(b.rock[2], 0.3));
      ball(cv, 13, 13, 11, 8, r, { tex: 0.1 });
      ball(cv, 21, 13, 9, 7, r, { tex: 0.1, z: 0.1 });
      ball(cv, 16, 9, 8, 6, r, { tex: 0.1, z: 0.3 });
      // Base plana y una grieta.
      for (let x = 0; x < 32; x++) for (let y = 19; y < 22; y++) { const i = y * 32 + x; cv.data[i * 4 + 3] = 0; }
      const dark = r[0];
      [[15, 7], [16, 8], [16, 9], [17, 10], [17, 11]].forEach(([x, y]) => cv.set(x, y, dark, 9));
      return { cv, ox: 16, oy: 19 };
    },

    barrel() {
      const cv = canvas(20, 24);
      const wood = ramp('#4e2c14', '#7a4a22', '#9a6434', '#b87a42', '#d8a066');
      const hoop = ramp('#2a2a34', '#4a4a58', '#7a7a8a', '#a8a8b8');
      for (let y = 4; y < 23; y++) {
        const bulge = Math.sin((y - 4) / 18 * Math.PI) * 1.2, hw = 7.5 + bulge;
        for (let x = Math.floor(10 - hw); x <= 10 + hw; x++) {
          const k = (x + 0.5 - 10) / hw;
          const l = 0.62 - k * 0.42 + (x % 4 === 0 ? -0.15 : 0);
          const ring = y === 7 || y === 8 || y === 18 || y === 19;
          cv.set(x, y, tone(ring ? hoop : wood, l, x, y));
        }
      }
      // Tapa (elipse de arriba).
      for (let y = 1; y <= 6; y++) for (let x = 2; x <= 18; x++) {
        const nx = (x - 10) / 8, ny = (y - 4) / 3;
        if (nx * nx + ny * ny <= 1) cv.set(x, y, tone(wood, 0.7 - ny * 0.2, x, y), 1);
      }
      return { cv, ox: 10, oy: 22 };
    },

    crate() {
      const cv = canvas(24, 24);
      const wood = ramp('#5e3a1a', '#8a5a2a', '#b88a4a', '#d6a868');
      // Cara de arriba (más clara) y frontal con tablas.
      for (let y = 1; y < 7; y++) for (let x = 1; x < 23; x++) cv.set(x, y, tone(wood, 0.85, x, y));
      for (let y = 7; y < 23; y++) for (let x = 1; x < 23; x++) {
        let l = 0.5 - (x / 23) * 0.15;
        if (y % 5 === 1) l = 0.2;                                      // junta entre tablas
        if (x === 1 || x === 22 || x === 2 || x === 21) l = 0.3;       // listones de los lados
        if (Math.abs((x - 1) - (y - 7) * 21 / 15) < 1.4) l = 0.35;      // refuerzo en diagonal
        cv.set(x, y, tone(wood, l, x, y));
      }
      [[3, 9], [20, 9], [3, 20], [20, 20]].forEach(([x, y]) => cv.set(x, y, rgb('#c9c9d4'), 2));
      return { cv, ox: 12, oy: 22 };
    }
  };

  // ---------------- objetivos de la isla (world/island.js) ----------------

  /** Cofre de la isla: madera con flejes dorados. `open` = tapa levantada y oro dentro. */
  function chestArt(open) {
    const cv = canvas(28, 26);
    const wood = ramp('#4e2c14', '#7a4a22', '#9a6434', '#c08048', '#dca068');
    const gold = ramp('#8a5a10', '#c08a10', '#ffd23f', '#fff0a0');
    // Caja.
    for (let y = 12; y < 24; y++) for (let x = 2; x < 26; x++) {
      const band = x === 6 || x === 7 || x === 20 || x === 21 || y === 12 || y === 23;
      cv.set(x, y, tone(band ? gold : wood, 0.62 - (y - 12) / 24 - (x - 2) / 80 + (x % 6 === 0 && !band ? -0.12 : 0), x, y));
    }
    if (open) {
      // Tapa abierta (vista por dentro) y monedas asomando.
      for (let y = 3; y < 11; y++) for (let x = 3; x < 25; x++) cv.set(x, y, tone(wood, 0.25 + (y - 3) / 30, x, y), -1);
      for (let x = 3; x < 25; x++) cv.set(x, 2, tone(gold, 0.6, x, 2), -1);
      for (let i = 0; i < 9; i++) ball(cv, 5 + i * 2.2, 11.5 - (i % 3), 2.2, 1.6, gold, { tex: 0, z: 1 });
    } else {
      // Tapa curvada.
      for (let y = 4; y < 12; y++) for (let x = 2; x < 26; x++) {
        const ny = (y - 11) / 8, nx = (x - 14) / 14;
        if (ny * ny + nx * nx * 0.15 > 1.05) continue;
        const band = x === 6 || x === 7 || x === 20 || x === 21;
        cv.set(x, y, tone(band ? gold : wood, 0.95 + ny * 0.5 - (x - 2) / 70, x, y));
      }
      // Cerradura.
      for (let y = 10; y < 16; y++) for (let x = 12; x < 16; x++) cv.set(x, y, tone(gold, y === 13 && (x === 13 || x === 14) ? 0 : 0.8, x, y), 2);
    }
    return { cv, ox: 14, oy: 24 };
  }

  PAINT.chest = () => chestArt(false);
  PAINT.chestOpen = () => chestArt(true);

  /** Den Den Mushi de la Marina: caracol con el auricular encima de la concha. */
  PAINT.denden = () => {
    const cv = canvas(36, 34);
    const skin = ramp('#6a7a3a', '#9aac54', '#c4d27a', '#e6eeaa');
    const shell = ramp('#5a3a5a', '#8a5a7a', '#b884a0', '#e0b8c8');
    const phone = ramp('#141418', '#2a2a32', '#4a4a56', '#7a7a8a');
    const white = ramp('#a8b0c0', '#d8dee8', '#ffffff');
    // Cuerpo (pie del caracol) y cabeza con antenas.
    stroke(cv, 4, 29, 30, 29, 7, 7, skin);
    ball(cv, 7, 20, 6, 8, skin, { tex: 0, z: 2 });
    stroke(cv, 5, 13, 3, 6, 2, 2, skin, 2); stroke(cv, 9, 13, 10, 6, 2, 2, skin, 2);
    ball(cv, 3, 5, 2, 2, white, { tex: 0, z: 3 }); ball(cv, 10, 5, 2, 2, white, { tex: 0, z: 3 });
    cv.set(3, 5, [20, 20, 30], 9); cv.set(10, 5, [20, 20, 30], 9);
    for (let x = 4; x < 10; x++) cv.set(x, 22, [70, 40, 40], 9);          // boca
    // Concha con espiral.
    ball(cv, 21, 20, 11, 10, shell, { tex: 0.05, z: 1 });
    for (let t = 0; t < 14; t += 0.08) {
      const r = 9 - t * 0.6;
      if (r < 1) break;
      cv.set(21 + Math.cos(t) * r, 20 + Math.sin(t) * r * 0.9, shell[0], 5);
    }
    // Auricular y teclado encima.
    stroke(cv, 13, 9, 29, 9, 4, 4, phone, 6);
    ball(cv, 13, 9, 3, 2.5, phone, { tex: 0, z: 6.5 }); ball(cv, 29, 9, 3, 2.5, phone, { tex: 0, z: 6.5 });
    stroke(cv, 21, 11, 21, 13, 2, 2, phone, 6);
    return { cv, ox: 18, oy: 31 };
  };

  /** Going Merry: casco de madera, vela con la calavera y cabeza de oveja. */
  PAINT.merry = () => {
    const cv = canvas(96, 92);
    const hull = ramp('#3a2010', '#6a4020', '#8a5a2e', '#b07a44', '#d09a5a');
    const rail = ramp('#5a3a1a', '#9a6a3a', '#d8b080');
    const sail = ramp('#b8b0a0', '#dcd6c8', '#f4f0e6', '#ffffff');
    const wool = ramp('#a8a090', '#d8d2c4', '#f6f2e8', '#ffffff');
    const mast = ramp('#3a2414', '#5e3a1e', '#86562e');
    const red = ramp('#7a1a20', '#c0303a', '#e8505a');
    // Casco: media elipse con tablas.
    for (let y = 56; y < 86; y++) for (let x = 4; x < 92; x++) {
      const nx = (x - 48) / 44, ny = (y - 56) / 30;
      if (nx * nx + ny * ny > 1) continue;
      const plank = (y - 56) % 6 === 0;
      cv.set(x, y, tone(hull, 0.7 - ny * 0.45 - nx * 0.12 + (plank ? -0.2 : 0), x, y));
    }
    for (let x = 6; x < 90; x++) cv.set(x, 56, tone(rail, 0.7, x, 56), 1);
    for (let x = 6; x < 90; x += 6) for (let y = 52; y < 56; y++) cv.set(x, y, tone(rail, 0.5, x, y), 1);
    for (let x = 6; x < 90; x++) cv.set(x, 51, tone(rail, 0.8, x, 51), 1);
    // Mástil y vela con la calavera de Luffy.
    stroke(cv, 46, 56, 46, 4, 4, 3, mast, 2);
    stroke(cv, 26, 12, 66, 12, 3, 3, mast, 3);
    for (let y = 13; y < 44; y++) {
      const bow = Math.sin((y - 13) / 31 * Math.PI) * 4;
      for (let x = Math.round(25 - bow); x < Math.round(67 + bow); x++) {
        cv.set(x, y, tone(sail, 0.8 - (x - 25) / 90 + Math.sin((y - 13) / 31 * Math.PI) * 0.15, x, y), 4);
      }
    }
    const k = [26, 18, 32];
    ball(cv, 46, 25, 7, 6.5, ramp('#141418', '#141418'), { tex: 0, z: 5 });
    ball(cv, 46, 32, 4, 3, ramp('#141418', '#141418'), { tex: 0, z: 5 });
    [[43, 25], [44, 25], [48, 25], [49, 25], [43, 26], [49, 26]].forEach(([x, y]) => cv.set(x, y, [244, 240, 230], 6));
    stroke(cv, 37, 19, 55, 19, 3, 3, ramp('#e0c050', '#f2d063'), 6);      // sombrero de paja
    stroke(cv, 40, 17, 52, 17, 2, 2, red, 6.5);
    stroke(cv, 36, 37, 56, 41, 2, 2, ramp('#141418', '#141418'), 5);     // huesos cruzados
    stroke(cv, 36, 41, 56, 37, 2, 2, ramp('#141418', '#141418'), 5);
    // Bandera arriba del mástil.
    for (let y = 2; y < 8; y++) for (let x = 47; x < 56; x++) cv.set(x, y, [26, 18, 32], 3);
    // Cabeza de oveja en la proa (a la derecha).
    ball(cv, 88, 46, 7, 7, wool, { tex: 0.25, z: 3 });
    ball(cv, 92, 49, 3, 3, ramp('#c0a080', '#e0c8a8', '#f4e2c8'), { tex: 0, z: 4 });
    ball(cv, 84, 44, 3, 2.5, ramp('#c09040', '#e0b060'), { tex: 0, z: 4 });
    cv.set(90, 45, k, 9);
    return { cv, ox: 48, oy: 84 };
  };

  const META = {
    tree: { solid: 6, big: true }, palm: { solid: 5, big: true }, cactus: { solid: 6, big: true },
    cloudtree: { solid: 5, big: true }, dead: { solid: 5, big: true },
    rock: { solid: 10 }, barrel: { solid: 8, hp: 18 }, crate: { solid: 9, hp: 26 },
    chest: {}, chestOpen: {}, denden: {}, merry: {}
  };

  function make(name, biome) {
    const { cv, ox, oy } = PAINT[name](biome);
    return { img: finish(cv), ox, oy };
  }

  return { make, META, has: name => !!PAINT[name] };
})();
