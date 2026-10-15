/* ============ enemies.js — Marina, piratas y jefes ============
 *
 * behavior (entities/enemy.js):
 *   chase    va directo a por ti
 *   ranged   se queda a distancia y dispara
 *   tank     lento y con mucha vida
 *   beamer   láser con aviso en el suelo (Pacifista)
 *   charger  se para, apunta y embiste (jefes)
 *   fan      lanza cuchillos en abanico (Buggy)
 *   zoner    zonas de arena bajo tus pies que estallan (Crocodile, Imu)
 * hover: true  flota (vaivén suave en vez de pasos)
 *
 * `from` = segundo de dificultad en que empieza a salir (ver Spawner); `w` = peso en la bolsa.
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

  // Cada isla tiene su jefe (data/islands.js): sale al llamarlo con el Den Den Mushi.
  const BOSSES = [
    { id: 'morgan',    name: 'Capitán Morgan',  title: 'Mano de Hacha',  sprite: 'morgan',    hp: 1100, spd: 62, dmg: 22, xp: 160, behavior: 'charger' },
    { id: 'imu',       name: 'Imu',             title: 'Ocupante del Trono Vacío', sprite: 'imu', hp: 2600, spd: 50, dmg: 28, xp: 320, behavior: 'zoner', hover: true },
    { id: 'buggy',     name: 'Buggy',           title: 'El Payaso',      sprite: 'buggy',     hp: 2200, spd: 58, dmg: 26, xp: 300, behavior: 'fan' },
    { id: 'arlong',    name: 'Arlong',          title: 'Diente de Sierra', sprite: 'arlong',  hp: 3600, spd: 70, dmg: 32, xp: 480, behavior: 'charger' },
    { id: 'crocodile', name: 'Crocodile',       title: 'Señor 0',        sprite: 'crocodile', hp: 5400, spd: 60, dmg: 36, xp: 700, behavior: 'zoner' }
  ];
  const BOSS_BY_ID = Object.fromEntries(BOSSES.map(b => [b.id, b]));

  // Los activos ahora (ver data/scope.js).
  const ACTIVE = LIST.filter(e => !G.SCOPE || G.SCOPE.enemies.includes(e.id));

  /** Enemigos que pueden salir en el segundo t (con sus pesos). */
  function bagAt(t) { return ACTIVE.filter(e => t >= e.from); }

  return { LIST, BOSSES, BOSS_BY_ID, bagAt };
})();
