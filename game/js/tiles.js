'use strict';
// ─── tiles.js ────────────────────────────────────────────────────────────────
// Tile definitions.
// Fields: char, color, passable, type, [opaque], [interactId], [itemId]
// opaque: true → blocks FOV (light cannot pass through). Defaults to false.
// To add a tile: (1) add to TILE, (2) add char mapping to CHAR_TO_TILE,
//               (3) handle tile.type in engine.js if it needs behaviour.
(function () {
  const C = window.SV.COLORS;

  const TILE = {
    VOID:      { char: ' ',  color: C.bg,           passable: false, opaque: true,  type: 'void'      },
    FLOOR:     { char: '·',  color: C.floor,         passable: true,                type: 'floor'     },  // middle dot
    WALL:      { char: '#',  color: C.wall,          passable: false, opaque: true,  type: 'wall'      },  // rendered as box-drawing
    DOOR:      { char: '▫',  color: C.item,          passable: true,                type: 'door'       },  // small square
    WATER:     { char: '~',  color: C.waterSurf,     passable: true,                type: 'shallow_water' },
    WATER_D:   { char: '≈',  color: C.water,         passable: false,               type: 'water'     },
    BRIDGE:    { char: '═',  color: C.mountain,      passable: true,                type: 'bridge'    },  // double horizontal
    TREE:      { char: '♠',  color: C.nature,        passable: false, opaque: true,  type: 'nature'    },  // spade (tree-like)
    GROWTH:    { char: '❦',  color: C.natureDim,     passable: false, opaque: true,  type: 'nature'    },  // floral heart
    GRASS:     { char: '░',  color: C.grass,         passable: true,                type: 'ground'    },  // light shade
    RUBBLE:    { char: '▪',  color: C.rubble,        passable: true,                type: 'ground'    },  // small square
    MOUNTAIN:  { char: '▲',  color: C.mountain,      passable: false, opaque: true,  type: 'terrain'   },  // solid triangle
    ROCK:      { char: '●',  color: C.rubble,         passable: false, opaque: true,  type: 'terrain', clearable: true, requiredItem: 'dynamite', clearableDesc: 'Rock' },
    SURFACE:   { char: '▬',  color: C.wall,          passable: false, opaque: true,  type: 'furniture' },  // rectangle
    PILLAR:    { char: '║',  color: C.wallBright,    passable: false, opaque: true,  type: 'wall'      },  // double vertical

    // Interactive tiles (not opaque — player can see them and approach)
    QUEST_BOARD: { char: '◈', color: C.item,          passable: false, type: 'interact',  interactId: 'quest_board' },  // diamond in square
    TERMINAL:    { char: '◉', color: C.terminal,      passable: false, type: 'interact',  interactId: 'terminal'    },  // circled dot
    VENDING:     { char: '▣', color: C.uiDim,         passable: false, type: 'interact',  interactId: 'vending'     },  // filled square
    MEDBAY:      { char: '✚', color: C.terminal,      passable: false, type: 'interact',  interactId: 'medbay'      },  // heavy cross
    CONTAINER:   { char: '▤', color: C.panelBorder,   passable: false, type: 'container'                            },  // striped square
    LOG_FRAG:    { char: '◇', color: C.driftHigh,     passable: true,                type: 'pickup',   itemId: 'log_fragment' },  // diamond

    // Level exits — bright teal so they're visible across a dark room
    // Note: chars must stay as '>' and '<' — they're used as exit lookup keys
    EXIT_DOWN:   { char: '>', color: C.terminalBright, passable: true, type: 'exit' },
    EXIT_UP:     { char: '<', color: C.terminalBright, passable: true, type: 'exit' },
  };

  // char → tile key (used to parse map strings in levels.js)
  const CHAR_TO_TILE = {
    ' ': 'VOID',
    '.': 'FLOOR',
    '#': 'WALL',
    '+': 'DOOR',
    '~': 'WATER',
    '=': 'BRIDGE',
    'T': 'TREE',
    '%': 'GROWTH',
    '"': 'GRASS',
    ',': 'RUBBLE',
    '^': 'MOUNTAIN',
    '*': 'ROCK',
    '_': 'SURFACE',
    '|': 'PILLAR',
    'Q': 'QUEST_BOARD',
    '0': 'TERMINAL',
    'V': 'VENDING',
    'H': 'MEDBAY',
    '[': 'CONTAINER',
    'M': 'LOG_FRAG',
    '>': 'EXIT_DOWN',
    '<': 'EXIT_UP',
    // NPC/player markers → FLOOR at parse time; entities placed separately
    '@': 'FLOOR',
    '!': 'FLOOR',
    'C': 'FLOOR',  // Casimir
    'L': 'FLOOR',  // cLavius
    'B': 'FLOOR',  // Brecht
    'R': 'FLOOR',  // Mercy-7
  };

  function getTile(key) {
    if (!TILE[key]) { console.warn('Unknown tile key:', key); return TILE.VOID; }
    return Object.assign({}, TILE[key]);
  }

  function fromChar(char) {
    const key = CHAR_TO_TILE[char];
    if (!key) return getTile('FLOOR');
    return getTile(key);
  }

  window.SV.TILE         = TILE;
  window.SV.getTile      = getTile;
  window.SV.tileFromChar = fromChar;
  window.SV.CHAR_TO_TILE = CHAR_TO_TILE;
})();
