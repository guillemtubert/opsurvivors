/* ============ doll.js — personajes articulados en pixel art ============
 * Un personaje se pinta por piezas (piernas, calzado, pantalón, torso, brazos,
 * cabeza, pelo, sombrero) con G.Paint, y las animaciones salen de mover las
 * piezas: no hace falta dibujar cada fotograma.
 *
 *   G.Doll.render(def) -> { frames: [canvas], dirs: { down, up, right }, body }
 *     dirs[dir] = { idle: [i..], walk: [i..], attack: [i..], hurt: [i..] }
 *     (izquierda = derecha en espejo, lo hace el motor)
 *
 * `def` (ver data/dolls.js) da los colores y las piezas propias del personaje
 * (cara, pelo, sombrero, ropa...). Lo común (esqueleto, poses, orden de las
 * piezas según la dirección) está aquí.
 *
 * Coordenadas en píxeles de arte, lienzo W×H con los pies abajo en el centro.
 */
G.Doll = (() => {
  const W = 44, H = 51, CX = 22, FOOT = 46, OY = 3;   // OY: margen arriba para el sombrero

  // Profundidad de cada capa (más alto = delante). Separadas de 10 en 10:
  // las líneas interiores salen donde una capa tapa a otra.
  const Z = { farArm: 0, farLeg: 10, torso: 20, nearLeg: 30, pants: 40, arm: 50, nearArm: 60, head: 70, hair: 75, hat: 80, front: 90 };

  // ---------------- poses ----------------
  // Cada pose: bob (sube/baja el cuerpo), piernas A/B (avance y elevación),
  // brazos A/B (balanceo), y acción (null · 'wind' · 'hit' · 'hurt').
  const IDLE = [{ bob: 0, arm: 0 }, { bob: 0, arm: 1 }];
  const WALK = [
    { bob: 0, legA: [4.5, 0], legB: [-4.5, 1], swing: 1 },
    { bob: -1, legA: [0, 0], legB: [1, 3], swing: 0 },
    { bob: 0, legA: [-4.5, 1], legB: [4.5, 0], swing: -1 },
    { bob: -1, legA: [1, 3], legB: [0, 0], swing: 0 }
  ];
  const ATTACK = [{ bob: 0, act: 'wind' }, { bob: 0, act: 'hit' }];
  const HURT = [{ bob: 0, act: 'hurt' }];

  /** Geometría del esqueleto para una pose y dirección. */
  function skeleton(def, dir, p) {
    const b = p.bob || 0, k = def.body || {};
    const hipY = (k.hipY || 34) + b, shoulderY = (k.shoulderY || 24) + b;
    const side = dir === 'right';
    const legA = p.legA || [0, 0], legB = p.legB || [0, 0];
    const g = {
      dir, side, front: dir === 'down', back: dir === 'up', act: p.act || null,
      bob: b, hipY, shoulderY, footY: FOOT,
      headX: CX + (side ? 0.5 : 0) + (p.act === 'hurt' ? (side ? -1.5 : 0) : 0),
      headY: (k.headY || 14) + b + (p.act === 'hurt' ? 1 : 0),
      torsoY: (k.torsoY || 28) + b
    };
    // Piernas: en la vista lateral avanzan/retroceden; de frente y de espaldas sólo se levantan.
    if (side) {
      g.legs = [
        { x: CX - 0.5, dx: legA[0], lift: legA[1], near: true },
        { x: CX + 0.5, dx: legB[0], lift: legB[1], near: false }
      ];
    } else {
      const sp = k.legSpread || 3;
      g.legs = [
        // La pierna que va detrás levanta el talón 1 px; la que pasa, 2 px.
        { x: CX - sp, dx: 0, lift: legA[1] + (legA[0] < 0 ? 1 : 0), near: true },
        { x: CX + sp, dx: 0, lift: legB[1] + (legB[0] < 0 ? 1 : 0), near: true }
      ];
    }
    // Brazos: hombro -> mano. El balanceo va al contrario que las piernas.
    const sw = p.swing || 0, arm = p.arm || 0, sx = k.shoulderX || 6.5;
    if (side) {
      g.arms = [
        { sx: CX - 0.5, sy: shoulderY, hx: CX + sw * 5, hy: shoulderY + 7 + arm - Math.abs(sw), near: true },
        { sx: CX + 0.5, sy: shoulderY, hx: CX - sw * 5, hy: shoulderY + 7 + arm - Math.abs(sw), near: false }
      ];
    } else {
      g.arms = [
        { sx: CX - sx, sy: shoulderY, hx: CX - sx - 1.5, hy: shoulderY + 6.5 + arm - sw * (g.back ? -2.5 : 2.5), near: true },
        { sx: CX + sx, sy: shoulderY, hx: CX + sx + 1.5, hy: shoulderY + 6.5 + arm + sw * (g.back ? -2.5 : 2.5), near: true }
      ];
    }
    // Acciones.
    const [A, B] = g.arms;
    if (p.act === 'wind') {
      if (side) { A.hx = CX - 6; A.hy = shoulderY + 3; B.hx = CX + 5; B.hy = shoulderY + 2; }
      else if (g.front) { B.hx = CX + sx + 2; B.hy = shoulderY - 2; }
      else { B.hx = CX + sx + 2; B.hy = shoulderY - 1; }
    } else if (p.act === 'hit') {
      if (side) { A.hx = CX + 14; A.hy = shoulderY + 1; A.fist = 2.8; B.hx = CX - 3; B.hy = shoulderY + 5; }
      else if (g.front) { B.hx = CX + 3; B.hy = shoulderY + 6; B.fist = 3.2; B.forward = true; }
      else { B.hx = CX + 3; B.hy = shoulderY - 5; B.fist = 2.6; }
    } else if (p.act === 'hurt') {
      A.hx = CX - sx - 3; A.hy = shoulderY - 2; B.hx = CX + sx + 3; B.hy = shoulderY - 2;
      if (side) { A.hx = CX - 5; B.hx = CX - 7; }
    }
    return g;
  }

  // ---------------- piezas comunes ----------------

  function legs(cv, def, g) {
    const R = def.ramps;
    g.legs.forEach((L, i) => {
      const near = !g.side || L.near;
      const z = g.side ? (near ? Z.nearLeg : Z.farLeg) : Z.nearLeg;
      const light = near ? 0 : -0.15;
      const fx = L.x + L.dx, fy = g.footY - 1.5 - L.lift;
      cv.part = 10 + i;
      const lw = def.legW || 3.6;
      if (g.side && L.lift) {
        // Rodilla adelantada al levantar el pie.
        const kx = (L.x + fx) / 2 + 1.5, ky = (g.hipY + fy) / 2;
        G.Paint.stroke(cv, L.x, g.hipY, kx, ky, lw, lw - 0.3, R[def.legs || 'skin'], z, light);
        G.Paint.stroke(cv, kx, ky, fx, fy, lw - 0.3, lw - 0.6, R[def.legs || 'skin'], z, light);
      } else {
        G.Paint.stroke(cv, L.x, g.hipY, fx, fy, lw, lw - 0.6, R[def.legs || 'skin'], z, light);
      }
      // Calzado: hacia delante en la vista lateral.
      cv.part = 12 + i;
      const shoe = def.shoe || {};
      G.Paint.ball(cv, fx + (g.side ? 1.2 : 0), fy + 1, g.side ? (shoe.rx || 3.2) : (shoe.rx || 2.6) - 0.4, shoe.ry || 1.7, R.shoe, { z: z + 1, light });
    });
  }

  function arms(cv, def, g) {
    const R = def.ramps;
    g.arms.forEach((A, i) => {
      const behind = g.side && !A.near;
      let z = behind ? Z.farArm : g.side ? Z.nearArm : Z.arm;
      if (A.forward) z = Z.front;
      const light = behind ? -0.15 : 0;
      cv.part = 20 + i;
      // Manga (si la hay) y brazo.
      if (def.sleeve) {
        G.Paint.stroke(cv, A.sx, A.sy, G.U.lerp(A.sx, A.hx, def.sleeve), G.U.lerp(A.sy, A.hy, def.sleeve), def.armW + 1.2, def.armW + 0.8, R[def.sleeveRamp || 'top'], z + 0.5, light);
      }
      G.Paint.stroke(cv, A.sx, A.sy, A.hx, A.hy, def.armW || 3.2, (def.armW || 3.2) - 0.6, R[def.arms || 'skin'], z, light);
      cv.part = 24 + i;
      G.Paint.ball(cv, A.hx, A.hy + 0.5, A.fist || 2, A.fist || 2, R[def.hands || 'skin'], { z: z + 1, light });
    });
  }

  // ---------------- un fotograma ----------------

  function frame(def, dir, pose) {
    const cv = G.Paint.canvas(W, H);
    cv.oy = OY;
    cv.flat = true;
    const g = skeleton(def, dir, pose);
    legs(cv, def, g);
    if (def.pants) { cv.part = 30; def.pants(cv, g, def.ramps, Z); }
    cv.part = 40; def.torso(cv, g, def.ramps, Z);
    arms(cv, def, g);
    cv.part = 50; def.head(cv, g, def.ramps, Z);
    if (def.hat) { cv.part = 60; def.hat(cv, g, def.ramps, Z); }
    if (def.extra) { cv.part = 70; def.extra(cv, g, def.ramps, Z); }
    return G.Paint.finish(cv, { inner: true, gap: 5 });
  }

  function render(def) {
    const frames = [], dirs = {};
    for (const dir of ['down', 'up', 'right']) {
      dirs[dir] = {};
      for (const [name, poses] of [['idle', IDLE], ['walk', WALK], ['attack', ATTACK], ['hurt', HURT]]) {
        dirs[dir][name] = poses.map(p => { frames.push(frame(def, dir, p)); return frames.length - 1; });
      }
    }
    // Caja del cuerpo (primer fotograma de frente): radio de choque y retratos.
    const x = frames[0].getContext('2d').getImageData(0, 0, W, H).data;
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) if (x[(y * W + i) * 4 + 3]) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { frames, dirs, body: [x0, y0, x1 - x0 + 1, y1 - y0 + 1] };
  }

  return { render, W, H, CX, FOOT, Z };
})();
