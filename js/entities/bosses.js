/* ============ bosses.js — los ataques de cada jefe ============
 * Cada jefe tiene los suyos y ninguno se repite. Una IA por id de jefe:
 *
 *   AI[id](e, k) -> { mx, my, spd }   hacia dónde anda (spd = multiplicador, 1 por defecto)
 *     e  el jefe (G.Enemy): e.state, e.stateT, e.t1, e.t2 y e.ai (memoria libre)
 *     k  { dt, now, pl, dx, dy, d, nx, ny }  (n = dirección hacia el jugador)
 *
 * Estados que entiende el dibujo (entities/enemy.js):
 *   e.pose    true = pose de ataque          e.hidden  true = no se ve ni se le puede dar
 *   e.z       altura (salto)                 e.fin     se ve sólo su aleta (bajo tierra)
 *   e.immune  true = los golpes no le hacen daño (Tekkai)
 *
 *   morgan     embestida en línea
 *   buggy      abanico de cuchillos · Bara Bara Hō: la mano vuela y vuelve
 *   kuro       Shakushi: se esfuma y caen cortes en línea a tu alrededor
 *   krieg      bombas MH5 (nube de gas) · Daisensō: lanza que estalla en cono
 *   arlong     se sumerge y emerge bajo tus pies · dientes que se quedan clavados en el suelo
 *   mr3        Candle Lock: jaula de cera con una salida · charcos de cera que frenan
 *   wapol      Baku Baku: te aspira y muerde · salto que aplasta
 *   crocodile  Desert Spada: grietas de arena que avanzan · Sables: tornado que te sigue
 *   enel       Sango: rayos que te persiguen · Raigo: zona enorme
 *   lucci      Rankyaku: ondas cortantes · Tekkai: inmune · Rokuogan: estallido a su alrededor
 *   moria      Brick Bat: murciélagos que te persiguen · levanta zombis
 *   imu        látigo negro que gira a su alrededor · anillos de espinas con un hueco
 */
G.Bosses = (() => {
  const STOP = { mx: 0, my: 0 };
  const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  const near = (pl, x, y, r) => !pl.dead && G.U.dist(pl.x, pl.y, x, y) < r + pl.r;
  const onLand = (x, y) => G.World.waterAt(x, y) === 0;

  /** Aviso redondo en el suelo; al acabar, `fn()`. */
  function warn(x, y, r, col, life, fn) {
    const m = G.FX.mark(x, y, r, col, life);
    m.onEnd = fn;
    G.Hazards.add(m);
    return m;
  }
  /** Aviso en línea desde (x, y) con ángulo a; al acabar, `fn()`. */
  function warnLine(x, y, a, len, w, col, life, fn) {
    const m = G.FX.mark(x, y, 0, col, life, 'line', { a, len, w });
    if (fn) { m.onEnd = fn; G.Hazards.add(m); }
    return m;
  }
  /** Zona que dura: `tick(m, dt)` cada frame mientras dura. */
  function zone(x, y, r, col, life, tick, kind = 'circle') {
    const m = G.FX.mark(x, y, r, col, life, kind);
    m.steady = true;
    m.tick = dt => tick(m, dt);
    G.Hazards.add(m);
    return m;
  }
  /** Zona que hace daño cada medio segundo al pisarla. */
  function hurtZone(pl, dmg, extra) {
    let hitT = -9;
    return (m, dt) => {
      const t = G.Game.now;
      if (t - hitT > 0.5 && near(pl, m.x, m.y, m.r)) { hitT = t; pl.hurt(dmg, t); }
      if (extra) extra(m, dt);
    };
  }
  /** Punto en tierra a `dist` del jugador, o null. */
  function besidePlayer(pl, dist) {
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * 6.283;
      const x = pl.x + Math.cos(a) * dist, y = pl.y + Math.sin(a) * dist * 0.8;
      if (onLand(x, y)) return [x, y];
    }
    return null;
  }
  /** Proyectil enemigo. */
  function shot(e, a, speed, dmg, o = {}) {
    return G.Projectiles.spawn(Object.assign({
      foe: true, x: e.x + Math.cos(a) * e.r, y: e.y + Math.sin(a) * e.r, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      dmg, r: 5, life: 3, color: '#ff5f5f', vis: 'ebullet'
    }, o));
  }
  /** Cuenta atrás del ataque: true cuando toca atacar (y lo reprograma). */
  function ready(e, k, key, min, max, range = 400) {
    e[key] -= k.dt;
    if (e[key] > 0 || k.d > range) return false;
    e[key] = G.U.rand(min, max);
    return true;
  }
  /** Lleva la cuenta de qué ataque toca (0, 1, 2...). */
  const turn = e => (e.ai.n = (e.ai.n || 0) + 1);

  const AI = {
    // ---------------- East Blue ----------------

    morgan(e, k) {
      if (e.state === 'aim') {
        e.pose = true;
        if ((e.stateT -= k.dt) <= 0) { e.state = 'dash'; e.stateT = 0.55; }
        return STOP;
      }
      if (e.state === 'dash') {
        if (Math.random() < 0.5) G.FX.puff(e.x, e.y, '#c9b28a', 1);
        if ((e.stateT -= k.dt) <= 0) e.state = 'walk';
        return { mx: e.dashX, my: e.dashY, spd: 4 };
      }
      e.pose = false;
      if (ready(e, k, 't1', 3.2, 4.4, 340)) {
        e.state = 'aim'; e.stateT = 0.7;
        e.dashX = k.nx; e.dashY = k.ny;
        warnLine(e.x, e.y, Math.atan2(k.ny, k.nx), e.spd * 4 * 0.55, e.r * 2, '#ff3a3a', 0.7);
      }
      return { mx: k.nx, my: k.ny };
    },

    buggy(e, k) {
      // Sin mano (Bara Bara Hō en vuelo): se queda quieto hasta que vuelve.
      if (e.state === 'handless') {
        if (!e.ai.hand || e.ai.hand.life <= 0) { e.state = 'walk'; e.pose = false; }
        return STOP;
      }
      e.pose = false;
      if (ready(e, k, 't1', 2.0, 2.6, 380)) {
        const a0 = Math.atan2(k.dy, k.dx);
        e.atkAt = k.now;
        if (turn(e) % 3 === 0) {
          // Bara Bara Hō: la mano sale disparada y vuelve a él.
          e.state = 'handless'; e.pose = true;
          e.ai.hand = shot(e, a0, 300, e.dmg * 0.9, { vis: 'hand', r: 9, life: 2.4, back: 0.6, owner: e, keep: true });
          G.Audio.sfx('punch');
        } else {
          for (let i = 0; i < 5; i++) shot(e, a0 + (i - 2) * 0.22, 200, e.dmg * 0.6, { vis: 'knife' });
          G.Audio.sfx('slash');
        }
      }
      return { mx: k.nx * 0.8, my: k.ny * 0.8 };
    },

    kuro(e, k) {
      // Shakushi: se esfuma; mientras no se le ve, caen cortes en línea alrededor de ti.
      if (e.state === 'vanish') {
        if ((e.stateT -= k.dt) <= 0) { e.state = 'hidden'; e.hidden = true; e.stateT = 2.0; e.ai.cut = 0; }
        return STOP;
      }
      if (e.state === 'hidden') {
        e.stateT -= k.dt; e.ai.cut -= k.dt;
        if (e.ai.cut <= 0 && e.stateT > 0.4) {
          e.ai.cut = 0.3;
          const cx = k.pl.x + G.U.rand(-50, 50), cy = k.pl.y + G.U.rand(-40, 40), a = Math.random() * Math.PI, len = 200;
          const x0 = cx - Math.cos(a) * len / 2, y0 = cy - Math.sin(a) * len / 2;
          warnLine(x0, y0, a, len, 14, '#ff3a3a', 0.45, () => {
            const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
            G.FX.beam(x0, y0 + G.LIFT, x1, y1 + G.LIFT, 4, '#e8e8f8', 0.15);
            G.Audio.sfx('slash');
            if (!k.pl.dead && G.segDist(k.pl.x, k.pl.y, x0, y0, x1, y1) < 8 + k.pl.r) k.pl.hurt(e.dmg * 0.7, G.Game.now);
          });
        }
        if (e.stateT <= 0) {
          const p = besidePlayer(k.pl, 150);
          if (p) [e.x, e.y] = p;
          e.hidden = false; e.state = 'walk';
          G.FX.puff(e.x, e.y, '#2a2a3a', 5);
        }
        return STOP;
      }
      if (ready(e, k, 't1', 4.5, 5.5, 380)) {
        e.state = 'vanish'; e.stateT = 0.35; e.atkAt = k.now;
        G.FX.puff(e.x, e.y, '#2a2a3a', 5);
      }
      return { mx: k.nx, my: k.ny };
    },

    krieg(e, k) {
      // Daisensō: la lanza estalla en cono delante de él.
      if (e.state === 'aim') {
        e.pose = true;
        if ((e.stateT -= k.dt) <= 0) {
          e.state = 'walk'; e.pose = false; e.atkAt = k.now;
          const a = e.ai.aim;
          G.FX.slash(e.x, e.y, a, 1.1, 175, '#ffb040', 0.3, 'slash3');
          for (let i = 0; i < 6; i++) {
            const r = G.U.rand(60, 170), b = a + G.U.rand(-0.5, 0.5);
            G.FX.burst(e.x + Math.cos(b) * r, e.y + Math.sin(b) * r, '#ffb040', 6, 140);
          }
          G.Audio.sfx('boom'); G.Camera.kick(0.3);
          if (k.d < 175 + k.pl.r && angDiff(Math.atan2(k.dy, k.dx), a) < 0.55) k.pl.hurt(e.dmg * 1.4, k.now);
        }
        return STOP;
      }
      if (ready(e, k, 't1', 3.0, 3.8, 400)) {
        e.atkAt = k.now;
        if (turn(e) % 2) {
          // MH5: tres bombas que dejan una nube de gas.
          for (let i = 0; i < 3; i++) {
            const zx = k.pl.x + (i ? G.U.rand(-90, 90) : 0), zy = k.pl.y + (i ? G.U.rand(-70, 70) : 0);
            warn(zx, zy, 40, '#9ad04a', 1.1, () => {
              G.FX.burst(zx, zy, '#9ad04a', 12, 140);
              zone(zx, zy, 40, '#7aa040', 3.5, hurtZone(k.pl, e.dmg * 0.35, m => {
                if (Math.random() < 0.15) G.FX.puff(m.x + G.U.rand(-30, 30), m.y + G.U.rand(-20, 20), '#9ad04a', 1);
              }));
            });
          }
          G.Audio.sfx('boom');
        } else {
          e.state = 'aim'; e.stateT = 0.9;
          e.ai.aim = Math.atan2(k.dy, k.dx);
          for (let i = -2; i <= 2; i++) warnLine(e.x, e.y, e.ai.aim + i * 0.25, 175, 10, '#ff8a2a', 0.9);
        }
      }
      return { mx: k.nx * 0.6, my: k.ny * 0.6 };
    },

    arlong(e, k) {
      // Bajo tierra: sólo se ve la aleta, que te persigue; luego emerge bajo tus pies.
      if (e.state === 'swim') {
        e.stateT -= k.dt;
        if (Math.random() < 0.4) G.FX.puff(e.x, e.y, '#a08050', 1);
        if (e.stateT <= 0 || k.d < 20) {
          e.state = 'rise'; e.stateT = 0.5;
          warn(e.x, e.y, 60, '#5a9ad8', 0.5, () => {
            e.hidden = false; e.fin = false; e.state = 'walk'; e.atkAt = G.Game.now;
            G.FX.ring(e.x, e.y, 10, 70, '#9ac0e0', 0.35, 5);
            G.FX.burst(e.x, e.y, '#a08050', 18, 200);
            G.Audio.sfx('boom'); G.Camera.kick(0.3);
            if (near(k.pl, e.x, e.y, 60)) k.pl.hurt(e.dmg * 1.3, G.Game.now);
          });
        }
        return { mx: k.nx, my: k.ny, spd: 1.7 };
      }
      if (e.state === 'rise') return STOP;
      // Dientes: caen alrededor de ti y se quedan clavados un rato.
      if (ready(e, k, 't2', 3.5, 4.5, 360)) {
        e.atkAt = k.now;
        for (let i = 0; i < 5; i++) {
          const tx = k.pl.x + G.U.rand(-110, 110), ty = k.pl.y + G.U.rand(-80, 80);
          if (!onLand(tx, ty)) continue;
          warn(tx, ty, 10, '#ffffff', 0.6, () => {
            let used = false;
            zone(tx, ty, 9, '#f4f1ea', 7, m => {
              if (!used && near(k.pl, m.x, m.y, m.r)) { used = true; m.life = 0; k.pl.hurt(e.dmg * 0.45, G.Game.now); }
            }, 'tooth');
          });
        }
        G.Audio.sfx('shoot');
      }
      if (ready(e, k, 't1', 5.5, 6.5, 450)) {
        e.state = 'swim'; e.stateT = 2.2; e.hidden = true; e.fin = true;
        G.FX.burst(e.x, e.y, '#a08050', 14, 160);
      }
      return { mx: k.nx, my: k.ny };
    },

    // ---------------- Alabasta ----------------

    mr3(e, k) {
      // Charco de cera bajo tus pies: frena.
      if (ready(e, k, 't2', 3.0, 3.6, 420)) {
        zone(k.pl.x, k.pl.y, 36, '#f4f1ea', 5, m => { if (near(k.pl, m.x, m.y, m.r)) k.pl.slowT = 0.2; });
      }
      // Candle Lock: jaula de pilares de cera con una sola salida; dentro, la cera cae.
      if (ready(e, k, 't1', 6.5, 7.5, 420)) {
        e.atkAt = k.now;
        const cx = k.pl.x, cy = k.pl.y, n = 14, R = 100, gap = Math.floor(Math.random() * n);
        for (let i = 0; i < n; i++) {
          if (i === gap || i === (gap + 1) % n) continue;
          const a = i / n * 6.283, px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R * 0.8;
          warn(px, py, 12, '#e8e0c0', 0.8, () => {
            zone(px, py, 12, '#f4f1ea', 4.5, hurtZone(k.pl, e.dmg * 0.4), 'pillar');
          });
        }
        warn(cx, cy, 70, '#e8e0c0', 2.2, () => {
          G.FX.burst(cx, cy, '#f4f1ea', 20, 160);
          zone(cx, cy, 70, '#f4f1ea', 2.5, hurtZone(k.pl, e.dmg * 0.5, m => { if (near(k.pl, m.x, m.y, m.r)) k.pl.slowT = 0.2; }));
        });
        G.HUD.banner('¡Candle Lock!', 'Busca la salida de la jaula', '#f4f1ea');
      }
      return { mx: k.nx * 0.8, my: k.ny * 0.8 };
    },

    wapol(e, k) {
      // Baku Baku: aspira (te arrastra hacia él) y muerde.
      if (e.state === 'inhale') {
        e.pose = true;
        e.stateT -= k.dt;
        if (k.d < 340 && !k.pl.dead) {
          const px = k.pl.x - k.nx * 85 * k.dt, py = k.pl.y - k.ny * 85 * k.dt;
          if (G.World.waterAt(px, py) !== 2) { k.pl.x = px; k.pl.y = py; }
          if (Math.random() < 0.6) G.FX.burst(k.pl.x + G.U.rand(-20, 20), k.pl.y + G.U.rand(-20, 20), '#d8e8f0', 1, 60);
        }
        if (e.stateT <= 0) {
          e.state = 'walk'; e.pose = false; e.atkAt = k.now;
          G.FX.slash(e.x, e.y, Math.atan2(k.dy, k.dx), 2.4, e.r + 30, '#ffffff', 0.25, 'slash3');
          G.Audio.sfx('punch');
          if (k.d < e.r + k.pl.r + 30) k.pl.hurt(e.dmg * 1.8, k.now);
        }
        return STOP;
      }
      // Salto: sube, cae donde estabas y aplasta.
      if (e.state === 'air') {
        e.stateT -= k.dt;
        const t = 1 - e.stateT / 0.9;
        e.x = G.U.lerp(e.ai.fx, e.ai.tx, t); e.y = G.U.lerp(e.ai.fy, e.ai.ty, t);
        e.z = Math.sin(t * Math.PI) * 120;
        if (e.stateT <= 0) { e.z = 0; e.hidden = false; e.state = 'walk'; }
        return STOP;
      }
      if (ready(e, k, 't1', 4.5, 5.5, 380)) {
        if (turn(e) % 2) {
          e.state = 'inhale'; e.stateT = 1.8;
          G.HUD.banner('¡Baku Baku!', 'Aléjate o te come', '#d8e8f0');
        } else {
          e.state = 'air'; e.stateT = 0.9; e.hidden = true;
          e.ai.fx = e.x; e.ai.fy = e.y; e.ai.tx = k.pl.x; e.ai.ty = k.pl.y;
          warn(k.pl.x, k.pl.y, 64, '#ff3a3a', 0.9, () => {
            G.FX.ring(e.ai.tx, e.ai.ty, 10, 80, '#ffffff', 0.35, 6);
            G.FX.burst(e.ai.tx, e.ai.ty, '#d8c8b0', 16, 180);
            G.Audio.sfx('boom'); G.Camera.kick(0.5);
            if (near(k.pl, e.ai.tx, e.ai.ty, 64)) k.pl.hurt(e.dmg * 1.4, G.Game.now);
          });
        }
      }
      return { mx: k.nx, my: k.ny };
    },

    crocodile(e, k) {
      if (ready(e, k, 't1', 3.6, 4.4, 420)) {
        e.atkAt = k.now;
        if (turn(e) % 3) {
          // Desert Spada: tres grietas de arena que avanzan hacia ti.
          const a0 = Math.atan2(k.dy, k.dx);
          for (let l = -1; l <= 1; l++) {
            const a = a0 + l * 0.35;
            for (let i = 1; i <= 9; i++) {
              const x = e.x + Math.cos(a) * i * 34, y = e.y + Math.sin(a) * i * 34;
              warn(x, y, 18, '#b05a20', 0.35 + i * 0.07, () => {
                G.FX.burst(x, y, '#e0c070', 6, 140);
                if (near(k.pl, x, y, 18)) k.pl.hurt(e.dmg * 0.8, G.Game.now);
              });
            }
          }
          G.Audio.sfx('slash');
        } else if ((e.ai.storms = (e.ai.storms || []).filter(m => m.life > 0)).length < 2) {
          // Sables: un tornado de arena que te sigue.
          e.ai.storms.push(zone(e.x + k.nx * 60, e.y + k.ny * 60, 34, '#7a4a20', 6, hurtZone(k.pl, e.dmg * 0.5, (m, dt) => {
            const [nx, ny] = G.U.norm(k.pl.x - m.x, k.pl.y - m.y);
            m.x += nx * 58 * dt; m.y += ny * 58 * dt;
            if (Math.random() < 0.5) G.FX.puff(m.x + G.U.rand(-20, 20), m.y - G.U.rand(0, 50), Math.random() < 0.5 ? '#8a5a2a' : '#f0d898', 1);
          }), 'tornado'));
          G.HUD.banner('¡Sables!', '', '#e0c070');
        }
      }
      return { mx: k.nx * 0.8, my: k.ny * 0.8 };
    },

    // ---------------- Del cielo a Thriller Bark ----------------

    enel(e, k) {
      // Sango: una cadena de rayos que cae donde estás.
      if (e.state === 'sango') {
        e.pose = true;
        e.stateT -= k.dt;
        if (e.stateT <= 0) {
          e.stateT = 0.32;
          const x = k.pl.x, y = k.pl.y;
          warn(x, y, 26, '#ffe14d', 0.55, () => {
            G.FX.bolt(x, y - 260, x, y, '#ffe14d', 0.2);
            G.FX.ring(x, y, 6, 34, '#ffe14d', 0.25, 3);
            G.Audio.sfx('thunder');
            if (near(k.pl, x, y, 26)) k.pl.hurt(e.dmg * 0.7, G.Game.now);
          });
          if (--e.ai.left <= 0) { e.state = 'walk'; e.pose = false; }
        }
        return STOP;
      }
      if (ready(e, k, 't1', 3.4, 4.2, 440)) {
        e.atkAt = k.now;
        if (turn(e) % 3 === 0) {
          // Raigo: una zona enorme; hay que salir antes de que caiga.
          const x = k.pl.x, y = k.pl.y, R = 150;
          warn(x, y, R, '#ffe14d', 2.8, () => {
            for (let i = 0; i < 8; i++) {
              const a = Math.random() * 6.283, r = Math.random() * R;
              G.FX.bolt(x + Math.cos(a) * r, y - 300, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, '#ffe14d', 0.3);
            }
            G.FX.ring(x, y, 20, R, '#ffffff', 0.4, 8);
            G.Audio.sfx('thunder'); G.Camera.kick(0.6);
            if (near(k.pl, x, y, R)) k.pl.hurt(e.dmg * 2, G.Game.now);
          });
          G.HUD.banner('¡Raigo!', 'Sal de la nube', '#ffe14d');
        } else {
          e.state = 'sango'; e.stateT = 0; e.ai.left = 6;
        }
      }
      return { mx: k.nx, my: k.ny };
    },

    lucci(e, k) {
      // Tekkai: se endurece y no le hace nada.
      if (e.state === 'tekkai') {
        e.pose = true;
        if ((e.stateT -= k.dt) <= 0) { e.state = 'walk'; e.immune = false; e.pose = false; }
        return STOP;
      }
      // Rokuogan: carga y estalla a su alrededor.
      if (e.state === 'rokuogan') {
        e.pose = true;
        if ((e.stateT -= k.dt) <= 0) {
          e.state = 'walk'; e.pose = false;
          G.FX.ring(e.x, e.y, 10, 130, '#ffffff', 0.35, 8);
          G.FX.burst(e.x, e.y, '#c8e0ff', 20, 220);
          G.Audio.sfx('boom'); G.Camera.kick(0.6);
          if (near(k.pl, e.x, e.y, 120)) k.pl.hurt(e.dmg * 1.8, k.now);
        }
        return STOP;
      }
      if (ready(e, k, 't2', 9, 11, 600)) {
        e.state = 'tekkai'; e.stateT = 2; e.immune = true;
        G.FX.text(e.x, e.y - 60, '¡Tekkai!', '#c8d0e0', true);
        return STOP;
      }
      if (ready(e, k, 't1', 2.6, 3.2, 420)) {
        e.atkAt = k.now;
        if (k.d < 150) {
          e.state = 'rokuogan'; e.stateT = 1.0;
          warn(e.x, e.y, 120, '#c8e0ff', 1.0);
        } else {
          // Rankyaku: tres ondas cortantes.
          const a0 = Math.atan2(k.dy, k.dx);
          for (let i = -1; i <= 1; i++) shot(e, a0 + i * 0.3, 210, e.dmg * 0.8, { vis: 'crescent', r: 16, color: '#c8e0ff' });
          G.Audio.sfx('slash');
        }
      }
      return { mx: k.nx, my: k.ny };
    },

    moria(e, k) {
      if (ready(e, k, 't1', 3.2, 3.8, 440)) {
        e.atkAt = k.now;
        if (turn(e) % 3 === 0 && (e.ai.zombies || []).filter(z => !z.dead).length < 6) {
          // Levanta zombis del suelo.
          const base = G.Enemies.LIST.find(d => d.id === 'marine');
          const zdef = Object.assign({}, base, { name: 'Zombi', hp: 70, spd: 46, dmg: 10, xp: 6 });
          e.ai.zombies = (e.ai.zombies || []).filter(z => !z.dead);
          for (let i = 0; i < 4; i++) {
            const p = besidePlayer(k.pl, G.U.rand(110, 170));
            if (!p) continue;
            G.FX.burst(p[0], p[1], '#5e5070', 12, 120);
            e.ai.zombies.push(G.EnemyMgr.add(new G.Enemy(zdef, { x: p[0], y: p[1], dmgK: 1 + G.Game.time / 300 })));
          }
          G.HUD.banner('¡Zombis!', '', '#9a8ad0');
        } else {
          // Brick Bat: murciélagos de sombra que te persiguen.
          for (let i = 0; i < 8; i++) {
            const a = i / 8 * 6.283;
            shot(e, a, 110, e.dmg * 0.4, { vis: 'bat', r: 6, life: 4.5, homing: 1.6, color: '#3a3046' });
          }
          G.Audio.sfx('shoot');
        }
      }
      return { mx: k.nx * 0.6, my: k.ny * 0.6 };
    },

    imu(e, k) {
      // Látigo negro que da una vuelta entera a su alrededor.
      if (e.state === 'sweep') {
        e.pose = true;
        e.stateT -= k.dt;
        if (e.stateT < 2.6) {
          const a = e.ai.a0 + (1 - e.stateT / 2.6) * 6.283, L = 240;
          const x1 = e.x + Math.cos(a) * L, y1 = e.y + Math.sin(a) * L * 0.8;
          G.FX.beam(e.x, e.y - 10, x1, y1 - 10, 6, '#2a1a3a', 0.06);
          if (!k.pl.dead && G.segDist(k.pl.x, k.pl.y, e.x, e.y, x1, y1) < 8 + k.pl.r) k.pl.hurt(e.dmg, k.now);
        }
        if (e.stateT <= 0) { e.state = 'walk'; e.pose = false; }
        return STOP;
      }
      if (ready(e, k, 't1', 4.0, 4.8, 420)) {
        e.atkAt = k.now;
        if (turn(e) % 2) {
          e.state = 'sweep'; e.stateT = 3.3; e.ai.a0 = Math.atan2(k.dy, k.dx) + Math.PI / 2;
          warnLine(e.x, e.y, e.ai.a0, 240, 12, '#9a3aff', 0.7);
          warn(e.x, e.y, 240, '#4a2a6a', 0.7);
        } else {
          // Dos anillos de espinas, cada uno con un hueco por donde pasar.
          for (let w = 0; w < 2; w++) {
            const n = 28, gap = Math.floor(Math.random() * n);
            for (let i = 0; i < n; i++) {
              if (Math.abs(i - gap) <= 1 || Math.abs(i - gap) >= n - 1) continue;
              const a = i / n * 6.283;
              shot(e, a, 120, e.dmg * 0.6, { color: '#9a3aff', r: 5, life: 4, delay: w * 0.9 });
            }
          }
          G.Audio.sfx('slash');
        }
      }
      return { mx: k.nx * 0.7, my: k.ny * 0.7 };
    }
  };

  /** Mueve al jefe con su IA. null si ese jefe no tiene (usa el comportamiento genérico). */
  function update(e, k) {
    const f = AI[e.def.id];
    if (!f) return null;
    if (!e.ai) { e.ai = {}; e.t2 = G.U.rand(1.5, 3); }
    return f(e, k);
  }

  return { AI, update };
})();
