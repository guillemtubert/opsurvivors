/* ============ sprites.config.js — de assets/ref/ a assets/chars/ ============
 * Lo lee tools/build-sprites.js.
 *
 * ESCALA COMÚN: todos los personajes se reducen con el mismo factor, sacado de
 * `scale` (el personaje y alto de referencia). Así conservan las proporciones
 * entre ellos y ninguno cambia de tamaño al cambiar de pose. Las fuentes deben
 * ser del mismo tipo: el atlas de cada personaje en Treasure Cruise (las
 * "Assembled/Split Sprites" están a otra escala).
 *
 * Por personaje:
 *   sheet    imagen de origen (atlas)          bg   color de fondo a quitar, si lo hay
 *   size     multiplicador de talla (1 = la de Treasure Cruise, que pone a todos casi igual)
 *   colors   colores de la paleta (común a todos sus fotogramas)
 *   flip     true si en el original miran a la izquierda (el juego los quiere a la derecha)
 *   fps      velocidad de cada animación
 *   anims    idle (quieto) · walk (andando: la pose de correr, el juego añade rebote y polvo)
 *            attack (al lanzar una técnica) · hurt (golpe recibido)
 *            Cada fotograma es un recuadro [x, y, w, h] del atlas (salen con
 *            P.components: node -e "..." ver README) o { f: [..], dx, solo }.
 */
module.exports = {
  scale: { ref: 'luffy', height: 42 },      // Luffy de pie mide 42 px (con el contorno)

  chars: {
    luffy: {
      sheet: 'assets/ref/#0002 - Monkey D. Luffy - Gum-Gum Pistol/Left (Normal - Playable)/motion_0002_luffy_0001.png',
      size: 1, colors: 20,
      fps: { idle: 5, walk: 1, attack: 8, hurt: 1 },
      anims: {
        idle: [[48, 32, 101, 177], [241, 33, 101, 176], [434, 34, 101, 175]],
        walk: [[40, 294, 163, 163]],
        attack: [[233, 839, 137, 166], [521, 841, 171, 164]],
        hurt: [[479, 548, 117, 167]]
      }
    },

    marine: {
      sheet: 'assets/ref/Mobile - One Piece_ Treasure Cruise - Playable Characters - #0180 - Saber Apprentice - Navy.png',
      size: 1, colors: 16,
      fps: { idle: 4, walk: 1, attack: 6, hurt: 1 },
      anims: {
        idle: [[45, 37, 132, 170], [237, 38, 128, 169], [429, 39, 126, 168]],
        walk: [[43, 309, 143, 159]],
        attack: [[335, 817, 135, 190], [656, 619, 223, 164]],
        hurt: [[277, 289, 125, 171]]
      }
    },

    morgan: {
      sheet: 'assets/ref/Mobile - One Piece_ Treasure Cruise - Playable Characters - #0035 - Axe-Hand Morgan.png',
      bg: '#e69900',                          // el marco naranja de la hoja
      size: 1, colors: 20,
      fps: { idle: 4, walk: 1, attack: 5, hurt: 1 },
      anims: {
        idle: [[32, 65, 128, 190], [223, 60, 129, 195], [410, 57, 135, 198]],
        walk: [[74, 889, 165, 164]],
        attack: [[288, 889, 170, 164], [537, 889, 186, 164]],
        hurt: [[811, 882, 123, 172]]
      }
    }
  }
};
