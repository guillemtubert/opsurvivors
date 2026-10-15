/* ============ main.js — arranque ============ */
(() => {
  const NEED = ['U', 'Save', 'Pix', 'Paint', 'Camera', 'Input', 'Audio', 'SPRITES', 'Moves', 'Crew', 'Enemies', 'Upgrades',
                'Islands', 'Props', 'World', 'Island', 'FX', 'Projectiles', 'Enemy', 'EnemyMgr', 'Hazards', 'Pickups', 'Player',
                'Combat', 'Spawner', 'LevelUp', 'Icons', 'Minimap', 'HUD', 'UI', 'Game'];

  function boot() {
    const miss = NEED.filter(k => !window.G || !G[k]);
    const el = document.getElementById('boot');
    if (miss.length) {
      el.innerHTML = 'No se pudo cargar el juego.<br><button class="btn gold" onclick="location.reload()">Recargar</button>';
      console.warn('[Arranque] faltan:', miss.join(', '));
      return;
    }
    // Espera a la fuente pixel para que la interfaz no salte al cargarla.
    const font = document.fonts && document.fonts.load ? document.fonts.load('16px Pixelify').catch(() => {}) : Promise.resolve();
    // También las hojas de sprites propias (retratos) y los objetos sacados de un PNG.
    Promise.all([font, G.Pix.preloadCustom(), G.Props.preload()]).then(() => {
      G.HUD.init();
      G.UI.init();
      G.Game.init();
      el.remove();
      G.UI.show('scr-title');
    });
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
  else boot();
})();
