/* ============ ui.js — pantallas: título, puerto, tripulación, mejoras, ajustes ============
 * Cada pantalla es una <section class="scr"> de index.html. Sólo hay una
 * abierta a la vez (salvo el HUD, que va aparte).
 */
G.UI = (() => {
  const $ = id => document.getElementById(id);
  let keyHandler = null;

  function hideAll() {
    document.querySelectorAll('.scr').forEach(s => s.classList.add('hidden'));
    keyHandler = null;
  }
  function show(id) {
    hideAll();
    $(id).classList.remove('hidden');
  }

  // Teclas de las pantallas modales (cartas 1-3, R...).
  addEventListener('keydown', e => { if (keyHandler) keyHandler(e); });

  // Sonido en todos los botones.
  addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b && !b.dataset.sfx) G.Audio.sfx('select');
  }, true);

  function init() {
    $('title-flag').innerHTML = G.Icons.html('flag', 64);
    $('scr-title').addEventListener('click', () => { G.Audio.sfx('confirm'); menu(); G.Audio.music('port'); });
    $('btn-play').addEventListener('click', () => G.Game.startRun());
    $('btn-crew').addEventListener('click', crew);
    $('btn-upg').addEventListener('click', upgrades);
    $('btn-settings').addEventListener('click', () => settings(menu));
    document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', menu));
    $('btn-resume').addEventListener('click', () => G.Game.resume());
    $('btn-quit').addEventListener('click', () => G.Game.endRun(true));
    $('btn-pause-settings').addEventListener('click', () => settings(() => show('scr-pause')));
    $('btn-again').addEventListener('click', () => G.Game.toMenu());
    $('btn-retry').addEventListener('click', () => G.Game.startRun());
    initFullscreen();
    addEventListener('keydown', e => {
      if (!$('scr-title').classList.contains('hidden') && (e.code === 'Enter' || e.code === 'Space')) $('scr-title').click();
    });
  }

  // ---------------- pantalla completa ----------------
  // iPhone no deja poner una página a pantalla completa: allí no salen los botones
  // (la alternativa es "Añadir a pantalla de inicio").

  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  function toggleFullscreen() {
    const d = document.documentElement;
    if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else {
      const req = d.requestFullscreen || d.webkitRequestFullscreen;
      const p = req.call(d, { navigationUI: 'hide' });
      if (p && p.catch) p.catch(() => {});
    }
  }
  function initFullscreen() {
    if (!(document.fullscreenEnabled || document.webkitFullscreenEnabled)) {
      document.body.classList.add('no-fs');
      return;
    }
    const sync = () => {
      const on = !!fsEl();
      document.querySelectorAll('.fs-btn').forEach(b => {
        b.innerHTML = G.Icons.html(on ? 'windowed' : 'fullscreen', 22);
        b.setAttribute('aria-label', on ? 'Salir de pantalla completa' : 'Pantalla completa');
      });
      $('set-fs').checked = on;
    };
    document.querySelectorAll('.fs-btn').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation(); G.Audio.sfx('select'); toggleFullscreen();
    }));
    $('set-fs').onchange = toggleFullscreen;
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    sync();
  }

  // ---------------- puerto (menú principal) ----------------

  function menu() {
    show('scr-menu');
    const s = G.Save.data, c = G.Crew.LIST.find(o => o.id === s.captain) || G.Crew.LIST[0];
    $('menu-berries').innerHTML = G.Icons.html('coin', 20) + ' ' + G.U.fmt(s.berries) + ' ฿';
    $('menu-captain').innerHTML = poster(c, true);
    const best = s.best[c.id];
    journey();
    $('menu-best').textContent = best ? 'Récord con ' + c.name.split(' ').pop() + ': ' + G.U.mmss(best) : 'Aún no has zarpado con ' + c.name.split(' ').pop();
  }

  /** El viaje: cuántas islas tiene y hasta dónde has llegado. */
  function journey() {
    const J = G.Islands.JOURNEY, best = Math.min(G.Save.data.bestIsland || 0, J.length);
    const at = best >= J.length ? 'has llegado al final' : best ? 'hasta ' + J[best].def.name + ' (' + J[best].saga.name.replace('Saga de ', '') + ')' : 'aún no has zarpado';
    const tro = (G.Save.data.trophies || []).length;
    $('menu-saga').innerHTML = '<div class="saga-name"><b>El viaje · ' + J.length + ' islas</b><small>Récord: ' + at + (best ? ' · isla ' + Math.min(best + 1, J.length) : '') +
      ' · Trofeos: ' + tro + '/' + G.Items.TROPHIES.length + '</small></div>';
  }

  /** Cartel de "SE BUSCA" con el retrato pixel art. */
  function poster(c, big = false, locked = false) {
    return '<div class="poster' + (big ? ' big' : '') + (locked ? ' locked' : '') + '">' +
      '<div class="wanted">SE BUSCA</div>' +
      '<div class="photo">' + G.Pix.portrait(c.id, big ? 120 : 64) + (locked ? '<div class="lock">' + G.Icons.html('lock', 28) + '</div>' : '') + '</div>' +
      '<div class="dead">VIVO O MUERTO</div>' +
      '<div class="pname">' + (locked ? '???' : c.name) + '</div>' +
      '<div class="bounty">฿ ' + c.bounty + '</div></div>';
  }

  // ---------------- tripulación ----------------

  let crewSel = null;
  function crew() {
    show('scr-crew');
    crewSel = crewSel || G.Save.data.captain;
    const grid = $('crew-grid');
    grid.innerHTML = '';
    for (const c of G.Crew.LIST) {
      const b = document.createElement('button');
      b.className = 'crew-card' + (c.id === crewSel ? ' sel' : '') + (c.id === G.Save.data.captain ? ' cap' : '');
      b.innerHTML = poster(c, false, !G.Save.owns(c.id));
      b.addEventListener('click', () => { crewSel = c.id; crew(); });
      grid.appendChild(b);
    }
    crewDetail();
  }

  function crewDetail() {
    const c = G.Crew.BY_ID[crewSel], owned = G.Save.owns(c.id), s = G.Save.data;
    const bar = (v, max) => '<span class="bar"><i style="width:' + Math.min(100, v / max * 100) + '%"></i></span>';
    const moves = G.Moves.LIST.filter(m => m.owner === c.id)
      .map(m => '<li>' + G.Icons.html('move:' + m.id, 24) + '<div><b>' + m.name + (m.id === c.start ? ' <em>· inicial</em>' : '') +
                '</b><small>' + m.desc + '</small></div></li>').join('');
    let action;
    if (s.captain === c.id) action = '<button class="btn" disabled>Es tu capitán</button>';
    else if (owned) action = '<button class="btn gold" id="crew-pick">Elegir</button>';
    else action = '<button class="btn gold" id="crew-buy"' + (s.berries < c.cost ? ' disabled' : '') + '>Reclutar · ' +
                  G.Icons.html('coin', 16) + ' ' + G.U.fmt(c.cost) + '</button>';
    $('crew-detail').innerHTML =
      '<h3>' + c.name + '</h3><p class="sub">' + c.title + '</p><p>' + c.desc + '</p>' +
      '<div class="stats-grid">' +
        '<span>Vida</span>' + bar(c.hp, 140) + '<span>Velocidad</span>' + bar(c.spd, 125) + '<span>Fuerza</span>' + bar(c.atk, 1.2) +
      '</div>' +
      '<h4>Técnicas</h4><ul class="moves">' + moves + '</ul>' +
      '<p class="sub">Además: Cañonazo, Pistola de chispa y los tres Haki.</p>' +
      (s.best[c.id] ? '<p class="sub">Récord: ' + G.U.mmss(s.best[c.id]) + '</p>' : '') +
      '<div class="row">' + action + '</div>' +
      '<p class="note">Tienes ' + G.Icons.html('coin', 14) + ' ' + G.U.fmt(s.berries) + ' ฿</p>';
    const pick = $('crew-pick'), buy = $('crew-buy');
    if (pick) pick.addEventListener('click', () => { s.captain = c.id; G.Save.commit(); G.Audio.sfx('confirm'); crew(); });
    if (buy) buy.addEventListener('click', () => {
      if (!G.Save.spend(c.cost)) { G.Audio.sfx('deny'); return; }
      s.crew.push(c.id); s.captain = c.id; G.Save.commit();
      G.Audio.sfx('chest');
      crew();
    });
  }

  // ---------------- mejoras ----------------

  function upgrades() {
    show('scr-upg');
    const s = G.Save.data;
    $('upg-berries').innerHTML = G.Icons.html('coin', 18) + ' ' + G.U.fmt(s.berries) + ' ฿';
    const list = $('upg-list');
    list.innerHTML = '';
    for (const u of G.Upgrades.LIST) {
      const lvl = G.Upgrades.level(u.id), max = lvl >= u.max, cost = G.Upgrades.cost(u, lvl);
      const row = document.createElement('div');
      row.className = 'upg-row';
      row.innerHTML = G.Icons.html(u.icon, 32) +
        '<div class="grow"><b>' + u.name + '</b><small>' + u.desc + '</small>' +
        '<span class="pips">' + '■'.repeat(lvl) + '<i>' + '■'.repeat(u.max - lvl) + '</i></span></div>' +
        (max ? '<button class="btn small" disabled>Máximo</button>'
             : '<button class="btn small gold"' + (s.berries < cost ? ' disabled' : '') + ' data-sfx="none">' + G.Icons.html('coin', 14) + ' ' + G.U.fmt(cost) + '</button>');
      const b = row.querySelector('button:not([disabled])');
      if (b) b.addEventListener('click', () => {
        if (G.Upgrades.buy(u.id)) { G.Audio.sfx('confirm'); upgrades(); } else G.Audio.sfx('deny');
      });
      list.appendChild(row);
    }
  }

  // ---------------- ajustes ----------------

  function settings(back) {
    show('scr-settings');
    const st = G.Save.settings();
    $('set-music').value = st.music; $('set-sfx').value = st.sfx;
    $('set-shake').checked = st.shake; $('set-dmg').checked = st.dmgNums;
    $('set-music').oninput = e => { st.music = +e.target.value; G.Audio.applyVolumes(); G.Save.commit(); };
    $('set-sfx').oninput = e => { st.sfx = +e.target.value; G.Audio.applyVolumes(); G.Save.commit(); G.Audio.sfx('coin'); };
    $('set-shake').onchange = e => { st.shake = e.target.checked; G.Save.commit(); };
    $('set-dmg').onchange = e => { st.dmgNums = e.target.checked; G.Save.commit(); };
    $('set-back').onclick = back;
    $('set-reset').onclick = () => {
      if (!confirm('¿Seguro? Se borran tus berries, tripulantes y mejoras.')) return;
      G.Save.reset(); G.Audio.applyVolumes(); settings(back);
    };
    $('set-reset').classList.toggle('hidden', G.Game.state !== 'ui');
  }

  // ---------------- cartas de nivel ----------------

  function levelUp(pl, title, choose) {
    show('scr-levelup');
    $('lvl-title').textContent = title || '¡Nivel ' + pl.level + '!';
    const render = () => {
      const cards = G.LevelUp.offer(pl);
      const box = $('cards');
      box.innerHTML = '';
      cards.forEach((c, i) => {
        const b = document.createElement('button');
        b.className = 'card ' + c.type;
        b.style.setProperty('--c', c.color);
        b.dataset.sfx = 'none';
        b.innerHTML = '<span class="ckey">' + (i + 1) + '</span>' + G.Icons.html(c.icon, 48) +
          '<span class="tag">' + c.tag + '</span><b>' + c.title + '</b><small>' + c.desc + '</small>';
        b.addEventListener('click', () => choose(c));
        box.appendChild(b);
      });
      const rr = $('lvl-reroll');
      rr.classList.toggle('hidden', pl.rerolls <= 0);
      $('lvl-rr-n').textContent = pl.rerolls;
      keyHandler = e => {
        const n = +e.key;
        if (n >= 1 && n <= cards.length) { e.preventDefault(); choose(cards[n - 1]); }
        if (e.code === 'KeyR') reroll();
      };
    };
    const reroll = () => {
      if (pl.rerolls <= 0) return;
      pl.rerolls--;
      G.Audio.sfx('select');
      render();
    };
    $('lvl-reroll').onclick = reroll;
    render();
  }

  // ---------------- fin de partida ----------------

  function over(r) {
    show('scr-over');
    $('over-title').textContent = r.won ? '¡Has llegado al final del viaje!' : r.quit ? 'Has vuelto a puerto' : '¡Has caído!';
    $('over-face').innerHTML = G.Pix.portrait(r.crew.id, 72);
    $('over-stats').innerHTML =
      '<span>Tiempo</span><b>' + G.U.mmss(r.time) + (r.record ? ' <em>¡récord!</em>' : '') + '</b>' +
      '<span>Islas</span><b>' + r.islands + ' / ' + G.Islands.JOURNEY.length + (r.recordIsland ? ' <em>¡récord!</em>' : '') + '</b>' +
      '<span>Nivel</span><b>' + r.level + '</b>' +
      '<span>Enemigos</span><b>' + G.U.fmt(r.kills) + '</b>' +
      '<span>Jefes</span><b>' + r.bosses + '</b>' +
      '<span>Berries</span><b class="gold">+' + G.U.fmt(r.earned) + ' ฿</b>';
  }

  return { init, show, hideAll, menu, levelUp, over };
})();
