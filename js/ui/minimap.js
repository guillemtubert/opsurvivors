/* ============ minimap.js — mapa de la isla en una esquina del HUD ============
 * Un lienzo pequeño (un píxel = un trozo de isla) escalado sin suavizado, así
 * que también es pixel art. La silueta se hornea al llegar a la isla; encima,
 * unas pocas veces por segundo: tú, los cofres que quedan, el Den Den Mushi,
 * el muelle y el jefe. Tocarlo lo amplía.
 */
G.Minimap = (() => {
  const N = 72;                         // píxeles de lado
  let cv, ctx, base = null, extent = 1, acc = 0;

  function init() {
    cv = document.getElementById('hud-map');
    cv.width = cv.height = N;
    ctx = cv.getContext('2d');
    cv.addEventListener('pointerdown', e => { e.stopPropagation(); cv.classList.toggle('big'); G.Audio.sfx('select'); });
  }

  /** Hornea la silueta de la isla actual. */
  function build() {
    const b = G.World.info;
    extent = G.World.radius * 1.2;
    base = document.createElement('canvas');
    base.width = base.height = N;
    const x = base.getContext('2d');
    const img = x.createImageData(N, N);
    const col = [null, b.water, b.ground[0]];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const [wx, wy] = toWorld(i + 0.5, j + 0.5);
      const w = G.World.waterAt(wx, wy);
      const c = col[w === 2 ? 0 : w === 1 ? 1 : 2];
      if (!c) continue;
      const n = parseInt(c.slice(1), 16), k = (j * N + i) * 4;
      img.data[k] = n >> 16; img.data[k + 1] = (n >> 8) & 255; img.data[k + 2] = n & 255; img.data[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    acc = 1;
  }

  const toWorld = (i, j) => [(i / N * 2 - 1) * extent, (j / N * 2 - 1) * extent];
  const toMap = (x, y) => [Math.floor((x / extent + 1) / 2 * N), Math.floor((y / extent + 1) / 2 * N)];

  function dot(x, y, col, s = 2) {
    const [i, j] = toMap(x, y);
    ctx.fillStyle = '#1a0e06';
    ctx.fillRect(i - (s >> 1) - 1, j - (s >> 1) - 1, s + 2, s + 2);
    ctx.fillStyle = col;
    ctx.fillRect(i - (s >> 1), j - (s >> 1), s, s);
  }

  function update(dt, pl, now) {
    acc += dt;
    if (!base || acc < 0.15) return;
    acc = 0;
    ctx.clearRect(0, 0, N, N);
    ctx.drawImage(base, 0, 0);
    const p = G.Island.pois();
    if (p) {
      const open = p.boss === 'dead' || p.escape;
      ctx.fillStyle = open ? '#ffd23f' : '#8a5a2e';
      const [a, b] = toMap(p.dock.x0, p.dock.y0), [c, d] = toMap(p.dock.x1, p.dock.y1);
      ctx.fillRect(a, b, Math.max(2, c - a), Math.max(2, d - b));
      dot(p.dock.shipX, p.dock.shipY, open ? '#ffd23f' : '#c9a46a', 3);
      if (!p.fog) for (const c of p.chests) if (!c.open) dot(c.x, c.y, '#ffd23f');
      if (p.merchant) dot(p.merchant.x, p.merchant.y, '#5fe0c0', 3);
      if (p.cursed && !p.cursed.open && !p.fog) dot(p.cursed.x, p.cursed.y, '#c86bff', 3);
      if (p.boss === 'idle' && !p.snail.none) dot(p.snail.x, p.snail.y, '#ff9ec4', 3);
    }
    if (Math.floor(now * 4) % 2 && !(p && p.fog)) for (const b of G.EnemyMgr.bosses()) dot(b.x, b.y, '#ff3a4a', 3);
    dot(pl.x, pl.y, '#ffffff', 2);
  }

  return { init, build, update };
})();
