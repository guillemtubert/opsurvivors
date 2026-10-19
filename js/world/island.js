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
 * Imprevistos (uno al azar en algunas islas, nunca en la primera):
 *   night    noche: sólo ves alrededor de ti
 *   fog      niebla: ves menos y el minimapa no enseña al jefe
 *   storm    tormenta: lluvia y ráfagas de viento que os empujan a todos
 *   merchant un mercader vende objetos a cambio de berries
 *   cursed   cofre maldito: un objeto bueno, pero sale una oleada de élites
 *
 * Los cofres son opcionales: si no los coges, sigues más débil. Todo se
 * coloca con la semilla de la isla: cofres repartidos alrededor del centro,
 * el Den Den Mushi a media distancia y el muelle en la costa sur o norte.
 */
G.Island = (() => {
  const OPEN_R = 46, USE_R = 74;
  let def = null, idx = 0, t = 0, warned = false, saga = null, sagaIdx = 0;
  let event = null, merchant = null, cursed = null, gustT = 0, wind = [1, 0], rain = [];
  const EVENTS = {
    night:    { name: 'Noche',         desc: 'Sólo ves lo que tienes cerca' },
    fog:      { name: 'Niebla',        desc: 'Se ve poco y el minimapa no ayuda' },
    storm:    { name: 'Tormenta',      desc: 'Las ráfagas de viento os empujan' },
    merchant: { name: 'Mercader',      desc: 'Vende objetos a cambio de berries' },
    cursed:   { name: 'Cofre maldito', desc: 'Un buen objeto… y una oleada de élites' }
  };
  let chests = [], snail = null, dock = null;
  let boss = 'idle';                   // idle · called · dead
  let action = null;                   // { label, fn, off } lo que se puede hacer donde estás
  const art = {};

  function img(name) {
    if (!art[name]) art[name] = G.Props.make(name);
    return art[name];                   // null si su PNG no cargó: no se dibuja
  }

  function clear() { def = null; chests = []; snail = null; dock = null; action = null; event = null; merchant = null; cursed = null; }

  // ---------------- colocación ----------------

  function setup(d, i, seed, sg, si) {
    def = d; idx = i; t = 0; warned = false; boss = 'idle'; action = null; saga = sg; sagaIdx = si;
    chests = []; snail = null; merchant = null; cursed = null; rain = []; gustT = 6;
    let n = 0;
    const rnd = () => G.U.hash(n++, 7, seed);
    // Imprevisto: más o menos la mitad de las islas, nunca la primera.
    const r = rnd(), keys = Object.keys(EVENTS);
    event = i > 0 && r < 0.5 ? keys[Math.floor(r / 0.5 * keys.length)] : null;
    const wa = rnd() * 6.283; wind = [Math.cos(wa), Math.sin(wa)];
    const R = G.World.radius;
    const land = (x, y) => G.World.waterAt(x, y) === 0 && G.World.reachable(x, y);
    const far = (x, y, pts, min) => pts.every(p => G.U.dist2(x, y, p.x, p.y) > min * min);

    // Muelle: de la costa sur (o norte) hacia el mar, con el barco al lado.
    let dir = rnd() < 0.5 ? 1 : -1;
    const dir0 = dir;
    // La costa desde donde sale el muelle debe ser alcanzable andando (si no, se prueba otra).
    // El muelle nace en el último tramo alcanzable antes del mar y lo cruza hasta el agua.
    let px = 0, py = 0, L = 7 * G.TILE;
    for (let k = 0; k < 80; k++) {
      const rc = Math.round((rnd() - 0.5) * R * 0.5 / G.TILE) * G.TILE;
      // Primero las puertas de la isla (el muelle sale por ellas), luego al azar.
      const gl = G.World.gates();
      const st = gl.filter(g => g.closed).concat(gl.filter(g => !g.closed))[k];   // primero la puerta que se abre con el jefe
      const cx = st ? Math.round(st.x / G.TILE) * G.TILE : rc;
      dir = st ? (st.y >= 0 ? 1 : -1) : dir0;
      // Desde una puerta, el muelle sale de ella hacia el mar (si se cierra, queda cortado).
      const gy = st ? Math.round(st.y / G.TILE) * G.TILE : 0;
      let sy = gy;
      while (Math.abs(sy) < R * 1.4 && !G.World.seaAt(cx, sy + dir * 16)) sy += dir * 16;
      // Una puerta abierta solo vale si se llega a ella desde el centro (las cerradas, siempre).
      // El tramo del muelle no puede cruzar muros (solo agua o suelo), ni desde una puerta.
      const cleanRun = (y0, y1) => { for (let t = y0; dir * (y1 - t) >= 0; t += dir * 16) if (G.World.waterAt(cx, t) === 2 && !G.World.seaAt(cx, t)) return false; return true; };
      if (st && Math.abs(sy) < R * 1.4 && (st.closed || G.World.reachable(st.x, gy)) && cleanRun(gy, sy)) { px = cx; py = gy; L = Math.abs(sy - gy) + 3 * G.TILE; break; }
      let cy = sy;
      while (Math.abs(cy) > 0 && !land(cx, cy)) cy -= dir * 16;
      // El muelle no puede cruzar muros: entre la costa y el mar solo puede haber suelo o agua.
      let clear = true;
      for (let t = cy; dir * (sy - t) >= 0 && clear; t += dir * 16) if (G.World.waterAt(cx, t) === 2 && !G.World.seaAt(cx, t)) clear = false;
      if (clear && land(cx, cy) && Math.abs(sy - cy) < R * 1.4) { px = cx; py = cy; L = Math.abs(sy - cy) + 3 * G.TILE; break; }
    }
    const W = 2 * G.TILE;
    const y0 = dir > 0 ? py - 2 * G.TILE : py - L, y1 = dir > 0 ? py + L : py + 2 * G.TILE;
    dock = { x0: px - W / 2, x1: px + W / 2, y0, y1, dir, coastY: py,
             endX: px, endY: dir > 0 ? y1 - 24 : y0 + 24 };
    // El barco va en mar abierto junto al muelle (nunca encima de la tierra del mapa).
    const sea = (x, y) => G.World.seaAt(x, y);
    // El barco entero (con margen) tiene que caer en mar: ni casco, ni muelle, ni costa.
    const hull = [];
    for (let dx = -160; dx <= 160; dx += 40) for (let dy = -100; dy <= 100; dy += 50) hull.push([dx, dy]);
    const afloat = (x, y) => hull.every(([dx, dy]) => sea(x + dx, y + dy));
    const sy = dock.endY + (dir > 0 ? 40 : 20);
    // Agua más cercana al final del muelle, lejos del propio muelle (si no hay, se queda donde estaba).
    const cands = [];
    for (let a = -24; a <= 24; a++) for (let b = -24; b <= 24; b++) {
      const x = px + a * 40, y = sy + b * 40;
      if (Math.abs(x - px) > 200 && afloat(x, y)) cands.push([x, y]);
    }
    const ref = [px + 130, sy];
    const dist = ([x, y]) => Math.hypot(x - ref[0], y - ref[1]);
    const shipAt = cands.reduce((best, c) => (!best || dist(c) < dist(best) ? c : best), null);
    dock.shipX = shipAt ? shipAt[0] : px + 130; dock.shipY = shipAt ? shipAt[1] : sy;
    G.World.setPier(dock);
    G.World.reserve(px, py, 3);
    // Puertas que se cierran hasta derrotar al jefe (p. ej. la salida de Shells Town).
    G.World.gates().forEach((g, k) => { if (g.closed) G.World.setGateClosed(k, true); });

    const taken = [{ x: 0, y: 0 }, { x: px, y: py }];
    if (d.escape) snail = { x: 1e9, y: 1e9, none: true };      // sin Den Den Mushi (nunca está cerca)
    // Den Den Mushi: a media distancia, lejos del muelle y del centro.
    for (let k = 0; k < 400 && !snail; k++) {
      const a = rnd() * 6.283, r = R * (0.2 + rnd() * 0.15);
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (land(x, y) && far(x, y, taken, R * 0.18)) snail = { x, y };
    }
    if (!snail) snail = anySpot(R) || { x: 0, y: 0 };
    if (!snail.none) { taken.push(snail); G.World.reserve(snail.x, snail.y, 2); }

    // Cofres: repartidos en sectores alrededor del centro.
    // Mercader y cofre maldito: en tierra libre, lejos de lo demás.
    const spot = min => {
      for (let k = 0; k < 400; k++) {
        const a = rnd() * 6.283, r = R * (0.2 + rnd() * 0.45), x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (land(x, y) && far(x, y, taken, min)) { const p = { x, y }; taken.push(p); G.World.reserve(x, y, 2); return p; }
      }
      return null;
    };
    if (event === 'merchant') merchant = Object.assign(spot(R * 0.2) || { x: R * 0.15, y: R * 0.15 }, { bought: 0 });
    if (event === 'cursed') cursed = Object.assign(spot(R * 0.2) || { x: -R * 0.15, y: R * 0.15 }, { open: false });

    const nChests = d.chests || 5;
    // Si la zona alcanzable es pequeña (p. ej. un barco), se acercan los cofres hasta encontrar sitio.
    for (let c = 0; c < nChests; c++) {
      for (const minD of [R * 0.22, R * 0.1, R * 0.03]) {
        let done = false;
        for (let k = 0; k < 400 && !done; k++) {
          const a = (c + 0.15 + rnd() * 0.7) / nChests * 6.283, r = R * (0.25 + rnd() * 0.55);
          const x = Math.cos(a) * r, y = Math.sin(a) * r;
          if (!land(x, y) || !far(x, y, taken, minD)) continue;
          const ch = { x, y, open: false };
          chests.push(ch); taken.push(ch);
          G.World.reserve(x, y, 1);
          done = true;
        }
        if (done) break;
      }
    }
  }

  /** Un punto de tierra alcanzable cualquiera, buscando hacia fuera, o null. */
  function anySpot(R) {
    const land = (x, y) => G.World.waterAt(x, y) === 0 && G.World.reachable(x, y);
    for (let r = 0.05; r <= 0.9; r += 0.05) for (let a = 0; a < 6.283; a += 0.4) {
      const x = Math.cos(a) * R * r, y = Math.sin(a) * R * r;
      if (land(x, y)) return { x, y };
    }
    return null;
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

    // Cofre maldito: al tocarlo, objeto bueno y oleada de élites.
    if (cursed && !cursed.open && G.U.dist2(cursed.x, cursed.y, pl.x, pl.y) < OPEN_R * OPEN_R) {
      cursed.open = true;
      G.FX.burst(cursed.x, cursed.y - 20, '#c86bff', 40, 200);
      G.Items.giveRandom(pl, 'epic');
      G.Spawner.surge(pl, 14, true);
      G.Audio.sfx('boss');
    }
    // Cofre maldito: humo morado a su alrededor, para que se distinga.
    if (cursed && !cursed.open && Math.random() < 0.3) G.FX.puff(cursed.x + G.U.rand(-16, 16), cursed.y - G.U.rand(0, 30), '#8a3ac0', 1);
    // Tormenta: lluvia y, cada poco, una ráfaga de viento que empuja a todos.
    if (event === 'storm') {
      if ((gustT -= dt) <= 0) {
        gustT = G.U.rand(6, 9);
        const a = Math.atan2(wind[1], wind[0]) + G.U.rand(-0.6, 0.6); wind = [Math.cos(a), Math.sin(a)];
        pl.push(wind[0] * 260, wind[1] * 260, 0.7);
        for (const e of G.EnemyMgr.list) if (!e.boss) { e.kx += wind[0] * 380; e.ky += wind[1] * 380; }
        G.FX.text(pl.x, pl.y - 50, '¡Ráfaga!', '#bfe4ff', true);
        G.Camera.kick(0.2);
      }
    }

    // Qué se puede hacer donde estás.
    action = null;
    if (merchant && G.U.dist2(merchant.x, merchant.y, pl.x, pl.y) < USE_R * USE_R) {
      const price = merchantPrice();
      action = pl.coins >= price
        ? { label: 'Comprar objeto · ' + price + ' ฿', fn: () => { pl.coins -= price; merchant.bought++; G.Audio.sfx('coin'); G.Items.giveRandom(pl, merchant.bought > 1 ? 'rare' : null); } }
        : { label: 'Objeto · ' + price + ' ฿ (no te llega)', off: true };
    } else if (boss === 'idle' && !snail.none && G.U.dist2(snail.x, snail.y, pl.x, pl.y) < USE_R * USE_R) {
      action = { label: 'Llamar a ' + bossName(), fn: summon };
    } else if (G.U.dist2(dock.endX, dock.endY, pl.x, pl.y) < USE_R * USE_R * 1.4) {
      action = boss === 'dead' || def.escape ? { label: 'Zarpar', fn: () => G.Game.nextIsland() }
                               : { label: 'Derrota a ' + bossName() + ' para zarpar', off: true };
    }
    G.HUD.action(action);
    if (action && !action.off && (G.Input.tap('space') || G.Input.tap('enter') || G.Input.tap('keyf'))) act();
  }

  function act() { if (action && !action.off) action.fn(); }

  /** Precio del mercader: sube con cada compra y con lo lejos que vas. */
  const merchantPrice = () => Math.round((120 + idx * 15) * (1 + merchant.bought * 0.6));

  /** Noche, niebla y lluvia: por encima de todo (en el lienzo del mundo). */
  function drawEvent(ctx, pl, now) {
    if (!def || !event) return;
    const cam = G.Camera, L = cam.left(), T = cam.top(), W = cam.w, H = cam.h;
    if (event === 'night' || event === 'fog') {
      const night = event === 'night';
      const g = ctx.createRadialGradient(pl.x, pl.y - 20, night ? 70 : 140, pl.x, pl.y - 20, night ? 230 : 380);
      g.addColorStop(0, night ? 'rgba(8,10,30,0)' : 'rgba(220,226,234,0)');
      g.addColorStop(1, night ? 'rgba(8,10,30,0.88)' : 'rgba(220,226,234,0.85)');
      ctx.fillStyle = g; ctx.fillRect(L, T, W, H);
    }
    if (event === 'storm') {
      ctx.fillStyle = 'rgba(20,30,50,0.25)'; ctx.fillRect(L, T, W, H);
      while (rain.length < 160) rain.push({ x: L + Math.random() * W, y: T + Math.random() * H });
      ctx.fillStyle = 'rgba(210,228,255,0.75)';
      for (const d of rain) {
        d.y += 18; d.x += wind[0] * 8;
        if (d.y > T + H || d.x < L || d.x > L + W) { d.y = T - 10; d.x = L + Math.random() * W; }
        ctx.fillRect(Math.round(d.x / 2) * 2, Math.round(d.y / 2) * 2, 2, 16);
      }
    }
  }

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
    // Se abren las puertas cerradas: ahora se puede salir al barco.
    G.World.gates().forEach((g, k) => { if (g.closed) { G.World.setGateClosed(k, false); G.World.openGate(k); } });
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
    if (cursed) put(cursed.open ? 'chestOpen' : 'chest', cursed.x, cursed.y, { glow: cursed.open ? null : '#c86bff' });
    if (merchant && G.Camera.sees(merchant.x, merchant.y, 120)) list.push({ y: merchant.y, draw(ctx) {
      const s = G.Pix.sprite('merchant'), sc = (s.scale || 1) * P, w = s.w * sc, h = s.h * sc;
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(merchant.x, merchant.y, 14, 5, 0, 0, 6.283); ctx.fill();
      ctx.drawImage(s.frames[0], Math.round((merchant.x - w / 2) / P) * P, Math.round((merchant.y - h) / P) * P, w, h);
    } });
  }

  /** Puntos para el minimapa. */
  function pois() {
    if (!def) return null;
    return { chests, snail, boss, dock, escape: !!def.escape, merchant, cursed, fog: event === 'fog' };
  }

  return {
    setup, clear, update, act, collect, onBossKilled, busterT, goal, pois, drawEvent,
    get event() { return event && EVENTS[event]; },
    get def() { return def; }, get index() { return idx; }, get time() { return t; },
    get saga() { return saga; }, get sagaIndex() { return sagaIdx; },
    /** Segundos de dificultad: crece con cada isla del viaje y, dentro de la isla, con el tiempo. */
    get difficulty() { return idx * 25 + Math.min(t, 150); }
  };
})();
