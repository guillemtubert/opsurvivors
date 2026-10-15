/* ============ player.js — el tripulante que controlas ============
 * (x, y) son los PIES. Sólo UNA técnica está activa a la vez: se lanza sola
 * contra el enemigo más cercano y se cambia con 1-4 / Q / E.
 */
G.Player = class Player {
  constructor(crew, perks = {}) {
    this.crew = crew;
    this.sprite = crew.id;
    this.x = 0; this.y = 0;
    // Radio del cuerpo, según el sprite (un poco justo: es más agradable).
    this.r = Math.max(9, G.Pix.sprite(crew.id).body[2] * G.PX * 0.24);

    this.atkMul = crew.atk * (perks.atkMul || 1);
    this.spdMul = perks.spdMul || 1;
    this.cdMul = perks.cdMul || 1;
    this.dmgReduce = perks.dmgReduce || 0;
    this.regenFlat = perks.regen || 0;
    this.magnet = 84 * (perks.magnetMul || 1);
    this.xpMul = perks.xpMul || 1;
    this.goldMul = perks.goldMul || 1;
    this.crit = 0.05;
    this.rerolls = 1 + (perks.rerolls || 0);

    this.maxHp = crew.hp + (perks.hp || 0);
    this.hp = this.maxHp;
    this.baseSpd = crew.spd;

    this.moves = [];            // técnicas aprendidas (una por hueco)
    this.active = 0;
    this.maxMoves = 4;
    this.buffs = {
      atk: { n: 0, t: 0, amount: 0 }, spd: { n: 0, t: 0, amount: 0 },
      def: { n: 0, t: 0, amount: 0 }, regen: { n: 0, t: 0, amount: 0 }
    };
    this.statsTaken = {};

    this.level = 1; this.xp = 0; this.xpNext = Player.xpFor(1);
    this.kills = 0; this.bosses = 0; this.coins = 0; this.islands = 0;

    this.invuln = 0; this.flash = 0; this.slowT = 0;
    this.aim = Math.PI / 2;
    this.face = 1;
    this.dir = 'down';           // de las 8 direcciones (para las hojas que las tienen)
    this.stepN = 0;              // pasos dados (para el polvo al andar)
    this.walking = false;
    this.animT = 0;
    this.target = null;
    this.dead = false;
    this.atkAt = -9; this.hurtAt = -9;   // poses de ataque y de daño
  }

  static xpFor(level) { return Math.floor(8 + level * 5 + Math.pow(level, 1.75) * 1.6); }

  // ---------------- stats efectivos ----------------
  get atk() { return this.atkMul * (1 + this.buffs.atk.n * this.buffs.atk.amount); }
  get spd() {
    const water = [1, 0.62, 0.45][G.World.waterAt(this.x, this.y)];
    const stuck = this.slowT > 0 ? 0.5 : 1;     // pegado a la cera (Mr. 3)
    return this.baseSpd * this.spdMul * (1 + this.buffs.spd.n * this.buffs.spd.amount) * water * stuck;
  }
  get reduction() { return Math.min(0.8, this.dmgReduce + this.buffs.def.n * this.buffs.def.amount); }
  get regen() { return this.regenFlat + this.buffs.regen.n * this.buffs.regen.amount; }

  // ---------------- técnicas ----------------
  hasMove(id) { return this.moves.some(m => m.id === id); }
  addMove(id) {
    if (this.moves.length >= this.maxMoves || this.hasMove(id)) return false;
    this.moves.push(G.Moves.instance(id));
    this.setActive(this.moves.length - 1);
    return true;
  }
  setActive(i) {
    if (i < 0 || i >= this.moves.length) return;
    this.active = i;
    // Al cambiar, la técnica está lista enseguida (no se castiga cambiar).
    const m = this.moves[i];
    if (m) m.t = Math.min(m.t, 0.15);
    G.HUD.moves(this);
  }
  cycle(dir) {
    if (this.moves.length < 2) return;
    this.setActive((this.active + dir + this.moves.length) % this.moves.length);
    G.Audio.sfx('select');
  }
  get activeMove() { return this.moves[this.active]; }

  // ---------------- vida ----------------
  hurt(d, now) {
    if (this.dead || this.invuln > 0) return;
    d *= 1 - this.reduction;
    this.hp -= d;
    this.invuln = 0.4;
    this.hurtAt = now;
    this.flash = 0.15;
    G.Camera.kick(0.35);
    G.Audio.sfx('hurt');
    G.FX.text(this.x, this.y - 30, '-' + Math.round(d), '#ff5f6d', true);
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      G.FX.burst(this.x, this.y - 16, '#ffffff', 30, 200);
    }
  }
  heal(n) {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + n);
    if (this.hp - before >= 1) G.FX.text(this.x, this.y - 34, '+' + Math.round(this.hp - before), '#7fe08a');
  }
  addMaxHp(n) { this.maxHp += n; this.hp += n; }

  /** Se lanza una técnica: pose de ataque mirando al objetivo. */
  onCast(m, now) {
    if (['aura', 'buff', 'mine', 'orbit'].includes(m.kind)) return;
    this.atkAt = now;
    this.face = Math.cos(this.aim) >= 0 ? 1 : -1;
    this.dir = G.Pix.dir8(Math.cos(this.aim), Math.sin(this.aim));
  }

  // ---------------- buffs ----------------
  addBuff(stat, amount, max, dur) {
    const b = this.buffs[stat];
    b.amount = amount;
    b.n = Math.min(max, b.n + 1);
    b.t = dur;
  }

  // ---------------- frame ----------------
  update(dt, now) {
    if (this.dead) return;
    this.animT += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.slowT > 0) this.slowT -= dt;
    if (this.flash > 0) this.flash -= dt;

    const [ax, ay] = G.Input.axis();
    this.walking = !!(ax || ay);
    if (this.walking) {
      const s = this.spd, ox = this.x, oy = this.y;
      this.x += ax * s * dt; this.y += ay * s * dt;
      // El mar profundo no se cruza: se resbala por la orilla.
      if (G.World.waterAt(this.x, this.y) === 2) {
        if (G.World.waterAt(this.x, oy) !== 2) this.y = oy;
        else if (G.World.waterAt(ox, this.y) !== 2) this.x = ox;
        else { this.x = ox; this.y = oy; }
      }
      if (Math.abs(ax) > 0.1 && now - this.atkAt > 0.3) this.face = ax > 0 ? 1 : -1;
      if (now - this.atkAt > 0.3) this.dir = G.Pix.dir8(ax, ay);
      // Polvo en cada paso (cuando el rebote toca el suelo).
      const n = Math.floor(this.animT * 12 / Math.PI);
      if (n !== this.stepN) {
        this.stepN = n;
        if (!G.World.waterAt(this.x, this.y)) G.FX.dust(this.x - this.face * 6, this.y, this.face);
      }
      [this.x, this.y] = G.World.resolve(this.x, this.y, this.r * 0.8);
      if (G.World.waterAt(this.x, this.y) && Math.random() < 0.25) G.FX.puff(this.x, this.y, '#d8f2ff', 1);
    }

    // Regeneración y buffs.
    if (this.regen > 0) this.hp = Math.min(this.maxHp, this.hp + this.regen * dt);
    for (const b of Object.values(this.buffs)) {
      if (b.n > 0) { b.t -= dt; if (b.t <= 0) b.n = 0; }
    }

    // Objetivo: el jefe si está a tiro, si no el más cercano.
    const boss = G.EnemyMgr.boss();
    if (boss && G.U.dist(this.x, this.y, boss.x, boss.y) < 300) this.target = boss;
    else this.target = G.EnemyMgr.nearest(this.x, this.y, 520);
    if (this.target) {
      this.aim = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    } else if (this.walking) {
      this.aim = Math.atan2(ay, ax);
    }
    // Mira hacia donde ataca si está parado.
    if (!this.walking && this.target && now - this.atkAt > 0.35) {
      this.face = this.target.x > this.x ? 1 : -1;
      this.dir = G.Pix.dir8(this.target.x - this.x, this.target.y - this.y);
    }
  }

  draw(ctx, now) {
    const s = G.Pix.sprite(this.sprite);
    const sc = (s.scale || 1) * G.PX;
    let anim = this.walking ? 'walk' : 'idle', t = this.walking ? this.animT : now;
    if (now - this.hurtAt < 0.25) { anim = 'hurt'; t = now - this.hurtAt; }
    else if (now - this.atkAt < 0.3) { anim = 'attack'; t = now - this.atkAt; }
    const { f, flip } = G.Pix.pick(s, anim, t, this.face, this.dir);
    // Golpe: destello blanco cortito y luego parpadeo transparente mientras eres invulnerable.
    const white = this.flash > 0.08;
    const img = white ? (flip ? s.whiteFlip[f] : s.white[f]) : (flip ? s.flip[f] : s.frames[f]);
    const w = s.w * sc, h = s.h * sc;
    // Dibujo en código: respira 1 px quieto. Hoja con una sola pose de correr: rebota al andar.
    let bob = 0;
    if (anim === 'idle' && s.anims.idle.length === 1) bob = Math.floor(now * 2) % 2 ? 2 : 0;
    if (anim === 'walk' && G.Pix.bounces(s, this.dir)) bob = -Math.round(Math.abs(Math.sin(this.animT * 12)) * 2) * 2;
    const x = Math.round((this.x - w / 2) / 2) * 2, y = Math.round((this.y - h + 2 + bob) / 2) * 2;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(this.x, this.y, this.r * 1.1, this.r * 0.4, 0, 0, 6.283); ctx.fill();
    // Aura de buff.
    const bf = this.buffs;
    if (bf.atk.n || bf.def.n || bf.spd.n || bf.regen.n) {
      const col = bf.atk.n ? '#b06bff' : bf.def.n ? '#4fb4ff' : bf.spd.n ? '#ffe14d' : '#7fe08a';
      ctx.globalAlpha = 0.35 + Math.sin(now * 6) * 0.15;
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(this.x, this.y, this.r * 1.6, this.r * 0.6, 0, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (this.invuln > 0 && Math.floor(now * 16) % 2) ctx.globalAlpha = 0.45;
    ctx.drawImage(img, x, y, w, h);
    ctx.globalAlpha = 1;
  }
};
