/* ============ enemies.js — Marina, piratas y jefes ============
 *
 * behavior (entities/enemy.js):
 *   chase    va directo a por ti
 *   ranged   se queda a distancia y dispara
 *   tank     lento y con mucha vida
 *   beamer   láser con aviso en el suelo (Pacifista)
 *   charger  se para, apunta y embiste (jefes)
 *   fan      lanza cuchillos en abanico (Buggy)
 *   zoner    zonas de arena bajo tus pies que estallan (Crocodile)
 *
 * `from` = segundo de la run en que empieza a salir; `w` = peso en la bolsa.
 * La vida y el daño crecen con el tiempo (ver Spawner).
 */
G.Enemies = (() => {
  const LIST = [
    { id: 'marine',    name: 'Marine',          sprite: 'marine',    from: 0,   w: 10, hp: 18,  spd: 58, dmg: 6,  xp: 3,  behavior: 'chase' },
    { id: 'pirate',    name: 'Pirata',          sprite: 'pirate',    from: 0,   w: 7,  hp: 13,  spd: 76, dmg: 5,  xp: 3,  behavior: 'chase' },
    { id: 'rifle',     name: 'Marine tirador',  sprite: 'rifle',     from: 45,  w: 5,  hp: 16,  spd: 52, dmg: 5,  xp: 4,  behavior: 'ranged', shot: 9 },
    { id: 'fishman',   name: 'Hombre-pez',      sprite: 'fishman',   from: 110, w: 5,  hp: 62,  spd: 50, dmg: 11, xp: 9,  behavior: 'tank' },
    { id: 'pacifista', name: 'Pacifista',       sprite: 'pacifista', from: 290, w: 2,  hp: 190, spd: 44, dmg: 16, xp: 20, behavior: 'beamer' }
  ];

  const BOSSES = [
    { id: 'morgan',    name: 'Capitán Morgan',  title: 'Mano de Hacha',  sprite: 'morgan',    at: 150, hp: 1100, spd: 62, dmg: 22, xp: 160, behavior: 'charger' },
    { id: 'buggy',     name: 'Buggy',           title: 'El Payaso',      sprite: 'buggy',     at: 330, hp: 2200, spd: 58, dmg: 26, xp: 300, behavior: 'fan' },
    { id: 'arlong',    name: 'Arlong',          title: 'Diente de Sierra', sprite: 'arlong',  at: 510, hp: 3600, spd: 70, dmg: 32, xp: 480, behavior: 'charger' },
    { id: 'crocodile', name: 'Crocodile',       title: 'Señor 0',        sprite: 'crocodile', at: 690, hp: 5400, spd: 60, dmg: 36, xp: 700, behavior: 'zoner' }
  ];
  // Tras el último, vuelven en bucle cada 3 minutos y cada vuelta más fuertes.
  const LOOP_EVERY = 180;

  /** Jefe que toca en el índice i (0, 1, 2...). */
  function bossAt(i) {
    const round = Math.floor(i / BOSSES.length);
    const b = BOSSES[i % BOSSES.length];
    const k = Math.pow(2.2, round);
    const at = i < BOSSES.length ? b.at : BOSSES[BOSSES.length - 1].at + (i - BOSSES.length + 1) * LOOP_EVERY;
    return Object.assign({}, b, { at, hp: b.hp * k, dmg: b.dmg * (1 + round * 0.4), xp: b.xp * (1 + round) });
  }

  /** Enemigos que pueden salir en el segundo t (con sus pesos). */
  function bagAt(t) { return LIST.filter(e => t >= e.from); }

  return { LIST, BOSSES, bossAt, bagAt };
})();
