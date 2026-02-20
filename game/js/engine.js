'use strict';
// ─── engine.js ───────────────────────────────────────────────────────────────
// Engine: coordinates all systems. Single source of truth for game state.
//
// Init flow:
//   new Engine().init()
//   → fetch story.ink.json
//   → dialogue.initStory(json)
//   → ui.showNameScreen(name, pronouns callback)
//   → _startGame(name, pronouns)
//   → rAF loop begins
//
// Dialogue routing (Ink knots):
//   NPCs:          CASIMIR→'casimir', CLAVIUS→'clavius'/'clavius_turnin',
//                  BRECHT→'brecht'/'brecht_turnin', MERCY7→'mercy7',
//                  VOSS→'voss', DARIUSZ→'dariusz'
//   Interactables: 'quest_board'→'quest_board', 'terminal'→'terminal_generic',
//                  'vending'→'vending'
//   Linearity:     Brecht requires met_casimir. Quest board requires met_casimir.
(function () {
  const {
    COLORS, SETTINGS, FLAG,
    FlagSystem, Player, World, Renderer,
    UIManager, Input, InkDialogue, QuestSystem,
    ITEM_DATA, NPC_DATA,
  } = window.SV;

  // ── Routing tables ──────────────────────────────────────────────────────────
  const NPC_KNOTS = {
    CASIMIR:  'casimir',
    CLAVIUS:  'clavius',
    BRECHT:   'brecht',
    MERCY7:   'mercy7',
    VOSS:     'voss',
    DARIUSZ:  'dariusz',
  };

  const TURNIN_KNOTS = {
    CLAVIUS: 'clavius_turnin',
    BRECHT:  'brecht_turnin',
  };

  const INTERACTABLE_KNOTS = {
    quest_board: 'quest_board',
    terminal:    'terminal_generic',
    vending:     'vending',
  };

  // Hazard thresholds that trigger log messages (per hazard)
  const HAZARD_THRESHOLDS = {
    [FLAG.RUST_ACCUMULATION]: [
      { at: 25, msg: 'Surface corrosion detected. Chassis integrity nominal.' },
      { at: 50, msg: 'Rust accumulation elevated. Recommend decontamination.' },
      { at: 75, msg: 'Chassis corrosion critical. Return to station.' },
    ],
    [FLAG.CRAWL_SATURATION]: [
      { at: 30, msg: 'Organic residue detected. Standard exposure levels.' },
      { at: 60, msg: 'Crawl saturation elevated. Unusual adhesion noted.' },
      { at: 85, msg: 'Saturation critical. Vine response increasing.' },
    ],
    [FLAG.VINE_ENTANGLEMENT]: [
      { at: 40, msg: 'Vine tendrils detected on chassis. Non-critical.' },
      { at: 70, msg: 'Vine entanglement significant. Motor response degraded.' },
      { at: 90, msg: 'Vine entanglement critical. Return to decontamination.' },
    ],
  };

  class Engine {
    constructor() {
      this.flags    = new FlagSystem();
      this.world    = new World();
      this.player   = null;
      this.renderer = null;
      this.ui       = null;
      this.input    = null;
      this.dialogue = null;
      this.quests   = null;

      this.turn     = 0;
      this._dirty   = true;
      this._raf     = null;

      // FOV state — persists explored tiles per level ID
      this._explored   = new Map();   // levelId → Set<"x,y">
      this._fov        = null;        // { visible: Set, explored: Set }

      // Hazard thresholds already triggered (avoid repeated messages)
      this._hazardTriggered = new Map();

      // Departure state — set when player steps on Earth's < exit
      this._pendingDeparture = null;
    }

    // ── Initialisation ────────────────────────────────────────────────────────
    async init() {
      this.renderer = new Renderer(document.getElementById('game-canvas'));
      this.ui       = new UIManager();

      // Attempt to load Ink story; if unavailable, dialogue falls back gracefully
      let storyJson = null;
      try {
        const resp = await fetch('story.ink.json');
        if (resp.ok) storyJson = await resp.text();
      } catch (e) {
        console.warn('story.ink.json not found — dialogue will be unavailable.');
      }

      this.dialogue = new InkDialogue(this.flags, null, this);  // player set in _startGame

      if (storyJson) {
        try { this.dialogue.initStory(storyJson); }
        catch (e) { console.error('Ink story init failed:', e); }
      }

      this.dialogue.onUpdate = (state) => {
        if (state) {
          this.ui.showDialogue(state, (idx) => this._onDialogueChoice(idx));
        } else {
          this.ui.hideDialogue();
          this._dirty = true;
        }
      };

      // Inspect mode state
      this.inspectMode = false;
      this.inspectX = 0;
      this.inspectY = 0;

      this.ui.showNameScreen((name, pronouns) => this._startGame(name, pronouns));
    }

    _startGame(name, pronouns) {
      this.player          = new Player(name);
      this.dialogue.setPlayer(this.player);
      this.player.subj     = (pronouns && pronouns.subj) || 'they';
      this.player.obj      = (pronouns && pronouns.obj)  || 'them';
      this.player.poss     = (pronouns && pronouns.poss) || 'their';
      this.dialogue.player = this.player;

      this.quests = new QuestSystem(this.flags, this.player);
      this.input  = new Input(this);

      const level = this.world.loadLevel('station', this.flags);
      const start = this.world.getPlayerStart();
      this.player.x       = start.x;
      this.player.y       = start.y;
      this.player.facing  = { dx: 0, dy: 1 };  // face south — Casimir is one tile south

      // Wire Earth's '<' return exit to the station player-start position
      const earthDef = window.SV.LEVELS['earth'];
      if (earthDef && earthDef.exits && earthDef.exits['<']) {
        earthDef.exits['<'].toPos = { x: start.x, y: start.y };
      }

      this._computeFOV();
      this.player.addLog('Survey mission log active. Station Clavius — docking hub.', this.flags);
      this.player.addLog('[ E ] interact  [ I ] inventory  [ L ] legend  [ Tab ] diagnostics', this.flags);
      this._startRenderLoop();
    }

    // ── Render loop ───────────────────────────────────────────────────────────
    _startRenderLoop() {
      const loop = () => {
        if (this._dirty && this.player) {
          this.renderer.render(this.world, this.player, this.flags, this._fov, this);
          this.ui.updateHUD(this.player, this.flags, this.world, this.quests, this);
          this._dirty = false;
        }
        this._raf = requestAnimationFrame(loop);
      };
      this._raf = requestAnimationFrame(loop);
    }

    // ── FOV ───────────────────────────────────────────────────────────────────
    _computeFOV() {
      const level = this.world.currentLevel();
      if (!level || typeof ROT === 'undefined') { this._fov = null; return; }

      // Get or init explored set for this level
      if (!this._explored.has(level.id)) {
        this._explored.set(level.id, new Set());
      }
      const explored = this._explored.get(level.id);
      const visible  = new Set();

      const isTransparent = (x, y) => {
        const tile = level.getTile(x, y);
        return tile && !tile.opaque;
      };

      const fovComputer = new ROT.FOV.PreciseShadowcasting(isTransparent);
      fovComputer.compute(this.player.x, this.player.y, SETTINGS.FOV_RADIUS, (x, y) => {
        const key = `${x},${y}`;
        visible.add(key);
        explored.add(key);
      });

      this._fov = { visible, explored };
    }

    // ── Player actions ────────────────────────────────────────────────────────
    move(dx, dy) {
      if (this.dialogue.active) return;

      const nx = this.player.x + dx;
      const ny = this.player.y + dy;
      this.player.facing = { dx, dy };

      if (!this.world.isPassable(nx, ny)) {
        // Wall bump: brief CSS nudge animation in the direction player tried to move
        this.ui.bumpFeedback(dx, dy);
        this._dirty = true;
        return;
      }

      this.player.x = nx;
      this.player.y = ny;

      const tile = this.world.getTile(nx, ny);

      if (tile.type === 'exit')        this._handleExit(tile);
      if (tile.type === 'pickup')      this._handlePickup(tile, nx, ny);
      if (tile.type === 'shallow_water') this._handleShallowWater();

      const entity = this.world.getEntityAt(nx, ny);
      if (entity && entity.type === 'item') this._pickupEntity(entity);

      this._checkSurveyZone(nx, ny);
      this._checkEarthHazards(nx, ny);
      this._computeFOV();

      this.turn++;
      this.quests.checkCompletions();
      this._dirty = true;
    }

    interact() {
      if (this.dialogue.active) return;
      if (this.inspectMode) {
        this.toggleInspectMode();
        return;
      }

      // Try facing tile first, then scan all 4 adjacent tiles.
      // This means you don't need to face an NPC exactly — being adjacent is enough.
      const fx = this.player.x + this.player.facing.dx;
      const fy = this.player.y + this.player.facing.dy;
      if (this._tryInteractAt(fx, fy)) return;

      for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
        const nx = this.player.x + dx;
        const ny = this.player.y + dy;
        if (nx === fx && ny === fy) continue;  // already tried
        if (this._tryInteractAt(nx, ny)) {
          this.player.facing = { dx, dy };  // auto-face toward what we interacted with
          this._dirty = true;
          return;
        }
      }
      
      // No interaction found - provide feedback
      this.ui.flash('Nothing to interact with here.', COLORS.uiDim);
    }

    // Returns true if an interaction was triggered at (tx, ty).
    _tryInteractAt(tx, ty) {
      const entity = this.world.getEntityAt(tx, ty);
      if (entity) {
        if (entity.type === 'npc')  { 
          this._startNPCDialogue(entity); 
          return true; 
        }
        if (entity.type === 'item') { 
          this._pickupEntity(entity);     
          return true; 
        }
      }
      const tile = this.world.getTile(tx, ty);
      if (tile.type === 'interact')  { 
        this._startInteractable(tile.interactId); 
        return true; 
      }
      if (tile.type === 'exit')      { 
        this._handleExit(tile);                   
        return true; 
      }
      if (tile.type === 'container') { 
        this._openContainer(tx, ty);              
        return true; 
      }
      // Try to clear terrain if player has the right item
      if (tile.type === 'terrain' && tile.clearable) {
        this._tryClearTerrain(tx, ty, tile);
        return true;
      }
      return false;
    }

    openDiagnose() {
      if (this.dialogue.active) return;
      this.ui.showDiagnose(this.player, this.flags, this.world);
    }

    openInventory() {
      if (this.dialogue.active) return;
      this.ui.showInventory(
        this.player,
        (idx) => {
          const msg = this.player.useItem(idx, this.flags, this);
          if (msg) { this.player.addLog(msg, this.flags); this.ui.flash(msg); this._dirty = true; }
        },
        () => { /* drop — future */ },
        () => { this.ui.hideInventory(); }
      );
    }

    // ── Dialogue callback ─────────────────────────────────────────────────────
    _onDialogueChoice(idx) {
      if (idx === -1) { this.dialogue.advance(); }
      else            { this.dialogue.choose(idx); }
      this._dirty = true;
    }

    // ── NPC dialogue ──────────────────────────────────────────────────────────
    _startNPCDialogue(entity) {
      const id = entity.id;

      // Linearity gate: Brecht requires having met Casimir first
      if (id === 'BRECHT' && !this.flags.has(FLAG.MET_CASIMIR)) {
        this.ui.flash('Unit watching you. Not the time.', COLORS.uiDim);
        return;
      }

      // Check for quest turn-in first
      if (TURNIN_KNOTS[id] && this.quests.getTurnIn(id)) {
        this.dialogue.startKnot(TURNIN_KNOTS[id]);
        this._dirty = true;
        return;
      }

      const knot = NPC_KNOTS[id];
      if (!knot) { 
        console.warn('No knot for NPC:', id); 
        this.ui.flash(`Cannot interact with ${id}`, COLORS.uiDim);
        return; 
      }
      
      if (!this.dialogue.story) {
        console.warn('Ink story not loaded — showing portrait fallback for', id);
        // Graceful fallback: show NPC portrait even without ink
        const npcData = NPC_DATA[id] || { name: id, title: '', portrait: null, readouts: [] };
        this.dialogue.active = true;
        if (this.dialogue.onUpdate) {
          this.dialogue.onUpdate({
            npcData,
            text: '[Comms offline — dialogue system unavailable]\n\nCheck browser console for errors.',
            choices: [],
          });
        }
        this._dirty = true;
        return;
      }

      this.dialogue.startKnot(knot);
      this._dirty = true;
    }

    // ── Interactable tiles ────────────────────────────────────────────────────
    _startInteractable(interactId) {
      if (interactId === 'medbay') { this._useMedbay(); return; }
      const knot = INTERACTABLE_KNOTS[interactId];
      if (!knot) { console.warn('No knot for interactable:', interactId); return; }
      this.dialogue.startKnot(knot);
      this._dirty = true;
    }

    // ── Medbay repair station ────────────────────────────────────────────────
    // Costs 25 CR. Restores full HP. Clears any residual hazards (since you're
    // on the station, Earth hazards reset on arrival — medbay mainly covers HP).
    _useMedbay() {
      const COST = 25;
      if (this.player.hp >= this.player.maxHp) {
        this.ui.flash('REPAIR BAY — systems nominal. No maintenance required.', COLORS.terminal);
        return;
      }
      if (this.player.credits < COST) {
        this.ui.flash(`REPAIR BAY — insufficient credits. Requires ${COST} CR.`, COLORS.danger);
        return;
      }
      const restored = this.player.maxHp - this.player.hp;
      this.player.credits -= COST;
      this.player.hp       = this.player.maxHp;
      this.player.addLog(`Repair bay: chassis integrity restored (+${restored}). Deducted ${COST} CR.`, this.flags);
      this.ui.flash(`Repair complete. Integrity restored. (-${COST} CR)`, COLORS.terminal);
      this._dirty = true;
    }

    // ── Level transitions ─────────────────────────────────────────────────────
    _handleExit(tile) {
      const exitData = this.world.getExit(tile.char);
      if (!exitData || !exitData.toLevelId) return;

      const prevLevelId = this.world.currentLevel() ? this.world.currentLevel().id : null;

      // Show confirmation for all exits
      this._pendingDeparture = { exitData, prevLevelId, tile };
      const exitName = exitData.toLevelId === 'earth' ? 'Earth' : 
                      exitData.toLevelId === 'station' ? 'Station' : 
                      exitData.toLevelId;
      this.ui.showDepartureConfirm(
        this.flags,
        exitName,
        () => this._executeDeparture(),   // confirm
        () => { this._pendingDeparture = null; }  // cancel
      );
    }

    _executeDeparture() {
      if (!this._pendingDeparture) return;
      const { exitData, prevLevelId } = this._pendingDeparture;
      this._pendingDeparture = null;
      // Pod launch sequence before transition
      this.ui.showPodLaunch(this.flags, () => {
        this._executeTransition(exitData, prevLevelId);
      });
    }

    _executeTransition(exitData, prevLevelId) {
      this.world.loadLevel(exitData.toLevelId, this.flags);
      this.world.currentLevel().refreshItems(this.flags);

      // Reset Earth hazards when returning to station
      if (exitData.toLevelId === 'station' && prevLevelId === 'earth') {
        this._resetEarthHazards();
      }

      const pos = exitData.toPos || this.world.getPlayerStart();
      this.player.x       = pos.x;
      this.player.y       = pos.y;
      this.player.facing  = { dx: 0, dy: 1 };

      this._computeFOV();

      const levelName = this.world.currentLevel().name;
      this.player.addLog(`Arrived: ${levelName}.`, this.flags);
      this.ui.flash(`> ${levelName}`, COLORS.terminal);
      this._dirty = true;
    }

    // ── Hazard systems ────────────────────────────────────────────────────────
    _handleShallowWater() {
      const prev = this.flags.get(FLAG.RUST_ACCUMULATION);
      this.flags.increment(FLAG.RUST_ACCUMULATION, 3);
      const cur  = this.flags.get(FLAG.RUST_ACCUMULATION);
      this._checkHazardThreshold(FLAG.RUST_ACCUMULATION, prev, cur);

      // At 100 RUST_ACCUMULATION → chassis breach, HP damage, reset to 70
      if (cur >= 100) {
        this.flags.set_counter(FLAG.RUST_ACCUMULATION, 70);
        const dmg = 8;
        this.player.hp = Math.max(1, this.player.hp - dmg);
        this.player.addLog('CHASSIS BREACH — corrosion penetrated internal plating. Integrity lost.', this.flags);
        this.ui.flash('Chassis breach! -8 integrity', COLORS.danger);
        this._hazardTriggered.delete(FLAG.RUST_ACCUMULATION);
        this._dirty = true;
      }
    }

    _checkEarthHazards(x, y) {
      const level = this.world.currentLevel();
      if (!level || level.id !== 'earth') return;

      // CRAWL_SATURATION: +1 every step on Earth (not on bridge tiles)
      const tile = level.getTile(x, y);
      if (tile.type !== 'bridge') {
        const prev = this.flags.get(FLAG.CRAWL_SATURATION);
        this.flags.increment(FLAG.CRAWL_SATURATION, 1);
        const cur  = this.flags.get(FLAG.CRAWL_SATURATION);
        this._checkHazardThreshold(FLAG.CRAWL_SATURATION, prev, cur);

        // At 100 CRAWL_SATURATION → DRIFT +6, reset saturation
        if (cur >= 100) {
          this.flags.set_counter(FLAG.CRAWL_SATURATION, 0);
          this.flags.increment(FLAG.IDENTITY_DRIFT, 6);
          this.player.addLog('Organic saturation peak. Processing cycle interrupted.', this.flags);
          this._hazardTriggered.delete(FLAG.CRAWL_SATURATION);  // reset triggers
        }

        // VINE_ENTANGLEMENT: creeps up in high-saturation areas
        if (this.flags.get(FLAG.CRAWL_SATURATION) >= 40) {
          const vineP = this.flags.get(FLAG.VINE_ENTANGLEMENT);
          this.flags.increment(FLAG.VINE_ENTANGLEMENT, 1);
          const vineC = this.flags.get(FLAG.VINE_ENTANGLEMENT);
          this._checkHazardThreshold(FLAG.VINE_ENTANGLEMENT, vineP, vineC);

          // At 100 VINE_ENTANGLEMENT → motor damage + drift, cap at 100
          if (vineC >= 100) {
            this.flags.set_counter(FLAG.VINE_ENTANGLEMENT, 100);
            const dmg = 5;
            this.player.hp = Math.max(1, this.player.hp - dmg);
            this.flags.increment(FLAG.IDENTITY_DRIFT, 4);
            this.player.addLog('Vine response overwhelming. Motor cortex disrupted. Processing degraded.', this.flags);
            this.ui.flash('Vine critical! -5 integrity, +4 drift', COLORS.nature);
            this._hazardTriggered.delete(FLAG.VINE_ENTANGLEMENT);
            this._dirty = true;
          }
        }
      }
    }

    _checkHazardThreshold(flag, prev, cur) {
      const thresholds = HAZARD_THRESHOLDS[flag];
      if (!thresholds) return;
      for (const { at, msg } of thresholds) {
        if (prev < at && cur >= at) {
          const triggered = this._hazardTriggered.get(flag) || new Set();
          if (!triggered.has(at)) {
            triggered.add(at);
            this._hazardTriggered.set(flag, triggered);
            this.player.addLog(msg, this.flags);
          }
        }
      }
    }

    _resetEarthHazards() {
      const hazards = [
        FLAG.RUST_ACCUMULATION,
        FLAG.CRAWL_SATURATION,
        FLAG.VINE_ENTANGLEMENT,
        FLAG.STRUCTURAL_LOAD,
        FLAG.SENSOR_INTERFERENCE,
        FLAG.HEAT_STRESS,
      ];
      for (const h of hazards) this.flags.set_counter(h, 0);
      this._hazardTriggered.clear();
      this.player.addLog('Decontamination cycle complete. Systems nominal.', this.flags);
    }

    // ── Survey zones ──────────────────────────────────────────────────────────
    _checkSurveyZone(x, y) {
      const level = this.world.currentLevel();
      if (!level || !level.def.surveyZones) return;
      const zone = level.def.surveyZones.find(z => z.x === x && z.y === y);
      if (zone && !zone._visited) {
        zone._visited = true;
        this.flags.increment(FLAG.ZONES_SURVEYED);
        const n     = this.flags.get(FLAG.ZONES_SURVEYED);
        const drift = this.flags.get(FLAG.IDENTITY_DRIFT);
        let msg;
        if (drift < 30) {
          msg = `Zone logged. Survey count: ${n}.`;
        } else if (drift < 60) {
          msg = `Zone logged. ${n} total. I've been here before, I think. Different run, different route.`;
        } else {
          msg = `Zone logged. ${n}. I note this the same way every time. I've started to notice that.`;
        }
        this.player.addLog(msg, this.flags);
        this.ui.flash(`Survey zone logged (${n}/3)`, COLORS.terminal);
        this.quests.checkCompletions();
      }
    }

    // ── Item pickup ───────────────────────────────────────────────────────────
    _pickupEntity(entity) {
      const item = entity.itemData;
      if (!item) return;
      if (!this.player.addItem(item)) { this.ui.flash('Inventory full.', COLORS.danger); return; }
      if (item.onPickup) item.onPickup(this.flags);
      this.world.currentLevel().removeEntity(entity);
      const msg = `Picked up: ${item.name}.`;
      this.player.addLog(msg, this.flags);
      this.ui.flash(msg, COLORS.item);
      
      // Special handling for memory fragments - trigger story dialogue
      if (item.id === 'log_fragment') {
        this._handleMemoryFragment();
      }
      
      this.quests.checkCompletions();
      this._dirty = true;
    }

    _handlePickup(tile, x, y) {
      const item = ITEM_DATA[tile.itemId];
      if (!item) return;
      if (!this.player.addItem(item)) { this.ui.flash('Inventory full.', COLORS.danger); return; }
      if (item.onPickup) item.onPickup(this.flags);
      this.world.currentLevel()._grid[y][x] = window.SV.getTile('FLOOR');
      const msg = `Picked up: ${item.name}.`;
      this.player.addLog(msg, this.flags);
      this.ui.flash(msg, COLORS.item);
      
      // Special handling for memory fragments - trigger story dialogue
      if (item.id === 'log_fragment') {
        this._handleMemoryFragment();
      }
    }

    _handleMemoryFragment() {
      // Track which fragment this is (1-5)
      const count = this.flags.get(FLAG.MEMORY_FRAGMENTS_COLLECTED) + 1;
      this.flags.increment(FLAG.MEMORY_FRAGMENTS_COLLECTED, 1);
      
      // Set the specific fragment flag
      if (count === 1) this.flags.set(FLAG.MEMORY_FRAGMENT_1);
      else if (count === 2) this.flags.set(FLAG.MEMORY_FRAGMENT_2);
      else if (count === 3) this.flags.set(FLAG.MEMORY_FRAGMENT_3);
      else if (count === 4) this.flags.set(FLAG.MEMORY_FRAGMENT_4);
      else if (count === 5) {
        this.flags.set(FLAG.MEMORY_FRAGMENT_5);
        this.flags.set(FLAG.ALL_MEMORY_FRAGMENTS_COLLECTED);
      }
      
      // Update ink story variable to match
      if (this.dialogue && this.dialogue.story) {
        this.dialogue.story.variablesState['memory_fragments_collected'] = count;
      }
      
      // Trigger dialogue to reveal the memory
      this.dialogue.startKnot('memory_fragment');
      this._dirty = true;
    }

    // ── Inspect mode ────────────────────────────────────────────────────────────
    toggleInspectMode() {
      if (this.dialogue.active) return;
      this.inspectMode = !this.inspectMode;
      if (this.inspectMode) {
        // Start at player's facing direction
        this.inspectX = this.player.x + this.player.facing.dx;
        this.inspectY = this.player.y + this.player.facing.dy;
      }
      this._dirty = true;
    }

    moveInspectCursor(dx, dy) {
      if (!this.inspectMode) return;
      const level = this.world.currentLevel();
      if (!level) return;

      const newX = this.inspectX + dx;
      const newY = this.inspectY + dy;

      // Compute viewport origin exactly as renderer._viewport does
      const hw = Math.floor(SETTINGS.VIEWPORT_W / 2);
      const hh = Math.floor(SETTINGS.VIEWPORT_H / 2);
      const ox = Math.max(0, Math.min(this.player.x - hw, level.width  - SETTINGS.VIEWPORT_W));
      const oy = Math.max(0, Math.min(this.player.y - hh, level.height - SETTINGS.VIEWPORT_H));

      // Cursor must stay inside the visible viewport rectangle
      if (newX < ox || newX >= ox + SETTINGS.VIEWPORT_W) return;
      if (newY < oy || newY >= oy + SETTINGS.VIEWPORT_H) return;

      // Also don't let cursor enter unexplored fog
      if (this._fov) {
        const key = `${newX},${newY}`;
        if (!this._fov.visible.has(key) && !this._fov.explored.has(key)) return;
      }

      this.inspectX = newX;
      this.inspectY = newY;
      this._dirty = true;
    }

    getInspectInfo() {
      if (!this.inspectMode) return null;
      const level = this.world.currentLevel();
      if (!level) return null;
      
      const entity = this.world.getEntityAt(this.inspectX, this.inspectY);
      const tile = this.world.getTile(this.inspectX, this.inspectY);
      
      let info = [];
      
      if (entity) {
        if (entity.type === 'npc') {
          info.push(`NPC: ${entity.npcData ? entity.npcData.name : 'Unknown'}`);
          if (entity.npcData && entity.npcData.title) {
            info.push(`Title: ${entity.npcData.title}`);
          }
        } else if (entity.type === 'item') {
          info.push(`Item: ${entity.itemData ? entity.itemData.name : 'Unknown'}`);
          if (entity.itemData && entity.itemData.desc) {
            info.push(entity.itemData.desc);
          }
        }
      }
      
      if (tile) {
        const tileName = tile.type === 'wall' ? 'Wall' :
                        tile.type === 'door' ? 'Door' :
                        tile.type === 'floor' ? 'Floor' :
                        tile.type === 'terrain' ? 'Terrain' :
                        tile.type === 'interact' ? 'Interactable' :
                        tile.type === 'exit' ? 'Exit' :
                        tile.type === 'container' ? 'Container' :
                        tile.type;
        
        info.push(`Tile: ${tileName}`);
        
        if (tile.clearable) {
          info.push(`Requires: ${tile.requiredItem || 'Unknown item'}`);
          if (tile.clearableDesc) {
            info.push(tile.clearableDesc);
          }
        }
        
        if (!tile.passable && !tile.clearable) {
          info.push('Impassable');
        }
      }
      
      return info.length > 0 ? info : ['Empty space'];
    }

    // ── Clearable terrain ───────────────────────────────────────────────────────
    _tryClearTerrain(x, y, tile) {
      if (!tile.clearable) return false;
      
      const requiredItem = tile.requiredItem;
      if (!requiredItem) return false;
      
      // Check if player has the required item
      const hasItem = this.player.inventory.some(item => item.id === requiredItem);
      if (!hasItem) {
        this.ui.flash(`Requires: ${requiredItem}`, COLORS.danger);
        return false;
      }
      
      // Clear the terrain
      const level = this.world.currentLevel();
      if (level && level._grid) {
        level._grid[y][x] = window.SV.getTile('FLOOR');
        this.ui.flash(`Cleared ${tile.clearableDesc || 'terrain'}`, COLORS.terminal);
        this._dirty = true;
        return true;
      }
      
      return false;
    }

    _openContainer(x, y) {
      // ── ONLY non-deterministic code in the game. ──────────────────────────
      // Replace Math.random() with a seeded RNG here for reproducible runs.
      const loot   = ['medpack', 'ration_pack'];
      const itemId = loot[Math.floor(Math.random() * loot.length)];
      const item   = ITEM_DATA[itemId];
      const level  = this.world.currentLevel();
      level._grid[y][x] = window.SV.getTile('FLOOR');  // consumed; can't reopen
      if (Math.random() < 0.35) { this.ui.flash('Container empty.', COLORS.uiDim); this._dirty = true; return; }
      if (!this.player.addItem(item)) { this.ui.flash('Inventory full. Container untouched.', COLORS.danger); return; }
      const msg = `Found: ${item.name}.`;
      this.player.addLog(msg, this.flags);
      this.ui.flash(msg, COLORS.item);
      this._dirty = true;
    }

    // ── Quest system interface ────────────────────────────────────────────────
    acceptQuest(questId) {
      const msg = this.quests.accept(questId);
      this.player.addLog(msg, this.flags);
      this.ui.flash(msg.split('\n')[0], COLORS.item);
      // Refresh Earth items so quest-gated pickups appear
      const earthLevel = this.world._levels['earth'];
      if (earthLevel) earthLevel.refreshItems(this.flags);
      this._dirty = true;
    }

    // Called by ink-dialogue when a # REWARD: id tag fires
    completeQuestReward(questId) {
      const msg = this.quests.giveReward(questId);
      if (msg) {
        this.player.addLog(msg, this.flags);
        this.ui.flash(msg, COLORS.item);
      }
      this._dirty = true;
    }

    giveItem(itemId) {
      const item = ITEM_DATA[itemId];
      if (!item) return;
      this.player.addItem(item);
      this._dirty = true;
    }

    buyItem(itemId, cost) {
      if (this.player.credits < cost) { this.ui.flash('Insufficient credits.', COLORS.danger); return; }
      const item = ITEM_DATA[itemId];
      if (!item) return;
      if (!this.player.addItem(item)) { this.ui.flash('Inventory full.', COLORS.danger); return; }
      this.player.credits -= cost;
      this.ui.flash(`Purchased: ${item.name}.`, COLORS.item);
      this._dirty = true;
    }
  }

  window.SV.Engine = Engine;
})();
