'use strict';
// ─── config.js ───────────────────────────────────────────────────────────────
// Single source of truth for palette + settings.
// RULE: change a color here → canvas rendering changes everywhere.
//       Mirror any change in css/style.css :root custom properties (HTML panels).
// Colorblind: primary differentiator = ASCII char shape. Blue/orange safe pair.
// No red/green as sole differentiators.
window.SV = window.SV || {};

window.SV.COLORS = {
  bg:           '#080c12',   // near-black canvas bg

  // Tile colors — walls intentionally brighter than floor so rooms read clearly
  floor:        '#1c2535',   // dark blue-gray floor
  wall:         '#3d4e6a',   // notably brighter than floor (walls catch light)
  wallBright:   '#546880',   // corner / highlight walls

  // Units
  player:       '#f5f2e8',   // bright warm white — maximum contrast against bg
  playerBg:     'rgba(245,242,232,0.20)', // glow rect drawn behind player '@'
  npc:          '#d4b07a',   // warm sandy amber
  hostile:      '#c86040',   // rust orange (NOT red)

  // Environment
  terminal:     '#52b896',   // mint teal — terminals, exits, data nodes
  terminalBright:'#80d4b0',

  water:        '#1e4490',   // deep navy — colorblind-safe
  waterSurf:    '#2e62c8',

  nature:       '#4a8050',   // forest green — Crawl only, used sparingly
  natureDim:    '#2d4d30',
  grass:        '#3d6040',

  item:         '#c8a040',   // warm gold
  danger:       '#d08030',   // amber orange

  mountain:     '#6070a0',
  rubble:       '#3a3030',

  // UI (HTML panels) — mirror in style.css :root
  panelBg:      '#090d14',
  panelBorder:  '#2a3a54',
  panelHot:     '#7a4a3a',   // rust accent — dialogue border
  uiDim:        '#3a5060',
  uiBright:     '#b0ccd8',
  uiLabel:      '#5a7890',

  // IDENTITY_DRIFT log color shift (warm gray → cold blue)
  driftLow:     '#b0b8c0',
  driftHigh:    '#6080c0',

  // Lore note overlay
  noteBg:       '#000000',
  noteText:     '#f0f0f0',
  noteAccent:   '#cccccc',
};

window.SV.SETTINGS = {
  // ── Grid ─── increase CELL_W/H to zoom; CANVAS = CELL × VIEWPORT ──────────
  CELL_W:       26,
  CELL_H:       30,
  VIEWPORT_W:   16,
  VIEWPORT_H:   16,
  CANVAS_W:     416,   // 26 × 16
  CANVAS_H:     480,   // 30 × 16

  FONT:         '18px "JetBrains Mono", "Fira Mono", "Consolas", "Courier New", monospace',
  FONT_BOLD:    'bold 18px "JetBrains Mono", "Fira Mono", "Consolas", "Courier New", monospace',

  // ── Field of view (ROT.js PreciseShadowcasting) ───────────────────────────
  FOV_RADIUS:     10,    // max tiles visible from player
  FOV_DIM_ALPHA:  0.28,  // explored-but-not-visible brightness (0=black, 1=full)

  // ── Log ───────────────────────────────────────────────────────────────────
  LOG_MAX_CHARS:   200,
  LOG_MAX_ENTRIES: 8,
  DRIFT_MAX:       100,
};
