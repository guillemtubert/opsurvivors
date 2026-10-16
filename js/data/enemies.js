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
 * Cada saga elige sus enemigos normales (data/islands.js: enemies). Los de cada saga
 * empiezan igual de fuertes, porque cada saga se juega desde nivel 1.
 * `from` = segundo de dificultad en que empieza a salir (ver Spawner); `w` = peso en la bolsa.
 * invincible: true  jefe de una isla de huida: no se le puede vencer
 * split: n         al morir se divide en dos más pequeños, n veces (el limo de Caesar)
 * La vida y el daño crecen con el tiempo (ver Spawner).
 */
G.Enemies = (() => {
  const LIST = [
    { id: 'marine',    name: 'Marine',          sprite: 'marine',    from: 0,   w: 10, hp: 18,  spd: 73, dmg: 6,  xp: 3,  behavior: 'chase' },
    { id: 'pirate',    name: 'Pirata',          sprite: 'pirate',    from: 0,   w: 7,  hp: 13,  spd: 95, dmg: 5,  xp: 3,  behavior: 'chase' },
    { id: 'rifle',     name: 'Marine tirador',  sprite: 'rifle',     from: 45,  w: 5,  hp: 16,  spd: 65, dmg: 5,  xp: 4,  behavior: 'ranged', shot: 9 },
    // Uno por saga (los dibujos son provisionales).
    { id: 'baroque',     name: 'Billions',          sprite: 'baroque',     from: 0,  w: 10, hp: 18, spd: 78, dmg: 6, xp: 3, behavior: 'chase' },
    { id: 'enelsoldier', name: 'Soldado de Enel',   sprite: 'enelsoldier', from: 0,  w: 10, hp: 16, spd: 68, dmg: 5, xp: 3, behavior: 'ranged', shot: 8 },
    { id: 'cp9agent',    name: 'Agente del CP9',    sprite: 'cp9agent',    from: 0,  w: 10, hp: 16, spd: 92, dmg: 6, xp: 3, behavior: 'chase' },
    { id: 'zombie',      name: 'Zombi',             sprite: 'zombie',      from: 0,  w: 10, hp: 30, spd: 60, dmg: 7, xp: 4, behavior: 'tank' },
    { id: 'pacifista',   name: 'Pacifista',         sprite: 'pacifista',   from: 40, w: 2,  hp: 80, spd: 55, dmg: 12, xp: 12, behavior: 'beamer' },
    { id: 'fishman',     name: 'Pirata hombre-pez', sprite: 'fishman',     from: 0,  w: 10, hp: 28, spd: 68, dmg: 7, xp: 4, behavior: 'tank' },
    { id: 'toysoldier',  name: 'Soldado de juguete', sprite: 'toysoldier', from: 0,  w: 10, hp: 15, spd: 80, dmg: 6, xp: 3, behavior: 'chase' },
    { id: 'chess',       name: 'Chess Soldier',     sprite: 'chess',       from: 0,  w: 10, hp: 22, spd: 70, dmg: 7, xp: 4, behavior: 'chase' },
    { id: 'gifter',      name: 'Gifter',            sprite: 'gifter',      from: 0,  w: 10, hp: 32, spd: 66, dmg: 8, xp: 4, behavior: 'tank' },
    // Invocados por jefes (no salen solos).
    { id: 'slime',       name: 'Shinokuni',         sprite: 'slime',       from: 0,  w: 0,  hp: 60, spd: 62, dmg: 8, xp: 2, behavior: 'chase', split: 2 },
    { id: 'seraphim',    name: 'Seraphim',          sprite: 'seraphim',    from: 0,  w: 10, hp: 24, spd: 70, dmg: 7, xp: 4, behavior: 'ranged', shot: 8 }
  ];

  // Cada isla tiene su jefe (data/islands.js): sale al llamarlo con el Den Den Mushi.
  // Cada saga empieza de cero (nivel 1): la vida sube isla a isla dentro de la saga,
  // y cada saga empieza algo más fuerte que la anterior. Sus ataques, en entities/bosses.js.
  const BOSSES = [
    // East Blue
    { id: 'smoker',    name: 'Smoker',         title: 'El Cazador Blanco',      sprite: 'smoker',    hp: 9999, spd: 108, dmg: 20, xp: 0, invincible: true },
    { id: 'morgan',    name: 'Capitán Morgan', title: 'Mano de Hacha',          sprite: 'morgan',    hp: 1100, spd: 68, dmg: 22, xp: 160 },
    { id: 'buggy',     name: 'Buggy',          title: 'El Payaso',              sprite: 'buggy',     hp: 1600, spd: 64, dmg: 24, xp: 220 },
    { id: 'kuro',      name: 'Capitán Kuro',   title: 'El de los Mil Planes',   sprite: 'kuro',      hp: 2100, spd: 73, dmg: 26, xp: 280 },
    { id: 'krieg',     name: 'Don Krieg',      title: 'El Almirante Pirata',    sprite: 'krieg',     hp: 2700, spd: 53, dmg: 28, xp: 340 },
    { id: 'arlong',    name: 'Arlong',         title: 'Diente de Sierra',       sprite: 'arlong',    hp: 3300, spd: 70, dmg: 30, xp: 420 },
    // Alabasta
    { id: 'mr9',       name: 'Mr. 9',          title: 'Baroque Works',          sprite: 'mr9',       hp: 500,  spd: 70, dmg: 14, xp: 90 },
    { id: 'wednesday', name: 'Miss Wednesday', title: 'Baroque Works',          sprite: 'wednesday', hp: 450,  spd: 76, dmg: 14, xp: 90 },
    { id: 'mr5',       name: 'Mr. 5',          title: 'Bomu Bomu',              sprite: 'mr5',       hp: 800,  spd: 60, dmg: 18, xp: 130 },
    { id: 'valentine', name: 'Miss Valentine', title: 'Kilo Kilo',              sprite: 'valentine', hp: 700,  spd: 70, dmg: 18, xp: 130 },
    { id: 'mr3',       name: 'Mr. 3',          title: 'El Hombre de Cera',      sprite: 'mr3',       hp: 1800, spd: 59, dmg: 26, xp: 260 },
    { id: 'wapol',     name: 'Wapol',          title: 'Baku Baku',              sprite: 'wapol',     hp: 2600, spd: 55, dmg: 30, xp: 340 },
    { id: 'crocodile', name: 'Crocodile',      title: 'Señor 0',                sprite: 'crocodile', hp: 3500, spd: 64, dmg: 32, xp: 440 },
    // Del cielo a Thriller Bark
    { id: 'bellamy',   name: 'Bellamy',        title: 'La Hiena',               sprite: 'bellamy',   hp: 1500, spd: 80, dmg: 26, xp: 220 },
    { id: 'enel',      name: 'Enel',           title: 'El Dios de Skypiea',     sprite: 'enel',      hp: 2200, spd: 68, dmg: 32, xp: 300 },
    { id: 'foxy',      name: 'Foxy',           title: 'El Zorro Plateado',      sprite: 'foxy',      hp: 1500, spd: 60, dmg: 24, xp: 220 },
    { id: 'franky',    name: 'Franky',         title: 'El Cyborg',              sprite: 'franky',    hp: 2200, spd: 66, dmg: 30, xp: 300 },
    { id: 'lucci',     name: 'Rob Lucci',      title: 'CP9',                    sprite: 'lucci',     hp: 3100, spd: 77, dmg: 34, xp: 400 },
    { id: 'garp',      name: 'Monkey D. Garp', title: 'El Héroe de la Marina',  sprite: 'garp',      hp: 9999, spd: 100, dmg: 30, xp: 0, invincible: true },
    { id: 'perona',    name: 'Perona',         title: 'La Princesa Fantasma',   sprite: 'perona',    hp: 1500, spd: 64, dmg: 22, xp: 220, hover: true },
    { id: 'oars',      name: 'Oars',           title: 'El Gigante Zombi',       sprite: 'oars',      hp: 2400, spd: 40, dmg: 34, xp: 320 },
    { id: 'kizaru',    name: 'Kizaru',         title: 'Almirante de la Marina', sprite: 'kizaru',    hp: 9999, spd: 70,  dmg: 26, xp: 0, invincible: true },
    { id: 'hancock',   name: 'Boa Hancock',    title: 'La Emperatriz Pirata',   sprite: 'hancock',   hp: 1600, spd: 72,  dmg: 26, xp: 240 },
    { id: 'magellan',  name: 'Magellan',       title: 'Alcaide de Impel Down',  sprite: 'magellan',  hp: 9999, spd: 66,  dmg: 26, xp: 0, invincible: true },
    { id: 'akainu',    name: 'Akainu',         title: 'Almirante de la Marina', sprite: 'akainu',    hp: 9999, spd: 74,  dmg: 30, xp: 0, invincible: true },
    { id: 'rayleigh',  name: 'Silvers Rayleigh', title: 'El Rey Oscuro',        sprite: 'rayleigh',  hp: 2600, spd: 90,  dmg: 30, xp: 360 },
    { id: 'px1',       name: 'Pacifista PX-1', title: 'Arma humana',            sprite: 'px1',       hp: 1500, spd: 52,  dmg: 26, xp: 220 },
    { id: 'hody',      name: 'Hody Jones',     title: 'Nuevos Piratas Gyojin',  sprite: 'hody',      hp: 2400, spd: 70,  dmg: 30, xp: 340 },
    { id: 'caesar',    name: 'Caesar Clown',   title: 'El Maestro del Gas',     sprite: 'caesar',    hp: 1600, spd: 64,  dmg: 26, xp: 240, hover: true },
    { id: 'doflamingo', name: 'Donquixote Doflamingo', title: 'El Demonio Celestial', sprite: 'doflamingo', hp: 2600, spd: 78, dmg: 32, xp: 380 },
    { id: 'jack',      name: 'Jack',           title: 'La Sequía',              sprite: 'jack',      hp: 1600, spd: 66,  dmg: 28, xp: 240 },
    { id: 'katakuri',  name: 'Charlotte Katakuri', title: 'El Comandante Dulce', sprite: 'katakuri', hp: 2600, spd: 80,  dmg: 32, xp: 380 },
    { id: 'bigmom',    name: 'Big Mom',        title: 'Una de los Cuatro Emperadores', sprite: 'bigmom', hp: 9999, spd: 70, dmg: 32, xp: 0, invincible: true },
    { id: 'moria',     name: 'Gecko Moria',    title: 'Shichibukai',            sprite: 'moria',     hp: 4000, spd: 48, dmg: 36, xp: 500 },
    // Sin isla todavía
    { id: 'imu',       name: 'Imu',            title: 'Ocupante del Trono Vacío', sprite: 'imu',     hp: 4500, spd: 55, dmg: 38, xp: 600, hover: true }
  ];
  const BOSS_BY_ID = Object.fromEntries(BOSSES.map(b => [b.id, b]));

  const BY_ID = Object.fromEntries(LIST.map(e => [e.id, e]));

  /** Enemigos que pueden salir en el segundo t (con sus pesos): los de la saga (ids). */
  function bagAt(t, ids = ['marine']) {
    const bag = ids.map(id => BY_ID[id]).filter(e => e && t >= e.from);
    return bag.length ? bag : [BY_ID[ids[0]] || BY_ID.marine];
  }

  return { LIST, BY_ID, BOSSES, BOSS_BY_ID, bagAt };
})();
