'use strict';
// ─── worldgen.js ─────────────────────────────────────────────────────────────
// Procedural map generation using ROT.js.
// Produces level defs compatible with Level class (map: string[], entities: []).
// Seeds are fixed — same seed = same map every run.
//
// Station: ROT.Map.Digger  — rooms + corridors, industrial feel
// Earth:   ROT.Map.Cellular — organic cave, Crawl growth overlay
//
// RULE: worldgen only produces structure (passable/impassable + feature chars).
//       Tile rendering colours are defined in tiles.js — no colours here.
// ─────────────────────────────────────────────────────────────────────────────
(function () {

  // ── Seeded helpers ────────────────────────────────────────────────────────
  // ROT.RNG is a global from rot.js. We save/restore seed to avoid affecting
  // any other random usage (item loot etc).
  function withSeed(seed, fn) {
    const prev = ROT.RNG.getSeed();
    ROT.RNG.setSeed(seed);
    const result = fn();
    ROT.RNG.setSeed(prev);
    return result;
  }

  // ── Grid helpers ──────────────────────────────────────────────────────────
  function makeGrid(W, H, fill) {
    return Array.from({ length: H }, () => Array(W).fill(fill));
  }

  function gridToStrings(grid) {
    return grid.map(row => row.join(''));
  }

  function setRect(grid, x0, y0, x1, y1, char) {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        if (grid[y] && grid[y][x] !== undefined) grid[y][x] = char;
  }

  function setRectBorder(grid, x0, y0, x1, y1, wallChar, floorChar) {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!grid[y] || grid[y][x] === undefined) continue;
        const onEdge = (y === y0 || y === y1 || x === x0 || x === x1);
        grid[y][x] = onEdge ? wallChar : floorChar;
      }
    }
  }

  // carve a door in the middle of a wall segment
  // Also ensures the door has clear passable space on both sides
  function carveDoor(grid, W, H, x0, y0, x1, y1) {
    const mx = Math.floor((x0 + x1) / 2);
    const my = Math.floor((y0 + y1) / 2);
    if (!grid[my] || grid[my][mx] === undefined) return;
    
    // Determine door orientation (horizontal or vertical wall)
    const isHorizontal = (y0 === y1);
    
    // Place door
    grid[my][mx] = '+';
    
    // Ensure clear space on both sides of door
    if (isHorizontal) {
      // Horizontal wall - clear space above and below
      for (let dy = -1; dy <= 1; dy++) {
        const ny = my + dy;
        if (ny >= 0 && ny < H && grid[ny]) {
          // Clear blocking terrain (trees, growth, etc.) but keep walls
          const c = grid[ny][mx];
          if (c === 'T' || c === '%' || c === '^') {
            grid[ny][mx] = '.';
          }
          // Also clear adjacent tiles for easier access
          if (mx > 0) {
            const adjC = grid[ny][mx - 1];
            if (adjC === 'T' || adjC === '%' || adjC === '^') {
              grid[ny][mx - 1] = '.';
            }
          }
          if (mx < W - 1) {
            const adjC = grid[ny][mx + 1];
            if (adjC === 'T' || adjC === '%' || adjC === '^') {
              grid[ny][mx + 1] = '.';
            }
          }
        }
      }
    } else {
      // Vertical wall - clear space left and right
      for (let dx = -1; dx <= 1; dx++) {
        const nx = mx + dx;
        if (nx >= 0 && nx < W && grid[my]) {
          const c = grid[my][nx];
          if (c === 'T' || c === '%' || c === '^') {
            grid[my][nx] = '.';
          }
          // Also clear adjacent tiles
          if (my > 0 && grid[my - 1]) {
            const adjC = grid[my - 1][nx];
            if (adjC === 'T' || adjC === '%' || adjC === '^') {
              grid[my - 1][nx] = '.';
            }
          }
          if (my < H - 1 && grid[my + 1]) {
            const adjC = grid[my + 1][nx];
            if (adjC === 'T' || adjC === '%' || adjC === '^') {
              grid[my + 1][nx] = '.';
            }
          }
        }
      }
    }
  }

  // flood-fill reachability from (sx, sy)
  function floodFill(grid, W, H, sx, sy, passableChars) {
    const pass = new Set(passableChars);
    const visited = new Set();
    const q = [[sx, sy]];
    while (q.length) {
      const [x, y] = q.pop();
      const k = `${x},${y}`;
      if (visited.has(k)) continue;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      if (!pass.has(grid[y][x])) continue;
      visited.add(k);
      q.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
    }
    return visited;
  }

  // Ensure an item position is accessible (has at least one adjacent passable tile)
  function ensureItemAccessible(grid, W, H, x, y, passableChars) {
    const pass = new Set(passableChars);
    // Check all 8 adjacent positions (including diagonals for easier access)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (ny >= 0 && ny < H && nx >= 0 && nx < W && grid[ny]) {
          const c = grid[ny][nx];
          if (pass.has(c)) return; // Found accessible path
        }
      }
    }
    // If no accessible path found, clear the item's tile to be passable
    // This handles edge cases where items are placed on blocking terrain
    if (grid[y] && grid[y][x]) {
      const c = grid[y][x];
      if (!pass.has(c)) {
        grid[y][x] = '.';
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATION — ROT.Map.Digger
  // ═══════════════════════════════════════════════════════════════════════════
  // Layout intent:
  //   Rooms sorted by area. Largest = hub (player + Casimir + exits + quest board).
  //   2nd largest = archive wing (Clavius + terminal).
  //   3rd = contractor bay (Brecht + container).
  //   Remaining rooms get vending, containers, log fragments.
  // ─────────────────────────────────────────────────────────────────────────────
  function genStation() {
    const W = 50, H = 24;
    const SEED = 0xAB47;

    return withSeed(SEED, () => {
      const grid = makeGrid(W, H, '#');

      const digger = new ROT.Map.Digger(W, H, {
        roomWidth:      [5, 11],
        roomHeight:     [4, 8],
        corridorLength: [1, 6],
        dugPercentage:  0.40,
      });

      digger.create((x, y, wall) => {
        grid[y][x] = wall ? '#' : '.';
      });

      // Sort rooms large→small
      const rooms = digger.getRooms().sort((a, b) => {
        const aArea = (a.getRight()-a.getLeft()) * (a.getBottom()-a.getTop());
        const bArea = (b.getRight()-b.getLeft()) * (b.getBottom()-b.getTop());
        return bArea - aArea;
      });

      if (rooms.length < 2) {
        // Fallback: regenerate with different seed until we get enough rooms
        console.warn('worldgen: station had < 2 rooms, using fallback');
        return genStationFallback();
      }

      const hub      = rooms[0];
      const archive  = rooms[1];
      const bayRoom  = rooms.length > 2 ? rooms[2] : rooms[1];

      const hubCx  = Math.floor((hub.getLeft()    + hub.getRight())    / 2);
      const hubCy  = Math.floor((hub.getTop()     + hub.getBottom())   / 2);
      const archCx = Math.floor((archive.getLeft() + archive.getRight()) / 2);
      const archCy = Math.floor((archive.getTop()  + archive.getBottom())/ 2);
      const bayCx  = Math.floor((bayRoom.getLeft() + bayRoom.getRight()) / 2);
      const bayCy  = Math.floor((bayRoom.getTop()  + bayRoom.getBottom())/ 2);

      // ── Decorative pillars in hub ───────────────────────────────────────
      const hubW = hub.getRight() - hub.getLeft();
      const hubH = hub.getBottom() - hub.getTop();
      if (hubW >= 8 && hubH >= 6) {
        // Place pillars symmetrically
        const pillarOffX = Math.floor(hubW / 4);
        const pillarOffY = Math.floor(hubH / 3);
        const pillarPositions = [
          [hub.getLeft() + pillarOffX, hub.getTop() + pillarOffY],
          [hub.getRight() - pillarOffX, hub.getTop() + pillarOffY],
          [hub.getLeft() + pillarOffX, hub.getBottom() - pillarOffY],
          [hub.getRight() - pillarOffX, hub.getBottom() - pillarOffY],
        ];
        for (const [px, py] of pillarPositions) {
          if (grid[py] && grid[py][px] === '.') grid[py][px] = '|';
        }
      }

      // ── Hub features ────────────────────────────────────────────────────
      // Quest board top-left corner of hub (accessible but not blocking center)
      const qbX = hub.getLeft()  + 1;
      const qbY = hub.getTop()   + 1;
      grid[qbY][qbX] = 'Q';
      grid[qbY][qbX + 1] = 'Q';

      // Vending machine — top-right corner
      const vX = hub.getRight() - 1;
      const vY = hub.getTop()   + 1;
      grid[vY][vX] = 'V';

      // Exit DOWN (to Earth) — bottom-center of hub
      const exitDX = hubCx;
      const exitDY = hub.getBottom() - 1;
      grid[exitDY][exitDX] = '>';

      // Exit UP (return pad) — opposite corner from exit down
      const exitUX = hub.getRight() - 2;
      const exitUY = hub.getTop() + 1;
      // Don't overwrite vending
      grid[exitUY + 1][exitUX] = '<';

      // ── Archive wing features ────────────────────────────────────────────
      // Terminal in archive
      grid[archCy][archCx] = '0';
      // Log fragment nearby - ensure it's accessible
      if (archive.getRight() - archCx > 1) {
        const fragX = archCx + 2;
        const fragY = archCy + 1;
        grid[fragY][fragX] = 'M';
        ensureItemAccessible(grid, W, H, fragX, fragY, ['.', '"', ',', '~', '=', '+']);
      }

      // ── Contractor bay features ─────────────────────────────────────────
      // Container for loot
      const contX = bayRoom.getLeft() + 1;
      const contY = bayRoom.getBottom() - 1;
      grid[contY][contX] = '[';

      // ── Entity positions ─────────────────────────────────────────────────
      // Casimir: one tile south of player start (so E works immediately on load)
      const playerX = hubCx;
      const playerY = hubCy - 1;         // player one tile north of center
      const casimirX = hubCx;
      const casimirY = hubCy;            // casimir at center — player faces south

      // Clavius: center of archive
      const claviusX = archCx - 1;
      const claviusY = archCy;

      // Brecht: center of bay
      const brechtX = bayCx;
      const brechtY = bayCy;

      // VOSS: place in 4th room if available, else near archive corner
      let vossX = vX - 2, vossY = vY + 2;
      if (rooms.length > 3) {
        const vossRoom = rooms[3];
        vossX = Math.floor((vossRoom.getLeft() + vossRoom.getRight()) / 2);
        vossY = Math.floor((vossRoom.getTop()  + vossRoom.getBottom())/ 2);
      }

      // MEDBAY: repair terminal — bottom-left of hub
      const mbX = hub.getLeft()   + 1;
      const mbY = hub.getBottom() - 1;
      grid[mbY][mbX] = 'H';

      // DARIUSZ: maintenance corridor — place near hub edge but still passable
      let darX = hub.getLeft() + 1, darY = hub.getBottom() - 2;

      // ── Bounds clamp all entity positions to passable floor ───────────────
      const clampToFloor = (x, y) => {
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (ny >= 0 && ny < H && nx >= 0 && nx < W && grid[ny][nx] === '.')
              return { x: nx, y: ny };
          }
        return { x, y };
      };

      const darPos   = clampToFloor(darX, darY);
      const vossPos  = clampToFloor(vossX, vossY);

      const map = gridToStrings(grid);

      return {
        id: 'station',
        name: 'The Station',
        map,
        playerStart: { x: playerX, y: playerY },
        entities: [
          { id: 'CASIMIR', type: 'npc',  x: casimirX, y: casimirY },
          { id: 'CLAVIUS', type: 'npc',  x: claviusX,  y: claviusY },
          { id: 'BRECHT',  type: 'npc',  x: brechtX,   y: brechtY  },
          { id: 'VOSS',    type: 'npc',  x: vossPos.x, y: vossPos.y },
          { id: 'DARIUSZ', type: 'npc',  x: darPos.x,  y: darPos.y },
        ],
        exits: {
          '>': { toLevelId: 'earth',   toPos: { x: 2, y: 2 } },
          '<': { toLevelId: null,      toPos: null },
        },
        // Width/height exposed for worldgen callers
        _W: W, _H: H,
        _hubCenter: { x: hubCx, y: hubCy },
      };
    });
  }

  // Last-resort fallback: minimal hand-crafted station that definitely works
  function genStationFallback() {
    const W = 40, H = 20;
    const grid = makeGrid(W, H, '#');

    // Main hub
    setRect(grid, 2, 2, 22, 12, '.');
    setRectBorder(grid, 2, 2, 22, 12, '#', '.');

    // Archive wing (east)
    setRect(grid, 24, 2, 36, 9, '.');
    setRectBorder(grid, 24, 2, 36, 9, '#', '.');
    grid[6][24] = '+';  // door
    // Ensure clear path to door
    if (grid[6][23] === '#') grid[6][23] = '.';
    if (grid[6][25] === '#') grid[6][25] = '.';

    // Contractor bay (south)
    setRect(grid, 4, 14, 18, 18, '.');
    setRectBorder(grid, 4, 14, 18, 18, '#', '.');
    grid[14][11] = '+'; // door
    // Ensure clear path to door
    if (grid[13] && grid[13][11] === '#') grid[13][11] = '.';
    if (grid[15] && grid[15][11] === '#') grid[15][11] = '.';

    // Features
    grid[3][4] = 'Q'; grid[3][5] = 'Q';
    grid[3][20] = 'V';
    grid[11][12] = '>';
    grid[3][21] = '<';
    grid[5][30] = '0';
    grid[6][27] = 'M';
    grid[17][5]  = '[';

    return {
      id: 'station',
      name: 'The Station',
      map: gridToStrings(grid),
      playerStart: { x: 12, y: 6 },
      entities: [
        { id: 'CASIMIR', type: 'npc', x: 12, y: 7  },
        { id: 'CLAVIUS', type: 'npc', x: 30, y: 5  },
        { id: 'BRECHT',  type: 'npc', x: 11, y: 16 },
        { id: 'VOSS',    type: 'npc', x: 20, y: 5  },
        { id: 'DARIUSZ', type: 'npc', x: 7,  y: 10 },
      ],
      exits: {
        '>': { toLevelId: 'earth',   toPos: { x: 2, y: 2 } },
        '<': { toLevelId: null,      toPos: null },
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EARTH / THE CRAWL — ROT.Map.Cellular + post-processing
  // ═══════════════════════════════════════════════════════════════════════════
  // Layout intent:
  //   Organic cave. Open areas are overlaid with Crawl growth (%, T, ").
  //   A ruined building (rectangular room) sits deep in the cave.
  //   Water appears in low-lying areas.
  //   Mercy-7 is inside the ruined building.
  //   Exit pod (<) near top edge.
  // ─────────────────────────────────────────────────────────────────────────────
  function genEarth() {
    const W = 52, H = 30;
    const SEED = 0x3C91;

    return withSeed(SEED, () => {
      // Phase 1: Cellular automata cave
      const passMap = makeGrid(W, H, 0);  // 0=wall, 1=passable

      const cellular = new ROT.Map.Cellular(W, H, {
        born:    [5, 6, 7, 8],
        survive: [4, 5, 6, 7, 8],
      });
      cellular.randomize(0.48);
      for (let i = 0; i < 5; i++) cellular.create();  // smooth
      cellular.create((x, y, wall) => {
        passMap[y][x] = wall ? 0 : 1;
      });

      // Phase 2: Force borders to walls
      for (let y = 0; y < H; y++) {
        passMap[y][0] = 0;
        passMap[y][W-1] = 0;
      }
      for (let x = 0; x < W; x++) {
        passMap[0][x] = 0;
        passMap[H-1][x] = 0;
      }

      // Phase 3: Find largest connected passable region, fill everything else
      // Start flood from a known open cell
      let startX = -1, startY = -1;
      outer: for (let y = 1; y < H-1; y++) {
        for (let x = 1; x < W-1; x++) {
          if (passMap[y][x] === 1) { startX = x; startY = y; break outer; }
        }
      }

      if (startX < 0) return genEarthFallback();

      // Build passable string grid for flood fill
      const passChars = ['.', '"', ',', '~', '=', 'T', '%'];
      const strGrid   = passMap.map(row => row.map(v => v ? '.' : '#'));

      const connected = floodFill(strGrid, W, H, startX, startY, ['.']);
      // Disconnect isolated pockets → wall them off
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          if (strGrid[y][x] === '.' && !connected.has(`${x},${y}`))
            strGrid[y][x] = '#';

      // Phase 4: Overlay Crawl aesthetics
      // Dense growth where there's lots of open space around
      for (let y = 1; y < H-1; y++) {
        for (let x = 1; x < W-1; x++) {
          if (strGrid[y][x] !== '.') continue;
          const r = ROT.RNG.getUniform();

          // Count open neighbors for density
          let open = 0;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++)
              if (strGrid[y+dy] && strGrid[y+dy][x+dx] === '.') open++;

          // Open meadow zones → grass
          if (open >= 7 && r < 0.65) strGrid[y][x] = '"';

          // Dense patches → growth/trees (blocking)
          else if (open >= 6 && r < 0.12) strGrid[y][x] = '%';
          else if (open >= 5 && r < 0.06) strGrid[y][x] = 'T';

          // Rubble in narrow corridors
          else if (open <= 3 && r < 0.20) strGrid[y][x] = ',';
        }
      }

      // Phase 5: Place ruined building (rectangular) in open area
      // Find a large contiguous open floor zone for the ruins
      let ruinX = -1, ruinY = -1;
      const RUIN_W = 9, RUIN_H = 7;

      // Scan for suitable top-left corner
      for (let ry = 4; ry < H - RUIN_H - 2; ry++) {
        for (let rx = 4; rx < W - RUIN_W - 2; rx++) {
          let fits = true;
          for (let dy = 0; dy <= RUIN_H && fits; dy++)
            for (let dx = 0; dx <= RUIN_W && fits; dx++)
              if (!strGrid[ry+dy] || strGrid[ry+dy][rx+dx] === '#') fits = false;
          if (fits) { ruinX = rx; ruinY = ry; break; }
        }
        if (ruinX >= 0) break;
      }

      if (ruinX < 0) {
        // Force-carve a ruin area in a large open spot
        ruinX = Math.floor(W/2) - 5;
        ruinY = Math.floor(H/2) - 3;
        setRect(strGrid, ruinX-1, ruinY-1, ruinX+RUIN_W+1, ruinY+RUIN_H+1, '.');
      }

      setRectBorder(strGrid, ruinX, ruinY, ruinX+RUIN_W, ruinY+RUIN_H, '#', '.');
      // Doors on south and east walls of ruin - ensure they're accessible
      const southDoorX = ruinX + Math.floor(RUIN_W/2);
      const southDoorY = ruinY + RUIN_H;
      strGrid[southDoorY][southDoorX] = '+';
      // Clear terrain in front of south door
      if (southDoorY + 1 < H) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = southDoorX + dx;
          if (nx >= 0 && nx < W && strGrid[southDoorY + 1]) {
            const c = strGrid[southDoorY + 1][nx];
            if (c === 'T' || c === '%' || c === '^' || c === '#') {
              strGrid[southDoorY + 1][nx] = '.';
            }
          }
        }
      }
      
      const eastDoorX = ruinX + RUIN_W;
      const eastDoorY = ruinY + Math.floor(RUIN_H/2);
      strGrid[eastDoorY][eastDoorX] = '+';
      // Clear terrain in front of east door
      if (eastDoorX + 1 < W) {
        for (let dy = -1; dy <= 1; dy++) {
          const ny = eastDoorY + dy;
          if (ny >= 0 && ny < H && strGrid[ny]) {
            const c = strGrid[ny][eastDoorX + 1];
            if (c === 'T' || c === '%' || c === '^' || c === '#') {
              strGrid[ny][eastDoorX + 1] = '.';
            }
          }
        }
      }
      // Container inside - ensure accessible
      const contX = ruinX + 1;
      const contY = ruinY + 1;
      strGrid[contY][contX] = '[';
      ensureItemAccessible(strGrid, W, H, contX, contY, ['.', '"', ',', '~', '=', '+']);
      
      // Memory fragment inside - ensure accessible
      const fragX = ruinX + RUIN_W - 1;
      const fragY = ruinY + 1;
      strGrid[fragY][fragX] = 'M';
      ensureItemAccessible(strGrid, W, H, fragX, fragY, ['.', '"', ',', '~', '=', '+']);

      const ruinCx = ruinX + Math.floor(RUIN_W / 2);
      const ruinCy = ruinY + Math.floor(RUIN_H / 2);

      // Phase 5.5: Scatter rocks and boulders for visual interest
      for (let i = 0; i < 12; i++) {
        const rx = Math.floor(ROT.RNG.getUniform() * (W - 6)) + 3;
        const ry = Math.floor(ROT.RNG.getUniform() * (H - 6)) + 3;
        // Don't place in the ruin area
        if (rx >= ruinX - 1 && rx <= ruinX + RUIN_W + 1 && 
            ry >= ruinY - 1 && ry <= ruinY + RUIN_H + 1) continue;
        if (strGrid[ry][rx] === '.' || strGrid[ry][rx] === '"') {
          strGrid[ry][rx] = '*';
        }
      }

      // Phase 6: Water section — near bottom edge
      const waterY = H - 6;
      for (let x = 5; x < W - 5; x++) {
        if (strGrid[waterY][x] === '.' || strGrid[waterY][x] === '"') {
          const r = ROT.RNG.getUniform();
          if (r < 0.5) strGrid[waterY][x] = '~';
          if (r < 0.3 && strGrid[waterY-1] && strGrid[waterY-1][x] !== '#')
            strGrid[waterY-1][x] = '~';
        }
      }

      // Bridge across the water at a good crossing point
      const bridgeX = Math.floor(W / 2);
      for (let y = waterY - 1; y <= waterY + 1; y++) {
        if (strGrid[y]) {
          strGrid[y][bridgeX]   = '=';
          strGrid[y][bridgeX+1] = '=';
        }
      }

      // Phase 7: Exit pod — top-left area (passable position near edge)
      let exitX = 2, exitY = 2;
      // Find a passable cell near top-left
      for (let y = 1; y < 6; y++) {
        for (let x = 1; x < 8; x++) {
          const c = strGrid[y][x];
          if (c === '.' || c === '"' || c === ',') {
            strGrid[y][x] = '<';
            exitX = x; exitY = y;
            y = 99; break;
          }
        }
      }

      // Phase 8: Force-clear cells directly around exit pod so player can move
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = exitX + dx, ny = exitY + dy;
          if (ny > 0 && ny < H && nx > 0 && nx < W && strGrid[ny][nx] === '#')
            strGrid[ny][nx] = '.';
        }
      }

      // Player entry point from station — 2 tiles south of exit
      const playerX = exitX;
      const playerY = Math.min(exitY + 2, H - 2);
      // Ensure that cell is passable
      if (strGrid[playerY][playerX] === '#') strGrid[playerY][playerX] = '.';

      // Mercy-7: center of ruined building
      const mercy7X = ruinCx;
      const mercy7Y = ruinCy;

      // Ensure all item entities are accessible
      const passableChars = ['.', '"', ',', '~', '=', '+'];
      ensureItemAccessible(strGrid, W, H, ruinX + 2, ruinY + RUIN_H - 1, passableChars);
      ensureItemAccessible(strGrid, W, H, ruinCx + 1, ruinCy + 1, passableChars);

      const map = strGrid.map(row => row.join(''));

      return {
        id: 'earth',
        name: 'Earth — Survey Zone 7',
        map,
        playerStart: { x: playerX, y: playerY },
        entities: [
          { id: 'MERCY7', type: 'npc',  x: mercy7X, y: mercy7Y },
          { id: 'sample_a', type: 'item', x: ruinX + 2, y: ruinY + RUIN_H - 1,
            itemId: 'bio_sample',  questFlag: 'q_voidrats1_taken' },
          { id: 'sample_b', type: 'item', x: ruinCx + 1, y: ruinCy + 1,
            itemId: 'survey_data', questFlag: 'q_scribes1_taken' },
        ],
        exits: {
          '<': { toLevelId: 'station', toPos: null },  // toPos filled dynamically by engine
          '>': { toLevelId: null, toPos: null },
        },
        surveyZones: [
          { x: ruinCx,     y: ruinCy - 3 },
          { x: exitX + 4,  y: exitY + 4  },
          { x: bridgeX,    y: waterY - 2 },
        ],
        _ruinCenter: { x: ruinCx, y: ruinCy },
      };
    });
  }

  // Earth fallback: minimal passable cave
  function genEarthFallback() {
    const W = 50, H = 28;
    const grid = makeGrid(W, H, '#');
    // Carve a large open area
    setRect(grid, 2, 2, 48, 26, '.');
    setRectBorder(grid, 2, 2, 48, 26, '#', '.');
    // Add some walls/features inside
    setRect(grid, 10, 8, 22, 16, '.');
    setRectBorder(grid, 10, 8, 22, 16, '#', '.');
    grid[16][16] = '+';
    grid[12][12] = '[';
    grid[12][20] = 'M';
    // Crawl overlay
    for (let y = 3; y < 26; y++)
      for (let x = 3; x < 48; x++)
        if (grid[y][x] === '.' && ROT.RNG.getUniform() < 0.25) grid[y][x] = '"';
    // Exit
    grid[2][3] = '<';
    grid[3][3] = '.'; grid[4][3] = '.';
    return {
      id: 'earth',
      name: 'Earth — Survey Zone 7',
      map: gridToStrings(grid),
      playerStart: { x: 3, y: 5 },
      entities: [
        { id: 'MERCY7', type: 'npc', x: 16, y: 12 },
        { id: 'sample_a', type: 'item', x: 11, y: 15, itemId: 'bio_sample',  questFlag: 'q_voidrats1_taken' },
        { id: 'sample_b', type: 'item', x: 17, y: 12, itemId: 'survey_data', questFlag: 'q_scribes1_taken'  },
      ],
      exits: {
        '<': { toLevelId: 'station', toPos: null },
        '>': { toLevelId: null, toPos: null },
      },
      surveyZones: [
        { x: 8,  y: 6 },
        { x: 16, y: 10 },
        { x: 22, y: 20 },
      ],
    };
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  window.SV.WorldGen = {
    genStation,
    genEarth,
  };
})();
