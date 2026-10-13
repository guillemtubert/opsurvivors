/* ============ levelup.js — las tres cartas de subida de nivel ============
 *   new   aprender una técnica nueva (si quedan huecos de los 4)
 *   up    mejorar una técnica que ya tienes
 *   stat  mejora de la partida
 */
G.LevelUp = (() => {
  const STATS = [
    { id: 'hp',   icon: 'heart',  title: 'Vigor',       desc: '+20 de vida máxima (y la recupera).', apply: pl => pl.addMaxHp(20) },
    { id: 'atk',  icon: 'fist',   title: 'Fuerza',      desc: '+10% de daño con todo.',              apply: pl => pl.atkMul *= 1.10, max: 12 },
    { id: 'spd',  icon: 'boot',   title: 'Carrera',     desc: '+7% de velocidad.',                   apply: pl => pl.spdMul *= 1.07, max: 6 },
    { id: 'cd',   icon: 'clock',  title: 'Reflejos',    desc: '-8% de recarga.',                     apply: pl => pl.cdMul *= 0.92, max: 8 },
    { id: 'def',  icon: 'shield', title: 'Aguante',     desc: '+6% de reducción de daño.',           apply: pl => pl.dmgReduce = Math.min(0.6, pl.dmgReduce + 0.06), max: 8 },
    { id: 'rgn',  icon: 'sprout', title: 'Siesta',      desc: '+0,8 de vida por segundo.',           apply: pl => pl.regenFlat += 0.8, max: 8 },
    { id: 'mag',  icon: 'magnet', title: 'Ojo avizor',  desc: '+30% de radio de recogida.',          apply: pl => pl.magnet *= 1.30, max: 5 },
    { id: 'crit', icon: 'star',   title: 'Golpe crítico', desc: '+6% de probabilidad de crítico.',   apply: pl => pl.crit += 0.06, max: 6 },
    { id: 'heal', icon: 'meat',   title: '¡Carne!',     desc: 'Recupera el 45% de tu vida.',         apply: pl => pl.heal(pl.maxHp * 0.45) }
  ];

  function candidates(pl) {
    const out = [];
    if (pl.moves.length < pl.maxMoves) {
      const buffs = pl.moves.filter(m => m.kind === 'buff').length;
      const pool = G.Moves.poolFor(pl.crew.id).filter(id =>
        !pl.hasMove(id) && !(buffs >= 2 && G.Moves.BY_ID[id].kind === 'buff'));
      for (const id of G.U.pickN(pool, 5)) {
        const d = G.Moves.BY_ID[id];
        out.push({ w: d.owner === 'all' ? 5 : 10, type: 'new', key: 'new:' + id, icon: 'move:' + id,
                   color: G.U.ELEM_COLOR[d.elem], tag: 'Nueva · ' + G.U.ELEM_NAME[d.elem],
                   title: d.name, desc: d.desc, apply: p => p.addMove(id) });
      }
    }
    for (const m of pl.moves) {
      const txt = G.Moves.nextUpText(m);
      if (!txt) continue;
      out.push({ w: 9, type: 'up', key: 'up:' + m.id, icon: 'move:' + m.id, color: G.U.ELEM_COLOR[m.elem],
                 tag: 'Nv.' + m.lvl + ' → ' + (m.lvl + 1), title: m.name, desc: txt, apply: () => G.Moves.levelUp(m) });
    }
    const room = s => !s.max || (pl.statsTaken[s.id] || 0) < s.max;
    for (const s of G.U.pickN(STATS.filter(room), 5)) {
      out.push({ w: pl.moves.length < pl.maxMoves ? 4 : 7, type: 'stat', key: 'stat:' + s.id, icon: s.icon,
                 color: '#c9a46a', tag: 'Mejora', title: s.title, desc: s.desc,
                 apply: p => { s.apply(p); p.statsTaken[s.id] = (p.statsTaken[s.id] || 0) + 1; } });
    }
    return out;
  }

  /** 3 cartas distintas elegidas por peso. */
  function offer(pl, n = 3) {
    const pool = candidates(pl);
    const picked = [];
    while (picked.length < n && pool.length) {
      const total = pool.reduce((a, c) => a + c.w, 0);
      let r = Math.random() * total, idx = 0;
      for (let i = 0; i < pool.length; i++) { r -= pool[i].w; if (r <= 0) { idx = i; break; } }
      picked.push(pool.splice(idx, 1)[0]);
    }
    return picked;
  }

  return { offer, STATS };
})();
