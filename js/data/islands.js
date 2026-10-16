/* ============ islands.js — las islas del viaje, agrupadas en sagas ============
 * Una partida es el viaje entero: todas las sagas seguidas, de Shells Town al Trono
 * Vacío, manteniendo nivel, técnicas y objetos. Si caes, vuelves a empezar.
 * En cada isla: cofres repartidos, un Den Den Mushi que llama al jefe y el
 * barco en el muelle, que se abre al derrotarlo.
 *
 *   biome    aspecto del terreno (G.World.BIOMES: 0 East Blue · 1 desierto · 2 cielo · 3 fantasma ·
 *            4 nieve · 5 Water 7 · 6 selva · 7 prisión · 8 manglar · 9 coral · 10 fuego y hielo ·
 *            11 Dressrosa · 12 dulces · 13 Wano · 14 futurista · 15 Elbaph · 16 mármol)
 *   boss     id de G.Enemies.BOSSES, o varios a la vez (dúo): ['mr9', 'wednesday']
 *            (las islas cuyos jefes aún no existen no se activan)
 *   escape   isla de huida: el jefe no se puede vencer, aparece al rato y te persigue;
 *            el barco está abierto desde el principio (no hay Den Den Mushi)
 *   ship     barco del muelle: 'merry' (por defecto) o 'sunny'
 *   scale    tamaño respecto a la isla normal: 1 = SIZE (unos 30 s de punta a punta),
 *            0.5 = la mitad de ancha, 2.5 = dos veces y media (por defecto 1)
 *   chests   cofres repartidos por la isla
 *
 * Cada saga lleva sus enemigos normales (enemies, ids de G.Enemies.LIST) y su barco.
 */
G.Islands = (() => {
  /** Segundos de exploración antes del Buster Call. */
  const BUSTER_AT = 120;
  /** Radio en tiles de una isla de escala 1. */
  const SIZE = 48;
  /** Segundos hasta que aparece el jefe de una isla de huida. */
  const ESCAPE_AT = 8;

  const SAGAS = [
    { id: 'eastblue', name: 'Saga de East Blue', enemies: ['marine'], islands: [
      { id: 'shells',     name: 'Shells Town',   sub: 'La base del capitán Morgan', biome: 0, boss: 'morgan' },
      { id: 'orange',     name: 'Orange Town',   sub: 'El pueblo tomado por Buggy', biome: 0, boss: 'buggy' },
      { id: 'syrup',      name: 'Villa Syrup',   sub: 'La mansión de Kaya',         biome: 0, boss: 'kuro' },
      { id: 'baratie',    name: 'Baratie',       sub: 'El restaurante en el mar',   biome: 0, boss: 'krieg' },
      { id: 'arlong',     name: 'Arlong Park',   sub: 'Villa Cocoyashi',            biome: 0, boss: 'arlong', chests: 6 },
      { id: 'loguetown',  name: 'Loguetown',     sub: 'Huye de Smoker',             biome: 0, boss: 'smoker', escape: true }
    ] },
    { id: 'grandline', name: 'Saga de Alabasta', enemies: ['baroque'], islands: [
      { id: 'reverse',      name: 'Reverse Mountain', sub: 'Cabo Gemelo y Laboon',          biome: 0, boss: ['mr9', 'wednesday'] },
      { id: 'whisky',       name: 'Whisky Peak',      sub: 'El pueblo de los cazarrecompensas', biome: 1, boss: ['mr5', 'valentine'] },
      { id: 'littlegarden', name: 'Little Garden',    sub: 'La isla de los gigantes',       biome: 6, boss: 'mr3' },
      { id: 'drum',         name: 'Isla de Drum',     sub: 'El reino nevado',               biome: 4, boss: 'wapol' },
      { id: 'alabasta',     name: 'Alabasta',         sub: 'El Reino de la Arena',          biome: 1, boss: 'crocodile', chests: 6 }
    ] },
    { id: 'sky', name: 'Saga de las Islas del Cielo', enemies: ['enelsoldier'], islands: [
      { id: 'jaya',    name: 'Jaya',     sub: 'Mock Town',         biome: 0, boss: 'bellamy' },
      { id: 'skypiea', name: 'Skypiea',  sub: 'La isla del cielo', biome: 2, boss: 'enel', chests: 6 }
    ] },
    { id: 'water7', name: 'Saga de Water 7', enemies: ['cp9agent'], islands: [
      { id: 'longring',   name: 'Long Ring Long Land', sub: 'El Davy Back Fight', biome: 0, boss: 'foxy' },
      { id: 'water7',     name: 'Water 7',     sub: 'La ciudad del agua',       biome: 5, boss: 'franky' },
      { id: 'enieslobby', name: 'Enies Lobby', sub: 'La isla judicial',         biome: 16, boss: 'lucci', chests: 6 },
      { id: 'postenies',  name: 'Water 7',     sub: 'Huye de Garp',             biome: 5, boss: 'garp', escape: true, ship: 'sunny' }
    ] },
    { id: 'thriller', name: 'Saga de Thriller Bark', enemies: ['zombie'], ship: 'sunny', islands: [
      { id: 'mansion',  name: 'Thriller Bark', sub: 'La mansión de Hogback', biome: 3, boss: 'perona' },
      { id: 'freezer',  name: 'Thriller Bark', sub: 'El congelador de Oars', biome: 3, boss: 'oars' },
      { id: 'thriller', name: 'Thriller Bark', sub: 'El mástil del barco',   biome: 3, boss: 'moria', chests: 6 }
    ] },
    { id: 'summit', name: 'Saga de la Guerra en la Cumbre', enemies: ['marine', 'pacifista'], ship: 'sunny', islands: [
      { id: 'sabaody',    name: 'Archipiélago Sabaody', sub: 'Huye de Kizaru',          biome: 8, boss: 'kizaru', escape: true },
      { id: 'amazon',     name: 'Amazon Lily',  sub: 'La isla de las mujeres',          biome: 6, boss: 'hancock' },
      { id: 'impeldown',  name: 'Impel Down',   sub: 'Huye de Magellan',                biome: 7, boss: 'magellan', escape: true },
      { id: 'marineford', name: 'Marineford',   sub: 'Huye de Akainu',                  biome: 0, boss: 'akainu', escape: true },
      { id: 'rusukaina',  name: 'Rusukaina',    sub: 'Dos años con Rayleigh',           biome: 6, boss: 'rayleigh' }
    ] },
    { id: 'gyojin', name: 'Saga de la Isla Gyojin', enemies: ['fishman'], ship: 'sunny', islands: [
      { id: 'resabaody', name: 'Archipiélago Sabaody', sub: 'Dos años después',     biome: 8, boss: 'px1' },
      { id: 'gyojin',    name: 'Isla Gyojin',         sub: 'El reino bajo el mar', biome: 9, boss: 'hody' }
    ] },
    { id: 'dressrosa', name: 'Saga de Dressrosa', enemies: ['toysoldier'], ship: 'sunny', islands: [
      { id: 'punkhazard', name: 'Punk Hazard', sub: 'Fuego y hielo',             biome: 10, boss: 'caesar' },
      { id: 'dressrosa',  name: 'Dressrosa',   sub: 'El reino de los juguetes',  biome: 11, boss: 'doflamingo' }
    ] },
    { id: 'wholecake', name: 'Saga de Whole Cake', enemies: ['chess'], ship: 'sunny', islands: [
      { id: 'zou',       name: 'Zou',       sub: 'El elefante que camina',   biome: 6, boss: 'jack' },
      { id: 'cacao',     name: 'Isla Cacao', sub: 'El espejo de Katakuri',    biome: 12, boss: 'katakuri' },
      { id: 'tottoland', name: 'Tottoland', sub: 'Huye de Big Mom',          biome: 12, boss: 'bigmom', escape: true }
    ] },
    { id: 'wano', name: 'Saga de Wano', enemies: ['gifter'], ship: 'sunny', islands: [
      { id: 'udon',       name: 'Udon',             sub: 'La prisión de Queen',  biome: 13, boss: 'queen' },
      { id: 'onitejado',  name: 'Onigashima',       sub: 'El tejado del castillo', biome: 13, boss: 'king' },
      { id: 'onigashima', name: 'Onigashima',       sub: 'La isla de Kaido',     biome: 13, boss: 'kaido', chests: 6 }
    ] },
    { id: 'final', name: 'Saga Final', enemies: ['seraphim'], ship: 'sunny', islands: [
      { id: 'egghead',  name: 'Egghead',          sub: 'La isla del futuro',        biome: 14, boss: 'saturn' },
      { id: 'elbaph',   name: 'Elbaph',           sub: 'El bosque de los gigantes', biome: 15, boss: 'loki' },
      { id: 'elbaph1',  name: 'Elbaph',           sub: 'Los Caballeros Sagrados',   biome: 15, boss: ['sommers', 'killingham'] },
      { id: 'elbaph2',  name: 'Elbaph',           sub: 'Los Caballeros Sagrados',   biome: 15, boss: 'gunko' },
      { id: 'elbaph3',  name: 'Elbaph',           sub: 'Los Caballeros Sagrados',   biome: 15, boss: 'shamrock' },
      { id: 'throne',   name: 'El Trono Vacío',   sub: 'Mary Geoise',               biome: 16, boss: 'imu', chests: 6 }
    ] }
  ];

  /** Ids de los jefes de una isla (siempre una lista). */
  const bossIds = def => [].concat(def.boss);

  // Las que se pueden jugar (ver data/scope.js): islas activas y con todos sus jefes hechos.
  const on = i => (!G.SCOPE || G.SCOPE.islands === 'all' || G.SCOPE.islands.includes(i.id)) &&
                  bossIds(i).every(id => G.Enemies.BOSS_BY_ID[id]);
  const PLAYABLE = SAGAS.map(s => Object.assign({}, s, { islands: s.islands.filter(on) })).filter(s => s.islands.length);

  /** El viaje: todas las islas jugables en orden, cada una con su saga y su número de saga. */
  const JOURNEY = [];
  PLAYABLE.forEach((saga, si) => saga.islands.forEach(def => JOURNEY.push({ def, saga, si })));

  /** Radio en tiles de una isla. */
  const radius = def => Math.round(SIZE * (def.scale || 1));

  /** Isla por la que empezar (sólo para probar): ?isla=<id> en la dirección. */
  function startIndex() {
    const id = new URLSearchParams(location.search).get('isla');
    const i = id ? JOURNEY.findIndex(j => j.def.id === id) : -1;
    return Math.max(0, i);
  }

  return { BUSTER_AT, SIZE, ESCAPE_AT, SAGAS, PLAYABLE, JOURNEY, radius, bossIds, startIndex };
})();
