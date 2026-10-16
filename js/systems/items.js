/* ============ items.js — objetos (como en Megabonk) y trofeos de los jefes ============
 * Los cofres de las islas dan un objeto al azar según su rareza; los objetos se
 * acumulan (cada copia suma su efecto) y duran todo el viaje. Cada jefe, al caer
 * (o al escapar de él), deja su trofeo: un objeto único que además se guarda en
 * tu colección (G.Save.data.trophies).
 *
 * Un objeto:
 *   apply(pl)      lo que hace cada copia (mejoras de estadísticas)
 *   proc           efecto que se repite solo: { every, kind, ... } (ver PROCS)
 *   icon           icono de G.Icons; los trofeos usan el retrato del jefe
 *
 * Estadísticas extra del jugador que usan algunos: bossDmg (daño a jefes), revives
 * (vidas extra), thorns (daño al que te golpea), slowAura (frena a los de cerca).
 */
G.Items = (() => {
  const RARITY = {
    common:    { name: 'Común',      color: '#c8c8d0', w: 60 },
    rare:      { name: 'Raro',       color: '#4fb4ff', w: 28 },
    epic:      { name: 'Épico',      color: '#c86bff', w: 10 },
    legendary: { name: 'Legendario', color: '#ffd23f', w: 2 },
    trophy:    { name: 'Trofeo',     color: '#ff8a5a', w: 0 }
  };

  const ITEMS = [
    // Comunes
    { id: 'carne',     rarity: 'common', icon: 'meat',   name: 'Carne con hueso',     desc: '+15 de vida máxima.',            apply: pl => pl.addMaxHp(15) },
    { id: 'sake',      rarity: 'common', icon: 'fist',   name: 'Sake',                desc: '+5% de daño.',                   apply: pl => pl.atkMul *= 1.05 },
    { id: 'sandalias', rarity: 'common', icon: 'boot',   name: 'Sandalias',           desc: '+5% de velocidad.',              apply: pl => pl.spdMul *= 1.05 },
    { id: 'reloj',     rarity: 'common', icon: 'clock',  name: 'Reloj de arena',      desc: '-4% de recarga.',                apply: pl => pl.cdMul *= 0.96 },
    { id: 'tapa',      rarity: 'common', icon: 'shield', name: 'Tapa de barril',      desc: '+3% de reducción de daño.',      apply: pl => pl.dmgReduce = Math.min(0.6, pl.dmgReduce + 0.03) },
    { id: 'naranjas',  rarity: 'common', icon: 'sprout', name: 'Naranjas de Bellemere', desc: '+0,4 de vida por segundo.',    apply: pl => pl.regenFlat += 0.4 },
    { id: 'catalejo',  rarity: 'common', icon: 'magnet', name: 'Catalejo',            desc: '+15% de radio de recogida.',     apply: pl => pl.magnet *= 1.15 },
    { id: 'bolsa',     rarity: 'common', icon: 'coin',   name: 'Bolsa de berries',    desc: '+8% de berries.',                apply: pl => pl.goldMul *= 1.08 },
    // Raros
    { id: 'trebol',    rarity: 'rare', icon: 'star',   name: 'Trébol de la suerte',   desc: '+4% de probabilidad de crítico.', apply: pl => pl.crit += 0.04 },
    { id: 'logpose',   rarity: 'rare', icon: 'book',   name: 'Log Pose',              desc: '+10% de experiencia.',            apply: pl => pl.xpMul *= 1.10 },
    { id: 'dial',      rarity: 'rare', icon: 'shield', name: 'Dial de impacto',       desc: 'Cada 4 s, una onda aparta y daña a los que tienes cerca.',
      proc: { every: 4, kind: 'push', r: 90, dmg: 14 } },
    { id: 'cola',      rarity: 'rare', icon: 'boot',   name: 'Barril de cola',        desc: '+8% de velocidad y -4% de recarga.', apply: pl => { pl.spdMul *= 1.08; pl.cdMul *= 0.96; } },
    // Épicos
    { id: 'kairoseki', rarity: 'epic', icon: 'fist',   name: 'Kairoseki',             desc: '+15% de daño a los jefes.',       apply: pl => pl.bossDmg *= 1.15 },
    { id: 'haki',      rarity: 'epic', icon: 'shield', name: 'Haki de armadura',      desc: '+6% de reducción y +8% de daño.', apply: pl => { pl.dmgReduce = Math.min(0.6, pl.dmgReduce + 0.06); pl.atkMul *= 1.08; } },
    { id: 'dendengold', rarity: 'epic', icon: 'cards', name: 'Den Den Mushi dorado',  desc: '+1 cambio de cartas.',            apply: pl => pl.rerolls++ },
    { id: 'vivre',     rarity: 'epic', icon: 'heart',  name: 'Vivre Card',            desc: 'Si caes, vuelves con la mitad de la vida (una vez).', apply: pl => pl.revives++ },
    // Legendarios
    { id: 'fruta',     rarity: 'legendary', icon: 'skull', name: 'Fruta del diablo',  desc: '+25% de daño, pero -8% de velocidad.', apply: pl => { pl.atkMul *= 1.25; pl.spdMul *= 0.92; } },
    { id: 'sombrero',  rarity: 'legendary', icon: 'flag',  name: 'Sombrero de paja',  desc: '+10% de daño, +10% de velocidad y +25 de vida.', apply: pl => { pl.atkMul *= 1.10; pl.spdMul *= 1.10; pl.addMaxHp(25); } }
  ];

  // Trofeos: uno por jefe (id del jefe). Los efectos se acumulan como los de cualquier objeto.
  const T = (boss, name, desc, apply, proc) => ({ id: 'trophy:' + boss, boss, rarity: 'trophy', name, desc, apply, proc });
  const TROPHIES = [
    T('morgan',     'Hacha de Morgan',       '+12% de daño.', pl => pl.atkMul *= 1.12),
    T('buggy',      'Nariz de Buggy',        'Cada 3 s lanzas tres cuchillos.', null, { every: 3, kind: 'knives', n: 3, dmg: 10 }),
    T('kuro',       'Gafas de Kuro',         '+10% de velocidad y +5% de crítico.', pl => { pl.spdMul *= 1.10; pl.crit += 0.05; }),
    T('krieg',      'Armadura de Krieg',     '+8% de reducción y +20 de vida.', pl => { pl.dmgReduce = Math.min(0.6, pl.dmgReduce + 0.08); pl.addMaxHp(20); }),
    T('arlong',     'Kiribachi',             '+8% de crítico y +8% de daño.', pl => { pl.crit += 0.08; pl.atkMul *= 1.08; }),
    T('smoker',     'Puro de Smoker',        'Los enemigos cerca de ti van más lentos.', pl => pl.slowAura = Math.max(pl.slowAura, 90)),
    T('mr9',        'Bates de Mr. 9',        '+6% de velocidad y +6% de daño.', pl => { pl.spdMul *= 1.06; pl.atkMul *= 1.06; }),
    T('wednesday',  'Karoo',                 '+12% de velocidad.', pl => pl.spdMul *= 1.12),
    T('mr5',        'Moco-bomba',            'Cada 4 s, una explosión sobre un enemigo cercano.', null, { every: 4, kind: 'boom', r: 50, dmg: 22 }),
    T('valentine',  'Paraguas de Valentine', '+25 de vida.', pl => pl.addMaxHp(25)),
    T('mr3',        'Cera de Mr. 3',         '+10% de reducción de daño.', pl => pl.dmgReduce = Math.min(0.6, pl.dmgReduce + 0.10)),
    T('wapol',      'Corona de Wapol',       '+20% de berries.', pl => pl.goldMul *= 1.20),
    T('crocodile',  'Garfio de Crocodile',   'La arena daña cada segundo a los que tienes cerca.', null, { every: 1, kind: 'aura', r: 70, dmg: 6 }),
    T('bellamy',    'Muelles de Bellamy',    '+15% de velocidad.', pl => pl.spdMul *= 1.15),
    T('enel',       'Tambores de Enel',      'Cada 3 s cae un rayo sobre un enemigo cercano.', null, { every: 3, kind: 'bolt', r: 260, dmg: 26 }),
    T('foxy',       'Espejo Noro Noro',      '+1 cambio de cartas y -5% de recarga.', pl => { pl.rerolls++; pl.cdMul *= 0.95; }),
    T('franky',     'Cola de Franky',        '+0,8 de vida por segundo y +10% de velocidad.', pl => { pl.regenFlat += 0.8; pl.spdMul *= 1.10; }),
    T('lucci',      'Hattori',               '+10% de crítico.', pl => pl.crit += 0.10),
    T('garp',       'Puño del amor',         '+20% de daño.', pl => pl.atkMul *= 1.20),
    T('perona',     'Kumashi',               'Si caes, vuelves con la mitad de la vida (una vez).', pl => pl.revives++),
    T('oars',       'Gorro de Oars',         '+40 de vida.', pl => pl.addMaxHp(40)),
    T('moria',      'Tijeras de Moria',      '+15% de experiencia.', pl => pl.xpMul *= 1.15),
    T('kizaru',     'Gafas de Kizaru',       '+15% de velocidad y -8% de recarga.', pl => { pl.spdMul *= 1.15; pl.cdMul *= 0.92; }),
    T('hancock',    'Salomé',                '+6% de crítico y +8% de daño.', pl => { pl.crit += 0.06; pl.atkMul *= 1.08; }),
    T('magellan',   'Veneno de Magellan',    'El veneno daña cada segundo a los que tienes cerca.', null, { every: 1, kind: 'aura', r: 95, dmg: 9 }),
    T('akainu',     'Puño de magma',         'Cada 5 s, una gran explosión sobre un enemigo cercano.', null, { every: 5, kind: 'boom', r: 80, dmg: 45 }),
    T('rayleigh',   'Espada de Rayleigh',    '+10% de daño y -10% de recarga.', pl => { pl.atkMul *= 1.10; pl.cdMul *= 0.90; }),
    T('px1',        'Zarpa de Kuma',         'Cada 5 s, una onda enorme aparta y daña a los de alrededor.', null, { every: 5, kind: 'push', r: 150, dmg: 24 }),
    T('hody',       'Energy Steroid',        '+25% de daño, pero -15 de vida.', pl => { pl.atkMul *= 1.25; pl.maxHp = Math.max(30, pl.maxHp - 15); pl.hp = Math.min(pl.hp, pl.maxHp); }),
    T('caesar',     'Gas de Caesar',         'Una nube de gas daña cada segundo a los que tienes cerca.', null, { every: 1, kind: 'aura', r: 80, dmg: 8 }),
    T('doflamingo', 'Hilos de Doflamingo',   'Cada 3 s, un hilo corta en línea hacia tu objetivo.', null, { every: 3, kind: 'line', len: 300, dmg: 34 }),
    T('jack',       'Colmillos de Jack',     '+12% de reducción de daño.', pl => pl.dmgReduce = Math.min(0.6, pl.dmgReduce + 0.12)),
    T('katakuri',   'Mochi de Katakuri',     '+8% de crítico y +8% de velocidad.', pl => { pl.crit += 0.08; pl.spdMul *= 1.08; }),
    T('bigmom',     'Prometheus',            'Cada 4 s, una bola de fuego sobre un enemigo cercano.', null, { every: 4, kind: 'boom', r: 60, dmg: 34 }),
    T('queen',      'Plague Rounds',         'El contagio daña cada segundo a los que tienes cerca.', null, { every: 1, kind: 'aura', r: 110, dmg: 10 }),
    T('king',       'Alas de King',          '+15% de velocidad y +10% de daño.', pl => { pl.spdMul *= 1.15; pl.atkMul *= 1.10; }),
    T('kaido',      'Kanabō de Kaido',       '+30% de daño a los jefes.', pl => pl.bossDmg *= 1.30),
    T('saturn',     'Patas de araña',        '+10% de reducción y +10% de crítico.', pl => { pl.dmgReduce = Math.min(0.6, pl.dmgReduce + 0.10); pl.crit += 0.10; }),
    T('loki',       'Ragnir',                'Cada 2 s cae un rayo sobre un enemigo cercano.', null, { every: 2, kind: 'bolt', r: 300, dmg: 40 }),
    T('sommers',    'Espinas de Sommers',    'Quien te golpea recibe daño.', pl => pl.thorns += 30),
    T('killingham', 'Sueño de Killingham',   '+1 de vida por segundo.', pl => pl.regenFlat += 1),
    T('gunko',      'Arco de Gunko',         'Cada 2 s, dos flechas hacia tu objetivo.', null, { every: 2, kind: 'knives', n: 2, dmg: 22 }),
    T('shamrock',   'Cerbero',               'Cada 3 s, tres mordiscos sobre los enemigos cercanos.', null, { every: 3, kind: 'bolt', r: 200, dmg: 30, n: 3 }),
    T('imu',        'El Trono Vacío',        'Lo has visto todo. +50% de daño.', pl => pl.atkMul *= 1.5)
  ];

  const BY_ID = Object.fromEntries(ITEMS.concat(TROPHIES).map(i => [i.id, i]));

  // ---------------- efectos que se repiten (proc) ----------------

  const src = pl => ({ owner: pl, ox: pl.x, oy: pl.y, knock: 60 });
  const near = (pl, r) => G.EnemyMgr.query(pl.x, pl.y, r).filter(e => !e.dead && !e.hidden && G.U.dist(e.x, e.y, pl.x, pl.y) < r);
  const PROCS = {
    // Cuchillos (o flechas) hacia tu objetivo.
    knives(pl, p, n, now) {
      const t = pl.target; if (!t) return;
      const a0 = Math.atan2(t.y - pl.y, t.x - pl.x), k = p.n || 3;
      for (let i = 0; i < k; i++) {
        const a = a0 + (i - (k - 1) / 2) * 0.18;
        G.Projectiles.spawn({ x: pl.x, y: pl.y, vx: Math.cos(a) * 340, vy: Math.sin(a) * 340, dmg: p.dmg * n * pl.atk, r: 6, life: 1.2, color: '#e8e8f8', vis: 'knife', pierce: 1, owner: pl });
      }
    },
    // Rayo sobre uno (o varios) de los enemigos cercanos.
    bolt(pl, p, n, now) {
      const list = near(pl, p.r);
      for (let i = 0; i < (p.n || 1) && list.length; i++) {
        const e = list.splice(Math.floor(Math.random() * list.length), 1)[0];
        G.FX.bolt(e.x, e.y - 160, e.x, e.y, '#ffe14d', 0.15);
        e.damage(p.dmg * n * pl.atk, now, src(pl));
      }
    },
    // Explosión sobre un enemigo cercano.
    boom(pl, p, n, now) {
      const list = near(pl, 260); if (!list.length) return;
      const t = list[Math.floor(Math.random() * list.length)];
      G.FX.ring(t.x, t.y, 6, p.r, '#ffb040', 0.3, 4); G.FX.burst(t.x, t.y, '#ff8a2a', 10, 150);
      for (const e of G.EnemyMgr.query(t.x, t.y, p.r)) if (!e.dead && G.U.dist(e.x, e.y, t.x, t.y) < p.r) e.damage(p.dmg * n * pl.atk, now, src(pl));
    },
    // Daño a todos los que tienes cerca.
    aura(pl, p, n, now) {
      for (const e of near(pl, p.r)) e.damage(p.dmg * n * pl.atk, now, null, '#9ad04a');
    },
    // Onda que aparta y daña.
    push(pl, p, n, now) {
      G.FX.ring(pl.x, pl.y, 10, p.r, '#e8f4ff', 0.3, 5);
      for (const e of near(pl, p.r)) e.damage(p.dmg * n * pl.atk, now, { owner: pl, ox: pl.x, oy: pl.y, knock: 320 });
    },
    // Corte en línea hacia tu objetivo.
    line(pl, p, n, now) {
      const t = pl.target; if (!t) return;
      const a = Math.atan2(t.y - pl.y, t.x - pl.x), x1 = pl.x + Math.cos(a) * p.len, y1 = pl.y + Math.sin(a) * p.len;
      G.FX.beam(pl.x, pl.y, x1, y1, 3, '#f4f1ea', 0.15);
      for (const e of G.EnemyMgr.query((pl.x + x1) / 2, (pl.y + y1) / 2, p.len / 2 + 30))
        if (!e.dead && G.segDist(e.x, e.y, pl.x, pl.y, x1, y1) < e.r + 6) e.damage(p.dmg * n * pl.atk, now, src(pl));
    }
  };

  /** Cada frame: los efectos que se repiten de los objetos que llevas. */
  function tick(dt, pl, now) {
    if (pl.dead || !pl.canAttack) return;
    for (const id in pl.items) {
      const it = BY_ID[id];
      if (!it.proc) continue;
      pl.itemT[id] = (pl.itemT[id] || it.proc.every) - dt;
      if (pl.itemT[id] <= 0) { pl.itemT[id] = it.proc.every; PROCS[it.proc.kind](pl, it.proc, pl.items[id], now); }
    }
  }

  // ---------------- conseguir objetos ----------------

  /** Da un objeto al jugador (cada copia suma su efecto) y lo anuncia. */
  function give(pl, id) {
    const it = BY_ID[id];
    if (!it) return;
    pl.items[id] = (pl.items[id] || 0) + 1;
    if (it.apply) it.apply(pl);
    const r = RARITY[it.rarity];
    G.HUD.banner(it.name + (pl.items[id] > 1 ? ' ×' + pl.items[id] : ''), r.name + ' · ' + it.desc, r.color);
    G.FX.text(pl.x, pl.y - 50, it.name, r.color, true);
    G.HUD.items(pl);
  }

  /** Objeto al azar según la rareza (cofres de las islas). */
  function giveRandom(pl) {
    const pool = ITEMS.slice(), total = pool.reduce((a, i) => a + RARITY[i.rarity].w, 0);
    let x = Math.random() * total;
    for (const it of pool) { x -= RARITY[it.rarity].w; if (x <= 0) return give(pl, it.id); }
    give(pl, pool[0].id);
  }

  /** Trofeo de un jefe: al jugador y a la colección. */
  function giveTrophy(pl, bossId) {
    const id = 'trophy:' + bossId;
    if (!BY_ID[id]) return;
    give(pl, id);
    const save = G.Save.data;
    save.trophies = save.trophies || [];
    if (!save.trophies.includes(bossId)) { save.trophies.push(bossId); G.Save.commit(); }
  }

  /** Icono de un objeto para el DOM (trofeo: retrato del jefe). */
  function icon(id, size) {
    const it = BY_ID[id];
    if (it.boss) return G.Pix.portrait(G.Enemies.BOSS_BY_ID[it.boss].sprite, size);
    return G.Icons.html(it.icon, size);
  }

  return { RARITY, ITEMS, TROPHIES, BY_ID, tick, give, giveRandom, giveTrophy, icon };
})();
