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
assets/chars/         hojas de sprites propias (opcional, ver abajo)
tools/serve.js        servidor local mínimo
js/
  core/     util, save (localStorage), pixel (mapas de píxeles -> canvas),
            camera, input (teclado + joystick táctil), audio (sintetizador chiptune)
  data/     sprites (pixel art de personajes), moves, crew, enemies, upgrades
  world/    world (islas por ruido, horneado por chunks, objetos, colisiones)
  entities/ fx, projectile, enemy (+ gestor y rejilla espacial), pickup, player
  systems/  combat (las técnicas), spawner (oleadas y jefes), levelup (cartas)
  ui/       icons, hud, ui (pantallas)
  game.js   flujo y bucle principal
  main.js   arranque
```

## Sprites propios (opcional)

Los personajes ya están dibujados en `js/data/sprites.js` (16×20, una letra por
píxel). Si quieres sustituir alguno por una hoja de sprites:

1. Pon el PNG en `assets/chars/` — por ejemplo `assets/chars/luffy.png`.
2. Formato: **tira horizontal de 3 fotogramas** (quieto, paso A, paso B),
   todos del mismo tamaño, **mirando a la derecha**, fondo transparente.
3. Regístralo al final de `js/data/sprites.js`:

   ```js
   G.CUSTOM_SPRITES = { luffy: { file: 'assets/chars/luffy.png', fw: 32, fh: 40, scale: 0.5 } };
   ```

   `fw`/`fh` = tamaño de cada fotograma en píxeles; `scale` = tamaño en el juego
   (1 = 2 unidades de mundo por píxel, igual que los dibujos en código).

## Depurar

En la consola del navegador: `G.Game.debugStep(10)` simula 10 segundos de partida.

## Licencia

Proyecto de fan sin ánimo de lucro. One Piece es propiedad de Eiichiro Oda,
Shueisha y Toei Animation. La fuente Pixelify Sans va con su licencia OFL
(`assets/fonts/OFL.txt`).
