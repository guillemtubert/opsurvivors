/* ============ camera.js — vista y transformación mundo<->pantalla ============
 * El ancho visible del mundo es constante (VIEW_W) sea cual sea el tamaño de
 * ventana. El juego se pinta en un lienzo pequeño a resolución de arte
 * (VIEW_W / PX píxeles de ancho) y se escala entero sin suavizado.
 */
G.Camera = {
  x: 0, y: 0,
  VIEW_W: 960,              // los sprites de One Piece Treasure Cruise son grandes: se ve más mapa
  MIN_VIEW_H: 525,
  scale: 1,                 // píxeles CSS por unidad de mundo
  w: 768, h: 432,           // tamaño de la vista en unidades de mundo
  shake: 0, _sx: 0, _sy: 0,

  follow(tx, ty, dt) {
    this.x = G.U.damp(this.x, tx, 9, dt);
    this.y = G.U.damp(this.y, ty, 9, dt);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.4);
      const a = this.shake * 7;
      this._sx = G.U.rand(-a, a);
      this._sy = G.U.rand(-a, a);
    } else { this._sx = this._sy = 0; }
  },

  kick(amount) {
    if (!G.Save.settings().shake) amount *= 0.2;
    this.shake = Math.min(1.2, this.shake + amount);
  },

  /** Esquina superior izquierda redondeada a píxel de arte (sin temblores). */
  left() { return Math.round((this.x - this.w / 2 + this._sx) / G.PX) * G.PX; },
  top() { return Math.round((this.y - this.h / 2 + this._sy) / G.PX) * G.PX; },

  sees(x, y, pad = 60) {
    const l = this.x - this.w / 2, t = this.y - this.h / 2;
    return x > l - pad && x < l + this.w + pad && y > t - pad && y < t + this.h + pad;
  },

  /** Mundo -> píxeles CSS de pantalla. */
  toScreen(x, y) { return [(x - this.left()) * this.scale, (y - this.top()) * this.scale]; },

  outerRadius() { return Math.hypot(this.w, this.h) / 2 + 40; }
};
