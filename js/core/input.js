/* ============ input.js — teclado y joystick táctil ============ */
G.Input = (() => {
  const down = new Set();
  const pressed = new Set();   // se limpia cada frame

  const MOVE = {
    up: ['keyw', 'arrowup'], down: ['keys', 'arrowdown'],
    left: ['keya', 'arrowleft'], right: ['keyd', 'arrowright']
  };

  function code(e) { return (e.code || e.key).toLowerCase(); }

  addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') return;
    const c = code(e);
    if (!down.has(c)) pressed.add(c);
    down.add(c);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'space', 'tab'].includes(c)) e.preventDefault();
  });
  addEventListener('keyup', e => down.delete(code(e)));
  addEventListener('blur', () => down.clear());

  // ---------------- joystick táctil: aparece donde pones el dedo ----------------
  const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0, vx: 0, vy: 0 };
  let touchUsed = false;
  const R = 52;                 // radio del joystick en píxeles CSS

  function initTouch(cv) {
    cv.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' || stick.id !== null) return;
      touchUsed = true;
      document.body.classList.add('touch');
      stick.id = e.pointerId; stick.ox = stick.x = e.clientX; stick.oy = stick.y = e.clientY;
      stick.vx = stick.vy = 0;
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', e => {
      if (e.pointerId !== stick.id) return;
      let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy;
      const m = Math.hypot(dx, dy);
      // El origen sigue al dedo si se pasa del radio: cambiar de rumbo es inmediato.
      if (m > R) { stick.ox += dx / m * (m - R); stick.oy += dy / m * (m - R); dx = e.clientX - stick.ox; dy = e.clientY - stick.oy; }
      stick.x = e.clientX; stick.y = e.clientY;
      const k = Math.min(1, Math.hypot(dx, dy) / R);
      const [nx, ny] = G.U.norm(dx, dy);
      stick.vx = nx * (k < 0.15 ? 0 : k); stick.vy = ny * (k < 0.15 ? 0 : k);
    });
    const end = e => { if (e.pointerId === stick.id) { stick.id = null; stick.vx = stick.vy = 0; } };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
  }

  return {
    initTouch,
    get touch() { return touchUsed; },
    stick() { return stick.id === null ? null : stick; },
    axis() {
      if (stick.id !== null && (stick.vx || stick.vy)) return [stick.vx, stick.vy];
      let x = 0, y = 0;
      if (MOVE.left.some(k => down.has(k))) x -= 1;
      if (MOVE.right.some(k => down.has(k))) x += 1;
      if (MOVE.up.some(k => down.has(k))) y -= 1;
      if (MOVE.down.some(k => down.has(k))) y += 1;
      return G.U.norm(x, y);
    },
    held(c) { return down.has(c); },
    tap(c) { return pressed.has(c); },
    resetTouch() { stick.id = null; stick.vx = stick.vy = 0; },
    endFrame() { pressed.clear(); }
  };
})();
