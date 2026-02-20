'use strict';
// ─── quests.js ───────────────────────────────────────────────────────────────
(function () {
  const F = window.SV.FLAG;

  const QUEST_DATA = {
    scribes_mapping: {
      id:      'scribes_mapping',
      title:   'Sector Mapping',
      giver:   'Scribes\' Guild',
      desc:    'Survey and log telemetry from 3 zones in Earth survey area. Standard mapping protocol.',
      takeFlag: F.QUEST_SCRIBES_1_TAKEN,
      doneFlag: F.QUEST_SCRIBES_1_DONE,
      reward:  { credits: 8, item: 'survey_data', drift: 0 },
      // Completion: zones_surveyed counter must reach 3
      isComplete: (flags) => flags.gte(F.ZONES_SURVEYED, 3),
      turnInDialogue: (flags) => {
        const drift = flags.get(F.IDENTITY_DRIFT);
        if (flags.has(F.SAW_RATION_PACK_MOMENT) && drift >= 30) {
          return 'Clavius reviews the telemetry without looking up. "Good coverage. You went further into the Crawl than the brief required." A pause. "I noticed." He approves the payment and slides another Victory bar across the desk without comment.';
        }
        return 'Clavius reviews the telemetry. "Thorough. Good coverage across all three zones." He approves the payment efficiently. "The guild appreciates precision."';
      },
    },
    voidrats_sample: {
      id:      'voidrats_sample',
      title:   'Sample Retrieval',
      giver:   'Void Rats / Brecht',
      desc:    'Biological sample from ruin cluster, Earth zone. Intact containment preferred.',
      takeFlag: F.QUEST_VOIDRATS_1_TAKEN,
      doneFlag: F.QUEST_VOIDRATS_1_DONE,
      reward:  { credits: 12, item: null, drift: 0 },
      isComplete: (flags, player) => player.hasItem('bio_sample'),
      turnInDialogue: (flags) => {
        if (flags.has(F.MET_MERCY7)) {
          return '"You went into the ruin cluster." Brecht checks the sample seal. "And you found her." He doesn\'t ask what you talked about. "Payment\'s in your account. The sample is exactly what we thought." He\'s already moving on. "You okay?" He asks it like it\'s a logistical question.';
        }
        return 'Brecht checks the sample seal. "Intact. Good work. The containment held." He approves the payment. "Nine out of ten retrievals come back with a broken seal. You\'re careful." He says this as a compliment and as a professional note.';
      },
    },
  };

  class QuestSystem {
    constructor(flags, player) {
      this.flags  = flags;
      this.player = player;
      this.active = [];   // active quest IDs
    }

    accept(questId) {
      const q = QUEST_DATA[questId];
      if (!q) return 'Unknown contract.';
      if (this.flags.has(q.takeFlag)) return 'Contract already accepted.';
      this.flags.set(q.takeFlag);
      this.active.push(questId);
      return `Contract accepted: ${q.title}\n${q.desc}`;
    }

    checkCompletions() {
      // Called each turn; auto-marks quests complete when conditions are met
      for (const qid of this.active) {
        const q = QUEST_DATA[qid];
        if (!this.flags.has(q.doneFlag) && q.isComplete(this.flags, this.player)) {
          this.flags.set(q.doneFlag);
        }
      }
    }

    // Returns turn-in dialogue for a completed quest, or null if not ready
    getTurnIn(npcId) {
      // Scribes quests turn in to Clavius; Void Rat quests to Brecht
      const npcQuests = {
        CLAVIUS: ['scribes_mapping'],
        BRECHT:  ['voidrats_sample'],
      };
      const relevant = npcQuests[npcId] || [];
      for (const qid of relevant) {
        const q = QUEST_DATA[qid];
        if (this.flags.has(q.doneFlag) && !this.flags.has(`${q.doneFlag}_rewarded`)) {
          return { quest: q, dialogue: q.turnInDialogue(this.flags) };
        }
      }
      return null;
    }

    giveReward(questId) {
      const q = QUEST_DATA[questId];
      if (!q) return;
      this.flags.set(`${q.doneFlag}_rewarded`);
      this.player.credits += q.reward.credits;
      this.active = this.active.filter(id => id !== questId);
      return `+${q.reward.credits} credits. Contract closed.`;
    }

    getActiveDisplay() {
      return this.active.map(qid => {
        const q = QUEST_DATA[qid];
        const done = this.flags.has(q.doneFlag);
        return `${done ? '[✓]' : '[ ]'} ${q.title} (${q.giver})`;
      });
    }
  }

  window.SV.QUEST_DATA  = QUEST_DATA;
  window.SV.QuestSystem = QuestSystem;
})();
