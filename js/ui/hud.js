/* ============ hud.js — vida, experiencia, tiempo y técnicas (DOM) ============
 * Se actualiza cada frame pero sólo toca el DOM cuando algo cambia.
 */
G.HUD = (() => {
  const $ = id => document.getElementById(id);
  let el = {}, prev = {}, bannerT = null;

  function init() {
    // Propuestas de HUD para comparar: ?hud=a | b | c (sin parámetro, el de siempre).
    const skin = new URLSearchParams(location.search).get('hud');
    if (['a', 'b', 'c'].includes(skin)) document.body.classList.add('hud-' + skin);
    el = {
      root: $('hud'), hp: $('hud-hp'), hpTxt: $('hud-hp-txt'), xp: $('hud-xp'), lvl: $('hud-lvl'),
      time: $('hud-time'), kills: $('hud-kills'), coins: $('hud-coins'), face: $('hud-face'),
      boss: $('hud-boss'), bossName: $('hud-boss-name'), bossHp: $('hud-boss-hp'),
      moves: $('hud-moves'), banner: $('banner'), pause: $('hud-pause'),
      goal: $('hud-goal'), action: $('hud-action')
    };
    G.Minimap.init();
    el.action.addEventListener('pointerdown', e => { e.stopPropagation(); G.Island.act(); });
    $('hud-ico-kills').innerHTML = G.Icons.html('skull', 18);
    $('hud-ico-coins').innerHTML = G.Icons.html('coin', 18);
    el.pause.innerHTML = G.Icons.html('pause', 22);
    el.pause.addEventListener('click', () => G.Game.pause());
    el.god = $('hud-god');
    el.god.addEventListener('pointerdown', e => { e.stopPropagation(); G.Game.toggleGod(); });
  }

  function show(on) {
    el.root.classList.toggle('hidden', !on);
    prev = {};
  }

  function set(key, v, fn) { if (prev[key] !== v) { prev[key] = v; fn(v); } }

  function update(pl, time) {
    set('face', pl.crew.id, id => { el.face.innerHTML = G.Pix.portrait(id, 40); });
    set('hp', Math.ceil(pl.hp) + '/' + pl.maxHp, v => {
      el.hp.style.width = (pl.hp / pl.maxHp * 100) + '%';
      el.hpTxt.textContent = v;
      el.hp.classList.toggle('low', pl.hp / pl.maxHp < 0.25);
    });
    set('xp', Math.floor(pl.xp / pl.xpNext * 200), v => { el.xp.style.width = (v / 2) + '%'; });
    set('lvl', pl.level, v => { el.lvl.textContent = 'Nv. ' + v; });
    set('time', Math.floor(time), v => { el.time.textContent = G.U.mmss(v); });
    set('goal', G.Island.goal(), v => {
      el.goal.textContent = v;
      el.goal.classList.toggle('alert', G.Island.busterT() >= 0 && v.includes('BUSTER'));
    });
    set('kills', pl.kills, v => { el.kills.textContent = G.U.fmt(v); });
    set('coins', pl.coins, v => { el.coins.textContent = G.U.fmt(v); });

    const bs = G.EnemyMgr.bosses(), b = bs[0];
    const inv = b && b.def.invincible;
    set('boss', bs.map(o => o.name).join(' y '), v => {
      el.boss.classList.toggle('hidden', !v);
      if (v) el.bossName.innerHTML = '<b>' + v + '</b> <span>' + (inv ? 'Invencible: ¡huye!' : bs.map(o => o.title || '').join(' · ')) + '</span>';
    });
    if (b) {
      const hp = bs.reduce((a, o) => a + o.hp, 0), max = bs.reduce((a, o) => a + o.maxHp, 0);
      set('bossHp', inv ? 200 : Math.ceil(hp / max * 200), v => { el.bossHp.style.width = (v / 2) + '%'; });
    }

    // Recarga de cada técnica.
    pl.moves.forEach((m, i) => {
      const slot = el.moves.children[i];
      if (!slot) return;
      const cd = i === pl.active && m.kind !== 'orbit' ? Math.max(0, m.t) / Math.max(0.01, m.cd * pl.cdMul) : 0;
      set('cd' + i, Math.round(cd * 20), v => { slot.querySelector('.cd').style.height = (v * 5) + '%'; });
    });
  }

  /** Botón de lo que se puede hacer donde estás (o null). */
  function action(a) {
    set('action', a ? (a.off ? 'off:' : '') + a.label : '', () => {
      el.action.classList.toggle('hidden', !a);
      if (!a) return;
      el.action.textContent = a.label;
      el.action.disabled = !!a.off;
    });
  }

  /** Vuelve a pintar los huecos de técnicas. */
  function moves(pl) {
    if (!el.moves) return;
    el.moves.innerHTML = '';
    for (let i = 0; i < pl.maxMoves; i++) {
      const m = pl.moves[i];
      const b = document.createElement('button');
      b.className = 'slot' + (i === pl.active ? ' on' : '') + (m ? '' : ' empty');
      if (m) {
        b.title = m.name;
        b.innerHTML = G.Icons.html('move:' + m.id, 36) + '<span class="key">' + (i + 1) + '</span>' +
          '<span class="pips">' + '●'.repeat(m.lvl) + '<i>' + '●'.repeat(G.Moves.MAX_LVL - m.lvl) + '</i></span>' +
          '<span class="cd"></span>';
        b.addEventListener('pointerdown', e => { e.stopPropagation(); pl.setActive(i); G.Audio.sfx('select'); });
      }
      el.moves.appendChild(b);
    }
    prev = Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith('cd')));
    const m = pl.activeMove;
    if (m) $('hud-move-name').textContent = m.name;
  }

  function banner(title, sub = '', col = '#ffd23f') {
    el.banner.innerHTML = '<b style="color:' + col + '">' + title + '</b>' + (sub ? '<small>' + sub + '</small>' : '');
    el.banner.classList.remove('hidden', 'go');
    void el.banner.offsetWidth;
    el.banner.classList.add('go');
    clearTimeout(bannerT);
    bannerT = setTimeout(() => el.banner.classList.add('hidden'), 3200);
  }

  /** Objetos que llevas: icono y número de copias (trofeos con el retrato del jefe). */
  function items(pl) {
    const box = document.getElementById('hud-items');
    if (!box) return;
    box.innerHTML = Object.entries(pl.items).map(([id, n]) => {
      const it = G.Items.BY_ID[id], col = G.Items.RARITY[it.rarity].color;
      return '<span class="it" style="--c:' + col + '" title="' + it.name + ': ' + it.desc + '">' + G.Items.icon(id, 16) + (n > 1 ? '<i>' + n + '</i>' : '') + '</span>';
    }).join('');
  }

  /** Botón DIOS encendido o apagado. */
  function god(on) { el.god.classList.toggle('on', on); }

  return { init, show, update, moves, banner, action, god, items };
})();
