/* ============ upgrades.js — mejoras permanentes (se compran con berries) ============
 * Son de toda la tripulación. Cada nivel cuesta base × (nivel+1)^1.5.
 */
G.Upgrades = (() => {
  const LIST = [
    { id: 'hp',     icon: 'heart',  name: 'Carne extra',     desc: '+10 de vida máxima por nivel.',            max: 10, base: 80,  per: 10 },
    { id: 'atk',    icon: 'fist',   name: 'Entrenamiento',   desc: '+5% de daño por nivel.',                    max: 10, base: 110, per: 0.05 },
    { id: 'spd',    icon: 'boot',   name: 'Piernas rápidas', desc: '+3% de velocidad por nivel.',               max: 5,  base: 90,  per: 0.03 },
    { id: 'cd',     icon: 'clock',  name: 'Reflejos',        desc: '-3% de recarga por nivel.',                 max: 8,  base: 120, per: 0.03 },
    { id: 'def',    icon: 'shield', name: 'Piel dura',       desc: '+3% de reducción de daño por nivel.',       max: 8,  base: 120, per: 0.03 },
    { id: 'regen',  icon: 'sprout', name: 'Descanso',        desc: '+0,3 de vida por segundo por nivel.',       max: 5,  base: 140, per: 0.3 },
    { id: 'magnet', icon: 'magnet', name: 'Ojo avizor',      desc: '+12% de radio de recogida por nivel.',      max: 5,  base: 70,  per: 0.12 },
    { id: 'gold',   icon: 'coin',   name: 'Codicia',         desc: '+10% de berries ganados por nivel.',        max: 10, base: 150, per: 0.10 },
    { id: 'xp',     icon: 'book',   name: 'Bitácora',        desc: '+5% de experiencia por nivel.',             max: 8,  base: 130, per: 0.05 },
    { id: 'reroll', icon: 'cards',  name: 'Otra carta',      desc: '+1 cambio de cartas por partida.',          max: 3,  base: 400, per: 1 }
  ];
  const BY_ID = {};
  for (const u of LIST) BY_ID[u.id] = u;

  function level(id) { return G.Save.data.upg[id] || 0; }
  function cost(u, lvl) { return Math.round(u.base * Math.pow(lvl + 1, 1.5) / 10) * 10; }

  function buy(id) {
    const u = BY_ID[id], lvl = level(id);
    if (lvl >= u.max) return false;
    if (!G.Save.spend(cost(u, lvl))) return false;
    G.Save.data.upg[id] = lvl + 1;
    G.Save.commit();
    return true;
  }

  /** Mejoras ya resueltas para empezar una partida. */
  function perks() {
    const v = id => level(id) * BY_ID[id].per;
    return {
      hp: v('hp'), atkMul: 1 + v('atk'), spdMul: 1 + v('spd'), cdMul: 1 - v('cd'),
      dmgReduce: v('def'), regen: v('regen'), magnetMul: 1 + v('magnet'),
      goldMul: 1 + v('gold'), xpMul: 1 + v('xp'), rerolls: v('reroll')
    };
  }

  return { LIST, BY_ID, level, cost, buy, perks };
})();
