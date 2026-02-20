'use strict';
// ─── player.js ───────────────────────────────────────────────────────────────
// Player state: position, hp, inventory, log entries, facing direction.
(function () {
  const { COLORS, SETTINGS, FLAG } = window.SV;

  class Player {
    constructor(name) {
      this.name      = name || 'UNKNOWN';
      this.callsign  = `SV-${this.name.toUpperCase()}`;
      this.x         = 0;
      this.y         = 0;
      this.facing    = { dx: 0, dy: 1 };  // last move direction (for interaction)
      this.hp        = 8;
      this.maxHp     = 8;
      this.credits   = 5;
      this.inventory = [];
      this.maxItems  = 12;
      this._log      = [];   // raw log entries, newest last
    }

    // ── Movement ────────────────────────────────────────────────────────
    tryMove(dx, dy, world) {
      const nx = this.x + dx;
      const ny = this.y + dy;
      this.facing = { dx, dy };

      const tile = world.getTile(nx, ny);
      if (!tile || !tile.passable) return false;

      this.x = nx;
      this.y = ny;

      // Trigger tile-enter effects
      if (tile.type === 'pickup') {
        return { action: 'pickup', tile };
      }
      if (tile.type === 'exit') {
        return { action: 'exit', tile };
      }
      return true;
    }

    // ── Interaction target ───────────────────────────────────────────────
    // Returns the tile/entity the player is facing (or adjacent tiles in order)
    getFacingTarget(world) {
      const tx = this.x + this.facing.dx;
      const ty = this.y + this.facing.dy;
      return { x: tx, y: ty, tile: world.getTile(tx, ty) };
    }

    // ── Inventory ────────────────────────────────────────────────────────
    addItem(itemDef) {
      if (this.inventory.length >= this.maxItems) return false;
      // Stackable?
      if (itemDef.stackable) {
        const existing = this.inventory.find(s => s.id === itemDef.id);
        if (existing) { existing.qty++; return true; }
      }
      this.inventory.push({ ...itemDef, qty: 1 });
      return true;
    }

    removeItem(id, qty = 1) {
      const idx = this.inventory.findIndex(s => s.id === id);
      if (idx < 0) return false;
      this.inventory[idx].qty -= qty;
      if (this.inventory[idx].qty <= 0) this.inventory.splice(idx, 1);
      return true;
    }

    hasItem(id) {
      return this.inventory.some(s => s.id === id);
    }

    useItem(idx, flags, engine) {
      const item = this.inventory[idx];
      if (!item) return null;
      if (!item.usable) return `${item.name} has no use here.`;
      const msg = item.onUse ? item.onUse(this) : `Used ${item.name}.`;
      this.removeItem(item.id, 1);
      return msg;
    }

    // ── Log entries ──────────────────────────────────────────────────────
    // Log entries are terse, capped at LOG_MAX_CHARS.
    // IDENTITY_DRIFT shifts the rendering color (handled in renderer).
    addLog(text, flags) {
      const drift = flags ? flags.get(FLAG.IDENTITY_DRIFT) : 0;
      const entry = {
        text:  text.slice(0, SETTINGS.LOG_MAX_CHARS),
        drift,
        turn:  Date.now(),  // replaced with actual turn counter in engine
      };
      this._log.push(entry);
      if (this._log.length > SETTINGS.LOG_MAX_ENTRIES) {
        this._log.shift();
      }
    }

    getRecentLog(n = 3) {
      return this._log.slice(-n);
    }

    // Color for a log entry based on IDENTITY_DRIFT at time of writing
    static logColor(entry) {
      const t = Math.min(entry.drift / SETTINGS.DRIFT_MAX, 1);
      return entry.drift < 30 ? COLORS.driftLow :
             entry.drift < 60 ? interpolateHex(COLORS.driftLow, COLORS.driftHigh, (t - 0.3) / 0.3) :
             COLORS.driftHigh;
    }
  }

  // Simple hex color interpolation for the drift shift
  function interpolateHex(a, b, t) {
    const ra = parseInt(a.slice(1, 3), 16), ga = parseInt(a.slice(3, 5), 16), ba = parseInt(a.slice(5, 7), 16);
    const rb = parseInt(b.slice(1, 3), 16), gb = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
    const r = Math.round(ra + (rb - ra) * t);
    const g = Math.round(ga + (gb - ga) * t);
    const bl = Math.round(ba + (bb - ba) * t);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${bl.toString(16).padStart(2,'0')}`;
  }

  window.SV.Player = Player;
})();
