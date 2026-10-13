/* ============ icons.js — iconos pixel art (12×12) ============
 *   G.Icons.html('coin', 18)   <img> para el DOM
 *   'move:<id>'                icono de una técnica (forma según cómo se ve, color según su elemento)
 */
G.Icons = (() => {
  const UI = {
    heart: { pal: { r: '#ff5f6d', s: '#c23a4b', w: '#ffd3d8' }, rows: [
      '............', '.kkk....kkk.', 'kwwrk..krrrk', 'kwrrrkkrrrsk', 'krrrrrrrrrsk', 'krrrrrrrrrsk',
      '.krrrrrrrsk.', '..krrrrrsk..', '...krrrsk...', '....krsk....', '.....kk.....', '............'] },
    fist: { pal: { r: '#f8c99c', s: '#d99a6c', w: '#fff0e0', c: '#e0383e' }, rows: [
      '............', '..kkkkkk....', '.krrrrrrk...', 'krwwrrrrrkk.', 'krwrrrrrrrrk', 'krrrrrrrkrsk',
      'krrrrrrrkrsk', '.krrrrrrskk.', '..kssssssk..', '..kcccccck..', '..kkkkkkkk..', '............'] },
    boot: { pal: { b: '#4a3020', d: '#2a1a10', w: '#7a5a40', g: '#c9a46a' }, rows: [
      '............', '....kkkk....', '....kbbk....', '....kbbk....', '....kbbk....', '....kbbbkk..',
      '...kbwbbbbk.', '..kbbbbbbbbk', '..kdddddddbk', '..kgggggggk.', '...kkkkkkk..', '............'] },
    clock: { pal: { w: '#f4f4ff', y: '#ffd23f', o: '#c9c9e0' }, rows: [
      '....kkkk....', '..kkyyyykk..', '.kyywwwwyyk.', '.kywwwkwwyk.', 'kywwwwkwwwyk', 'kywwwwkwwwyk',
      'kywwwwkkkwyk', 'kywwwwwwwwyk', '.kywwwwwwyk.', '.kyyowwwyyk.', '..kkyyyykk..', '....kkkk....'] },
    shield: { pal: { s: '#c9a46a', d: '#8a6434', w: '#f4e2b0', r: '#e0383e' }, rows: [
      '............', '.kkkkkkkkkk.', '.kwwsssssdk.', '.kwssrrssdk.', '.kwssrrssdk.', '.kssrrrrsdk.',
      '.kssrrrrsdk.', '..kssrrsdk..', '..kssssddk..', '...ksssdk...', '....kddk....', '.....kk.....'] },
    sprout: { pal: { g: '#5fe08a', d: '#2f9a52', b: '#8a5a2b' }, rows: [
      '............', '..kkk..kkk..', '.kgggk.kgggk', '.kggggkgggdk', '..kdggkggdk.', '...kkdgdkk..',
      '.....kgk....', '.....kgk....', '...kkkdkkk..', '..kbbbbbbbk.', '..kbbbbbbbk.', '...kkkkkkk..'] },
    magnet: { pal: { r: '#ff5f6d', s: '#c23a4b', w: '#e8e8f0' }, rows: [
      '............', '..kkkkkkkk..', '.krrrrrrrrk.', 'krrsskkssrrk', 'krrk....krrk', 'krrk....krrk',
      'krrk....krrk', 'kwwk....kwwk', 'kwwk....kwwk', 'kkkk....kkkk', '............', '............'] },
    book: { pal: { c: '#8a4a26', d: '#5a2a16', p: '#f4e2b0', y: '#ffd23f' }, rows: [
      '............', '.kkkkkkkkkk.', '.kcccccccck.', '.kcyyyyyyck.', '.kcccccccck.', '.kccyyyyyck.',
      '.kcccccccck.', '.kcccccccck.', '.kddddddddk.', '.kppppppppk.', '.kkkkkkkkkk.', '............'] },
    coin: { pal: { y: '#ffd23f', o: '#c08a10', w: '#fff4b0' }, rows: [
      '....kkkk....', '..kkyyyykk..', '.kyywwyyyyk.', '.kywyokyyok.', 'kyyyokkkyyok', 'kywyyokyoyok',
      'kyyyyokyoyok', 'kyyokkkyyyok', '.kyyyokyyok.', '.kooyyyyook.', '..kkooookk..', '....kkkk....'] },
    cards: { pal: { a: '#ffd23f', b: '#e0383e', w: '#fff0e0' }, rows: [
      '............', '.kkkkkk.....', '.kaaaaakkkk.', '.kaaaakbbbbk', '.kaaaakbwwbk', '.kaaaakbwwbk',
      '.kaaaakbbbbk', '.kaaaakbwwbk', '.kkkkkkbwwbk', '......kbbbbk', '......kkkkkk', '............'] },
    star: { pal: { y: '#ffd23f', o: '#c08a10', w: '#fff4b0' }, rows: [
      '.....kk.....', '.....kk.....', '....kwyk....', '....kyyk....', 'kkkkwyyykkkk', 'kwyyyyyyyyok',
      '.kyyyyyyyok.', '..kyyyyyyk..', '..kyyyoyyk..', '.kyok..koyk.', '.kok....kok.', '.kk......kk.'] },
    meat: { pal: { r: '#c8483a', R: '#e87a5a', w: '#f4f1ea' }, rows: [
      '............', '...kkkkk....', '..krRRrrk...', '.krRrrrrrk..', '.krrrrrrrk..', '.krrrrrrrk..',
      '..krrrrrkkk.', '...kkkkkwwk.', '.......kwwwk', '........kwwk', '.........kk.', '............'] },
    skull: { pal: { w: '#f4f1ea', W: '#c4bdb0' }, rows: [
      '...kkkkkk...', '..kwwwwwwk..', '.kwwwwwwwwk.', '.kwkkwwkkwk.', '.kwkkwwkkwk.', '.kwwwkkwwwk.',
      '..kwwwwwwk..', '...kwkwkk...', 'kk.kkkkk.kk.', 'kwkk....kkwk', '.kk......kk.', '............'] },
    lock: { pal: { y: '#ffd23f', o: '#c08a10', g: '#aeb8c4' }, rows: [
      '............', '....kkkk....', '...kggggk...', '..kgk..kgk..', '..kgk..kgk..', '.kkkkkkkkkk.',
      '.kyyyyyyyok.', '.kyyykkyyok.', '.kyyykkyyok.', '.kyyyyyyyok.', '.kkkkkkkkkk.', '............'] },
    flag: { pal: { b: '#1a1220', w: '#f4f1ea', y: '#f2d063', r: '#e0383e', p: '#8a6434' }, rows: [
      'kk..........', 'kpkkkkkkkkk.', 'kpkbbbbbbbbk', 'kpkbyyyybbbk', 'kpkbrrrrbbbk', 'kpkbwkwkbbbk',
      'kpkbbwwbbbbk', 'kpkbwbbwbbbk', 'kpkkkkkkkkk.', 'kpk.........', 'kpk.........', 'kkk.........'] },
    pause: { pal: { w: '#f4f1ea' }, rows: [
      '............', '..kkk..kkk..', '..kwk..kwk..', '..kwk..kwk..', '..kwk..kwk..', '..kwk..kwk..',
      '..kwk..kwk..', '..kwk..kwk..', '..kwk..kwk..', '..kkk..kkk..', '............', '............'] },
    fullscreen: { pal: { w: '#f4f1ea' }, rows: [
      'kkkkk..kkkkk', 'kwwwk..kwwwk', 'kwkkk..kkkwk', 'kwk......kwk', 'kkk......kkk', '............',
      '............', 'kkk......kkk', 'kwk......kwk', 'kwkkk..kkkwk', 'kwwwk..kwwwk', 'kkkkk..kkkkk'] },
    windowed: { pal: { w: '#f4f1ea' }, rows: [
      '..kkk..kkk..', '..kwk..kwk..', 'kkkwk..kwkkk', 'kwwwk..kwwwk', 'kkkkk..kkkkk', '............',
      '............', 'kkkkk..kkkkk', 'kwwwk..kwwwk', 'kkkwk..kwkkk', '..kwk..kwk..', '..kkk..kkk..'] },
    sound: { pal: { w: '#f4f1ea', y: '#ffd23f' }, rows: [
      '............', '.....k......', '....kwk..y..', '..kkwwk...y.', '.kwwwwk.y..y', '.kwwwwk..y.y',
      '.kwwwwk..y.y', '.kwwwwk.y..y', '..kkwwk...y.', '....kwk..y..', '.....k......', '............'] },
    // ---------------- técnicas: forma (vis) × color (elemento) ----------------
    'v:fist': { rows: [
      '............', '...kkkkk....', '..kccccck...', '.kcwccccckk.', '.kccccccccck', '.kccccckccck',
      '.kccccckccck', '..kccccckkk.', '...kddddk...', '...kddddk...', '...kkkkkk...', '............'] },
    'v:slash': { rows: [
      '..........kk', '.........kwk', '........kwck', '.......kwck.', '......kwck..', '.....kwck...',
      '..k.kwck....', '..kkwck.....', '...kdk......', '..kdkk......', '.kdk........', '.kk.........'] },
    'v:bolt': { rows: [
      '......kkkk..', '.....kwcck..', '....kwcck...', '...kwcck....', '..kwccckkk..', '..kkkwccck..',
      '....kwcck...', '...kwcck....', '..kwcck.....', '..kcck......', '..kck.......', '..kk........'] },
    'v:bullet': { rows: [
      '............', '............', '....kkk.....', '...kwcck....', '..kwccccckk.', '..kcccccccck',
      '..kcccccccck', '..kdcccccdk.', '...kdddddk..', '....kkkkk...', '............', '............'] },
    'v:flame': { rows: [
      '.....k......', '....kck.....', '....kcck....', '...kccck.k..', '..kcwcck.ck.', '..kcwwcckcck',
      '.kcwwwwcccck', '.kcwwwwwccck', '.kccwwwwccck', '..kccwwccck.', '...kccccck..', '....kkkkk...'] },
    'v:hand': { rows: [
      '..k.k.k.....', '.kckckck....', '.kckckck.k..', '.kckckckkck.', '.kcccccckck.', '.kccccccccck',
      '.kccccccccck', '..kccccccck.', '...kcccccck.', '....kccccck.', '....kddddk..', '....kkkkkk..'] },
    'v:buff': { rows: [
      '.....kk.....', '....kwck....', '...kwccck...', '..kwccccck..', '.kwcccccccck', 'kkkkccccckkk',
      '...kccccck..', '...kccccck..', '...kccddck..', '...kcdddck..', '...kddddck..', '...kkkkkk...'] },
    'v:cannon': { rows: [
      '........d...', '.......dwd..', '......kwd...', '.....kwk....', '...kkkkkk...', '..kcccccck..',
      '.kcwwccccck.', '.kcwccccccck', '.kcccccccck.', '.kcccccccck.', '..kccccccck.', '...kkkkkk...'] },
    'v:plant': { rows: [
      '............', '..kk...kk...', '.kcck.kcck..', '.kcwckcwck..', '..kcckcck...', '...kkckkk...',
      '.....kck....', '.....kck....', '...kkkkkkk..', '..kdddddddk.', '..kdddddddk.', '...kkkkkkk..'] },
    'v:kick': { rows: [
      '..k.........', '.kck........', '.kcck.......', '..kcck......', '...kcck.....', '....kccckkk.',
      '....kcccccck', '...kccwcccck', '..kccwwcccck', '..kdddddddk.', '...kkkkkkk..', '............'] },
    'v:cloud': { rows: [
      '............', '....kkkk....', '..kkwwwwkk..', '.kwwwwwwwwk.', 'kwwwwwwwwwwk', 'kwwwwwwwwwwk',
      '.kkkkkkkkkk.', '....kcck....', '...kcck.....', '....kcck....', '...kcck.....', '...kk.......'] },
    'v:haki': { rows: [
      '............', '.k...kk...k.', '.kck.kck.kck', '.kcckkcckcck', '.kcccccccccc', '.kcwcccwcccc',
      '.kccccccccck', '.kcccccccck.', '.kkkkkkkkkk.', '............', '............', '............'] },
    'v:wave': { rows: [
      '............', '......kkk...', '....kkccck..', '...kccwwcck.', '..kcck.kwcck', '..kck...kcck',
      '.kcck....kck', '.kck.....kck', 'kcck.....kck', 'kck......kk.', 'kk..........', '............'] }
  };

  /** De la forma visual de una técnica a su icono. */
  const VIS_ICON = {
    fist: 'fist', palm: 'fist', firefist: 'flame', hoof: 'fist', fur: 'wave',
    slash3: 'slash', crescent: 'slash', tornado: 'wave', cut: 'slash',
    bolt: 'bolt', lightning: 'bolt', cloud: 'cloud', buff: 'buff',
    pellet: 'bullet', bullet: 'bullet', plant: 'plant', cannon: 'cannon',
    kick: 'kick', flames: 'flame', stomp: 'kick', kickwave: 'kick',
    hands: 'hand', petals: 'hand', haki: 'haki'
  };

  const cache = new Map();

  function canvasFor(name) {
    let c = cache.get(name);
    if (c) return c;
    if (name.startsWith('move:')) {
      const m = G.Moves.BY_ID[name.slice(5)];
      const base = G.U.ELEM_COLOR[m.elem];
      const shape = UI['v:' + VIS_ICON[m.vis]] || UI['v:fist'];
      c = G.Pix.paint(shape.rows, { c: base, w: G.U.shade(base, 0.55), d: G.U.shade(base, -0.4) });
    } else {
      const d = UI[name] || UI.star;
      c = G.Pix.paint(d.rows, d.pal || {});
    }
    cache.set(name, c);
    return c;
  }

  function url(name) { return G.Pix.url(canvasFor(name)); }
  function html(name, size = 18, cls = '') {
    return '<img class="ico px ' + cls + '" src="' + url(name) + '" width="' + size + '" height="' + size + '" alt="">';
  }

  return { html, url, canvas: canvasFor };
})();
