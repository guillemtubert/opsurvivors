/* ============ save.js — partida guardada en localStorage ============
 * Una sola partida por navegador:
 *   berries     moneda para desbloquear tripulantes y comprar mejoras
 *   crew        tripulantes desbloqueados
 *   captain     el que juegas
 *   upg         nivel de cada mejora permanente
 *   best        mejor tiempo (segundos) por tripulante
 *   sagas       sagas completadas (abren la siguiente)
 *   stats       totales (kills, runs, jefes)
 *   settings    sonido, sacudidas, números de daño
 */
G.Save = (() => {
  const KEY = 'ops.save.v1';
  const DEFAULT = () => ({
    berries: 0,
    crew: ['luffy'],
    captain: 'luffy',
    upg: {},
    best: {},
    sagas: [],
    stats: { kills: 0, runs: 0, bosses: 0, time: 0 },
    settings: { music: 0.5, sfx: 0.7, shake: true, dmgNums: true }
  });

  let data = DEFAULT();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      const base = DEFAULT();
      data = Object.assign(base, d, {
        stats: Object.assign(base.stats, d.stats),
        settings: Object.assign(base.settings, d.settings)
      });
    }
  } catch (e) { console.warn('[Save] partida dañada, se empieza de cero', e); }

  function commit() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { console.warn('[Save] no se pudo guardar', e); }
  }

  return {
    get data() { return data; },
    settings() { return data.settings; },
    commit,
    owns(id) { return data.crew.includes(id); },
    spend(n) {
      if (data.berries < n) return false;
      data.berries -= n; commit(); return true;
    },
    reset() { data = DEFAULT(); commit(); }
  };
})();
