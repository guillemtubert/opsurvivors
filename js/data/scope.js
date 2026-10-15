/* ============ scope.js — qué parte del juego está activa ============
 * Mientras diseñamos el estilo, sólo hay unos pocos tripulantes, un enemigo y una isla.
 * El resto sigue en los datos (crew.js, enemies.js, islands.js) y se activa añadiéndolo aquí.
 */
G.SCOPE = {
  crew: ['luffy', 'sanji'],
  enemies: ['marine'],
  islands: ['shells', 'orange', 'syrup', 'baratie', 'arlong', 'littlegarden', 'drum', 'alabasta', 'skypiea', 'enieslobby', 'thriller'],
  allSagas: true            // mientras se prueba: todas las sagas abiertas sin completar la anterior
};
