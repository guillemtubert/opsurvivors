/* ============ crew.js — los Sombrero de Paja jugables ============
 *   hp     vida máxima          spd   velocidad (unidades de mundo / s)
 *   atk    multiplicador de daño cost  berries para reclutarlo (0 = de serie)
 *   start  técnica con la que empieza
 */
G.Crew = (() => {
  const ALL = [
    { id: 'luffy', name: 'Monkey D. Luffy', title: 'Sombrero de Paja', bounty: '3.000.000.000',
      hp: 120, spd: 112, atk: 1.0, cost: 0, start: 'pistol',
      desc: 'Hombre de goma. Golpes que se estiran y empujan a los enemigos.' },
    { id: 'zoro', name: 'Roronoa Zoro', title: 'Cazador de Piratas', bounty: '1.111.000.000',
      hp: 115, spd: 104, atk: 1.15, cost: 600, start: 'onigiri',
      desc: 'Espadachín de tres espadas. Cortes potentes de cerca y a distancia.' },
    { id: 'nami', name: 'Nami', title: 'Gata Ladrona', bounty: '366.000.000',
      hp: 85, spd: 116, atk: 0.95, cost: 900, start: 'thunderbolt',
      desc: 'Navegante con el Clima-Tact: rayos que saltan entre enemigos.' },
    { id: 'usopp', name: 'Usopp', title: 'Dios Usopp', bounty: '500.000.000',
      hp: 90, spd: 110, atk: 0.95, cost: 900, start: 'kayaku',
      desc: 'Francotirador. Disparos explosivos y trampas Pop Green.' },
    { id: 'sanji', name: 'Sanji', title: 'Pierna Negra', bounty: '1.032.000.000',
      hp: 115, spd: 122, atk: 1.05, cost: 0, start: 'collier',          // gratis mientras se prueba (antes 1400)
      desc: 'Cocinero que sólo pelea con las piernas. Rápido y en llamas.' },
    { id: 'chopper', name: 'Tony Tony Chopper', title: 'Amante del Algodón de Azúcar', bounty: '1.000',
      hp: 135, spd: 100, atk: 0.95, cost: 1600, start: 'kokutei',
      desc: 'Médico reno. Aguanta mucho, se cura y se potencia con Rumble Ball.' },
    { id: 'robin', name: 'Nico Robin', title: 'Niña Demonio', bounty: '930.000.000',
      hp: 95, spd: 108, atk: 1.05, cost: 2000, start: 'cien',
      desc: 'Arqueóloga de la Hana Hana: brazos que brotan bajo los enemigos.' }
  ];
  const BY_ID = {};
  for (const c of ALL) BY_ID[c.id] = c;
  // Los que se pueden elegir ahora (ver data/scope.js).
  const LIST = ALL.filter(c => !G.SCOPE || G.SCOPE.crew.includes(c.id));
  return { ALL, LIST, BY_ID };
})();
