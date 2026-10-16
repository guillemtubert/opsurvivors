/* ============ projectile.js — disparos del jugador y de los enemigos ============
 * Vuelan en el plano del suelo; se dibujan elevados (G.LIFT) con sombra.
 *   foe: true  -> los dispara un enemigo y te dañan a ti
 *     homing   giro hacia ti (murciélagos de Moria)
 *     back     segundos de ida; luego vuelve a `owner` (mano de Buggy). keep: no se rompe al darte
 *     bounce   rebotes en la costa y en árboles o rocas (bates de Mr. 9)
 *     orbit    { owner, r, w }: gira alrededor de owner mientras viva (cuchillas de Miss Wednesday)
 *     land     función(x, y) al caer al suelo o al darte (mocos-bomba de Mr. 5)
 *     hit      función(pl) al darte, además del daño (fantasmas de Perona: sin ataques)
 * Un enemigo con reflect (espejo de Foxy) devuelve tus disparos: pasan a ser suyos.
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
      if (p.orbit) {
        const o = p.orbit;
        if (o.owner.dead) { p.life = 0; continue; }
        o.a = (o.a || 0) + o.w * dt;
        const nx = o.owner.x + Math.cos(o.a) * o.r, ny = o.owner.y + Math.sin(o.a) * o.r * 0.8;
        p.vx = (nx - p.x) / dt; p.vy = (ny - p.y) / dt;      // para que el dibujo apunte bien
        p.x = nx; p.y = ny; p.life = 1;
      } else if (p.bounce > 0) {
        const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
        const blocked = (x, y) => G.World.waterAt(x, y) === 2 || !G.World.isFree(x, y, 4);
        if (blocked(nx, ny)) {
          if (blocked(nx, p.y)) p.vx = -p.vx;
          if (blocked(p.x, ny)) p.vy = -p.vy;
          p.bounce--;
        }
        p.x += p.vx * dt; p.y += p.vy * dt;
      } else { p.x += p.vx * dt; p.y += p.vy * dt; }
      if (p.foe && p.land && p.life <= 0) { p.land(p.x, p.y); p.land = null; }

      if (p.foe) {
        if (!pl.dead && G.U.dist2(p.x, p.y, pl.x, pl.y) < (p.r + pl.r) ** 2) {
          if (p.dmg > 0) pl.hurt(p.dmg, now);
          if (p.hit) p.hit(pl);
          if (!p.keep) { p.life = 0; if (p.land) { p.land(p.x, p.y); p.land = null; } }
        }
        continue;
      }

      // Contra los enemigos (rejilla espacial).
      for (const e of G.EnemyMgr.query(p.x, p.y, p.r + 30)) {
        if (e.dead || p.hits.has(e)) continue;
        if (G.U.dist2(p.x, p.y, e.x, e.y) > (p.r + e.r) ** 2) continue;
        if (e.reflect) {
          // Espejo: vuelve hacia ti, con el daño del que lo sostiene.
          p.foe = true; p.vx = -p.vx; p.vy = -p.vy; p.dmg = Math.min(p.dmg, e.dmg * 0.5); p.color = '#ff9ec4'; p.homing = 0;
          G.FX.burst(p.x, p.y, '#ff9ec4', 5, 100);
          break;
        }
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
        case 'ball': {
          // Bala de cañón: bola oscura con brillo (la sombra la pone el aviso al caer).
          const r = Math.round(p.r);
          ctx.fillStyle = '#1a1220'; ctx.beginPath(); ctx.arc(Math.round(p.x), Math.round(p.y - r), r + 2, 0, 6.283); ctx.fill();
          ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(Math.round(p.x), Math.round(p.y - r), r, 0, 6.283); ctx.fill();
          ctx.fillStyle = '#6a6a7a'; ctx.fillRect(Math.round(p.x - r * 0.5), Math.round(p.y - r * 1.5), Math.max(2, r * 0.4), Math.max(2, r * 0.4));
          break;
        }
        case 'ghost': {
          // Fantasma de Perona: sábana con ojos; los que estallan, rosados.
          const P = 2, bx = Math.round(p.x / P) * P, by = Math.round((y + Math.sin(p.age * 6) * 3) / P) * P;
          const px = (x, yy, w, h) => ctx.fillRect(bx + x * P, by + yy * P, w * P, h * P);
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = '#1a1220'; px(-4, -5, 8, 10);
          ctx.fillStyle = p.ghost === 'boom' ? '#ffb8d8' : '#f4f1ff'; px(-3, -4, 6, 8);
          ctx.fillStyle = '#1a1220'; px(-2, -2, 1, 2); px(1, -2, 1, 2);
          ctx.globalAlpha = 1;
          break;
        }
        case 'club': {
          ctx.save(); ctx.translate(Math.round(p.x), Math.round(y)); ctx.rotate(p.age * 14);
          ctx.fillStyle = '#1a1220'; ctx.fillRect(-9, -3, 18, 6);
          ctx.fillStyle = '#c08048'; ctx.fillRect(-7, -2, 14, 4);
          ctx.fillStyle = '#e8b878'; ctx.fillRect(1, -2, 6, 2);
          ctx.restore();
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
