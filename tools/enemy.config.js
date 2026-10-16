/* Generado por tools/auto-enemy.js. No editar a mano: se vuelve a generar. */
const REF = 'assets/ref/characters/';

module.exports = {
  chars: {
  mars: {
      sheet: REF + 'mars/Atlas_mars.png',
      bgFlat: { color: '#ebebeb', thr: 12, r: 2, fringe: 1 },
      height: 46, colors: 24,
      fps: { idle: 1, walk: 7, attack: 6 },
      anims: {
        idle: [[35, 5, 275, 260]],
        walk: [[35, 5, 275, 260], [345, 5, 270, 260], [645, 5, 270, 260], [35, 285, 280, 240]],
        attack: [[5, 1035, 350, 215]]
      }
    },
  }
};
