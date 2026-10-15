/* ============ islands.js — las islas del viaje, agrupadas en sagas ============
 * Una partida es una saga: sus islas en orden, manteniendo nivel y técnicas.
 * En cada isla: cofres repartidos, un Den Den Mushi que llama al jefe y el
 * Going Merry en el muelle, que se abre al derrotarlo.
 *
 *   biome    aspecto del terreno (G.World.BIOMES)
 *   boss     id de G.Enemies.BOSSES (las islas cuyo jefe aún no existe no se activan)
 *   radius   radio de la isla en tiles
 *   chests   cofres repartidos por la isla
 */
G.Islands = (() => {
  /** Segundos de exploración antes del Buster Call. */
  const BUSTER_AT = 180;

  const SAGAS = [
    { id: 'eastblue', name: 'Saga de East Blue', islands: [
      { id: 'shells',   name: 'Shells Town',   sub: 'La base del capitán Morgan', biome: 0, boss: 'morgan',   radius: 48, chests: 5 },
      { id: 'orange',   name: 'Orange Town',   sub: 'El pueblo tomado por Buggy',  biome: 0, boss: 'buggy',    radius: 50, chests: 5 },
      { id: 'syrup',    name: 'Villa Syrup',   sub: 'La mansión de Kaya',          biome: 0, boss: 'kuro',     radius: 52, chests: 5 },
      { id: 'baratie',  name: 'Baratie',       sub: 'El restaurante en el mar',    biome: 0, boss: 'krieg',    radius: 40, chests: 4 },
      { id: 'arlong',   name: 'Arlong Park',   sub: 'Villa Cocoyashi',             biome: 0, boss: 'arlong',   radius: 54, chests: 6 }
    ] },
    { id: 'grandline', name: 'Saga de Alabasta', islands: [
      { id: 'littlegarden', name: 'Little Garden', sub: 'La isla de los gigantes', biome: 0, boss: 'mr3',       radius: 54, chests: 6 },
      { id: 'drum',         name: 'Isla de Drum',  sub: 'El reino nevado',          biome: 2, boss: 'wapol',     radius: 52, chests: 6 },
      { id: 'alabasta',     name: 'Alabasta',      sub: 'El Reino de la Arena',     biome: 1, boss: 'crocodile', radius: 58, chests: 6 }
    ] },
    { id: 'sky', name: 'Del cielo a Thriller Bark', islands: [
      { id: 'skypiea',    name: 'Skypiea',       sub: 'La isla del cielo',         biome: 2, boss: 'enel',  radius: 56, chests: 6 },
      { id: 'enieslobby', name: 'Enies Lobby',   sub: 'La isla judicial',          biome: 0, boss: 'lucci', radius: 52, chests: 6 },
      { id: 'thriller',   name: 'Thriller Bark', sub: 'El barco-isla fantasma',    biome: 3, boss: 'moria', radius: 56, chests: 6 }
    ] }
  ];

  // Las activas ahora (ver data/scope.js): de momento, la primera saga.
  const on = i => (!G.SCOPE || G.SCOPE.islands.includes(i.id)) && !!G.Enemies.BOSS_BY_ID[i.boss];
  const SAGA = Object.assign({}, SAGAS[0], { islands: SAGAS[0].islands.filter(on) });

  return { BUSTER_AT, SAGAS, SAGA };
})();
