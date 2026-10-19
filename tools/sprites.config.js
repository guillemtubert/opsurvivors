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
    // Luffy (#0002 Gum-Gum Pistol de Treasure Cruise): hoja de lado y tres cuartos, fondo blanco.
    // Frente y espalda no existen en el atlas: arriba usa los fotogramas de frente.
    luffy: {
      sheet: REF + 'luffy/GumGum8D.png',
      backSheet: REF + 'luffy/BackSheet.png',
      bgFlat: { color: '#ffffff', thr: 40, r: 2, fringe: 2, pockets: true },
      height: 46, sideHeight: 48, colors: 24,
      fps: { idle: 1, walk: 9, attack: 8, hurt: 1 },
      dirs8: {
        down: [[45, 25, 110, 185], [240, 25, 110, 185], [430, 25, 110, 185]],
        'down-right': [[40, 290, 165, 170], [275, 290, 165, 170]],
        right: [[40, 290, 165, 170], [275, 290, 165, 170]],
        'up-right': [[40, 290, 165, 170], [275, 290, 165, 170]],
        up: [{ f: [30, 15, 86, 184], sheet: REF + 'luffy/BackSheet.png' }, { f: [178, 15, 86, 184], sheet: REF + 'luffy/BackSheet.png' }, { f: [328, 15, 86, 184], sheet: REF + 'luffy/BackSheet.png' }, { f: [478, 15, 86, 184], sheet: REF + 'luffy/BackSheet.png' } ],
        'up-left': { mirror: 'up-right' },
        left: { mirror: 'right' },
        'down-left': { mirror: 'down-right' }
      },
      anims: {
        attack: [{ f: [35, 835, 130, 170], solo: true }, { f: [230, 835, 140, 170], solo: true }, { f: [520, 835, 170, 170], solo: true }],
        hurt: [{ f: [250, 580, 110, 140], solo: true }]
      }
    },

    // Zoro (#0005 Spriters): lado y tres cuartos de la hoja; espaldas generadas con Gemini.
    zoro: {
      sheet: REF + 'zoro/ZoroSheet.png',
      bgFlat: { color: '#ebebeb', thr: 40, r: 2, fringe: 2, pockets: true },
      height: 46, sideHeight: 48, colors: 24,
      fps: { idle: 1, walk: 9, attack: 8, hurt: 1 },
      dirs8: {
        down: [[70, 20, 240, 195], [390, 20, 240, 195], [715, 20, 240, 195]],
        'down-right': [[110, 255, 190, 190], [355, 245, 170, 180]],
        right: [[110, 255, 190, 190], [355, 245, 170, 180]],
        'up-right': [[110, 255, 190, 190], [355, 245, 170, 180]],
        up: [{ f: [26, 42, 74, 190], sheet: REF + 'zoro/ZoroBack.png' }, { f: [143, 42, 74, 190], sheet: REF + 'zoro/ZoroBack.png' }, { f: [258, 42, 74, 190], sheet: REF + 'zoro/ZoroBack.png' }, { f: [375, 42, 74, 190], sheet: REF + 'zoro/ZoroBack.png' }],
        'up-left': { mirror: 'up-right' },
        left: { mirror: 'right' },
        'down-left': { mirror: 'down-right' }
      },
      anims: {
        attack: [{ f: [65, 800, 180, 200], solo: true }, { f: [330, 795, 220, 200], solo: true }],
        hurt: [{ f: [70, 20, 240, 195], solo: true }]
      }
    },

    // Chopper (#0021 Treasure Cruise): hoja de lado y espaldas (las espaldas ya vienen en la hoja).
    chopper: {
      sheet: REF + 'chopper/ChopperSheet.png',
      bgFlat: { color: '#ebebeb', thr: 40, r: 2, fringe: 2, pockets: true },
      height: 46, sideHeight: 48, colors: 24,
      fps: { idle: 1, walk: 9, attack: 8, hurt: 1 },
      dirs8: {
        down: [[20, 85, 140, 170], [210, 85, 140, 170], [400, 85, 145, 170]],
        'down-right': [[25, 655, 140, 145], [220, 655, 145, 145]],
        right: [[25, 655, 140, 145], [220, 655, 145, 145]],
        'up-right': [[25, 655, 140, 145], [220, 655, 145, 145]],
        up: [[65, 325, 110, 155], [215, 325, 115, 155]],
        'up-left': { mirror: 'up-right' },
        left: { mirror: 'right' },
        'down-left': { mirror: 'down-right' }
      },
      anims: {
        attack: [{ f: [20, 885, 140, 170], solo: true }, { f: [245, 885, 140, 170], solo: true }],
        hurt: [{ f: [20, 85, 140, 170], solo: true }]
      }
    },

    // Usopp (#0013 Treasure Cruise): lado y tres cuartos de la hoja; espaldas generadas con Gemini.
    usopp: {
      sheet: REF + 'usopp/UsoppSheet.png',
      bgFlat: { color: '#ebebeb', thr: 40, r: 2, fringe: 2, pockets: true },
      height: 46, sideHeight: 48, colors: 24,
      fps: { idle: 1, walk: 9, attack: 8, hurt: 1 },
      dirs8: {
        down: [[70, 10, 165, 195], [325, 10, 165, 195], [585, 10, 160, 195]],
        'down-right': [[15, 230, 165, 180], [200, 230, 170, 180]],
        right: [[15, 230, 165, 180], [200, 230, 170, 180]],
        'up-right': [[15, 230, 165, 180], [200, 230, 170, 180]],
        up: [{ f: [14, 19, 76, 190], sheet: REF + 'usopp/UsoppBack.png' }, { f: [116, 19, 78, 190], sheet: REF + 'usopp/UsoppBack.png' }, { f: [219, 19, 78, 190], sheet: REF + 'usopp/UsoppBack.png' }, { f: [319, 19, 78, 190], sheet: REF + 'usopp/UsoppBack.png' }],
        'up-left': { mirror: 'up-right' },
        left: { mirror: 'right' },
        'down-left': { mirror: 'down-right' }
      },
      anims: {
        attack: [{ f: [55, 815, 140, 190], solo: true }, { f: [370, 815, 140, 190], solo: true }, { f: [690, 815, 190, 190], solo: true }],
        hurt: [{ f: [70, 10, 165, 195], solo: true }]
      }
    },

    // Nami (#0012 Treasure Cruise): lado y tres cuartos de la hoja; espaldas generadas con Gemini.
    nami: {
      sheet: REF + 'nami/NamiSheet.png',
      bgFlat: { color: '#ebebeb', thr: 40, r: 2, fringe: 2, pockets: true },
      height: 46, sideHeight: 48, colors: 24,
      fps: { idle: 1, walk: 9, attack: 8, hurt: 1 },
      dirs8: {
        down: [[55, 20, 115, 180], [245, 20, 110, 180], [435, 20, 110, 180]],
        'down-right': [[35, 270, 140, 165], [55, 20, 115, 180]],
        right: [[35, 270, 140, 165], [55, 20, 115, 180]],
        'up-right': [[35, 270, 140, 165], [55, 20, 115, 180]],
        up: [{ f: [25, 37, 86, 190], sheet: REF + 'nami/NamiBack.png' }, { f: [146, 37, 86, 190], sheet: REF + 'nami/NamiBack.png' }, { f: [265, 37, 86, 190], sheet: REF + 'nami/NamiBack.png' }, { f: [386, 37, 86, 190], sheet: REF + 'nami/NamiBack.png' }],
        'up-left': { mirror: 'up-right' },
        left: { mirror: 'right' },
        'down-left': { mirror: 'down-right' }
      },
      anims: {
        attack: [{ f: [15, 830, 185, 170], solo: true }, { f: [265, 830, 175, 170], solo: true }, { f: [565, 830, 180, 170], solo: true }],
        hurt: [{ f: [55, 20, 115, 180], solo: true }]
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

    // Sanji: andar generado con Gemini a partir del atlas #4156 «Puzzled Aloha» (tools/gemini-8d.js,
    // 5 filas × 4 pasos sobre magenta, mirando a la izquierda) y poses de ataque y daño del atlas.
    // Sanji (#0017 Treasure Cruise): lado y tres cuartos de la hoja; espaldas generadas con Gemini.
    sanji: {
      sheet: REF + 'sanjiS/SanjiSheet.png',
      bgFlat: { color: '#ebebeb', thr: 40, r: 2, fringe: 2, pockets: true },
      height: 46, sideHeight: 48, colors: 24,
      fps: { idle: 1, walk: 9, attack: 8, hurt: 1 },
      dirs8: {
        down: [[64, 80, 88, 175], [262, 80, 80, 175], [453, 80, 72, 175]],
        'down-right': [[24, 890, 95, 160], [223, 880, 135, 170]],
        right: [[24, 890, 95, 160], [223, 880, 135, 170]],
        'up-right': [[24, 890, 95, 160], [223, 880, 135, 170]],
        up: [{ f: [15, 29, 75, 190], sheet: REF + 'sanjiS/SanjiBack.png' }, { f: [126, 29, 75, 190], sheet: REF + 'sanjiS/SanjiBack.png' }, { f: [234, 29, 75, 190], sheet: REF + 'sanjiS/SanjiBack.png' }, { f: [340, 29, 75, 190], sheet: REF + 'sanjiS/SanjiBack.png' }],
        'up-left': { mirror: 'up-right' },
        left: { mirror: 'right' },
        'down-left': { mirror: 'down-right' }
      },
      anims: {
        attack: [{ f: [509, 882, 160, 160], solo: true }, { f: [779, 874, 135, 143], solo: true }],
        hurt: [{ f: [64, 80, 88, 175], solo: true }]
      }
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

    // Buggy: andar en 8 direcciones (Buggy8D.png, convertida del .jfif). Las direcciones que faltan, en espejo.
    buggy: {
      sheet: REF + 'buggy/Buggy8D.png',
      bgFlat: { color: '#ffffff', thr: 30, r: 2, fringe: 1, pockets: 'auto' },
      height: 60, colors: 24,
      fps: { idle: 1, walk: 7, attack: 5 },
      dirs8: {
        'down': [[9, 16, 132, 190], [0, 476, 144, 186], [6, 240, 136, 189], [6, 710, 126, 186]],
        'down-right': [[159, 16, 138, 189], [309, 15, 133, 190], [461, 15, 134, 190], [162, 238, 133, 191]],
        'right': [[317, 238, 109, 192], [469, 238, 109, 192]],
        'up-right': { mirror: 'up-left' },
        'up': [[757, 16, 136, 184], [758, 240, 134, 188], [1056, 240, 137, 187], [1055, 16, 139, 189]],
        'up-left': [[614, 18, 130, 186], [475, 707, 114, 184], [739, 708, 100, 184]],
        'left': { mirror: 'right' },
        'down-left': { mirror: 'down-right' }
      },
      anims: { attack: [[155, 474, 141, 186]] }
    },

    // Don Krieg: andar en 8 direcciones (Krieg8D.png, convertida del .jfif). Las direcciones que faltan, en espejo.
    krieg: {
      sheet: REF + 'krieg/Krieg8D.png',
      bgFlat: { color: '#000000', thr: 14, r: 3, fringe: 1 },
      height: 64, colors: 24,
      fps: { idle: 1, walk: 7 },
      dirs8: {
        'down': [[39, 56, 237, 378], [39, 507, 236, 376], [40, 961, 234, 372], [40, 1426, 234, 361]],
        'down-right': [[343, 69, 224, 365], [339, 519, 221, 363], [332, 974, 230, 359], [345, 1430, 208, 357]],
        'right': [[926, 67, 218, 364], [931, 516, 201, 365], [907, 969, 257, 363]],
        'up-right': [[1541, 63, 217, 371], [1554, 510, 210, 371]],
        'up': [[1221, 55, 240, 363], [1222, 509, 237, 363], [1225, 963, 235, 370], [1229, 1417, 230, 355]],
        'up-left': { mirror: 'up-right' },
        'left': { mirror: 'right' },
        'down-left': { mirror: 'down-right' }
      }
    },

    // Arlong: andar en 8 direcciones (Arlong8D.png, convertida del .jfif). Las direcciones que faltan, en espejo.
    arlong: {
      sheet: REF + 'arlong/Arlong8D.png',
      bgFlat: { color: '#ffffff', thr: 30, r: 2, fringe: 1, pockets: 'auto' },
      height: 64, colors: 24,
      fps: { idle: 1, walk: 7, attack: 5 },
      dirs8: {
        'down': [[28, 35, 245, 402], [24, 476, 249, 408], [2128, 933, 248, 403], [2132, 1385, 252, 397]],
        'down-right': [[306, 35, 257, 393], [329, 483, 244, 389], [314, 1391, 261, 389]],
        'right': [[628, 33, 242, 389], [1802, 938, 271, 395], [613, 1389, 271, 393], [1847, 1392, 251, 389]],
        'up-right': [[915, 35, 260, 393], [937, 484, 250, 393], [1529, 1384, 289, 397]],
        'up': [[1225, 28, 239, 405], [1225, 476, 241, 402], [1225, 925, 249, 407], [1226, 1385, 254, 396]],
        'up-left': { mirror: 'up-right' },
        'left': { mirror: 'right' },
        'down-left': { mirror: 'down-right' }
      },
      anims: { attack: [[613, 1389, 271, 393]] }
    },

    // Mr. 3: andar en 8 direcciones (Mr38D.png, convertida del .jfif). Las direcciones que faltan, en espejo.
    mr3: {
      sheet: REF + 'mr3/Mr38D.png',
      bgFlat: { color: '#ffffff', thr: 30, r: 2, fringe: 1, pockets: 'auto' },
      height: 62, colors: 24,
      fps: { idle: 1, walk: 7 },
      dirs8: {
        'down': [[48, 18, 165, 417], [52, 465, 160, 418], [1249, 465, 160, 418]],
        'down-right': [[517, 19, 172, 413], [518, 465, 171, 416]],
        'right': [[770, 19, 142, 416], [764, 465, 148, 417]],
        'up-right': { mirror: 'up-left' },
        'up': [[985, 19, 162, 415], [2190, 19, 162, 410], [991, 466, 160, 409], [2188, 465, 161, 416]],
        'up-left': [[1474, 19, 158, 410], [1470, 465, 159, 417]],
        'left': { mirror: 'right' },
        'down-left': { mirror: 'down-right' }
      }
    },

    // Crocodile: andar en 8 direcciones (Crocodile8D.png, convertida del .jfif). Las direcciones que faltan, en espejo.
    crocodile: {
      sheet: REF + 'crocodile/Crocodile8D.png',
      bgFlat: { color: '#ffffff', thr: 30, r: 2, fringe: 1, pockets: 'auto' },
      height: 64, colors: 24,
      fps: { idle: 1, walk: 7 },
      dirs8: {
        'down': [[8, 35, 275, 402], [2136, 35, 253, 402], [10, 488, 273, 403], [2136, 488, 252, 403]],
        'down-right': [[309, 37, 273, 387], [604, 36, 264, 386], [309, 492, 276, 387], [608, 489, 250, 391]],
        'right': [[905, 40, 278, 380], [907, 491, 276, 385], [1831, 939, 217, 390], [1701, 1402, 194, 379]],
        'up-right': { mirror: 'up-left' },
        'up': [[1208, 35, 286, 384], [1208, 486, 286, 389], [1211, 939, 278, 380], [937, 1394, 260, 387]],
        'up-left': [[1512, 36, 284, 384], [1513, 492, 272, 381], [1472, 1393, 219, 387]],
        'left': { mirror: 'right' },
        'down-left': { mirror: 'down-right' }
      }
    },

    // Enel: andar en 8 direcciones (Enel8D.png, convertida del .jfif). Las direcciones que faltan, en espejo.
    enel: {
      sheet: REF + 'enel/Enel8D.png',
      bgFlat: { color: '#ffffff', thr: 30, r: 2, fringe: 1, pockets: 'auto' },
      height: 64, colors: 24,
      fps: { idle: 1, walk: 7 },
      dirs8: {
        'down': [[13, 12, 118, 206], [12, 234, 119, 208]],
        'down-right': [[468, 6, 128, 211], [460, 230, 107, 210]],
        'right': [[307, 6, 114, 210]],
        'up-right': [[788, 230, 94, 211]],
        'up': [[617, 13, 113, 198], [617, 237, 112, 199], [1068, 14, 118, 201], [1068, 235, 111, 206]],
        'up-left': [[783, 7, 118, 210]],
        'left': { mirror: 'right' },
        'down-left': { mirror: 'down-right' }
      }
    },

    // Rob Lucci: andar en 8 direcciones (Lucci8D.png, convertida del .jfif). Las direcciones que faltan, en espejo.
    lucci: {
      sheet: REF + 'lucci/Lucci8D.png',
      bgFlat: { color: '#ffffff', thr: 30, r: 2, fringe: 1 },
      height: 64, colors: 24,
      fps: { idle: 1, walk: 7 },
      dirs8: {
        'down': [[20, 45, 161, 386], [20, 501, 160, 385]],
        'down-right': [[257, 43, 133, 372], [261, 505, 131, 367]],
        'right': [[637, 43, 143, 369], [654, 495, 122, 380]],
        'up-right': [[818, 38, 176, 375], [811, 495, 157, 377]],
        'up': [[1241, 40, 159, 382], [1444, 30, 134, 376], [1240, 495, 158, 377], [1449, 488, 129, 376]],
        'up-left': { mirror: 'up-right' },
        'left': { mirror: 'right' },
        'down-left': { mirror: 'down-right' }
      }
    },

    // Gecko Moria: andar en 8 direcciones (Moria8D.png, convertida del .jfif). Las direcciones que faltan, en espejo.
    moria: {
      sheet: REF + 'moria/Moria8D.png',
      bgFlat: { color: '#ffffff', thr: 30, r: 2, fringe: 1, pockets: 'auto' },
      height: 78, colors: 24,
      fps: { idle: 1, walk: 7 },
      dirs8: {
        'down': [[8, 0, 287, 440], [9, 452, 285, 435], [2106, 6, 285, 416], [2109, 451, 282, 437]],
        'down-right': { mirror: 'down-left' },
        'right': [[648, 0, 204, 440], [957, 5, 192, 436], [651, 450, 201, 436]],
        'up-right': { mirror: 'up-left' },
        'up': [[1204, 0, 289, 434], [1201, 452, 293, 434]],
        'up-left': [[1503, 5, 292, 430], [1545, 452, 227, 433]],
        'left': { mirror: 'right' },
        'down-left': [[309, 0, 285, 440], [321, 451, 261, 434]]
      }
    },

    // Kuro: andar en 8 direcciones (Kuro8D.png, convertida del .jfif; paneles y etiquetas tapados con el color del fondo). Las direcciones que faltan, en espejo.
    kuro: {
      sheet: REF + 'kuro/Kuro8D.png',
      bgFlat: { color: '#26292f', thr: 9, r: 3, fringe: 1 },
      height: 62, colors: 24,
      fps: { idle: 1, walk: 7 },
      dirs8: {
        'down': [[59, 92, 349, 437], [511, 89, 296, 444]],
        'down-right': [[1405, 121, 287, 405], [1406, 2003, 327, 358]],
        'right': [[73, 706, 313, 445], [504, 718, 273, 430], [494, 1916, 351, 439]],
        'up-right': [[975, 716, 320, 433], [1389, 712, 317, 437], [1397, 1310, 321, 442]],
        'up': [[95, 1302, 271, 450], [521, 1302, 272, 454], [990, 1304, 274, 448]],
        'up-left': { mirror: 'up-right' },
        'left': { mirror: 'right' },
        'down-left': [[982, 134, 318, 398], [945, 1956, 352, 404]]
      }
    },

    // Wapol: andar en 8 direcciones (Wapol8D.png, convertida del .jfif; sin diagonales de espaldas: usan las de espaldas). Las direcciones que faltan, en espejo.
    wapol: {
      sheet: REF + 'wapol/Wapol8D.png',
      bgFlat: { color: '#ffffff', thr: 30, r: 2, fringe: 1, pockets: 'auto' },
      height: 64, colors: 24,
      fps: { idle: 1, walk: 7 },
      dirs8: {
        'down': [[11, 25, 215, 271], [11, 625, 218, 267]],
        'down-right': { mirror: 'down-left' },
        'right': [[759, 25, 169, 270], [996, 26, 177, 269], [1232, 25, 168, 271], [1460, 26, 185, 266]],
        'up-right': [[1931, 24, 212, 270], [2171, 25, 215, 273], [2169, 621, 219, 265]],
        'up': [[1931, 24, 212, 270], [2171, 25, 215, 273], [2169, 621, 219, 265]],
        'up-left': [[1931, 24, 212, 270], [2171, 25, 215, 273], [2169, 621, 219, 265]],
        'left': [[516, 323, 185, 261], [747, 324, 198, 269], [1003, 322, 168, 270], [1241, 322, 166, 270]],
        'down-left': [[253, 26, 217, 270], [492, 26, 204, 259], [22, 325, 212, 258], [275, 325, 198, 259]]
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
