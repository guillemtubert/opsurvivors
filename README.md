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
js/
  core/     util, save (localStorage), pixel (mapas de píxeles -> canvas),
            camera, input (teclado + joystick táctil), audio (sintetizador chiptune)
  data/     sprites (pixel art de personajes), custom-sprites (hojas propias),
            moves, crew, enemies, upgrades
  world/    world (islas por ruido, horneado por chunks, objetos, colisiones)
  entities/ fx, projectile, enemy (+ gestor y rejilla espacial), pickup, player
  systems/  combat (las técnicas), spawner (oleadas y jefes), levelup (cartas)
  ui/       icons, hud, ui (pantallas)
  game.js   flujo y bucle principal
  main.js   arranque
```

## Sprites propios: el taller

Los personajes vienen dibujados en código (`js/data/sprites.js`, 16×20). Para
cambiarlos por sprites mejores está **`tools/sprites.html`** (doble clic):

1. Arrastra una hoja de sprites o un dibujo (o pégalo con Ctrl+V).
2. Quita el fondo: lo detecta solo por las esquinas, o elige el color con un clic.
3. Modo:
   - **Pixel art**, para hojas de juegos de GBA, DS, etc. Se recorta tal cual,
     o se reduce ×2, ×3... si la hoja viene ampliada (lo adivina).
   - **Convertir**, para dibujos o capturas. Se reduce a la altura que digas,
     se limita la paleta y se le pone contorno.
4. Haz clic en los recuadros numerados (o arrastra para recortar a mano) en este
   orden: **quieto, paso A, paso B**.
5. Mira la vista previa al lado de un marine, elige el personaje y **Descargar PNG**.
6. Guarda el PNG en `assets/chars/` y pega la línea que te da en
   `js/data/custom-sprites.js`.

Formato que espera el juego: tira horizontal de fotogramas del mismo tamaño,
mirando a la derecha, con los pies en el borde de abajo. Con `scale: 1` cada
píxel de la hoja mide lo mismo que uno del mapa, así que un sprite de 32 px
de alto sale el doble de grande que los dibujos actuales (con el doble de detalle).

## Depurar

En la consola del navegador: `G.Game.debugStep(10)` simula 10 segundos de partida.

## Licencia

Proyecto de fan sin ánimo de lucro. One Piece es propiedad de Eiichiro Oda,
Shueisha y Toei Animation. La fuente Pixelify Sans va con su licencia OFL
(`assets/fonts/OFL.txt`).
