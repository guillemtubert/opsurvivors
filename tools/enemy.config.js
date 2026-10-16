/* Generado por tools/auto-enemy.js. No editar a mano: se vuelve a generar. */
const REF = 'assets/ref/characters/';

module.exports = {
  chars: {
  mercury: {
      sheet: REF + 'mercury/Atlas_mercury.png',
      bgFlat: { color: '#ebebeb', thr: 12, r: 2, fringe: 1 },
      height: 46, colors: 24,
      fps: { idle: 1, walk: 7, attack: 6 },
      anims: {
        idle: [[8, 8, 341, 293]],
        walk: [[8, 8, 341, 293], [341, 8, 341, 293], [681, 8, 317, 293], [349, 309, 317, 277]],
        attack: [[1038, 1030, 380, 301]]
      }
    },
  }
};
