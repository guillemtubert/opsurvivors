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
 *   smoker     (huida) White Blow: brazo de humo que te arrastra · nubes de humo que tapan la vista ·
 *              al rato, un vendaval de Dragon te empuja hacia el barco
 *   mr9        bates que rebotan en la costa y en los árboles
 *   wednesday  cuchillas que giran a su alrededor y a veces se abren
 *   mr5        mocos-bomba que estallan donde caen
 *   valentine  sube, su sombra te persigue y cae encima con 10.000 kg
 *   bellamy    rebota como una bola de pinball por la isla · muelles en el suelo que te lanzan
 *   foxy       rayo Noro Noro que te deja parado · espejo que te devuelve tus disparos
 *   franky     Coup de Vent: cañón de aire que te manda lejos · ráfaga de ametralladora que te sigue
 *   garp       (huida) lanza balas de cañón a mano, que caen y ruedan · un meteoro enorme de vez en cuando
 *   perona     fantasmas negativos (te dejan sin ataques) · fantasmas que estallan
 *   oars       gigante: pisotón con onda que se expande · barrido con el brazo
 *   kizaru     (huida) Yasakani no Magatama: lluvia de luz alrededor · patada a la velocidad de la luz delante de ti
 *   hancock    Mero Mero Mellow: si vas hacia ella cuando dispara, te petrifica · Pistol Kiss
 *   magellan   (huida) deja un rastro de veneno · hidras que avanzan en zigzag
 *   akainu     (huida) puños de magma que caen y dejan charcos que crecen · Dai Funka en línea ·
 *              los terremotos de Barbablanca te ayudan
 *   rayleigh   cortes en cuadrícula por toda la zona · Haki del Rey (aturde si estás cerca)
 *   px1        Ursus Shock: burbuja de aire que flota y estalla · Pad Hō: zarpazos de aire
 *   hody       muros de agua que cruzan la isla (con un hueco) · esteroides: más rápido a media vida
 *   caesar     Shinokuni: limo que se divide al golpearlo · Gastanet: suelta nubes de gas y luego las enciende todas
 *   doflamingo Birdcage: la jaula de hilos encoge alrededor · Parasite: hilos que te invierten los controles
 *   jack       barrido con la trompa a su alrededor · a media vida se convierte en mamut (más grande, te arrolla)
 *   katakuri   Haki de observación: lanzas de mochi y un puño gigante apuntados a donde VAS a estar
 *   bigmom     (huida) Soul Pocus: te roba la vida si estás cerca · ataques de hambre (mucho más rápida) ·
 *              Prometheus: bola de fuego que se parte en cuatro al caer
 *   queen      Plague Rounds: dardos que contagian (veneno) · dos láseres que se cruzan en ti
 *   king       sube y cae en picado en línea, dejando fuego · alas de fuego: anillo que se expande
 *   kaido      humano: kanabō con tres ondas de choque · a media vida, dragón: Bolo Breath que te sigue
 *              y anillos de bolas de fuego que se cierran sobre ti
 *   saturn     mirada: si te mueves mientras le brillan los ojos, te paraliza · pentagrama de patas de araña
 *   loki       Ragnir: clava el martillo y un rayo une el martillo con él · rugido de gigante que te aparta
 *   sommers    enredaderas de espinas que crecen hacia ti y se quedan
 *   killingham burbujas de sueño (te duermen) · su montura carga en zigzag
 *   gunko      flechas que caen donde estuviste hace un momento (tu rastro)
 *   shamrock   tres cabezas de perro que muerden por turnos · corte en X enorme sobre ti
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

    smoker(e, k) {
      e.ai.t = (e.ai.t || 0) + k.dt;
      // Vendaval de Dragon (una vez): te empuja hacia el barco y lo aparta a él.
      if (!e.ai.gust && e.ai.t > 45) {
        e.ai.gust = true;
        const d = G.Island.pois().dock, [gx, gy] = G.U.norm(d.endX - k.pl.x, d.endY - k.pl.y);
        k.pl.push(gx * 320, gy * 320, 1.2);
        e.kx -= k.nx * 900; e.ky -= k.ny * 900;
        e.state = 'blown'; e.stateT = 2.5;
        G.HUD.banner('¡Un vendaval!', 'Dragon te ayuda a escapar', '#9ad0ff');
        for (let i = 0; i < 20; i++) G.FX.puff(k.pl.x + G.U.rand(-120, 120), k.pl.y + G.U.rand(-90, 90), '#e8f4ff', 1);
      }
      if (e.state === 'blown') { if ((e.stateT -= k.dt) <= 0) e.state = 'walk'; return STOP; }
      // White Blow: aviso en línea y el brazo de humo te arrastra hacia él.
      if (e.state === 'aim') {
        e.pose = true;
        if ((e.stateT -= k.dt) <= 0) {
          e.state = 'walk'; e.pose = false; e.atkAt = k.now;
          const a = e.ai.aim, x1 = e.x + Math.cos(a) * 300, y1 = e.y + Math.sin(a) * 300;
          G.FX.beam(e.x, e.y - 10, x1, y1 - 10, 14, '#d8dce4', 0.3);
          if (!k.pl.dead && G.segDist(k.pl.x, k.pl.y, e.x, e.y, x1, y1) < 14 + k.pl.r) {
            k.pl.hurt(e.dmg * 0.6, k.now);
            k.pl.push(-Math.cos(a) * 300, -Math.sin(a) * 300, 0.35);
          }
        }
        return STOP;
      }
      e.pose = false;
      if (ready(e, k, 't1', 3.5, 4.5, 320)) {
        e.state = 'aim'; e.stateT = 0.6; e.ai.aim = Math.atan2(k.dy, k.dx);
        warnLine(e.x, e.y, e.ai.aim, 300, 22, '#b8bec8', 0.6);
      }
      // Nubes de humo: no hacen daño, pero no dejan ver.
      if (ready(e, k, 't2', 7, 9, 500)) {
        for (let i = 0; i < 3; i++) zone(k.pl.x + G.U.rand(-90, 90), k.pl.y + G.U.rand(-70, 70), 60, '#d8dce4', 6, () => {}, 'smoke');
      }
      return { mx: k.nx, my: k.ny };
    },

    // ---------------- Alabasta ----------------

    mr9(e, k) {
      // Nine Bats: dos bates que rebotan en la costa y en los árboles.
      if (ready(e, k, 't1', 2.4, 3.0, 420)) {
        e.atkAt = k.now;
        const a0 = Math.atan2(k.dy, k.dx);
        for (const da of [-0.25, 0.25]) shot(e, a0 + da, 230, e.dmg * 0.6, { vis: 'club', r: 7, life: 3.5, bounce: 3 });
        G.Audio.sfx('slash');
      }
      return { mx: k.nx * 0.9, my: k.ny * 0.9 };
    },

    wednesday(e, k) {
      // Peacock Slashers: dos cuchillas que giran a su alrededor; cada poco se abren.
      if (!e.ai.blades) {
        e.ai.blades = [0, Math.PI].map(a => shot(e, 0, 0, e.dmg * 0.6, { vis: 'knife', r: 8, keep: true, orbit: { owner: e, r: 44, w: 3.2, a } }));
      }
      if (ready(e, k, 't1', 4.5, 5.5, 400)) { e.ai.open = 1.6; e.atkAt = k.now; G.Audio.sfx('slash'); }
      if (e.ai.open > 0) e.ai.open -= k.dt;
      const r = e.ai.open > 0 ? 44 + Math.sin(Math.min(1, e.ai.open / 1.6) * Math.PI) * 60 : 44;
      for (const b of e.ai.blades) { b.orbit.r = r; b.orbit.w = e.ai.open > 0 ? 5 : 3.2; }
      return { mx: k.nx, my: k.ny };
    },

    mr5(e, k) {
      // Nose Fancy Cannon: mocos-bomba que caen donde estabas y estallan (tres de una vez, a veces).
      if (ready(e, k, 't1', 2.2, 2.8, 420)) {
        e.atkAt = k.now;
        const a0 = Math.atan2(k.dy, k.dx), n = turn(e) % 3 ? 1 : 3;
        for (let i = 0; i < n; i++) {
          const a = a0 + (i - (n - 1) / 2) * 0.35, sp = 200;
          shot(e, a, sp, e.dmg * 0.4, {
            r: 6, color: '#9ad04a', life: Math.min(1.6, k.d / sp),
            land: (x, y) => warn(x, y, 42, '#ff8a2a', 0.5, () => {
              G.FX.ring(x, y, 6, 50, '#ffb040', 0.3, 5); G.FX.burst(x, y, '#ff8a2a', 12, 160);
              G.Audio.sfx('boom');
              if (near(k.pl, x, y, 42)) k.pl.hurt(e.dmg, G.Game.now);
            })
          });
        }
        G.Audio.sfx('shoot');
      }
      return { mx: k.nx * 0.8, my: k.ny * 0.8 };
    },

    valentine(e, k) {
      // Kilo Kilo: sube con el paraguas, su sombra te persigue y cae con 10.000 kg.
      if (e.state === 'up') {
        e.stateT -= k.dt;
        e.z = Math.min(220, (e.z || 0) + 420 * k.dt);
        const m = e.ai.shadow;
        if (e.stateT > 0.5) { m.x = G.U.lerp(m.x, k.pl.x, Math.min(1, 3 * k.dt)); m.y = G.U.lerp(m.y, k.pl.y, Math.min(1, 3 * k.dt)); }
        if (e.stateT <= 0) {
          e.x = m.x; e.y = m.y; e.z = 0; e.hidden = false; e.state = 'walk'; e.atkAt = k.now;
          G.FX.ring(m.x, m.y, 10, 60, '#ffe14d', 0.35, 6); G.FX.burst(m.x, m.y, '#d8c8b0', 14, 160);
          G.Audio.sfx('boom'); G.Camera.kick(0.4);
          if (near(k.pl, m.x, m.y, 50)) k.pl.hurt(e.dmg * 1.5, k.now);
        }
        return STOP;
      }
      if (ready(e, k, 't1', 4.0, 5.0, 420)) {
        e.state = 'up'; e.stateT = 2.4; e.hidden = true;
        e.ai.shadow = G.FX.mark(k.pl.x, k.pl.y, 50, '#ff3a3a', 2.4);
      }
      return { mx: k.nx, my: k.ny };
    },

    // ---------------- Islas del Cielo, Water 7 y Thriller Bark ----------------

    bellamy(e, k) {
      // Spring Hopper: rebota como una bola de pinball (en la costa y en árboles y rocas).
      if (e.state === 'aim') {
        e.pose = true;
        if ((e.stateT -= k.dt) <= 0) { e.state = 'pinball'; e.stateT = 1.8; }
        return STOP;
      }
      if (e.state === 'pinball') {
        e.pose = true;
        const sp = e.spd * 4.5, nx = e.x + e.ai.vx * sp * k.dt, ny = e.y + e.ai.vy * sp * k.dt;
        const blocked = (x, y) => G.World.waterAt(x, y) === 2 || !G.World.isFree(x, y, 10);
        if (blocked(nx, ny)) {
          if (blocked(nx, e.y)) e.ai.vx = -e.ai.vx;
          if (blocked(e.x, ny)) e.ai.vy = -e.ai.vy;
          G.FX.burst(e.x, e.y, '#c8c8d8', 6, 120); G.Audio.sfx('punch');
        }
        if (Math.random() < 0.4) G.FX.puff(e.x, e.y, '#c9b28a', 1);
        if ((e.stateT -= k.dt) <= 0) { e.state = 'walk'; e.pose = false; }
        return { mx: e.ai.vx, my: e.ai.vy, spd: 4.5 };
      }
      e.pose = false;
      if (ready(e, k, 't1', 4.0, 5.0, 380)) {
        e.state = 'aim'; e.stateT = 0.5;
        const a = Math.atan2(k.dy, k.dx) + G.U.rand(-0.3, 0.3);
        e.ai.vx = Math.cos(a); e.ai.vy = Math.sin(a);
        warnLine(e.x, e.y, a, 200, e.r * 2, '#ff3a3a', 0.5);
      }
      // Muelles en el suelo: si pisas uno, te lanza lejos.
      if (ready(e, k, 't2', 5.5, 6.5, 500)) {
        for (let i = 0; i < 4; i++) {
          const p = besidePlayer(k.pl, G.U.rand(50, 110));
          if (!p) continue;
          let used = false;
          zone(p[0], p[1], 12, '#c8c8d8', 9, m => {
            if (used || !near(k.pl, m.x, m.y, m.r)) return;
            used = true; m.life = 0;
            const [ux, uy] = G.U.norm(k.pl.x - m.x || 1, k.pl.y - m.y);
            k.pl.hurt(e.dmg * 0.4, G.Game.now); k.pl.push(ux * 380, uy * 380, 0.45);
            G.FX.burst(m.x, m.y, '#e8e8f0', 8, 140); G.Audio.sfx('punch');
          }, 'spring');
        }
      }
      return { mx: k.nx, my: k.ny };
    },

    foxy(e, k) {
      // Espejo Noro Noro: mientras lo sostiene, tus disparos vuelven hacia ti.
      if (e.state === 'mirror') {
        e.pose = true; e.reflect = true;
        if ((e.stateT -= k.dt) <= 0) { e.state = 'walk'; e.reflect = false; e.pose = false; }
        return STOP;
      }
      // Rayo Noro Noro: si te da, te quedas casi parado.
      if (e.state === 'aim') {
        e.pose = true;
        if ((e.stateT -= k.dt) <= 0) {
          e.state = 'walk'; e.pose = false; e.atkAt = k.now;
          const a = e.ai.aim, x1 = e.x + Math.cos(a) * 340, y1 = e.y + Math.sin(a) * 340;
          G.FX.beam(e.x, e.y - 10, x1, y1 - 10, 12, '#ff9ec4', 0.35);
          if (!k.pl.dead && G.segDist(k.pl.x, k.pl.y, e.x, e.y, x1, y1) < 16 + k.pl.r) {
            k.pl.hurt(e.dmg * 0.4, k.now); k.pl.affect('stun', 2.2);
          }
        }
        return STOP;
      }
      if (ready(e, k, 't1', 3.2, 4.0, 380)) {
        e.state = 'aim'; e.stateT = 0.7; e.ai.aim = Math.atan2(k.dy, k.dx);
        warnLine(e.x, e.y, e.ai.aim, 340, 32, '#ff9ec4', 0.7);
      }
      if (ready(e, k, 't2', 7, 9, 500)) {
        e.state = 'mirror'; e.stateT = 2.2;
        G.FX.text(e.x, e.y - 60, '¡Espejo Noro Noro!', '#ff9ec4', true);
      }
      return { mx: k.nx * 0.8, my: k.ny * 0.8 };
    },

    franky(e, k) {
      // Coup de Vent: carga y suelta un cañonazo de aire que te manda lejos.
      if (e.state === 'aim') {
        e.pose = true;
        if ((e.stateT -= k.dt) <= 0) {
          e.state = 'walk'; e.pose = false; e.atkAt = k.now;
          const a = e.ai.aim, x1 = e.x + Math.cos(a) * 320, y1 = e.y + Math.sin(a) * 320;
          G.FX.beam(e.x, e.y - 12, x1, y1 - 12, 40, '#e8f4ff', 0.3);
          G.Audio.sfx('boom'); G.Camera.kick(0.3);
          if (!k.pl.dead && G.segDist(k.pl.x, k.pl.y, e.x, e.y, x1, y1) < 34 + k.pl.r) {
            k.pl.hurt(e.dmg, k.now); k.pl.push(Math.cos(a) * 520, Math.sin(a) * 520, 0.45);
          }
        }
        return STOP;
      }
      // Weapons Left: ráfaga de ametralladora que gira hacia ti poco a poco.
      if (e.state === 'gun') {
        e.pose = true;
        const want = Math.atan2(k.dy, k.dx);
        e.ai.gunA += Math.max(-1.3 * k.dt, Math.min(1.3 * k.dt, Math.atan2(Math.sin(want - e.ai.gunA), Math.cos(want - e.ai.gunA))));
        if ((e.ai.fire -= k.dt) <= 0) {
          e.ai.fire = 0.08;
          shot(e, e.ai.gunA + G.U.rand(-0.05, 0.05), 300, e.dmg * 0.18, { r: 4, color: '#ffe14d', life: 1.6 });
          if (Math.random() < 0.3) G.Audio.sfx('shoot');
        }
        if ((e.stateT -= k.dt) <= 0) { e.state = 'walk'; e.pose = false; }
        return STOP;
      }
      if (ready(e, k, 't1', 3.6, 4.4, 380)) {
        e.atkAt = k.now;
        if (turn(e) % 2) {
          e.state = 'aim'; e.stateT = 1.0; e.ai.aim = Math.atan2(k.dy, k.dx);
          warnLine(e.x, e.y, e.ai.aim, 320, 70, '#9ad0ff', 1.0);
        } else {
          e.state = 'gun'; e.stateT = 1.8; e.ai.fire = 0.3;
          e.ai.gunA = Math.atan2(k.dy, k.dx) + (Math.random() < 0.5 ? -0.9 : 0.9);
        }
      }
      return { mx: k.nx, my: k.ny };
    },

    garp(e, k) {
      // Balas de cañón lanzadas a mano: caen donde estabas y luego ruedan.
      if (ready(e, k, 't1', 1.3, 1.7, 600)) {
        e.atkAt = k.now;
        const big = turn(e) % 6 === 0;
        const n = big ? 1 : 2;
        for (let i = 0; i < n; i++) {
          const tx = k.pl.x + (i ? G.U.rand(-80, 80) : G.U.rand(-20, 20)), ty = k.pl.y + (i ? G.U.rand(-60, 60) : G.U.rand(-15, 15));
          const R = big ? 46 : 18;
          warn(tx, ty, R, '#3a3a46', big ? 1.4 : 0.9, () => {
            G.FX.ring(tx, ty, 6, R * 1.6, '#c8b090', 0.3, 5); G.Audio.sfx('boom'); G.Camera.kick(big ? 0.5 : 0.15);
            if (near(k.pl, tx, ty, R)) k.pl.hurt(e.dmg * (big ? 1.5 : 0.7), G.Game.now);
            // Sigue rodando, alejándose de Garp.
            const [ux, uy] = G.U.norm(tx - e.x, ty - e.y);
            G.Projectiles.spawn({ foe: true, x: tx, y: ty, vx: ux * (big ? 90 : 150), vy: uy * (big ? 90 : 150),
              dmg: e.dmg * (big ? 1 : 0.5), r: R * 0.7, life: big ? 4 : 2.5, color: '#2a2a36', vis: 'ball', bounce: 2, keep: big });
          });
        }
        if (big) G.HUD.banner('¡Meteoro!', '', '#ff8a5a');
      }
      return { mx: k.nx, my: k.ny };
    },

    perona(e, k) {
      // Flota a distancia y suelta fantasmas.
      const keep = k.d < 180 ? -1 : k.d > 260 ? 1 : 0;
      if (ready(e, k, 't1', 3.0, 3.6, 480)) {
        e.atkAt = k.now;
        const boom = turn(e) % 3 === 0;
        for (let i = 0; i < (boom ? 3 : 4); i++) {
          const a = Math.atan2(k.dy, k.dx) + (i - 1.5) * 0.6;
          shot(e, a, boom ? 95 : 60, boom ? e.dmg * 0.6 : 0, boom
            ? { vis: 'ghost', ghost: 'boom', r: 9, life: 6, homing: 1.0,
                land: (x, y) => { G.FX.ring(x, y, 6, 46, '#ff9ec4', 0.3, 5); G.FX.burst(x, y, '#ff9ec4', 10, 140); G.Audio.sfx('boom');
                                  if (near(k.pl, x, y, 40)) k.pl.hurt(e.dmg * 0.6, G.Game.now); } }
            : { vis: 'ghost', r: 10, life: 7, homing: 0.6, hit: pl => pl.affect('silence', 2.5) });
        }
        G.Audio.sfx('select');
      }
      return { mx: k.nx * keep, my: k.ny * keep };
    },

    oars(e, k) {
      // Pisotón: una onda que se expande; te da si la pilla al pasar.
      if (e.state === 'stomp') {
        e.pose = true;
        if ((e.stateT -= k.dt) <= 0) {
          e.state = 'walk'; e.pose = false; e.atkAt = k.now;
          const x = e.x, y = e.y, R0 = 20, R1 = 300, T = 1.3;
          G.FX.ring(x, y, R0, R1, '#d8c8b0', T, 8);
          G.Audio.sfx('boom'); G.Camera.kick(0.6);
          let hit = false;
          zone(x, y, R0, '#d8c8b0', T, m => {
            const R = R0 + (R1 - R0) * (1 - m.life / m.max);
            if (!hit && Math.abs(G.U.dist(k.pl.x, k.pl.y, x, y) - R * 0.85) < 16 + k.pl.r) { hit = true; k.pl.hurt(e.dmg, G.Game.now); }
          }, 'hidden');
        }
        return STOP;
      }
      // Barrido con el brazo: un cuarto de vuelta rápido delante de él.
      if (e.state === 'sweep') {
        e.pose = true;
        e.stateT -= k.dt;
        if (e.stateT < 0.45) {
          const a = e.ai.a0 + (1 - e.stateT / 0.45) * 1.8, L = 230;
          const x1 = e.x + Math.cos(a) * L, y1 = e.y + Math.sin(a) * L * 0.8;
          G.FX.beam(e.x, e.y - 30, x1, y1 - 10, 14, '#8a7a9a', 0.06);
          if (!k.pl.dead && G.segDist(k.pl.x, k.pl.y, e.x, e.y, x1, y1) < 14 + k.pl.r) k.pl.hurt(e.dmg * 1.2, k.now);
        }
        if (e.stateT <= 0) { e.state = 'walk'; e.pose = false; }
        return STOP;
      }
      if (ready(e, k, 't1', 3.4, 4.2, 420)) {
        if (k.d < 220 && turn(e) % 2) {
          e.state = 'sweep'; e.stateT = 1.25; e.ai.a0 = Math.atan2(k.dy, k.dx) - 0.9;
          warnLine(e.x, e.y, e.ai.a0, 230, 14, '#ff3a3a', 0.8);
          warnLine(e.x, e.y, e.ai.a0 + 1.8, 230, 14, '#ff3a3a', 0.8);
        } else {
          e.state = 'stomp'; e.stateT = 0.8;
          warn(e.x, e.y, 60, '#d8c8b0', 0.8);
        }
      }
      return { mx: k.nx, my: k.ny };
    },

    // ---------------- Guerra en la Cumbre e Isla Gyojin ----------------

    kizaru(e, k) {
      // Patada de luz: aparece delante de hacia donde vas y golpea.
      if (e.state === 'kick') {
        e.pose = true;
        if ((e.stateT -= k.dt) <= 0) {
          e.state = 'walk'; e.pose = false; e.atkAt = k.now;
          G.FX.ring(e.x, e.y, 6, 54, '#ffe14d', 0.25, 5); G.FX.burst(e.x, e.y, '#fff6b0', 12, 200); G.Audio.sfx('thunder');
          if (near(k.pl, e.x, e.y, 46)) k.pl.hurt(e.dmg, k.now);
        }
        return STOP;
      }
      if (ready(e, k, 't1', 3.2, 4.2, 500)) {
        const [mx, my] = (k.pl.mvx || k.pl.mvy) ? G.U.norm(k.pl.mvx, k.pl.mvy) : [-k.nx, -k.ny];
        const x = k.pl.x + mx * 90, y = k.pl.y + my * 90;
        if (onLand(x, y)) {
          G.FX.bolt(e.x, e.y - 20, x, y - 20, '#ffe14d', 0.15);
          e.x = x; e.y = y; e.state = 'kick'; e.stateT = 0.4;
          warn(x, y, 46, '#ffe14d', 0.4);
        }
      }
      // Yasakani no Magatama: muchos rayos de luz pequeños alrededor de ti.
      if (ready(e, k, 't2', 5, 6.5, 600)) {
        for (let i = 0; i < 14; i++) {
          const x = k.pl.x + G.U.rand(-110, 110), y = k.pl.y + G.U.rand(-85, 85);
          warn(x, y, 12, '#ffe14d', 0.4 + i * 0.06, () => {
            G.FX.bolt(x, y - 120, x, y, '#fff6b0', 0.1);
            if (near(k.pl, x, y, 12)) k.pl.hurt(e.dmg * 0.5, G.Game.now);
          });
        }
        G.Audio.sfx('thunder');
      }
      return { mx: k.nx, my: k.ny };
    },

    hancock(e, k) {
      // Mero Mero Mellow: corazón en abanico; si vas hacia ella, te quedas de piedra.
      if (e.state === 'aim') {
        e.pose = true;
        if ((e.stateT -= k.dt) <= 0) {
          e.state = 'walk'; e.pose = false; e.atkAt = k.now;
          const a = e.ai.aim;
          G.FX.slash(e.x, e.y, a, 1.2, 260, '#ff6bb0', 0.35, 'slash3');
          const toward = k.pl.mvx * -k.nx + k.pl.mvy * -k.ny > 0.3;     // se acerca a ella
          if (k.d < 260 + k.pl.r && angDiff(Math.atan2(k.dy, k.dx), a) < 0.6) {
            if (toward) { k.pl.affect('stone', 2.5); k.pl.hurt(e.dmg * 0.6, k.now); }
            else G.FX.text(k.pl.x, k.pl.y - 44, '¡A salvo!', '#ff9ec4');
          }
        }
        return STOP;
      }
      if (ready(e, k, 't1', 4.0, 5.0, 420)) {
        e.state = 'aim'; e.stateT = 0.9; e.ai.aim = Math.atan2(k.dy, k.dx);
        for (let i = -2; i <= 2; i++) warnLine(e.x, e.y, e.ai.aim + i * 0.28, 260, 8, '#ff6bb0', 0.9);
        G.HUD.banner('Mero Mero Mellow', 'No vayas hacia ella', '#ff6bb0');
      }
      // Pistol Kiss: corazones rápidos de uno en uno.
      if (ready(e, k, 't2', 1.6, 2.2, 420)) {
        shot(e, Math.atan2(k.dy, k.dx), 320, e.dmg * 0.5, { vis: 'heart', r: 7, color: '#ff6bb0' });
        G.Audio.sfx('shoot');
      }
      return { mx: k.nx * 0.7, my: k.ny * 0.7 };
    },

    magellan(e, k) {
      // Rastro de veneno por donde pasa.
      e.ai.trail = (e.ai.trail || 0) - k.dt;
      if (e.ai.trail <= 0) {
        e.ai.trail = 0.35;
        zone(e.x, e.y, 26, '#8a3ac0', 7, hurtZone(k.pl, e.dmg * 0.3));
      }
      // Hidras: tres serpientes de veneno que avanzan en zigzag.
      if (ready(e, k, 't1', 3.0, 3.8, 480)) {
        e.atkAt = k.now;
        const a0 = Math.atan2(k.dy, k.dx);
        for (let i = -1; i <= 1; i++) shot(e, a0 + i * 0.3, 150, e.dmg * 0.7, { vis: 'snake', r: 9, life: 4, color: '#a04ad8', wave: { amp: 26, freq: 7 } });
        G.Audio.sfx('slash');
      }
      return { mx: k.nx, my: k.ny };
    },

    akainu(e, k) {
      // Terremotos de Barbablanca: cada poco, limpian a los enemigos y lo apartan a él.
      e.ai.quake = (e.ai.quake === undefined ? 18 : e.ai.quake) - k.dt;
      if (e.ai.quake <= 0) {
        e.ai.quake = 20;
        G.HUD.banner('¡El terremoto de Barbablanca!', 'Te abre camino', '#9ad0ff');
        G.Camera.kick(1);
        for (const o of G.EnemyMgr.query(k.pl.x, k.pl.y, 360)) if (!o.boss && !o.dead) o.damage(9999, k.now);
        e.kx -= k.nx * 700; e.ky -= k.ny * 700;
        G.FX.ring(k.pl.x, k.pl.y, 20, 360, '#e8f4ff', 0.6, 8);
      }
      // Dai Funka: una columna de magma en línea que se queda ardiendo un momento.
      if (e.state === 'aim') {
        e.pose = true;
        if ((e.stateT -= k.dt) <= 0) {
          e.state = 'walk'; e.pose = false; e.atkAt = k.now;
          const a = e.ai.aim;
          for (let i = 1; i <= 8; i++) {
            const x = e.x + Math.cos(a) * i * 36, y = e.y + Math.sin(a) * i * 36;
            zone(x, y, 22, '#ff5a1a', 1.2, hurtZone(k.pl, e.dmg * 0.6));
            G.FX.burst(x, y, '#ff8a2a', 4, 120);
          }
          G.Audio.sfx('boom');
        }
        return STOP;
      }
      if (ready(e, k, 't1', 3.6, 4.4, 400)) {
        e.state = 'aim'; e.stateT = 0.7; e.ai.aim = Math.atan2(k.dy, k.dx);
        warnLine(e.x, e.y, e.ai.aim, 290, 40, '#ff5a1a', 0.7);
      }
      // Ryusei Kazan: puños de magma caen y dejan un charco de lava que crece.
      if (ready(e, k, 't2', 2.2, 2.8, 600)) {
        const x = k.pl.x + G.U.rand(-60, 60), y = k.pl.y + G.U.rand(-45, 45);
        warn(x, y, 30, '#ff5a1a', 1.0, () => {
          G.FX.burst(x, y, '#ff8a2a', 12, 160); G.Audio.sfx('boom');
          if (near(k.pl, x, y, 30)) k.pl.hurt(e.dmg * 0.8, G.Game.now);
          zone(x, y, 16, '#c83a1a', 5, hurtZone(k.pl, e.dmg * 0.3, (m, dt) => { m.r = Math.min(54, m.r + 9 * dt); }));
        });
      }
      return { mx: k.nx, my: k.ny };
    },

    rayleigh(e, k) {
      // Cortes en cuadrícula: líneas horizontales y verticales sobre la zona donde estás.
      if (ready(e, k, 't1', 4.2, 5.0, 460)) {
        e.atkAt = k.now;
        const cx = k.pl.x, cy = k.pl.y, L = 320, off = G.U.rand(-20, 20);
        const lines = [];
        for (const d of [-80, 0, 80]) {
          lines.push([cx - L / 2, cy + d + off, 0]);            // horizontales
          lines.push([cx + d + off, cy - L / 2, Math.PI / 2]);   // verticales
        }
        for (const [x0, y0, a] of lines) warnLine(x0, y0, a, L, 10, '#c8e0ff', 0.9, () => {
          const x1 = x0 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L;
          G.FX.beam(x0, y0 + G.LIFT, x1, y1 + G.LIFT, 3, '#ffffff', 0.15);
          if (!k.pl.dead && G.segDist(k.pl.x, k.pl.y, x0, y0, x1, y1) < 5 + k.pl.r) k.pl.hurt(e.dmg * 0.6, G.Game.now);
        });
        G.Audio.sfx('slash');
      }
      // Haki del Rey: una ola que tumba a los enemigos normales y te aturde si estás cerca.
      if (ready(e, k, 't2', 8, 10, 500)) {
        G.FX.ring(e.x, e.y, 10, 200, '#1a1220', 0.5, 10);
        G.FX.ring(e.x, e.y, 10, 190, '#c86bff', 0.5, 4);
        G.Camera.kick(0.5);
        for (const o of G.EnemyMgr.query(e.x, e.y, 200)) if (!o.boss && !o.dead && G.U.dist(o.x, o.y, e.x, e.y) < 200) o.damage(9999, k.now);
        if (k.d < 160) k.pl.affect('stun', 1.2);
        G.HUD.banner('Haki del Rey', '', '#c86bff');
      }
      return { mx: k.nx, my: k.ny };
    },

    px1(e, k) {
      // Ursus Shock: burbuja de aire comprimido que flota hacia ti y estalla.
      if (ready(e, k, 't1', 6, 7, 500)) {
        e.atkAt = k.now;
        shot(e, Math.atan2(k.dy, k.dx), 45, 0, {
          vis: 'bubble', r: 26, life: 3.2, homing: 0.8, keep: true,
          land: (x, y) => {
            G.FX.ring(x, y, 10, 110, '#c8e8ff', 0.4, 8); G.FX.burst(x, y, '#e8f4ff', 20, 220);
            G.Audio.sfx('boom'); G.Camera.kick(0.7);
            if (near(k.pl, x, y, 95)) k.pl.hurt(e.dmg * 1.6, G.Game.now);
          },
          hit: () => {}
        });
        G.HUD.banner('Ursus Shock', '¡Aléjate de la burbuja!', '#c8e8ff');
      }
      // Pad Hō: dos zarpazos de aire grandes y rápidos.
      if (ready(e, k, 't2', 2.4, 3.0, 460)) {
        const a0 = Math.atan2(k.dy, k.dx);
        for (const da of [-0.18, 0.18]) shot(e, a0 + da, 260, e.dmg * 0.6, { vis: 'paw', r: 14, life: 2 });
        G.Audio.sfx('punch');
      }
      return { mx: k.nx * 0.8, my: k.ny * 0.8 };
    },

    hody(e, k) {
      // Esteroides: a media vida, más rápido y más fuerte (una vez).
      if (!e.ai.rage && e.hp < e.maxHp * 0.5) {
        e.ai.rage = true; e.spd *= 1.4; e.dmg *= 1.3;
        G.HUD.banner('¡Esteroides!', 'Hody se vuelve loco', '#ff5f6d');
        G.FX.burst(e.x, e.y - 20, '#ff5f6d', 20, 200);
      }
      // Muros de agua: cruzan la zona de lado a lado, con un hueco por donde pasar.
      if (ready(e, k, 't1', 4.5, 5.5, 500)) {
        e.atkAt = k.now;
        const vert = Math.random() < 0.5, dir = Math.random() < 0.5 ? 1 : -1;
        const L = 360, gap = G.U.rand(-90, 90), speed = 150, T = 2.6;
        const sx = vert ? k.pl.x - dir * 200 : k.pl.x, sy = vert ? k.pl.y : k.pl.y - dir * 160;
        let hitT = -9;
        // Dos tramos con el hueco en medio; avanzan perpendiculares a sí mismos.
        for (const [a0, a1] of [[-L / 2, gap - 34], [gap + 34, L / 2]]) {
          const len = a1 - a0;
          const m = zone(0, 0, 0, '#3a8ad8', T, (mm, dt) => {
            const tr = (T - mm.life) * speed * dir;
            if (vert) { mm.x = sx + tr; mm.y = sy + a0; } else { mm.x = sx + a0; mm.y = sy + tr; }
            const x1 = mm.x + Math.cos(mm.a) * len, y1 = mm.y + Math.sin(mm.a) * len;
            if (Math.random() < 0.3) G.FX.puff(mm.x + Math.cos(mm.a) * len * Math.random(), mm.y + Math.sin(mm.a) * len * Math.random(), '#bfe4ff', 1);
            const t = G.Game.now;
            if (t - hitT > 0.6 && !k.pl.dead && G.segDist(k.pl.x, k.pl.y, mm.x, mm.y, x1, y1) < 12 + k.pl.r) {
              hitT = t; k.pl.hurt(e.dmg * 0.7, t); k.pl.push((vert ? dir : 0) * 240, (vert ? 0 : dir) * 240, 0.3);
            }
          }, 'line');
          m.a = vert ? Math.PI / 2 : 0; m.len = len; m.w = 22;
        }
        G.Audio.sfx('boom');
      }
      return { mx: k.nx, my: k.ny };
    },

    // ---------------- Dressrosa y Whole Cake ----------------

    caesar(e, k) {
      // Flota a media distancia.
      const keep = k.d < 170 ? -1 : k.d > 250 ? 1 : 0;
      // Shinokuni: un limo que se divide en dos cada vez que lo matas.
      if (ready(e, k, 't1', 7, 9, 500)) {
        e.atkAt = k.now;
        const p = besidePlayer(k.pl, 130);
        if (p) {
          G.FX.burst(p[0], p[1], '#9a6ad0', 14, 140);
          G.EnemyMgr.add(new G.Enemy(G.Enemies.BY_ID.slime, { x: p[0], y: p[1], dmgK: 1 + G.Game.time / 300 }));
          G.HUD.banner('¡Shinokuni!', 'Se divide al golpearlo', '#9a6ad0');
        }
      }
      // Gastanet: suelta nubes de gas que flotan; al rato, chasquea y estallan todas.
      if (ready(e, k, 't2', 6, 7, 500)) {
        const clouds = [];
        for (let i = 0; i < 5; i++) {
          const x = k.pl.x + G.U.rand(-120, 120), y = k.pl.y + G.U.rand(-90, 90);
          const vx = G.U.rand(-20, 20), vy = G.U.rand(-15, 15);
          clouds.push(zone(x, y, 32, '#8ac060', 3.2, (m, dt) => { m.x += vx * dt; m.y += vy * dt; }));
        }
        e.ai.boomAt = k.now + 3.0; e.ai.clouds = clouds;
        G.FX.text(e.x, e.y - 60, '¡Gastanet!', '#8ac060', true);
      }
      if (e.ai.boomAt && k.now >= e.ai.boomAt) {
        e.ai.boomAt = 0; e.atkAt = k.now;
        for (const m of e.ai.clouds) {
          G.FX.ring(m.x, m.y, 6, 48, '#ffb040', 0.3, 5); G.FX.burst(m.x, m.y, '#ff8a2a', 12, 160);
          if (near(k.pl, m.x, m.y, 36)) k.pl.hurt(e.dmg * 0.8, k.now);
          m.life = 0;
        }
        G.Audio.sfx('boom'); G.Camera.kick(0.4);
      }
      return { mx: k.nx * keep, my: k.ny * keep };
    },

    doflamingo(e, k) {
      // Birdcage: una jaula de hilos que encoge; fuera de ella, los hilos cortan.
      if (ready(e, k, 't1', 16, 18, 600)) {
        const cx = k.pl.x, cy = k.pl.y, R0 = 340, R1 = 120, T = 10;
        let hitT = -9;
        const m = zone(cx, cy, R0, '#f4f1ea', T, mm => {
          mm.r = R1 + (R0 - R1) * (mm.life / T);
          const t = G.Game.now;
          if (t - hitT > 0.5 && !k.pl.dead && G.U.dist(k.pl.x, k.pl.y, cx, cy) > mm.r) { hitT = t; k.pl.hurt(e.dmg * 0.4, t); }
        }, 'cage');
        G.HUD.banner('¡Birdcage!', 'Quédate dentro de la jaula', '#ff6bb0');
      }
      // Parasite: hilos hacia ti; si te pillan, controles al revés.
      if (e.state === 'aim') {
        e.pose = true;
        if ((e.stateT -= k.dt) <= 0) {
          e.state = 'walk'; e.pose = false; e.atkAt = k.now;
          for (const da of [-0.2, 0, 0.2]) {
            const a = e.ai.aim + da, x1 = e.x + Math.cos(a) * 300, y1 = e.y + Math.sin(a) * 300;
            G.FX.beam(e.x, e.y - 14, x1, y1 - 14, 2, '#f4f1ea', 0.25);
            if (!k.pl.dead && G.segDist(k.pl.x, k.pl.y, e.x, e.y, x1, y1) < 6 + k.pl.r) { k.pl.affect('invert', 3); k.pl.hurt(e.dmg * 0.4, k.now); }
          }
        }
        return STOP;
      }
      if (ready(e, k, 't2', 3.6, 4.4, 360)) {
        e.state = 'aim'; e.stateT = 0.6; e.ai.aim = Math.atan2(k.dy, k.dx);
        for (const da of [-0.2, 0, 0.2]) warnLine(e.x, e.y, e.ai.aim + da, 300, 4, '#ff6bb0', 0.6);
      }
      return { mx: k.nx, my: k.ny };
    },

    jack(e, k) {
      // A media vida: forma de mamut (una vez). Más grande y más lento; si te toca, te arrolla.
      if (!e.ai.mammoth && e.hp < e.maxHp * 0.5) {
        e.ai.mammoth = true; e.scale *= 1.6; e.r *= 1.6; e.spd *= 0.8; e.dmg *= 1.3;
        G.HUD.banner('¡Forma de mamut!', '', '#c8a070');
        G.FX.burst(e.x, e.y - 30, '#c8a070', 24, 200); G.Camera.kick(0.6);
      }
      if (e.ai.mammoth && !k.pl.dead && k.d < e.r + k.pl.r + 4 && !k.pl.shove) k.pl.push(k.nx * 360, k.ny * 360, 0.35);
      // Barrido con la trompa a su alrededor (casi una vuelta entera).
      if (e.state === 'aim') {
        e.pose = true;
        if ((e.stateT -= k.dt) <= 0) {
          e.state = 'walk'; e.pose = false; e.atkAt = k.now;
          const R = e.r + 70;
          G.FX.slash(e.x, e.y, e.ai.aim, 5.2, R, '#c8a070', 0.3, 'slash3');
          G.Audio.sfx('punch');
          if (k.d < R + k.pl.r) { k.pl.hurt(e.dmg, k.now); k.pl.push(k.nx * 300, k.ny * 300, 0.3); }
        }
        return STOP;
      }
      if (ready(e, k, 't1', 3.0, 3.8, 260)) {
        e.state = 'aim'; e.stateT = 0.7; e.ai.aim = Math.atan2(k.dy, k.dx);
        warn(e.x, e.y, e.r + 70, '#c8a070', 0.7);
      }
      return { mx: k.nx, my: k.ny };
    },

    katakuri(e, k) {
      // Ve el futuro: apunta a donde vas a estar dentro de t segundos.
      const future = t => [k.pl.x + k.pl.mvx * k.pl.spd * t, k.pl.y + k.pl.mvy * k.pl.spd * t];
      // Lanzas de mochi: tres, a donde estarás al llegar.
      if (ready(e, k, 't1', 2.4, 3.0, 440)) {
        e.atkAt = k.now;
        for (let i = 0; i < 3; i++) {
          const sp = 280, [fx, fy] = future(k.d / sp * (0.8 + i * 0.2));
          shot(e, Math.atan2(fy - e.y, fx - e.x), sp, e.dmg * 0.5, { vis: 'knife', r: 7, color: '#f4e8d0' });
        }
        G.Audio.sfx('slash');
      }
      // Puño de mochi gigante desde el suelo, donde estarás dentro de 1 s.
      if (ready(e, k, 't2', 5.0, 6.0, 500)) {
        const [fx, fy] = future(1.0);
        warn(fx, fy, 50, '#f4e8d0', 1.0, () => {
          G.FX.ring(fx, fy, 8, 64, '#f4e8d0', 0.35, 8); G.FX.burst(fx, fy, '#e8dcc0', 16, 180);
          G.Audio.sfx('boom'); G.Camera.kick(0.4);
          if (near(k.pl, fx, fy, 50)) k.pl.hurt(e.dmg * 1.4, G.Game.now);
        });
        G.FX.text(e.x, e.y - 60, 'Veo tu futuro', '#f4e8d0', true);
      }
      return { mx: k.nx, my: k.ny };
    },

    bigmom(e, k) {
      // Soul Pocus: cerca de ella, la vida se te va.
      if (!e.ai.aura) e.ai.aura = zone(e.x, e.y, 130, '#c86bff', 1e9, m => { m.x = e.x; m.y = e.y; if (e.dead) m.life = 0; });
      e.ai.drain = (e.ai.drain || 0) - k.dt;
      if (e.ai.drain <= 0 && k.d < 130 && !k.pl.dead) { e.ai.drain = 0.5; k.pl.hurt(e.dmg * 0.25, k.now); G.FX.puff(k.pl.x, k.pl.y - 20, '#c86bff', 2); }
      // Ataques de hambre: unos segundos mucho más rápida.
      if (e.state === 'hungry') {
        if (Math.random() < 0.5) G.FX.puff(e.x, e.y, '#ff9ec4', 1);
        if ((e.stateT -= k.dt) <= 0) e.state = 'walk';
        return { mx: k.nx, my: k.ny, spd: 2.0 };
      }
      if (ready(e, k, 't1', 9, 11, 700)) {
        e.state = 'hungry'; e.stateT = 3.5;
        G.HUD.banner('¡CROQUEMBOUCHE!', 'Big Mom tiene hambre: ¡corre!', '#ff6bb0');
      }
      // Prometheus: bola de fuego que cae donde estás y se parte en cuatro.
      if (ready(e, k, 't2', 3.0, 3.6, 600)) {
        const tx = k.pl.x, ty = k.pl.y;
        shot(e, Math.atan2(ty - e.y, tx - e.x), 220, e.dmg * 0.6, {
          vis: 'firefist', r: 10, life: Math.min(2, Math.hypot(tx - e.x, ty - e.y) / 220),
          land: (x, y) => {
            G.FX.burst(x, y, '#ff8a2a', 12, 160); G.Audio.sfx('boom');
            for (let i = 0; i < 4; i++) {
              const a = i / 4 * 6.283 + 0.785;
              G.Projectiles.spawn({ foe: true, x, y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, dmg: e.dmg * 0.4, r: 6, life: 1.4, color: '#ff8a2a', vis: 'ebullet' });
            }
          }
        });
      }
      return { mx: k.nx, my: k.ny };
    },

    // ---------------- Wano ----------------

    queen(e, k) {
      // Plague Rounds: dardos que te contagian (veneno unos segundos).
      if (ready(e, k, 't1', 2.6, 3.2, 440)) {
        e.atkAt = k.now;
        const a0 = Math.atan2(k.dy, k.dx);
        for (const da of [-0.15, 0, 0.15]) shot(e, a0 + da, 230, e.dmg * 0.3, { r: 5, color: '#8ad04a', hit: pl => pl.affect('poison', 4, e.dmg * 0.25) });
        G.Audio.sfx('shoot');
      }
      // Láseres: dos rayos que salen de los lados y se cruzan donde estás.
      if (ready(e, k, 't2', 5.5, 6.5, 460)) {
        const tx = k.pl.x, ty = k.pl.y;
        for (const side of [-1, 1]) {
          const ox = e.x - k.ny * side * 60, oy = e.y + k.nx * side * 60, a = Math.atan2(ty - oy, tx - ox), L = Math.hypot(tx - ox, ty - oy) + 120;
          warnLine(ox, oy, a, L, 10, '#ff3a3a', 0.8, () => {
            const x1 = ox + Math.cos(a) * L, y1 = oy + Math.sin(a) * L;
            G.FX.beam(ox, oy - 10, x1, y1 - 10, 8, '#ff5f5f', 0.25);
            if (!k.pl.dead && G.segDist(k.pl.x, k.pl.y, ox, oy, x1, y1) < 8 + k.pl.r) k.pl.hurt(e.dmg * 0.8, G.Game.now);
          });
        }
        G.Audio.sfx('thunder');
      }
      return { mx: k.nx * 0.8, my: k.ny * 0.8 };
    },

    king(e, k) {
      // Picado: sube y cae en línea recta a través de ti, dejando fuego.
      if (e.state === 'up') {
        e.z = Math.min(200, (e.z || 0) + 500 * k.dt);
        if ((e.stateT -= k.dt) <= 0) {
          const a = Math.atan2(k.dy, k.dx) + G.U.rand(-0.3, 0.3);
          e.ai.a = a; e.x = k.pl.x - Math.cos(a) * 260; e.y = k.pl.y - Math.sin(a) * 260;
          warnLine(e.x, e.y, a, 520, 36, '#ff8a2a', 0.5);
          e.state = 'aimdive'; e.stateT = 0.5;
        }
        return STOP;
      }
      if (e.state === 'aimdive') {
        if ((e.stateT -= k.dt) <= 0) { e.state = 'dive'; e.stateT = 0.85; e.hidden = false; e.z = 20; e.pose = true; }
        return STOP;
      }
      if (e.state === 'dive') {
        e.ai.fire = (e.ai.fire || 0) - k.dt;
        if (e.ai.fire <= 0) { e.ai.fire = 0.05; zone(e.x, e.y, 18, '#ff5a1a', 2.0, hurtZone(k.pl, e.dmg * 0.3)); }
        if ((e.stateT -= k.dt) <= 0) { e.state = 'walk'; e.z = 0; e.pose = false; }
        return { mx: Math.cos(e.ai.a), my: Math.sin(e.ai.a), spd: 8 };
      }
      if (ready(e, k, 't1', 5.0, 6.0, 500)) { e.state = 'up'; e.stateT = 0.5; e.hidden = true; }
      // Alas de fuego: un anillo que se expande desde él.
      if (ready(e, k, 't2', 4.0, 5.0, 300)) {
        e.atkAt = k.now;
        const x = e.x, y = e.y, R0 = 20, R1 = 220, T = 1.0;
        G.FX.ring(x, y, R0, R1, '#ff8a2a', T, 10);
        let hit = false;
        zone(x, y, R0, '#ff8a2a', T, m => {
          const R = R0 + (R1 - R0) * (1 - m.life / m.max);
          if (!hit && Math.abs(G.U.dist(k.pl.x, k.pl.y, x, y) - R * 0.85) < 14 + k.pl.r) { hit = true; k.pl.hurt(e.dmg * 0.8, G.Game.now); }
        }, 'hidden');
        G.Audio.sfx('boom');
      }
      return { mx: k.nx, my: k.ny };
    },

    kaido(e, k) {
      // A media vida se convierte en dragón (una vez): otro dibujo, vuela y ataca distinto.
      if (!e.ai.dragon && e.hp < e.maxHp * 0.5) {
        e.ai.dragon = true;
        e.sprite = 'kaidodragon'; e.scale = G.Pix.sprite('kaidodragon').scale || 1; e.r *= 1.4;
        e.def = Object.assign({}, e.def, { hover: true });
        e.state = 'walk'; e.pose = false; e.t1 = 1.5; e.t2 = 3;
        G.HUD.banner('¡Kaido se convierte en dragón!', '', '#5a9ad8');
        G.FX.burst(e.x, e.y - 40, '#5a9ad8', 30, 240); G.Camera.kick(0.8);
      }
      if (!e.ai.dragon) {
        // Kanabō: golpe al suelo con tres ondas de choque en abanico.
        if (e.state === 'aim') {
          e.pose = true;
          if ((e.stateT -= k.dt) <= 0) {
            e.state = 'walk'; e.pose = false; e.atkAt = k.now;
            for (const da of [-0.5, 0, 0.5]) {
              const a = e.ai.aim + da, x1 = e.x + Math.cos(a) * 300, y1 = e.y + Math.sin(a) * 300;
              G.FX.beam(e.x, e.y + G.LIFT, x1, y1 + G.LIFT, 10, '#c8a070', 0.3);
              if (!k.pl.dead && G.segDist(k.pl.x, k.pl.y, e.x, e.y, x1, y1) < 12 + k.pl.r) k.pl.hurt(e.dmg, k.now);
            }
            G.Audio.sfx('boom'); G.Camera.kick(0.5);
          }
          return STOP;
        }
        if (ready(e, k, 't1', 3.4, 4.2, 400)) {
          e.state = 'aim'; e.stateT = 0.8; e.ai.aim = Math.atan2(k.dy, k.dx);
          for (const da of [-0.5, 0, 0.5]) warnLine(e.x, e.y, e.ai.aim + da, 300, 20, '#c8a070', 0.8);
        }
        return { mx: k.nx, my: k.ny };
      }
      // Dragón · Bolo Breath: un chorro de fuego que gira poco a poco hacia ti.
      if (e.state === 'breath') {
        e.pose = true;
        const want = Math.atan2(k.dy, k.dx);
        e.ai.ba += Math.max(-0.9 * k.dt, Math.min(0.9 * k.dt, Math.atan2(Math.sin(want - e.ai.ba), Math.cos(want - e.ai.ba))));
        const L = 300, x1 = e.x + Math.cos(e.ai.ba) * L, y1 = e.y + Math.sin(e.ai.ba) * L;
        G.FX.beam(e.x, e.y - 40, x1, y1 - 10, 16, '#ff8a2a', 0.06);
        if (!k.pl.dead && G.segDist(k.pl.x, k.pl.y, e.x, e.y, x1, y1) < 14 + k.pl.r) k.pl.hurt(e.dmg * 0.7, k.now);
        if ((e.stateT -= k.dt) <= 0) { e.state = 'walk'; e.pose = false; }
        return STOP;
      }
      if (ready(e, k, 't1', 4.5, 5.5, 420)) {
        e.state = 'breath'; e.stateT = 1.8; e.ai.ba = Math.atan2(k.dy, k.dx) + (Math.random() < 0.5 ? -0.8 : 0.8);
        G.HUD.banner('Bolo Breath', '', '#ff8a2a');
      }
      // Dragón · anillos de bolas de fuego que se cierran sobre ti.
      if (ready(e, k, 't2', 5.0, 6.0, 500)) {
        const cx = k.pl.x, cy = k.pl.y;
        for (const [R, delay] of [[150, 0.9], [80, 1.5]]) for (let i = 0; i < 10; i++) {
          const a = i / 10 * 6.283 + R, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * 0.8;
          warn(x, y, 22, '#ff5a1a', delay, () => {
            G.FX.burst(x, y, '#ff8a2a', 6, 120);
            if (near(k.pl, x, y, 22)) k.pl.hurt(e.dmg * 0.6, G.Game.now);
          });
        }
        G.Audio.sfx('boom');
      }
      return { mx: k.nx * 0.8, my: k.ny * 0.8 };
    },

    // ---------------- Saga Final ----------------

    saturn(e, k) {
      // Mirada: le brillan los ojos; si te estás moviendo cuando acaba, te paraliza.
      if (e.state === 'glare') {
        e.pose = true;
        if ((e.stateT -= k.dt) <= 0) {
          e.state = 'walk'; e.pose = false; e.atkAt = k.now;
          G.FX.ring(e.x, e.y - 50, 4, 40, '#ff3a3a', 0.3, 4);
          if (k.d < 420 && k.pl.walking) { k.pl.affect('stun', 1.6); k.pl.hurt(e.dmg * 0.5, k.now); }
          else if (k.d < 420) G.FX.text(k.pl.x, k.pl.y - 44, '¡Quieto!', '#ffe14d');
        }
        return STOP;
      }
      if (ready(e, k, 't1', 5.0, 6.0, 420)) {
        e.state = 'glare'; e.stateT = 1.1;
        G.HUD.banner('Sus ojos brillan…', '¡No te muevas!', '#ff3a3a');
      }
      // Pentagrama: una estrella bajo tus pies; de sus líneas salen patas de araña.
      if (ready(e, k, 't2', 4.0, 5.0, 460)) {
        const cx = k.pl.x, cy = k.pl.y, R = 110;
        const pts = [0, 1, 2, 3, 4].map(i => { const a = -Math.PI / 2 + i * 2 * 6.283 / 5; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.8]; });
        for (let i = 0; i < 5; i++) {
          const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % 5], a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0);
          warnLine(x0, y0, a, L, 10, '#a01a3a', 1.0, () => {
            G.FX.beam(x0, y0 + G.LIFT, x1, y1 + G.LIFT, 6, '#2a1a2a', 0.3);
            if (!k.pl.dead && G.segDist(k.pl.x, k.pl.y, x0, y0, x1, y1) < 8 + k.pl.r) k.pl.hurt(e.dmg * 0.8, G.Game.now);
          });
        }
        G.Audio.sfx('slash');
      }
      return { mx: k.nx * 0.7, my: k.ny * 0.7 };
    },

    loki(e, k) {
      // Ragnir: clava el martillo; un rayo une el martillo con Loki mientras él se mueve.
      if (ready(e, k, 't1', 7, 8, 460)) {
        e.atkAt = k.now;
        const hx = k.pl.x + G.U.rand(-60, 60), hy = k.pl.y + G.U.rand(-50, 50);
        warn(hx, hy, 24, '#ffe14d', 0.6, () => {
          G.FX.burst(hx, hy, '#ffe14d', 12, 160); G.Audio.sfx('thunder');
          let hitT = -9;
          zone(hx, hy, 14, '#ffe14d', 5, () => {
            if (e.dead) return;
            G.FX.bolt(hx, hy, e.x, e.y - 20, '#ffe14d', 0.06);
            const t = G.Game.now;
            if (t - hitT > 0.5 && !k.pl.dead && G.segDist(k.pl.x, k.pl.y, hx, hy, e.x, e.y) < 8 + k.pl.r) { hitT = t; k.pl.hurt(e.dmg * 0.6, t); }
          });
        });
      }
      // Rugido de gigante: te aparta lejos.
      if (ready(e, k, 't2', 5.0, 6.0, 300)) {
        G.FX.ring(e.x, e.y - 40, 10, 260, '#c8a070', 0.5, 6); G.Camera.kick(0.6);
        if (k.d < 260) { k.pl.push(k.nx * 420, k.ny * 420, 0.5); k.pl.hurt(e.dmg * 0.4, k.now); }
        G.HUD.banner('¡Rugido de gigante!', '', '#c8a070');
      }
      return { mx: k.nx * 0.7, my: k.ny * 0.7 };
    },

    sommers(e, k) {
      // Enredaderas de espinas: crecen desde él hacia ti, tramo a tramo, y se quedan un rato.
      if (ready(e, k, 't1', 3.4, 4.2, 440)) {
        e.atkAt = k.now;
        const a0 = Math.atan2(k.dy, k.dx);
        for (const da of [-0.35, 0.35]) {
          let x = e.x, y = e.y, a = a0 + da;
          for (let i = 0; i < 9; i++) {
            a += G.U.rand(-0.25, 0.25) - da * 0.15;
            const nx = x + Math.cos(a) * 34, ny = y + Math.sin(a) * 34, sx = x, sy = y, ang = a;
            warnLine(sx, sy, ang, 34, 10, '#3a7a3a', 0.25 + i * 0.08, () => {
              const z = zone(sx, sy, 0, '#2a5a2a', 4, (m) => {
                if (!k.pl.dead && G.segDist(k.pl.x, k.pl.y, sx, sy, sx + Math.cos(ang) * 34, sy + Math.sin(ang) * 34) < 7 + k.pl.r) {
                  const t = G.Game.now; if (t - (e.ai.thornT || -9) > 0.5) { e.ai.thornT = t; k.pl.hurt(e.dmg * 0.4, t); }
                }
              }, 'line');
              z.a = ang; z.len = 34; z.w = 8;
            });
            x = nx; y = ny;
          }
        }
        G.Audio.sfx('slash');
      }
      return { mx: k.nx * 0.8, my: k.ny * 0.8 };
    },

    killingham(e, k) {
      // Su montura carga en zigzag (tres tramos).
      if (e.state === 'zig') {
        e.pose = true;
        if ((e.stateT -= k.dt) <= 0) {
          if (--e.ai.legs > 0) {
            e.stateT = 0.35;
            const a = Math.atan2(k.dy, k.dx) + (e.ai.legs % 2 ? 0.7 : -0.7);
            e.ai.vx = Math.cos(a); e.ai.vy = Math.sin(a);
          } else { e.state = 'walk'; e.pose = false; }
        }
        if (Math.random() < 0.5) G.FX.puff(e.x, e.y, '#c8b0e0', 1);
        return { mx: e.ai.vx, my: e.ai.vy, spd: 4 };
      }
      if (ready(e, k, 't1', 4.0, 5.0, 400)) {
        e.state = 'zig'; e.stateT = 0.4; e.ai.legs = 3;
        const a = Math.atan2(k.dy, k.dx) + 0.7; e.ai.vx = Math.cos(a); e.ai.vy = Math.sin(a);
        warnLine(e.x, e.y, a, 120, e.r * 2, '#c8b0e0', 0.4);
      }
      // Burbujas de sueño: si te tocan, te duermes un momento.
      if (ready(e, k, 't2', 3.0, 3.6, 440)) {
        shot(e, Math.atan2(k.dy, k.dx), 90, 0, { vis: 'bubble', r: 12, life: 4, homing: 0.5, color: '#c8b0e0', hit: pl => pl.affect('stun', 1.8) });
      }
      return { mx: k.nx, my: k.ny };
    },

    gunko(e, k) {
      // Recuerda por dónde has pasado (último par de segundos).
      e.ai.trail = e.ai.trail || [];
      e.ai.tt = (e.ai.tt || 0) - k.dt;
      if (e.ai.tt <= 0) { e.ai.tt = 0.2; e.ai.trail.push([k.pl.x, k.pl.y]); if (e.ai.trail.length > 12) e.ai.trail.shift(); }
      // Flechas que caen sobre tu rastro: donde estuviste hace un momento.
      if (ready(e, k, 't1', 2.6, 3.2, 480)) {
        e.atkAt = k.now;
        e.ai.trail.forEach(([x, y], i) => warn(x, y, 20, '#ffd23f', 0.5 + i * 0.05, () => {
          G.FX.beam(x - 20, y - 160, x, y, 3, '#ffd23f', 0.12);
          if (near(k.pl, x, y, 20)) k.pl.hurt(e.dmg * 0.5, G.Game.now);
        }));
        G.Audio.sfx('shoot');
      }
      // Flecha directa, rápida.
      if (ready(e, k, 't2', 1.6, 2.0, 480)) shot(e, Math.atan2(k.dy, k.dx), 380, e.dmg * 0.5, { vis: 'knife', r: 6 });
      return { mx: k.nx * 0.9, my: k.ny * 0.9 };
    },

    shamrock(e, k) {
      // Tres cabezas de perro que muerden por turnos, cada una desde un lado.
      if (ready(e, k, 't1', 3.6, 4.4, 460)) {
        e.atkAt = k.now;
        [-1, 0, 1].forEach((side, i) => {
          const a = Math.atan2(k.dy, k.dx) + side * 0.9;
          shot(e, a, 160, e.dmg * 0.7, { vis: 'paw', r: 12, life: 3, homing: 2.2, delay: i * 0.35, color: '#3a2a3a' });
        });
        G.Audio.sfx('punch');
      }
      // Corte en X enorme sobre donde estás.
      if (ready(e, k, 't2', 5.0, 6.0, 500)) {
        const cx = k.pl.x, cy = k.pl.y, L = 300;
        for (const a of [Math.PI / 4, -Math.PI / 4]) {
          const x0 = cx - Math.cos(a) * L / 2, y0 = cy - Math.sin(a) * L / 2;
          warnLine(x0, y0, a, L, 26, '#3a8a3a', 0.9, () => {
            const x1 = x0 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L;
            G.FX.beam(x0, y0 + G.LIFT, x1, y1 + G.LIFT, 10, '#9ad04a', 0.2);
            if (!k.pl.dead && G.segDist(k.pl.x, k.pl.y, x0, y0, x1, y1) < 13 + k.pl.r) k.pl.hurt(e.dmg * 1.1, G.Game.now);
          });
        }
        G.Audio.sfx('slash');
      }
      return { mx: k.nx, my: k.ny };
    },

    // ---------------- Alabasta (jefes de isla) ----------------

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
          const base = G.Enemies.BY_ID.zombie;
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
