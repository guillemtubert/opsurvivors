/* ============ pickup.js — experiencia, berries, carne, cofres ============
 *   xp      gema de experiencia (azul, verde o roja según cuánto vale)
 *   coin    berries (moneda que se guarda al acabar)
 *   meat    carne con hueso: cura el 30%
 *   snail   Den Den Mushi: atrae toda la experiencia del mapa
 *   chest   cofre del tesoro (jefes): berries y una carta extra
 * Las gemas cercanas entre sí se fusionan para no llenar la pantalla.
 */
G.Pickups = (() => {
  let list = [];

  const ART = {
    xp1: { rows: ['..k..', '.kbk.', 'kbBbk', '.kbk.', '..k..'], pal: { b: '#4fb4ff', B: '#d8f2ff' } },
    xp2: { rows: ['..k..', '.kgk.', 'kgGgk', '.kgk.', '..k..'], pal: { g: '#5fe08a', G: '#e0ffe8' } },
    xp3: { rows: ['...k...', '..krk..', '.krRrk.', 'krRRrrk', '.krrrk.', '..krk..', '...k...'], pal: { r: '#ff5f6d', R: '#ffd0d6' } },
    coin: { rows: ['.kkkk.', 'kyyyok', 'kyBBok', 'kyBBok', 'kyyyok', '.kkkk.'], pal: { y: '#ffd23f', o: '#c08a10', B: '#fff4b0' } },
    snail: { rows: ['....kkk.', '...kpppk', 'k.kpPPpk', 'kgkpPpPk', 'kggkpppk', '.kggggk.', '..kkkk..'], pal: { p: '#e0d0a0', P: '#a08050', g: '#5fe08a' } },
    chest: { rows: ['.kkkkkkkk.', 'kbbbbbbbbk', 'kbyyyyyybk', 'kkkkyykkkk', 'kbbbkkbbbk', 'kbbbbbbbbk', 'kyyyyyyyyk', 'kkkkkkkkkk'],
             pal: { b: '#9a6434', y: '#ffd23f' } }
  };
  const imgs = {};
  function img(name) {
    if (!imgs[name]) imgs[name] = name === 'meat' ? G.FX.mini('meat') : G.Pix.paint(ART[name].rows, ART[name].pal);
    return imgs[name];
  }

  function clear() { list = []; }

  function add(kind, x, y, value = 1) {
    // Fusión de gemas: si hay una cerca, se suma a ella.
    if (kind === 'xp' && list.length > 180) {
      for (const p of list) {
        if (p.kind === 'xp' && !p.pull && G.U.dist2(p.x, p.y, x, y) < 60 * 60) { p.value += value; return p; }
      }
    }
    const a = Math.random() * 6.283, v = G.U.rand(30, 80);
    const p = { kind, x, y, value, vx: Math.cos(a) * v, vy: Math.sin(a) * v, pull: false, t: 0, z: 10 };
    list.push(p);
    return p;
  }

  function dropEnemy(e) {
    add('xp', e.x, e.y, e.xp);
    const r = Math.random();
    if (e.boss) {
      add('chest', e.x, e.y, 1);
      for (let i = 0; i < 12; i++) add('coin', e.x, e.y, 10);
      return;
    }
    if (r < (e.elite ? 0.6 : 0.07)) add('coin', e.x, e.y, e.elite ? 15 : G.U.randInt(3, 6));
    else if (r < 0.08) add('meat', e.x, e.y);
  }

  function dropBreakable(x, y) {
    const r = Math.random();
    if (r < 0.45) for (let i = 0; i < 4; i++) add('coin', x, y, G.U.randInt(2, 5));
    else if (r < 0.72) add('meat', x, y);
    else if (r < 0.92) add('xp', x, y, 12);
    else add('snail', x, y);
  }

  function update(dt, pl, now) {
    for (const p of list) {
      p.t += dt;
      // Salto al aparecer.
      if (p.z > 0) { p.z = Math.max(0, p.z - dt * 40); p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9; }
      if (pl.dead) continue;
      const d2 = G.U.dist2(p.x, p.y, pl.x, pl.y);
      const reach = p.kind === 'chest' ? 30 : pl.magnet;
      if (!p.pull && d2 < reach * reach) p.pull = true;
      if (p.pull) {
        const [nx, ny] = G.U.norm(pl.x - p.x, pl.y - p.y);
        const sp = 220 + p.t * 140;
        p.x += nx * sp * dt; p.y += ny * sp * dt;
      }
      if (d2 < (pl.r + 6) ** 2) collect(p, pl);
    }
    list = list.filter(p => !p.gone);
  }

  function collect(p, pl) {
    p.gone = true;
    switch (p.kind) {
      case 'xp': G.Game.gainXp(p.value); G.Audio.sfx('xp'); break;
      case 'coin': {
        const v = Math.ceil(p.value * pl.goldMul);
        pl.coins += v; G.Audio.sfx('coin');
        G.FX.text(pl.x, pl.y - 30, '+' + v + ' ฿', '#ffd23f');
        break;
      }
      case 'meat': pl.heal(pl.maxHp * 0.3); G.Audio.sfx('heal'); G.FX.text(pl.x, pl.y - 30, '¡Carne!', '#7fe08a', true); break;
      case 'snail':
        for (const o of list) if (o.kind === 'xp') o.pull = true;
        G.Audio.sfx('confirm'); G.FX.text(pl.x, pl.y - 30, 'Den Den Mushi', '#e0d0a0', true);
        break;
      case 'chest': G.Game.openChest(); break;
    }
  }

  function collect2(out, now) {
    for (const p of list) {
      if (!G.Camera.sees(p.x, p.y, 20)) continue;
      out.push({ y: p.y - 1000, draw: ctx => drawOne(ctx, p, now) });
    }
  }

  function drawOne(ctx, p, now) {
    let name = p.kind;
    if (p.kind === 'xp') name = p.value >= 40 ? 'xp3' : p.value >= 8 ? 'xp2' : 'xp1';
    const im = img(name);
    const bob = p.z > 0 ? p.z : Math.round(Math.sin(now * 4 + p.x) * 1.5) * 2;
    const k = p.kind === 'chest' ? G.PX * 2 : G.PX;
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(Math.round(p.x - im.width * k / 2 / 1.4), Math.round(p.y) - 1, im.width * k / 1.4, 2);
    ctx.drawImage(im, Math.round((p.x - im.width * k / 2) / 2) * 2, Math.round((p.y - im.height * k - 2 - bob) / 2) * 2, im.width * k, im.height * k);
  }

  return { clear, add, dropEnemy, dropBreakable, update, collect: collect2, get count() { return list.length; } };
})();
