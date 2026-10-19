/* ============ spawner.js — oleadas y Buster Call ============
 * Los enemigos aparecen en un anillo justo fuera de la vista, siempre en
 * tierra firme de la isla. Cada ~40 s hay una "marea" desde un lado. Al llegar
 * al tope, los nuevos salen como élite (más vida, daño y experiencia).
 * Con el Buster Call (ver world/island.js) el ritmo, el tope, la vida y las
 * élites crecen sin parar: quedarse en la isla sale caro.
 * El jefe no sale solo: lo llama el jugador con el Den Den Mushi (summon).
 */
G.Spawner = (() => {
  const CAP = 90;
  let acc = 0, surgeT = 40;

  function reset() { acc = 0; surgeT = 40; }

  /** Enemigos por segundo según el segundo de la run. */
  function rate(t) { return 0.9 + t * 0.012 + Math.pow(t / 60, 1.5) * 0.35; }

  /** Vida y daño crecen con el tiempo. */
  const hpK = t => 1 + t / 100 + Math.pow(t / 300, 2);
  const dmgK = t => 1 + t / 400;

  function ringPoint(pl, angle) {
    const d = G.Camera.outerRadius() + G.U.rand(10, 60);
    return [pl.x + Math.cos(angle) * d, pl.y + Math.sin(angle) * d * 0.85];
  }

  /** Punto del anillo en tierra firme, cerca del ángulo pedido (o null si es todo mar). */
  function landPoint(pl, angle, r = 12) {
    for (let i = 0; i < 10; i++) {
      const [x, y] = ringPoint(pl, angle + (i ? G.U.rand(-0.8, 0.8) * (1 + i * 0.3) : 0));
      if (G.World.isLand(x, y, r)) return [x, y];
    }
    return null;
  }

  /** Punto de aparición en una puerta del mapa (si la isla la tiene): los enemigos salen de la base. */
  /** Una puerta abierta al azar (índice), o -1. */
  function randomGate() {
    const gs = G.World.gates(), open = gs.map((g, i) => i).filter(i => !gs[i].closed);
    return open.length ? open[Math.floor(Math.random() * open.length)] : -1;
  }
  function gatePoint(k = randomGate()) {
    const g = G.World.gates()[k];
    return g && !g.closed ? [g.x + G.U.rand(-6, 6), g.y + G.U.rand(-6, 6)] : null;
  }

  function pickDef(t) {
    const bag = G.Enemies.bagAt(t, G.Island.saga.enemies);
    let r = Math.random() * bag.reduce((a, e) => a + e.w, 0);
    for (const e of bag) { r -= e.w; if (r <= 0) return e; }
    return bag[0];
  }

  function spawnOne(pl, t, angle, bt) {
    const p = gatePoint() || landPoint(pl, angle);
    if (!p) return null;
    const elite = G.EnemyMgr.count >= CAP * 0.85 || (bt > 0 && Math.random() < Math.min(0.5, bt / 120));
    const hp = hpK(t) * (bt > 0 ? 1 + bt / 90 : 1);
    return G.EnemyMgr.add(new G.Enemy(pickDef(t), { x: p[0], y: p[1], hpK: hp, dmgK: dmgK(t), elite }));
  }

  /** Multiplicador de daño de ahora (para lo que invocan los jefes). */
  const dmgNow = () => dmgK(G.Island.difficulty);
  /** Vida de los jefes a lo largo del viaje: cada saga, bastante más. */
  const bossHpK = () => 1 + G.Island.sagaIndex * 0.9;

  /** El jefe de la isla, llamado con el Den Den Mushi: aparece cerca, en tierra. */
  function summon(def, pl, i = 0) {
    const a = Math.random() * 6.283 + i * 2.1;
    // El jefe sale por una puerta, con la animación de la puerta abriéndose y polvo.
    const k = randomGate();
    const gp = k >= 0 ? gatePoint(k) : null;
    if (gp) { G.World.openGate(k); G.FX.puff(gp[0], gp[1], '#c9b28a', 10); }
    const [x, y] = gp || landPoint(pl, a, 24) || [pl.x + 260, pl.y];
    return G.EnemyMgr.add(new G.Enemy(def, { x, y, boss: true, dmgK: dmgNow() * 0.8, hpK: def.invincible ? 1 : bossHpK() }));
  }

  /** t = segundos de la partida (dificultad) · bt = segundos de Buster Call, o -1. */
  function update(dt, pl, t, bt = -1) {
    const cap = bt > 0 ? CAP + Math.min(60, bt) : CAP;
    if (G.EnemyMgr.count >= cap) return;
    acc += rate(t) * (bt > 0 ? 1.6 + bt / 25 : 1) * dt;
    while (acc >= 1) {
      acc -= 1;
      spawnOne(pl, t, Math.random() * 6.283, bt);
    }

    // Marea: una avalancha desde un lado.
    surgeT -= dt;
    if (surgeT <= 0) {
      surgeT = G.U.rand(35, 50) * (bt > 0 ? 0.6 : 1);
      const a = Math.random() * 6.283;
      const n = Math.min(cap - G.EnemyMgr.count, 10 + Math.floor(t / 20));
      for (let i = 0; i < n; i++) spawnOne(pl, t, a + G.U.rand(-0.5, 0.5), bt);
      G.HUD.banner('¡Una marea de enemigos!', '', '#ffd23f');
    }
  }

  /** Oleada de n enemigos alrededor de ti (élites si elite). */
  function surge(pl, n, elite = false) {
    const t = G.Island.difficulty;
    for (let i = 0; i < n; i++) {
      const p = landPoint(pl, i / n * 6.283);
      if (p) G.EnemyMgr.add(new G.Enemy(pickDef(t), { x: p[0], y: p[1], hpK: hpK(t), dmgK: dmgK(t), elite }));
    }
    G.HUD.banner('¡Una oleada maldita!', '', '#c86bff');
  }

  return { reset, update, summon, landPoint, dmgNow, surge };
})();
