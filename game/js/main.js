'use strict';
// ─── main.js ─────────────────────────────────────────────────────────────────
// Entry point. Creates the Engine and starts the game.
window.addEventListener('DOMContentLoaded', () => {
  window.SV = window.SV || {};
  const engine = new window.SV.Engine();
  window.SV._engine = engine;  // expose for debugging
  engine.init();
});
