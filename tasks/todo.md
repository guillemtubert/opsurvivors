# Que no se haga pesado

- [x] El viaje entero en una sola partida (si caes, vuelta a Shells Town); dificultad por isla y jefes más fuertes en cada saga
- [x] Ritmo: Buster Call a los 2:00, Den Den Mushi más cerca del centro, huidas a los 8 s
- [x] Objetos al estilo Megabonk en los cofres (4 rarezas) y un trofeo por jefe, con colección
- [x] Imprevistos: noche, niebla, tormenta, mercader, cofre maldito
- [ ] Rescate (un aliado atrapado que te ayuda si lo liberas)
- [ ] Equilibrar jugando: daño de jefes, vida y frecuencia de objetos

# Toda la historia (por fases)

Guía acordada: una isla por arco, 11 sagas, 37 islas (`js/data/islands.js`). Ningún jefe repite ataques.

- [x] Fase 0 — Motor: islas de huida, dúos, efectos sobre el jugador (aturdir, piedra, controles al revés,
      sin ataques, empujón), humo que tapa la vista, proyectiles que rebotan / giran / caen y estallan,
      las 11 sagas con su enemigo provisional y su barco (Sunny desde Post-Enies Lobby; usa el Merry hasta tener su dibujo)
- [x] Fase 1 — Smoker (Loguetown, huida), Mr. 9 y Miss Wednesday (Reverse Mountain), Mr. 5 y Miss Valentine (Whisky Peak)
- [x] Fase 2 — Bellamy, Foxy, Franky, Garp (huida), Perona, Oars
- [x] Thousand Sunny (tools/build-props.js: ThousandSunny1, cortado por la línea del agua, en espejo y a 1,5×)
- [x] Fase 3 — Kizaru (huida), Hancock, Magellan (huida), Akainu (huida), Rayleigh, PX-1, Hody
- [x] Fase 4 — Caesar, Doflamingo, Jack, Katakuri, Big Mom (huida)
- [x] Fase 5 — Queen, King, Kaido (dos fases), San Saturn, Loki, Sommers y Killingham, Gunko, Shamrock
- [ ] Revisar los poderes de los Caballeros Sagrados con la wiki (no se pudo leer: los ataques son provisionales)
- [x] Biomas propios con sus objetos: Water 7 (casas), selva, prisión (columnas con cadenas), manglar (burbujas), coral, Punk Hazard (mitad fuego, mitad hielo), Dressrosa (girasoles), dulces (piruletas), Wano (cerezos y torii), Egghead (torres), Elbaph (árboles gigantes) y mármol (Enies Lobby, Mary Geoise)
- [ ] Hojas de 8 direcciones de los jefes nuevos y de los enemigos de cada saga

# Islas con objetivo (estilo Megabonk, a lo One Piece)

## Diseño acordado

- Cada isla es un mapa **limitado** (rodeado de mar) y hecho para no acorralar al jugador: costa abierta, sin callejones sin salida.
- **Cofres** repartidos por la isla. No son obligatorios: si no los coges, sigues más débil.
- **Minimapa** en lugar de flechas en el borde de la pantalla.
- **Buster Call:** pasado un tiempo, aparecen cada vez más enemigos y más fuertes.
- **Den Den Mushi:** lo tocas cuando quieras para invocar al jefe de la isla.
- **Jefe derrotado:** suelta un gran cofre y se abre el **barco (Going Merry)** en el muelle. Al subir pasas a la siguiente isla.
- El nivel y las técnicas se mantienen entre islas.
- Más adelante: Loguetown + Smoker como isla extra de escape (no se le vence: hay que llegar al barco).

## Islas

| # | Isla | Jefe |
|---|---|---|
| 1 | Shells Town | Morgan |
| 2 | Orange Town | Buggy |
| 3 | Villa Syrup | Kuro |
| 4 | Baratie | Don Krieg |
| 5 | Arlong Park | Arlong |
| 6 | Little Garden | Mr. 3 |
| 7 | Drum | Wapol |
| 8 | Alabasta | Crocodile |
| 9 | Skypiea | Enel |
| 10 | Enies Lobby | Lucci |
| 11 | Thriller Bark | Moria |

## Paso 1 — Isla 1 completa (Shells Town + Morgan)

- [x] `js/data/islands.js`: datos de cada isla (nombre, bioma, tamaño, jefe, nº de cofres, minuto del Buster Call)
- [x] `world.js`: isla limitada; el ruido se multiplica por una caída radial, así que fuera solo hay mar profundo. Costa ancha de arena, sin bolsas cerradas. El jugador no puede salir del mar profundo
- [x] Puntos de interés colocados con la semilla, separados entre sí y en tierra libre: cofres, Den Den Mushi y muelle con el barco
- [x] `spawner.js`: los enemigos solo aparecen en tierra dentro de la isla. Sin jefes por tiempo. Fase normal y luego fase Buster Call (ritmo creciente + élites)
- [x] Den Den Mushi: al acercarte, "Toca para llamar a Morgan" (o pulsar Espacio, Enter o F). Invoca al jefe cerca
- [x] Barco: bloqueado hasta vencer al jefe; al subir, pantalla de "Isla superada" y siguiente isla (de momento, fin de la demo con resumen)
- [x] Minimapa en el HUD: silueta de la isla, tú, cofres que quedan, Den Den Mushi, barco y jefe
- [x] HUD: nombre de la isla y objetivo ("Cofres 2/5 · Buster Call en 3:12")
- [x] Sprites pixel art: Den Den Mushi, Going Merry + muelle, cofre de isla
- [x] Quitar el cambio de isla automático cada 3 minutos
- [x] Verificar con Playwright: escritorio, móvil en horizontal y en vertical; que no haya zonas trampa (prueba de recorrer toda la costa)

## Paso 2 — Islas 2-4 (Orange Town, Villa Syrup, Baratie)

- [x] Todas las islas del mismo tamaño: `scale: 1` = radio `G.Islands.SIZE` (48 tiles, unos 30 s de punta a punta); 0.5 o 2.5 la encogen o agrandan
- [x] Buggy, Kuro y Don Krieg con sus islas

## Paso 3 — Todos los jefes, cada uno con sus ataques (ninguno repite)

- [x] `js/entities/bosses.js`: una IA por jefe (tabla en el README). Fuera los comportamientos compartidos (charger, fan, zoner...)
- [x] Jefes nuevos: Mr. 3, Wapol, Enel, Lucci y Moria (Arlong y Crocodile, con ataques propios)
- [x] Vida: sube isla a isla dentro de cada saga (cada saga empieza a nivel 1)
- [x] Selector de saga en el puerto; cada saga se abre al completar la anterior (`allSagas: true` mientras se prueba)
- [x] Bioma nevado para Drum
- [x] Se mantiene el minimapa en todas las islas
- [x] Hojas de 8 direcciones: Buggy, Krieg, Arlong, Mr. 3, Crocodile, Enel, Lucci y Moria
- [x] Hojas de Kuro y Wapol
- [x] Sin puntos blancos: bolsas de fondo encerradas (`pockets: 'auto'`) y motas sueltas (`dropSpecks`)
- [ ] Dificultad entre islas (ahora sigue subiendo con el tiempo total de la partida)
- [ ] Equilibrar el daño de cada ataque jugando

## Decisiones
- Duración: partidas por **sagas** (East Blue = islas 1-5, Alabasta = 6-8, Cielo/Thriller Bark = 9-11). Buster Call a los **3:00**; llamar al jefe antes da berries extra (1,5 ฿ por segundo que falte).
- Minimapa arriba a la derecha; tocarlo lo amplía.

## Revisión — paso 1
- Isla limitada: la costa es una curva que sólo depende del ángulo (sin entrantes cerrados). El mar profundo no se cruza.
- 40 semillas comprobadas con un recorrido en anchura: todos los cofres, el Den Den Mushi y el muelle se alcanzan desde el centro; tierra aislada (huecos entre árboles) un 0,03 % de media.
- Flujo completo probado en Chromium (escritorio, móvil horizontal y vertical): cofre → carta, muelle bloqueado, Den Den Mushi → Morgan, Morgan cae → muelle abierto → fin de saga. Encadenar islas probado añadiendo Orange Town: mantiene nivel y técnicas, 5 cofres nuevos, sin enemigos de la isla anterior.
- Buster Call a los 12 s: 102 enemigos (tope 90 + crecimiento), ninguno en el mar profundo.
- Error encontrado y corregido: los cofres de una isla se sumaban a los de la siguiente.

# Sprites: pendiente (rehacer todo con la versión de primera aparición)

Atlas de Treasure Cruise (Spriters Resource, con el navegador del usuario). Descargas múltiples bloqueadas
por Chrome: hay que permitirlas en el sitio, o bajarlos a mano.
- [x] Atlas descargados (14, en su carpeta como Atlas_<id>.png): baroque 216304 · enelsoldier (Massacre Soldier) 216162 · cp9agent (Kaku) 216349
      · zombie (General Zombie) 216055 · pacifista (PX) 263209 · fishman (Karate Fishman) 472627 · toysoldier 533758
      · chess 216407 · gifter 216611 · mars 488148 · jupiter 483314 · venus 483310 · mercury 488141 · saturn 269888
      (hecho) Guardar cada uno como assets/ref/characters/<id>/Atlas_<id>.png (carpetas ya creadas).
- [ ] Marinas: Zephyr 216428, Ain 216430, T-Bone 262845 (East Blue y Guerra en la Cumbre).
- [ ] Jefes de la lista: Jack 275627, Kuzan 279744 (ya descargado en Descargas: #1192).

Enemigos normales: un tipo por saga ahora; la propuesta eran 3 por saga con ataques distintos (pendiente
de implementar en enemies.js y bosses/enemy.js). Huecos sin atlas: 3er enemigo de Alabasta, Dressrosa,
Whole Cake y Wano; Seraphim (no encontrado).

Generación con Gemini Pro (tools/gemini-8d.js lo hace por API; sin cuota gratis: se hace por la web):
- [ ] Cada personaje: atlas → hoja de andar 5×4 → sprites.config.js (walk5, despill, pockets, sideRef) → comprobar en juego.
- [x] Ataques de Mars, Jupiter, Venus y Mercury (bosses.js). Pendiente: sus hojas de andar (Gemini).
- [x] Tres enemigos por saga con ataques distintos (dash, cone, ranged, tank). Pendiente: sus hojas (Gemini).

## Generación automática de hojas (bloqueo y solución)
- La subida de archivos en la web de Gemini no es automatizable desde el navegador (el campo de archivo no es
  accesible y se abre un diálogo nativo). Por eso la generación pasa por la API.
- La API gratuita no da imágenes (límite 0). Solución: activar facturación en el proyecto de Google Cloud de la clave
  (AI Studio → clave → configurar facturación) y poner un tope de gasto. Coste estimado: unos 2-12 € para todo el juego
  (Flash ~0,04 € por imagen; Pro más caro). Después `node tools/gemini-8d.js <id>` por cada personaje.
- Pendiente de la generación: enemigos (33) y ancianos (Mars, Jupiter, Venus, Mercury) y jefes nuevos.

## Estado de los enemigos (con las poses de su atlas)
- [x] Con poses automáticas (tools/auto-enemy.js → tools/enemy.config.js): baroque (8), fishman (8), toysoldier, chess, jupiter, venus, mercury, saturn.
- [ ] Revisar a ojo los de pocos pasos (toysoldier, chess, mercury: 2 pasos).
- [ ] Sin pasos detectados (siguen con dibujo provisional): enelsoldier, cp9agent, zombie, pacifista, gifter, mars.
      Motivo: sus atlas tienen marco/fondo o mezclan efectos con personajes; el detector automático no los separa.
      Hay que elegir a mano las coordenadas de 4-6 poses por atlas (tools/contact.js + tools/auto-enemy.js con cajas fijas).
- [ ] Tercer enemigo de Alabasta, Dressrosa, Whole Cake y Wano: sin atlas (el usado es el de la saga).
- [ ] Seraphim (Final): sin atlas en la lista.
- [ ] Ataques de los enemigos nuevos: comprobar en el juego que no sobrecargan la pantalla.
