# One Piece Survivors

Bullet-heaven con los Sombrero de Paja, en la línea de PokéSurvivor (Survivor.io,
Vampire Survivors). HTML + CSS + JavaScript vanilla sobre Canvas 2D: sin build,
sin dependencias y todo local.

**Todo el arte es pixel art pintado desde código** (personajes, enemigos, islas,
iconos y efectos). El juego se pinta en un lienzo pequeño a resolución de arte y
se escala un número entero de veces sin suavizado, así que todos los píxeles
miden lo mismo, incluidas las chispas y los rayos.

## Jugar

Doble clic en `index.html`. O, para probar desde el móvil o depurar:

```
node tools/serve.js      # http://localhost:8080
```

| Tecla | Acción |
|---|---|
| `W` `A` `S` `D` / flechas | Moverse |
| `1` `2` `3` `4` | Elegir la técnica activa |
| `Q` / `E` | Cambiar de técnica |
| `Esc` / `P` | Pausa |

En móvil: arrastra el dedo para moverte (el joystick sale donde tocas) y toca
una técnica de abajo para cambiarla.

## Cómo se juega

- Tu tripulante **ataca solo** con la **técnica activa** (como en PokéSurvivor:
  sólo una a la vez, hasta 4 aprendidas). Cámbiala según la situación.
- Al subir de nivel eliges **1 de 3 cartas**: técnica nueva, mejorar una
  (hasta Nv. 5) o una mejora de la partida.
- **Islas** que cambian cada 3 minutos: East Blue, Alabasta, Skypiea y Thriller Bark.
  El agua frena; árboles y rocas bloquean; barriles y cajas se rompen y sueltan
  berries, carne o un Den Den Mushi (atrae toda la experiencia).
- **Jefes**: Capitán Morgan (2:30), Buggy (5:30), Arlong (8:30) y Crocodile (11:30),
  luego vuelven más fuertes. Sueltan un cofre del tesoro.
- Los **berries** se guardan al acabar: con ellos reclutas tripulantes y compras
  mejoras permanentes.

## Tripulación

| | Técnica inicial | Coste |
|---|---|---|
| Luffy | Gomu Gomu no Pistol | de serie |
| Zoro | Oni Giri | 600 ฿ |
| Nami | Thunderbolt Tempo | 900 ฿ |
| Usopp | Kayaku Boshi | 900 ฿ |
| Sanji | Collier Shoot | 1.400 ฿ |
| Chopper | Kokutei Roseo | 1.600 ฿ |
| Robin | Cien Fleur: Clutch | 2.000 ฿ |

Cada uno tiene 4 técnicas propias + 5 comunes (Cañonazo, Pistola de chispa y los tres Haki).

## Estructura

```
index.html            pantallas + orden de carga
css/style.css         interfaz de madera y carteles de "Se busca"
assets/fonts/         Pixelify Sans (OFL), copiada de PokéSurvivor
assets/chars/         hojas de sprites propias (ver "el taller")
tools/serve.js        servidor local mínimo
tools/sprites.html    taller de sprites (recortar hojas / convertir dibujos)
tools/build-sprites.js  generador: assets/ref/ -> assets/chars/ (config en sprites.config.js)
tools/png.js, pixelize.js  PNG sin dependencias y conversión a pixel art
assets/ref/           originales de One Piece Treasure Cruise
js/
  core/     util, save (localStorage), pixel (mapas de píxeles -> canvas),
            camera, input (teclado + joystick táctil), audio (sintetizador chiptune)
  data/     scope (qué está activo), sprites (pixel art en código),
            sprites-built (generado), custom-sprites (hojas a mano),
            moves, crew, enemies, upgrades
  world/    world (islas por ruido, horneado por chunks, objetos, colisiones)
  entities/ fx, projectile, enemy (+ gestor y rejilla espacial), pickup, player
  systems/  combat (las técnicas), spawner (oleadas y jefes), levelup (cartas)
  ui/       icons, hud, ui (pantallas)
  game.js   flujo y bucle principal
  main.js   arranque
```

## Alcance actual

Mientras se diseña el estilo, sólo están activos **Luffy**, el **marine** y
**Morgan** (`js/data/scope.js`). El resto de tripulantes, enemigos y jefes sigue
en los datos y se activa añadiéndolo ahí.

## Sprites

Los personajes salen de las ilustraciones de *One Piece Treasure Cruise*
(`assets/ref/`), convertidas a pixel art por un generador:

```
node tools/build-sprites.js          # todos
node tools/build-sprites.js luffy    # sólo uno
```

- `tools/sprites.config.js` dice, por personaje, qué fotogramas forman cada
  animación (`idle`, `walk`, `attack`, `hurt`), el alto final, los colores y
  si hay que quitar un fondo.
- Todos los fotogramas de un personaje usan la **misma escala y la misma
  paleta**, y se alinean por los pies.
- Escribe `assets/chars/<id>.png` y `js/data/sprites-built.js` (generado: no
  editar a mano).
- Lo que no tiene hoja usa el dibujo en código de `js/data/sprites.js`.
- Si `walk` tiene un solo fotograma, el juego lo anima con un rebote.

### El taller (`tools/sprites.html`)

Para probar una imagen suelta a mano (doble clic): arrastra o pega una hoja o un
dibujo, quita el fondo, recorta los fotogramas (clic en los recuadros o
arrastrando), mira la vista previa junto a un marine y descarga el PNG. Lo hecho
aquí se registra en `js/data/custom-sprites.js` y manda sobre lo generado.
Convierte igual que el generador (los dos usan `tools/pixelize.js`).

## Depurar

En la consola del navegador: `G.Game.debugStep(10)` simula 10 segundos de partida.

## Licencia

Proyecto de fan sin ánimo de lucro. One Piece es propiedad de Eiichiro Oda,
Shueisha y Toei Animation. La fuente Pixelify Sans va con su licencia OFL
(`assets/fonts/OFL.txt`).
