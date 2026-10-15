/* ============ islands.js — las islas del viaje, agrupadas en sagas ============
 * Una partida es una saga: sus islas en orden, manteniendo nivel y técnicas.
 * En cada isla: cofres repartidos, un Den Den Mushi que llama al jefe y el
 * Going Merry en el muelle, que se abre al derrotarlo.
 *
 *   biome    aspecto del terreno (G.World.BIOMES)
 *   boss     id de G.Enemies.BOSSES (las islas cuyo jefe aún no existe no se activan)
 *   scale    tamaño respecto a la isla normal: 1 = SIZE (unos 30 s de punta a punta),
 *            0.5 = la mitad de ancha, 2.5 = dos veces y media (por defecto 1)
 *   chests   cofres repartidos por la isla
 */
G.Islands = (() => {
  /** Segundos de exploración antes del Buster Call. */
  const BUSTER_AT = 180;
  /** Radio en tiles de una isla de escala 1. */
  const SIZE = 48;

  const SAGAS = [
    { id: 'eastblue', name: 'Saga de East Blue', islands: [
      { id: 'shells',   name: 'Shells Town',   sub: 'La base del capitán Morgan', biome: 0, boss: 'morgan',   scale: 1, chests: 5 },
      { id: 'orange',   name: 'Orange Town',   sub: 'El pueblo tomado por Buggy',  biome: 0, boss: 'buggy',    scale: 1, chests: 5 },
      { id: 'syrup',    name: 'Villa Syrup',   sub: 'La mansión de Kaya',          biome: 0, boss: 'kuro',     scale: 1, chests: 5 },
      { id: 'baratie',  name: 'Baratie',       sub: 'El restaurante en el mar',    biome: 0, boss: 'krieg',    scale: 1, chests: 5 },
      { id: 'arlong',   name: 'Arlong Park',   sub: 'Villa Cocoyashi',             biome: 0, boss: 'arlong',   scale: 1, chests: 6 }
    ] },
    { id: 'grandline', name: 'Saga de Alabasta', islands: [
      { id: 'littlegarden', name: 'Little Garden', sub: 'La isla de los gigantes', biome: 0, boss: 'mr3',       scale: 1, chests: 6 },
      { id: 'drum',         name: 'Isla de Drum',  sub: 'El reino nevado',          biome: 4, boss: 'wapol',     scale: 1, chests: 6 },
      { id: 'alabasta',     name: 'Alabasta',      sub: 'El Reino de la Arena',     biome: 1, boss: 'crocodile', scale: 1, chests: 6 }
    ] },
    { id: 'sky', name: 'Del cielo a Thriller Bark', islands: [
      { id: 'skypiea',    name: 'Skypiea',       sub: 'La isla del cielo',         biome: 2, boss: 'enel',  scale: 1, chests: 6 },
      { id: 'enieslobby', name: 'Enies Lobby',   sub: 'La isla judicial',          biome: 0, boss: 'lucci', scale: 1, chests: 6 },
      { id: 'thriller',   name: 'Thriller Bark', sub: 'El barco-isla fantasma',    biome: 3, boss: 'moria', scale: 1, chests: 6 }
    ] }
  ];

  // Las que se pueden jugar (ver data/scope.js): islas activas y con su jefe hecho.
  const on = i => (!G.SCOPE || G.SCOPE.islands.includes(i.id)) && !!G.Enemies.BOSS_BY_ID[i.boss];
  const PLAYABLE = SAGAS.map(s => Object.assign({}, s, { islands: s.islands.filter(on) })).filter(s => s.islands.length);
  let cur = 0;

  /** ¿Se puede jugar la saga i? La primera siempre; las demás, al completar la anterior. */
  function unlocked(i) {
    if (i <= 0 || (G.SCOPE && G.SCOPE.allSagas)) return true;
    return (G.Save.data.sagas || []).includes(PLAYABLE[i - 1].id);
  }

  /** Radio en tiles de una isla. */
  const radius = def => Math.round(SIZE * (def.scale || 1));

  return {
    BUSTER_AT, SIZE, SAGAS, PLAYABLE, radius, unlocked,
    /** La saga elegida en el puerto. */
    get SAGA() { return PLAYABLE[cur]; }, get index() { return cur; },
    select(i) { cur = Math.max(0, Math.min(PLAYABLE.length - 1, i)); }
  };
})();
