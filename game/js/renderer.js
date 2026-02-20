'use strict';
// ─── renderer.js ─────────────────────────────────────────────────────────────
// Canvas renderer. Draws tiles + entities; player is always centered.
// Requires ROT.js to be loaded for FOV (ROT.FOV.PreciseShadowcasting).
//
// Visual enhancements:
//   - Color variation for floors/walls/grass (deterministic noise)
//   - Distance-based lighting falloff from player
//   - Ambient occlusion (shadows near walls)
//   - Unicode box-drawing characters for walls
//   - Water shimmer animation
//   - Terrain background tints
//   - Particle effects (fireflies in grass areas)
//   - Mini-map overlay
//
// FOV contract:
//   render() is called with a fov argument: { visible: Set<"x,y">, explored: Set<"x,y"> }
//   - visible   → tiles currently lit; drawn at full color
//   - explored  → tiles seen before but not currently lit; drawn dimmed
//   - neither   → invisible (drawn as bg only)
(function () {
  const { COLORS, SETTINGS } = window.SV;

  // ── Wall box-drawing character lookup ────────────────────────────────────────
  // Index: N=1, S=2, E=4, W=8 → 16 combinations
  const WALL_CHARS = [
    '□', '│', '│', '│',  // 0-3: none, N, S, NS (vertical)
    '─', '└', '┌', '├',  // 4-7: E, NE, SE, NSE
    '─', '┘', '┐', '┤',  // 8-11: W, NW, SW, NSW
    '─', '┴', '┬', '┼',  // 12-15: EW, NEW, SEW, all
  ];

  // ── Terrain background tints ─────────────────────────────────────────────────
  const TERRAIN_BG = {
    'shallow_water': { color: '#1e4490', alpha: 0.18 },
    'water':         { color: '#0a2050', alpha: 0.25 },
    'nature':        { color: '#1a3020', alpha: 0.12 },
    'ground':        { color: '#151510', alpha: 0.06 },
  };

  // ── Water animation chars ────────────────────────────────────────────────────
  const WATER_CHARS = ['~', '≈', '∼', '~'];

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx    = canvas.getContext('2d');
      this.cw     = SETTINGS.CELL_W;
      this.ch     = SETTINGS.CELL_H;
      canvas.width  = SETTINGS.CANVAS_W;
      canvas.height = SETTINGS.CANVAS_H;

      // Animation frame counter
      this._animFrame = 0;

      // Particle system for fireflies
      this._particles = [];
    }

    // ── Viewport ─────────────────────────────────────────────────────────────
    _viewport(player, level) {
      const hw = Math.floor(SETTINGS.VIEWPORT_W / 2);
      const hh = Math.floor(SETTINGS.VIEWPORT_H / 2);
      let ox = player.x - hw;
      let oy = player.y - hh;
      ox = Math.max(0, Math.min(ox, level.width  - SETTINGS.VIEWPORT_W));
      oy = Math.max(0, Math.min(oy, level.height - SETTINGS.VIEWPORT_H));
      return { ox, oy };
    }

    // ── Color utilities ──────────────────────────────────────────────────────

    // Deterministic noise-based color variation (same position = same result)
    _getVariedColor(baseColor, wx, wy, variance = 0.10) {
      // Fast hash for deterministic noise
      const noise = Math.abs(Math.sin(wx * 12.9898 + wy * 78.233) * 43758.5453) % 1;
      const factor = 1 + (noise - 0.5) * variance * 2;

      const r = Math.min(255, Math.max(0, Math.round(parseInt(baseColor.slice(1, 3), 16) * factor)));
      const g = Math.min(255, Math.max(0, Math.round(parseInt(baseColor.slice(3, 5), 16) * factor)));
      const b = Math.min(255, Math.max(0, Math.round(parseInt(baseColor.slice(5, 7), 16) * factor)));

      return `rgb(${r},${g},${b})`;
    }

    // Distance-based dimming (radial falloff from player)
    _getDistanceDim(playerX, playerY, tileX, tileY) {
      const maxRadius = SETTINGS.FOV_RADIUS || 10;
      const dist = Math.sqrt((tileX - playerX) ** 2 + (tileY - playerY) ** 2);
      // Falloff: 1.0 at player, down to 0.55 at edge
      return Math.max(0.55, 1 - (dist / maxRadius) * 0.45);
    }

    // Blend a hex color toward the bg at `alpha` (0=bg, 1=full color)
    _blend(hex, alpha) {
      const bg = COLORS.bg;
      // Handle rgb() format
      if (hex.startsWith('rgb')) {
        const match = hex.match(/rgb\((\d+),(\d+),(\d+)\)/);
        if (match) {
          const r1 = parseInt(match[1]);
          const g1 = parseInt(match[2]);
          const b1 = parseInt(match[3]);
          const r2 = parseInt(bg.slice(1, 3), 16);
          const g2 = parseInt(bg.slice(3, 5), 16);
          const b2 = parseInt(bg.slice(5, 7), 16);
          return `rgb(${Math.round(r2 + (r1 - r2) * alpha)},${Math.round(g2 + (g1 - g2) * alpha)},${Math.round(b2 + (b1 - b2) * alpha)})`;
        }
      }
      const r1 = parseInt(hex.slice(1, 3), 16);
      const g1 = parseInt(hex.slice(3, 5), 16);
      const b1 = parseInt(hex.slice(5, 7), 16);
      const r2 = parseInt(bg.slice(1, 3), 16);
      const g2 = parseInt(bg.slice(3, 5), 16);
      const b2 = parseInt(bg.slice(5, 7), 16);
      return `rgb(${Math.round(r2 + (r1 - r2) * alpha)},${Math.round(g2 + (g1 - g2) * alpha)},${Math.round(b2 + (b1 - b2) * alpha)})`;
    }

    // ── Wall character lookup ────────────────────────────────────────────────
    _isWallTile(level, x, y) {
      const t = level.getTile(x, y);
      return t && (t.type === 'wall' || t.char === '#');
    }

    _getWallChar(level, wx, wy) {
      const n = this._isWallTile(level, wx, wy - 1) ? 1 : 0;
      const s = this._isWallTile(level, wx, wy + 1) ? 2 : 0;
      const e = this._isWallTile(level, wx + 1, wy) ? 4 : 0;
      const w = this._isWallTile(level, wx - 1, wy) ? 8 : 0;
      return WALL_CHARS[n | s | e | w];
    }

    // ── Ambient occlusion check ──────────────────────────────────────────────
    _hasAdjacentWall(level, wx, wy) {
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const t = level.getTile(wx + dx, wy + dy);
        if (t && (t.type === 'wall' || t.opaque)) return true;
      }
      return false;
    }

    // ── Low-level draw ───────────────────────────────────────────────────────
    _clear() {
      this.ctx.fillStyle = COLORS.bg;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    _drawChar(vx, vy, char, color, bold) {
      const px = vx * this.cw + Math.floor(this.cw / 2);
      const py = vy * this.ch + Math.floor(this.ch * 0.78);
      this.ctx.font         = bold ? SETTINGS.FONT_BOLD : SETTINGS.FONT;
      this.ctx.fillStyle    = color;
      this.ctx.textAlign    = 'center';
      this.ctx.textBaseline = 'alphabetic';
      this.ctx.fillText(char, px, py);
    }

    _drawCharGlow(vx, vy, char, color, bold, glowColor, glowBlur) {
      const px = vx * this.cw + Math.floor(this.cw / 2);
      const py = vy * this.ch + Math.floor(this.ch * 0.78);
      this.ctx.save();
      this.ctx.shadowColor  = glowColor;
      this.ctx.shadowBlur   = glowBlur;
      this.ctx.font         = bold ? SETTINGS.FONT_BOLD : SETTINGS.FONT;
      this.ctx.fillStyle    = color;
      this.ctx.textAlign    = 'center';
      this.ctx.textBaseline = 'alphabetic';
      this.ctx.fillText(char, px, py);
      this.ctx.restore();
    }

    _drawCellBg(vx, vy, color, alpha) {
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle   = color;
      this.ctx.fillRect(vx * this.cw, vy * this.ch, this.cw, this.ch);
      this.ctx.globalAlpha = 1;
    }

    // ── Particle system (fireflies) ──────────────────────────────────────────
    _updateParticles(level, ox, oy, player) {
      // Spawn new particles in grass/nature areas
      if (Math.random() < 0.03) {
        const px = ox + Math.floor(Math.random() * SETTINGS.VIEWPORT_W);
        const py = oy + Math.floor(Math.random() * SETTINGS.VIEWPORT_H);
        const tile = level.getTile(px, py);
        if (tile && (tile.type === 'ground' || tile.type === 'nature' || tile.char === '"')) {
          this._particles.push({
            x: px + Math.random(),
            y: py + Math.random(),
            vx: (Math.random() - 0.5) * 0.015,
            vy: (Math.random() - 0.5) * 0.015,
            life: 80 + Math.random() * 80,
            maxLife: 80 + Math.random() * 80,
            color: Math.random() > 0.5 ? '#90e070' : '#70c0a0',
            size: 1.5 + Math.random() * 1.5,
          });
        }
      }

      // Update existing particles
      for (const p of this._particles) {
        p.x += p.vx;
        p.y += p.vy;
        // Gentle drift
        p.vx += (Math.random() - 0.5) * 0.002;
        p.vy += (Math.random() - 0.5) * 0.002;
        p.life--;
      }

      // Remove dead particles (cap at 30)
      this._particles = this._particles.filter(p => p.life > 0).slice(-30);
    }

    _renderParticles(ox, oy) {
      for (const p of this._particles) {
        const vx = (p.x - ox) * this.cw;
        const vy = (p.y - oy) * this.ch;

        if (vx < 0 || vx > this.canvas.width || vy < 0 || vy > this.canvas.height) continue;

        // Fade in/out based on life
        const fadeIn  = Math.min(1, (p.maxLife - p.life) / 20);
        const fadeOut = Math.min(1, p.life / 20);
        const alpha   = fadeIn * fadeOut * 0.7;

        // Pulsing glow
        const pulse = 0.7 + Math.sin(p.life * 0.15) * 0.3;

        this.ctx.save();
        this.ctx.globalAlpha = alpha * pulse;
        this.ctx.shadowColor = p.color;
        this.ctx.shadowBlur  = 6;
        this.ctx.fillStyle   = p.color;
        this.ctx.beginPath();
        this.ctx.arc(vx, vy, p.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }
    }

    // ── Mini-map ─────────────────────────────────────────────────────────────
    _renderMiniMap(level, fov, player) {
      const scale = 2;
      const padding = 8;
      const mapW = level.width * scale;
      const mapH = level.height * scale;
      const mx = this.canvas.width - mapW - padding;
      const my = padding;

      // Semi-transparent background
      this.ctx.globalAlpha = 0.3;
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(mx - 2, my - 2, mapW + 4, mapH + 4);
      this.ctx.globalAlpha = 1;

      // Border
      this.ctx.strokeStyle = 'rgba(82, 184, 150, 0.3)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(mx - 2, my - 2, mapW + 4, mapH + 4);

      // Draw explored tiles
      this.ctx.globalAlpha = 0.5;
      for (let y = 0; y < level.height; y++) {
        for (let x = 0; x < level.width; x++) {
          const key = `${x},${y}`;
          if (!fov || !fov.explored.has(key)) continue;

          const tile = level.getTile(x, y);
          if (!tile || tile.type === 'void') continue;

          // Color based on tile type
          if (tile.type === 'wall') {
            this.ctx.fillStyle = '#445';
          } else if (tile.type === 'shallow_water' || tile.type === 'water') {
            this.ctx.fillStyle = '#234';
          } else if (tile.type === 'nature') {
            this.ctx.fillStyle = '#243';
          } else if (tile.type === 'exit') {
            this.ctx.fillStyle = '#4a8';
          } else {
            this.ctx.fillStyle = '#333';
          }

          this.ctx.fillRect(mx + x * scale, my + y * scale, scale, scale);
        }
      }
      this.ctx.globalAlpha = 1;

      // Player position (bright dot)
      this.ctx.fillStyle = '#fff';
      this.ctx.shadowColor = '#fff';
      this.ctx.shadowBlur = 4;
      this.ctx.fillRect(mx + player.x * scale - 1, my + player.y * scale - 1, scale + 2, scale + 2);
      this.ctx.shadowBlur = 0;
    }

    // ── Main render ──────────────────────────────────────────────────────────
    render(world, player, flags, fov, engine) {
      this._clear();
      const level = world.currentLevel();
      if (!level) return;

      // Increment animation frame
      this._animFrame = (this._animFrame + 1) % 240;

      const { ox, oy } = this._viewport(player, level);
      const visible  = fov ? fov.visible  : null;
      const explored = fov ? fov.explored : null;
      const DIM      = SETTINGS.FOV_DIM_ALPHA;

      // Update particles
      this._updateParticles(level, ox, oy, player);

      // ── Pass 1: Terrain backgrounds + ambient occlusion ───────────────────
      for (let vy = 0; vy < SETTINGS.VIEWPORT_H; vy++) {
        for (let vx = 0; vx < SETTINGS.VIEWPORT_W; vx++) {
          const wx  = ox + vx;
          const wy  = oy + vy;
          const key = `${wx},${wy}`;

          if (visible && !visible.has(key) && explored && !explored.has(key)) continue;

          const tile = level.getTile(wx, wy);
          if (!tile || tile.type === 'void') continue;

          const lit = !visible || visible.has(key);

          // Terrain background tint
          if (lit && TERRAIN_BG[tile.type]) {
            const bg = TERRAIN_BG[tile.type];
            this._drawCellBg(vx, vy, bg.color, bg.alpha);
          }

          // Ambient occlusion: shadow near walls
          if (lit && tile.passable && this._hasAdjacentWall(level, wx, wy)) {
            this._drawCellBg(vx, vy, '#000000', 0.12);
          }
        }
      }

      // ── Pass 2: Tile characters ───────────────────────────────────────────
      for (let vy = 0; vy < SETTINGS.VIEWPORT_H; vy++) {
        for (let vx = 0; vx < SETTINGS.VIEWPORT_W; vx++) {
          const wx  = ox + vx;
          const wy  = oy + vy;
          const key = `${wx},${wy}`;

          if (visible && !visible.has(key) && explored && !explored.has(key)) continue;

          const tile = level.getTile(wx, wy);
          if (!tile || tile.type === 'void') continue;

          const lit = !visible || visible.has(key);

          // Base color with variation for certain tiles
          let baseColor = tile.color;
          let char = tile.char;

          // Apply color variation to floors, walls, grass, rubble
          if (tile.type === 'floor' || tile.type === 'ground' || tile.type === 'wall') {
            baseColor = this._getVariedColor(tile.color, wx, wy, 0.12);
          }

          // Wall: use box-drawing characters
          if (tile.type === 'wall' && tile.char === '#') {
            char = this._getWallChar(level, wx, wy);
          }

          // Water: shimmer animation
          if (tile.type === 'shallow_water') {
            const shimmerPhase = (this._animFrame * 0.08 + wx * 0.4 + wy * 0.3);
            const shimmer = 0.8 + Math.sin(shimmerPhase) * 0.2;
            baseColor = this._blend(tile.color, shimmer);
            // Alternate water chars
            const charIdx = Math.floor((this._animFrame * 0.05 + wx + wy) % WATER_CHARS.length);
            char = WATER_CHARS[charIdx];
          }

          // Distance-based falloff for lit tiles
          let color;
          if (lit) {
            const distDim = this._getDistanceDim(player.x, player.y, wx, wy);
            color = this._blend(baseColor, distDim);
          } else {
            color = this._blend(baseColor, DIM);
          }

          // Interactive tiles and exits get a glow when lit
          if (lit && (tile.type === 'interact' || tile.type === 'exit' || tile.type === 'pickup')) {
            const gc = tile.type === 'exit' ? COLORS.terminalBright
                     : tile.type === 'pickup' ? COLORS.driftHigh
                     : tile.color;
            this._drawCharGlow(vx, vy, char, color, false, gc, 10);
          } else {
            this._drawChar(vx, vy, char, color, false);
          }
        }
      }

      // ── Pass 3: Particles (behind entities) ───────────────────────────────
      this._renderParticles(ox, oy);

      // ── Pass 4: Entities ──────────────────────────────────────────────────
      for (const entity of level.entities) {
        if (!entity.alive) continue;
        const vx  = entity.x - ox;
        const vy  = entity.y - oy;
        const key = `${entity.x},${entity.y}`;

        if (vx < 0 || vx >= SETTINGS.VIEWPORT_W || vy < 0 || vy >= SETTINGS.VIEWPORT_H) continue;
        if (visible && !visible.has(key)) continue;

        // NPCs get an amber glow; items get an item-gold glow
        if (entity.type === 'npc') {
          this._drawCharGlow(vx, vy, entity.char, entity.color, false, COLORS.npc, 12);
        } else {
          this._drawCharGlow(vx, vy, entity.char, entity.color, false, COLORS.item, 6);
        }
      }

      // ── Pass 5: Player — always on top, bold ──────────────────────────────
      const pvx = player.x - ox;
      const pvy = player.y - oy;
      if (pvx >= 0 && pvx < SETTINGS.VIEWPORT_W && pvy >= 0 && pvy < SETTINGS.VIEWPORT_H) {
        // Phosphor glow rect behind @
        this.ctx.fillStyle = COLORS.playerBg;
        this.ctx.fillRect(pvx * this.cw, pvy * this.ch, this.cw, this.ch);
        this._drawCharGlow(pvx, pvy, '@', COLORS.player, true, COLORS.player, 10);
      }

      // ── Pass 6: Mini-map ──────────────────────────────────────────────────
      if (fov && fov.explored.size > 0) {
        this._renderMiniMap(level, fov, player);
      }

      // ── Pass 7: Inspect mode highlight ────────────────────────────────────
      if (engine && engine.inspectMode) {
        const inspectX = engine.inspectX || 0;
        const inspectY = engine.inspectY || 0;
        const ivx = inspectX - ox;
        const ivy = inspectY - oy;
        if (ivx >= 0 && ivx < SETTINGS.VIEWPORT_W && ivy >= 0 && ivy < SETTINGS.VIEWPORT_H) {
          this.ctx.save();
          this.ctx.strokeStyle  = '#ff4444';
          this.ctx.shadowColor  = '#ff2222';
          this.ctx.shadowBlur   = 8;
          this.ctx.lineWidth    = 1.5;
          this.ctx.setLineDash([3, 3]);
          this.ctx.strokeRect(ivx * this.cw + 1, ivy * this.ch + 1, this.cw - 2, this.ch - 2);
          this.ctx.restore();
        }
      }
    }
  }

  window.SV.Renderer = Renderer;
})();
