/* ============ spawner.js — oleadas y jefes ============
 * Los enemigos aparecen en un anillo justo fuera de la vista. Cada ~40 s hay
 * una "marea" desde un lado. Al llegar al tope, los nuevos salen como élite
 * (más vida, daño y experiencia) para que la dificultad no baje.
 */
G.Spawner = (() => {
  const CAP = 110;
  let acc = 0, bossIdx = 0, surgeT = 40, warned = -1;

  function reset() { acc = 0; bossIdx = 0; surgeT = 40; warned = -1; }

  /** Enemigos por segundo según el segundo de la run. */
  function rate(t) { return 0.9 + t * 0.012 + Math.pow(t / 60, 1.5) * 0.35; }

  /** Vida y daño crecen con el tiempo. */
  const hpK = t => 1 + t / 100 + Math.pow(t / 300, 2);
  const dmgK = t => 1 + t / 400;

  function ringPoint(pl, angle) {
    const d = G.Camera.outerRadius() + G.U.rand(10, 60);
    return [pl.x + Math.cos(angle) * d, pl.y + Math.sin(angle) * d * 0.85];
  }

  function pickDef(t) {
    const bag = G.Enemies.bagAt(t);
    let r = Math.random() * bag.reduce((a, e) => a + e.w, 0);
    for (const e of bag) { r -= e.w; if (r <= 0) return e; }
    return bag[0];
  }

  function spawnOne(pl, t, angle) {
    const def = pickDef(t);
    for (let i = 0; i < 6; i++) {
      const [x, y] = ringPoint(pl, angle + (i ? G.U.rand(-0.8, 0.8) : 0));
      if (!G.World.isFree(x, y, 12)) continue;
      const elite = G.EnemyMgr.count >= CAP * 0.85;
      return G.EnemyMgr.add(new G.Enemy(def, { x, y, hpK: hpK(t), dmgK: dmgK(t), elite }));
    }
    return null;
  }

  function update(dt, pl, t) {
    // Jefes.
    const next = G.Enemies.bossAt(bossIdx);
    if (t >= next.at - 5 && warned !== bossIdx) {
      warned = bossIdx;
      G.HUD.banner('¡Se acerca ' + next.name + '!', next.title, '#ff5f6d');
      G.Audio.sfx('boss');
    }
    if (t >= next.at) {
      bossIdx++;
      const a = Math.random() * 6.283;
      const [x, y] = ringPoint(pl, a);
      G.EnemyMgr.add(new G.Enemy(next, { x, y, boss: true, dmgK: dmgK(t) * 0.8 }));
      G.Audio.music('boss');
    }

    if (G.EnemyMgr.count >= CAP) return;
    acc += rate(t) * dt;
    while (acc >= 1) {
      acc -= 1;
      spawnOne(pl, t, Math.random() * 6.283);
    }

    // Marea: una avalancha desde un lado.
    surgeT -= dt;
    if (surgeT <= 0) {
      surgeT = G.U.rand(35, 50);
      const a = Math.random() * 6.283;
      const n = Math.min(CAP - G.EnemyMgr.count, 10 + Math.floor(t / 20));
      for (let i = 0; i < n; i++) spawnOne(pl, t, a + G.U.rand(-0.5, 0.5));
      G.HUD.banner('¡Una marea de enemigos!', '', '#ffd23f');
    }
  }

  return { reset, update };
})();
