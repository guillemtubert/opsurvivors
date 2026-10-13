/* ============ main.js — arranque ============ */
(() => {
  const NEED = ['U', 'Save', 'Pix', 'Camera', 'Input', 'Audio', 'SPRITES', 'Moves', 'Crew', 'Enemies', 'Upgrades',
                'World', 'FX', 'Projectiles', 'Enemy', 'EnemyMgr', 'Hazards', 'Pickups', 'Player',
                'Combat', 'Spawner', 'LevelUp', 'Icons', 'HUD', 'UI', 'Game'];

  function boot() {
    const miss = NEED.filter(k => !window.G || !G[k]);
    const el = document.getElementById('boot');
    if (miss.length) {
      el.innerHTML = 'No se pudo cargar el juego.<br><button class="btn gold" onclick="location.reload()">Recargar</button>';
      console.warn('[Arranque] faltan:', miss.join(', '));
      return;
    }
    // Espera a la fuente pixel para que la interfaz no salte al cargarla.
    const ready = document.fonts && document.fonts.load ? document.fonts.load('16px Pixelify') : Promise.resolve();
    ready.catch(() => {}).then(() => {
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
