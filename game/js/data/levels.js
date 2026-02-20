'use strict';
// ─── data/levels.js ──────────────────────────────────────────────────────────
// Level definitions — maps are generated procedurally by worldgen.js.
// worldgen.js must be loaded before this file.
// Fallback hand-crafted maps are inside worldgen.js if ROT.js generation fails.
(function () {

  // Generate both levels at load time (deterministic seeds in worldgen.js)
  const stationDef = window.SV.WorldGen.genStation();
  const earthDef   = window.SV.WorldGen.genEarth();

  // Earth exit '<' returns to wherever station's hub puts the return pad.
  // Engine will set toPos dynamically — for now point to a safe fallback.
  // (Engine._executeTransition uses world.getPlayerStart() if toPos is null)

  window.SV.LEVELS = {
    station: stationDef,
    earth:   earthDef,
  };

})();
