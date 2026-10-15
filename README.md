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
una técnica de abajo para cambiarla. Se juega en horizontal o en vertical: la
cámara se acerca y el HUD se compacta en pantallas pequeñas. El botón de las
cuatro esquinas (título, puerto y HUD, o en Ajustes) pone la pantalla completa;
en iPhone, que no lo permite, usa «Añadir a pantalla de inicio».

## Cómo se juega

- Tu tripulante **ataca solo** con la **técnica activa** (como en PokéSurvivor:
  sólo una a la vez, hasta 4 aprendidas). Cámbiala según la situación.
- Al subir de nivel eliges **1 de 3 cartas**: técnica nueva, mejorar una
  (hasta Nv. 5) o una mejora de la partida.
- Una partida es una **saga**: varias **islas** seguidas, manteniendo nivel y técnicas.
  Cada isla es un mapa limitado por el mar, con un **minimapa** arriba a la derecha
  (tócalo para ampliarlo).
  1. **Explora**: hay cofres repartidos (opcionales; dan berries y una carta).
  2. Cuando quieras, usa el **Den Den Mushi** de la Marina (`Espacio` o el botón)
     para llamar al **jefe** de la isla. Si lo llamas antes del Buster Call, te
     llevas berries extra.
  3. A los **3 minutos** llega el **Buster Call**: cada vez más enemigos y más fuertes.
  4. Derrotado el jefe, sube al **Going Merry** en el muelle y zarpa a la siguiente isla.
- El agua frena y el mar profundo no se cruza; árboles y rocas bloquean; barriles
  y cajas se rompen y sueltan berries, carne o un Den Den Mushi pequeño (atrae
  toda la experiencia).
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
tools/build-props.js   objetos hechos en pixel art ampliado (Going Merry): assets/ref/props/ -> assets/props/
tools/png.js, pixelize.js  PNG sin dependencias y conversión a pixel art
assets/ref/characters/<id>/  originales de cada personaje (NO están en el repositorio: ver abajo)
js/
  core/     util, save (localStorage), pixel (mapas de píxeles -> canvas),
            camera, input (teclado + joystick táctil), audio (sintetizador chiptune)
  data/     scope (qué está activo), sprites (pixel art en código),
            sprites-built (generado), custom-sprites (hojas a mano),
            moves, crew, enemies, upgrades, islands (sagas, islas y sus jefes)
  world/    world (la isla: ruido continuo con caída hacia la costa, horneado por chunks, colisiones),
            island (cofres, Den Den Mushi, muelle y Going Merry, Buster Call),
            props (árboles, palmeras, rocas, barriles pintados a escala de los personajes)
  entities/ fx, projectile, enemy (+ gestor y rejilla espacial), pickup, player
  systems/  combat (las técnicas), spawner (oleadas, Buster Call y jefe), levelup (cartas)
  ui/       icons, minimap, hud, ui (pantallas)
  game.js   flujo y bucle principal
  main.js   arranque
```

## Alcance actual

Mientras se diseña el estilo, sólo están activos **Luffy** (de Elbaph) y
**Sanji**, el **marine** y la isla **Shells Town** con **Morgan** de jefe (`js/data/scope.js`).
Luffy, Sanji, el marine y Morgan andan en 8 direcciones. El resto de tripulantes, enemigos e islas
sigue en los datos y se activa añadiéndolo ahí (una isla sólo se activa si su jefe ya existe).

## Sprites (hojas)

### Originales y GitHub

Los originales (`assets/ref/`: ripeos de Treasure Cruise, hojas sin convertir)
**no se suben** al repositorio. El juego y GitHub Pages sólo necesitan las hojas
ya convertidas de `assets/chars/` (y `js/data/sprites-built.js`), que sí están.
Para regenerarlas hace falta tener `assets/ref/` en local.

- `.gitignore` deja fuera `assets/ref/`.
- `tools/hooks/pre-commit` cancela cualquier commit que lleve algo de
  `assets/ref/`, un JPG o un archivo de más de 2 MB (aunque se fuerce con
  `git add -f`). Al clonar el repositorio en otro ordenador, actívalo con:

  ```
  git config core.hooksPath tools/hooks
  ```
- Las hojas en JPG (`.jfif`) se pasan a PNG, junto al original, antes de
  generar: el generador sólo lee PNG.

Flujo para un personaje nuevo: dejar lo que haya en
`assets/ref/characters/<id>/` → configurarlo en `tools/sprites.config.js` →
`node tools/build-sprites.js <id>` → commit de `assets/chars/<id>.png` y
`js/data/sprites-built.js` → `git push` (GitHub Pages se actualiza solo).

Cada personaje tiene su carpeta `assets/ref/characters/<id>/` con todo lo que
haya de él (atlas de *One Piece Treasure Cruise*, hojas de 8 direcciones hechas
para el juego...). Un generador lo convierte a pixel art:

```
node tools/build-sprites.js          # todos
node tools/build-sprites.js luffy    # sólo uno
```

- `tools/sprites.config.js` dice, por personaje, qué recuadros de su atlas
  forman cada animación (`idle`, `walk`, `attack`, `hurt`), los colores y
  si hay que quitar un fondo. Sólo poses originales: no se inventan fotogramas.
- **Escala común** de los atlas de Treasure Cruise (`scale.factor`: 1 px del
  juego = 4,42 px del atlas): conservan las proporciones entre ellos y ninguno
  cambia de tamaño al cambiar de pose. `size` agranda a uno a propósito (p. ej.
  un jefe). Las hojas de otra resolución llevan su alto (`height`).
- Personajes de lado, mirando a izquierda o derecha. Al andar se usa la pose de
  correr con rebote y polvo en cada paso.
- Escribe `assets/chars/<id>.png` y `js/data/sprites-built.js` (generado: no
  editar a mano).
- Lo que no tiene hoja usa el dibujo en código de `js/data/sprites.js`.

### Hojas de 8 direcciones (hechas para el juego)

Formato (como `assets/ref/Sanji8D.png`):

- **4 filas** de la misma altura; en cada fila, **un bloque a la izquierda y
  otro a la derecha** de la mitad de la imagen, con 3-4 pasos de andar cada uno.
- Orden, en el sentido de las agujas del reloj desde abajo:

  | fila | izquierda | derecha |
  |---|---|---|
  | 1 | abajo | abajo-derecha |
  | 2 | derecha | arriba-derecha |
  | 3 | arriba | arriba-izquierda |
  | 4 | izquierda | abajo-izquierda |

- Fondo transparente (PNG) mejor; un fondo negro liso también vale
  (`bgDark`), pero un JPG pierde calidad en los bordes.
- En el config basta con `layout: 'rows4x2'` y su `height` (alto en el
  juego): los recuadros se detectan solos. 3 pasos se andan 1-2-3-2; 4, en
  bucle. Sin poses de ataque/daño se queda quieto mirando.
- Si la hoja no va por filas limpias (como la de Luffy de Elbaph), se indican
  los recuadros a mano en `dirs8`, y las direcciones de la izquierda pueden salir
  en espejo de las de la derecha (`{ mirror: 'right' }`).
- Ataque y daño pueden venir del atlas de Treasure Cruise del mismo personaje
  (poses de lado): `walkSheet` para la hoja de andar, `sheet` para el atlas.

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
