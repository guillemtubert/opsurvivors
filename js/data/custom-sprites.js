/* ============ custom-sprites.js — hojas de sprites propias ============
 * Sustituyen a los dibujos en código de js/data/sprites.js. Lo normal es
 * generarlas con tools/build-sprites.js (van a js/data/sprites-built.js);
 * aquí van las hechas a mano con tools/sprites.html, y mandan sobre aquellas.
 *
 *   file   PNG en assets/chars/ (tira horizontal: quieto, paso A, paso B…, mirando a la derecha)
 *   fw/fh  tamaño de cada fotograma en píxeles
 *   scale  1 = cada píxel de la hoja mide lo mismo que un píxel del resto del juego
 *
 * El id es el del personaje: luffy, zoro, nami, usopp, sanji, chopper, robin,
 * marine, rifle, pirate, fishman, pacifista, morgan, buggy, arlong, crocodile.
 */
G.CUSTOM_SPRITES = Object.assign(G.CUSTOM_SPRITES || {}, {
  // luffy: { file: 'assets/chars/luffy.png', fw: 32, fh: 40, scale: 1 },
});
