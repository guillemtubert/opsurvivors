/* ============ sprites.config.js — de assets/ref/ a assets/chars/ ============
 * Lo lee tools/build-sprites.js.
 *
 * Cada personaje tiene su carpeta en assets/ref/characters/<id>/ con todo lo
 * que haya de él (atlas de Treasure Cruise, hojas hechas para el juego...).
 *
 * ESCALA COMÚN de los atlas de Treasure Cruise: 1 px del juego = `scale.factor`
 * px del atlas. Así conservan las proporciones entre ellos y ninguno cambia de
 * tamaño al cambiar de pose. (Con ella, el Luffy original de pie medía 42 px.)
 * Las hojas de otra resolución llevan su alto propio (`height`).
 *
 * Por personaje:
 *   sheet    imagen de origen (atlas)          bg   color de fondo a quitar, si lo hay
 *   size     multiplicador de talla (1 = la de Treasure Cruise, que pone a todos casi igual)
 *   colors   colores de la paleta (común a todos sus fotogramas)
 *   accent   conserva detalles pequeños sobre negro (ojos, filos): { dark, rim, rimMin } (ver pixelize)
 *   bgFlat   hoja con fondo liso (JPG negro, blanco...): { color, thr, r, fringe, pockets } (ver pixelize.removeFlatBg)
 *   height   alto propio en px, para hojas de otra resolución que los atlas (en vez de la escala común)
 *   dirs8    8 direcciones con sus pasos: { down: [..], 'down-right': [..], right, 'up-right', up,
 *            'up-left', left, 'down-left' }. { mirror: 'right' } = los de otra dirección en espejo.
 *            3 pasos se andan 1-2-3-2; 4 o más, en bucle. idleStep: qué paso es el de quieto.
 *   layout   'rows4x2': hoja de 8 direcciones en 4 filas × 2 bloques (ver build-sprites):
 *            los recuadros se detectan solos, no hace falta dirs8
 *            Con 8 direcciones, anims.attack/hurt (de lado) pueden venir de otra hoja:
 *            walkSheet/walkBg para la de andar, sheet/bg para la de poses, sideHeight su alto.
 *   flip     true si en el original miran a la izquierda (el juego los quiere a la derecha)
 *   fps      velocidad de cada animación
 *   anims    idle (quieto) · walk (andando: la pose de correr, el juego añade rebote y polvo)
 *            attack (al lanzar una técnica) · hurt (golpe recibido)
 *            Cada fotograma es un recuadro [x, y, w, h] del atlas (salen con
 *            P.components: node -e "..." ver README) o { f: [..], dx, solo }.
 *            Atlas por piezas (cabeza y cuerpo sueltos): { body: [..], head: [..], overlap }.
 */
const REF = 'assets/ref/characters/';

module.exports = {
  scale: { factor: 4.425 },

  chars: {
    // Luffy de Elbaph: andar en 8 direcciones (hoja hecha para el juego, fondo blanco)
    // y poses de ataque/daño del atlas #4583 de Treasure Cruise.
    luffy: {
      walkSheet: REF + 'luffy/LuffyElbaph.png',
      walkBg: { color: '#ffffff', thr: 40, r: 2, fringe: 2, pockets: true },
      sheet: REF + 'luffy/Mobile - One Piece_ Treasure Cruise - Playable Characters - #4583 - Monkey D. Luffy - Adventure in the Land of Mystery.png',
      bg: '#e69900',                          // el marco naranja del atlas
      height: 46, sideHeight: 48, colors: 24,
      fps: { idle: 1, walk: 9, attack: 8, hurt: 1 },
      // La hoja de andar no va por filas limpias: se cogen las direcciones con
      // 4 pasos completos y las que miran a la izquierda salen en espejo.
      dirs8: {
        down: [[10, 14, 130, 188], [159, 18, 130, 184], [312, 12, 124, 184], [459, 18, 130, 187]],
        'down-right': [[17, 700, 101, 196], [162, 697, 109, 190], [306, 700, 114, 187], [459, 697, 111, 187]],
        right: [[11, 253, 118, 184], [155, 247, 114, 192], [302, 249, 127, 181], [450, 249, 123, 184]],
        'up-right': [[606, 247, 129, 189], [758, 242, 121, 194], [903, 237, 132, 191], [1056, 242, 121, 194]],
        up: [[12, 468, 124, 190], [161, 465, 125, 198], [312, 468, 124, 190], [459, 468, 127, 197]],
        'up-left': { mirror: 'up-right' },
        left: { mirror: 'right' },
        'down-left': { mirror: 'down-right' }
      },
      anims: {
        attack: [{ f: [240, 1450, 145, 195], solo: true }, { f: [535, 268, 175, 124], solo: true }],   // sin el humo de debajo
        hurt: [{ f: [130, 548, 175, 125], solo: true }]
      }
    },

    // Marine: andar en 8 direcciones (Marine8D.png, convertida del .jfif; fondo blanco).
    // Sin 'pockets': la camisa y la gorra son blancas como el fondo.
    marine: {
      sheet: REF + 'marine/Marine8D.png',
      bgFlat: { color: '#ffffff', thr: 30, r: 2, fringe: 1 },
      height: 46, colors: 24,
      fps: { idle: 1, walk: 8, attack: 6 },
      dirs8: {
        down: [[473, 65, 222, 322], [107, 67, 193, 321], [822, 68, 257, 323]],
        'down-right': [[67, 1507, 215, 277], [374, 1509, 182, 276], [656, 1509, 220, 270], [949, 1509, 224, 275]],
        right: [[75, 573, 271, 304]],
        'up-right': [[1276, 536, 294, 321], [1719, 530, 186, 317], [2087, 530, 193, 323]],
        up: [[105, 931, 181, 335], [490, 931, 182, 333], [860, 931, 203, 335]],
        'up-left': { mirror: 'up-right' },
        left: { mirror: 'right' },
        'down-left': { mirror: 'down-right' }
      },
      anims: {
        attack: [[1830, 1499, 202, 284], [2103, 1536, 297, 244]]       // espada en alto y estocada
      }
    },

    // Hecho para el juego: 8 direcciones con 3-4 pasos cada una, fondo negro.
    sanji: {
      sheet: REF + 'sanji/Sanji8D.png',
      bgFlat: { color: '#000000', thr: 14, r: 3, fringe: 1 },
      height: 44, colors: 24,
      fps: { idle: 1, walk: 8 },
      layout: 'rows4x2'
    },

    // Su atlas guarda la cabeza (capucha) y la túnica por separado.
    imu: {
      sheet: REF + 'imu/Mobile - One Piece_ Treasure Cruise - Playable Characters - #4571 - Imu - Occupant of the Empty Throne.png',
      bg: '#e69900',
      size: 1, colors: 12,
      accent: { dark: 0.22, rim: '#4a4458', rimMin: 0.1 },    // ojos rojos y filos de la túnica
      fps: { idle: 3, walk: 1, attack: 5, hurt: 1 },
      anims: {
        idle: [{ body: [399, 600, 207, 143], head: [7, 795, 72, 164], overlap: 40 },
               { body: [611, 600, 206, 142], head: [7, 795, 72, 164], overlap: 40 },
               { body: [399, 748, 208, 141], head: [7, 795, 72, 164], overlap: 40 }],
        walk: [{ body: [611, 600, 206, 142], head: [7, 795, 72, 164], overlap: 40 }],
        attack: [{ body: [399, 748, 208, 141], head: [7, 795, 72, 164], overlap: 40 }],
        hurt: [{ body: [399, 600, 207, 143], head: [7, 795, 72, 164], overlap: 40 }]
      }
    },

    // Morgan: andar en 8 direcciones (Morgan8D.png, convertida del .jfif; fondo blanco).
    // Jefe: más grande que los demás a propósito.
    morgan: {
      sheet: REF + 'morgan/Morgan8D.png',
      bgFlat: { color: '#ffffff', thr: 40, r: 2, fringe: 2, pockets: true },
      height: 62, colors: 24,
      fps: { idle: 1, walk: 8, attack: 5 },
      dirs8: {
        down: [[15, 35, 274, 404], [314, 35, 274, 404], [612, 34, 274, 405], [915, 35, 268, 405], [1211, 35, 275, 404], [1512, 35, 270, 404]],
        'down-right': [[21, 489, 261, 395], [309, 489, 272, 394], [610, 488, 266, 399], [934, 489, 261, 396]],
        right: [[1227, 483, 232, 400], [1522, 483, 259, 390], [1821, 483, 256, 395], [2123, 483, 249, 401]],
        'up-left': [[13, 941, 268, 398], [314, 941, 261, 397], [621, 941, 242, 400]],
        up: [[930, 938, 251, 391], [1210, 941, 259, 394], [1522, 941, 263, 401], [1819, 941, 262, 400], [2123, 941, 245, 400]],
        'up-right': { mirror: 'up-left' },
        left: { mirror: 'right' },
        'down-left': [[312, 1394, 267, 391], [603, 1394, 272, 391], [940, 1394, 224, 391], [1205, 1394, 281, 391]]
      },
      anims: {
        // El último fotograma es el que se ve al embestir (estado 'dash' del jefe).
        attack: [[2111, 1402, 268, 369], [1507, 1414, 268, 372]]       // hachazo en alto, embestida
      }
    }
  }
};
