/* ============ sprites.config.js — de assets/ref/ a assets/chars/ ============
 * Lo lee tools/build-sprites.js. Por personaje:
 *
 *   height   alto final en píxeles (contorno incluido) del primer fotograma de `idle`;
 *            todos los fotogramas usan la MISMA escala, así no "cambian de talla"
 *   colors   colores de la paleta (común a todos sus fotogramas)
 *   flip     true si en el original miran a la izquierda (el juego los quiere a la derecha)
 *   bg       color de fondo a quitar (si la hoja no es transparente)
 *   fps      velocidad de cada animación
 *   anims    idle (quieto) · walk (andando) · attack (al lanzar una técnica) · hurt (golpe recibido)
 *            Cada fotograma es un fichero (relativo a `dir`) o un recuadro [x, y, w, h] de `sheet`.
 *            { f: ..., dx: 2 } mueve ese fotograma 2 px a la derecha si queda descentrado.
 *            { f: ..., solo: true } se queda sólo con la figura principal (quita humo y efectos).
 *            Ojo: no mezclar fuentes de distinto tamaño (en Treasure Cruise, las "Split Sprites"
 *            son más grandes que las "Assembled Sprites": el personaje crecería al cambiar de pose).
 *            Con un solo fotograma en walk, el juego lo anima con un rebote.
 */
const LUFFY = 'assets/ref/#0002 - Monkey D. Luffy - Gum-Gum Pistol/Left (Normal - Playable)/';

module.exports = {
  // Con direcciones: fotogramas con nombre y, por dirección, qué forma cada animación.
  // Lo que falta en Treasure Cruise se crea (ver tools/animate.js): { run } zancada,
  // { step } pasos de frente, { back } vista de espaldas. Ataque y daño sólo de lado.
  luffy: {
    height: 44, colors: 20, dir: LUFFY + 'Assembled Sprites/',
    hip: 0.62,                          // dónde empiezan las piernas en la pose de correr
    knee: 0.76, lift: 4,                // desde dónde y cuánto se levanta el pie al andar de frente
    back: { headTo: 0.45, torsoTo: 0.72, hair: ['#0a0810', '#1e1824', '#3a3048'], top: ['#5a0e14', '#9a1c26', '#d0303a', '#f05a5a'], torsoW: 0.16 },
    fps: { idle: 5, walk: 10, attack: 10, hurt: 1 },
    frames: {
      wait0: 'motion_0002_wait/0000.png', wait1: 'motion_0002_wait/0011.png',
      wait2: 'motion_0002_wait/0017.png', wait3: 'motion_0002_wait/0037.png',
      go: { f: 'motion_0002_go/0000.png', solo: true },
      atk0: { f: 'motion_0002_attack/0013.png', solo: true }, atk1: { f: 'motion_0002_attack/0020.png', solo: true },
      hurt: 'motion_0002_damage/0000.png'
    },
    dirs: {
      down: { idle: ['wait0', 'wait1', 'wait2', 'wait3'], walk: [{ step: 'wait0' }] },
      right: { idle: ['wait0', 'wait1', 'wait2', 'wait3'], walk: [{ run: 'go' }], attack: ['atk0', 'atk1'], hurt: ['hurt'] },
      up: { idle: [{ back: 'wait0' }], walk: [{ step: 'wait0', back: true }] }
    }
  },

  marine: {
    height: 44, colors: 16,
    sheet: 'assets/ref/Mobile - One Piece_ Treasure Cruise - Playable Characters - #0180 - Saber Apprentice - Navy.png',
    fps: { idle: 4, walk: 8, attack: 6, hurt: 1 },
    anims: {
      idle: [[45, 37, 132, 170], [237, 38, 128, 169], [429, 39, 126, 168]],
      walk: [[43, 309, 143, 159]],
      attack: [[335, 817, 135, 190], [656, 619, 223, 164]],
      hurt: [[277, 289, 125, 171]]
    }
  },

  morgan: {
    height: 76, colors: 20,
    sheet: 'assets/ref/Mobile - One Piece_ Treasure Cruise - Playable Characters - #0035 - Axe-Hand Morgan.png',
    bg: '#e69900',                         // el marco naranja de la hoja
    fps: { idle: 4, walk: 8, attack: 5, hurt: 1 },
    anims: {
      idle: [[32, 65, 128, 190], [223, 60, 129, 195], [410, 57, 135, 198]],
      walk: [[74, 889, 165, 164]],
      attack: [[288, 889, 170, 164], [537, 889, 186, 164]],
      hurt: [[811, 882, 123, 172]]
    }
  }
};
