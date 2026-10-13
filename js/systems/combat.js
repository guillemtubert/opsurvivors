/* ============ combat.js — ejecución de técnicas ============
 * Sólo se ejecuta la técnica ACTIVA del jugador. Cada `kind` tiene aquí su
 * implementación (ver data/moves.js). Todos los ataques dañan también los
 * barriles y cajas del escenario.
 * Las trampas de Pop Green viven en `fields` y se actualizan aquí.
 */
G.Combat = (() => {
  let fields = [];
  let orbitA = 0;

  function clear() { fields = []; orbitA = 0; }

  const TARGETED = ['melee', 'beam', 'projectile', 'cone', 'chain', 'meteor'];
  function reach(m) {
    switch (m.kind) {
      case 'melee': return m.radius + 30;
      case 'beam': return m.radius + 20;
      case 'cone': return m.speed * m.life + 30;
      case 'chain': return 260;
      case 'meteor': return 320;
      default: return 480;
    }
  }

  function tick(dt, pl, now) {
    if (pl.dead) return;
    const m = pl.activeMove;
    if (!m) return;
    if (m.kind === 'orbit') { orbit(pl, m, dt, now); return; }
    m.t -= dt;
    if (m.t > 0) return;
    if (TARGETED.includes(m.kind) && !(pl.target && G.U.dist(pl.x, pl.y, pl.target.x, pl.target.y) <= reach(m))) {
      m.t = 0.05;
      return;
    }
    m.t = Math.max(0.08, m.cd * pl.cdMul);
    pl.onCast(m, now);
    if (m.sfx) G.Audio.sfx(m.sfx);
    switch (m.kind) {
      case 'projectile': projectile(pl, m); break;
      case 'melee': melee(pl, m, now); break;
      case 'beam': beam(pl, m, now); break;
      case 'nova': nova(pl, m); break;
      case 'aura': aura(pl, m, now); break;
      case 'cone': cone(pl, m); break;
      case 'chain': chain(pl, m, now); break;
      case 'meteor': meteor(pl, m, now); break;
      case 'mine': mine(pl, m); break;
      case 'buff': buff(pl, m); break;
    }
  }

  const col = m => G.U.ELEM_COLOR[m.elem] || '#ffffff';

  /** "Fuente" del golpe: para empuje y quemadura. */
  function src(pl, m) { return { owner: pl, knock: m.knock || 0, burn: m.burn || 0, ox: pl.x, oy: pl.y }; }

  function shot(pl, m, a, speed, life) {
    G.Projectiles.spawn({
      x: pl.x + Math.cos(a) * 6, y: pl.y + Math.sin(a) * 6,
      vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      dmg: m.dmg * pl.atk, r: m.size || 6, life,
      pierce: m.pierce | 0, splash: m.splash || 0, burn: m.burn || 0, knock: m.knock || 0,
      color: col(m), vis: m.vis, owner: pl, homing: m.homing || 0
    });
  }

  function projectile(pl, m) {
    const n = Math.max(1, m.count | 0);
    const spread = m.spread || 0.25;
    for (let i = 0; i < n; i++) {
      const off = n === 1 ? 0 : (i / (n - 1) - 0.5) * spread * Math.min(1, n * 0.35);
      shot(pl, m, pl.aim + off, m.speed, m.life);
    }
  }

  function nova(pl, m) {
    const n = Math.max(3, m.count | 0);
    for (let i = 0; i < n; i++) shot(pl, m, i / n * 6.283 + orbitA, m.speed, m.life);
    orbitA += 0.3;
    G.FX.ring(pl.x, pl.y, 8, 50, col(m), 0.3, 4);
  }

  function cone(pl, m) {
    const n = Math.max(1, m.count | 0);
    for (let i = 0; i < n; i++) {
      const a = pl.aim + G.U.rand(-m.spread / 2, m.spread / 2);
      const p = G.Projectiles.spawn({
        x: pl.x, y: pl.y, vx: Math.cos(a) * m.speed * G.U.rand(0.85, 1.1), vy: Math.sin(a) * m.speed * G.U.rand(0.85, 1.1),
        dmg: m.dmg * pl.atk, r: m.size, life: m.life * G.U.rand(0.8, 1), pierce: m.pierce | 0, knock: m.knock || 0,
        color: col(m), vis: m.vis, owner: pl
      });
      p.delay = i * 0.03;               // escalonados: parece una ráfaga
    }
  }

  /** Daña a todos en un círculo (con filtro opcional). */
  function area(pl, x, y, r, dmg, s, now, filter) {
    let hit = 0;
    for (const e of G.EnemyMgr.query(x, y, r + 30)) {
      if (e.dead || G.U.dist2(x, y, e.x, e.y) > (r + e.r) ** 2) continue;
      if (filter && !filter(e)) continue;
      e.damage(dmg, now, s);
      hit++;
    }
    G.World.hitBreakables(x, y, r, dmg, now);
    return hit;
  }

  function melee(pl, m, now) {
    const half = m.arc / 2;
    const dmg = m.dmg * pl.atk;
    area(pl, pl.x, pl.y, m.radius, dmg, src(pl, m), now, e => {
      if (m.arc >= 6.2) return true;
      let da = Math.atan2(e.y - pl.y, e.x - pl.x) - pl.aim;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      return Math.abs(da) <= half + 0.25;
    });
    const style = m.vis === 'slash3' ? 'slash3' : 'slash';
    G.FX.slash(pl.x, pl.y, pl.aim, Math.max(1.2, m.arc), m.radius, m.vis === 'palm' || m.vis === 'hoof' ? '#f8c99c' : col(m), 0.2, style);
    if (m.vis === 'palm' || m.vis === 'hoof') {
      G.FX.beam(pl.x, pl.y, pl.x + Math.cos(pl.aim) * m.radius * 0.8, pl.y + Math.sin(pl.aim) * m.radius * 0.8, 10, '#ff5f5f', 0.2, 'fist');
    }
    G.Camera.kick(0.06);
  }

  function beam(pl, m, now) {
    const n = Math.max(1, m.count | 0);
    for (let k = 0; k < n; k++) {
      const a = pl.aim + (n > 1 ? (k / (n - 1) - 0.5) * 0.5 : 0);
      const ex = pl.x + Math.cos(a) * m.radius, ey = pl.y + Math.sin(a) * m.radius;
      const s = src(pl, m);
      s.vx = Math.cos(a); s.vy = Math.sin(a);
      for (const e of G.EnemyMgr.query((pl.x + ex) / 2, (pl.y + ey) / 2, m.radius / 2 + 30)) {
        if (e.dead) continue;
        if (G.segDist(e.x, e.y, pl.x, pl.y, ex, ey) <= m.width / 2 + e.r) e.damage(m.dmg * pl.atk, now, s);
      }
      for (let t = 0; t <= 1; t += 0.2) G.World.hitBreakables(G.U.lerp(pl.x, ex, t), G.U.lerp(pl.y, ey, t), m.width / 2, m.dmg * pl.atk, now);
      if (m.vis === 'fist') G.FX.beam(pl.x, pl.y, ex, ey, m.width, '#ff5f5f', 0.22, 'fist');
      else G.FX.beam(pl.x, pl.y, ex, ey, m.width, col(m), 0.2);
    }
    G.Camera.kick(0.05);
  }

  function aura(pl, m, now) {
    area(pl, pl.x, pl.y, m.radius, m.dmg * pl.atk, src(pl, m), now);
    const c = col(m);
    G.FX.ring(pl.x, pl.y, m.radius * 0.6, m.radius, c, 0.35, 3);
    if (m.vis === 'flames' || m.vis === 'tornado') {
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * 6.283, r = Math.random() * m.radius;
        G.FX.spark(pl.x + Math.cos(a) * r, pl.y + Math.sin(a) * r * 0.7, m.vis === 'flames' ? '#ff8a2a' : '#d8f0ff', -Math.sin(a), Math.cos(a), 1);
      }
    }
  }

  function chain(pl, m, now) {
    const hit = new Set();
    let from = { x: pl.x, y: pl.y }, cur = pl.target;
    const dmg = m.dmg * pl.atk;
    for (let i = 0; i < (m.count | 0) && cur; i++) {
      hit.add(cur);
      if (m.vis === 'bolt') G.FX.bolt(from.x, from.y, cur.x, cur.y, '#ffe14d');
      else G.FX.beam(from.x, from.y, cur.x, cur.y, 3, col(m), 0.15);
      if (m.vis === 'petals') G.FX.burst(cur.x, cur.y - 10, '#ff8ad8', 5, 80);
      cur.damage(dmg, now, src(pl, m));
      from = cur;
      cur = G.EnemyMgr.nearest(cur.x, cur.y, 150, hit);
    }
  }

  function meteor(pl, m, now) {
    const near = G.EnemyMgr.query(pl.x, pl.y, 320).filter(e => !e.dead && G.Camera.sees(e.x, e.y, 0));
    const picks = G.U.pickN(near, m.count | 0);
    if (pl.target && !picks.includes(pl.target)) picks[0] = pl.target;
    picks.forEach((e, i) => {
      const x = e.x + G.U.rand(-6, 6), y = e.y + G.U.rand(-6, 6);
      const delay = m.vis === 'hands' ? 0.25 : 0.5 + i * 0.08;
      const mk = G.FX.mark(x, y, m.radius, col(m), delay);
      mk.onEnd = () => {
        area(pl, x, y, m.radius, m.dmg * pl.atk, src(pl, m), G.Game.now);
        switch (m.vis) {
          case 'lightning': G.FX.bolt(x + G.U.rand(-20, 20), y - 260, x, y, '#ffe14d', 0.2); G.Audio.sfx('thunder'); break;
          case 'hands': G.FX.burst(x, y, '#ff8ad8', 10, 90); G.FX.ring(x, y, 6, m.radius, '#f0b8a0', 0.25, 4); break;
          case 'stomp': G.FX.ring(x, y, 8, m.radius * 1.3, '#ff8a2a', 0.35, 6); G.FX.burst(x, y, '#ff8a2a', 14, 180); G.Camera.kick(0.12); break;
          default: G.FX.ring(x, y, 8, m.radius * 1.2, '#ffe0a0', 0.3, 5); G.FX.burst(x, y, '#c9a46a', 14, 180); G.FX.puff(x, y, '#8a8a8a', 4); G.Audio.sfx('boom'); G.Camera.kick(0.08);
        }
      };
      G.Hazards.add(mk);
    });
  }

  function mine(pl, m) {
    for (let i = 0; i < (m.count | 0); i++) {
      const a = Math.random() * 6.283, r = G.U.rand(20, 70);
      fields.push({ kind: 'mine', x: pl.x + Math.cos(a) * r, y: pl.y + Math.sin(a) * r, life: m.dur, armed: 0.4,
                    r: m.radius, dmg: m.dmg * pl.atk, pl, m });
    }
  }

  function buff(pl, m) {
    pl.addBuff(m.buff, m.amount, m.stacks | 0, m.dur);
    G.FX.ring(pl.x, pl.y, 6, 34, col(m), 0.4, 3);
    G.FX.burst(pl.x, pl.y - 16, col(m), 8, 90);
    G.Audio.sfx('confirm');
  }

  /** Órbita: daño continuo a lo que toca, con un tiempo entre golpes por enemigo. */
  function orbit(pl, m, dt, now) {
    m.angle = (m.angle || 0) + m.speed * dt;
    m.hitAt = m.hitAt || new WeakMap();
    const n = Math.max(1, m.count | 0);
    m.pos = [];
    for (let i = 0; i < n; i++) {
      const a = m.angle + i / n * 6.283;
      const x = pl.x + Math.cos(a) * m.radius, y = pl.y + Math.sin(a) * m.radius * 0.75;
      m.pos.push([x, y]);
      for (const e of G.EnemyMgr.query(x, y, m.size + 30)) {
        if (e.dead || G.U.dist2(x, y, e.x, e.y) > (m.size + e.r) ** 2) continue;
        if (now - (m.hitAt.get(e) || -9) < 0.45) continue;
        m.hitAt.set(e, now);
        e.damage(m.dmg * pl.atk, now, src(pl, m));
        if (m.vis === 'cloud') G.FX.bolt(x, y, e.x, e.y, '#ffe14d', 0.1);
      }
      G.World.hitBreakables(x, y, m.size, m.dmg * pl.atk, now);
    }
  }

  function update(dt, now) {
    for (const f of fields) {
      f.life -= dt; f.armed -= dt;
      if (f.armed > 0) continue;
      const e = G.EnemyMgr.query(f.x, f.y, 40).find(o => !o.dead && G.U.dist2(o.x, o.y, f.x, f.y) < (14 + o.r) ** 2);
      if (e || f.life <= 0) {
        f.life = 0;
        area(f.pl, f.x, f.y, f.r, f.dmg, src(f.pl, f.m), now);
        G.FX.ring(f.x, f.y, 6, f.r, '#8ad06a', 0.3, 5);
        G.FX.burst(f.x, f.y, '#4caa3f', 14, 160);
        G.Audio.sfx('boom');
      }
    }
    fields = fields.filter(f => f.life > 0);
  }

  function draw(ctx, pl, now) {
    for (const f of fields) {
      const img = G.FX.mini('plant');
      const bob = Math.floor(now * 3 + f.x) % 2 ? 2 : 0;
      ctx.drawImage(img, Math.round(f.x / 2) * 2 - 6, Math.round(f.y / 2) * 2 - 12 + bob, 12, 12);
    }
    // Órbitas de la técnica activa.
    const m = pl.activeMove;
    if (m && m.kind === 'orbit' && m.pos && !pl.dead) {
      for (const [x, y] of m.pos) {
        if (m.vis === 'cloud') {
          ctx.fillStyle = '#1a1220'; ctx.fillRect(x - 9, y - G.LIFT - 6, 18, 12);
          ctx.fillStyle = '#e8eef8'; ctx.fillRect(x - 7, y - G.LIFT - 4, 14, 8);
          ctx.fillStyle = '#ffe14d'; if (Math.floor(now * 10) % 3 === 0) ctx.fillRect(x - 1, y - G.LIFT + 4, 2, 6);
        } else {
          const img = G.FX.mini('hand');
          ctx.drawImage(img, Math.round(x / 2) * 2 - 6, Math.round((y - G.LIFT) / 2) * 2 - 6, 12, 12);
        }
      }
    }
  }

  return { tick, update, draw, clear };
})();
