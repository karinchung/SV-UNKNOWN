'use strict';
// ─── ui.js ───────────────────────────────────────────────────────────────────
// UIManager: drives all HTML panels.
//   HUD sidebar — unit analysis, systems bars, contracts, log
//   Dialogue overlay — NPC portrait + conversation
//   Inventory screen
//   Name + pronoun entry screen
//   Legend overlay (L key)
//   Note / lore full-screen overlay
//
// DESIGN: IDENTITY_DRIFT is intentionally removed from HUD.
//         It only manifests as log-entry color shift. Never display it directly.
(function () {
  const { COLORS, SETTINGS, FLAG, Player } = window.SV;

  // Bar helper: filled/empty blocks with label
  function bar(val, max, width, color, label) {
    const filled = Math.max(0, Math.round((Math.min(val, max) / max) * width));
    const empty  = width - filled;
    const blocks = '■'.repeat(filled) + '□'.repeat(empty);
    const pct    = Math.round((Math.min(val, max) / max) * 100);
    return `<span class="bar-label">${label}</span> <span style="color:${color}">${blocks}</span> <span class="bar-pct">${pct}%</span>`;
  }

  class UIManager {
    constructor() {
      const $ = (id) => document.getElementById(id);

      this._hud         = $('hud');
      this._callsign    = $('hud-callsign');
      this._hpBar       = $('hud-hp');
      this._cargoBar    = $('hud-cargo');
      this._creditLine  = $('hud-credits');
      this._levelName   = $('hud-level');
      this._logList     = $('hud-log');
      this._questList   = $('hud-quests');
      this._earthPanel  = $('hud-earth');       // Earth hazards — shown only on Earth

      this._dialogueOverlay  = $('dialogue-overlay');
      this._dlgPortrait      = $('dlg-portrait');
      this._dlgReadouts      = $('dlg-readouts');
      this._dlgNpcName       = $('dlg-npc-name');
      this._dlgNpcTitle      = $('dlg-npc-title');
      this._dlgText          = $('dlg-text');
      this._dlgChoices       = $('dlg-choices');

      this._inventoryOverlay = $('inventory-overlay');
      this._invList          = $('inv-list');
      this._invDesc          = $('inv-desc');

      this._noteOverlay      = $('note-overlay');
      this._noteText         = $('note-text');

      this._nameScreen       = $('name-screen');
      this._nameInput        = $('name-input');
      this._nameSubmit       = $('name-submit');
      this._pronounBtns      = document.querySelectorAll('.pronoun-btn');

      this._legendOverlay    = $('legend-overlay');

      this._departureOverlay = $('departure-overlay');
      this._depBody          = $('dep-body');
      this._depConfirmBtn    = $('dep-confirm');
      this._depCancelBtn     = $('dep-cancel');

      this._podLaunch        = $('pod-launch');
      this._podLaunchText    = $('pod-launch-text');

      this._diagnoseOverlay  = $('diagnose-overlay');
      this._diagContent      = $('diag-content');

      this._canvasWrap       = $('canvas-wrap');
      this._bumpTimer        = null;

      this._hintPanel        = $('hud-hint');
      this._hintText         = $('hud-hint-text');

      this._msgFlash         = $('msg-flash');

      // Clickable HUD shortcut buttons (mouse-accessible alternatives to I/L keys)
      const btnInv = $('hud-btn-inventory');
      const btnLeg = $('hud-btn-legend');
      if (btnInv) btnInv.addEventListener('click', () => {
        if (!this._inventoryOverlay.classList.contains('hidden')) this.hideInventory();
        // inventory open is handled by engine via openInventory(); trigger a synthetic key
        else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', bubbles: true }));
      });
      if (btnLeg) btnLeg.addEventListener('click', () => this.toggleLegend());
      this._flashTimer       = null;

      this._selectedPronoun  = { subj: 'they', obj: 'them', poss: 'their' };
    }

    // ── Name + pronoun entry ─────────────────────────────────────────────────
    showNameScreen(onSubmit) {
      this._nameScreen.classList.remove('hidden');
      this._nameInput.focus();

      // Pronoun buttons
      this._pronounBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          this._pronounBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this._selectedPronoun = {
            subj: btn.dataset.subj,
            obj:  btn.dataset.obj,
            poss: btn.dataset.poss,
          };
        });
      });

      const submit = () => {
        const raw  = (this._nameInput.value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
        const name = raw || 'UNKNOWN';
        this._nameScreen.classList.add('hidden');
        onSubmit(name, this._selectedPronoun);
      };

      this._nameSubmit.onclick     = submit;
      this._nameInput.onkeydown    = (e) => { if (e.key === 'Enter') submit(); };
    }

    // ── HUD ──────────────────────────────────────────────────────────────────
    updateHUD(player, flags, world, quests, engine) {
      const level   = world.currentLevel();
      const levelId = level ? level.id : null;

      this._callsign.textContent   = player.callsign;
      this._levelName.textContent  = level ? level.name : '—';
      this._creditLine.textContent = `CR: ${player.credits}`;

      this._hpBar.innerHTML    = bar(player.hp, player.maxHp, 8, COLORS.terminal, 'INTEG');
      this._cargoBar.innerHTML = bar(player.inventory.length, player.maxItems, 8, COLORS.item, 'CARGO');

      // Log entries — color shifts with IDENTITY_DRIFT; that's the only tell
      this._logList.innerHTML = '';
      for (const entry of player.getRecentLog(6)) {
        const li       = document.createElement('li');
        li.textContent = entry.text;
        li.style.color = Player.logColor(entry);
        this._logList.appendChild(li);
      }

      // Active contracts
      this._questList.innerHTML = '';
      if (quests) {
        for (const line of quests.getActiveDisplay()) {
          const li = document.createElement('li');
          li.textContent = line;
          this._questList.appendChild(li);
        }
      }

      // Earth Systems panel — only on the Earth level
      if (this._earthPanel) {
        if (levelId === 'earth') {
          this._earthPanel.classList.remove('hidden');
          this._updateEarthPanel(flags);
        } else {
          this._earthPanel.classList.add('hidden');
        }
      }

      // Contextual hint: show when NPC or interactable is directly in front
      this._updateProximityHint(player, world);
      
      // Inspect mode info
      this._updateInspectInfo(engine);
    }

    _updateInspectInfo(engine) {
      if (!this._hintPanel || !this._hintText) return;
      
      if (engine && engine.inspectMode) {
        const info = engine.getInspectInfo();
        if (info && info.length > 0) {
          this._hintPanel.style.display = '';
          this._hintText.textContent = `[X] Inspect Mode | ${info.join(' | ')}`;
        } else {
          this._hintPanel.style.display = '';
          this._hintText.textContent = '[X] Inspect Mode | Empty space';
        }
      }
    }

    _updateProximityHint(player, world) {
      if (!this._hintPanel || !this._hintText) return;

      // Mirror engine.interact() scan order: facing tile first, then all 4 adjacent.
      const fx = player.x + player.facing.dx;
      const fy = player.y + player.facing.dy;
      let hint = this._getHintAt(fx, fy, world);

      if (!hint) {
        for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
          const nx = player.x + dx;
          const ny = player.y + dy;
          if (nx === fx && ny === fy) continue;
          hint = this._getHintAt(nx, ny, world);
          if (hint) break;
        }
      }

      if (hint) {
        this._hintPanel.style.display = '';
        this._hintText.textContent    = hint;
      } else {
        this._hintPanel.style.display = 'none';
      }
    }

    _getHintAt(tx, ty, world) {
      const entity = world.getEntityAt(tx, ty);
      const tile   = world.getTile(tx, ty);
      if (entity && entity.type === 'npc') {
        return `[ E ] Talk to ${entity.npcData ? entity.npcData.name : 'unit'}`;
      }
      if (tile && tile.type === 'interact') {
        const labels = { quest_board: 'Contract Board', terminal: 'Station Terminal', vending: 'Dispensary Unit', medbay: 'Repair Bay (25 CR)' };
        return `[ E ] Use ${labels[tile.interactId] || tile.interactId}`;
      }
      if (tile && tile.type === 'container') return '[ E ] Open container';
      if (tile && tile.type === 'exit') {
        return tile.char === '>' ? '[ E ] Descend to Earth' : '[ E ] Return to station';
      }
      return null;
    }

    _updateEarthPanel(flags) {
      const F   = FLAG;
      const MAX = 100;
      const rows = [
        { label: 'RUST',   key: F.RUST_ACCUMULATION,   color: COLORS.danger    },
        { label: 'CRAWL',  key: F.CRAWL_SATURATION,    color: COLORS.nature    },
        { label: 'VINE',   key: F.VINE_ENTANGLEMENT,   color: COLORS.natureDim },
        { label: 'LOAD',   key: F.STRUCTURAL_LOAD,     color: COLORS.mountain  },
        { label: 'SENSOR', key: F.SENSOR_INTERFERENCE, color: COLORS.driftHigh },
        { label: 'HEAT',   key: F.HEAT_STRESS,         color: COLORS.hostile   },
      ];
      const el = this._earthPanel.querySelector('.earth-bars');
      el.innerHTML = rows
        .filter(r => flags.get(r.key) > 0)
        .map(r => `<div>${bar(flags.get(r.key), MAX, 6, r.color, r.label)}</div>`)
        .join('') || '<div class="bar-label" style="opacity:0.5">Systems nominal.</div>';
    }

    // ── Wall bump feedback ───────────────────────────────────────────────────
    bumpFeedback(dx, dy) {
      if (!this._canvasWrap) return;
      // Clear any active bump class
      this._canvasWrap.classList.remove('bump-n','bump-s','bump-e','bump-w');
      // Force reflow so animation restarts
      void this._canvasWrap.offsetWidth;
      const cls = dx > 0 ? 'bump-e' : dx < 0 ? 'bump-w' : dy > 0 ? 'bump-s' : 'bump-n';
      this._canvasWrap.classList.add(cls);
      clearTimeout(this._bumpTimer);
      this._bumpTimer = setTimeout(() => this._canvasWrap.classList.remove(cls), 160);
    }

    // ── Departure confirm ────────────────────────────────────────────────────
    showDepartureConfirm(flags, destination, onConfirm, onCancel) {
      if (!this._departureOverlay) return;
      const rust   = flags.get(FLAG.RUST_ACCUMULATION) || 0;
      const crawl  = flags.get(FLAG.CRAWL_SATURATION)  || 0;
      const drift  = flags.get(FLAG.IDENTITY_DRIFT)    || 0;
      let warning  = `Proceed to ${destination}?`;
      if (destination === 'Station') {
        warning += '\n\nHazard accumulation will reset on station return.';
        if (rust > 50 || crawl > 50) warning = `Proceed to ${destination}?\n\nWARNING: Elevated hazard levels. Decontamination will run on return.`;
        if (drift > 40) warning += '\nIdentity drift: elevated. Pod transit notes are not retained.';
      } else if (destination === 'Earth') {
        warning += '\n\nLaunch sequence will begin. Ensure all systems are nominal.';
      }
      this._depBody.innerHTML = this._esc(warning).replace(/\n/g, '<br>');
      this._departureOverlay.classList.remove('hidden');

      // One-shot listeners
      const confirm = () => { cleanup(); this._departureOverlay.classList.add('hidden'); onConfirm(); };
      const cancel  = () => { cleanup(); this._departureOverlay.classList.add('hidden'); onCancel(); };
      const onKey   = (e) => { if (e.key === 'Escape') cancel(); if (e.key === 'Enter' || e.key === 'y' || e.key === 'Y') confirm(); };

      const cleanup = () => {
        this._depConfirmBtn.removeEventListener('click', confirm);
        this._depCancelBtn.removeEventListener('click', cancel);
        document.removeEventListener('keydown', onKey);
      };

      this._depConfirmBtn.addEventListener('click', confirm);
      this._depCancelBtn.addEventListener('click',  cancel);
      document.addEventListener('keydown', onKey);
    }

    // ── Pod launch sequence ──────────────────────────────────────────────────
    showPodLaunch(flags, onDone) {
      if (!this._podLaunch) { onDone(); return; }
      const drift = flags.get(FLAG.IDENTITY_DRIFT) || 0;

      const lines = [
        'SURVEY CORPS — EXTRACTION PROTOCOL',
        '> Launch sequence initiated.',
        '> Seal confirmed. Atmosphere venting.',
        '> Trajectory calculated: Station Clavius hub.',
        drift > 50
          ? '> Personal log: [RECORD GAP DETECTED]'
          : '> Mission data compressed for uplink.',
        drift > 70
          ? '> Note to self: I have done this before. I know I have done this before.'
          : '> Transit time: 4.2 minutes.',
        '> .',
        '> . .',
        '> Pod away.',
      ];

      this._podLaunchText.innerHTML = '';
      this._podLaunch.classList.remove('hidden');

      let i = 0;
      const next = () => {
        if (i >= lines.length) {
          setTimeout(() => {
            this._podLaunch.classList.add('hidden');
            onDone();
          }, 600);
          return;
        }
        const span  = document.createElement('span');
        span.className = 'launch-line';
        span.style.animationDelay = `${i * 0.08}s`;
        span.textContent = lines[i];
        this._podLaunchText.appendChild(span);
        this._podLaunchText.appendChild(document.createElement('br'));
        i++;
        setTimeout(next, 420);
      };
      next();
    }

    // ── Diagnose overlay ─────────────────────────────────────────────────────
    showDiagnose(player, flags, world) {
      if (!this._diagnoseOverlay) return;
      const level   = world.currentLevel();
      const levelId = level ? level.id : null;
      const onEarth = levelId === 'earth';

      let html = '';

      // — Unit status —
      html += '<div class="diag-section">';
      html += '<div class="diag-section-title">Unit Status</div>';
      html += '<div class="diag-row">';
      html += `<span class="diag-label">Integrity</span>${this._diagBar(player.hp, player.maxHp, 12, COLORS.terminal)}<span>${player.hp}/${player.maxHp}</span>`;
      html += '</div><div class="diag-row">';
      html += `<span class="diag-label">Cargo</span>${this._diagBar(player.inventory.length, player.maxItems, 12, COLORS.item)}<span>${player.inventory.length}/${player.maxItems}</span>`;
      html += '</div><div class="diag-row">';
      html += `<span class="diag-label">Credits</span><span style="color:${COLORS.item}">${player.credits} CR</span><span></span>`;
      html += '</div></div>';

      // — Location —
      html += '<div class="diag-section">';
      html += '<div class="diag-section-title">Location</div>';
      html += '<div class="diag-row">';
      html += `<span class="diag-label">Zone</span><span style="color:var(--text-bright)">${level ? level.name : '—'}</span><span></span>`;
      html += '</div><div class="diag-row">';
      html += `<span class="diag-label">Coordinates</span><span>${player.x}, ${player.y}</span><span></span>`;
      html += '</div></div>';

      // — Earth hazards (only on Earth) —
      if (onEarth) {
        html += '<div class="diag-section">';
        html += '<div class="diag-section-title" style="color:var(--nature)">Earth Hazards</div>';
        const hazards = [
          { label: 'Rust Accum.',  key: FLAG.RUST_ACCUMULATION,   color: COLORS.danger    },
          { label: 'Crawl Satur.', key: FLAG.CRAWL_SATURATION,    color: COLORS.nature    },
          { label: 'Vine Entangle',key: FLAG.VINE_ENTANGLEMENT,   color: COLORS.natureDim },
          { label: 'Sensor Intrf.',key: FLAG.SENSOR_INTERFERENCE, color: COLORS.driftHigh },
          { label: 'Heat Stress',  key: FLAG.HEAT_STRESS,         color: COLORS.hostile   },
        ];
        for (const h of hazards) {
          const val = flags.get(h.key) || 0;
          if (val > 0) {
            html += '<div class="diag-row">';
            html += `<span class="diag-label">${this._esc(h.label)}</span>${this._diagBar(val, 100, 12, h.color)}<span style="color:${h.color}">${val}%</span>`;
            html += '</div>';
          }
        }
        const val = flags.get(FLAG.RUST_ACCUMULATION) || 0;
        if (val === 0 && (flags.get(FLAG.CRAWL_SATURATION)||0) === 0) {
          html += '<div style="color:var(--text-dim);font-size:10px;margin-top:4px">Systems nominal.</div>';
        }
        html += '</div>';
      }

      // — Identity drift hint (deliberately vague) —
      const drift = flags.get(FLAG.IDENTITY_DRIFT) || 0;
      if (drift > 15) {
        html += '<div class="diag-section">';
        html += '<div class="diag-section-title">Anomaly Log</div>';
        const driftColor = drift < 40 ? COLORS.driftLow : COLORS.driftHigh;
        const driftText  = drift < 30 ? 'Minor inconsistencies in memory index.'
                         : drift < 55 ? 'Processing anomalies detected. Non-critical.'
                         : drift < 75 ? 'Memory fragmentation elevated. Recommend review.'
                                      : 'Critical identity drift. Pattern integrity compromised.';
        html += `<div style="font-size:11px;color:${driftColor};line-height:1.7">${this._esc(driftText)}</div>`;
        html += '</div>';
      }

      this._diagContent.innerHTML = html;
      this._diagnoseOverlay.classList.remove('hidden');
    }

    hideDiagnose() {
      if (this._diagnoseOverlay) this._diagnoseOverlay.classList.add('hidden');
    }

    isDiagnoseOpen() {
      return this._diagnoseOverlay && !this._diagnoseOverlay.classList.contains('hidden');
    }

    _diagBar(val, max, width, color) {
      const filled = Math.max(0, Math.round((Math.min(val, max) / max) * width));
      const empty  = width - filled;
      return `<span style="color:${color};letter-spacing:0.04em">${'■'.repeat(filled)}<span style="opacity:0.25">${'■'.repeat(empty)}</span></span>`;
    }

    // ── Legend overlay ───────────────────────────────────────────────────────
    toggleLegend() {
      if (this._legendOverlay) {
        this._legendOverlay.classList.toggle('hidden');
        if (!this._legendOverlay.classList.contains('hidden')) {
          this._colorCodeLegend();
        }
      }
    }

    _colorCodeLegend() {
      if (!this._legendOverlay) return;
      const C = window.SV.COLORS;
      const colorMap = {
        '.': C.floor,
        '#': C.wall,
        '+': C.item,
        '~': C.waterSurf,
        '=': C.mountain,
        '^': C.mountain,
        '"': C.grass,
        ',': C.rubble,
        'T': C.nature,
        '%': C.natureDim,
        'Q': C.item,
        '0': C.terminal,
        'V': C.uiDim,
        'H': C.terminal,
        '[': C.panelBorder,
        'M': C.driftHigh,
        '>': C.terminalBright,
        '<': C.terminalBright,
        '@': C.player,
        '!': C.npc,
        '*': C.rubble,
      };
      
      const chars = this._legendOverlay.querySelectorAll('.legend-char');
      chars.forEach(charEl => {
        const char = charEl.textContent.trim();
        if (colorMap[char]) {
          charEl.style.color = colorMap[char];
        }
      });
    }

    // ── Dialogue overlay ─────────────────────────────────────────────────────
    showDialogue(state, onChoice) {
      if (!state) { this.hideDialogue(); return; }
      const { npcData, text, choices } = state;

      if (npcData.portrait) {
        this._dlgPortrait.innerHTML = npcData.portrait
          .map(line => `<div>${this._esc(line)}</div>`).join('');
      } else {
        this._dlgPortrait.innerHTML = '<div class="no-portrait">[ TERMINAL ]</div>';
      }

      if (npcData.readouts && npcData.readouts.length) {
        this._dlgReadouts.innerHTML = npcData.readouts
          .map(r => `<div class="readout"><span class="r-label">${this._esc(r.label)}</span><span class="r-value">${this._esc(r.value)}</span></div>`)
          .join('');
      } else {
        this._dlgReadouts.innerHTML = '';
      }

      this._dlgNpcName.textContent  = npcData.name  || '';
      this._dlgNpcTitle.textContent = npcData.title || '';
      this._dlgText.innerHTML       = this._esc(text).replace(/\n/g, '<br>');

      this._dlgChoices.innerHTML = '';
      if (choices && choices.length > 0) {
        choices.forEach((c, i) => {
          const btn       = document.createElement('button');
          btn.className   = 'dlg-choice';
          btn.textContent = `[${i + 1}] ${c.text}`;
          btn.onclick     = () => onChoice(i);
          this._dlgChoices.appendChild(btn);
        });
      } else {
        const btn       = document.createElement('button');
        btn.className   = 'dlg-choice';
        btn.textContent = '[E] Continue';
        btn.onclick     = () => onChoice(-1);
        this._dlgChoices.appendChild(btn);
      }

      this._dialogueOverlay.classList.remove('hidden');
    }

    hideDialogue() {
      this._dialogueOverlay.classList.add('hidden');
    }

    // ── Inventory overlay ────────────────────────────────────────────────────
    showInventory(player, onUse, onDrop, onClose) {
      this._inventoryOverlay.classList.remove('hidden');
      this._renderInvList(player, onUse, onDrop);
    }

    _renderInvList(player, onUse, onDrop) {
      this._invList.innerHTML  = '';
      this._invDesc.textContent = '';
      if (player.inventory.length === 0) {
        this._invList.innerHTML = '<li class="inv-empty">No items collected. Find containers and samples on Earth.</li>';
        return;
      }
      player.inventory.forEach((item, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<span style="color:${item.color}">${item.char}</span> ${this._esc(item.name)}${item.qty > 1 ? ` ×${item.qty}` : ''}`;
        li.className = 'inv-item';
        li.tabIndex  = 0;
        li.onclick   = () => {
          this._invDesc.textContent = item.desc || '';
          this._invList.querySelectorAll('.inv-item').forEach(el => el.classList.remove('selected'));
          li.classList.add('selected');
        };
        this._invList.appendChild(li);
      });
    }

    hideInventory() {
      this._inventoryOverlay.classList.add('hidden');
    }

    // ── Note / lore screen ───────────────────────────────────────────────────
    showNote(text, onClose) {
      this._noteText.innerHTML = this._esc(text).replace(/\n/g, '<br>');
      this._noteOverlay.classList.remove('hidden');
      const close = () => {
        this._noteOverlay.classList.add('hidden');
        if (onClose) onClose();
      };
      this._noteOverlay.onclick   = close;
      this._noteOverlay.onkeydown = (e) => { if (e.key === 'Enter' || e.key === 'Escape') close(); };
      this._noteOverlay.focus();
    }

    // ── Flash message ────────────────────────────────────────────────────────
    flash(msg, color) {
      this._msgFlash.textContent = msg;
      this._msgFlash.style.color = color || COLORS.uiBright;
      this._msgFlash.classList.remove('hidden', 'fade-out');
      clearTimeout(this._flashTimer);
      this._flashTimer = setTimeout(() => this._msgFlash.classList.add('fade-out'), 2200);
    }

    // ── Utils ────────────────────────────────────────────────────────────────
    _esc(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  }

  window.SV.UIManager = UIManager;
})();
