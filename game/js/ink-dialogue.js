'use strict';
// ─── ink-dialogue.js ─────────────────────────────────────────────────────────
// InkDialogue: wraps inkjs Story runtime. Replaces the old JS-object dialogue system.
//
// Flow:
//   engine.init() → fetch(story.ink.json) → dialogue.initStory(json)
//   interact with NPC → dialogue.startKnot('casimir')
//   player picks choice → dialogue.choose(idx)
//   no choices → dialogue.advance()  (or it auto-closes at END)
//   dialogue.onUpdate(state | null)  → engine calls ui.showDialogue / hideDialogue
//
// Tags processed per beat:
//   # NPC: KEY         portrait/readout panel = NPC_DATA[KEY]
//   # FLAG: name       set boolean flag in FlagSystem
//   # DRIFT: +n        increment IDENTITY_DRIFT by n
//   # LOG: text        push entry to player survey log
//   # QUEST: accept:id call engine.acceptQuest(id)
//   # REWARD: id       call engine.completeQuestReward(id)
//   # BUY: itemId:cost call engine.buyItem(itemId, cost)
//   # UNLOCK: nodeId   call engine.unlockNode(nodeId)
//   # HAZARD: type:+n  call engine.applyHazard(type, n)
//   # UPGRADE: id      call engine.applyUpgrade(id)
(function () {
  const { FLAG, NPC_DATA } = window.SV;

  // Minimal data for interactable tiles that aren't full NPCs
  const INTERACTABLE_NPC = {
    QUEST_BOARD: { name: 'Contract Board',    title: 'AXIOM SURVEY CORPS',  portrait: null, readouts: [] },
    TERMINAL:    { name: 'Station Terminal',  title: 'SYSTEM v4.1',          portrait: null, readouts: [] },
    VENDING:     { name: 'Dispensary Unit 7', title: 'AXIOM SUPPLY CHAIN',   portrait: null, readouts: [] },
  };

  class InkDialogue {
    constructor(flags, player, engine) {
      this.flags  = flags;
      this.player = player;
      this.engine = engine;

      this.story       = null;    // inkjs.Story — set via initStory() after fetch
      this.active      = false;
      this._currentNpc = null;    // NPC_DATA entry currently displayed
      this.onUpdate    = null;    // (state | null) → called by us; set by engine
    }

    // Update player reference (called after player is created)
    setPlayer(player) {
      this.player = player;
    }

    // ── Setup ────────────────────────────────────────────────────────────────

    // Pass the *string* content of story.ink.json (not parsed).
    initStory(jsonText) {
      this.story = new inkjs.Story(jsonText);
    }

    // ── Public API ───────────────────────────────────────────────────────────

    // Jump to a named knot and start rendering.
    startKnot(knotName) {
      if (!this.story) { console.warn('InkDialogue: story not loaded'); return; }
      try { this._syncToInk(); } catch (e) { console.warn('InkDialogue: _syncToInk error', e); }
      try {
        this.story.ChoosePathString(knotName);
      } catch (e) {
        console.error('InkDialogue: bad knot', knotName, e);
        return;
      }
      this.active = true;
      this._step();
    }

    // Advance past a no-choice beat.
    advance() {
      if (!this.active) return;
      if (!this.story) { this.close(); return; }  // fallback mode — just close
      if (this.story.currentChoices.length > 0) return;  // has choices → must choose
      this._step();
    }

    // Pick a choice by index.
    choose(idx) {
      if (!this.active) return;
      if (!this.story) { this.close(); return; }  // fallback mode — just close
      const choices = this.story.currentChoices;
      if (!choices.length) { this.advance(); return; }
      if (idx < 0 || idx >= choices.length) return;
      this.story.ChooseChoiceIndex(idx);
      this._step();
    }

    // Dismiss dialogue without completing it.
    close() {
      this._syncFromInk();
      this.active      = false;
      this._currentNpc = null;
      if (this.onUpdate) this.onUpdate(null);
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    _step() {
      let text = '';
      while (this.story.canContinue) {
        const line = this.story.Continue();
        this._processTags(this.story.currentTags);
        if (line.trim()) text += (text ? '\n' : '') + line.trim();
      }

      const choices = this.story.currentChoices.map(c => ({ text: c.text }));

      this._syncFromInk();

      // END or DONE → close dialogue
      if (!this.story.canContinue && choices.length === 0) {
        this.active      = false;
        this._currentNpc = null;
        if (this.onUpdate) this.onUpdate(null);
        return;
      }

      if (this.onUpdate) {
        this.onUpdate({
          npcData: this._currentNpc || { name: '—', title: '', portrait: null, readouts: [] },
          text:    text,
          choices,
        });
      }
    }

    _processTags(tags) {
      if (!tags || !tags.length) return;
      for (const raw of tags) {
        const colon = raw.indexOf(':');
        if (colon < 0) continue;
        const key = raw.slice(0, colon).trim().toUpperCase();
        const val = raw.slice(colon + 1).trim();

        switch (key) {
          case 'NPC':
            this._currentNpc = NPC_DATA[val] || INTERACTABLE_NPC[val] || null;
            break;

          case 'FLAG':
            this.flags.set(val);
            break;

          case 'DRIFT': {
            const n = parseInt(val.replace('+', ''), 10);
            if (!isNaN(n) && n > 0) this.flags.increment(FLAG.IDENTITY_DRIFT, n);
            break;
          }

          case 'LOG':
            if (val) this.player.addLog(val, this.flags);
            break;

          case 'QUEST':
            if (val.startsWith('accept:')) {
              this.engine.acceptQuest(val.slice('accept:'.length));
            }
            break;

          case 'REWARD':
            this.engine.completeQuestReward(val);
            break;

          case 'BUY': {
            const sep = val.lastIndexOf(':');
            if (sep > 0) {
              const itemId = val.slice(0, sep);
              const cost   = parseInt(val.slice(sep + 1), 10);
              this.engine.buyItem(itemId, cost);
            }
            break;
          }

          case 'UNLOCK':
            if (this.engine.unlockNode) this.engine.unlockNode(val);
            break;

          case 'HAZARD': {
            // Format: type:+n  e.g. RUST_ACCUMULATION:+10
            const hSep = val.lastIndexOf(':');
            if (hSep > 0) {
              const hType = val.slice(0, hSep).trim();
              const hAmt  = parseInt(val.slice(hSep + 1).replace('+', ''), 10);
              if (!isNaN(hAmt) && this.engine.applyHazard) {
                this.engine.applyHazard(hType, hAmt);
              }
            }
            break;
          }

          case 'UPGRADE':
            if (this.engine.applyUpgrade) this.engine.applyUpgrade(val);
            break;
        }
      }
    }

    // ── Sync: FlagSystem ↔ Ink variables ─────────────────────────────────────
    // Called once before each knot start (to inject current game state into Ink).

    // Safe setter: silently skips variables not declared in the ink story.
    // inkjs throws if you set an undeclared VAR — this prevents that from
    // killing the entire sync.
    _safeSet(v, key, val) {
      try { v[key] = val; } catch (_) { /* undeclared VAR — skip */ }
    }

    _syncToInk() {
      if (!this.story) return;
      const v = this.story.variablesState;
      const f = this.flags;
      const F = FLAG;
      const s = this._safeSet.bind(this, v);

      // Boolean flags
      s('met_casimir',            f.has(F.MET_CASIMIR));
      s('met_clavius',            f.has(F.MET_CLAVIUS));
      s('met_brecht',             f.has(F.MET_BRECHT));
      s('met_mercy7',             f.has(F.MET_MERCY7));
      s('met_dariusz',            f.has(F.MET_DARIUSZ));
      s('found_dead_unit',        f.has(F.FOUND_DEAD_UNIT));
      s('child_spoke_to_you',     f.has(F.CHILD_SPOKE_TO_YOU));
      s('asked_casimir_self',     f.has(F.ASKED_CASIMIR_ABOUT_SELF));
      s('knows_migration_truth',  f.has(F.KNOWS_MIGRATION_TRUTH));
      s('knows_guilds_founded',   f.has(F.KNOWS_GUILDS_FOUNDED));
      s('knows_crawl_engineered', f.has(F.KNOWS_CRAWL_ENGINEERED));
      s('knows_cull',             f.has(F.KNOWS_CULL));
      s('knows_sv_purpose',       f.has(F.KNOWS_SV_PURPOSE));
      s('knows_harvest_purpose',  f.has(F.KNOWS_HARVEST_PURPOSE));
      s('knows_crawl_is_people',  f.has(F.KNOWS_CRAWL_IS_PEOPLE));
      s('mercy7_retrieval_asked', f.has(F.MERCY7_ASKED_RETRIEVAL));
      s('mercy7_named_you',       f.has(F.MERCY7_NAMED_YOU));
      s('brecht_named_you',       f.has(F.BRECHT_NAMED_YOU));
      s('saw_ration_pack_moment', f.has(F.SAW_RATION_PACK_MOMENT));
      s('quest_scribes_taken',    f.has(F.QUEST_SCRIBES_1_TAKEN));
      s('quest_scribes_done',     f.has(F.QUEST_SCRIBES_1_DONE));
      s('quest_voidrats_taken',   f.has(F.QUEST_VOIDRATS_1_TAKEN));
      s('quest_voidrats_done',    f.has(F.QUEST_VOIDRATS_1_DONE));
      s('quest_makers_taken',     f.has(F.QUEST_MAKERS_TAKEN));

      // Numeric counters
      s('identity_drift',         f.get(F.IDENTITY_DRIFT));
      s('clavius_trust',          f.get(F.CLAVIUS_TRUST));
      s('voss_trust',             f.get(F.VOSS_TRUST));
      s('zones_surveyed',         f.get(F.ZONES_SURVEYED));
      s('credits',                this.player ? this.player.credits : 0);

      // Player pronouns + name
      s('player_name',   this.player ? this.player.name : 'UNKNOWN');
      s('player_serial', this.player ? `SV-${this.player.name}` : 'SV-???');
      s('subj',          this.player ? this.player.subj || 'they' : 'they');
      s('obj',           this.player ? this.player.obj  || 'them' : 'them');
      s('poss',          this.player ? this.player.poss || 'their': 'their');
      s('subj_cap',      this.player
        ? (this.player.subj || 'they')[0].toUpperCase() + (this.player.subj || 'they').slice(1)
        : 'They');
    }

    // Called after each Continue() loop — mirrors Ink variables back to FlagSystem.
    _syncFromInk() {
      if (!this.story) return;
      const v = this.story.variablesState;
      const f = this.flags;
      const F = FLAG;

      if (v['met_casimir'])            f.set(F.MET_CASIMIR);
      if (v['met_clavius'])            f.set(F.MET_CLAVIUS);
      if (v['met_brecht'])             f.set(F.MET_BRECHT);
      if (v['met_mercy7'])             f.set(F.MET_MERCY7);
      if (v['met_dariusz'])            f.set(F.MET_DARIUSZ);
      if (v['found_dead_unit'])        f.set(F.FOUND_DEAD_UNIT);
      if (v['child_spoke_to_you'])     f.set(F.CHILD_SPOKE_TO_YOU);
      if (v['asked_casimir_self'])     f.set(F.ASKED_CASIMIR_ABOUT_SELF);
      if (v['knows_migration_truth'])  f.set(F.KNOWS_MIGRATION_TRUTH);
      if (v['knows_guilds_founded'])   f.set(F.KNOWS_GUILDS_FOUNDED);
      if (v['knows_crawl_engineered']) f.set(F.KNOWS_CRAWL_ENGINEERED);
      if (v['knows_cull'])             f.set(F.KNOWS_CULL);
      if (v['knows_sv_purpose'])       f.set(F.KNOWS_SV_PURPOSE);
      if (v['knows_harvest_purpose'])  f.set(F.KNOWS_HARVEST_PURPOSE);
      if (v['knows_crawl_is_people'])  f.set(F.KNOWS_CRAWL_IS_PEOPLE);
      if (v['mercy7_retrieval_asked']) f.set(F.MERCY7_ASKED_RETRIEVAL);
      if (v['mercy7_named_you'])       f.set(F.MERCY7_NAMED_YOU);
      if (v['brecht_named_you'])       f.set(F.BRECHT_NAMED_YOU);
      if (v['saw_ration_pack_moment']) f.set(F.SAW_RATION_PACK_MOMENT);
      if (v['quest_scribes_taken'])    f.set(F.QUEST_SCRIBES_1_TAKEN);
      if (v['quest_scribes_done'])     f.set(F.QUEST_SCRIBES_1_DONE);
      if (v['quest_voidrats_taken'])   f.set(F.QUEST_VOIDRATS_1_TAKEN);
      if (v['quest_voidrats_done'])    f.set(F.QUEST_VOIDRATS_1_DONE);
      if (v['quest_makers_taken'])     f.set(F.QUEST_MAKERS_TAKEN);

      // Numeric counters — set_counter always writes (Ink is source of truth during dialogue)
      f.set_counter(F.IDENTITY_DRIFT, v['identity_drift'] || 0);
      f.set_counter(F.CLAVIUS_TRUST,  v['clavius_trust']  || 0);
      f.set_counter(F.VOSS_TRUST,     v['voss_trust']     || 0);

      // Credits sync back (Ink vending deducts them)
      if (this.player && typeof v['credits'] === 'number') {
        this.player.credits = v['credits'];
      }
    }
  }

  window.SV.InkDialogue = InkDialogue;
})();
