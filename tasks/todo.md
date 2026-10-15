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
- [ ] Hojas de Kuro y Wapol (siguen con el dibujo provisional)
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
