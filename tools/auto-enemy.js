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
  saturn:     'saturn/Atlas_saturn.png',
  navyhalberd:'marine/Atlas_0181.png',
  navypistol: 'marine/Atlas_0182.png',
  navyknuckle:'marine/Atlas_0184.png'
};

/** Atlas de un enemigo o jefe: assets/ref/characters/<id>/Atlas_<id>.png (salvo que esté en ENEMIES). */
const atlasOf = id => ENEMIES[id] || id + "/Atlas_" + id + ".png";

/** Fondo del atlas: transparente (alfa 0 en la esquina) o un color liso. */
function background(img) {
  const i = 0;
  if (img.data[i + 3] < 128) return null;
  return '#' + [0, 1, 2].map(c => img.data[c].toString(16).padStart(2, '0')).join('');
}

/** Poses elegidas a mano (coordenadas del atlas): tienen prioridad sobre la detección automática. */
const MANUAL = {
  navyhalberd: { bg: '#ebebeb', walk: [[75, 25, 120, 185], [330, 25, 120, 185], [585, 25, 120, 185]], attack: [[20, 830, 225, 175]] },
  navypistol:  { bg: '#ebebeb', walk: [[45, 30, 130, 175], [240, 30, 130, 175], [430, 30, 130, 175]], attack: [[240, 835, 140, 170]] },
  navyknuckle: { bg: '#ebebeb', walk: [[40, 30, 120, 175], [235, 30, 115, 175], [430, 30, 120, 175]], attack: [[20, 825, 130, 180]] },
  pacifista: { bg: '#ebebeb', walk: [[15, 55, 135, 215], [175, 55, 135, 215], [335, 55, 135, 215]], attack: [[210, 310, 230, 215]] },
  kaido: { bg: '#ebebeb', walk: [[300, 5, 210, 210], [510, 5, 210, 215], [300, 245, 210, 210], [510, 245, 210, 210]], attack: [[110, 600, 215, 200]] },
  queen: { bg: '#ebebeb', walk: [[10, 55, 240, 245], [260, 55, 240, 245], [495, 55, 240, 245], [725, 55, 240, 245]], attack: [[5, 1085, 250, 215]] },
  katakuri: { bg: '#ebebeb', walk: [[0, 0, 110, 205], [120, 0, 110, 205], [245, 0, 110, 205], [370, 0, 110, 205]], attack: [[500, 790, 170, 230]] },
  jack: { bg: '#ebebeb', walk: [[10, 10, 165, 240], [180, 10, 165, 240], [350, 10, 165, 240], [520, 10, 165, 240]], attack: [[10, 1040, 190, 180]] },
  doflamingo: { bg: '#ebebeb', walk: [[10, 55, 200, 200], [235, 55, 200, 200], [455, 55, 200, 200], [680, 55, 200, 200]], attack: [[460, 310, 200, 200]] },
  caesar: { bg: '#ebebeb', walk: [[20, 60, 160, 210], [210, 60, 165, 210], [400, 60, 165, 210], [595, 60, 165, 210]], attack: [[815, 60, 185, 210]] },
  hody: { bg: '#ebebeb', walk: [[15, 55, 110, 200], [145, 55, 115, 200], [280, 55, 125, 200], [400, 55, 115, 200]], attack: [[30, 890, 160, 180]] },
  rayleigh: { bg: '#ebebeb', walk: [[45, 70, 105, 190], [230, 70, 105, 190], [415, 70, 120, 190], [605, 70, 120, 190]], attack: [[540, 935, 195, 140]] },
  akainu: { bg: '#ebebeb', walk: [[10, 65, 125, 205], [140, 65, 125, 205], [270, 65, 125, 205], [410, 65, 125, 205]], attack: [[590, 300, 230, 130]] },
  magellan: { bg: '#ebebeb', walk: [[10, 55, 150, 225], [170, 55, 150, 225], [330, 55, 150, 225], [490, 60, 170, 215]], attack: [[690, 65, 210, 210]] },
  hancock: { bg: '#ebebeb', walk: [[15, 55, 100, 190], [145, 55, 100, 190], [270, 55, 100, 190], [400, 55, 100, 190]], attack: [[495, 265, 140, 185]] },
  kizaru: { bg: '#ebebeb', walk: [[20, 65, 135, 200], [180, 65, 135, 200], [335, 65, 135, 200], [500, 65, 135, 200]], attack: [[630, 610, 270, 190]] },
  oars: { bg: '#ebebeb', walk: [[20, 65, 225, 260], [340, 345, 280, 270], [660, 345, 320, 270]], attack: [[10, 345, 310, 270]] },
  perona: { bg: '#ebebeb', walk: [[15, 75, 100, 205], [140, 75, 100, 205], [265, 75, 100, 205], [400, 75, 100, 205]], attack: [[30, 315, 150, 170]] },
  garp: { bg: '#ebebeb', walk: [[30, 90, 130, 230], [225, 90, 130, 230], [420, 90, 130, 230], [620, 90, 130, 230]], attack: [[410, 375, 205, 180]] },
  franky: { bg: '#ebebeb', walk: [[20, 55, 165, 200], [60, 285, 165, 200], [300, 285, 165, 200], [655, 290, 165, 190]], attack: [[180, 855, 165, 200]] },
  foxy: { bg: '#ebebeb', walk: [[15, 55, 170, 190], [190, 55, 170, 190], [390, 55, 170, 190], [585, 55, 175, 190]], attack: [[180, 280, 135, 185]] },
  bellamy: { bg: '#ebebeb', walk: [[20, 60, 95, 200], [145, 60, 95, 200], [265, 60, 150, 200], [425, 60, 160, 200]], attack: [[30, 315, 190, 185]] },
  valentine: { bg: '#ebebeb', walk: [[40, 55, 110, 200], [230, 55, 110, 200], [420, 55, 120, 200]], attack: [[500, 810, 150, 230]] },
  mr5: { bg: '#ebebeb', walk: [[30, 75, 80, 180], [155, 75, 80, 180], [285, 75, 80, 180], [412, 75, 80, 180]], attack: [[305, 310, 130, 175]] },
  wednesday: { bg: '#ebebeb', walk: [[40, 55, 110, 205], [230, 55, 110, 205], [420, 55, 110, 205]], attack: [[15, 855, 150, 200]] },
  mr9: { bg: '#ebebeb', walk: [[45, 75, 125, 180], [200, 75, 120, 180], [360, 75, 120, 180]], attack: [[290, 850, 150, 200]] },
  smoker: { bg: '#ebebeb', walk: [[15, 80, 160, 180], [205, 80, 160, 180], [400, 80, 150, 180]], attack: [[700, 885, 330, 175]] },
  enelsoldier: { bg: '#ebebeb', walk: [[20, 85, 145, 170], [208, 85, 150, 170], [598, 85, 147, 170]], attack: [[280, 300, 300, 135]] },
  zombie:      { bg: '#ebebeb', walk: [[45, 55, 115, 180], [240, 55, 140, 180], [420, 55, 120, 180], [50, 885, 120, 170], [240, 885, 120, 170]], attack: [[25, 310, 165, 170]] },
  gifter:      { bg: '#ebebeb', walk: [[25, 75, 100, 150], [150, 75, 100, 150], [280, 75, 110, 150], [410, 85, 150, 140], [600, 85, 150, 140]], attack: [[40, 715, 120, 150]] },
  mars:        { bg: '#ebebeb', walk: [[35, 5, 275, 260], [345, 5, 270, 260], [645, 5, 270, 260], [35, 285, 280, 240]], attack: [[5, 1035, 350, 215]] },
  toysoldier:  { bg: '#ebebeb', walk: [[20, 55, 90, 200], [150, 55, 95, 200], [275, 55, 90, 200], [780, 55, 100, 200]], attack: [[390, 135, 190, 120]] },
  chess:       { bg: '#ebebeb', walk: [[15, 55, 200, 160], [240, 55, 200, 160], [465, 55, 205, 160]], attack: [[285, 460, 190, 180]] },
  mercury:     { bg: '#ebebeb', walk: [[8, 8, 341, 293], [341, 8, 341, 293], [681, 8, 317, 293], [349, 309, 317, 277]], attack: [[1038, 1030, 380, 301]] },
  cp9agent:    { bg: '#ebebeb', walk: [[50, 70, 130, 155], [240, 70, 130, 155], [430, 65, 135, 170], [620, 65, 115, 170]], attack: [[220, 890, 170, 185]] }
};

function frames(id) {
  if (MANUAL[id]) return { bg: MANUAL[id].bg || null, walk: MANUAL[id].walk, attack: MANUAL[id].attack };
  const img0 = decode(fs.readFileSync(path.join(ROOT, REF, atlasOf(id))));
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
  const blocksFile = path.join(__dirname, 'enemy-blocks.json');
  const blocks = fs.existsSync(blocksFile) ? JSON.parse(fs.readFileSync(blocksFile, 'utf8')) : {};
  for (const id of ids) {
    const f = frames(id);
    if (f.walk.length < 2) { console.log(id + ': menos de 2 pasos (se queda como estaba)'); continue; }
    const bgLine = f.bg ? `      bgFlat: { color: '${f.bg}', thr: 12, r: 2, fringe: 1 },\n` : '';
    blocks[id] = `  ${id}: {\n      sheet: REF + '${path.posix.join(...atlasOf(id).split('/'))}',\n${bgLine}      height: 46, colors: 24,\n` +
      `      fps: { idle: 1, walk: 7${f.attack.length ? ', attack: 6' : ''} },\n` +
      `      anims: {\n        idle: [[${f.walk[0].join(', ')}]],\n` +
      `        walk: [${f.walk.map(b => '[' + b.join(', ') + ']').join(', ')}]` +
      (f.attack.length ? `,\n        attack: [[${f.attack[0].join(', ')}]]` : '') + `\n      }\n    },\n`;
    console.log(id + ': ' + f.walk.length + ' pasos' + (f.attack.length ? ', 1 ataque' : ''));
  }
  fs.writeFileSync(blocksFile, JSON.stringify(blocks, null, 1));
  const file = path.join(__dirname, 'enemy.config.js');
  fs.writeFileSync(file, `/* Generado por tools/auto-enemy.js (no editar a mano). */\nconst REF = 'assets/ref/characters/';\n\nmodule.exports = {\n  chars: {\n${Object.values(blocks).join('')}  }\n};\n`);
  console.log('escrito', path.relative(ROOT, file), Object.keys(blocks).length, 'enemigos');
}

const only = process.argv[2];
write(only ? [only] : Object.keys(ENEMIES));
