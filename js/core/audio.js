/* ============ audio.js — sintetizador chiptune, música y efectos ============
 * Todo se genera con Web Audio: no hay ficheros de sonido.
 *
 *   G.Audio.music('sea')     cambia de tema (ver SONGS)
 *   G.Audio.sfx('coin')      efecto (con separación mínima entre repeticiones)
 *
 * Partituras: una nota por corchea. 'D5' nota, '-' alarga la anterior,
 * '.' silencio. La batería: 'x' charles, 'o' bombo, 's' caja.
 * Los navegadores no dejan sonar nada hasta el primer clic o tecla.
 */
G.Audio = (() => {
  let ctx = null, master, musicBus, sfxBus, noiseBuf = null;

  const SONGS = {
    // Puerto (menú): tranquilo, en Fa mayor, a ritmo de vals marinero.
    port: { bpm: 104, lead: 'square', bass: 'triangle', vol: 0.11,
      notes: [
        'C5 - A4 F4 - A4 | A#4 - D5 C5 - - | A4 - C5 F5 - E5 | D5 - - C5 - -',
        'A#4 - D5 F5 - D5 | C5 - A4 F4 - A4 | G4 - A4 A#4 - G4 | F4 - - - . .'],
      bass: [
        'F3 . C4 F3 . C4 | A#2 . F3 A#2 . F3 | F3 . C4 F3 . A3 | C3 . G3 C3 . E3',
        'A#2 . F3 A#2 . F3 | F3 . C4 F3 . C4 | C3 . G3 C3 . E3 | F3 . C4 F3 . .'],
      drums: 'o . x s . x' },
    // Mar abierto (partida): Re menor, 6/8 con marcha.
    sea: { bpm: 152, lead: 'square', bass: 'triangle', vol: 0.10,
      notes: [
        'D5 - F5 A5 - F5 | G5 - E5 C5 - E5 | F5 - D5 A4 - D5 | E5 - - C#5 - -',
        'D5 - F5 A5 - D6 | C6 - A5 G5 - E5 | F5 - E5 D5 - C#5 | D5 - - - . .',
        'A5 - A5 A#5 - A5 | G5 - F5 E5 - D5 | F5 - G5 A5 - F5 | E5 - - A4 - -',
        'D5 - F5 A5 - D6 | C6 - A5 A#5 - G5 | A5 - G5 E5 - C#5 | D5 - - - . .'],
      bass: [
        'D3 . A3 D3 . A3 | C3 . G3 C3 . G3 | A#2 . F3 A#2 . F3 | A2 . E3 A2 . C#3',
        'D3 . A3 D3 . A3 | F3 . C4 C3 . G3 | A#2 . F3 A2 . E3 | D3 . A3 D3 . .',
        'F3 . C4 F3 . C4 | C3 . G3 C3 . G3 | D3 . A3 D3 . A3 | A2 . E3 A2 . E3',
        'D3 . A3 D3 . A3 | F3 . C4 G3 . D4 | A2 . E3 A2 . C#3 | D3 . A3 D3 . .'],
      drums: 'o . x s . x' },
    // Jefe: misma escala, más rápido y con diente de sierra.
    boss: { bpm: 176, lead: 'sawtooth', bass: 'square', vol: 0.075,
      notes: [
        'D5 D5 F5 D5 G#5 A5 | D5 D5 F5 D5 C6 A5 | A#5 - A5 G5 - F5 | E5 - C#5 A4 - -',
        'D5 D5 F5 D5 G#5 A5 | D6 - C6 A#5 - A5 | G5 F5 E5 F5 E5 C#5 | D5 - - D4 - -'],
      bass: [
        'D2 D3 D2 D3 D2 D3 | D2 D3 D2 D3 D2 D3 | A#1 A#2 A#1 A#2 A#1 A#2 | A1 A2 A1 A2 A1 A2',
        'D2 D3 D2 D3 D2 D3 | A#1 A#2 A#1 A#2 A#1 A#2 | A1 A2 A1 A2 A1 A2 | D2 D3 D2 . . .'],
      drums: 'o x s o s x' },
    over: { bpm: 84, lead: 'triangle', bass: 'triangle', vol: 0.14, once: true,
      notes: ['A4 - - F4 - - | D4 - - E4 - - | F4 - E4 D4 - C#4 | D4 - - - - .'],
      bass: ['D3 - - A2 - - | A#2 - - A2 - - | A#2 - - A2 - - | D2 - - - - .'],
      drums: '. . . . . .' }
  };

  const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  function freq(tok) {
    const m = /^([A-G]#?)(\d)$/.exec(tok);
    if (!m) return 0;
    return 440 * Math.pow(2, (NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12);
  }
  function toks(lines) { return lines.join(' ').replace(/\|/g, ' ').split(/\s+/).filter(Boolean); }

  // ---------------- arranque ----------------

  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createDynamicsCompressor();
    master.threshold.value = -12; master.ratio.value = 4;
    master.connect(ctx.destination);
    musicBus = ctx.createGain(); sfxBus = ctx.createGain();
    musicBus.connect(master); sfxBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    applyVolumes();
    return true;
  }

  function unlock() {
    if (!init()) return;
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    if (wanted && !song) startSong(wanted);
  }
  for (const ev of ['pointerup', 'touchend', 'keydown']) addEventListener(ev, unlock, { capture: true });

  function applyVolumes() {
    if (!ctx) return;
    const s = G.Save.settings(), t = ctx.currentTime;
    musicBus.gain.setTargetAtTime(s.music, t, 0.05);
    sfxBus.gain.setTargetAtTime(s.sfx * 1.6, t, 0.05);
  }

  // ---------------- voces ----------------

  function tone(bus, type, f, t, dur, vol, slide = 0) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(bus, t, dur, vol, hp = 1000, lp = 12000) {
    const s = ctx.createBufferSource(), g = ctx.createGain();
    const f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter();
    f1.type = 'highpass'; f1.frequency.value = hp;
    f2.type = 'lowpass'; f2.frequency.value = lp;
    s.buffer = noiseBuf;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f1).connect(f2).connect(g).connect(bus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  // ---------------- música ----------------

  let wanted = null, song = null, step = 0, nextT = 0, timer = null;

  function music(name) {
    if (wanted === name && song) return;
    wanted = name;
    if (!ctx || ctx.state !== 'running') return;
    startSong(name);
  }

  function startSong(name) {
    stopSong();
    const def = SONGS[name];
    if (!def) return;
    song = { def, lead: toks(def.notes), bass: toks(def.bass), drums: toks([def.drums]) };
    step = 0;
    nextT = ctx.currentTime + 0.08;
    timer = setInterval(schedule, 40);
  }

  function stopSong() {
    if (timer) clearInterval(timer);
    timer = null; song = null;
  }

  function schedule() {
    if (!song) return;
    const d = song.def, len = 60 / d.bpm / 2;             // corchea
    while (nextT < ctx.currentTime + 0.15) {
      if (d.once && step >= song.lead.length) { stopSong(); return; }
      const i = step % song.lead.length;
      voice(song.lead, i, d.lead, d.vol, len);
      voice(song.bass, i % song.bass.length, d.bass, d.vol * 1.5, len);
      const dr = song.drums[step % song.drums.length];
      if (dr === 'x') noise(musicBus, nextT, 0.04, d.vol * 0.5, 7000);
      if (dr === 's') noise(musicBus, nextT, 0.1, d.vol * 0.9, 1500, 6000);
      if (dr === 'o') tone(musicBus, 'sine', 120, nextT, 0.12, d.vol * 2.2, 0.4);
      nextT += len; step++;
    }
  }

  function voice(track, i, type, vol, len) {
    const tok = track[i];
    if (!tok || tok === '-' || tok === '.') return;
    let n = 1;
    while (track[(i + n) % track.length] === '-' && n < 8) n++;
    tone(musicBus, type, freq(tok), nextT, len * n * 0.92, vol);
  }

  // ---------------- efectos ----------------

  const last = {};
  const GAP = { hit: 0.04, coin: 0.03, xp: 0.025, shoot: 0.05, slash: 0.05, punch: 0.05, boom: 0.08 };

  const FX = {
    hit: t => noise(sfxBus, t, 0.06, 0.25, 1800),
    hurt: t => { tone(sfxBus, 'square', 220, t, 0.18, 0.18, 0.5); noise(sfxBus, t, 0.1, 0.2, 400); },
    shoot: t => tone(sfxBus, 'square', 880, t, 0.07, 0.07, 0.5),
    punch: t => { tone(sfxBus, 'triangle', 160, t, 0.1, 0.3, 0.6); noise(sfxBus, t, 0.05, 0.15, 600, 3000); },
    stretch: t => tone(sfxBus, 'square', 300, t, 0.14, 0.08, 2.4),
    slash: t => noise(sfxBus, t, 0.13, 0.25, 3000),
    boom: t => { noise(sfxBus, t, 0.35, 0.4, 80, 1500); tone(sfxBus, 'sine', 90, t, 0.3, 0.35, 0.4); },
    fire: t => noise(sfxBus, t, 0.25, 0.2, 300, 2500),
    thunder: t => { noise(sfxBus, t, 0.3, 0.35, 900); tone(sfxBus, 'sawtooth', 1200, t, 0.12, 0.06, 0.3); },
    xp: t => tone(sfxBus, 'square', 1320 + Math.random() * 200, t, 0.05, 0.04),
    coin: t => { tone(sfxBus, 'square', 1568, t, 0.05, 0.06); tone(sfxBus, 'square', 2093, t + 0.05, 0.09, 0.06); },
    heal: t => [523, 659, 784].forEach((f, i) => tone(sfxBus, 'triangle', f, t + i * 0.06, 0.12, 0.12)),
    levelup: t => [523, 659, 784, 1047].forEach((f, i) => tone(sfxBus, 'square', f, t + i * 0.07, 0.14, 0.08)),
    select: t => tone(sfxBus, 'square', 660, t, 0.05, 0.06),
    confirm: t => { tone(sfxBus, 'square', 784, t, 0.06, 0.07); tone(sfxBus, 'square', 1175, t + 0.06, 0.1, 0.07); },
    deny: t => tone(sfxBus, 'square', 180, t, 0.18, 0.08),
    pause: t => tone(sfxBus, 'triangle', 520, t, 0.1, 0.1, 0.7),
    boss: t => [0, 0.22, 0.44].forEach(d => tone(sfxBus, 'sawtooth', 110, t + d, 0.2, 0.12, 0.9)),
    chest: t => [784, 988, 1175, 1568].forEach((f, i) => tone(sfxBus, 'triangle', f, t + i * 0.09, 0.2, 0.12)),
    death: t => [392, 330, 262, 196].forEach((f, i) => tone(sfxBus, 'square', f, t + i * 0.14, 0.2, 0.09))
  };

  function sfx(name) {
    if (!ctx || ctx.state !== 'running' || !FX[name]) return;
    const t = ctx.currentTime;
    if (last[name] && t - last[name] < (GAP[name] || 0.02)) return;
    last[name] = t;
    FX[name](t);
  }

  return { music, sfx, applyVolumes, stop: () => { wanted = null; stopSong(); } };
})();
