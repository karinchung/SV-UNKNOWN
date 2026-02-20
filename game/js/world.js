'use strict';
// ─── world.js ────────────────────────────────────────────────────────────────
// Level: parsed map + entity list.
// World: manages current level + level transitions.
(function () {
  const { tileFromChar, LEVELS, NPC_DATA, ITEM_DATA } = window.SV;

  // ── Entity types on a level ─────────────────────────────────────────────
  class Entity {
    constructor(def) {
      this.id    = def.id;
      this.type  = def.type;   // 'npc' | 'item'
      this.x     = def.x;
      this.y     = def.y;
      this.alive = true;

      if (def.type === 'npc') {
        const npcData = NPC_DATA[def.id];
        this.char     = npcData.char;
        this.color    = npcData.color;
        this.npcData  = npcData;
      } else if (def.type === 'item') {
        const itemData = ITEM_DATA[def.itemId];
        this.char      = itemData ? itemData.char  : '$';
        this.color     = itemData ? itemData.color : '#fff';
        this.itemData  = itemData;
        this.itemId    = def.itemId;
        this.questFlag = def.questFlag || null;
      }
    }
  }

  // ── Level ───────────────────────────────────────────────────────────────
  class Level {
    constructor(levelDef, flags) {
      this.def     = levelDef;
      this.id      = levelDef.id;
      this.name    = levelDef.name;
      this.width   = 0;
      this.height  = 0;
      this._grid   = [];
      this.entities = [];

      this._parse(levelDef.map);
      this._spawnEntities(levelDef.entities, flags);
    }

    _parse(mapRows) {
      this.height = mapRows.length;
      this.width  = Math.max(...mapRows.map(r => r.length));
      this._grid  = [];

      const npcMarkers = new Set(['C', 'L', 'B', 'R', '@', '!']);

      for (let y = 0; y < this.height; y++) {
        this._grid[y] = [];
        const row = mapRows[y] || '';
        for (let x = 0; x < this.width; x++) {
          const ch = row[x] || ' ';
          // NPC/player markers → floor tile (entity placed separately)
          const tileChar = npcMarkers.has(ch) ? '.' : ch;
          this._grid[y][x] = tileFromChar(tileChar);
        }
      }
    }

    _spawnEntities(entityDefs, flags) {
      if (!entityDefs) return;
      for (const def of entityDefs) {
        // Item entities may be quest-gated
        if (def.type === 'item' && def.questFlag && flags && !flags.has(def.questFlag)) {
          continue;
        }
        this.entities.push(new Entity(def));
      }
    }

    getTile(x, y) {
      if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
        return window.SV.TILE.VOID;
      }
      return this._grid[y][x];
    }

    getEntityAt(x, y) {
      return this.entities.find(e => e.alive && e.x === x && e.y === y) || null;
    }

    removeEntity(entity) {
      entity.alive = false;
      this.entities = this.entities.filter(e => e.alive);
    }

    // Refreshes quest-gated item spawns (call after quest accept)
    refreshItems(flags) {
      const allDefs = this.def.entities || [];
      for (const def of allDefs) {
        if (def.type !== 'item') continue;
        const exists = this.entities.some(e => e.id === def.id);
        if (!exists && def.questFlag && flags && flags.has(def.questFlag)) {
          this.entities.push(new Entity(def));
        }
      }
    }
  }

  // ── World ────────────────────────────────────────────────────────────────
  class World {
    constructor() {
      this._levels  = {};
      this._current = null;
    }

    loadLevel(id, flags) {
      if (!LEVELS[id]) { console.error('Unknown level:', id); return; }
      if (!this._levels[id]) {
        this._levels[id] = new Level(LEVELS[id], flags);
      }
      this._current = this._levels[id];
      return this._current;
    }

    currentLevel() { return this._current; }

    getTile(x, y) {
      return this._current ? this._current.getTile(x, y) : window.SV.TILE.VOID;
    }

    getEntityAt(x, y) {
      return this._current ? this._current.getEntityAt(x, y) : null;
    }

    // Check if a position is passable (no wall AND no blocking entity)
    isPassable(x, y) {
      const tile = this.getTile(x, y);
      if (!tile.passable) return false;
      const entity = this.getEntityAt(x, y);
      if (entity && entity.type === 'npc') return false;  // NPCs block
      return true;
    }

    getPlayerStart() {
      return this._current ? { ...this._current.def.playerStart } : { x: 1, y: 1 };
    }

    getExit(type) {
      const exits = this._current ? this._current.def.exits : {};
      return exits[type] || null;
    }
  }

  window.SV.Level  = Level;
  window.SV.World  = World;
  window.SV.Entity = Entity;
})();
