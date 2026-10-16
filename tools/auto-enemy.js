/* ============ auto-enemy.js — enemigos normales a partir de su atlas de Treasure Cruise ============
 *
 *   node tools/auto-enemy.js            todos los de ENEMIES
 *   node tools/auto-enemy.js <id>       uno
 *
 * Detecta las figuras del atlas (componentes conexos), toma las de cuerpo entero (las de
 * altura parecida a la mayor) y las usa como pasos de andar, en el orden de izquierda a
 * derecha. Si el atlas trae una pose más ancha que alta, la usa de ataque. Escribe el
 * resultado en tools/enemy.config.js, que lo lee build-sprites.js.
 */
const fs = require('fs'), path = require('path');
const P = require('./pixelize');
const { decode } = require('./png');

const ROOT = path.join(__dirname, '..');
const REF = 'assets/ref/characters/';

/** id del enemigo -> carpeta y archivo del atlas. */
const ENEMIES = {
  baroque:    'baroque/Atlas_baroque.png',
  enelsoldier:'enelsoldier/Atlas_enelsoldier.png',
  cp9agent:   'cp9agent/Atlas_cp9agent.png',
  zombie:     'zombie/Atlas_zombie.png',
  pacifista:  'pacifista/Atlas_pacifista.png',
  fishman:    'fishman/Atlas_fishman.png',
  toysoldier: 'toysoldier/Atlas_toysoldier.png',
  chess:      'chess/Atlas_chess.png',
  gifter:     'gifter/Atlas_gifter.png',
  mars:       'mars/Atlas_mars.png',
  jupiter:    'jupiter/Atlas_jupiter.png',
  venus:      'venus/Atlas_venus.png',
  mercury:    'mercury/Atlas_mercury.png',
  saturn:     'saturn/Atlas_saturn.png'
};

/** Fondo del atlas: transparente (alfa 0 en la esquina) o un color liso. */
function background(img) {
  const i = 0;
  if (img.data[i + 3] < 128) return null;
  return '#' + [0, 1, 2].map(c => img.data[c].toString(16).padStart(2, '0')).join('');
}

function frames(id) {
  const img0 = decode(fs.readFileSync(path.join(ROOT, REF, ENEMIES[id])));
  const bg = background(img0);
  const img = bg ? P.removeFlatBg(img0, bg, 30, 2, 1, false) : img0;
  // Figuras de cuerpo entero: las de altura cercana a la mayor (los efectos son más pequeños o anchos).
  const boxes = P.components(img, 6, 300).sort((a, b) => b.h - a.h);
  if (!boxes.length) throw new Error(id + ': no hay figuras en el atlas');
  const top = boxes[0].h;
  const body = boxes.filter(b => b.h >= top * 0.8 && b.w < b.h * 1.1);
  const walk = body.slice(0, 8).sort((a, b) => a.x - b.x).map(b => [b.x, b.y, b.w, b.h]);
  const wide = boxes.filter(b => b.w > b.h * 1.3 && b.h > top * 0.4).sort((a, b) => b.w * b.h - a.w * a.h)[0];
  return { bg, walk, attack: wide ? [[wide.x, wide.y, wide.w, wide.h]] : [] };
}

function write(ids) {
  const out = [];
  for (const id of ids) {
    const f = frames(id);
    if (f.walk.length < 2) { console.log(id + ': menos de 2 pasos (se queda como estaba)'); continue; }
    const bgLine = f.bg ? `      bgFlat: { color: '${f.bg}', thr: 30, r: 2, fringe: 1 },\n` : '';
    out.push(`  ${id}: {\n      sheet: REF + '${ENEMIES[id]}',\n${bgLine}      height: 46, colors: 24,\n` +
      `      fps: { idle: 1, walk: 7${f.attack.length ? ', attack: 6' : ''} },\n` +
      `      anims: {\n        idle: [[${f.walk[0].join(', ')}]],\n` +
      `        walk: [${f.walk.map(b => '[' + b.join(', ') + ']').join(', ')}]` +
      (f.attack.length ? `,\n        attack: [[${f.attack[0].join(', ')}]]` : '') + `\n      }\n    },\n`);
    console.log(id + ': ' + f.walk.length + ' pasos' + (f.attack.length ? ', 1 ataque' : ''));
  }
  const file = path.join(__dirname, 'enemy.config.js');
  fs.writeFileSync(file, `/* Generado por tools/auto-enemy.js. No editar a mano: se vuelve a generar. */\nconst REF = 'assets/ref/characters/';\n\nmodule.exports = {\n  chars: {\n${out.join('')}  }\n};\n`);
  console.log('escrito', path.relative(ROOT, file));
}

const only = process.argv[2];
write(only ? [only] : Object.keys(ENEMIES));
