/* ============ enemy.js — enemigos, jefes y su gestor ============
 * (x, y) son los PIES. Los comportamientos están descritos en data/enemies.js.
 * El gestor mantiene una rejilla espacial (celdas de 64) que se rehace cada
 * frame: los proyectiles y los ataques sólo miran a los de alrededor.
 */
G.Enemy = class Enemy {
  constructor(def, o = {}) {
    this.def = def;
    this.name = def.name;
    this.title = def.title || '';
    this.sprite = def.sprite;
    const s = G.Pix.sprite(def.sprite);
    this.scale = s.scale || 1;
    // Radio del cuerpo (no de la celda entera, que incluye el hueco de los ataques).
    this.r = Math.max(8, s.body[2] * G.PX * this.scale * 0.3);
    this.x = o.x || 0; this.y = o.y || 0;
    this.boss = !!o.boss;
    this.elite = !!o.elite;
    this.maxHp = def.hp * (o.hpK || 1) * (this.elite ? 3 : 1);
    this.hp = this.maxHp;
    this.spd = def.spd * G.U.rand(0.92, 1.08);
    this.dmg = def.dmg * (o.dmgK || 1) * (this.elite ? 1.4 : 1);
    this.xp = def.xp * (o.xpK || 1) * (this.elite ? 3 : 1);
    this.behavior = def.behavior;
    this.dead = false;
    this.flash = 0;
    this.kx = 0; this.ky = 0;               // empuje recibido
    this.burnT = 0; this.burnDps = 0; this.burnTick = 0;
    this.face = 1;
    this.dir = 'down';
    this.moving = false;
    this.animT = Math.random();
    this.t1 = G.U.rand(1, 3);               // temporizador de su ataque especial
    this.state = 'walk'; this.stateT = 0;
    this.dashX = 0; this.dashY = 0;
    this.hitT = 0;                          // último golpe al jugador
    this.atkAt = -9; this.hurtAt = -9;      // para las poses de ataque y de daño
  }

  update(dt, pl, now) {
    this.animT += dt;
    if (this.flash > 0) this.flash -= dt;

    // Quemadura: daño cada medio segundo.
    if (this.burnT > 0) {
      this.burnT -= dt; this.burnTick -= dt;
      if (this.burnTick <= 0) {
        this.burnTick = 0.5;
        this.damage(this.burnDps * 0.5, now, null, '#ff8a2a');
        if (Math.random() < 0.5) G.FX.puff(this.x, this.y - 6, '#ff8a2a', 1);
        if (this.dead) return;
      }
    }

    const dx = pl.x - this.x, dy = pl.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = dx / d, ny = dy / d;
    let mx = 0, my = 0;
    const slow = this.boss ? 1 : [1, 0.6, 0.45][G.World.waterAt(this.x, this.y)];
    let spd = this.spd * slow;

    // Jefes: cada uno con sus ataques (entities/bosses.js).
    const ai = this.boss ? G.Bosses.update(this, { dt, now, pl, dx, dy, d, nx, ny }) : null;
    if (ai) { mx = ai.mx; my = ai.my; spd = this.spd * (ai.spd || 1); }
    else switch (this.behavior) {
      case 'ranged': {
        if (d > 230) { mx = nx; my = ny; }
        else if (d < 150) { mx = -nx; my = -ny; }
        else { mx = -ny * 0.6; my = nx * 0.6; }
        this.t1 -= dt;
        if (this.t1 <= 0 && d < 340) {
          this.t1 = G.U.rand(2.0, 2.8);
          this.shoot(nx, ny, 170, this.def.shot || this.dmg);
          this.atkAt = now;
        }
        break;
      }
      case 'beamer': {
        if (this.state === 'aim') {
          this.stateT -= dt;
          if (this.stateT <= 0) {
            // Dispara el láser en la dirección marcada.
            this.state = 'walk';
            const ex = this.x + Math.cos(this.aim) * 320, ey = this.y + Math.sin(this.aim) * 320;
            G.FX.beam(this.x, this.y - 10, ex, ey - 10, 8, '#ffe14d', 0.25);
            G.Audio.sfx('thunder');
            if (segDist(pl.x, pl.y, this.x, this.y, ex, ey) < 14 + pl.r) pl.hurt(this.dmg * 1.6, now);
          }
        } else {
          mx = nx; my = ny;
          this.t1 -= dt;
          if (this.t1 <= 0 && d < 300) {
            this.t1 = G.U.rand(4.5, 6);
            this.state = 'aim'; this.stateT = 0.9;
            this.aim = Math.atan2(dy, dx);
            G.FX.mark(this.x, this.y, 0, '#ff3a3a', 0.9, 'line', { a: this.aim, len: 320, w: 24 });
          }
        }
        break;
      }
      default:
        mx = nx; my = ny;
    }

    // Empuje: se va frenando.
    const ox = this.x, oy = this.y;
    this.x += (mx * spd + this.kx) * dt;
    this.y += (my * spd + this.ky) * dt;
    // Los jefes no entran en el mar profundo (como el jugador, se resbalan por la
    // orilla): si no, al embestir cerca de la costa su cofre caería donde no se llega.
    if (this.boss && G.World.waterAt(this.x, this.y) === 2) {
      if (G.World.waterAt(this.x, oy) !== 2) this.y = oy;
      else if (G.World.waterAt(ox, this.y) !== 2) this.x = ox;
      else { this.x = ox; this.y = oy; }
    }
    const k = Math.exp(-8 * dt);
    this.kx *= k; this.ky *= k;
    this.moving = Math.abs(mx) + Math.abs(my) > 0.1;
    if (Math.abs(mx) > 0.1) this.face = mx > 0 ? 1 : -1;
    if (this.moving) this.dir = G.Pix.dir8(mx, my);
    // Al atacar mira a su objetivo.
    if (now - this.atkAt < 0.35) { this.face = dx > 0 ? 1 : -1; this.dir = G.Pix.dir8(dx, dy); }

    // Chocan con árboles y rocas (los jefes no: no deben quedarse atascados).
    if (!this.boss) [this.x, this.y] = G.World.resolve(this.x, this.y, this.r * 0.7);

    // Golpe al tocarte (no si está bajo tierra o en el aire).
    if (!pl.dead && !this.hidden && d < this.r + pl.r && now - this.hitT > 0.7) {
      this.hitT = now;
      this.atkAt = now;
      pl.hurt(this.dmg, now);
    }
  }

  shoot(nx, ny, speed, dmg, vis = 'ebullet') {
    G.Projectiles.spawn({
      foe: true, x: this.x + nx * this.r, y: this.y + ny * this.r, vx: nx * speed, vy: ny * speed,
      dmg, r: 5, life: 3, color: '#ff5f5f', vis
    });
  }

  /** @param src  proyectil o técnica (para empuje, quemadura...) */
  damage(amount, now, src = null, col = null) {
    if (this.dead || this.hidden) return;
    if (this.immune) {
      if (now - this.hurtAt > 0.4) { this.hurtAt = now; G.FX.text(this.x, this.y - this.r * 2, '0', '#c8d0e0'); }
      return;
    }
    let crit = false;
    if (src && src.owner && Math.random() < src.owner.crit) { amount *= 2; crit = true; }
    this.hp -= amount;
    this.flash = 0.1;
    // Pose de daño, pero no en cada golpe (con golpes seguidos se quedaría congelado).
    if (now - this.hurtAt > 0.7) this.hurtAt = now;
    if (src) {
      if (src.knock) {
        const [nx, ny] = src.vx !== undefined ? G.U.norm(src.vx, src.vy) : G.U.norm(this.x - src.ox, this.y - src.oy);
        const res = this.boss ? 0.12 : this.elite ? 0.5 : 1;
        this.kx += nx * src.knock * res; this.ky += ny * src.knock * res;
      }
      if (src.burn) { this.burnT = 3; this.burnDps = Math.max(this.burnDps, src.burn * (src.owner ? src.owner.atk : 1)); }
    }
    G.Game.stats.dealt += amount;
    G.FX.text(this.x, this.y - this.r * 2, Math.round(amount), col || (crit ? '#ffe14d' : '#ffffff'), crit);
    G.Audio.sfx('hit');
    if (this.hp <= 0) this.die(now);
  }

  die(now) {
    this.dead = true;
    G.FX.burst(this.x, this.y - 10, '#ffffff', 8, 130);
    G.FX.puff(this.x, this.y, '#d8d0c0', 3);
    G.Pickups.dropEnemy(this);
    G.Game.onKill(this);
  }

  draw(ctx, now) {
    // Bajo tierra (Arlong): sólo la aleta.
    if (this.fin) {
      const x = Math.round(this.x / 2) * 2, y = Math.round(this.y / 2) * 2;
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x - 12, y - 2, 24, 4);
      ctx.fillStyle = '#1a1220'; ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 6, y - 22); ctx.lineTo(x + 10, y); ctx.fill();
      ctx.fillStyle = '#5a9ad8'; ctx.beginPath(); ctx.moveTo(x - 6, y - 2); ctx.lineTo(x + 5, y - 17); ctx.lineTo(x + 7, y - 2); ctx.fill();
      return;
    }
    if (this.hidden && !this.z) return;
    const s = G.Pix.sprite(this.sprite);
    const sc = this.scale * G.PX;
    let anim = this.moving ? 'walk' : 'idle', t = this.animT;
    if (this.pose || this.state === 'aim') { anim = 'attack'; t = 9; }
    else if (now - this.hurtAt < 0.18) { anim = 'hurt'; t = now - this.hurtAt; }
    else if (now - this.atkAt < 0.35) { anim = 'attack'; t = now - this.atkAt; }
    const { f, flip } = G.Pix.pick(s, anim, t, this.face, this.dir);
    // Un solo fotograma para andar: rebote.
    // Flotando: vaivén suave. Andando con una sola pose: rebote de los pasos.
    const hop = this.def.hover ? Math.round((Math.sin(this.animT * 2.5) + 1) * 1.5) * 2
      : anim === 'walk' && G.Pix.bounces(s, this.dir) ? Math.round(Math.abs(Math.sin(this.animT * 11)) * 2) * 2 : 0;
    const img = this.flash > 0 ? (flip ? s.whiteFlip[f] : s.white[f]) : (flip ? s.flip[f] : s.frames[f]);
    const w = s.w * sc, h = s.h * sc;
    const x = Math.round((this.x - w / 2) / 2) * 2, y = Math.round((this.y - h + 2 - (this.z || 0)) / 2) * 2 - hop;
    // Sombra.
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath(); ctx.ellipse(this.x, this.y, this.r * 1.1, this.r * 0.45, 0, 0, 6.283); ctx.fill();
    if (this.elite) {
      // Élite: halo dorado detrás.
      ctx.globalAlpha = 0.55 + Math.sin(now * 8) * 0.2;
      const g = flip ? s.whiteFlip[f] : s.white[f];
      for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) ctx.drawImage(g, x + ox, y + oy, w, h);
      ctx.globalAlpha = 1;
    }
    // Esfumándose (Kuro): se desvanece.
    if (this.state === 'vanish') ctx.globalAlpha = Math.max(0.1, Math.min(1, this.stateT / 0.35));
    ctx.drawImage(img, x, y, w, h);
    // Tekkai: brillo metálico.
    if (this.immune) {
      ctx.globalAlpha = 0.35 + Math.sin(now * 10) * 0.15;
      ctx.drawImage(flip ? s.whiteFlip[f] : s.white[f], x, y, w, h);
    }
    ctx.globalAlpha = 1;
    if (this.burnT > 0 && Math.random() < 0.3) G.FX.puff(this.x + G.U.rand(-6, 6), this.y - h * 0.5, '#ff8a2a', 1);
    // Barra de vida de los élite y de los heridos grandes.
    if ((this.elite || this.def.hp > 100) && !this.boss && this.hp < this.maxHp) {
      const bw = 28;
      ctx.fillStyle = '#1a1220'; ctx.fillRect(this.x - bw / 2 - 2, y - 8, bw + 4, 6);
      ctx.fillStyle = this.elite ? '#ffd23f' : '#ff5f5f';
      ctx.fillRect(this.x - bw / 2, y - 6, bw * Math.max(0, this.hp / this.maxHp), 2);
    }
  }
};

/** Distancia de un punto a un segmento. */
function segDist(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1, vy = y2 - y1;
  const t = G.U.clamp(((px - x1) * vx + (py - y1) * vy) / (vx * vx + vy * vy || 1), 0, 1);
  return Math.hypot(px - (x1 + vx * t), py - (y1 + vy * t));
}
G.segDist = segDist;

G.EnemyMgr = (() => {
  let list = [];
  const CELL = 64;
  let grid = new Map();

  function clear() { list = []; grid = new Map(); }
  function add(e) { list.push(e); return e; }

  function key(cx, cy) { return (cx & 0xffff) << 16 | (cy & 0xffff); }

  function rebuild() {
    grid = new Map();
    for (const e of list) {
      if (e.dead) continue;
      const k = key(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
      let c = grid.get(k);
      if (!c) grid.set(k, c = []);
      c.push(e);
    }
  }

  /** Enemigos cuyas celdas tocan el círculo (filtrar por distancia fuera). */
  function query(x, y, r) {
    const out = [];
    const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL);
    const y0 = Math.floor((y - r) / CELL), y1 = Math.floor((y + r) / CELL);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const c = grid.get(key(cx, cy));
      if (c) for (const e of c) out.push(e);
    }
    return out;
  }

  function nearest(x, y, maxR, exclude = null) {
    let best = null, bd = maxR * maxR;
    for (const e of query(x, y, maxR)) {
      if (e.dead || e.hidden || (exclude && exclude.has(e))) continue;
      const d = G.U.dist2(x, y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function update(dt, pl, now) {
    rebuild();
    for (const e of list) if (!e.dead) e.update(dt, pl, now);
    // Separación: que no se amontonen en un solo píxel.
    for (const e of list) {
      if (e.dead) continue;
      for (const o of query(e.x, e.y, e.r * 2)) {
        if (o === e || o.dead) continue;
        const dx = e.x - o.x, dy = e.y - o.y, min = (e.r + o.r) * 0.8;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0 && d2 < min * min) {
          const d = Math.sqrt(d2), push = (min - d) * 0.5;
          const wE = e.boss ? 0.1 : 1;
          e.x += dx / d * push * wE; e.y += dy / d * push * wE;
        }
      }
    }
    list = list.filter(e => !e.dead);
    // Los que se quedan muy lejos vuelven a aparecer cerca (no se pierden).
    const far = G.Camera.outerRadius() * 2.2;
    for (const e of list) {
      if (!e.boss && G.U.dist2(e.x, e.y, pl.x, pl.y) > far * far) {
        const p = G.Spawner.landPoint(pl, Math.atan2(pl.y - e.y, pl.x - e.x) + Math.PI);
        if (p) [e.x, e.y] = p;
      }
    }
  }

  function collect(out, now) {
    for (const e of list) if (G.Camera.sees(e.x, e.y, 80)) out.push({ y: e.y, draw: ctx => e.draw(ctx, now) });
  }

  return {
    clear, add, update, query, nearest, collect,
    get list() { return list; }, get count() { return list.length; },
    boss() { return list.find(e => e.boss && !e.dead) || null; }
  };
})();

/* Peligros con aviso en el suelo: al acabar el aviso, se ejecuta onEnd. */
G.Hazards = (() => {
  let list = [];
  return {
    clear() { list = []; },
    add(m) { list.push(m); },
    // onEnd: al acabar el aviso · tick: cada frame mientras dura (zonas que hacen daño)
    update(dt) {
      for (const m of list) {
        if (m.life > 0 && m.tick) m.tick(dt);
        if (m.life <= 0 && m.onEnd) { m.onEnd(); m.onEnd = null; }
      }
      list = list.filter(m => m.onEnd || (m.tick && m.life > 0));
    }
  };
})();
