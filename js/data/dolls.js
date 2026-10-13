/* ============ dolls.js — personajes articulados (ver core/doll.js) ============
 * Cada uno: rampas de color (de oscuro a claro) y sus piezas propias.
 * Las piezas reciben (cv, g, R, Z):
 *   g  esqueleto del fotograma: headX/headY, torsoY, hipY, shoulderY,
 *      side (de lado, mirando a la derecha) · front (de cara) · back (de espaldas),
 *      act ('wind' · 'hit' · 'hurt' · null), legs[], arms[]
 *   R  las rampas      Z  profundidades de cada capa
 * Si un personaje está aquí, se usa este dibujo en vez de su hoja.
 */
G.DOLLS = (() => {
  const { ball, stroke, dot, ramp } = G.Paint;
  const INK = '#1a1220';

  /** Ojo de 2×3 con brillo (o cerrado si le han dado). */
  function eye(cv, x, y, g, z) {
    if (g.act === 'hurt') { dot(cv, x, y + 1, INK, z); dot(cv, x + 1, y + 1, INK, z); return; }
    for (let j = 0; j < 3; j++) { dot(cv, x, y + j, INK, z); dot(cv, x + 1, y + j, INK, z); }
    dot(cv, x, y, '#ffffff', z + 0.1);
  }

  const luffy = {
    ramps: {
      skin: ramp('#7a3a24', '#b8683e', '#e49a68', '#f6c08e', '#ffe0b8'),
      hair: ramp('#0a0810', '#1e1824', '#3a3048'),
      straw: ramp('#7a5418', '#b8862c', '#e0b850', '#f6dc80', '#fff4c0'),
      red: ramp('#5a0e14', '#9a1c26', '#d0303a', '#f05a5a'),
      blue: ramp('#16224a', '#24448a', '#3a64c4', '#6a94ec'),
      white: ramp('#9a9aae', '#d0d0e0', '#ffffff'),
      shoe: ramp('#3a2414', '#6a4426', '#9a6a3a')
    },
    armW: 3.2, legW: 3.4,

    /** Pantalón corto con el dobladillo blanco y peludo. */
    pants(cv, g, R, Z) {
      const top = g.hipY - 3;
      ball(cv, 22, top + 1, g.side ? 5.5 : 6.5, 3, R.blue, { z: Z.pants });
      g.legs.forEach(L => {
        const z = g.side ? (L.near ? Z.pants : Z.farLeg + 2) : Z.pants;
        const ex = L.x + L.dx * 0.45, ey = g.hipY + 3 - L.lift * 0.4;
        stroke(cv, L.x, top + 1, ex, ey, 5.6, 5, R.blue, z, L.near || !g.side ? 0 : -0.15);
        ball(cv, ex + (g.side ? 0.5 : 0), ey + 1, 3.3, 1.5, R.white, { z: z + 1.5, light: 0.2 });
      });
    },

    /** Chaleco rojo abierto (se ve el pecho). */
    torso(cv, g, R, Z) {
      stroke(cv, 22, g.torsoY - 9, 22, g.torsoY - 5, 3.4, 3.4, R.skin, Z.torso - 2);       // cuello
      ball(cv, 22, g.torsoY, g.side ? 5 : 6.5, 6.5, R.red, { z: Z.torso });
      if (g.front) {
        stroke(cv, 22, g.torsoY - 5.5, 22, g.torsoY + 3.5, 3.4, 2.4, R.skin, Z.torso + 2);
        dot(cv, 20, g.torsoY - 2, '#f2d063', Z.torso + 3); dot(cv, 20, g.torsoY + 1, '#f2d063', Z.torso + 3);
      } else if (g.side) {
        stroke(cv, 25.5, g.torsoY - 5, 26, g.torsoY + 2, 2, 1.5, R.skin, Z.torso + 2);
      }
    },

    head(cv, g, R, Z) {
      const x = g.headX, y = g.headY;
      if (g.back) {
        ball(cv, x, y, 8.5, 8, R.skin, { z: Z.head });
        ball(cv, x, y - 1, 9, 8.5, R.hair, { z: Z.hair, tex: 0.3, clip: (px, py) => py <= y + 5 });
        // Puntas del pelo en la nuca.
        for (let i = -7; i <= 7; i += 3) stroke(cv, x + i, y + 4, x + i + 0.5, y + 7, 2.2, 0.8, R.hair, Z.hair);
        return;
      }
      if (g.side) {
        ball(cv, x, y, 8, 8, R.skin, { z: Z.head });
        ball(cv, x - 1, y - 1, 8, 8, R.hair, { z: Z.hair, tex: 0.3, clip: (px, py) => px <= x + 0.5 || py <= y - 2 });
        for (let i = 0; i < 3; i++) stroke(cv, x - 6 + i * 2, y + 3, x - 7 + i * 2, y + 6, 2.2, 0.8, R.hair, Z.hair);
        for (let i = 0; i < 3; i++) stroke(cv, x + 2 + i * 2, y - 3, x + 2.5 + i * 2, y - 0.5, 2, 0.8, R.hair, Z.hair + 1);
        ball(cv, x - 1, y + 2, 1.8, 2, R.skin, { z: Z.hair + 2 });                        // oreja
        eye(cv, x + 4, y + 1, g, Z.hair + 3);
        dot(cv, x + 4, y + 4, '#a85a48', Z.hair + 3);                                       // cicatriz
        if (g.act === 'hurt') { dot(cv, x + 5, y + 5, INK, Z.hair + 3); dot(cv, x + 6, y + 5, INK, Z.hair + 3); }
        else {
          dot(cv, x + 4, y + 5, INK, Z.hair + 3); dot(cv, x + 5, y + 5, '#ffffff', Z.hair + 3); dot(cv, x + 6, y + 5, '#ffffff', Z.hair + 3);
          dot(cv, x + 5, y + 6, INK, Z.hair + 3); dot(cv, x + 6, y + 6, INK, Z.hair + 3);
        }
        return;
      }
      // De cara.
      ball(cv, x - 8.3, y + 1.5, 1.6, 2, R.skin, { z: Z.head - 1 }); ball(cv, x + 8.3, y + 1.5, 1.6, 2, R.skin, { z: Z.head - 1 });
      ball(cv, x, y, 8.5, 8, R.skin, { z: Z.head });
      ball(cv, x, y - 3, 9, 6, R.hair, { z: Z.hair, tex: 0.3, clip: (px, py) => py <= y - 2 });
      for (let i = -6; i <= 6; i += 3) stroke(cv, x + i, y - 3, x + i + (i < 0 ? -0.5 : 0.5), y - 0.5, 2.4, 0.8, R.hair, Z.hair);
      stroke(cv, x - 8, y - 3, x - 8.5, y + 2, 2.4, 1, R.hair, Z.hair); stroke(cv, x + 8, y - 3, x + 8.5, y + 2, 2.4, 1, R.hair, Z.hair);
      eye(cv, x - 4, y + 1, g, Z.hair + 3); eye(cv, x + 3, y + 1, g, Z.hair + 3);
      dot(cv, x + 3, y + 4, '#a85a48', Z.hair + 3); dot(cv, x + 4, y + 4, '#a85a48', Z.hair + 3);   // cicatriz
      if (g.act === 'hurt') { for (let i = -1; i <= 1; i++) dot(cv, x + i, y + 6, INK, Z.hair + 3); return; }
      // Sonrisa con dientes.
      dot(cv, x - 3, y + 5, INK, Z.hair + 3); dot(cv, x + 3, y + 5, INK, Z.hair + 3);
      for (let i = -2; i <= 2; i++) { dot(cv, x + i, y + 5, '#ffffff', Z.hair + 3); dot(cv, x + i, y + 6, INK, Z.hair + 3); }
    },

    /** Sombrero de paja con cinta roja. */
    hat(cv, g, R, Z) {
      const x = g.headX + (g.side ? 0.5 : 0), y = g.headY - 4.5;
      ball(cv, x, y - 4, g.side ? 6 : 6.5, 4.5, R.straw, { z: Z.hat, tex: 0.15, clip: (px, py) => py <= y - 1 });
      ball(cv, x, y - 4, g.side ? 6.2 : 6.7, 4.6, R.red, { z: Z.hat + 2, clip: (px, py) => py >= y - 2.5 && py <= y - 1 });
      ball(cv, x + (g.side ? 1 : 0), y, g.side ? 12 : 12.5, g.side ? 2.6 : 3.2, R.straw, { z: Z.hat + 5, tex: 0.12, light: 0.15 });
    }
  };

  return { luffy };
})();
