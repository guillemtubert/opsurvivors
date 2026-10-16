/* ============ island.js — lo que hay que hacer en cada isla ============
 *
 *   explorar ──(3:00)──> Buster Call: cada vez más enemigos y más fuertes
 *      │
 *      └─ Den Den Mushi (cuando quieras) ──> jefe(s) ──> el barco se abre ──> siguiente isla
 *
 * Isla de huida (escape): no hay Den Den Mushi; el jefe, invencible, aparece a los
 * ESCAPE_AT segundos y te persigue. El barco está abierto desde el principio.
 * Dúo: def.boss es una lista; el barco se abre cuando caen todos.
 *
 * Los cofres son opcionales: si no los coges, sigues más débil. Todo se
 * coloca con la semilla de la isla: cofres repartidos alrededor del centro,
 * el Den Den Mushi a media distancia y el muelle en la costa sur o norte.
 */
G.Island = (() => {
  const OPEN_R = 46, USE_R = 74;
  let def = null, idx = 0, t = 0, warned = false, saga = null, sagaIdx = 0;
  let chests = [], snail = null, dock = null;
  let boss = 'idle';                   // idle · called · dead
  let action = null;                   // { label, fn, off } lo que se puede hacer donde estás
  const art = {};

  function img(name) {
    if (!art[name]) art[name] = G.Props.make(name);
    return art[name];                   // null si su PNG no cargó: no se dibuja
  }

  function clear() { def = null; chests = []; snail = null; dock = null; action = null; }

  // ---------------- colocación ----------------

  function setup(d, i, seed, sg, si) {
    def = d; idx = i; t = 0; warned = false; boss = 'idle'; action = null; saga = sg; sagaIdx = si;
    chests = []; snail = null;
    let n = 0;
    const rnd = () => G.U.hash(n++, 7, seed);
    const R = G.World.radius;
    const land = (x, y) => G.World.waterAt(x, y) === 0;
    const far = (x, y, pts, min) => pts.every(p => G.U.dist2(x, y, p.x, p.y) > min * min);

    // Muelle: de la costa sur (o norte) hacia el mar, con el barco al lado.
    const dir = rnd() < 0.5 ? 1 : -1;
    const px = Math.round((rnd() - 0.5) * R * 0.5 / G.TILE) * G.TILE;
    let py = 0;
    while (Math.abs(py) < R * 1.4 && land(px, py + dir * 16)) py += dir * 16;
    const L = 7 * G.TILE, W = 2 * G.TILE;
    const y0 = dir > 0 ? py - 2 * G.TILE : py - L, y1 = dir > 0 ? py + L : py + 2 * G.TILE;
    dock = { x0: px - W / 2, x1: px + W / 2, y0, y1, dir, coastY: py,
             endX: px, endY: dir > 0 ? y1 - 24 : y0 + 24 };
    dock.shipX = px + 130; dock.shipY = dock.endY + (dir > 0 ? 40 : 20);
    G.World.setPier(dock);
    G.World.reserve(px, py, 3);

    const taken = [{ x: 0, y: 0 }, { x: px, y: py }];
    if (d.escape) snail = { x: 1e9, y: 1e9, none: true };      // sin Den Den Mushi (nunca está cerca)
    // Den Den Mushi: a media distancia, lejos del muelle y del centro.
    for (let k = 0; k < 200 && !snail; k++) {
      const a = rnd() * 6.283, r = R * (0.2 + rnd() * 0.15);
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (land(x, y) && far(x, y, taken, R * 0.18)) snail = { x, y };
    }
    if (!snail) snail = { x: R * 0.3, y: 0 };
    if (!snail.none) { taken.push(snail); G.World.reserve(snail.x, snail.y, 2); }

    // Cofres: repartidos en sectores alrededor del centro.
    const nChests = d.chests || 5;
    for (let c = 0; c < nChests; c++) {
      for (let k = 0; k < 120; k++) {
        const a = (c + 0.15 + rnd() * 0.7) / nChests * 6.283, r = R * (0.25 + rnd() * 0.55);
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (!land(x, y) || !far(x, y, taken, R * 0.22)) continue;
        const ch = { x, y, open: false };
        chests.push(ch); taken.push(ch);
        G.World.reserve(x, y, 1);
        break;
      }
    }
  }

  // ---------------- partida ----------------

  const bossDefs = () => G.Islands.bossIds(def).map(id => G.Enemies.BOSS_BY_ID[id]);
  const bossName = () => bossDefs().map(b => b.name.replace('Capitán ', '')).join(' y ');
  const bossTitle = () => bossDefs().map(b => b.title).join(' · ');

  function update(dt, pl, now) {
    if (!def) return;
    t += dt;

    for (const c of chests) {
      if (!c.open && G.U.dist2(c.x, c.y, pl.x, pl.y) < OPEN_R * OPEN_R) {
        c.open = true;
        G.FX.burst(c.x, c.y - 20, '#ffd23f', 30, 180);
        G.Game.openChest(false);
        return;                                   // un cofre por frame (abre las cartas)
      }
    }

    if (def.escape && boss === 'idle' && t >= G.Islands.ESCAPE_AT) summon();
    if (!warned && t >= G.Islands.BUSTER_AT - 20 && boss === 'idle' && !def.escape) {
      warned = true;
      G.HUD.banner('Buster Call en 20 s', 'Llama al jefe con el Den Den Mushi o corre', '#ff8a5a');
    }
    if (t >= G.Islands.BUSTER_AT && t - dt < G.Islands.BUSTER_AT) {
      G.HUD.banner('¡BUSTER CALL!', 'La Marina va a por ti', '#ff5f6d');
      G.Audio.sfx('boss');
      G.Camera.kick(0.6);
    }

    // Qué se puede hacer donde estás.
    action = null;
    if (boss === 'idle' && !snail.none && G.U.dist2(snail.x, snail.y, pl.x, pl.y) < USE_R * USE_R) {
      action = { label: 'Llamar a ' + bossName(), fn: summon };
    } else if (G.U.dist2(dock.endX, dock.endY, pl.x, pl.y) < USE_R * USE_R * 1.4) {
      action = boss === 'dead' || def.escape ? { label: 'Zarpar', fn: () => G.Game.nextIsland() }
                               : { label: 'Derrota a ' + bossName() + ' para zarpar', off: true };
    }
    G.HUD.action(action);
    if (action && !action.off && (G.Input.tap('space') || G.Input.tap('enter') || G.Input.tap('keyf'))) act();
  }

  function act() { if (action && !action.off) action.fn(); }

  function summon() {
    const pl = G.Game.player;
    boss = 'called';
    bossDefs().forEach((b, i) => G.Spawner.summon(b, pl, i));
    G.HUD.banner((def.escape ? '¡Huye! Llega ' : '¡Llega ') + bossName() + '!', def.escape ? 'No se le puede vencer: corre al barco' : bossTitle(), '#ff5f6d');
    G.Audio.sfx('boss');
    G.Audio.music('boss');
    // Llamarlo antes del Buster Call tiene premio.
    const left = G.Islands.BUSTER_AT - t;
    if (left > 0 && !def.escape) {
      const bonus = Math.round(left * 1.5);
      pl.coins += bonus;
      G.FX.text(pl.x, pl.y - 44, '¡Valiente! +' + bonus + ' ฿', '#ffd23f', true);
    }
  }

  function onBossKilled(e) {
    // Dúo: el barco se abre cuando caen todos.
    if (G.EnemyMgr.bosses().some(b => b !== e)) { G.HUD.banner('¡Has derrotado a ' + e.name + '!', 'Aún queda otro', '#ffd23f'); return; }
    boss = 'dead';
    G.HUD.banner('¡Has derrotado a ' + e.name + '!', 'Coge su cofre y sube al barco', '#ffd23f');
  }

  /** Segundos de Buster Call (o -1 si aún no ha empezado). */
  function busterT() { return def && t >= G.Islands.BUSTER_AT ? t - G.Islands.BUSTER_AT : -1; }

  /** Texto del objetivo para el HUD. */
  function goal() {
    if (!def) return '';
    const got = chests.filter(c => c.open).length;
    const box = 'Cofres ' + got + '/' + chests.length;
    if (def.escape) return box + (boss === 'idle' ? ' · Llega ' + bossName() + ' en ' + Math.max(0, Math.ceil(G.Islands.ESCAPE_AT - t)) + ' s' : ' · ¡Huye al barco!');
    if (boss === 'dead') return box + ' · ¡Al barco!';
    if (boss === 'called') return box + ' · Derrota a ' + bossName();
    const left = G.Islands.BUSTER_AT - t;
    return box + ' · ' + (left > 0 ? 'Buster Call ' + G.U.mmss(Math.ceil(left)) : '¡BUSTER CALL!');
  }

  // ---------------- dibujo ----------------

  function collect(list, now) {
    if (!def) return;
    const P = G.PX;
    const put = (name, x, y, o = {}) => {
      if (!G.Camera.sees(x, y, 160)) return;
      list.push({ y: o.flat ? y - 1000 : y, draw(ctx) {
        const p = img(name);
        if (!p) return;
        const w = p.img.width * P, h = p.img.height * P;
        const bob = o.bob ? Math.round(Math.sin(now * 3) * 1.5) * P : 0;
        if (o.glow) {
          ctx.globalAlpha = 0.25 + Math.sin(now * 5) * 0.12;
          ctx.fillStyle = o.glow;
          ctx.beginPath(); ctx.ellipse(x, y, w * 0.55, w * 0.2, 0, 0, 6.283); ctx.fill();
          ctx.globalAlpha = 1;
        }
        if (!o.noShadow) {
          ctx.fillStyle = 'rgba(0,0,0,.25)';
          ctx.beginPath(); ctx.ellipse(x, y, w * 0.4, w * 0.12, 0, 0, 6.283); ctx.fill();
        }
        ctx.drawImage(p.img, Math.round((x - p.ox * P) / P) * P, Math.round((y - p.oy * P + bob) / P) * P, w, h);
      } });
    };

    // Muelle: tablas sobre el agua.
    if (G.Camera.sees((dock.x0 + dock.x1) / 2, (dock.y0 + dock.y1) / 2, 300)) {
      list.push({ y: -1e9, draw(ctx) {
        const { x0, x1, y0, y1 } = dock;
        ctx.fillStyle = '#5a3a1e'; ctx.fillRect(x0 - 4, y0, x1 - x0 + 8, y1 - y0);
        for (let y = y0; y < y1; y += 12) {
          ctx.fillStyle = (y / 12) % 2 ? '#a0703c' : '#b07c44';
          ctx.fillRect(x0, y + 2, x1 - x0, 8);
        }
        ctx.fillStyle = '#3a2410';
        for (let y = y0 + 20; y < y1; y += 64) { ctx.fillRect(x0 - 8, y, 8, 12); ctx.fillRect(x1, y, 8, 12); }
        if (boss === 'dead' || def.escape) {
          ctx.globalAlpha = 0.35 + Math.sin(now * 5) * 0.2;
          ctx.fillStyle = '#ffd23f';
          ctx.beginPath(); ctx.ellipse(dock.endX, dock.endY, 30, 12, 0, 0, 6.283); ctx.fill();
          ctx.globalAlpha = 1;
        }
      } });
    }
    const ship = def.ship || saga.ship || 'merry';
    put(G.Props.has(ship) ? ship : 'merry', dock.shipX, dock.shipY, { bob: true, noShadow: true });
    if (!snail.none) put('denden', snail.x, snail.y, { glow: boss === 'idle' ? '#ff9ec4' : null, bob: boss === 'idle' });
    for (const c of chests) put(c.open ? 'chestOpen' : 'chest', c.x, c.y, { glow: c.open ? null : '#ffd23f' });
  }

  /** Puntos para el minimapa. */
  function pois() {
    if (!def) return null;
    return { chests, snail, boss, dock, escape: !!def.escape };
  }

  return {
    setup, clear, update, act, collect, onBossKilled, busterT, goal, pois,
    get def() { return def; }, get index() { return idx; }, get time() { return t; },
    get saga() { return saga; }, get sagaIndex() { return sagaIdx; },
    /** Segundos de dificultad: crece con cada isla del viaje y, dentro de la isla, con el tiempo. */
    get difficulty() { return idx * 25 + Math.min(t, 150); }
  };
})();
