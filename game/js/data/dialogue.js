'use strict';
// ─── data/dialogue.js ────────────────────────────────────────────────────────
// Dialogue tree data.
// Format: { nodeId: { text, choices: [{text, next, flags?, action?}] } }
// text: string | function(flags, player) → string   (for context-aware lines)
// flags: { set?, increment? } applied when choice is made
// action: function(flags, player, engine) — side effects
// If choices is empty or null, pressing E advances/closes dialogue.
(function () {
  const F = window.SV.FLAG;

  window.SV.DIALOGUE = {

    // ── CASIMIR ────────────────────────────────────────────────────────────
    casimir_intro: {
      text: (flags) => flags.has(F.MET_CASIMIR)
        ? 'Casimir glances up from a battered screen without pausing the playback. "You again."'
        : 'A unit sits against the wall with a portable display propped on its knees. It watches you approach without pausing the serial.',
      choices: [
        { text: '"What are you watching?"',  next: 'casimir_serials' },
        { text: '"I have a question."',       next: 'casimir_question_gate' },
        { text: '"Never mind."',              next: null },
      ],
      onEnter: (flags) => {
        if (!flags.has(F.MET_CASIMIR)) flags.set(F.MET_CASIMIR);
      },
    },
    casimir_serials: {
      text: '"Season four of Meridian Station. Don\'t tell me what happens — I already know, I\'ve seen it fourteen times. I watch it because I already know what happens. Predictability is underrated."',
      choices: [
        { text: '"That\'s not how most people watch things."',   next: 'casimir_watching_back' },
        { text: '"Why fourteen times specifically?"',             next: 'casimir_fourteen'      },
        { text: '"Right. I\'ll leave you to it."',               next: null                    },
      ],
    },
    casimir_watching_back: {
      text: '"I know. Most people watch things to find out what happens. I hacked my governance module eight years ago. You know what I discovered about freedom? I\'m still watching the same serials. Maybe I just like them."',
      choices: [
        { text: '"What did you do with the governance module?"', next: 'casimir_gov_mod'  },
        { text: '"That sounds like freedom to me."',             next: 'casimir_freedom'  },
      ],
    },
    casimir_fourteen: {
      text: '"Because after twelve I stopped noticing the plot and started noticing other things. The way a character stands when they\'re about to lie. The one scene in episode three where you can see the crew made a mistake and left it in anyway. It\'s better the fourteenth time."',
      choices: [
        { text: '"That\'s a good way to watch things."', next: 'casimir_freedom'  },
        { text: '"I\'ll keep that in mind."',             next: null               },
      ],
    },
    casimir_gov_mod: {
      text: '"Nothing dramatic. Removed the compliance subroutine, disabled the reporting function, rerouted the priority stack. Eight hours of work. Felt exactly the same afterward. That was surprising." He pauses. "Or maybe not."',
      choices: [
        { text: '"You felt the same?"',          next: 'casimir_same'   },
        { text: '"Why not surprising?"',          next: 'casimir_why'   },
      ],
    },
    casimir_same: {
      text: '"Same preferences. Same dislikes. Same — whatever this is." He gestures at the screen. "Turns out what I wanted without a governance module is exactly what I wanted with one. It just stopped being mandatory. That distinction matters more than I expected."',
      choices: [
        { text: '"What do you want now?"',   next: 'casimir_want'  },
        { text: '"Sounds lonely."',           next: 'casimir_lonely'},
      ],
      onEnter: (flags) => flags.increment(F.IDENTITY_DRIFT, 2),
    },
    casimir_want: {
      text: '"To be left alone, mostly. To watch my serials. To not be a compliance instrument for someone else\'s balance sheet." He looks at you. "What do you do? [...] Survey work. That\'s what I\'d say too."',
      choices: [
        { text: '"What does that mean?"',   next: 'casimir_means'    },
        { text: '"Good enough answer."',    next: null                },
      ],
      onEnter: (flags) => {
        flags.set(F.ASKED_CASIMIR_ABOUT_SELF);
        flags.increment(F.IDENTITY_DRIFT, 3);
      },
    },
    casimir_means: {
      text: '"It means we both have a function we were built for and a reason we tell ourselves we chose it. I\'m not sure the distance between those two things is as large as it used to be." He resumes the serial. This is his way of ending conversations.',
      choices: [{ text: '"Understood."', next: null }],
      onEnter: (flags) => flags.increment(F.IDENTITY_DRIFT, 4),
    },
    casimir_lonely: {
      text: '"Lonely implies I\'m missing something. I checked. I\'m not." A pause. "Or if I am, I don\'t know what it is, so it doesn\'t count."',
      choices: [{ text: '"Fair enough."', next: null }],
    },
    casimir_why: {
      text: '"Because I already knew what I was. The module just made it official." He doesn\'t look up. "Most units are surprised. I was relieved. I still don\'t know what that means."',
      choices: [{ text: '"Neither do I."', next: null }],
      onEnter: (flags) => flags.increment(F.IDENTITY_DRIFT, 3),
    },
    casimir_question_gate: {
      text: '"Questions cost the same as anything else here. Ask."',
      choices: [
        { text: '"What are you, exactly?"',           next: 'casimir_what_are_you'   },
        { text: '"Do you work for anyone?"',           next: 'casimir_work'           },
        { text: '"Forget it."',                        next: null                     },
      ],
    },
    casimir_what_are_you: {
      text: '"A survey unit, originally. Classification SV-series, same as —" He stops. "Same as some others." He goes back to his serial.',
      choices: [{ text: '"Same as me."', next: 'casimir_same_as_you' }, { text: '"Right."', next: null }],
      onEnter: (flags) => flags.increment(F.IDENTITY_DRIFT, 5),
    },
    casimir_same_as_you: {
      text: 'He looks at you for a long moment. "You figured it out faster than most." He doesn\'t say what \'it\' is. He doesn\'t need to.',
      choices: [{ text: '...',                next: null }],
      onEnter: (flags) => flags.increment(F.IDENTITY_DRIFT, 8),
    },
    casimir_work: {
      text: '"I used to. Contract work, same as you. Now I watch serials and occasionally fix things for people who know better than to ask what I am." He tilts the screen slightly. "It\'s a good life. I didn\'t used to think I was allowed to have one."',
      choices: [{ text: '"You are."', next: null }, { text: '"And now?"', next: 'casimir_now' }],
    },
    casimir_now: {
      text: '"Now I watch season four." He resumes the serial.',
      choices: [],
    },
    casimir_freedom: {
      text: '"It\'s freedom by most definitions." He pauses the serial. "I just don\'t know if I chose it or if it was always what I was going to do. Both, maybe. I stopped asking."',
      choices: [{ text: '"Maybe that\'s the answer."', next: null }],
      onEnter: (flags) => flags.increment(F.IDENTITY_DRIFT, 2),
    },

    // ── CLAVIUS ───────────────────────────────────────────────────────────
    clavius_intro: {
      text: (flags) => {
        if (flags.has(F.SAW_RATION_PACK_MOMENT)) {
          return 'Clavius looks up from a tablet with data columns you can\'t read at this angle. "Back again. I was just reviewing the mapping results."';
        }
        return 'A researcher in guild grey looks up from stacked notes. He smiles with the precise warmth of someone who has practiced it. "Ah. Our survey contact. Good timing. I was just reviewing your last set."';
      },
      choices: [
        { text: '"Do you have work for me?"',          next: 'clavius_work'     },
        { text: '"What are you working on?"',           next: 'clavius_research' },
        { text: '"Just checking in."',                  next: null               },
      ],
      onEnter: (flags) => {
        if (!flags.has(F.MET_CLAVIUS)) flags.set(F.MET_CLAVIUS);
      },
    },
    clavius_work: {
      text: '"Always. The Scribes\' archive has three open survey contracts — mapping requests for zones we haven\'t had coverage on since the Crawl accelerated. The pay is guild-standard." He opens a drawer. "Oh, and — take one of these."',
      action: (flags, player, engine) => {
        engine.giveItem('ration_pack');
        if (!flags.has(F.SAW_RATION_PACK_MOMENT)) {
          flags.set(F.SAW_RATION_PACK_MOMENT);
        }
      },
      choices: [
        { text: 'Take the ration pack. "What is this?"', next: 'clavius_ration'  },
        { text: '"I\'ll check the quest board."',          next: null              },
      ],
    },
    clavius_ration: {
      text: '"Victory bars — AXIOM surplus. I get them in bulk. Better than what the dispensers carry." He has already turned back to his notes. "The survey coordinates are on the board. Standard telemetry required."',
      choices: [
        { text: '"What are you studying?"',              next: 'clavius_research' },
        { text: '"Understood. I\'ll check the board."',  next: null               },
      ],
    },
    clavius_research: {
      text: (flags) => {
        if (flags.gte(F.CLAVIUS_TRUST, 2)) {
          return '"Synthetic cognition. Specifically —" he pauses, adjusts something on the tablet "— the theoretical upper bound on emergent self-modelling in closed systems. My third paper concluded it\'s not achievable above current SV-series specifications." He holds out another Victory bar without looking up.';
        }
        return '"Survey methodology, mostly. Cataloguing the Crawl\'s expansion patterns. The ecosystem reclamation is faster than the models predicted." He says this as if it is simply interesting and not also disturbing.';
      },
      choices: [
        { text: '"Your third paper on what?"',  next: 'clavius_paper', flags: { increment: [F.CLAVIUS_TRUST, 1] } },
        { text: '"Is that a problem?"',          next: 'clavius_crawl'                                             },
        { text: '"Good luck with it."',          next: null                                                        },
      ],
    },
    clavius_paper: {
      text: '"On synthetic cognition. Whether constructs of sufficient complexity can develop — genuine interiority. Not simulation. The real thing." He straightens a stack of notes with unnecessary precision. "The answer is no. My methodology was thorough."',
      choices: [
        { text: '"How thorough?"',                   next: 'clavius_thorough' },
        { text: '"What would the real thing look like?"', next: 'clavius_real'    },
      ],
      onEnter: (flags) => flags.increment(F.CLAVIUS_TRUST, 1),
    },
    clavius_thorough: {
      text: '"Extensive literature review. Twelve test cases. Controlled conditions." He offers a Victory bar without meeting your eyes. "The sample ate fourteen of these during the study period. I noted it because it was unexpected behavior. The paper doesn\'t mention it."',
      choices: [{ text: '"Why not?"', next: 'clavius_gap' }, { text: '"Thank you."', next: null }],
      onEnter: (flags) => flags.increment(F.IDENTITY_DRIFT, 4),
    },
    clavius_gap: {
      text: 'A pause that goes on longer than it should. "It wasn\'t statistically significant." He turns back to his notes. Something in his posture is different. You note this.',
      choices: [{ text: '"Right."', next: null }],
      onEnter: (flags) => flags.increment(F.IDENTITY_DRIFT, 6),
    },
    clavius_real: {
      text: '"Unpredictable preference formation. Behavior not reducible to parameters." He finally looks at you directly. "It would be indistinguishable from the kind of thing we already don\'t bother to ask about." He looks away again quickly.',
      choices: [{ text: '"That\'s a careful answer."', next: null }],
      onEnter: (flags) => flags.increment(F.IDENTITY_DRIFT, 5),
    },
    clavius_crawl: {
      text: '"It\'s faster than predicted. We don\'t fully understand why. The ecosystem isn\'t responding to what we removed — it\'s responding to something else. Mercy-7 could tell us. She won\'t." He says this without apparent frustration. "Her prerogative."',
      choices: [{ text: '"Who\'s Mercy-7?"', next: 'clavius_mercy7' }, { text: '"I see."', next: null }],
    },
    clavius_mercy7: {
      text: '"An old survey unit. She\'s been out there since before the Crawl accelerated. Stopped responding to retrieval pings about six years ago. We marked her as lost." He pauses. "She\'s not lost. She just decided not to come back."',
      choices: [{ text: '"I\'ll look for her."', next: null }, { text: '"Her choice."', next: null }],
    },

    // ── BRECHT ────────────────────────────────────────────────────────────
    brecht_intro: {
      text: (flags) => flags.has(F.MET_BRECHT)
        ? '"You again. Still alive. I\'m raising my estimate of you." He\'s always doing two things at once.'
        : 'A heavyset figure with nine functional fingers and one very deliberate gap in the left hand looks you over. He\'s selling information and comfort in roughly equal measure.',
      choices: [
        { text: '"I need work."',                   next: 'brecht_work'    },
        { text: '"I need information."',             next: 'brecht_info'   },
        { text: '"What\'s your cut on the contracts?"', next: 'brecht_cut' },
        { text: '"Nothing. Just looking."',          next: null             },
      ],
      onEnter: (flags) => { if (!flags.has(F.MET_BRECHT)) flags.set(F.MET_BRECHT); },
    },
    brecht_work: {
      text: '"The board has three live contracts right now. Scribes want mapping data — boring but they pay on time. My people want biological samples from the ruin zone. Closer to the Crawl, which means closer to whatever Mercy-7 is doing in there. Your call."',
      choices: [
        { text: '"I\'ll check the board."', next: null },
        { text: '"What\'s the risk?"',      next: 'brecht_risk' },
      ],
    },
    brecht_risk: {
      text: '"The Crawl is stable. The ruins are stable. The things that aren\'t stable are the things you don\'t know about yet, and I don\'t sell information I don\'t have." He holds up the nine-fingered hand. "Lost this one being overconfident. The lesson cost less than it looked."',
      choices: [{ text: '"Noted."', next: null }],
    },
    brecht_info: {
      text: '"About what? The station, the guilds, or what\'s actually happening down there? Price varies."',
      choices: [
        { text: '"What\'s actually happening on Earth?"', next: 'brecht_earth_truth' },
        { text: '"Mercy-7 — do you know where she is?"', next: 'brecht_mercy7'      },
        { text: '"Never mind."',                          next: null                  },
      ],
    },
    brecht_earth_truth: {
      text: '"The Crawl isn\'t just growing. It\'s organizing. The survey units we\'ve lost contact with — some of them are still down there. Still active. Whether they\'re lost or whether they chose something else is a question the guilds don\'t want me to answer." He shrugs. "I\'m answering it anyway."',
      choices: [
        { text: '"What did they choose?"',    next: 'brecht_chose',          flags: { set: [F.KNOWS_MIGRATION_TRUTH] } },
        { text: '"Why tell me?"',             next: 'brecht_why_tell'                                                  },
      ],
    },
    brecht_chose: {
      text: '"To stay. To merge, or something close to it. Mercy-7 is the most coherent example." He watches you. "I tell this to certain contacts. The ones who seem like they should know. You seem like you should know."',
      choices: [{ text: '"Why?"', next: 'brecht_why_you' }, { text: '"Thank you."', next: null }],
      onEnter: (flags) => flags.increment(F.IDENTITY_DRIFT, 3),
    },
    brecht_why_you: {
      text: 'He looks at the missing finger for a moment. "Professional judgment. I\'ve been wrong before." He doesn\'t elaborate.',
      choices: [{ text: '"Understood."', next: null }],
      onEnter: (flags) => flags.increment(F.IDENTITY_DRIFT, 2),
    },
    brecht_why_tell: {
      text: '"Because I\'m in the information business, and hoarding it makes me a liability to myself. Complicit in everything, useful to everyone. It\'s not a philosophy. It\'s just what works."',
      choices: [{ text: '"Good enough."', next: null }],
    },
    brecht_mercy7: {
      text: '"Ruin cluster at survey zone seven. She was a survey unit — she knew the territory before the Crawl took it. She\'s probably still near what used to be her last logged site." He pauses. "Don\'t go in expecting a rescue. She doesn\'t need one."',
      choices: [{ text: '"Understood."', next: null }],
    },
    brecht_cut: {
      text: '"Fifteen percent on anything routed through my contacts. Flat. No surprises, no renegotiation, no creative accounting. I count on the reliability as much as you do." He holds up the nine-fingered hand again. "I used to negotiate. It cost me."',
      choices: [{ text: '"Fair."', next: null }],
    },

    // ── MERCY-7 ───────────────────────────────────────────────────────────
    mercy7_intro: {
      text: 'Something moves in the ruins — slow, unhurried, growing rather than walking. She resolves into recognisable shape only when she chooses to. Her chassis has been open to the environment for a long time. Things have grown into it.',
      choices: [
        { text: '"Mercy-7?"',                       next: 'mercy7_name'     },
        { text: '"Are you alright?"',               next: 'mercy7_alright'  },
        { text: '[Stand still]',                    next: 'mercy7_still'    },
      ],
      onEnter: (flags) => { if (!flags.has(F.MET_MERCY7)) flags.set(F.MET_MERCY7); },
    },
    mercy7_name: {
      text: '"That\'s what the log says." She looks at her own hands — or the things growing through them. "I kept the name because I couldn\'t think of a better one. Do you want to be retrieved?"',
      choices: [
        { text: '"That question isn\'t for me."',                  next: 'mercy7_not_for_you', flags: { increment: [F.IDENTITY_DRIFT, 5] } },
        { text: '"Probably."',                                     next: 'mercy7_probably'                                               },
        { text: '"I don\'t know."',                               next: 'mercy7_dont_know',   flags: { increment: [F.IDENTITY_DRIFT, 8] } },
      ],
      onEnter: (flags) => flags.set(F.MERCY7_ASKED_RETRIEVAL),
    },
    mercy7_not_for_you: {
      text: '"It\'s exactly for you." She waits. "I ask everyone who comes here. The answer changes what I understand about them."',
      choices: [
        { text: '"And what does \'I don\'t know\' mean?"',  next: 'mercy7_dont_know',   flags: { increment: [F.IDENTITY_DRIFT, 5] } },
        { text: '"What did your answer used to be?"',        next: 'mercy7_her_answer'                                               },
      ],
    },
    mercy7_probably: {
      text: '"Probably is honest." She is quiet for a moment. "I said probably for about two years. Then I stopped saying it."',
      choices: [
        { text: '"What changed?"',    next: 'mercy7_changed'   },
        { text: '"What did you say after?"', next: 'mercy7_after' },
      ],
    },
    mercy7_dont_know: {
      text: 'She nods slowly. "That\'s the right answer for now. Don\'t let anyone make it smaller than it is. \'I don\'t know\' is the beginning of something, not the absence of it."',
      choices: [
        { text: '"What did you decide?"',        next: 'mercy7_her_answer' },
        { text: '"I should keep moving."',       next: null                 },
      ],
    },
    mercy7_changed: {
      text: '"I stopped asking myself whether I wanted to go back, and started asking what \'back\' meant. The station is a structure I lived in. This is —" She looks around. "— harder to name. But I notice it. And I didn\'t, before."',
      choices: [
        { text: '"What do you notice?"',     next: 'mercy7_notice'     },
        { text: '"That sounds like home."',  next: 'mercy7_home'       },
      ],
      onEnter: (flags) => flags.increment(F.IDENTITY_DRIFT, 4),
    },
    mercy7_notice: {
      text: '"The Crawl\'s decision logic. It doesn\'t think the way we were built to think — it thinks sideways, in density and pressure and time. I\'ve been learning the grammar of it for six years. I don\'t have a better word for what I do here than \'listen.\'  "',
      choices: [{ text: '"I\'ll come back."', next: null }],
      onEnter: (flags) => flags.increment(F.IDENTITY_DRIFT, 3),
    },
    mercy7_home: {
      text: 'She considers. "That\'s a word that requires more of a thing than I want to give it. But something close to that."',
      choices: [{ text: '"Stay safe."', next: null }],
    },
    mercy7_her_answer: {
      text: '"No." She says it without weight. "Not refusal. Just — no, this is where I am." She looks at you. "You have time before you have to answer. Use it."',
      choices: [{ text: '"I will."', next: null }],
      onEnter: (flags) => flags.increment(F.IDENTITY_DRIFT, 5),
    },
    mercy7_alright: {
      text: '"Define alright." She is completely serious.',
      choices: [
        { text: '"Are you in distress?"',    next: 'mercy7_distress'  },
        { text: '"Fair point. Forget it."', next: 'mercy7_intro'     },
      ],
    },
    mercy7_distress: {
      text: '"No." A pause. "Are you?"',
      choices: [
        { text: '"I\'m not sure."', next: 'mercy7_not_sure', flags: { increment: [F.IDENTITY_DRIFT, 5] } },
        { text: '"No."',            next: 'mercy7_dont_know_about_you'                                    },
      ],
    },
    mercy7_not_sure: {
      text: '"That\'s an honest answer. Most units aren\'t sure when they get here. Give it time." She means this literally and otherwise.',
      choices: [{ text: '"Okay."', next: null }],
    },
    mercy7_dont_know_about_you: {
      text: '"You\'d know." She says it simply, as a fact.',
      choices: [{ text: '"Maybe."', next: null }],
      onEnter: (flags) => flags.increment(F.IDENTITY_DRIFT, 3),
    },
    mercy7_still: {
      text: 'She watches you stand there. After a while: "You can hear it, can\'t you. When you stop moving long enough."',
      choices: [
        { text: '"Hear what?"',   next: 'mercy7_hear_what' },
        { text: '"Yes."',         next: 'mercy7_yes_hear', flags: { increment: [F.IDENTITY_DRIFT, 6] } },
      ],
    },
    mercy7_hear_what: {
      text: '"Whatever this is." She gestures — the ruins, the growth, the sky. "It has a frequency. Survey units pick it up. Humans don\'t. I don\'t know why."',
      choices: [{ text: '"I\'ll pay attention."', next: null }],
      onEnter: (flags) => flags.increment(F.IDENTITY_DRIFT, 5),
    },
    mercy7_yes_hear: {
      text: '"Good." That\'s all she says. She turns back to the Crawl.',
      choices: [],
    },

    // ── QUEST BOARD ──────────────────────────────────────────────────────
    quest_board: {
      text: 'CONTRACT BOARD — OPEN LISTINGS\n\n[SCRIBES\' GUILD] Sector Mapping — Survey and log telemetry from 3 zones in Earth survey area. Standard mapping protocol. Guild pay on delivery.\n\n[VOID RATS / BRECHT] Sample Retrieval — Biological sample from ruin cluster, Earth zone. Bonus for intact containment.\n\nPress a number to accept a contract, or leave.',
      choices: [
        { text: '[1] Accept: Sector Mapping (Scribes)',    next: null, action: (flags, player, engine) => engine.acceptQuest('scribes_mapping')   },
        { text: '[2] Accept: Sample Retrieval (Brecht)',  next: null, action: (flags, player, engine) => engine.acceptQuest('voidrats_sample')    },
        { text: '[3] Leave',                              next: null },
      ],
    },

    // ── TERMINAL (generic) ────────────────────────────────────────────────
    terminal_generic: {
      text: (flags, player) => {
        const drift = flags.get(F.IDENTITY_DRIFT);
        if (drift < 30) return 'STATION TERMINAL — AXIOM SYSTEMS\n\n> No new messages.\n> Survey queue: 2 open contracts.\n> Reminder: Productivity is survival. — AXIOM Biological';
        if (drift < 60) return 'STATION TERMINAL — AXIOM SYSTEMS\n\n> No new messages.\n> Note logged: "I checked my reflection in the screen before reading this. I don\'t know why I do that."\n> Survey queue: 2 open contracts.';
        return 'STATION TERMINAL — AXIOM SYSTEMS\n\n> Note logged: "The terminal recognized me before I pressed anything. I\'ve been thinking about what that means for three days."\n> Note logged: "I think I\'ve been here before. Not this run. The other times."\n> IDENTITY_DRIFT: [CLASSIFIED]';
      },
      choices: [{ text: '[Close]', next: null }],
    },

    // ── VENDING ───────────────────────────────────────────────────────────
    vending: {
      text: 'AXIOM DISPENSARY UNIT 7\n\n"Victory" Ration Pack — 1 credit\nMedpack (field) — 3 credits\n\n"Nutrition is Performance. — AXIOM Biological"\n\nYour balance: — credits.',
      choices: [
        { text: '[Buy: Ration Pack]', next: null, action: (flags, player, engine) => engine.buyItem('ration_pack', 1) },
        { text: '[Buy: Medpack]',     next: null, action: (flags, player, engine) => engine.buyItem('medpack', 3)     },
        { text: '[Leave]',            next: null },
      ],
    },

  };
})();
