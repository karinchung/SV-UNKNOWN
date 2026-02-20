'use strict';
// ─── input.js ────────────────────────────────────────────────────────────────
// Keyboard + touch input → dispatches to Engine.
// Keys: WASD/Arrows = move | E = interact | I = inventory | L = legend
//       Tab = field diagnostics | Esc = close overlay
(function () {
  class Input {
    constructor(engine) {
      this.engine = engine;
      this._bind();
    }

    _bind() {
      document.addEventListener('keydown', (e) => this._onKey(e));
      this._bindTouchControls();
    }

    _onKey(e) {
      // ── Dialogue open ───────────────────────────────────────────────────────
      if (!this.engine.ui._dialogueOverlay.classList.contains('hidden')) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 9) {
          e.preventDefault();
          this.engine.dialogue.choose(num - 1);
          return;
        }
        if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
          e.preventDefault();
          this.engine.dialogue.advance();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          this.engine.dialogue.close();
          return;
        }
        return;
      }

      // ── Inventory open ──────────────────────────────────────────────────────
      if (!this.engine.ui._inventoryOverlay.classList.contains('hidden')) {
        if (e.key === 'Escape' || e.key === 'i' || e.key === 'I') {
          e.preventDefault();
          this.engine.ui.hideInventory();
        }
        return;
      }

      // ── Diagnose open ────────────────────────────────────────────────────────
      if (this.engine.ui.isDiagnoseOpen()) {
        if (e.key === 'Escape' || e.key === 'Tab') {
          e.preventDefault();
          this.engine.ui.hideDiagnose();
        }
        return;
      }

      // ── Tab = field diagnostics ──────────────────────────────────────────────
      if (e.key === 'Tab') {
        e.preventDefault();
        this.engine.openDiagnose();
        return;
      }

      // ── L = legend toggle ────────────────────────────────────────────────────
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        this.engine.ui.toggleLegend();
        return;
      }

      // ── Legend open — Esc closes ─────────────────────────────────────────────
      if (this.engine.ui._legendOverlay &&
          !this.engine.ui._legendOverlay.classList.contains('hidden')) {
        if (e.key === 'Escape') {
          e.preventDefault();
          this.engine.ui.toggleLegend();
        }
        return;
      }

      // ── Inspect mode active ─────────────────────────────────────────────────
      if (this.engine.inspectMode) {
        switch (e.key) {
          case 'x': case 'X': case 'Escape':
            e.preventDefault();
            this.engine.toggleInspectMode();
            return;
          // E exits inspect mode (engine.interact() handles this)
          case 'e': case 'E': case 'Enter':
            e.preventDefault();
            this.engine.interact();
            return;
          case 'w': case 'W': case 'ArrowUp':    e.preventDefault(); this.engine.moveInspectCursor( 0, -1); return;
          case 's': case 'S': case 'ArrowDown':  e.preventDefault(); this.engine.moveInspectCursor( 0,  1); return;
          case 'a': case 'A': case 'ArrowLeft':  e.preventDefault(); this.engine.moveInspectCursor(-1,  0); return;
          case 'd': case 'D': case 'ArrowRight': e.preventDefault(); this.engine.moveInspectCursor( 1,  0); return;
        }
        return;  // all other keys blocked in inspect mode
      }

      // ── Movement + actions ──────────────────────────────────────────────────
      switch (e.key) {
        case 'w': case 'W': case 'ArrowUp':    e.preventDefault(); this.engine.move( 0, -1); break;
        case 's': case 'S': case 'ArrowDown':  e.preventDefault(); this.engine.move( 0,  1); break;
        case 'a': case 'A': case 'ArrowLeft':  e.preventDefault(); this.engine.move(-1,  0); break;
        case 'd': case 'D': case 'ArrowRight': e.preventDefault(); this.engine.move( 1,  0); break;
        case 'e': case 'E':                    e.preventDefault(); this.engine.interact();    break;
        case 'i': case 'I':                    e.preventDefault(); this.engine.openInventory(); break;
        case 'x': case 'X':                    e.preventDefault(); this.engine.toggleInspectMode(); break;
      }
    }

    _bindTouchControls() {
      const bind = (id, action) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('touchstart', (e) => { e.preventDefault(); action(); }, { passive: false });
        el.addEventListener('mousedown',  (e) => { e.preventDefault(); action(); });
      };
      bind('btn-w', () => this.engine.move( 0, -1));
      bind('btn-s', () => this.engine.move( 0,  1));
      bind('btn-a', () => this.engine.move(-1,  0));
      bind('btn-d', () => this.engine.move( 1,  0));
      bind('btn-e', () => this.engine.interact());
      bind('btn-i', () => this.engine.openInventory());
    }
  }

  window.SV.Input = Input;
})();
