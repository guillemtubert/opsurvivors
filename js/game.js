/* ============ game.js — flujo del juego y bucle principal ============
 *
 *   título ──> puerto (menú) ──> partida (las islas de una saga) ──> resumen ──> puerto
 *                  ├─ Tripulación (elegir / reclutar)
 *                  ├─ Mejoras
 *                  └─ Ajustes
 *
 * Cada isla (world/island.js) acaba al subir al Going Merry tras vencer a su
 * jefe; el nivel y las técnicas pasan a la siguiente.
 *
 * Estados del bucle: 'ui' (menús, con el mar de fondo), 'playing',
 * 'levelup', 'paused', 'over'.
 *
 * Render: todo el mundo se pinta en un lienzo pequeño a resolución de arte
 * (`low`) y se copia a pantalla escalado un número ENTERO de veces, sin
 * suavizado: todos los píxeles miden lo mismo. Los números de daño y el
 * joystick se pintan después, ya a resolución de pantalla.
 */
G.Game = (() => {
  let cv, ctx, low, lctx, dpr = 1, k = 3;
  let state = 'ui';
  let time = 0, last = 0, now = 0, pendingLevels = 0;
  let pl = null;
  let flashT = 0;
  let god = false;                     // modo dios (tecla I o botón DIOS): para probar
  const MENU_SEED = 20250;
  const stats = { dealt: 0 };

  // ---------------- arranque ----------------

  function init() {
    cv = document.getElementById('game');
    ctx = cv.getContext('2d');
    low = document.createElement('canvas');
    lctx = low.getContext('2d');
    resize();
    addEventListener('resize', resize);
    G.Input.initTouch(cv);
    document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
    G.World.reset(MENU_SEED);
    G.World.setBiome(0);
    G.Camera.x = 0; G.Camera.y = 0;
    last = performance.now();
    requestAnimationFrame(loop);
  }

  function resize() {
    // Hasta 3: en móvil da más escalones enteros entre los que elegir el zoom.
    dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = cv.clientWidth, h = cv.clientHeight;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    // Píxeles de pantalla por píxel de arte: entero, para que el pixel art quede limpio.
    // En pantallas pequeñas (móvil, en horizontal o vertical) manda el lado corto,
    // con una vista más cercana para que los personajes no queden diminutos.
    const cam = G.Camera;
    const fit = Math.min(w, h) < cam.MOBILE_BELOW
      ? Math.min(cv.width, cv.height) / (cam.MOBILE_VIEW / G.PX)
      : Math.min(cv.width / (cam.VIEW_W / G.PX), cv.height / (cam.MIN_VIEW_H / G.PX));
    k = Math.max(1, Math.round(fit));
    low.width = Math.ceil(cv.width / k);
    low.height = Math.ceil(cv.height / k);
    G.Camera.w = low.width * G.PX;
    G.Camera.h = low.height * G.PX;
    G.Camera.scale = k / (G.PX * dpr);        // px CSS por unidad de mundo
  }

  function autoPause() {
    G.Input.resetTouch();
    if (state === 'playing') pause();
  }

  // ---------------- partida ----------------

  function startRun() {
    const save = G.Save.data;
    const crew = G.Crew.LIST.find(c => c.id === save.captain) || G.Crew.LIST[0];
    G.UI.hideAll();
    time = 0; pendingLevels = 0; stats.dealt = 0;
    pl = new G.Player(crew, G.Upgrades.perks());
    pl.addMove(crew.start);
    G.HUD.show(true);
    G.HUD.moves(pl);
    G.HUD.items(pl);
    enterIsland(G.Islands.startIndex());
    state = 'playing';
  }

  /** Llega a la isla i del viaje: mapa nuevo, mismo tripulante. */
  function enterIsland(i) {
    const { def, saga, si } = G.Islands.JOURNEY[i];
    const newSaga = i === 0 || G.Islands.JOURNEY[i - 1].si !== si;
    const seed = Math.floor(Math.random() * 1e6);
    G.FX.clear(); G.Projectiles.clear(); G.Combat.clear(); G.EnemyMgr.clear();
    G.Pickups.clear(); G.Spawner.reset(); G.Hazards.clear();
    G.World.reset(seed, G.Islands.radius(def));
    G.World.setBiome(def.biome);
    // Con mapa dibujado, la isla se prepara cuando su máscara está lista (carga asíncrona).
    const finish = () => {
    G.Island.setup(def, i, seed, saga, si);
    G.Minimap.build();
    pl.x = 0; pl.y = 0;
    for (const k in pl.fx) pl.fx[k] = 0;      // los efectos de un jefe no pasan a la isla siguiente
    pl.shove = null; pl.slowT = 0;
    G.Camera.x = 0; G.Camera.y = 0; G.Camera.shake = 0;
    // Al empezar una saga, su nombre; si no, el de la isla.
    const ev = G.Island.event, extra = ev ? ' · Imprevisto: ' + ev.name : '';
    if (newSaga) G.HUD.banner(saga.name, def.name + ' · ' + def.sub + extra, '#ffd23f');
    else G.HUD.banner(def.name, def.sub + extra, '#ffd23f');
    G.Audio.music('sea');
    };
    if (def.map) G.World.setMap(def.map, 2.2 * G.Islands.radius(def), def.gates, finish, def.solids);
    else finish();
  }

  /** Sube al barco: siguiente isla o fin del viaje. */
  function nextIsland() {
    const i = G.Island.index + 1;
    pl.islands++;
    // Has escapado: el trofeo del jefe de la huida es tuyo.
    if (G.Island.def.escape) for (const id of G.Islands.bossIds(G.Island.def)) G.Items.giveTrophy(pl, id);
    if (i >= G.Islands.JOURNEY.length) { endRun(false, true); return; }
    G.Audio.sfx('confirm');
    flashT = 0.6;
    pl.heal(pl.maxHp * 0.25);
    enterIsland(i);
  }

  /** Modo dios: invulnerable y todo muere de un golpe. Para probar islas y jefes. */
  function toggleGod() {
    god = !god;
    G.HUD.god(god);
    G.HUD.banner(god ? 'Modo dios' : 'Modo dios desactivado', god ? 'Invulnerable · todo muere de un golpe' : '', '#ffd23f');
    G.Audio.sfx(god ? 'confirm' : 'select');
  }

  function gainXp(v) {
    if (!pl || pl.dead) return;
    pl.xp += v * pl.xpMul;
    while (pl.xp >= pl.xpNext) {
      pl.xp -= pl.xpNext;
      pl.level++;
      pl.xpNext = G.Player.xpFor(pl.level);
      pendingLevels++;
    }
  }

  function onKill(e) {
    pl.kills++;
    if (e.boss) {
      pl.bosses++;
      G.Island.onBossKilled(e);
      G.Items.giveTrophy(pl, e.def.id);
      G.Audio.sfx('chest');
      G.Audio.music('sea');
      G.Camera.kick(0.8);
    }
  }

  /** Cofre: berries y, el de la isla, un objeto al azar; el del jefe (big), una carta. */
  function openChest(big = true) {
    const bonus = big ? 150 + pl.bosses * 100 : 40 + G.Island.index * 20;
    pl.coins += bonus;
    G.Audio.sfx('chest');
    G.FX.text(pl.x, pl.y - 40, '+' + bonus + ' ฿', '#ffd23f', true);
    G.FX.burst(pl.x, pl.y - 16, '#ffd23f', 40, 220);
    if (big) showLevelUp('¡Cofre del tesoro!');
    else G.Items.giveRandom(pl);
  }

  function showLevelUp(title) {
    state = 'levelup';
    G.Audio.sfx('levelup');
    G.UI.levelUp(pl, title, card => {
      card.apply(pl);
      G.HUD.moves(pl);
      G.Audio.sfx('confirm');
      if (pendingLevels > 0 && !title) pendingLevels--;
      G.Input.endFrame();             // la tecla de la carta no cambia de técnica
      G.UI.hideAll();
      state = 'playing';
    });
  }

  function pause() {
    if (state !== 'playing') return;
    state = 'paused';
    G.UI.show('scr-pause');
    G.Audio.sfx('pause');
  }
  function resume() {
    if (state !== 'paused') return;
    G.UI.hideAll();
    state = 'playing';
  }

  function endRun(quit = false, won = false) {
    state = 'over';
    const save = G.Save.data;
    // Berries: los recogidos + un extra por enemigos y por tiempo aguantado.
    const earned = Math.round((pl.coins + pl.kills * 0.5 + time * 0.6) * pl.goldMul);
    save.berries += earned;
    save.stats.kills += pl.kills;
    save.stats.runs++;
    save.stats.bosses += pl.bosses;
    save.stats.time += time;
    const best = save.best[pl.crew.id] || 0;
    const record = time > best;
    if (record) save.best[pl.crew.id] = Math.floor(time);
    // Récord: la isla más lejana a la que has llegado.
    const reached = G.Island.index + (won ? 1 : 0);
    const recordIsland = reached > (save.bestIsland || 0);
    if (recordIsland) save.bestIsland = reached;
    G.Save.commit();
    G.HUD.show(false);
    G.Audio.music('over');
    if (won) G.Audio.sfx('chest');
    else if (!quit) G.Audio.sfx('death');
    G.UI.over({ time, level: pl.level, kills: pl.kills, bosses: pl.bosses, islands: pl.islands, earned, record, recordIsland, quit, won, crew: pl.crew });
  }

  function toMenu() {
    state = 'ui';
    pl = null;
    G.EnemyMgr.clear(); G.Projectiles.clear(); G.Pickups.clear(); G.FX.clear(); G.Combat.clear(); G.Hazards.clear();
    G.Island.clear();
    G.World.reset(MENU_SEED);
    G.World.setBiome(0);
    G.HUD.show(false);
    G.UI.menu();
    G.Audio.music('port');
  }

  // ---------------- bucle ----------------

  function loop(t) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    try {
      step(dt);
      render();
    } catch (e) {
      console.error(e);
    }
    G.Input.endFrame();
  }

  function step(dt) {
    if (state === 'ui') {
      // Fondo del menú: la cámara rodea la isla despacio.
      now += dt;
      const r = G.World.radius * 0.45;
      G.Camera.x = Math.cos(now * 0.02) * r; G.Camera.y = Math.sin(now * 0.02) * r * 0.7;
      return;
    }
    if (state === 'paused') {
      if (G.Input.tap('escape') || G.Input.tap('keyp')) resume();
      return;
    }
    if (state !== 'playing') return;

    now += dt;
    time += dt;

    // Teclas.
    for (let i = 0; i < 4; i++) if (G.Input.tap('digit' + (i + 1))) { pl.setActive(i); G.Audio.sfx('select'); }
    if (G.Input.tap('keyi')) toggleGod();
    if (G.Input.tap('keyq')) pl.cycle(-1);
    if (G.Input.tap('keye')) pl.cycle(1);
    if (G.Input.tap('escape') || G.Input.tap('keyp')) { pause(); return; }

    pl.update(dt, now);
    G.Combat.tick(dt, pl, now);
    G.Items.tick(dt, pl, now);
    G.Combat.update(dt, now);
    G.Spawner.update(dt, pl, G.Island.difficulty, G.Island.busterT());
    G.Island.update(dt, pl, now);
    G.Minimap.update(dt, pl, now);
    G.EnemyMgr.update(dt, pl, now);
    G.Projectiles.update(dt, pl, now);
    G.Pickups.update(dt, pl, now);
    G.FX.update(dt);
    G.Hazards.update(dt);
    G.Camera.follow(pl.x, pl.y, dt);

    if (flashT > 0) flashT -= dt;

    G.HUD.update(pl, time);

    if (pl.dead) { endRun(); return; }
    if (pendingLevels > 0) showLevelUp(null);
  }

  function render() {
    // Ventana sin tamaño (pestaña oculta al cargar): se recalcula al volver.
    if (cv.width !== Math.round(cv.clientWidth * dpr) || !low.width) resize();
    if (!low.width || !low.height) return;
    const cam = G.Camera;
    const L = cam.left(), T = cam.top();
    lctx.setTransform(1 / G.PX, 0, 0, 1 / G.PX, -L / G.PX, -T / G.PX);
    lctx.imageSmoothingEnabled = false;
    G.World.drawGround(lctx);

    if (state !== 'ui' && pl && !G.World.loading()) {
      G.FX.drawUnder(lctx, now);
      const list = [];
      G.World.collectProps(list, now);
      G.Island.collect(list, now);
      G.Pickups.collect(list, now);
      G.EnemyMgr.collect(list, now);
      list.push({ y: pl.y, draw: c => pl.draw(c, now) });
      list.sort((a, b) => a.y - b.y);
      for (const o of list) o.draw(lctx);
      G.Combat.draw(lctx, pl, now);
      G.Projectiles.draw(lctx);
      G.FX.drawOver(lctx);
      G.Island.drawEvent(lctx, pl, now);
    } else {
      const list = [];
      G.World.collectProps(list, now);
      list.sort((a, b) => a.y - b.y);
      for (const o of list) o.draw(lctx);
    }

    // A pantalla, escalado entero.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(low, 0, 0, low.width * k, low.height * k);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state !== 'ui' && pl) {
      G.FX.drawTexts(ctx, cam.scale * G.PX);
      drawBossArrow();
      drawLowHp();
      if (flashT > 0) { ctx.fillStyle = 'rgba(255,255,255,' + flashT + ')'; ctx.fillRect(0, 0, cv.clientWidth, cv.clientHeight); }
    }
    drawStick();
  }

  /** Flecha en el borde hacia el jefe si no se ve. */
  function drawBossArrow() {
    const b = G.EnemyMgr.boss();
    if (!b || G.Camera.sees(b.x, b.y, -20)) return;
    const w = cv.clientWidth, h = cv.clientHeight;
    const a = Math.atan2(b.y - G.Camera.y, b.x - G.Camera.x);
    const r = Math.min(w, h) / 2 - 36;
    const x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = '#1a1220';
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -13); ctx.lineTo(-10, 13); ctx.fill();
    ctx.fillStyle = Math.floor(now * 4) % 2 ? '#ff5f6d' : '#ffd23f';
    ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-6, -8); ctx.lineTo(-6, 8); ctx.fill();
    ctx.restore();
  }

  /** Borde rojo latiendo con poca vida. */
  function drawLowHp() {
    if (pl.dead || pl.hp / pl.maxHp > 0.25) return;
    const w = cv.clientWidth, h = cv.clientHeight;
    ctx.globalAlpha = 0.25 + Math.sin(now * 6) * 0.12;
    ctx.strokeStyle = '#ff2a3a'; ctx.lineWidth = 18;
    ctx.strokeRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  function drawStick() {
    const s = G.Input.stick();
    if (!s || state !== 'playing') return;
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#f4e2b0';
    ctx.beginPath(); ctx.arc(s.ox, s.oy, 52, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.arc(s.ox + s.vx * 40, s.oy + s.vy * 40, 20, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1;
  }

  /** Depuración: simula `secs` segundos de juego de golpe (consola: G.Game.debugStep(10)). */
  function debugStep(secs) {
    for (let i = 0; i < secs * 60; i++) { step(1 / 60); G.Input.endFrame(); }
    render();
  }

  return {
    debugStep, init, startRun, nextIsland, toggleGod, toMenu, endRun, pause, resume, gainXp, onKill, openChest, stats,
    get god() { return god; }, get state() { return state; }, get now() { return now; }, get time() { return time; }, get player() { return pl; }
  };
})();
