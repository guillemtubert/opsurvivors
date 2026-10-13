/* ============ moves.js — técnicas de la tripulación ============
 *
 * kind (comportamiento, implementado en systems/combat.js):
 *   projectile  dispara `count` proyectiles al enemigo más cercano (splash = explota)
 *   melee       golpe en arco alrededor del personaje
 *   beam        golpe recto que atraviesa (el brazo de goma, un corte a distancia...)
 *   orbit       cosas que giran alrededor mientras la técnica está activa
 *   nova        ráfaga radial en todas las direcciones
 *   aura        círculo de daño continuo alrededor
 *   cone        muchos golpes cortos en abanico (Gatling)
 *   chain       golpea a uno y salta a los `count` siguientes
 *   meteor      cae algo sobre `count` enemigos cercanos (la sombra avisa)
 *   mine        trampas en el suelo que estallan al pisarlas
 *   buff        potencia al propio personaje (acumulable, caduca)
 *
 * Sólo la técnica ACTIVA se ejecuta (como en PokéSurvivor). Se cambia con 1-4 / Q / E.
 * `owner` = tripulante que la tiene ('all' = cualquiera).
 * `vis`   = cómo se dibuja (entities/fx.js).
 */
(() => {
  const LADDERS = {
    projectile: [
      { t: '+1 proyectil',                  m: { count: 1, spread: 1.3 } },
      { t: '+45% daño',                     m: { dmg: 1.45 } },
      { t: '-25% recarga',                  m: { cd: 0.75 } },
      { t: '+1 proyectil y +1 perforación', m: { count: 1, pierce: 1 } }
    ],
    melee: [
      { t: '+40% daño',                     m: { dmg: 1.40 } },
      { t: '+25% alcance',                  m: { radius: 1.25 } },
      { t: '-25% recarga',                  m: { cd: 0.75 } },
      { t: 'Golpea en 360° y +50% daño',    m: { arc: 9, dmg: 1.50 } }
    ],
    beam: [
      { t: '+45% daño',                     m: { dmg: 1.45 } },
      { t: '+30% alcance y grosor',         m: { radius: 1.30, width: 1.30 } },
      { t: '-25% recarga',                  m: { cd: 0.75 } },
      { t: '+1 golpe extra y +30% daño',    m: { count: 1, dmg: 1.30 } }
    ],
    orbit: [
      { t: '+1 orbe',                       m: { count: 1 } },
      { t: '+55% daño',                     m: { dmg: 1.55 } },
      { t: '+25% radio y gira más rápido',  m: { radius: 1.25, speed: 1.35 } },
      { t: '+1 orbe y +55% daño',           m: { count: 1, dmg: 1.55 } }
    ],
    nova: [
      { t: '+4 golpes',                     m: { count: 4 } },
      { t: '+40% daño',                     m: { dmg: 1.40 } },
      { t: '-25% recarga',                  m: { cd: 0.75 } },
      { t: '+4 golpes y +1 perforación',    m: { count: 4, pierce: 1 } }
    ],
    aura: [
      { t: '+30% radio',                    m: { radius: 1.30 } },
      { t: '+45% daño',                     m: { dmg: 1.45 } },
      { t: 'Golpea un 40% más a menudo',    m: { cd: 0.70 } },
      { t: '+30% radio y +50% daño',        m: { radius: 1.30, dmg: 1.50 } }
    ],
    cone: [
      { t: '+3 golpes',                     m: { count: 3 } },
      { t: '+40% daño',                     m: { dmg: 1.40 } },
      { t: '+30% alcance',                  m: { life: 1.30 } },
      { t: '+3 golpes y +1 perforación',    m: { count: 3, pierce: 1 } }
    ],
    chain: [
      { t: '+2 saltos',                     m: { count: 2 } },
      { t: '+45% daño',                     m: { dmg: 1.45 } },
      { t: '-25% recarga',                  m: { cd: 0.75 } },
      { t: '+2 saltos y +40% daño',         m: { count: 2, dmg: 1.40 } }
    ],
    meteor: [
      { t: '+1 impacto',                    m: { count: 1 } },
      { t: '+45% daño',                     m: { dmg: 1.45 } },
      { t: '+30% radio',                    m: { radius: 1.30 } },
      { t: '+2 impactos y -20% recarga',    m: { count: 2, cd: 0.80 } }
    ],
    mine: [
      { t: '+1 trampa',                     m: { count: 1 } },
      { t: '+50% daño',                     m: { dmg: 1.50 } },
      { t: '+30% radio de explosión',       m: { radius: 1.30 } },
      { t: '+1 trampa y -25% recarga',      m: { count: 1, cd: 0.75 } }
    ],
    buff: [
      { t: '+1 acumulación máxima',         m: { stacks: 1 } },
      { t: '+40% potencia',                 m: { amount: 1.40 } },
      { t: '+50% duración',                 m: { dur: 1.50 } },
      { t: '+1 acumulación y +40% potencia', m: { stacks: 1, amount: 1.40 } }
    ]
  };

  const LIST = [
    // ---------------- Luffy ----------------
    { id: 'pistol', owner: 'luffy', name: 'Gomu Gomu no Pistol', elem: 'rubber', kind: 'beam', vis: 'fist',
      desc: 'Estira el brazo y atraviesa todo lo que pilla en línea.',
      dmg: 26, cd: 1.0, radius: 190, width: 16, count: 1, knock: 140, sfx: 'stretch' },
    { id: 'gatling', owner: 'luffy', name: 'Gomu Gomu no Gatling', elem: 'rubber', kind: 'cone', vis: 'fist',
      desc: 'Una lluvia de puñetazos en abanico.',
      dmg: 9, cd: 1.1, count: 7, speed: 420, life: 0.32, size: 9, spread: 0.85, pierce: 1, knock: 40, sfx: 'punch' },
    { id: 'bazooka', owner: 'luffy', name: 'Gomu Gomu no Bazooka', elem: 'rubber', kind: 'melee', vis: 'palm',
      desc: 'Empujón a dos manos que lanza lejos a los enemigos.',
      dmg: 34, cd: 1.6, radius: 70, arc: 1.6, knock: 420, sfx: 'punch' },
    { id: 'redhawk', owner: 'luffy', name: 'Red Hawk', elem: 'fire', kind: 'projectile', vis: 'firefist',
      desc: 'Puñetazo en llamas que explota y quema.',
      dmg: 30, cd: 1.5, count: 1, speed: 360, size: 12, life: 0.9, pierce: 0, splash: 48, burn: 4, sfx: 'fire' },

    // ---------------- Zoro ----------------
    { id: 'onigiri', owner: 'zoro', name: 'Oni Giri', elem: 'slash', kind: 'melee', vis: 'slash3',
      desc: 'Tres espadas cortan en arco delante de ti.',
      dmg: 30, cd: 0.9, radius: 66, arc: 2.0, knock: 90, sfx: 'slash' },
    { id: 'pound', owner: 'zoro', name: '36 Pound Hō', elem: 'slash', kind: 'projectile', vis: 'crescent',
      desc: 'Lanza un corte de aire que atraviesa enemigos.',
      dmg: 22, cd: 1.1, count: 1, speed: 420, size: 14, life: 0.9, pierce: 3, sfx: 'slash' },
    { id: 'tatsumaki', owner: 'zoro', name: 'Tatsumaki', elem: 'slash', kind: 'aura', vis: 'tornado',
      desc: 'Un remolino de cortes a tu alrededor.',
      dmg: 9, cd: 0.42, radius: 72, sfx: 'slash' },
    { id: 'shishi', owner: 'zoro', name: 'Shishi Sonson', elem: 'slash', kind: 'beam', vis: 'cut',
      desc: 'Un corte instantáneo en línea recta, devastador.',
      dmg: 58, cd: 2.2, radius: 220, width: 14, count: 1, knock: 60, sfx: 'slash' },

    // ---------------- Nami ----------------
    { id: 'thunderbolt', owner: 'nami', name: 'Thunderbolt Tempo', elem: 'storm', kind: 'chain', vis: 'bolt',
      desc: 'Un rayo que salta de enemigo en enemigo.',
      dmg: 20, cd: 1.1, count: 4, sfx: 'thunder' },
    { id: 'lance', owner: 'nami', name: 'Thunder Lance', elem: 'storm', kind: 'meteor', vis: 'lightning',
      desc: 'Rayos caen del cielo sobre los enemigos.',
      dmg: 30, cd: 1.6, count: 3, radius: 40, sfx: 'thunder' },
    { id: 'coolball', owner: 'nami', name: 'Cool Ball', elem: 'storm', kind: 'orbit', vis: 'cloud',
      desc: 'Nubecillas eléctricas que giran a tu alrededor.',
      dmg: 11, count: 3, radius: 64, speed: 3.2, size: 12, sfx: 'thunder' },
    { id: 'mirage', owner: 'nami', name: 'Mirage Tempo', elem: 'storm', kind: 'buff', vis: 'buff',
      desc: 'Te vuelves difícil de ver: menos daño recibido.',
      buff: 'def', amount: 0.12, stacks: 3, dur: 9, cd: 1.0 },

    // ---------------- Usopp ----------------
    { id: 'kayaku', owner: 'usopp', name: 'Kayaku Boshi', elem: 'shot', kind: 'projectile', vis: 'pellet',
      desc: 'Un perdigón explosivo con el tirachinas.',
      dmg: 18, cd: 0.75, count: 1, speed: 470, size: 7, life: 1.0, pierce: 0, splash: 40, sfx: 'shoot' },
    { id: 'popgreen', owner: 'usopp', name: 'Pop Green', elem: 'shot', kind: 'mine', vis: 'plant',
      desc: 'Siembra plantas trampa que estallan al pisarlas.',
      dmg: 38, cd: 1.8, count: 2, radius: 54, dur: 9, sfx: 'shoot' },
    { id: 'leadstar', owner: 'usopp', name: 'Lead Star', elem: 'shot', kind: 'projectile', vis: 'bullet',
      desc: 'Disparo de plomo rápido y certero.',
      dmg: 15, cd: 0.45, count: 1, speed: 640, size: 5, life: 0.8, pierce: 1, sfx: 'shoot' },
    { id: 'kabuto', owner: 'usopp', name: 'Atlas Suisei', elem: 'shot', kind: 'meteor', vis: 'cannon',
      desc: 'Una lluvia de perdigones desde lo alto.',
      dmg: 26, cd: 1.7, count: 4, radius: 36, sfx: 'boom' },

    // ---------------- Sanji ----------------
    { id: 'collier', owner: 'sanji', name: 'Collier Shoot', elem: 'slash', kind: 'melee', vis: 'kick',
      desc: 'Patada giratoria que golpea a tu alrededor.',
      dmg: 26, cd: 0.95, radius: 62, arc: 3.4, knock: 120, sfx: 'punch' },
    { id: 'diable', owner: 'sanji', name: 'Diable Jambe', elem: 'fire', kind: 'aura', vis: 'flames',
      desc: 'Tu pierna arde: quema a quien se acerca.',
      dmg: 10, cd: 0.45, radius: 60, burn: 3, sfx: 'fire' },
    { id: 'concasse', owner: 'sanji', name: 'Concassé', elem: 'fire', kind: 'meteor', vis: 'stomp',
      desc: 'Saltas y caes con una patada sobre el enemigo.',
      dmg: 44, cd: 1.6, count: 1, radius: 56, sfx: 'boom' },
    { id: 'mouton', owner: 'sanji', name: 'Mouton Shot', elem: 'fire', kind: 'nova', vis: 'kickwave',
      desc: 'Ráfaga de patadas en todas las direcciones.',
      dmg: 14, cd: 1.5, count: 8, speed: 300, size: 9, life: 0.5, pierce: 1, sfx: 'punch' },

    // ---------------- Chopper ----------------
    { id: 'kokutei', owner: 'chopper', name: 'Kokutei Roseo', elem: 'medic', kind: 'melee', vis: 'hoof',
      desc: 'Golpe de pezuña en forma de cerezo.',
      dmg: 28, cd: 1.0, radius: 58, arc: 1.8, knock: 160, sfx: 'punch' },
    { id: 'rumble', owner: 'chopper', name: 'Rumble Ball', elem: 'medic', kind: 'buff', vis: 'buff',
      desc: 'Más fuerza durante un rato. Acumulable.',
      buff: 'atk', amount: 0.15, stacks: 3, dur: 10, cd: 1.0 },
    { id: 'guard', owner: 'chopper', name: 'Guard Point', elem: 'medic', kind: 'aura', vis: 'fur',
      desc: 'Te inflas de pelo: aplasta a los que te rodean.',
      dmg: 8, cd: 0.5, radius: 56, knock: 60, sfx: 'punch' },
    { id: 'medicine', owner: 'chopper', name: 'Medicina', elem: 'medic', kind: 'buff', vis: 'buff',
      desc: 'Regeneras vida durante un rato.',
      buff: 'regen', amount: 2.2, stacks: 3, dur: 10, cd: 1.0 },

    // ---------------- Robin ----------------
    { id: 'cien', owner: 'robin', name: 'Cien Fleur: Clutch', elem: 'flower', kind: 'meteor', vis: 'hands',
      desc: 'Brotan brazos bajo los enemigos y los aprietan.',
      dmg: 28, cd: 1.3, count: 3, radius: 34, sfx: 'punch' },
    { id: 'seis', owner: 'robin', name: 'Seis Fleur: Slap', elem: 'flower', kind: 'chain', vis: 'petals',
      desc: 'Manos que abofetean a varios enemigos seguidos.',
      dmg: 17, cd: 0.95, count: 5, sfx: 'punch' },
    { id: 'mil', owner: 'robin', name: 'Mil Fleur', elem: 'flower', kind: 'nova', vis: 'petals',
      desc: 'Pétalos-mano salen disparados alrededor.',
      dmg: 13, cd: 1.3, count: 10, speed: 280, size: 8, life: 0.55, pierce: 1, sfx: 'punch' },
    { id: 'wings', owner: 'robin', name: 'Cien Fleur: Wing', elem: 'flower', kind: 'orbit', vis: 'petals',
      desc: 'Alas de manos que giran a tu alrededor.',
      dmg: 12, count: 2, radius: 58, speed: 3.6, size: 11, sfx: 'punch' },

    // ---------------- comunes ----------------
    { id: 'cannon', owner: 'all', name: 'Cañonazo', elem: 'shot', kind: 'meteor', vis: 'cannon',
      desc: 'El barco dispara balas de cañón a tus enemigos.',
      dmg: 34, cd: 2.0, count: 2, radius: 48, sfx: 'boom' },
    { id: 'flintlock', owner: 'all', name: 'Pistola de chispa', elem: 'shot', kind: 'projectile', vis: 'bullet',
      desc: 'Pistola pirata de toda la vida.',
      dmg: 16, cd: 0.7, count: 1, speed: 560, size: 5, life: 0.8, pierce: 0, sfx: 'shoot' },
    { id: 'armament', owner: 'all', name: 'Haki de Armadura', elem: 'haki', kind: 'buff', vis: 'buff',
      desc: 'Endurece tu cuerpo: más daño. Acumulable.',
      buff: 'atk', amount: 0.12, stacks: 3, dur: 10, cd: 1.0 },
    { id: 'observation', owner: 'all', name: 'Haki de Observación', elem: 'haki', kind: 'buff', vis: 'buff',
      desc: 'Lees los movimientos: más velocidad.',
      buff: 'spd', amount: 0.10, stacks: 3, dur: 10, cd: 1.0 },
    { id: 'conqueror', owner: 'all', name: 'Haki del Rey', elem: 'haki', kind: 'nova', vis: 'haki',
      desc: 'Una onda de voluntad que golpea a todo el que te rodea.',
      dmg: 16, cd: 2.0, count: 12, speed: 260, size: 10, life: 0.6, pierce: 2, knock: 160, sfx: 'boom' }
  ];

  const BY_ID = {};
  for (const m of LIST) BY_ID[m.id] = m;

  // Campos que mejoran de forma multiplicativa / aditiva.
  const MUL = ['dmg', 'cd', 'speed', 'radius', 'dur', 'amount', 'arc', 'width', 'life', 'spread'];
  const ADD = ['count', 'pierce', 'stacks'];

  /** Copia de una técnica con su nivel (1 = recién aprendida). */
  function instance(id, lvl = 1) {
    const m = Object.assign({}, BY_ID[id], { lvl: 1, t: 0 });
    for (let i = 1; i < lvl; i++) levelUp(m);
    return m;
  }

  function levelUp(m) {
    const step = LADDERS[m.kind][m.lvl - 1];
    if (!step) return false;
    for (const [k, v] of Object.entries(step.m)) {
      if (MUL.includes(k)) m[k] = (m[k] || 1) * v;
      else if (ADD.includes(k)) m[k] = (m[k] || 0) + v;
    }
    // El arco no pasa de una vuelta completa.
    if (m.arc) m.arc = Math.min(m.arc, 6.3);
    m.lvl++;
    return true;
  }

  function nextUpText(m) {
    const step = LADDERS[m.kind][m.lvl - 1];
    return step ? step.t : null;
  }

  /** Técnicas que puede aprender un tripulante. */
  function poolFor(crewId) { return LIST.filter(m => m.owner === crewId || m.owner === 'all').map(m => m.id); }

  G.Moves = { LIST, BY_ID, LADDERS, instance, levelUp, nextUpText, poolFor, MAX_LVL: 5 };
})();
