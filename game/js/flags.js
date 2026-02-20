'use strict';
// ─── flags.js ────────────────────────────────────────────────────────────────
// FlagSystem: tracks all global boolean flags and numeric counters.
// Flags are NEVER displayed to the player directly.
// They gate dialogue branches, encounter variants, and endings.
(function () {
  class FlagSystem {
    constructor() {
      this._flags    = new Set();
      this._counters = new Map();
    }

    // Boolean flags
    set(flag)   { this._flags.add(flag); }
    unset(flag) { this._flags.delete(flag); }
    has(flag)   { return this._flags.has(flag); }

    // Numeric counters
    increment(key, amount = 1) {
      this._counters.set(key, (this._counters.get(key) || 0) + amount);
    }
    decrement(key, amount = 1) {
      this._counters.set(key, Math.max(0, (this._counters.get(key) || 0) - amount));
    }
    get(key)             { return this._counters.get(key) || 0; }
    set_counter(key, val){ this._counters.set(key, val); }

    // Threshold checks
    gte(key, n) { return this.get(key) >= n; }
    lte(key, n) { return this.get(key) <= n; }

    // Serialise for save (placeholder)
    toJSON() {
      return {
        flags:    [...this._flags],
        counters: Object.fromEntries(this._counters),
      };
    }
    fromJSON(data) {
      this._flags    = new Set(data.flags || []);
      this._counters = new Map(Object.entries(data.counters || {}));
    }
  }

  // ─── Named flag constants ─────────────────────────────────────────────────
  // RULE: add new flags here so they're easy to grep across the codebase.
  window.SV.FLAG = {
    // NPC met
    MET_CASIMIR:   'met_casimir',
    MET_CLAVIUS:   'met_clavius',
    MET_BRECHT:    'met_brecht',
    MET_MERCY7:    'met_mercy7',
    MET_DARIUSZ:   'met_dariusz',
    MET_VOSS:      'met_voss',

    // Story beats
    SAW_RATION_PACK_MOMENT:   'saw_ration_pack_moment',
    ASKED_CASIMIR_ABOUT_SELF: 'asked_casimir_self',
    MERCY7_ASKED_RETRIEVAL:   'mercy7_retrieval_asked',
    MERCY7_NAMED_YOU:         'mercy7_named_you',
    BRECHT_NAMED_YOU:         'brecht_named_you',
    KNOWS_MIGRATION_TRUTH:    'knows_migration_truth',
    KNOWS_GUILDS_FOUNDED:     'knows_guilds_founded',
    KNOWS_CRAWL_ENGINEERED:   'knows_crawl_engineered',
    KNOWS_CULL:               'knows_cull',
    KNOWS_SV_PURPOSE:         'knows_sv_purpose',
    KNOWS_HARVEST_PURPOSE:    'knows_harvest_purpose',
    KNOWS_CRAWL_IS_PEOPLE:    'knows_crawl_is_people',
    FOUND_DEAD_UNIT:          'found_dead_unit',
    CHILD_SPOKE_TO_YOU:       'child_spoke_to_you',
    MEMORY_FRAGMENT_1:        'memory_fragment_1',
    MEMORY_FRAGMENT_2:        'memory_fragment_2',
    MEMORY_FRAGMENT_3:        'memory_fragment_3',
    MEMORY_FRAGMENT_4:        'memory_fragment_4',
    MEMORY_FRAGMENT_5:        'memory_fragment_5',
    ALL_MEMORY_FRAGMENTS_COLLECTED: 'all_memory_fragments_collected',

    // Quest flags
    QUEST_SCRIBES_1_TAKEN:  'q_scribes1_taken',
    QUEST_SCRIBES_1_DONE:   'q_scribes1_done',
    QUEST_VOIDRATS_1_TAKEN: 'q_voidrats1_taken',
    QUEST_VOIDRATS_1_DONE:  'q_voidrats1_done',
    QUEST_MAKERS_TAKEN:     'q_makers_taken',

    // Gear / appearance
    BIO_SUIT:       'bio_suit',
    EXPOSED_CHASSIS:'exposed_chassis',

    // ── Counters (used via flags.get()) ──────────────────────────────────────
    // Identity / meta
    IDENTITY_DRIFT:   'identity_drift',   // never displayed; shifts log color
    ZONES_SURVEYED:   'zones_surveyed',
    SAMPLES_COLLECTED:'samples_collected',
    MEMORY_FRAGMENTS_COLLECTED: 'memory_fragments_collected',  // count of fragments found

    // Guild rep / trust
    GUILD_NAV:     'guild_nav',
    GUILD_SCRIBES: 'guild_scribes',
    GUILD_MAKERS:  'guild_makers',
    GUILD_RATS:    'guild_rats',
    CLAVIUS_TRUST: 'clavius_trust',
    VOSS_TRUST:    'voss_trust',

    // ── Earth hazard counters (from earth_systems.docx) ───────────────────
    // Displayed in Earth Systems HUD panel; never labelled as "danger".
    RUST_ACCUMULATION:  'rust_accumulation',  // chassis corrosion; shallow water
    CRAWL_SATURATION:   'crawl_saturation',   // organic ingestion; per step on Earth
    VINE_ENTANGLEMENT:  'vine_entanglement',  // Crawl response to movement
    STRUCTURAL_LOAD:    'structural_load',    // weight on ruin floors
    SENSOR_INTERFERENCE:'sensor_interference',// EM noise in deep zones
    HEAT_STRESS:        'heat_stress',        // geothermal zones
  };

  window.SV.FlagSystem = FlagSystem;
})();
