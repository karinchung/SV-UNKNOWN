'use strict';
// ─── dialogue.js ─────────────────────────────────────────────────────────────
// DialogueSystem: drives conversation through the DIALOGUE data tree.
// Notifies the UI when state changes.
(function () {
  const { DIALOGUE, FLAG } = window.SV;

  class DialogueSystem {
    constructor(flags, player, engine) {
      this.flags    = flags;
      this.player   = player;
      this.engine   = engine;
      this.active   = false;
      this.npcData  = null;
      this.nodeId   = null;
      this.node     = null;
      this.onUpdate = null;  // callback → ui
    }

    start(npcData, rootNodeId, turnInPayload) {
      this.npcData = npcData;
      this.active  = true;

      // Quest turn-in takes priority
      if (turnInPayload) {
        this._showTurnIn(turnInPayload);
        return;
      }

      this._goTo(rootNodeId || npcData.dialogueRoot);
    }

    startInteractable(interactId) {
      // Non-NPC interactables (terminals, quest board, vending)
      const nodeMap = {
        quest_board: 'quest_board',
        terminal:    'terminal_generic',
        vending:     'vending',
      };
      const nodeId = nodeMap[interactId];
      if (!nodeId) return;
      this.npcData = {
        name: interactId === 'quest_board' ? 'CONTRACT BOARD'
            : interactId === 'terminal'    ? 'AXIOM TERMINAL'
            : 'DISPENSARY UNIT 7',
        title: '',
        portrait: null,
        readouts: [],
      };
      this.active = true;
      this._goTo(nodeId);
    }

    choose(choiceIndex) {
      if (!this.active || !this.node) return;
      const choices = this._resolveChoices();
      const choice = choices[choiceIndex];
      if (!choice) return;

      // Apply flag changes from choice
      if (choice.flags) {
        if (choice.flags.set) {
          const arr = Array.isArray(choice.flags.set) ? choice.flags.set : [choice.flags.set];
          arr.forEach(f => this.flags.set(f));
        }
        if (choice.flags.increment) {
          const [key, amt] = choice.flags.increment;
          this.flags.increment(key, amt || 1);
        }
      }

      // Run side-effect action
      if (choice.action) {
        choice.action(this.flags, this.player, this.engine);
      }

      // Advance
      if (choice.next) {
        this._goTo(choice.next);
      } else {
        this.close();
      }
    }

    advance() {
      // Called on E press when there are no choices (just read + continue)
      if (this._resolveChoices().length === 0) this.close();
    }

    close() {
      this.active  = false;
      this.npcData = null;
      this.nodeId  = null;
      this.node    = null;
      if (this.onUpdate) this.onUpdate(null);
    }

    _goTo(nodeId) {
      const node = DIALOGUE[nodeId];
      if (!node) { this.close(); return; }

      // Run onEnter hook
      if (node.onEnter) node.onEnter(this.flags, this.player);

      this.nodeId = nodeId;
      this.node   = node;

      if (this.onUpdate) this.onUpdate(this._buildState());
    }

    _showTurnIn(payload) {
      // Synthesise a one-shot node for quest turn-in
      this.node = {
        text: payload.dialogue,
        choices: [
          { text: '[Collect reward]', next: null, action: (flags, player, engine) => {
            const msg = engine.quests.giveReward(payload.quest.id);
            player.addLog(msg || 'Contract closed.', flags);
          }},
        ],
      };
      this.nodeId = '__turnin__';
      if (this.onUpdate) this.onUpdate(this._buildState());
    }

    _resolveChoices() {
      if (!this.node) return [];
      return (this.node.choices || []);
    }

    _resolveText() {
      if (!this.node) return '';
      const t = this.node.text;
      return typeof t === 'function' ? t(this.flags, this.player) : t;
    }

    _buildState() {
      return {
        npcData:  this.npcData,
        text:     this._resolveText(),
        choices:  this._resolveChoices(),
      };
    }
  }

  window.SV.DialogueSystem = DialogueSystem;
})();
