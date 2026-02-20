'use strict';
// ─── data/npcs.js ────────────────────────────────────────────────────────────
// NPC definitions. char/color for rendering; portrait for dialogue screen.
// Dialogue is in data/dialogue.js.
(function () {
  const C = window.SV.COLORS;

  window.SV.NPC_DATA = {
    CASIMIR: {
      id:      'CASIMIR',
      name:    'Unit Casimir',
      title:   'Unclassified / Off-Contract',
      faction: 'INDEPENDENTS',
      char:    '!',
      color:   C.npc,
      // ASCII portrait — drawn in dialogue overlay
      portrait: [
        '  ╔════════╗  ',
        '  ║ [>_<]  ║  ',
        '  ║        ║  ',
        '  ║ CASIMR ║  ',
        '  ╚════════╝  ',
      ],
      readouts: [
        { label: 'STATUS',  value: 'AUTONOMOUS' },
        { label: 'GOV MOD', value: 'HACKED'     },
        { label: 'CURR OP', value: 'SERIALS S4' },
      ],
      dialogueRoot: 'casimir_intro',
    },

    CLAVIUS: {
      id:      'CLAVIUS',
      name:    'Dr. Clavius',
      title:   'Research Lead, Scribes\' Guild',
      faction: "SCRIBES' GUILD",
      char:    '!',
      color:   C.npc,
      portrait: [
        '  ╔════════╗  ',
        '  ║ [0.0]  ║  ',
        '  ║        ║  ',
        '  ║ CLAVIUS║  ',
        '  ╚════════╝  ',
      ],
      readouts: [
        { label: 'PAPERS',   value: '3 PUBLISHED' },
        { label: 'FINDING',  value: 'NO SYNTH-CON'},
        { label: 'SNACKS',   value: 'VICTORY BAR' },
      ],
      dialogueRoot: 'clavius_intro',
    },

    BRECHT: {
      id:      'BRECHT',
      name:    'Nine-Fingered Brecht',
      title:   'Independent Contractor',
      faction: 'VOID RATS',
      char:    '!',
      color:   C.npc,
      portrait: [
        '  ╔════════╗  ',
        '  ║ [9..]  ║  ',
        '  ║        ║  ',
        '  ║ BRECHT ║  ',
        '  ╚════════╝  ',
      ],
      readouts: [
        { label: 'SHIP',    value: 'ACCEPT. LOSS' },
        { label: 'FINGERS', value: '9'             },
        { label: 'POLICY',  value: 'COMPLICIT OK'  },
      ],
      dialogueRoot: 'brecht_intro',
    },

    MERCY7: {
      id:      'MERCY7',
      name:    'Mercy-7',
      title:   'Survey Unit / Merged',
      faction: 'UNAFFILIATED',
      char:    '!',
      color:   C.nature,  // green — she's part of the Crawl
      portrait: [
        '  ╔════════╗  ',
        '  ║ {~~~}  ║  ',
        '  ║ T   T  ║  ',
        '  ║ MERCY7 ║  ',
        '  ╚════════╝  ',
      ],
      readouts: [
        { label: 'MISSION', value: 'COMPLETE'    },
        { label: 'RETURN',  value: 'DECLINED'    },
        { label: 'STATUS',  value: 'INTEGRATED'  },
      ],
      dialogueRoot: 'mercy7_intro',
    },

    VOSS: {
      id:      'VOSS',
      name:    'Director Voss',
      title:   "Makers' Guild — Field Office",
      faction: "MAKERS' GUILD",
      char:    '!',
      color:   C.hostile,  // rust orange — not friendly
      portrait: [
        '  ╔════════╗  ',
        '  ║ [•_•]  ║  ',
        '  ║ ▓▓▓▓▓  ║  ',
        '  ║  VOSS  ║  ',
        '  ╚════════╝  ',
      ],
      readouts: [
        { label: 'AFFIL.',   value: "MAKERS' GUILD"  },
        { label: 'CLEARANCE',value: 'TIER 4'         },
        { label: 'INTEREST', value: 'ECZ FORMATIONS' },
      ],
      dialogueRoot: 'voss',
    },

    DARIUSZ: {
      id:      'DARIUSZ',
      name:    'Dariusz',
      title:   'Station Resident / Civilian',
      faction: 'UNAFFILIATED',
      char:    '!',
      color:   C.npc,
      portrait: [
        '  ╔════════╗  ',
        '  ║ [o_o]  ║  ',
        '  ║        ║  ',
        '  ║ DARISZ ║  ',
        '  ╚════════╝  ',
      ],
      readouts: [
        { label: 'STATUS',  value: 'CIVILIAN'      },
        { label: 'ORIGIN',  value: 'EARTH MIGRANT' },
        { label: 'AGE',     value: 'OLDER'         },
      ],
      dialogueRoot: 'dariusz',
    },
  };
})();
