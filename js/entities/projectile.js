/* ============ projectile.js — disparos del jugador y de los enemigos ============
 * Vuelan en el plano del suelo; se dibujan elevados (G.LIFT) con sombra.
 *   foe: true  -> los dispara un enemigo y te dañan a ti
 *     homing   giro hacia ti (murciélagos de Moria)
 *     back     segundos de ida; luego vuelve a `owner` (mano de Buggy). keep: no se rompe al darte
 */
G.Projectiles = (() => {
  let list = [];

  function clear() { list = []; }
  function spawn(p) {
    p.age = 0;
    p.hits = p.hits || new Set();
    list.push(p);
    return p;
  }

  function update(dt, pl, now) {
    for (const p of list) {
      if (p.delay > 0) { p.delay -= dt; continue; }
      p.age += dt;
      p.life -= dt;
      if (p.foe && (p.homing || p.back)) {
        // Hacia ti, o de vuelta a quien lo lanzó.
        const back = p.back && p.age > p.back;
        const tx = back ? p.owner.x : pl.x, ty = back ? p.owner.y - 20 : pl.y;
        const [nx, ny] = G.U.norm(tx - p.x, ty - p.y);
        const sp = Math.hypot(p.vx, p.vy);
        if (back) { p.vx = nx * sp; p.vy = ny * sp; if (p.owner.dead || G.U.dist2(p.x, p.y, tx, ty) < 400) p.life = 0; }
        else { p.vx = G.U.damp(p.vx, nx * sp, p.homing, dt); p.vy = G.U.damp(p.vy, ny * sp, p.homing, dt); }
      } else if (p.homing && !p.foe) {
        const e = G.EnemyMgr.nearest(p.x, p.y, 160, p.hits);
        if (e) {
          const [nx, ny] = G.U.norm(e.x - p.x, e.y - p.y);
          const sp = Math.hypot(p.vx, p.vy);
          p.vx = G.U.damp(p.vx, nx * sp, p.homing, dt);
          p.vy = G.U.damp(p.vy, ny * sp, p.homing, dt);
        }
      }
      p.x += p.vx * dt; p.y += p.vy * dt;

      if (p.foe) {
        if (!pl.dead && G.U.dist2(p.x, p.y, pl.x, pl.y) < (p.r + pl.r) ** 2) {
          pl.hurt(p.dmg, now);
          if (!p.keep) p.life = 0;
        }
        continue;
      }

      // Contra los enemigos (rejilla espacial).
      for (const e of G.EnemyMgr.query(p.x, p.y, p.r + 30)) {
        if (e.dead || p.hits.has(e)) continue;
        if (G.U.dist2(p.x, p.y, e.x, e.y) > (p.r + e.r) ** 2) continue;
        p.hits.add(e);
        if (p.splash) { explode(p, now); p.life = 0; break; }
        e.damage(p.dmg, now, p);
        if (p.pierce-- <= 0) { p.life = 0; break; }
      }
      G.World.hitBreakables(p.x, p.y, p.r, p.dmg, now);
      if (p.life <= 0 && p.splash && !p.exploded) explode(p, now);
    }
    list = list.filter(p => p.life > 0);
  }

  function explode(p, now) {
    if (p.exploded) return;
    p.exploded = true;
    for (const e of G.EnemyMgr.query(p.x, p.y, p.splash + 20)) {
      if (!e.dead && G.U.dist2(p.x, p.y, e.x, e.y) < (p.splash + e.r) ** 2) e.damage(p.dmg, now, p);
    }
    G.World.hitBreakables(p.x, p.y, p.splash, p.dmg, now);
    G.FX.ring(p.x, p.y, 6, p.splash, p.burn ? '#ff8a2a' : '#ffe0a0', 0.3, 4);
    G.FX.burst(p.x, p.y, p.burn ? '#ff8a2a' : '#c9a46a', 12, 160);
    G.Audio.sfx('boom');
  }

  function draw(ctx) {
    for (const p of list) {
      if (p.delay > 0) continue;
      const y = p.y - G.LIFT;
      const a = Math.atan2(p.vy, p.vx);
      // Sombra.
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.fillRect(Math.round(p.x) - 3, Math.round(p.y) - 1, 6, 2);
      switch (p.vis) {
        case 'fist': case 'firefist': case 'petals': case 'knife': case 'hand': {
          const img = G.FX.mini(p.vis === 'petals' ? 'petal' : p.vis);
          ctx.save(); ctx.translate(p.x, y);
          if (p.vis === 'knife') ctx.rotate(a);
          ctx.drawImage(img, -img.width, -img.height, img.width * 2, img.height * 2);
          ctx.restore();
          break;
        }
        case 'crescent': case 'kickwave': {
          ctx.strokeStyle = p.color; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(p.x - Math.cos(a) * p.r * 0.6, y - Math.sin(a) * p.r * 0.6, p.r, a - 1.1, a + 1.1); ctx.stroke();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
          break;
        }
        case 'bat': {
          // Murciélago de sombra (en unidades de mundo: 2 = un píxel de arte), alas que baten.
          const P = 2, bx = Math.round(p.x / P) * P, by = Math.round(y / P) * P;
          const up = (Math.floor(p.age * 12) % 2 ? -3 : 1) * P;
          const px = (x, yy, w, h) => ctx.fillRect(bx + x * P, by + yy * P, w * P, h * P);
          // Contorno claro para que se vea también sobre suelo oscuro (Thriller Bark).
          ctx.fillStyle = '#d8c8ff';
          px(-3, -3, 6, 6); ctx.fillRect(bx - 9 * P, by + up - 2 * P, 18 * P, 4 * P);
          ctx.fillStyle = '#1a1220';
          px(-2, -2, 4, 4); ctx.fillRect(bx - 8 * P, by + up - P, 16 * P, 2 * P);
          ctx.fillStyle = '#ff3a4a';
          px(-1, -1, 1, 1); px(1, -1, 1, 1);
          break;
        }
        case 'haki': {
          ctx.fillStyle = '#1a1220';
          ctx.fillRect(p.x - p.r * 0.6, y - p.r * 0.6, p.r * 1.2, p.r * 1.2);
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.r * 0.4, y - p.r * 0.4, p.r * 0.8, p.r * 0.8);
          break;
        }
        case 'bullet': case 'ebullet': case 'pellet': default: {
          const r = Math.max(2, p.r * 0.7);
          ctx.fillStyle = '#1a1220';
          ctx.fillRect(Math.round(p.x - r - 2), Math.round(y - r - 2), r * 2 + 4, r * 2 + 4);
          ctx.fillStyle = p.color;
          ctx.fillRect(Math.round(p.x - r), Math.round(y - r), r * 2, r * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(Math.round(p.x - r), Math.round(y - r), 2, 2);
        }
      }
    }
  }

  return { clear, spawn, update, draw, explode, get count() { return list.length; } };
})();
