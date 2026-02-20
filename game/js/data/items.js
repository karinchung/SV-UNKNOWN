'use strict';
// ─── data/items.js ───────────────────────────────────────────────────────────
(function () {
  const C = window.SV.COLORS;

  window.SV.ITEM_DATA = {
    bio_sample: {
      id:     'bio_sample',
      name:   'Biological Sample',
      desc:   'Sealed container. Something organic. The label says "CRAWL SPECIMEN 7-C." You don\'t know what it is exactly. The Void Rats will.',
      char:   '$',
      color:  C.item,
      stackable: false,
      questItem: true,
    },
    survey_data: {
      id:     'survey_data',
      name:   'Survey Data Chip',
      desc:   'Mapping telemetry from three sectors. The Scribes\' Guild will want this. You collected it the same way you collect everything: by going somewhere no one else went.',
      char:   '$',
      color:  C.terminal,
      stackable: false,
      questItem: true,
    },
    log_fragment: {
      id:     'log_fragment',
      name:   'Memory Fragment',
      desc:   'A damaged log entry. Sounds familiar. The date is 847 days ago.',
      char:   'M',
      color:  C.driftHigh,
      stackable: false,
      questItem: false,
      onPickup: (flags) => {
        flags.increment(window.SV.FLAG.IDENTITY_DRIFT, 5);
      },
    },
    medpack: {
      id:     'medpack',
      name:   'Field Medpack',
      desc:   'Standard issue. Repairs sleeve damage. AXIOM Corp branding mostly worn off.',
      char:   '+',
      color:  C.terminal,
      stackable: true,
      usable: true,
      onUse: (player) => {
        player.hp = Math.min(player.maxHp, player.hp + 3);
        return 'Medpack used. Sleeve integrity improved.';
      },
    },
    ration_pack: {
      id:     'ration_pack',
      name:   '"Victory" Ration Pack',
      desc:   'AXIOM Biological. Caloric density: high. Taste: chalk. The name is aspirational.',
      char:   '%',
      color:  C.uiDim,
      stackable: true,
      usable: true,
      onUse: (player) => {
        player.hp = Math.min(player.maxHp, player.hp + 1);
        return 'You eat the Victory bar. It tastes like chalk.';
      },
    },
  };
})();
