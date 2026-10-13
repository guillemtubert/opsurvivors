/* ============ fx.js — partículas, ondas, cortes, rayos y números de daño ============
 * Todo se pinta en el lienzo de baja resolución, así que hasta las chispas
 * salen en píxeles gordos. Los números de daño van en la capa de pantalla.
 */
G.FX = (() => {
  let parts = [], rings = [], arcs = [], beams = [], bolts = [], texts = [], marks = [];

  // Mini-sprites de efectos.
  const MINI = {
    fist: { rows: ['.kkkk.', 'kssssk', 'ksksks', 'kssssk', 'kSSSSk', '.kkkk.'], pal: {} },
    firefist: { rows: ['.oyyo.', 'oyssyo', 'ysksky', 'oyssyo', 'ryyyyr', '.rrrr.'], pal: { o: '#ff8a2a', y: '#ffe14d', r: '#e0383e' } },
    hand: { rows: ['k.k.k.', 'kpkpkp', 'kppppk', 'kppppk', '.kppk.', '..kk..'], pal: { p: '#f0b8a0' } },
    petal: { rows: ['.pp.', 'pPPp', 'pPPp', '.pp.'], pal: { p: '#ff8ad8', P: '#ffd0f0' } },
    knife: { rows: ['kk....', 'kxxk..', '.kxxxk', '..kkkk'], pal: {} },
    plant: { rows: ['.g..g.', 'gGggGg', '.gGGg.', '..kk..', '.kbbk.', '.kkkk.'], pal: { g: '#4caa3f', G: '#8ad06a', b: '#8a5a2b' } },
    meat: { rows: ['..kkkk..', '.krrrrk.', 'krrRrrrk', 'krrrrRrk', '.krrrrkw', '..kkkkww', '......ww'], pal: { r: '#c8483a', R: '#e87a5a' } }
  };
  const miniCache = {};
  function mini(name) {
    if (!miniCache[name]) miniCache[name] = G.Pix.paint(MINI[name].rows, MINI[name].pal);
    return miniCache[name];
  }

  function clear() { parts = []; rings = []; arcs = []; beams = []; bolts = []; texts = []; marks = []; }

  // ---------------- crear ----------------

  function burst(x, y, col, n = 10, spd = 120, life = 0.45) {
    if (parts.length > 700) n = Math.min(n, 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, v = spd * (0.3 + Math.random() * 0.7);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: life * (0.6 + Math.random() * 0.6), max: life, col, s: Math.random() < 0.3 ? 4 : 2, g: 260 });
    }
  }

  function spark(x, y, col, dx, dy, n = 4) {
    for (let i = 0; i < n; i++) {
      const a = Math.atan2(dy, dx) + G.U.rand(-0.6, 0.6), v = G.U.rand(80, 200);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.2, max: 0.2, col, s: 2, g: 0 });
    }
  }

  /** Polvo de un paso: dos o tres motas que salen hacia atrás y se posan. */
  function dust(x, y, face) {
    for (let i = 0; i < 3; i++) {
      parts.push({ x: x + G.U.rand(-3, 3), y: y + G.U.rand(-1, 1) + G.LIFT, vx: -face * G.U.rand(15, 45), vy: G.U.rand(-25, -8),
                   life: 0.35, max: 0.35, col: G.U.rand(0, 1) < 0.5 ? '#e8dcc0' : '#c9b896', s: 2, g: 60 });
    }
  }

  /** Humo/polvo que sube despacio. */
  function puff(x, y, col, n = 5) {
    for (let i = 0; i < n; i++) {
      parts.push({ x: x + G.U.rand(-8, 8), y: y + G.U.rand(-4, 4), vx: G.U.rand(-20, 20), vy: G.U.rand(-40, -15), life: 0.6, max: 0.6, col, s: 4, g: -10 });
    }
  }

  function ring(x, y, r0, r1, col, life = 0.35, w = 4) { rings.push({ x, y, r0, r1, col, life, max: life, w }); }

  /** Corte en arco: a = ángulo central, arc = apertura, r = radio. */
  function slash(x, y, a, arc, r, col, life = 0.18, style = 'slash') { arcs.push({ x, y, a, arc, r, col, life, max: life, style }); }

  /** Golpe recto (brazo de goma, corte a distancia...). */
  function beam(x1, y1, x2, y2, w, col, life = 0.18, style = 'line') { beams.push({ x1, y1, x2, y2, w, col, life, max: life, style }); }

  /** Rayo quebrado entre dos puntos. */
  function bolt(x1, y1, x2, y2, col = '#ffe14d', life = 0.18) {
    const pts = [[x1, y1]];
    const n = Math.max(3, Math.floor(G.U.dist(x1, y1, x2, y2) / 18));
    for (let i = 1; i < n; i++) {
      const t = i / n;
      pts.push([G.U.lerp(x1, x2, t) + G.U.rand(-9, 9), G.U.lerp(y1, y2, t) + G.U.rand(-9, 9)]);
    }
    pts.push([x2, y2]);
    bolts.push({ pts, col, life, max: life });
  }

  /** Marca en el suelo (aviso de ataque o sombra de lo que cae). */
  function mark(x, y, r, col, life, kind = 'circle', extra = {}) {
    const m = Object.assign({ x, y, r, col, life, max: life, kind }, extra);
    marks.push(m);
    return m;
  }

  function text(x, y, txt, col = '#ffffff', big = false) {
    if (texts.length > 60) texts.shift();
    texts.push({ x: x + G.U.rand(-6, 6), y, txt, col, life: big ? 0.9 : 0.6, max: big ? 0.9 : 0.6, big });
  }

  // ---------------- actualizar ----------------

  function update(dt) {
    for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vx *= 0.96; }
    parts = parts.filter(p => p.life > 0);
    for (const l of [rings, arcs, beams, bolts, texts, marks]) for (const o of l) o.life -= dt;
    rings = rings.filter(o => o.life > 0); arcs = arcs.filter(o => o.life > 0);
    beams = beams.filter(o => o.life > 0); bolts = bolts.filter(o => o.life > 0);
    texts = texts.filter(o => o.life > 0); marks = marks.filter(o => o.life > 0);
    for (const t of texts) t.y -= dt * 40;
  }

  // ---------------- dibujar ----------------

  /** Lo que va pegado al suelo (antes que los personajes). */
  function drawUnder(ctx, now) {
    for (const m of marks) {
      const k = 1 - m.life / m.max;
      ctx.globalAlpha = 0.25 + 0.35 * k;
      ctx.fillStyle = m.col;
      if (m.kind === 'line') {
        ctx.save();
        ctx.translate(m.x, m.y); ctx.rotate(m.a);
        ctx.fillRect(0, -m.w / 2, m.len, m.w);
        ctx.globalAlpha = 0.8;
        ctx.fillRect(0, -1, m.len * k, 2);
        ctx.restore();
      } else {
        ctx.beginPath(); ctx.ellipse(m.x, m.y, m.r, m.r * 0.6, 0, 0, 6.283); ctx.fill();
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = m.col; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(m.x, m.y, m.r * k, m.r * 0.6 * k, 0, 0, 6.283); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  /** Lo que va por encima de todo. */
  function drawOver(ctx) {
    for (const r of rings) {
      const k = 1 - r.life / r.max;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = r.col; ctx.lineWidth = r.w;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, G.U.lerp(r.r0, r.r1, k), G.U.lerp(r.r0, r.r1, k) * 0.7, 0, 0, 6.283); ctx.stroke();
    }
    for (const s of arcs) {
      const k = 1 - s.life / s.max;
      ctx.globalAlpha = 1 - k * 0.7;
      ctx.strokeStyle = s.col;
      const y = s.y - G.LIFT;
      const lines = s.style === 'slash3' ? 3 : 1;
      for (let i = 0; i < lines; i++) {
        ctx.lineWidth = (lines > 1 ? 3 : 6) * (1 - k * 0.5);
        const rr = s.r * (0.75 + i * 0.15) * (0.85 + k * 0.2);
        const sweep = s.arc * Math.min(1, k * 2.5);
        ctx.beginPath(); ctx.ellipse(s.x, y, rr, rr * 0.75, 0, s.a - s.arc / 2, s.a - s.arc / 2 + sweep); ctx.stroke();
      }
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(s.x, y, s.r, s.r * 0.75, 0, s.a - s.arc / 2, s.a - s.arc / 2 + s.arc * Math.min(1, k * 2.5)); ctx.stroke();
    }
    for (const b of beams) {
      const k = 1 - b.life / b.max;
      const y1 = b.y1 - G.LIFT, y2 = b.y2 - G.LIFT;
      ctx.globalAlpha = 1;
      if (b.style === 'fist') {
        // Brazo estirado: piel con contorno y el puño al final.
        const ext = k < 0.5 ? k * 2 : 1 - (k - 0.5) * 2;
        const ex = G.U.lerp(b.x1, b.x2, ext), ey = G.U.lerp(y1, y2, ext);
        ctx.lineCap = 'butt';
        ctx.strokeStyle = '#1a1220'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(b.x1, y1); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = '#f8c99c'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(b.x1, y1); ctx.lineTo(ex, ey); ctx.stroke();
        const img = mini('fist');
        ctx.drawImage(img, ex - 6, ey - 6, 12, 12);
        if (b.col !== '#ff5f5f') { ctx.globalAlpha = 0.6; ctx.drawImage(mini('firefist'), ex - 6, ey - 6, 12, 12); }
      } else {
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = b.col; ctx.lineWidth = b.w * (1 - k * 0.6);
        ctx.beginPath(); ctx.moveTo(b.x1, y1); ctx.lineTo(b.x2, y2); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, b.w * 0.3 * (1 - k));
        ctx.beginPath(); ctx.moveTo(b.x1, y1); ctx.lineTo(b.x2, y2); ctx.stroke();
      }
    }
    for (const b of bolts) {
      ctx.globalAlpha = Math.min(1, b.life / b.max * 2);
      ctx.strokeStyle = b.col; ctx.lineWidth = 4;
      ctx.beginPath();
      b.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y - G.LIFT) : ctx.moveTo(x, y - G.LIFT));
      ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    }
    for (const p of parts) {
      ctx.globalAlpha = Math.min(1, p.life / p.max * 1.6);
      ctx.fillStyle = p.col;
      ctx.fillRect(Math.round(p.x / 2) * 2, Math.round((p.y - G.LIFT) / 2) * 2, p.s, p.s);
    }
    ctx.globalAlpha = 1;
  }

  /** Números de daño, en la capa de pantalla (nítidos). */
  function drawTexts(ctx, scale) {
    if (!G.Save.settings().dmgNums) return;
    ctx.textAlign = 'center';
    for (const t of texts) {
      const [sx, sy] = G.Camera.toScreen(t.x, t.y - G.LIFT - 10);
      const k = t.life / t.max;
      ctx.globalAlpha = Math.min(1, k * 3);
      const size = Math.round((t.big ? 13 : 9) * scale);
      ctx.font = '700 ' + size + 'px Pixelify, monospace';
      ctx.fillStyle = '#1a1220';
      ctx.fillText(t.txt, sx + 2, sy + 2);
      ctx.fillStyle = t.col;
      ctx.fillText(t.txt, sx, sy);
    }
    ctx.globalAlpha = 1;
  }

  return { clear, burst, spark, dust, puff, ring, slash, beam, bolt, mark, text, update, drawUnder, drawOver, drawTexts, mini };
})();
