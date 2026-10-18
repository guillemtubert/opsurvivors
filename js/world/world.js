/* ============ world.js — la isla, pintada en pixel art ============
 * Cada isla es un mapa limitado: el terreno se va hundiendo hacia el borde
 * y fuera sólo hay mar profundo, que no se puede cruzar. La costa es una
 * curva sin entrantes cerrados (el radio sólo depende del ángulo), así que no
 * hay rincones donde quedar atrapado.
 *
 * Terreno por tile (16 px de arte = G.TILE unidades de mundo):
 *   0 mar profundo (frena mucho) · 1 agua (frena) · 2 arena · 3 suelo
 * El suelo se hornea por chunks de 16×16 tiles escribiendo píxel a píxel en un
 * ImageData (orillas con espuma, bordes de hierba...). Los objetos (árboles,
 * palmeras, rocas, barriles) se dibujan cada frame ordenados por altura junto
 * a los personajes, para que puedas pasar por detrás de una palmera.
 *
 * Barriles y cajas se rompen y sueltan cosas. Árboles y rocas bloquean.
 */
G.World = (() => {
  const T = 16;                 // px de arte por tile
  const CH = 16;                // tiles por chunk
  const SPAWN_SAFE = 4;         // tiles sin objetos alrededor del origen

  const BIOMES = [
    { name: 'East Blue', sub: 'Villa Foosha', music: 'sea',
      ground: ['#4f9a45', '#56a24b', '#47903f'], speck: '#3c7a35', light: '#7cc45a', path: ['#a08050', '#94764a'],
      sand: ['#efd9a0', '#e8d095', '#f4e2b0'], sandDot: '#d4b878',
      water: '#3a8ad8', deep: '#2a6ab8', foam: '#e8f6ff', sparkle: '#bfe4ff',
      tree: 'tree', palm: 'palm', leaf: ['#2f7535', '#45943f', '#64b252', '#8ad06a'], trunk: ['#5b3b22', '#7a5130'],
      rock: ['#6e7680', '#8f98a3', '#b1bac4'], flowers: ['#f4d65c', '#f39ac0', '#ffffff'], tuft: ['#3c7a35', '#6ab854'] },
    { name: 'Alabasta', sub: 'Desierto del Reino de la Arena', music: 'sea',
      ground: ['#e0b46a', '#d8ac62', '#e6bc74'], speck: '#c49452', light: '#f0cc8a', path: ['#c89a5a', '#bc8e50'],
      sand: ['#f2d698', '#ecce8e', '#f6deaa'], sandDot: '#d8b070',
      water: '#3ab0c0', deep: '#2a8aa0', foam: '#d8fbff', sparkle: '#b8f0f8',
      tree: 'cactus', palm: 'palm', leaf: ['#3f7a3a', '#56963f', '#78b452', '#9ad06a'], trunk: ['#7a5a30', '#9a7440'],
      rock: ['#a0784a', '#bc9460', '#d6b07a'], flowers: ['#e06a4a', '#f4d65c', '#ffffff'], tuft: ['#a08040', '#c4a050'] },
    { name: 'Skypiea', sub: 'La isla del cielo', music: 'sea',
      ground: ['#eef3fa', '#e4ecf7', '#f7faff'], speck: '#cdd9ec', light: '#ffffff', path: ['#d6e2f2', '#ccd8ea'],
      sand: ['#cfe0f5', '#c4d8f0', '#dae8f8'], sandDot: '#aac4e4',
      water: '#7ab8f0', deep: '#5a98e0', foam: '#ffffff', sparkle: '#e8f4ff',
      tree: 'cloudtree', palm: 'palm', leaf: ['#3f9a6a', '#56b07a', '#7acc90', '#a8e6b4'], trunk: ['#8a6a4a', '#a8865c'],
      rock: ['#a8b8cc', '#c4d2e2', '#e0eaf4'], flowers: ['#ffe14d', '#ff9ec4', '#ffffff'], tuft: ['#c4d4e8', '#ffffff'] },
    { name: 'Thriller Bark', sub: 'El barco-isla fantasma', music: 'sea',
      ground: ['#4a4458', '#504a60', '#443e52'], speck: '#3a3446', light: '#64607a', path: ['#3a3640', '#34303a'],
      sand: ['#5e5a50', '#58544a', '#66625a'], sandDot: '#4a463e',
      water: '#3a4a3a', deep: '#2a362a', foam: '#7a8a6a', sparkle: '#9aac88',
      tree: 'dead', palm: 'dead', leaf: ['#3a3048', '#4a3e5a', '#5e5070', '#74688a'], trunk: ['#2e2638', '#463a50'],
      rock: ['#4a4656', '#625e70', '#7c788a'], flowers: ['#9a8ad0', '#5fe0c0', '#c9cfdc'], tuft: ['#3a3446', '#5a5470'] },
    { name: 'Isla de Drum', sub: 'El reino nevado', music: 'sea',
      ground: ['#e6edf4', '#dde6ef', '#eff4f9'], speck: '#c4d0de', light: '#ffffff', path: ['#b4c0ce', '#aab6c6'],
      sand: ['#d4dde8', '#ccd6e2', '#dee5ee'], sandDot: '#aab8c8',
      water: '#4a86b8', deep: '#2a5a8a', foam: '#ffffff', sparkle: '#d8f0ff',
      tree: 'tree', palm: 'tree', leaf: ['#24504a', '#33665a', '#c8dce4', '#ffffff'], trunk: ['#4a3a2a', '#6a5040'],
      rock: ['#7a8696', '#9aa6b6', '#c4ccd8'], flowers: ['#ffffff', '#bfe4ff', '#e8f0f4'], tuft: ['#c4d0de', '#ffffff'] }
,
    // 5 · Water 7: piedra y canales, casas de tejado azul.
    { name: 'Water 7', sub: 'La ciudad del agua', music: 'sea',
      ground: ['#b8b0a0', '#c0b8a8', '#aea696'], speck: '#9a9284', light: '#d8d0c0', path: ['#8a8478', '#7e786c'],
      sand: ['#d8d0c0', '#d0c8b8', '#e0d8c8'], sandDot: '#b0a898',
      water: '#3a8ad8', deep: '#2a6ab8', foam: '#e8f6ff', sparkle: '#bfe4ff',
      tree: ['house', 'house', 'tree'], palm: 'house', wall: '#e8d8b8', roof: '#4a7ab8',
      leaf: ['#2f7535', '#45943f', '#64b252', '#8ad06a'], trunk: ['#5b3b22', '#7a5130'],
      rock: ['#7a7a84', '#9a9aa4', '#c0c0c8'], flowers: ['#f4d65c', '#f39ac0', '#ffffff'], tuft: ['#7a8a5a', '#9aaa6a'] },
    // 6 · Selva (Little Garden, Amazon Lily, Zou, Rusukaina).
    { name: 'Selva', sub: 'Árboles gigantes y lianas', music: 'sea',
      ground: ['#3a7a32', '#408238', '#36722e'], speck: '#2a6226', light: '#5a9a44', path: ['#6a5030', '#5e4628'],
      sand: ['#d8c890', '#d0c088', '#e0d098'], sandDot: '#b8a870',
      water: '#3a9a8a', deep: '#2a7a70', foam: '#d8f8f0', sparkle: '#b8f0e0',
      tree: ['jungletree', 'jungletree', 'tree'], palm: 'palm',
      leaf: ['#1e5a24', '#2e7a30', '#46963c', '#6ab452'], trunk: ['#4a3018', '#6a4424'],
      rock: ['#5a6a5a', '#7a8a78', '#9aaa98'], flowers: ['#e83a6a', '#f2c020', '#ffffff'], tuft: ['#2a6226', '#4a8a3a'] },
    // 7 · Prisión (Impel Down): piedra oscura y columnas con cadenas.
    { name: 'Impel Down', sub: 'La gran prisión submarina', music: 'sea',
      ground: ['#5a5058', '#605660', '#544a52'], speck: '#463e46', light: '#7a7078', path: ['#3e363e', '#363036'],
      sand: ['#6a5a5a', '#625454', '#726262'], sandDot: '#4e4242',
      water: '#3a2a4a', deep: '#22182e', foam: '#8a7a9a', sparkle: '#a898b8',
      tree: 'pillar', palm: 'pillar',
      leaf: ['#3a3446', '#4a3e5a', '#5e5070', '#74688a'], trunk: ['#2e2638', '#463a50'],
      rock: ['#4a4450', '#6a6270', '#8a8292'], flowers: ['#c83a3a', '#8a3ac0', '#5a5058'], tuft: ['#463e46', '#5a5058'] },
    // 8 · Manglar (Sabaody): hierba húmeda y manglares con burbujas.
    { name: 'Archipiélago Sabaody', sub: 'Manglares y burbujas', music: 'sea',
      ground: ['#6a9a4a', '#72a250', '#629244'], speck: '#58843c', light: '#8aba62', path: ['#8a7a50', '#7e6e48'],
      sand: ['#c8c098', '#c0b890', '#d0c8a0'], sandDot: '#a8a078',
      water: '#4aa0b8', deep: '#2a7a98', foam: '#e8f8ff', sparkle: '#c8f0ff',
      tree: ['mangrove', 'mangrove', 'tree'], palm: 'mangrove',
      leaf: ['#3a7a3a', '#4e9444', '#6ab05a', '#8ccc72'], trunk: ['#6a5a3a', '#8a7a52'],
      rock: ['#6e7680', '#8f98a3', '#b1bac4'], flowers: ['#f4d65c', '#bfe4ff', '#ffffff'], tuft: ['#58843c', '#7aaa58'] },
    // 9 · Coral (Isla Gyojin): arena pálida bajo el mar, coral y algas.
    { name: 'Isla Gyojin', sub: 'Bajo el mar', music: 'sea',
      ground: ['#c8c0a0', '#d0c8a8', '#c0b898'], speck: '#a8a080', light: '#e0d8b8', path: ['#a89878', '#9a8a6c'],
      sand: ['#e0d8b8', '#d8d0b0', '#e8e0c0'], sandDot: '#c0b898',
      water: '#2a6ab8', deep: '#1a4a98', foam: '#a8d8ff', sparkle: '#c8e8ff',
      tree: ['coral', 'coral', 'seaweed'], palm: 'seaweed',
      leaf: ['#c83a6a', '#e86a8a', '#f89aaa', '#ffc8d0'], trunk: ['#5b3b22', '#7a5130'],
      rock: ['#6a8aa0', '#8aaac0', '#aac8d8'], flowers: ['#ff9ec4', '#ffd23f', '#ffffff'], tuft: ['#2a7a5a', '#4aa07a'] },
    // 10 · Punk Hazard: la mitad oeste es fuego y la este, hielo (halves).
    null,
    // 11 · Dressrosa: hierba alegre, girasoles y caminos de terracota.
    { name: 'Dressrosa', sub: 'El reino del amor y los juguetes', music: 'sea',
      ground: ['#7ab84a', '#82c050', '#72b044'], speck: '#66a03c', light: '#9ad862', path: ['#c87850', '#b86c48'],
      sand: ['#f0d8a0', '#e8d098', '#f4e0b0'], sandDot: '#d0b878',
      water: '#3a9ad8', deep: '#2a7ab8', foam: '#e8f6ff', sparkle: '#bfe4ff',
      tree: ['sunflower', 'sunflower', 'tree'], palm: 'palm',
      leaf: ['#2f7535', '#45943f', '#64b252', '#8ad06a'], trunk: ['#5b3b22', '#7a5130'],
      rock: ['#a87a5a', '#c89a78', '#e0b898'], flowers: ['#f4d65c', '#ff6bb0', '#ffffff'], tuft: ['#4a8a30', '#7ab84a'] },
    // 12 · Dulces (Whole Cake): suelo de nata rosa, caminos de chocolate, piruletas.
    { name: 'Whole Cake', sub: 'El país de los dulces', music: 'sea',
      ground: ['#f4c0d0', '#f8c8d8', '#f0b8c8'], speck: '#e8a8bc', light: '#ffe0e8', path: ['#7a4a2a', '#6a4024'],
      sand: ['#f8e8c8', '#f4e0c0', '#fff0d8'], sandDot: '#e0c8a0',
      water: '#c87ab8', deep: '#a85a98', foam: '#ffe8f8', sparkle: '#ffd8f0',
      tree: ['lollipop', 'lollipop', 'candycane'], palm: 'candycane',
      leaf: ['#e86a8a', '#f89aaa', '#ffc8d0', '#ffe8ec'], trunk: ['#7a4a2a', '#9a6a3a'],
      rock: ['#a86a4a', '#c88a6a', '#e8aa8a'], flowers: ['#e83a6a', '#7ab8f0', '#ffd23f'], tuft: ['#e8a8bc', '#ffffff'] },
    // 13 · Wano: hierba, cerezos en flor y toriis en la costa.
    { name: 'Wano', sub: 'El país de los samuráis', music: 'sea',
      ground: ['#6a9a48', '#72a250', '#629244'], speck: '#58843c', light: '#8aba62', path: ['#b89868', '#a88a5e'],
      sand: ['#e0d0a0', '#d8c898', '#e8d8b0'], sandDot: '#c0b080',
      water: '#3a7ac8', deep: '#2a5aa8', foam: '#e8f6ff', sparkle: '#bfe4ff',
      tree: ['tree', 'tree', 'torii'], palm: 'torii',
      leaf: ['#c86a8a', '#e88aa8', '#f8b0c8', '#ffd8e4'], trunk: ['#3a2418', '#5a3a28'],
      rock: ['#6e7680', '#8f98a3', '#b1bac4'], flowers: ['#ff9ec4', '#ffffff', '#f4d65c'], tuft: ['#58843c', '#7aaa58'] },
    // 14 · Egghead: suelo metálico claro y torres con luz.
    { name: 'Egghead', sub: 'La isla del futuro', music: 'sea',
      ground: ['#d8e0ea', '#e0e8f0', '#d0d8e4'], speck: '#b8c4d4', light: '#f4f8fc', path: ['#a8b8c8', '#98a8ba'],
      sand: ['#e8eef4', '#e0e8f0', '#f0f4f8'], sandDot: '#c0ccd8',
      water: '#3ab0d8', deep: '#2a90b8', foam: '#e8fbff', sparkle: '#c8f4ff',
      tree: ['pylon', 'pylon', 'tree'], palm: 'pylon',
      leaf: ['#3a8a6a', '#4aa07a', '#6abc94', '#9ad8b4'], trunk: ['#6a7a8a', '#8a9aaa'],
      rock: ['#8a9aaa', '#a8b8c8', '#c8d8e8'], flowers: ['#ff6bb0', '#5fe0ff', '#ffffff'], tuft: ['#b8c4d4', '#ffffff'] },
    // 15 · Elbaph: bosque de árboles gigantes.
    { name: 'Elbaph', sub: 'La tierra de los gigantes', music: 'sea',
      ground: ['#4a7a3a', '#528240', '#427234'], speck: '#38662c', light: '#6a9a50', path: ['#7a6040', '#6e5638'],
      sand: ['#d8c898', '#d0c090', '#e0d0a0'], sandDot: '#b8a878',
      water: '#3a7ab8', deep: '#2a5a98', foam: '#e8f6ff', sparkle: '#bfe4ff',
      tree: ['giantree', 'tree', 'tree'], palm: 'tree',
      leaf: ['#24502a', '#33683a', '#4a8a4a', '#6aa862'], trunk: ['#4a3420', '#6a4a2e'],
      rock: ['#6a7068', '#8a9088', '#aab0a8'], flowers: ['#f4d65c', '#ffffff', '#c8a0f0'], tuft: ['#38662c', '#5a8a44'] },
    // 16 · Mármol (Enies Lobby, Mary Geoise): suelo blanco y columnas.
    { name: 'Mármol', sub: 'Los edificios del Gobierno Mundial', music: 'sea',
      ground: ['#e8e4dc', '#ece8e0', '#e0dcd4'], speck: '#d0ccc4', light: '#ffffff', path: ['#c8c0b0', '#bcb4a4'],
      sand: ['#f0ece4', '#e8e4dc', '#f8f4ec'], sandDot: '#d0c8bc',
      water: '#3a8ad8', deep: '#2a6ab8', foam: '#e8f6ff', sparkle: '#bfe4ff',
      tree: ['column', 'column', 'tree'], palm: 'column',
      leaf: ['#2f7535', '#45943f', '#64b252', '#8ad06a'], trunk: ['#5b3b22', '#7a5130'],
      rock: ['#b8b0a4', '#d8d0c4', '#ece8e0'], flowers: ['#f4d65c', '#ffffff', '#c8c0b0'], tuft: ['#a8b890', '#c8d0b0'] }
  ];

  // Punk Hazard: la mitad oeste es fuego (lava, rocas volcánicas) y la este, hielo.
  const FIRE = { name: 'Punk Hazard', sub: 'Fuego y hielo', music: 'sea', key: 'fire',
    ground: ['#6a3a2a', '#723e2c', '#623426'], speck: '#4a2a20', light: '#8a4a34', path: ['#3a2420', '#32201c'],
    sand: ['#4a2a22', '#42261e', '#523026'], sandDot: '#2e1a14',
    water: '#e0581a', deep: '#a83a10', foam: '#ffd23f', sparkle: '#ffb040',
    tree: 'lavarock', palm: 'lavarock',
    leaf: ['#3a2a20', '#4a3428', '#5e4434', '#745840'], trunk: ['#2e1c14', '#46302a'],
    rock: ['#2e1c1c', '#4a2a24', '#6a3a2a'], flowers: ['#ff8a2a', '#ffe14d', '#c83a1a'], tuft: ['#4a2a20', '#6a3a2a'] };
  const ICE = Object.assign({}, BIOMES[4], { name: 'Punk Hazard', sub: 'Fuego y hielo', key: 'ice', tree: 'icecrystal', palm: 'icecrystal' });
  BIOMES[10] = Object.assign({}, FIRE, { halves: [FIRE, ICE] });

  // ---------------- detalles pequeños (por bioma) ----------------
  // Los objetos grandes (árboles, rocas, barriles...) están en world/props.js.
  const PROPS = {
    tuft: { rows: ['.1..1.1.', '.11.111.', '1121121.', '.222222.'],
      pal: b => ({ 1: b.tuft[1], 2: b.tuft[0] }), ox: 4, oy: 3 },
    flower: { rows: ['.a.', 'aya', '.a.', '.g.'],
      pal: b => ({ a: b.flowers[0], y: '#fff6b0', g: b.tuft[0] }), ox: 1, oy: 3 },
    flower2: { rows: ['.a.', 'aya', '.a.', '.g.'],
      pal: b => ({ a: b.flowers[1], y: '#fff6b0', g: b.tuft[0] }), ox: 1, oy: 3 },
    shell: { rows: ['.kkk.', 'kpPpk', 'kPpPk', '.kkk.'],
      pal: () => ({ p: '#ffc0c8', P: '#e8909c' }), ox: 2, oy: 3 }
  };

  let seed = 1, biome = 0, radius = 50;  // radio de la isla en tiles
  const chunks = new Map();             // "cx,cy" -> canvas
  const reserved = new Set();           // "tx,ty" sin objetos (cofres, Den Den Mushi, muelle...)
  let pier = null;                      // muelle: { x0, y0, x1, y1 } en unidades de mundo, se anda sobre él
  const broken = new Set();             // "tx,ty" de barriles rotos
  const damage = new Map();             // "tx,ty" -> { hp, flash }
  const propCache = new Map();          // "bioma/prop" -> { img, white }

  /** El bioma actual; con tx (columna de tiles), la mitad que toca si está partido (Punk Hazard). */
  function B(tx) {
    const b = BIOMES[biome];
    return b.halves && tx !== undefined ? b.halves[tx < 0 ? 0 : 1] : b;
  }
  /** Elige entre varios (b.tree puede ser una lista): siempre el mismo para el mismo tile. */
  const pickOf = (v, tx, ty) => Array.isArray(v) ? v[Math.floor(G.U.hash(tx, ty, seed + 11) * v.length)] : v;

  // Mapa dibujado a mano (islands.js: map). Su imagen decide tierra y agua por tile.
  let mapImg = null, mapMask = null, mapX0 = 0, mapY0 = 0, mapW = 0, mapH = 0, mapGates = [];
  /**
   * Carga la imagen y calcula la máscara de tiles (0 tierra, 1 agua somera, 2 bloqueado; fuera, 2).
   * La máscara se calcula a resolución de imagen (muros finos) y se reduce a tiles:
   * un tile está bloqueado si al menos el 40 % de sus píxeles lo están.
   * gates: puertas en píxeles de la imagen (se pasa por ellas y son el punto de aparición).
   */
  function setMap(src, tiles, gates = [], onReady, solids = []) {
    const img = new Image();
    img.onload = () => {
      const iw = img.width, ih = img.height;
      const c = document.createElement('canvas');
      c.width = iw; c.height = ih;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      const px = G.MapMask.build(x.getImageData(0, 0, iw, ih).data, iw, ih, gates, solids);
      mapW = Math.round(tiles); mapH = Math.round(mapW * ih / iw);
      mapX0 = -mapW / 2; mapY0 = -mapH / 2;
      const mask = new Uint8Array(mapW * mapH);
      for (let ty = 0; ty < mapH; ty++) for (let tx = 0; tx < mapW; tx++) {
        const x0 = Math.floor(tx * iw / mapW), x1 = Math.floor((tx + 1) * iw / mapW);
        const y0 = Math.floor(ty * ih / mapH), y1 = Math.floor((ty + 1) * ih / mapH);
        let blocked = 0, water = 0, total = 0;
        for (let y = y0; y < y1; y++) for (let xx = x0; xx < x1; xx++) {
          const v = px[y * iw + xx]; total++;
          if (v === 2) blocked++; else if (v === 1) water++;
        }
        mask[ty * mapW + tx] = blocked >= total * 0.4 ? 2 : water >= total * 0.5 ? 1 : 0;
      }
      mapMask = mask; mapImg = img; mapGates = gates.map(g => ({
        x: (mapX0 + (g.x + g.w / 2) / iw * mapW) * G.TILE,
        y: (mapY0 + (g.y + g.h / 2) / ih * mapH) * G.TILE
      }));
      chunks.clear();
      if (onReady) onReady();
    };
    img.src = src;
  }
  function clearMap() { mapImg = null; mapMask = null; mapGates = []; }
  /** Puertas del mapa (centros en unidades de mundo), o [] si la isla no tiene mapa dibujado. */
  const gates = () => mapGates;
  function maskAt(x, y) {
    const tx = Math.floor(x / G.TILE - mapX0), ty = Math.floor(y / G.TILE - mapY0);
    if (tx < 0 || ty < 0 || tx >= mapW || ty >= mapH) return 2;
    return mapMask[ty * mapW + tx];
  }

  function reset(s, r = 48) {
    seed = s | 0; radius = r; clearMap();
    chunks.clear(); broken.clear(); damage.clear(); reserved.clear(); terrCache.clear();
    pier = null;
  }

  /** Deja sin objetos los tiles a menos de r tiles de (x, y) (en unidades de mundo). */
  function reserve(x, y, r) {
    const cx = Math.floor(x / G.TILE), cy = Math.floor(y / G.TILE);
    for (let ty = cy - r; ty <= cy + r; ty++) for (let tx = cx - r; tx <= cx + r; tx++) {
      if ((tx - cx) ** 2 + (ty - cy) ** 2 <= r * r) reserved.add(tx + ',' + ty);
    }
  }

  /** Muelle: rectángulo de mundo por el que se anda aunque haya agua debajo. */
  function setPier(rect) { pier = rect; chunks.clear(); }
  const onPier = (x, y) => pier && x >= pier.x0 && x <= pier.x1 && y >= pier.y0 && y <= pier.y1;

  function setBiome(i) {
    biome = ((i % BIOMES.length) + BIOMES.length) % BIOMES.length;
    chunks.clear();
  }

  // ---------------- terreno ----------------
  /*
   * Un campo de ruido continuo decide el terreno en cada punto (no por tile):
   * así las orillas y los caminos tienen formas orgánicas a nivel de píxel.
   *   n < W0 mar profundo · < W1 agua · < S1 arena · resto suelo
   * Las franjas justo por debajo de cada umbral son la espuma, el agua clara
   * y el borde de hierba.
   */
  const W0 = 0.26, W1 = 0.33, S1 = 0.39;

  /** Radio de la costa (en tiles) según el ángulo: una curva suave. */
  function coastAt(fx, fy) {
    const a = Math.atan2(fy, fx);
    return radius * (0.86 + 0.28 * G.U.noise(Math.cos(a) * 1.6 + 7, Math.sin(a) * 1.6 + 7, seed + 3));
  }

  /** Valor del campo en coordenadas de tile (con decimales). */
  function field(fx, fy) {
    const d = Math.hypot(fx, fy);
    // Por dentro casi todo es tierra (con alguna charca); hacia la costa se hunde.
    let n = G.U.fbm(fx * 0.05, fy * 0.05, seed) + 0.17;
    const k = d / coastAt(fx, fy);
    if (k > 0.72) n -= Math.min(1, (k - 0.72) / 0.32) ** 1.6 * 0.75;
    // Lo cerca del origen siempre es tierra: se empieza en tierra firme.
    if (d < 9) n += (9 - d) * 0.04;
    return n;
  }
  const classify = n => n < W0 ? 0 : n < W1 ? 1 : n < S1 ? 2 : 3;

  /** Veta de camino de tierra (0 = en el centro del camino). */
  const pathField = (fx, fy) => Math.abs(G.U.noise(fx * 0.07, fy * 0.07, seed + 99) - 0.5);
  const PATH_W = 0.018;

  const terrCache = new Map();
  /** Terreno en el centro de un tile (para colocar objetos). */
  function terrAt(tx, ty) {
    const k = ((tx & 0xffff) << 16) | (ty & 0xffff);
    let v = terrCache.get(k);
    if (v === undefined) {
      v = classify(field(tx + 0.5, ty + 0.5));
      if (terrCache.size > 200000) terrCache.clear();
      terrCache.set(k, v);
    }
    return v;
  }

  function isPath(tx, ty) { return pathField(tx + 0.5, ty + 0.5) < PATH_W * 1.6; }

  /** Objeto de un tile (o null). Mismo resultado siempre para la misma semilla. */
  function propAt(tx, ty) {
    if (mapMask) return null;
    if (Math.abs(tx) < SPAWN_SAFE && Math.abs(ty) < SPAWN_SAFE) return null;
    if (reserved.has(tx + ',' + ty)) return null;
    const t = terrAt(tx, ty);
    const h = G.U.hash(tx, ty, seed + 5);
    const b = B(tx);
    // Los grandes (árboles, palmeras) sólo en tiles pares: así nunca se pisan.
    const grid = !(tx & 1) && !(ty & 1);
    let p = null;
    if (t === 3) {
      if (isPath(tx, ty)) p = h < 0.04 ? 'flower' : null;
      else if (grid && h < 0.085) p = pickOf(b.tree, tx, ty);
      else if (!grid && h < 0.012) p = 'rock';
      else if (!grid && h < 0.022) p = 'barrel';
      else if (!grid && h < 0.028) p = 'crate';
      else if (h < 0.2) p = 'tuft';
      else if (h < 0.24) p = 'flower';
      else if (h < 0.27) p = 'flower2';
    } else if (t === 2) {
      if (grid && h < 0.07) p = pickOf(b.palm, tx, ty);
      else if (!grid && h < 0.008) p = 'crate';
      else if (!grid && h < 0.016) p = 'barrel';
      else if (h < 0.07) p = 'shell';
    } else if (t === 1 && !grid && h < 0.008) p = 'rock';
    if (p && broken.has(tx + ',' + ty)) return null;
    return p;
  }

  /** Desplazamiento del objeto dentro de su tile (para que no parezca rejilla). */
  function jitter(tx, ty) {
    // Los grandes se mueven más (hasta media celda de 2×2): que no se vea la rejilla.
    const big = !(tx & 1) && !(ty & 1), ax = big ? 15 : 7, ay = big ? 11 : 5;
    return [Math.floor(G.U.hash(tx, ty, seed + 8) * ax) - (ax >> 1), Math.floor(G.U.hash(tx, ty, seed + 9) * ay) - (ay >> 1)];
  }

  // ---------------- horneado del suelo ----------------

  function rgb32(hex) {
    const n = parseInt(hex.slice(1), 16);
    return (255 << 24) | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255);
  }

  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  // Tabla de azar de 256×256 para la textura del suelo: calcular un hash por
  // píxel era lo que más costaba al hornear (se repite cada 256 px: no se nota).
  const RND = new Float32Array(256 * 256);
  for (let i = 0; i < RND.length; i++) RND[i] = G.U.hash(i & 255, i >> 8, 3);
  const rnd = (x, y) => RND[((y & 255) << 8) | (x & 255)];

  function bake(cx, cy) {
    const b = B(cx * CH);
    const S = CH * T;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const x = c.getContext('2d');
    const img = x.createImageData(S, S);
    const buf = new Uint32Array(img.data.buffer);
    const P = {
      g: b.ground.map(rgb32), sp: rgb32(b.speck), li: rgb32(b.light), pa: b.path.map(rgb32),
      pe: rgb32(G.U.shade(b.path[0], -0.18)),
      sa: b.sand.map(rgb32), sd: rgb32(b.sandDot), wa: rgb32(b.water), de: rgb32(b.deep),
      fo: rgb32(b.foam), wl: rgb32(G.U.shade(b.water, 0.18)), sw: rgb32(G.U.shade(b.sand[0], -0.1))
    };
    const ax0 = cx * S, ay0 = cy * S;
    // El ruido se calcula cada STEP píxeles y se interpola: mismas formas, 16 veces menos trabajo.
    const STEP = 4, GW = S / STEP + 1;
    const nG = new Float32Array(GW * GW), pG = new Float32Array(GW * GW);
    for (let j = 0; j < GW; j++) for (let i = 0; i < GW; i++) {
      const fx = (ax0 + i * STEP) / T, fy = (ay0 + j * STEP) / T;
      nG[j * GW + i] = field(fx, fy);
      pG[j * GW + i] = pathField(fx, fy);
    }
    const lerp2 = (g, px, py) => {
      const i = px / STEP | 0, j = py / STEP | 0, u = (px % STEP) / STEP, v = (py % STEP) / STEP, k = j * GW + i;
      return (g[k] * (1 - u) + g[k + 1] * u) * (1 - v) + (g[k + GW] * (1 - u) + g[k + GW + 1] * u) * v;
    };
    for (let py = 0; py < S; py++) {
      for (let px = 0; px < S; px++) {
        const ax = ax0 + px, ay = ay0 + py;
        const n = lerp2(nG, px, py);
        const hh = rnd(ax, ay), dth = BAYER[(ay & 3) * 4 + (ax & 3)];
        let col;
        if (n < W0) {
          col = n > W0 - 0.02 * dth ? P.wa : P.de;                       // fondo que se aclara
        } else if (n < W1) {
          const e = (W1 - n) / 0.012;                                      // 0 en la orilla, 1 = agua abierta
          col = e < 0.12 + 0.18 * dth ? P.fo : e < 0.45 + 0.35 * dth ? P.wl : P.wa;
          if (e > 1 && ((ax * 3 + ay * 7) % 53 === 0 || hh < 0.004)) col = P.wl;  // olas
        } else if (n < S1) {
          col = P.sa[(hh * 3) | 0];
          if (hh > 0.975) col = P.sd;
          const e = (n - W1) / 0.012;                                      // arena mojada junto al agua
          if (e < dth) col = P.sw;
          const g = (S1 - n) / 0.012;                                      // hierba que invade la arena
          if (g < dth * 0.9) col = P.g[0];
        } else {
          col = P.g[(hh * 3) | 0];
          if (hh > 0.985) col = P.sp;
          else if (hh < 0.012) col = P.li;
          const bl = rnd((ax >> 2) + 97, (ay >> 2) + 31);
          if (bl < 0.08 && (ax & 3) === 1) { if ((ay & 3) === 1) col = P.li; else if ((ay & 3) === 2) col = P.sp; }
          // Camino de tierra con borde tramado.
          const pf = lerp2(pG, px, py);
          if (n > S1 + 0.015 && pf < PATH_W + 0.006 * dth) {
            col = pf > PATH_W - 0.004 ? P.pe : P.pa[hh < 0.5 ? 0 : 1];
            if (hh > 0.97) col = P.pe;
          }
        }
        buf[py * S + px] = col;
      }
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  let baked = 0;                       // chunks horneados en este frame
  /** Chunk horneado, o null si ya se gastó el presupuesto de este frame. */
  function chunk(cx, cy, must = true) {
    const k = cx + ',' + cy;
    let c = chunks.get(k);
    if (!c) {
      if (!must && baked >= 1) return null;
      baked++;
      c = bake(cx, cy);
      chunks.set(k, c);
      if (chunks.size > 120) {
        // Suelta los más viejos (el Map guarda el orden de inserción).
        const first = chunks.keys().next().value;
        chunks.delete(first);
      }
    }
    return c;
  }

  /**
   * Pinta el suelo visible. Además hornea por adelantado (como mucho uno por
   * frame) los chunks del anillo de alrededor, para que al avanzar ya estén
   * listos y no haya tirones (cada uno cuesta ~15 ms).
   */
  function drawGround(ctx) {
    if (mapImg) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(mapImg, mapX0 * G.TILE, mapY0 * G.TILE, mapW * G.TILE, mapH * G.TILE);
      return;
    }
    const cam = G.Camera, S = CH * G.TILE;
    const x0 = Math.floor((cam.x - cam.w / 2) / S), x1 = Math.floor((cam.x + cam.w / 2) / S);
    const y0 = Math.floor((cam.y - cam.h / 2) / S), y1 = Math.floor((cam.y + cam.h / 2) / S);
    baked = 0;
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      ctx.drawImage(chunk(cx, cy), cx * S, cy * S, S, S);
    }
    for (let cy = y0 - 1; cy <= y1 + 1; cy++) for (let cx = x0 - 1; cx <= x1 + 1; cx++) {
      if (cy >= y0 && cy <= y1 && cx >= x0 && cx <= x1) continue;
      chunk(cx, cy, false);
    }
  }

  // ---------------- objetos ----------------

  /** Datos de un objeto: { solid (px de arte), hp, big } (los pequeños no tienen solid). */
  function propDef(name) { return G.Props.has(name) ? G.Props.META[name] : PROPS[name]; }

  /** Imagen de un objeto en el bioma actual: { img, white, ox, oy }. */
  function propImg(name, tx) {
    const b = B(tx), k = biome + (b.key || '') + '/' + name;
    let p = propCache.get(k);
    if (!p) {
      if (G.Props.has(name)) p = G.Props.make(name, b);
      else { const d = PROPS[name]; p = { img: G.Pix.paint(d.rows, d.pal(b)), ox: d.ox, oy: d.oy }; }
      p.white = G.Pix.white(p.img);
      propCache.set(k, p);
    }
    return p;
  }

  /** Mete en `list` los objetos visibles: { y, draw(ctx) } para ordenar por altura. */
  function collectProps(list, now) {
    const cam = G.Camera, TL = G.TILE;
    // Margen amplio: un árbol que está debajo de la vista asoma por arriba.
    const x0 = Math.floor((cam.x - cam.w / 2) / TL) - 2, x1 = Math.floor((cam.x + cam.w / 2) / TL) + 2;
    const y0 = Math.floor((cam.y - cam.h / 2) / TL) - 1, y1 = Math.floor((cam.y + cam.h / 2) / TL) + 4;
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const name = propAt(tx, ty);
      if (!name) continue;
      const d = propDef(name);
      const [jx, jy] = jitter(tx, ty);
      const fx = (tx * T + T / 2 + jx) * G.PX, fy = (ty * T + T / 2 + jy) * G.PX;
      const dmg = damage.get(tx + ',' + ty);
      const flat = !d.solid;
      list.push({
        y: flat ? fy - 1000 : fy,                 // lo plano siempre debajo
        draw(ctx) {
          const p = propImg(name, tx);
          let sx = 0;
          if (dmg && now - dmg.at < 0.15) sx = Math.sin(now * 90) * 2;
          const img = dmg && now - dmg.at < 0.08 ? p.white : p.img;
          // Si el jugador queda tapado por un objeto grande, éste se transparenta.
          const pl = G.Game.player;
          const hide = d.big && pl && pl.y < fy - 4 && Math.abs(pl.x - fx) < img.width * G.PX * 0.45 && pl.y > fy - p.oy * G.PX;
          if (d.solid) {
            // Sombra en el suelo.
            ctx.fillStyle = 'rgba(0,0,0,.25)';
            ctx.beginPath(); ctx.ellipse(fx, fy, d.solid * G.PX * (d.big ? 2.2 : 1.3), d.solid * G.PX * (d.big ? 0.8 : 0.5), 0, 0, 6.283); ctx.fill();
          }
          if (hide) ctx.globalAlpha = 0.5;
          ctx.drawImage(img, fx - p.ox * G.PX + sx, fy - p.oy * G.PX, img.width * G.PX, img.height * G.PX);
          ctx.globalAlpha = 1;
        }
      });
    }
  }

  /** Objetos sólidos cercanos a (x, y): [{ x, y, r, tx, ty, name }] */
  function solidsNear(x, y, rad) {
    const TL = G.TILE, out = [];
    const tx0 = Math.floor((x - rad) / TL) - 1, tx1 = Math.floor((x + rad) / TL) + 1;
    const ty0 = Math.floor((y - rad) / TL) - 1, ty1 = Math.floor((y + rad) / TL) + 1;
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const name = propAt(tx, ty);
      const d = name && propDef(name);
      if (!d || !d.solid) continue;
      const [jx, jy] = jitter(tx, ty);
      out.push({ x: (tx * T + T / 2 + jx) * G.PX, y: (ty * T + T / 2 + jy) * G.PX - 3, r: d.solid * G.PX, tx, ty, name });
    }
    return out;
  }

  /** Empuja un círculo fuera de los objetos sólidos. Devuelve [x, y]. */
  function resolve(x, y, r) {
    for (const s of solidsNear(x, y, r + 24)) {
      const dx = x - s.x, dy = y - s.y, min = r + s.r;
      const d2 = dx * dx + dy * dy;
      if (d2 < min * min) {
        const d = Math.sqrt(d2) || 0.01;
        x = s.x + dx / d * min; y = s.y + dy / d * min;
      }
    }
    return [x, y];
  }

  function isFree(x, y, r) {
    return !solidsNear(x, y, r + 24).some(s => G.U.dist2(x, y, s.x, s.y) < (r + s.r) ** 2);
  }

  /** 0 tierra · 1 agua · 2 mar profundo (no se puede cruzar) */
  function waterAt(x, y) {
    if (mapMask) return maskAt(x, y);
    if (onPier(x, y)) return 0;
    const t = classify(field(x / G.TILE, y / G.TILE));
    return t === 0 ? 2 : t === 1 ? 1 : 0;
  }

  /** Tierra firme y sin objetos sólidos: sirve para que aparezcan enemigos. */
  function isLand(x, y, r = 12) { return waterAt(x, y) === 0 && isFree(x, y, r); }

  /** Daña barriles y cajas dentro del círculo. */
  function hitBreakables(x, y, r, dmg, now) {
    for (const s of solidsNear(x, y, r + 20)) {
      const d = propDef(s.name);
      if (!d.hp) continue;
      if (G.U.dist2(x, y, s.x, s.y) > (r + s.r) ** 2) continue;
      const k = s.tx + ',' + s.ty;
      const st = damage.get(k) || { hp: d.hp, at: -1 };
      if (now - st.at < 0.12) continue;           // un golpe por ataque
      st.hp -= dmg; st.at = now;
      damage.set(k, st);
      G.Audio.sfx('hit');
      if (st.hp <= 0) {
        broken.add(k); damage.delete(k);
        G.FX.burst(s.x, s.y - 8, '#b87a42', 14, 140);
        G.Pickups.dropBreakable(s.x, s.y);
      }
    }
  }

  return {
    BIOMES, reset, setBiome, get biome() { return biome; }, get info() { return B(); },
    get radius() { return radius * G.TILE; },
    drawGround, collectProps, resolve, isFree, isLand, waterAt, hitBreakables, solidsNear, reserve, setPier,
    setMap, gates
  };
})();
