/* ============ game.js — flujo del juego y bucle principal ============
 *
 *   título ──> puerto (menú) ──> partida ──> resumen ──> puerto
 *                  ├─ Tripulación (elegir / reclutar)
 *                  ├─ Mejoras
 *                  └─ Ajustes
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
  let biomeIdx = 0, flashT = 0;
  const BIOME_EVERY = 180;
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
    G.World.reset(20250);
    G.World.setBiome(0);
    G.Camera.x = 0; G.Camera.y = 0;
    last = performance.now();
    requestAnimationFrame(loop);
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth, h = cv.clientHeight;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    // Píxeles de pantalla por píxel de arte: entero, para que el pixel art quede limpio.
    const artW = G.Camera.VIEW_W / G.PX, artH = G.Camera.MIN_VIEW_H / G.PX;
    k = Math.max(1, Math.round(Math.min(cv.width / artW, cv.height / artH)));
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
    const crew = G.Crew.BY_ID[save.captain] || G.Crew.BY_ID.luffy;
    G.UI.hideAll();
    G.FX.clear(); G.Projectiles.clear(); G.Combat.clear(); G.EnemyMgr.clear();
    G.Pickups.clear(); G.Spawner.reset(); G.Hazards.clear();
    G.World.reset(Math.floor(Math.random() * 1e6));
    biomeIdx = 0;
    G.World.setBiome(0);
    time = 0; pendingLevels = 0; stats.dealt = 0;
    pl = new G.Player(crew, G.Upgrades.perks());
    pl.addMove(crew.start);
    G.Camera.x = pl.x; G.Camera.y = pl.y; G.Camera.shake = 0;
    G.HUD.show(true);
    G.HUD.moves(pl);
    G.HUD.banner(G.World.info.name, G.World.info.sub, '#ffd23f');
    G.Audio.music('sea');
    state = 'playing';
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
      G.HUD.banner('¡Has derrotado a ' + e.name + '!', 'Busca su cofre del tesoro', '#ffd23f');
      G.Audio.sfx('chest');
      G.Audio.music('sea');
      G.Camera.kick(0.8);
    }
  }

  function openChest() {
    const bonus = 150 + pl.bosses * 100;
    pl.coins += bonus;
    G.Audio.sfx('chest');
    G.FX.text(pl.x, pl.y - 40, '+' + bonus + ' ฿', '#ffd23f', true);
    G.FX.burst(pl.x, pl.y - 16, '#ffd23f', 40, 220);
    showLevelUp('¡Cofre del tesoro!');
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

  function endRun(quit = false) {
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
    G.Save.commit();
    G.HUD.show(false);
    G.Audio.music('over');
    if (!quit) G.Audio.sfx('death');
    G.UI.over({ time, level: pl.level, kills: pl.kills, bosses: pl.bosses, earned, record, quit, crew: pl.crew });
  }

  function toMenu() {
    state = 'ui';
    pl = null;
    G.EnemyMgr.clear(); G.Projectiles.clear(); G.Pickups.clear(); G.FX.clear(); G.Combat.clear(); G.Hazards.clear();
    G.World.reset(20250);
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
      // Fondo del menú: el mar pasa despacio.
      now += dt;
      G.Camera.x += dt * 28; G.Camera.y = Math.sin(now * 0.1) * 60;
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
    if (G.Input.tap('keyq')) pl.cycle(-1);
    if (G.Input.tap('keye')) pl.cycle(1);
    if (G.Input.tap('escape') || G.Input.tap('keyp')) { pause(); return; }

    pl.update(dt, now);
    G.Combat.tick(dt, pl, now);
    G.Combat.update(dt, now);
    G.Spawner.update(dt, pl, time);
    G.EnemyMgr.update(dt, pl, now);
    G.Projectiles.update(dt, pl, now);
    G.Pickups.update(dt, pl, now);
    G.FX.update(dt);
    G.Hazards.update();
    G.Camera.follow(pl.x, pl.y, dt);

    // Cambio de isla cada 3 minutos.
    const bi = Math.floor(time / BIOME_EVERY);
    if (bi !== biomeIdx) {
      biomeIdx = bi;
      G.World.setBiome(bi);
      flashT = 0.6;
      G.HUD.banner(G.World.info.name, G.World.info.sub, '#ffd23f');
      G.Audio.sfx('confirm');
    }
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

    if (state !== 'ui' && pl) {
      G.FX.drawUnder(lctx, now);
      const list = [];
      G.World.collectProps(list, now);
      G.Pickups.collect(list, now);
      G.EnemyMgr.collect(list, now);
      list.push({ y: pl.y, draw: c => pl.draw(c, now) });
      list.sort((a, b) => a.y - b.y);
      for (const o of list) o.draw(lctx);
      G.Combat.draw(lctx, pl, now);
      G.Projectiles.draw(lctx);
      G.FX.drawOver(lctx);
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
    debugStep, init, startRun, toMenu, endRun, pause, resume, gainXp, onKill, openChest, stats,
    get state() { return state; }, get now() { return now; }, get time() { return time; }, get player() { return pl; }
  };
})();
