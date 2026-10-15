/* ============ scope.js — qué parte del juego está activa ============
 * Mientras diseñamos el estilo, sólo hay unos pocos tripulantes. Las islas se activan
 * solas en cuanto existen sus jefes ('all'); también se puede dar una lista de ids.
 */
G.SCOPE = {
  crew: ['luffy', 'sanji'],
  islands: 'all',
  allSagas: true            // mientras se prueba: todas las sagas abiertas sin completar la anterior
};
