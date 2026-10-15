/* ============ enemies.js — Marina, piratas y jefes ============
 *
 * behavior (entities/enemy.js):
 *   chase    va directo a por ti
 *   ranged   se queda a distancia y dispara
 *   tank     lento y con mucha vida
 *   beamer   láser con aviso en el suelo (Pacifista)
 * Los jefes no llevan behavior: cada uno tiene sus propios ataques en entities/bosses.js.
 * hover: true  flota (vaivén suave en vez de pasos)
 *
 * `from` = segundo de dificultad en que empieza a salir (ver Spawner); `w` = peso en la bolsa.
 * La vida y el daño crecen con el tiempo (ver Spawner).
 */
G.Enemies = (() => {
  const LIST = [
    { id: 'marine',    name: 'Marine',          sprite: 'marine',    from: 0,   w: 10, hp: 18,  spd: 73, dmg: 6,  xp: 3,  behavior: 'chase' },
    { id: 'pirate',    name: 'Pirata',          sprite: 'pirate',    from: 0,   w: 7,  hp: 13,  spd: 95, dmg: 5,  xp: 3,  behavior: 'chase' },
    { id: 'rifle',     name: 'Marine tirador',  sprite: 'rifle',     from: 45,  w: 5,  hp: 16,  spd: 65, dmg: 5,  xp: 4,  behavior: 'ranged', shot: 9 },
    { id: 'fishman',   name: 'Hombre-pez',      sprite: 'fishman',   from: 110, w: 5,  hp: 62,  spd: 63, dmg: 11, xp: 9,  behavior: 'tank' },
    { id: 'pacifista', name: 'Pacifista',       sprite: 'pacifista', from: 290, w: 2,  hp: 190, spd: 55, dmg: 16, xp: 20, behavior: 'beamer' }
  ];

  // Cada isla tiene su jefe (data/islands.js): sale al llamarlo con el Den Den Mushi.
  // Cada saga empieza de cero (nivel 1): la vida sube isla a isla dentro de la saga,
  // y cada saga empieza algo más fuerte que la anterior. Sus ataques, en entities/bosses.js.
  const BOSSES = [
    // East Blue
    { id: 'morgan',    name: 'Capitán Morgan', title: 'Mano de Hacha',          sprite: 'morgan',    hp: 1100, spd: 68, dmg: 22, xp: 160 },
    { id: 'buggy',     name: 'Buggy',          title: 'El Payaso',              sprite: 'buggy',     hp: 1600, spd: 64, dmg: 24, xp: 220 },
    { id: 'kuro',      name: 'Capitán Kuro',   title: 'El de los Mil Planes',   sprite: 'kuro',      hp: 2100, spd: 73, dmg: 26, xp: 280 },
    { id: 'krieg',     name: 'Don Krieg',      title: 'El Almirante Pirata',    sprite: 'krieg',     hp: 2700, spd: 53, dmg: 28, xp: 340 },
    { id: 'arlong',    name: 'Arlong',         title: 'Diente de Sierra',       sprite: 'arlong',    hp: 3300, spd: 70, dmg: 30, xp: 420 },
    // Alabasta
    { id: 'mr3',       name: 'Mr. 3',          title: 'El Hombre de Cera',      sprite: 'mr3',       hp: 1800, spd: 59, dmg: 26, xp: 260 },
    { id: 'wapol',     name: 'Wapol',          title: 'Baku Baku',              sprite: 'wapol',     hp: 2600, spd: 55, dmg: 30, xp: 340 },
    { id: 'crocodile', name: 'Crocodile',      title: 'Señor 0',                sprite: 'crocodile', hp: 3500, spd: 64, dmg: 32, xp: 440 },
    // Del cielo a Thriller Bark
    { id: 'enel',      name: 'Enel',           title: 'El Dios de Skypiea',     sprite: 'enel',      hp: 2200, spd: 68, dmg: 32, xp: 300 },
    { id: 'lucci',     name: 'Rob Lucci',      title: 'CP9',                    sprite: 'lucci',     hp: 3100, spd: 77, dmg: 34, xp: 400 },
    { id: 'moria',     name: 'Gecko Moria',    title: 'Shichibukai',            sprite: 'moria',     hp: 4000, spd: 48, dmg: 36, xp: 500 },
    // Sin isla todavía
    { id: 'imu',       name: 'Imu',            title: 'Ocupante del Trono Vacío', sprite: 'imu',     hp: 4500, spd: 55, dmg: 38, xp: 600, hover: true }
  ];
  const BOSS_BY_ID = Object.fromEntries(BOSSES.map(b => [b.id, b]));

  // Los activos ahora (ver data/scope.js).
  const ACTIVE = LIST.filter(e => !G.SCOPE || G.SCOPE.enemies.includes(e.id));

  /** Enemigos que pueden salir en el segundo t (con sus pesos). */
  function bagAt(t) { return ACTIVE.filter(e => t >= e.from); }

  return { LIST, BOSSES, BOSS_BY_ID, bagAt };
})();
