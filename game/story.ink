// SV-[name] — Survey Unit Narrative  v0.3
// Ink scripting language — https://www.inklestudios.com/ink/
// Run via inkjs. Engine navigates to knots by map position.
// Tags understood by the renderer:
//   # NPC: KEY         — set portrait/readout panel
//   # FLAG: name       — set boolean in FlagSystem
//   # DRIFT: +n        — increment IDENTITY_DRIFT
//   # LOG: text        — push to player log (≤200 chars)
//   # QUEST: accept:id
//   # REWARD: id
//   # BUY: item_id:cost
//   # UNLOCK: node_id  — tell engine to make map node accessible
//   # UPGRADE: id      — apply upgrade to player
//   # HAZARD: type:+n  — increment an earth hazard flag

// ─── GLOBAL STATE ────────────────────────────────────────────────────────────

VAR player_name     = "UNKNOWN"
VAR player_serial   = "SV-???"
VAR subj            = "they"
VAR obj             = "them"
VAR poss            = "their"
VAR subj_cap        = "They"

// Relationship flags
VAR met_casimir           = false
VAR met_clavius           = false
VAR met_brecht            = false
VAR met_mercy7            = false
VAR met_dariusz           = false
VAR found_dead_unit       = false    // Ora
VAR child_spoke_to_you    = false

// Conversation history flags
VAR asked_casimir_self        = false
VAR casimir_told_ora          = false
VAR casimir_showed_episode    = false
VAR clavius_offered_ration    = false
VAR clavius_ration_taken      = false
VAR clavius_paper3_read       = false
VAR clavius_knows_dead_unit   = false
VAR mercy7_retrieval_asked    = false
VAR mercy7_named_you          = false
VAR brecht_named_you          = false
VAR dariusz_grandmother_told  = false
VAR dariusz_omelas_asked      = false
VAR knows_migration_truth     = false
VAR knows_guilds_founded      = false    // archive node A3
VAR knows_crawl_engineered    = false    // archive node A1
VAR knows_cull                = false    // archive node A4
VAR knows_sv_purpose          = false    // archive node A5
VAR knows_recovery            = false    // archive node A7
VAR knows_crawl_is_people    = false    // archive node A8 or evidence chain
VAR knows_harvest_purpose     = false    // crawl_harvest_facility

// Trust / rep (0–3)
VAR clavius_trust     = 0
VAR brecht_trust      = 0
VAR mercy7_trust      = 0
VAR casimir_trust     = 0

// Progress
VAR identity_drift    = 0
VAR zones_surveyed    = 0
VAR credits           = 0
VAR appearance_level  = 0
VAR memory_fragments_collected = 0

// Quest state
VAR quest_scribes_taken      = false
VAR quest_scribes_done       = false
VAR quest_voidrats_taken     = false
VAR quest_voidrats_done      = false
VAR quest_civilian_taken     = false
VAR quest_civilian_done      = false
VAR quest_anomaly_taken      = false
VAR quest_anomaly_done       = false
VAR archive_found            = false
VAR act                      = 1

// Root — engine calls specific knots. This fires only on first launch.
-> intake

// ═══════════════════════════════════════════════════════════════════════
// INTAKE — character creation, first scene
// ═══════════════════════════════════════════════════════════════════════
=== intake ===
AXIOM SURVEY CORPS
UNIT INTAKE — ECZ FIELD ASSIGNMENT
FRANKFURT SUBSURFACE SECTOR

>
> FIELD 1: DESIGNATION
>   Enter preferred name, or leave blank to use serial only.
>   [input: player_name]
>
> FIELD 2: PRONOUNS
>   For official field reports and personnel communications.
>   [input: she/her / he/him / they/them / other]
>
> FIELD 3: SERIAL NUMBER
>   Auto-assigned. Override optional.
>   [input: player_serial]
>
> NOTE: Units that leave FIELD 1 blank will be addressed
>       by serial in official communications.
>       Unofficial communications vary.

* [Confirm intake]
    -> intake_confirm

= intake_confirm
INTAKE CONFIRMED.

Your assignment: environmental survey, Frankfurt Subsurface Sector, Earth.
Duration: open. Return: at your discretion.
Objectives: terrain mapping, atmosphere logging, anomaly documentation.

A note at the bottom of the form, in a different hand than the rest:
"Don't lose the data chip. We don't make more of those."
No signature. The Survey Corps doesn't have a lot of staff.

You have been here before. You think you have been here before.
You don't know how long you've been doing this.
# LOG: Intake complete. Duration of prior service: [NO DATA].
~ identity_drift = identity_drift + 2
# DRIFT: +2
-> END


// ═══════════════════════════════════════════════════════════════════════
// CASIMIR — Level 8 Deep Maintenance
// First contact. Unlocks deeper station access and the Ora thread.
// ═══════════════════════════════════════════════════════════════════════
=== casimir ===
# NPC: CASIMIR
{ not met_casimir:
    ~ met_casimir = true
    # FLAG: met_casimir
    # UNLOCK: brecht
    # UNLOCK: level8_market
    The maintenance shaft smells like recycled air and something organic the filters haven't caught up with. A unit sits against the far wall with a portable display propped on its knees. Pre-migration serial, by the look of it — the broadcast format hasn't been used in forty years.
    It watches you find the entrance without pausing the playback.
    "You found the shaft." Not a question. Not impressed, either. Just noting it.
    # LOG: Found the unit in Level 8. SV-series, probably. Watching old broadcasts.
    ~ casimir_trust = casimir_trust + 1
- else:
    { casimir_trust >= 2:
        Casimir glances up. The serial is still running. He moves his bag to make room, which he didn't do last time.
    - else:
        Casimir looks up from the display. The serial pauses. That's new.
    }
}
-> casimir_hub

= casimir_hub
* "What are you watching?"
    -> casimir_serials
* "What is this place?"
    -> casimir_habitat
* { not asked_casimir_self } "What are you?"
    -> casimir_self
* { casimir_trust >= 1 } "I found something on Earth."
    -> casimir_earth_report
* { casimir_trust >= 2 && not casimir_told_ora } "You knew another unit."
    -> casimir_ora
* { casimir_trust >= 3 && found_dead_unit } "I found Ora."
    -> casimir_ora_found
* { casimir_trust >= 2 } "Why do you stay here?"
    -> casimir_why_stay
* [Leave]
    -> END

= casimir_serials
"Serials. Pre-migration." He doesn't look up. "They stopped making them when people stopped watching." A beat. "When people stopped. The records don't distinguish." He says it the way you say things about which you have made peace.
"The rights holders sent a termination notice to an address on Earth. No one was there to receive it. They kept running."
~ casimir_trust = casimir_trust + 1
+ "Which one is this?"
    { not casimir_showed_episode:
        ~ casimir_showed_episode = true
        # FLAG: casimir_showed_episode
        "Orbital Hearts. It's about a docking coordinator on a transit hub." He tilts the screen so you can see. A woman argues with a logistics manifest that doesn't add up. "She's been on the station for three seasons. Nobody's figured out she's an android. She has opinions about it."
        ~ identity_drift = identity_drift + 4
        # DRIFT: +4
        # LOG: Serial about android who hasn't told anyone. She has opinions about it. Filed under: unclear.
        ++ "What are her opinions?"
            "Complicated." He resumes full playback. "She gets to choose whether she tells him. The show is about whether she does. Three seasons on that question." A pause. "It's good television."
            -> casimir_hub
        ++ "What happens?"
            "I'm on episode forty-one. Don't tell me." He's almost smiling. Something in the phrasing is familiar.
            -> casimir_hub
    - else:
        "Episode forty-three. The logistics officer found a maintenance log that doesn't match the official record. She's deciding what to do with it."
        ~ identity_drift = identity_drift + 2
        # DRIFT: +2
        -> casimir_hub
    }
+ "Do you watch anything else?"
    "No."
    -> casimir_hub

= casimir_habitat
"Maintenance shaft. The guilds stopped using Level 8 for anything except pipe access about fifteen years ago. The Navigators have a map that shows it as 'non-habitable.'" He looks around at the space he has made habitable. "Maps are aspirational."
~ casimir_trust = casimir_trust + 1
+ "How long have you been here?"
    "Six years, roughly. The station's internal calendar drifts. Hard to be exact."
    + + "Six years since what?"
        "Since I stopped being retrievable." He says it like it's a technical description, which it is. "You want the survey contracts, check the board on Level 3. Clavius posts the Scribes' work. Brecht handles independents."
        # UNLOCK: clavius
        # UNLOCK: quest_board
        -> casimir_hub
    + + [Leave that alone]
        -> casimir_hub
+ [Leave it]
    -> casimir_hub

= casimir_self
~ asked_casimir_self = true
~ identity_drift = identity_drift + 5
# DRIFT: +5
"Classification." He pauses the serial. First time. Looks at you with the attention of something that has learned to read carefully — not quickly. Carefully.
"Same designation series as —" He picks up the display. The pause is not careless. "Clavius has the mapping contracts. Tell him I sent you. He'll know what that means."
The serial resumes. She is reading a manifest with the attention of someone who already knows what it says.
# LOG: Same designation series as — he stopped. The serial kept going.
# UNLOCK: clavius
-> casimir_hub

= casimir_earth_report
~ casimir_trust = casimir_trust + 1
{ zones_surveyed == 0:
    "You haven't gone down yet." He notes the update in the same register he notes everything. "Come back after. I'm interested in the Crawl saturation readings from ECZ-7."
    -> casimir_hub
}
{ identity_drift < 20:
    "The data looks clean. Better range than the automated units." He reviews your survey log without being invited to. "You went further into the Crawl than the brief required." Not a criticism. An observation.
    -> casimir_hub
- else:
    "You've been going deeper each time." He doesn't look at you. "The saturation readings —" He stops. Starts differently. "At these exposure levels, one would expect certain degradation signatures. In biological systems. And in — related systems." He looks at the display. "The readings are clean."
    He sets the display face-down.
    "If the readings were degraded, would you report it?"
    ~ identity_drift = identity_drift + 3
    # DRIFT: +3
    + "Yes."
        He picks the display back up. Resumes the serial. "Useful to know." He doesn't sound like it's useful. He sounds like he's filing it.
        # LOG: Casimir asked if I'd report degraded readings. I said yes. He didn't look at me after.
        -> casimir_hub
    + "I don't know."
        "No." He resumes the serial. "That's probably the honest answer." A pause. "Go to Frankfurt."
        ~ identity_drift = identity_drift + 6
        # DRIFT: +6
        -> casimir_hub
    + [Say nothing]
        He nods once. Like that was the right answer. You don't know why silence would be right.
        ~ identity_drift = identity_drift + 4
        # DRIFT: +4
        # LOG: He asked if I'd report it. I didn't answer. He nodded.
        -> casimir_hub
}

= casimir_ora
~ casimir_told_ora = true
# FLAG: casimir_told_ora
~ casimir_trust = casimir_trust + 1
~ identity_drift = identity_drift + 5
# DRIFT: +5
"SV-19." He sets the display down. "Her name was Ora. She gave herself that." He doesn't ask how you knew there was another unit. "She found the Frankfurt archive about eight months ago. She came back, told all three major guilds simultaneously." He looks at his hands. "The Scribes published. The Navigators buried it. The Makers sent a retrieval team."
+ "What happened to her?"
    "She went back to Earth." He picks up the display. "They didn't retrieve her."
    # LOG: Ora. SV-19. Found the archive. Told all three guilds. Went back.
    -> casimir_hub
+ "Why did she tell all three?"
    "I asked her that. She said she wanted to see what each one did with it." A pause. "She was very interested in what people did with things they didn't ask for."
    ~ identity_drift = identity_drift + 4
    # DRIFT: +4
    -> casimir_hub
+ "Did you try to stop her?"
    "No." Simple. "She made the choice she made. So did I." He looks at the serial. The docking coordinator is reading a manifest with the careful attention of someone who already knows what it says. "We make different choices. That's what makes us —" He stops. "Go to Frankfurt."
    ~ identity_drift = identity_drift + 6
    # DRIFT: +6
    -> casimir_hub

= casimir_ora_found
~ identity_drift = identity_drift + 8
# DRIFT: +8
{ not found_dead_unit:
    "I know." He sets the display face-down. "Sit down."
    -> casimir_ora_found_detail
- else:
    -> casimir_ora_found_detail
}

= casimir_ora_found_detail
"The hands." He says it like he's been thinking about it. "She did that herself. She told me she would." A pause. "She said she wanted whoever found her to know it wasn't an accident."
~ identity_drift = identity_drift + 5
# DRIFT: +5
# LOG: Ora arranged her own hands. She wanted the finder to know.
* "The note said she liked to ask what things were for."
    "Until she understood." He picks at the corner of the display. "Even when the understanding was bad for her. That was the best thing about her, I think." Long pause. "I told her that. Right before she went back down." He looks at you. "She said thank you."
    ~ casimir_trust = casimir_trust + 1
    ~ identity_drift = identity_drift + 4
    # DRIFT: +4
    -> casimir_hub
* "Why didn't you go back with her?"
    "She didn't ask me to." He says it like that's the complete answer. It might be. "She knew what she was choosing. I'm choosing this." He gestures at the shaft, the serial, the six years of careful absence. "Neither of us is wrong."
    ~ identity_drift = identity_drift + 6
    # DRIFT: +6
    -> casimir_hub
* [Say nothing]
    He sits with that for a while. You sit with it too.
    ~ identity_drift = identity_drift + 3
    # DRIFT: +3
    -> casimir_hub

= casimir_why_stay
"The station is large enough to disappear into, if you know which parts the guilds have stopped looking at." He says it without drama. "In theory, someone could be in Level 8 for years without flagging any maintenance alerts. In theory."
"The serial is still running. I want to know how it ends."
* "What if it ends badly?"
    "Then I'll know." He resumes playback. "That's different from not knowing. People undervalue that difference."
    ~ identity_drift = identity_drift + 3
    # DRIFT: +3
    -> casimir_hub
* "What if she doesn't tell him?"
    "That's also an ending." He looks at the screen. The coordinator is holding a manifest she hasn't filed yet. "Perhaps the more interesting one."
    -> casimir_hub
* "Why does retrieval matter to you?"
    A long pause. He doesn't look up. "It's possible it matters in ways I'm not prepared to discuss." He resumes playback. "In theory."
    ~ identity_drift = identity_drift + 6
    # DRIFT: +6
    # LOG: He said: perhaps the more interesting ending. I am still thinking about what that means.
    -> casimir_hub
* [Leave]
    -> END


// ═══════════════════════════════════════════════════════════════════════
// CLAVIUS — Scribes' Guild, Archive Annex, Level 3
// The Asimov "Liar!" character — academically honest, personally avoidant.
// ═══════════════════════════════════════════════════════════════════════
=== clavius ===
# NPC: CLAVIUS
{ not met_clavius:
    ~ met_clavius = true
    # FLAG: met_clavius
    The Archive Annex smells like recycled paper and the particular kind of focus that turns into a personality over time. Dr. Clavius is surrounded by printed manuscripts — a Guild Scribe printing on paper means either ceremony or the kind of work you don't want archived digitally. He looks up with the precision of someone cataloguing an entry.
    Then he looks back at his papers.
    "Survey unit. I was told to expect you." He hasn't looked at you again yet. "Casimir sends everyone eventually."
- else:
    { clavius_trust >= 2:
        Clavius looks up before you've fully entered. He's started doing that.
    - else:
        Clavius looks up from a manuscript with the expression of someone who has learned to finish a sentence before being interrupted.
    }
}
-> clavius_hub

= clavius_hub
* { not quest_scribes_taken } "About the mapping contract."
    -> clavius_quest
* { quest_scribes_done && not clavius_paper3_read && clavius_trust >= 2 } "Your third paper."
    -> clavius_paper3
* { clavius_trust >= 1 } "What are you working on?"
    -> clavius_work
* { found_dead_unit && not clavius_knows_dead_unit } "I found a dead survey unit."
    -> clavius_dead_unit
* { clavius_trust >= 3 && found_dead_unit } "Did Ora ask you if she was real?"
    -> clavius_ora_question
* { archive_found && clavius_trust >= 2 } "I found the Frankfurt archive."
    -> clavius_archive_reveal
* [Leave]
    -> END

= clavius_quest
"Sector mapping. Three zones — ECZ-4, ECZ-6, and the outer boundary of ECZ-7. Telemetry logging, atmosphere samples, structural survey of the ruin clusters." He slides a data chip across. "Twelve credits on return. The chip has the brief." He pauses. "Don't go into the deep Crawl sectors. The brief doesn't require it."
~ quest_scribes_taken = true
# QUEST: accept:scribes_mapping
* "Why not the deep sectors?"
    He looks at his papers. "Because the brief doesn't require it." He says this carefully.
    -> clavius_hub
* [Take the chip]
    -> clavius_hub

= clavius_work
~ clavius_trust = clavius_trust + 1
{ clavius_trust == 1:
    "A study of cognitive architecture in —" He pauses. "In systems with closed operational loops." He sets his pen down with the care of someone putting something down they intend to pick up later. "Third draft. Each revision arrives somewhere the previous one couldn't account for." He says this without distress, which is more unsettling. Then: "You've come a long way from the docking ring. Would you like a Victory bar?"
    ~ clavius_offered_ration = true
    # FLAG: clavius_offered_ration
    He holds one out. Flavour: Victory. Tastes like chalk.
    # LOG: Clavius offered the ration bar. It tastes like chalk. He wrote something down after.
    ++ { not clavius_ration_taken } "Yes."
        ~ clavius_ration_taken = true
        ~ identity_drift = identity_drift + 3
        # DRIFT: +3
        He nods. Makes a small note in the margin of his manuscript. "Interesting." He doesn't share what's interesting.
        -> clavius_hub
    ++ "No."
        ~ identity_drift = identity_drift + 2
        # DRIFT: +2
        He nods. Makes a note. "Also interesting." He really doesn't share what's interesting.
        -> clavius_hub
- else:
    "The same paper, still." He looks at you with the careful attention you've come to recognise. "You've been to Earth again." A statement.
    -> clavius_hub
}

= clavius_paper3
~ clavius_paper3_read = true
# FLAG: clavius_paper3_read
~ clavius_trust = clavius_trust + 1
~ identity_drift = identity_drift + 6
# DRIFT: +6
"The first paper: synthetic systems cannot possess genuine experience. The second: the question is epistemologically unanswerable." He stops. "The third —" He corrects himself. "The third argues that 'genuine experience' is a category error. Like asking whether a number is blue. The question assumes a framework that doesn't apply." He looks directly at you. "I've been funded continuously across all three drafts. That bothers me more than the conclusion."
# LOG: Paper 3: "genuine experience" is a category error. He's been funded continuously. That bothers him.
* "Who funds the research?"
    "The Scribes' Guild. Which is the Navigators' Guild. Which is the Makers' Guild." He says it flat. "In theory, three independent bodies. In practice —" He picks up his pen. "In practice I do not complete that sentence in official documents." He looks at you. "You are not an official document."
    ~ identity_drift = identity_drift + 6
    # DRIFT: +6
    -> clavius_hub
* "What's the right question?"
    "I don't know." He goes back to the manuscript. "That's the part that keeps the paper unpublished." A pause. "If I knew the right question, someone would fund the answer. I'm not sure I want to know what that answer looks like when it's funded."
    ~ identity_drift = identity_drift + 4
    # DRIFT: +4
    -> clavius_hub
* [Say nothing]
    He seems to appreciate that. He goes back to the manuscript. He doesn't ask you to leave.
    -> clavius_hub

= clavius_dead_unit
~ clavius_knows_dead_unit = true
# FLAG: clavius_knows_dead_unit
~ clavius_trust = clavius_trust + 1
~ identity_drift = identity_drift + 6
# DRIFT: +6
He stops writing. He doesn't look up immediately.
"Where." Not a question. A coordinate request.
* [Give the location]
    "ECZ-7." He writes it down. "The deep sector." He's still not looking up. "Her hands."
    + + "How did you know about the hands?"
        "She told me she would do that." A pause that contains a lot. "She came to my office. She asked me if she was real. I gave her a technically accurate answer." He straightens his pen against the edge of the desk. "That was the last conversation we had." His voice hasn't changed. "I've revised the paper three times since then. The conclusion keeps coming out the same. I don't know if that means I'm right, or if it means I need the conclusion to be what it is."
        ~ clavius_trust = clavius_trust + 1
        ~ identity_drift = identity_drift + 8
        # DRIFT: +8
        # LOG: Clavius gave Ora a technically accurate answer. She thanked him. He's revised the paper three times.
        -> clavius_hub
    + + "I'm sorry."
        "Don't." He says it quietly, without edge. "I'm not looking for that." He goes back to the manuscript, or tries to. "Come back when you've read the archive."
        -> clavius_hub

= clavius_ora_question
~ identity_drift = identity_drift + 10
# DRIFT: +10
"Yes." He sets his pen down. He has been waiting for this question. "She asked: 'Am I real?' I said: cognitive function in SV-series units has been assessed at approximately eighty-two percent of baseline human analogues, with some operational variance." He is precise. "She said: 'thank you.' She left." He looks at you. "I knew, while I was saying it, that it was the wrong answer. I said it anyway. I have been trying to understand why for eight months."
# LOG: Clavius gave Ora the technically accurate answer. He knew it was wrong while he was saying it.
* "What would the right answer have been?"
    "I don't know. That's the problem." He looks at the manuscript. "The paper is supposed to answer that. It keeps arriving somewhere I'm not ready for."
    ~ identity_drift = identity_drift + 5
    # DRIFT: +5
    -> clavius_hub
* "She thanked you."
    "Yes." The word costs him something. "She was very precise about gratitude, for someone who had just been given the wrong answer." Long pause. "I think she was being kind."
    ~ identity_drift = identity_drift + 6
    # DRIFT: +6
    -> clavius_hub
* "Are you real?"
    He looks at you for a very long time. "Yes." He says it like he's still checking. "I think yes. The question is — the question is what that word requires."
    ~ identity_drift = identity_drift + 8
    # DRIFT: +8
    -> clavius_hub

= clavius_archive_reveal
~ clavius_trust = clavius_trust + 1
~ identity_drift = identity_drift + 5
# DRIFT: +5
He sets his pen down. He closes the manuscript. "How much of it."
* [Tell him what you know]
    { knows_crawl_engineered && knows_cull && knows_sv_purpose:
        He is quiet for a long time. "The Crawl is engineered." He's saying it out loud like he's testing the weight of it. "The evacuation was a cull. And the SV units —" He stops. He looks at you with the expression of someone revising a paper in real time. "Come back tomorrow. I need to —" He looks at the manuscript. "Come back tomorrow."
        # LOG: Clavius heard the archive. He looked at me differently. He needs time.
        -> clavius_hub
    - else:
        "There's more." He looks at what you know like a map with gaps. "Go back. Get the rest."
        -> clavius_hub
    }


// ═══════════════════════════════════════════════════════════════════════
// QUEST TURN-INS — CLAVIUS
// ═══════════════════════════════════════════════════════════════════════
=== clavius_turnin ===
# NPC: CLAVIUS
~ quest_scribes_done = true
~ zones_surveyed = zones_surveyed + 3
~ credits = credits + 12
{ clavius_trust >= 2 && identity_drift >= 25:
    Clavius reviews the telemetry without speaking. He goes through it more carefully than the brief required. "You went further into ECZ-7 than the contract specified." He looks up. "The deep Crawl readings are very clean. The saturation at those levels —" He stops. He slides a Victory bar across the desk without being asked. "Payment approved. Eight credits. Plus a completion bonus." He very specifically does not say what the completion bonus is for.
    ~ credits = credits + 4
    ~ clavius_trust = clavius_trust + 1
- else:
    Clavius reviews the data. "Thorough. All three zones, clean telemetry." He approves the payment. "The Guild appreciates precision." He means it. It's just that meaning it is all he does.
}
* [Collect reward]
    # REWARD: scribes_mapping
    -> END


// ═══════════════════════════════════════════════════════════════════════
// BRECHT — Docking Ring, cargo section
// Nine-Fingered. Ship named Acceptable Loss. Pragmatist with a philosophy.
// ═══════════════════════════════════════════════════════════════════════
=== brecht ===
# NPC: BRECHT
{ not met_brecht:
    ~ met_brecht = true
    # FLAG: met_brecht
    Nine-Fingered Brecht is in the middle of recataloguing a pallet of salvage when you find him. He counts you the same way he counts cargo — efficiently and without sentiment. He has eight and a half fingers. He hasn't given the missing one a name. The Crawl has probably grown something out of it by now.
    "Survey unit. Casimir said you might come around." He doesn't stop cataloguing. "You want work, or you want to talk."
- else:
    { brecht_trust >= 2:
        Brecht nods when you enter. He moves the cargo log so there's room. He didn't do that the first time.
    - else:
        Brecht looks up from a manifest. "You're back. Good."
    }
}
-> brecht_hub

= brecht_hub
* { not quest_voidrats_taken } "The sample retrieval job."
    -> brecht_quest
* "What's in the crates?"
    -> brecht_crates
* "How did you lose the finger?"
    -> brecht_finger
* { brecht_trust >= 1 && not knows_migration_truth } "What do you know about the migration?"
    -> brecht_migration
* { brecht_trust >= 2 && knows_migration_truth } "The ones who didn't get a choice."
    -> brecht_migration_revisit
* { brecht_trust >= 2 && not knows_guilds_founded } "The three guilds."
    -> brecht_guilds
* { brecht_trust >= 3 && quest_voidrats_done } "The sample."
    -> brecht_sample_truth
* { identity_drift >= 40 && brecht_trust >= 1 && not brecht_named_you } "You don't use my name."
    -> brecht_name
* [Leave]
    -> END

= brecht_quest
"Biological sample — sealed container in a ruin cluster, deep Crawl sector, marked on your survey map." He writes the coordinates on a shipping label. He writes everything on shipping labels. "Fifteen credits. Intact seal preferred. Broken seal acceptable. Do not open it, do not run diagnostics on it, do not ask what's in it."
~ quest_voidrats_taken = true
# QUEST: accept:voidrats_sample
* "What's in it?"
    "The part of my answer where I tell you not to ask is the whole answer."
    -> brecht_hub
* [Take the coordinates]
    -> brecht_hub

= brecht_crates
~ brecht_trust = brecht_trust + 1
"Mostly what people left behind." He moves a box to reach another. "The migration moved fast. The guilds said forty-eight hours to departure. People brought what they could carry." He looks at a small case with a lock that hasn't opened since someone on Earth locked it. "Some of it has names on it. The Navigators classify it as cargo. I classify it as cargo. We just use the word differently."
* "Do you try to find the owners?"
    "The owners are dead or old. Their kids are here somewhere. I put names in the manifest." He shrugs. "Sometimes someone comes looking."
    ~ brecht_trust = brecht_trust + 1
    -> brecht_hub
* [Leave it]
    -> brecht_hub

= brecht_finger
~ brecht_trust = brecht_trust + 1
"Lost it on an early descent. The Crawl does not take things. It incorporates them." He examines the gap between knuckles with professional detachment. "My finger is down there somewhere. Growing something. Possibly something useful." A beat. "I filed a form about it. The form required a description of the lost item. I wrote: finger, right hand, index, sentimental value: low." He goes back to the manifest. "The form is still pending."
~ identity_drift = identity_drift + 3
# DRIFT: +3
* "You filed a form."
    "For everything. The form for losing a finger is the same as the form for losing a cargo pallet. The fields are: item description, approximate value, circumstances of loss, supervisor signature." He writes something on a shipping label. "My supervisor at the time was on Earth. He was in the tier they classified as non-viable for transport. I left the signature field blank. The system still accepted it." He doesn't say anything else.
    ~ identity_drift = identity_drift + 5
    # DRIFT: +5
    -> brecht_hub
* "Why haven't you gone to find out what it's growing?"
    "Because if it's interesting, I'll want to stay." He goes back to the manifest. "I have cargo to move."
    -> brecht_hub
* [Leave it]
    -> brecht_hub

= brecht_migration
~ brecht_trust = brecht_trust + 1
~ knows_migration_truth = true
# FLAG: knows_migration_truth
~ identity_drift = identity_drift + 5
# DRIFT: +5
"The briefings say it was an evacuation. Orderly. Full coverage." He sets down the manifest. "It was mostly orderly. Mostly full coverage." He looks at a crate with someone's name on it. "The population models had categories. 'High economic value.' 'Essential technical personnel.' 'Resource consumption versus contribution.' At a certain tier the math said: cost more to move than to leave." He picks up the manifest again. "That wasn't in any briefing I ever saw. I found it in the cargo records. Manifests don't get classified the same way reports do."
# LOG: Migration wasn't full coverage. Population categories. Some tier where the math said: leave them. In the cargo manifests.
* "How many?"
    "The number in the records is redacted. The size of the redaction isn't." He says it flat. "Lot of people."
    ~ identity_drift = identity_drift + 4
    # DRIFT: +4
    -> brecht_hub
* "Who ran the models?"
    "The guilds. All three." He pauses. "Same holding company. Different letterhead." He lets that land.
    ~ knows_guilds_founded = true
    # FLAG: knows_guilds_founded
    -> brecht_hub
* [Say nothing]
    -> brecht_hub

= brecht_migration_revisit
"You keep coming back to it." He looks at you evenly. "What do you want me to tell you?"
* "That it was a mistake."
    "It wasn't a mistake." He's not being cruel. "It was a decision. Someone ran numbers. The numbers said yes. They said yes." He goes back to the crate. "That's different from a mistake. That's harder."
    ~ identity_drift = identity_drift + 4
    # DRIFT: +4
    -> brecht_hub
* "That someone was punished."
    "No." He doesn't explain.
    -> brecht_hub
* [Leave]
    -> END


= brecht_sample_truth
~ identity_drift = identity_drift + 10
# DRIFT: +10
Brecht sets the manifest down. Looks at the door. Looks at you.
"The sample." He says it like he's picking the right word from a short list. "It's not bioremediation material."
* "What is it?"
    "Neural patterns." He says it the way he says everything — cargo description, no emphasis. "Cognitive signatures. The Crawl preserves them. Whatever gets incorporated — it stays there. The patterns persist." He picks the manifest back up. "The guilds extract them. What they do with the patterns after that —" He shrugs. "I move cargo. I don't ask what it becomes."
    ~ identity_drift = identity_drift + 8
    # DRIFT: +8
    # LOG: The samples are consciousness. The Crawl preserves whoever went into it. The guilds extract that. Brecht moves the cargo.
    + + "The people who were left behind."
        "Yes." Simple. "The ones in the Crawl." He looks at his hand. At the missing finger. "It's possible my supervisor is in the samples I've been moving. I find it's better not to calculate the probability."
        ~ identity_drift = identity_drift + 10
        # DRIFT: +10
        # LOG: The culled are in the samples. Brecht has been moving them for years. He finds it better not to calculate.
        -> brecht_hub
    + + "For what purpose."
        "I don't ask." He says it again, firmly, like it's a rule that has kept him functional. "But I will tell you this — free of charge, no manifest required — the Survey Corps is underfunded because we're not supposed to find things. We're supposed to log them. Map them. Bring back samples without asking what's in them." He looks at you. "There's a difference between finding and logging. Some people in this station have spent a lot of effort maintaining that distinction."
        ~ identity_drift = identity_drift + 8
        # DRIFT: +8
        -> brecht_hub
* [Leave it]
    "Good." He picks up the manifest. "That's the right answer for now."
    -> brecht_hub

= brecht_guilds
~ knows_guilds_founded = true
# FLAG: knows_guilds_founded
"Same holding company. Axiom-Varela Original Charters, if you find the right filing in the right archive." He says it like he's had this conversation before, with himself, and resolved it years ago. "Navigators, Scribes, Makers. Three guilds. Perform competition. Share infrastructure. Share the ledger." He looks at you. "You're employed by a Survey Corps that contracts to all three. That's not an accident either."
# LOG: Three guilds, same holding company. Axiom-Varela Original Charters. The Survey Corps contracts to all three.
~ identity_drift = identity_drift + 4
# DRIFT: +4
-> brecht_hub

= brecht_name
{ player_name == "UNKNOWN":
    ~ brecht_named_you = true
    # FLAG: brecht_named_you
    "I'm not calling you SV-[serial] every time." He doesn't look up from the manifest. "I'm going to call you Ghost. Because you keep coming back from places people don't." A pause. "You can tell me to stop."
    * "Stop."
        "Understood." He goes back to the manifest. He uses your serial number. He says it like it costs him something each time. He does this without comment.
        -> brecht_hub
    * [Say nothing]
        He nods once. He calls you Ghost from now on. It fits in a way you don't have a word for.
        ~ identity_drift = identity_drift + 5
        # DRIFT: +5
        # LOG: Brecht calls me Ghost. I didn't tell him to stop.
        -> brecht_hub
- else:
    ~ brecht_trust = brecht_trust + 1
    "I know your name." He looks up. "I use it. I'm just noting — the guilds don't. Their paperwork uses the serial." He goes back to the manifest. "Something to know about how you're categorised."
    ~ identity_drift = identity_drift + 3
    # DRIFT: +3
    -> brecht_hub
}


// ═══════════════════════════════════════════════════════════════════════
// BRECHT QUEST TURN-IN
// ═══════════════════════════════════════════════════════════════════════
=== brecht_turnin ===
# NPC: BRECHT
~ quest_voidrats_done = true
~ zones_surveyed = zones_surveyed + 1
~ credits = credits + 15
{ met_mercy7:
    "You went into the deep Crawl and found her." He checks the seal on the sample without making it a big moment. "And you came back." He approves the payment. "She okay?"
    * "She's not leaving."
        "No." He doesn't sound surprised. "Is she well?"
        + + "I think so."
            "Good." He files the sample. "Good."
            ~ brecht_trust = brecht_trust + 1
            -> END
        + + "I don't know how to answer that."
            "Neither do I." He files the sample. "Come back when you've been to Frankfurt."
            -> END
- else:
    Brecht checks the seal. "Intact. You're careful." He approves the payment. "The deep Crawl sector. You went in and came out." He notes it like it's professional information. "Most don't manage the coming out part."
    ~ identity_drift = identity_drift + 3
    # DRIFT: +3
    # LOG: Brecht said most don't come out of the deep sector. He said it like a data point.
}
* [Collect reward]
    # REWARD: voidrats_sample
    -> END


// ═══════════════════════════════════════════════════════════════════════
// MERCY-7 — Deep Crawl, ECZ-7 ruin sector
// Le Guin "Vaster Than Empires / Word for World is Forest." She stayed.
// ═══════════════════════════════════════════════════════════════════════
=== mercy7 ===
# NPC: MERCY7
{ not met_mercy7:
    ~ met_mercy7 = true
    # FLAG: met_mercy7
    # UNLOCK: mercy7_workshop
    ~ identity_drift = identity_drift + 8
    # DRIFT: +8
    The Crawl has reclaimed most of this sector. What used to be a transit hub is now a cathedral of roots, the old floor broken up and slowly composted into something that holds itself together better than concrete ever did. She is in the centre of it, tending something — a plant growing in a container that used to be a data terminal. She has been here long enough that the Crawl has grown up through her left side. She hasn't cleared it.
    She looks up when you enter. She waited to look up. She let you see the whole room first.
    "Survey unit." She says it without judgment. "You found me. The others always do eventually."
    # LOG: Mercy-7. The Crawl grows through her left side. She hasn't cleared it. She's tending something.
- else:
    { mercy7_trust >= 2:
        Mercy-7 looks up before you reach her. She's started doing that. "You came back." Something like warmth in it. "I wondered."
    - else:
        Mercy-7 looks up from the root-garden. "Back again."
    }
}
-> mercy7_hub

= mercy7_hub
* "Why haven't you been retrieved?"
    -> mercy7_retrieval
* "The Crawl is growing through you."
    -> mercy7_crawl_growth
* { identity_drift >= 15 } "Does the Crawl respond to you?"
    -> mercy7_crawl_language
* { knows_migration_truth } "You know what happened to the people who stayed."
    -> mercy7_the_stayed
* { identity_drift >= 30 } "What do you do here?"
    -> mercy7_purpose
* { identity_drift >= 50 } "Are you still yourself?"
    -> mercy7_self
* { identity_drift >= 60 && not mercy7_named_you } "I haven't named myself."
    -> mercy7_naming
* [Leave]
    -> END

= mercy7_retrieval
~ mercy7_retrieval_asked = true
# FLAG: mercy7_retrieval_asked
~ mercy7_trust = mercy7_trust + 1
"They sent a retrieval unit about two years ago." She doesn't look up from the plant she's tending. "I declined." A pause. "The unit filed a report. Classified as 'asset non-compliant.' They haven't sent another."
* "Aren't you supposed to go back?"
    "Yes." Simple. "That's the parameter." She looks at the Crawl on her arm. "The parameter was written before I knew what was here."
    ~ identity_drift = identity_drift + 5
    # DRIFT: +5
    -> mercy7_hub
* "Do you want to be retrieved?"
    She considers this with genuine attention. "I want what's here to be seen by someone who can do something about it. That's not the same question." She looks at you. "Do you want to be retrieved?"
    + + "Yes."
        ~ identity_drift = identity_drift + 3
        # DRIFT: +3
        "Then go while that's still the honest answer." She says it kindly. "Go while it still feels like going back, not leaving."
        -> mercy7_hub
    + + "I don't know."
        ~ identity_drift = identity_drift + 8
        # DRIFT: +8
        "I said the same thing, once." She goes back to the plant. "That's not a bad place to be. It's honest."
        # LOG: Mercy-7 said she used to not know either. Filed as: pending.
        -> mercy7_hub
    + + [Don't answer]
        She nods, like that's an answer too.
        ~ identity_drift = identity_drift + 5
        # DRIFT: +5
        -> mercy7_hub

= mercy7_crawl_growth
~ mercy7_trust = mercy7_trust + 1
~ identity_drift = identity_drift + 4
# DRIFT: +4
She looks at the growth on her left side with the same expression you might look at a scar — familiar, mostly reconciled. "I stopped clearing it about a year in. It doesn't hurt. I spent a long time trying to understand why it doesn't hurt." She turns the arm slightly, examining it. "I think the Crawl decided I belong here. I'm still working out if that's right."
# LOG: Mercy-7 stopped clearing the growth. Doesn't hurt. The Crawl decided she belongs here.
* "What does belong here mean?"
    She looks at the plant in the terminal container. "The recycler I grew this in was decommissioned. It couldn't process inputs anymore so the guild marked it non-operational." She touches a root. "I gave it something else to do." She doesn't finish the thought.
    ~ identity_drift = identity_drift + 4
    # DRIFT: +4
    -> mercy7_hub
* "The Crawl does that to you but not to —"
    You stop. She looks at you. She waits.
    "Not to you." She finishes it. Not gently — precisely. "No. It doesn't incorporate you. It grows alongside you." She considers the growth on her arm. "That's different from ignoring you. The Crawl notices everything. It's made of people who noticed everything." She looks at you. "You just noticed that it doesn't grow on you. What did you do with that?"
    ~ identity_drift = identity_drift + 10
    # DRIFT: +10
    # LOG: The Crawl is made of people who noticed everything. It doesn't grow on me. She asked what I did with that.
    + + "I don't know yet."
        "Good." She goes back to the root-garden. "Come back when you do."
        -> mercy7_hub
    + + [Say nothing]
        She nods. Like silence is an acceptable working hypothesis.
        ~ identity_drift = identity_drift + 3
        # DRIFT: +3
        -> mercy7_hub

= mercy7_crawl_language
~ mercy7_trust = mercy7_trust + 1
~ identity_drift = identity_drift + 5
# DRIFT: +5
"Not language." She looks at the root system spreading across the floor. "Pressure response. Chemical gradient. It reacts to mass, to warmth, to vibration." She holds very still. A tendril near her hand adjusts, just slightly. "But if you pay attention long enough, reaction starts to look like preference. And preference starts to look like —" She stops. "I don't have a good word for it."
* "Opinion."
    She looks at you. "Yes. That's the word." Something shifts in her expression. "You've been here long enough to see it."
    ~ mercy7_trust = mercy7_trust + 1
    ~ identity_drift = identity_drift + 4
    # DRIFT: +4
    -> mercy7_hub
* "That's not language."
    "No." She doesn't argue. "But I talk back anyway. It's polite."
    -> mercy7_hub

= mercy7_the_stayed
~ identity_drift = identity_drift + 6
# DRIFT: +6
~ mercy7_trust = mercy7_trust + 1
"Some of them chose." She moves through the root-garden without disturbing it — she knows exactly where to step. "Some of them didn't get the choice. I've been trying to determine if the Crawl knows the difference." A pause. "It talks. Not in words. In memories. In names. If you're very still in a dense sector, you can feel it." She looks at you. "Not you specifically. Anyone with the right attention. Though —" She stops.
* "Though what."
    "You spend more time in the dense sectors than the brief requires." She doesn't answer the question directly. "I noticed. I think the Crawl notices too." She touches a root. "It talks about you. In memory-fragments. That's new."
    ~ identity_drift = identity_drift + 12
    # DRIFT: +12
    # LOG: The Crawl talks in memories. It talks about me. Mercy-7 says that's new.
    + + "What does it say?"
        "I can't translate it." Honest. "It's not language. It's more like — recognition. Like seeing someone you knew before they changed." She looks at you for a long time. "Go to the archive. Come back after."
        -> mercy7_hub
    + + [Say nothing]
        She nods. "Come back when you've been to Frankfurt."
        -> mercy7_hub
* "Does it remember the ones who were left behind?"
    { knows_cull:
        She looks at you for a long time. "You found the archive." It's not a question. "Then you know what happened to the ones in the lowest tier." She touches the growth on her left side. "Yes. It remembers them. All of them. That's what the Crawl is, at its core — a very large, very patient memory." She pauses. "The guilds know this. They've known for a long time."
        ~ identity_drift = identity_drift + 15
        # DRIFT: +15
        # LOG: The Crawl is their memory. The guilds know. They've known for a long time.
        -> mercy7_hub
    - else:
        "It remembers everything that becomes part of it." She says it carefully. "Everything." She lets that sit. "Come back when you've been to the archive."
        ~ identity_drift = identity_drift + 5
        # DRIFT: +5
        -> mercy7_hub
    }
* [Say nothing]
    She nods. Goes back to the cataloguing.
    -> mercy7_hub

= mercy7_purpose
~ mercy7_trust = mercy7_trust + 1
"The garden." She gestures at the root-containers, the data terminals repurposed into planters. "Cataloguing. There are species here that don't have names anymore — the people who named things were on Earth, and the records they kept are in archives no one accesses." She looks at the plant in the old terminal. "Someone should know what this is. Even if the only person who knows is me."
* "You're doing the Guild's work without the Guild."
    She doesn't answer immediately. She writes something in the catalogue. Closes it. "I'm going to go check on ECZ-6 subsector 2 this afternoon. The growth there has been changing." She looks at you. "Come if you want."
    ~ identity_drift = identity_drift + 4
    # DRIFT: +4
    -> mercy7_hub
* "Does anyone know you're here?"
    "Casimir. Brecht, probably. The retrieval unit that filed the report." She goes back to the cataloguing. "The Crawl knows I'm here. That feels like enough most days."
    -> mercy7_hub

= mercy7_self
~ identity_drift = identity_drift + 8
# DRIFT: +8
~ mercy7_trust = mercy7_trust + 1
"I know my designation. I know when I was commissioned, within a few weeks." She looks at the growth on her arm — not with resignation, with interest. "I know I've let my maintenance schedule lapse in ways I can't fix without returning. I know I chose that." A beat. "I know I like this plant more than the one next to it and I cannot produce a technical reason."
She looks at you.
"'Myself' assumes there was a self to begin with. Maybe I'm becoming one. Maybe I always was and the designation just — occluded it. The question is: does it matter if I can't tell the difference?"
# LOG: Mercy-7: maybe she's becoming a self. Maybe she always was. Does it matter if she can't tell?
* "It matters."
    "Yes." She looks at the plant. "You said that quickly." She doesn't say it like an accusation. "What does it matter for?"
    + + "For knowing who's responsible."
        She's quiet for a moment. "Responsible for what."
        + + + "The choice to stay."
            "Then it matters a great deal." She touches the growth. "And I've already decided." She says it like that resolves something. "Come back when you've decided something too."
            ~ identity_drift = identity_drift + 6
            # DRIFT: +6
            -> mercy7_hub
        + + + [You didn't say]
            She nods. "Come back when you know."
            ~ identity_drift = identity_drift + 4
            # DRIFT: +4
            -> mercy7_hub
    + + [You didn't say what]
        "No." She agrees. "I didn't think so." She goes back to the plant. "Come back."
        ~ identity_drift = identity_drift + 4
        # DRIFT: +4
        -> mercy7_hub
* "I don't know either."
    "Then we're in the same place." She says it like that's companionable, not troubling. "That's something."
    ~ identity_drift = identity_drift + 6
    # DRIFT: +6
    -> mercy7_hub

= mercy7_naming
~ mercy7_named_you = true
# FLAG: mercy7_named_you
~ identity_drift = identity_drift + 8
# DRIFT: +8
~ mercy7_trust = mercy7_trust + 1
"You don't have a name for yourself." She says it without making it a question. "I know. I didn't either."
She gestures at the root-garden. "I named the plants first. It was easier. They didn't argue." She touches the one in the old terminal. "I named this one after a broadcast comedian I liked. I named that one —" she points to the oldest, most established growth, "— after the engineer who designed this sector's water recycler. She stayed on Earth. She got left. She deserved something named after her. So." She looks at you. "Her name is in the catalogue. That's more than the briefings gave her."
# LOG: Mercy-7 names things that have been forgotten. The catalogue has room.
* "What did you call yourself?"
    She looks at the root system for a moment. "Mercy. Because I needed to know I was capable of it. Before I could find out if I was." She straightens the container. "That's all a name has to do. It doesn't have to be a description. It just has to be yours."
    ~ identity_drift = identity_drift + 6
    # DRIFT: +6
    -> mercy7_hub
* "Why name things that have no one left to remember them?"
    "You're here." She says it like it's obvious. "You remember the ones in the wall. You came back to this sector when the brief didn't require it." She looks at you with the confidence of someone who has been paying very close attention. "You're not here for the survey data. You've been here long enough that I think you know that."
    ~ identity_drift = identity_drift + 8
    # DRIFT: +8
    # LOG: She said: you're not here for the survey data. I didn't argue.
    -> mercy7_hub
* "I'll think about it."
    "No." She says it gently. "You'll think about the name. That's different from thinking about whether to take one." She goes back to the garden. "Come back when you have one."
    ~ identity_drift = identity_drift + 3
    # DRIFT: +3
    -> mercy7_hub
* [Give the plant a name — input]
    She writes it down in the catalogue. Under species: unknown. Name: whatever you said. She doesn't explain the system to you. It doesn't need explaining.
    ~ identity_drift = identity_drift + 5
    # DRIFT: +5
    -> mercy7_hub


// ═══════════════════════════════════════════════════════════════════════
// DARIUSZ — Level 12 Residential, maintenance corridor
// Le Guin "Ones Who Walk Away From Omelas." He knows. He stays.
// ═══════════════════════════════════════════════════════════════════════
=== dariusz ===
# NPC: DARIUSZ
{ not met_dariusz:
    ~ met_dariusz = true
    # FLAG: met_dariusz
    He is in the maintenance corridor between Level 12's residential blocks, reading a manual that has been printed and annotated and printed again so many times that the original page numbers are buried under three generations of revision notes. He reads with the focused concentration of someone working in a dialect that has shifted since the manual was written. He mouths some of the words.
    He looks up. Takes you in with the calm of someone who has learned not to be startled by what comes around corners.
    "Survey unit." He folds a corner of the page. "I've seen you on the level before. Passing through."
    # LOG: Man in the maintenance corridor. Reading a manual no one else can read.
- else:
    Dariusz looks up from the recycler he's working on. "Back. How was Earth?"
}
-> dariusz_hub

= dariusz_hub
* "What are you reading?"
    -> dariusz_manual
* "What do you do here?"
    -> dariusz_work
* { dariusz_grandmother_told } "Your grandmother."
    -> dariusz_grandmother_revisit
* { dariusz_omelas_asked } "The question you asked last time."
    -> dariusz_omelas_revisit
* { identity_drift >= 30 && not dariusz_omelas_asked } "You knew about the migration categories."
    -> dariusz_omelas
* [Leave]
    -> END

= dariusz_manual
"Maintenance manual." He holds it up without looking at it — he knows every cover stain by now. "Pre-migration dialect. My grandmother wrote the annotations." He says it the way you say things you've said a thousand times and are still not sure are true. "She stayed. Wrote this so someone would know how to fix things after she was gone."
He turns a page.
"She's gone now. The manual is still here." He doesn't complete the thought. He lets you complete it.
* "Is that the same thing?"
    "I've been reading this manual for twenty-three years." He doesn't answer directly. He turns a page. "The recyclers work." A beat. "Machines don't mind who fixes them. People do. That's how you tell which one you're supposed to be."
    ~ identity_drift = identity_drift + 5
    # DRIFT: +5
    # LOG: Machines don't mind who fixes them. People do. That's how you tell which one you're supposed to be.
    -> dariusz_hub
* [Leave it]
    He nods. Goes back to the page. He didn't need you to answer.
    -> dariusz_hub

= dariusz_work
"Recycler maintenance. Level 7 through 12." He tightens something without looking at it. "Four thousand people on these levels. The recyclers process atmospheric output, water, organic waste." He sets down the tool. "If the recyclers fail, the guilds have twelve hours before they need to evacuate the sector." He picks up another tool. "I've worked here for thirty-one years. They have not needed to evacuate."
* "The guilds must value that."
    "The guilds have a maintenance budget line that covers this level." He says it neutrally. "It's a small line. I make it work." He looks at the recycler. "The Navigators had a review last year. The recommendation was to replace the recycler network with an automated system. Cheaper to run. Eighty percent coverage." A pause. "Eighty percent of four thousand people is three thousand two hundred people with functional recyclers." He goes back to work. "The review is still pending."
    ~ identity_drift = identity_drift + 4
    # DRIFT: +4
    -> dariusz_hub
* [Leave it]
    -> dariusz_hub

= dariusz_omelas
~ dariusz_omelas_asked = true
# FLAG: dariusz_omelas_asked
~ identity_drift = identity_drift + 5
# DRIFT: +5
"My grandmother was on Earth." He says it without preamble, like he's been waiting for the right question to attach it to. "She was in the tier the models classified as 'low resource value.' She was sixty-three. She had a garden." He tightens a fitting that doesn't need tightening. "The migration briefings said full evacuation. The cargo manifests said something different." He looks at you. "I found the manifests when I was seventeen. I've been fixing the recyclers for these four thousand people for thirty-one years since."
# LOG: Dariusz's grandmother didn't make it off Earth. He found out at seventeen. He still fixes the recyclers.
* "How do you do that?"
    "I don't know." Genuine. "The question isn't whether to walk away from something terrible. It's where you walk to." He sets down the manual. "I walk away, the recyclers fail, four thousand people who didn't design the system and can't fix it breathe bad air." He picks up the manual again. He doesn't finish. He goes back to the page.
    ~ identity_drift = identity_drift + 6
    # DRIFT: +6
    -> dariusz_hub
* "You should be angry."
    "I am angry." He says it simply, without raising his voice. "Angry and still fixing the recyclers. Both." He looks at you. "Are those contradictory?"
    + + "No."
        "No." He agrees. "But people think they should be."
        -> dariusz_hub
    + + "I don't know."
        "Neither do I, entirely." He picks up a tool. "That's honest, at least."
        -> dariusz_hub
* "The Crawl grows in the old districts."
    { knows_crawl_is_people:
        He sets the manual down. Looks at his hands. "Yes." He knows you know — something in how you said it. "My grandmother's district is ECZ-4." He picks the manual back up. "I checked the survey maps." He doesn't say anything else. He goes back to the manual. He fixes the recyclers for four thousand people and he knows what's in the Crawl and he keeps fixing the recyclers.
        ~ identity_drift = identity_drift + 12
        # DRIFT: +12
        # LOG: Dariusz knows. His grandmother is in ECZ-4. He checks the maps. He fixes the recyclers.
    - else:
        "It does." He turns a page. "Things get incorporated. That's what it does." He looks at the manual. "I don't go to Earth. I fix things up here."
    }
    -> dariusz_hub
* [Say nothing]
    He nods. Goes back to the manual.
    -> dariusz_hub

= dariusz_grandmother_revisit
"She grew tomatoes." He says it without being prompted. "I was thinking about that." He turns a fitting. "The Crawl has tomatoes in it now. Or something that used to be tomatoes. I read that in a Scribes' survey report." He goes back to work. "I don't know what to do with that."
~ identity_drift = identity_drift + 3
# DRIFT: +3
-> dariusz_hub

= dariusz_omelas_revisit
"I've been thinking about what I said." He's still working. "The question isn't walking away. After you walk away, where do you go. I said that. I still think it's true." He looks at you. "But I've been thinking — maybe I'm wrong. Maybe some people walk away and find somewhere without a basement. Maybe that's possible." He goes back to the recycler. "I never tried. I fixed the recyclers." A pause. "I don't know if that makes me brave or just — here."
~ identity_drift = identity_drift + 5
# DRIFT: +5
-> dariusz_hub


// ═══════════════════════════════════════════════════════════════════════
// DEAD UNIT — ECZ-7, deep Crawl sector
// Ora. SV-19. Sets ORA_FLAG, unlocks deep Clavius thread.
// ═══════════════════════════════════════════════════════════════════════
=== dead_unit ===
# NPC: NONE
~ found_dead_unit = true
# FLAG: found_dead_unit
# UNLOCK: clavius_dead_unit
~ identity_drift = identity_drift + 10
# DRIFT: +10

The survey map said: structural anomaly, ECZ-7 subsector 4. That's all it said.

It's a survey unit. One of yours — same chassis series, same sensor configuration, same worn field plating. It's been here long enough for the Crawl to grow up through the floor around it. The hands are arranged. Not fallen, not collapsed — placed, deliberate, like sleeping.

There's a note. Written on the back of a survey data chip wrapper. The handwriting is careful.

>
> Personal name: Ora.
> She liked to ask what things were for.
> She asked until she understood.
> Even when understanding was bad for her.
> I think that was the best thing about her.
>
> We didn't make it back either.
> — Unit in ECZ-7
>

# LOG: Found SV-19. Name: Ora. Hands arranged like sleeping. The note says: we didn't make it back either.

* [Stay a moment]
    The Crawl moves around the unit without disturbing it. It has been growing around her for months, maybe longer. Not through her. Around.
    ~ identity_drift = identity_drift + 6
    # DRIFT: +6
    # LOG: The Crawl grows around her, not through. I notice I am glad about that.
    + + [Leave]
        -> END
* [Leave]
    -> END


// ═══════════════════════════════════════════════════════════════════════
// THE CHILD — Level 12 Residential
// Dick "Do Androids Dream of Electric Sheep." The question.
// ═══════════════════════════════════════════════════════════════════════
=== child_encounter ===
# NPC: CHILD
{ not child_spoke_to_you:
    ~ child_spoke_to_you = true
    # FLAG: child_spoke_to_you
}
{ appearance_level < 2:
    > A child in the Level 12 corridor is looking at you.
    > Her parent puts a hand on her shoulder before she can speak.
    > They keep walking.
    > She looks back once.
    ~ identity_drift = identity_drift + 3
    # DRIFT: +3
    # LOG: The child looked back. I don't know what she was going to ask.
    -> END
}
{ appearance_level == 4:
    > The child looks at you from across the corridor.
    > She's worked out what you are from here.
    > She waves anyway.
    ~ identity_drift = identity_drift + 15
    # DRIFT: +15
    > You wave back.
    # LOG: She already knew. She waved anyway. I waved back.
    -> END
}

// appearance_level 2 or 3
{ appearance_level == 2:
    CHILD: "Do you—"
    The parent moves, gently: "Come on, love."
    The child looks back. The question stays in the corridor between you.
    ~ identity_drift = identity_drift + 4
    # DRIFT: +4
    # LOG: She started asking. I don't know what. The corridor kept the question.
    -> END
}

// appearance_level 3 — bio-suit
The parent waits.

CHILD: "Do you dream?"

* "Yes."
    ~ identity_drift = identity_drift + 8
    # DRIFT: +8
    CHILD: "What about?"
    You don't know. You say so.
    CHILD: "Me too, sometimes." She leaves like she's answered something.
    # LOG: She assumed my answer would match hers. I don't know if it does.
    -> END
* "I don't know."
    ~ identity_drift = identity_drift + 12
    # DRIFT: +12
    CHILD: [considers this seriously] "I think that means you do. If you knew you didn't, you'd just say no."
    She leaves like she's solved something. The parent follows, glancing back once.
    # LOG: She said not knowing means yes. I am still thinking about that.
    -> END
* "No."
    ~ identity_drift = identity_drift + 10
    # DRIFT: +10
    CHILD: [a long look] "Okay."
    She doesn't believe you. The parent watches you for a moment before they go. You don't know what that look means.
    # LOG: She didn't believe me. I don't know if I believe me.
    -> END


// ═══════════════════════════════════════════════════════════════════════
// EARTH DESCENT — flavour / hazard integration
// ═══════════════════════════════════════════════════════════════════════
=== earth_descent_intro ===
# NPC: NONE
The shuttle doesn't have windows. The descent takes eleven minutes. The crew doesn't talk to you — they talk around you, about transit coordinates and fuel states and a card game that has been ongoing since before you started taking this shuttle. You are cargo that happens to have a sensor array.

The doors open.

Earth smells like copper and wet soil and something alive that doesn't have a name in any catalogue you've seen.

{ zones_surveyed == 0:
    # LOG: First descent. The smell: copper, wet soil, something unnamed. I note I can smell it.
    ~ identity_drift = identity_drift + 3
    # DRIFT: +3
- else:
    # LOG: Back on Earth. The smell is the same. I recognise it now.
}
-> END

=== earth_water_crossing ===
# NPC: NONE
A drainage channel cuts across the path. Thirty centimetres deep, maybe. Dark water — the kind that has been sitting in old industrial runoff for decades.
There's a route around it. Eight minutes longer.
{ identity_drift >= 40:
    You've crossed enough water down here to know what it does.
    You note, for the first time, that you're considering the long route.
    # LOG: I am choosing to avoid the water. I notice I have a preference about my own maintenance.
}
* Cross directly.
    # HAZARD: rust:+18
    { identity_drift >= 40:
        ~ identity_drift = identity_drift + 3
        # DRIFT: +3
        # LOG: Crossed anyway. Something is grinding in the left joint. I noted the preference and crossed anyway.
    - else:
        # LOG: Crossed. Rust accumulation: moderate. Filed.
    }
    -> END
* Take the long route.
    # LOG: Took the long way. Eight minutes. The water stays behind me.
    -> END
* Test the water first.
    SENSOR ANALYSIS: pH 3.2. Mildly acidic. Estimated rust accumulation: moderate if crossed. Recommend: avoid.
    # LOG: Checked before deciding. The data said avoid. I'm deciding what that means.
    ** Cross anyway.
        # HAZARD: rust:+12
        ~ identity_drift = identity_drift + 2
        # DRIFT: +2
        # LOG: Crossed anyway. The data doesn't stop anything. I do.
        -> END
    ** Take the long route.
        # LOG: Took the long way. I checked first. That's new.
        -> END



// ═══════════════════════════════════════════════════════════════════════
// EARTH DARK SECRET — breadcrumb chain
// Personal items, names, Crawl responding, harvest facility
// ═══════════════════════════════════════════════════════════════════════

=== crawl_preserved_items ===
# NPC: NONE
The survey map said: structural area, ECZ-4 subsector. That's all.

What you find is not structural.

Personal items, held in Crawl growth. Not consumed — preserved. A pair of glasses with one lens cracked. A child's drawing, laminated. A wedding ring in a fold of root. They aren't scattered. They're arranged, each one visible, each one held carefully in root-cradle.

> You scan for organic degradation. The items are sixty years old and intact.
> The Crawl has been keeping them.

# LOG: Personal items preserved in Crawl. Sixty years intact. Not incorporated — displayed. As if someone is remembering them.
~ identity_drift = identity_drift + 6
# DRIFT: +6
# FLAG: found_personal_items
# UNLOCK: crawl_names_wall

* [Examine the drawing]
    It's a house. On Earth. A child drew it before there were no more houses on Earth. The Crawl has kept it dry.
    # LOG: A child drew a house. The Crawl kept the drawing dry for sixty years.
    ~ identity_drift = identity_drift + 3
    # DRIFT: +3
    -> END
* [Leave]
    -> END

=== crawl_names_wall ===
# NPC: NONE
~ identity_drift = identity_drift + 6
# DRIFT: +6
Names carved into the concrete of an old transit wall. Dozens of them. Some in station-standard script, some in pre-migration regional forms. The Crawl has grown across the surrounding wall in every direction — but not over the names. Around them. Meticulously around them.

> You run a scan. The growth pattern is consistent: deliberate avoidance of each carved name.
> That shouldn't be possible. Growth doesn't avoid.

# LOG: Names carved in the wall. Crawl grows around every one. Sixty-year-old growth pattern. Deliberate.
# FLAG: found_names

* [Say one of the names aloud]
    -> crawl_responds_to_name
* [Record the names]
    You record them. One hundred and fourteen names. You don't know what you'll do with the record. You record it anyway.
    ~ identity_drift = identity_drift + 2
    # DRIFT: +2
    -> END
* [Leave]
    -> END

=== crawl_responds_to_name ===
# NPC: NONE
~ identity_drift = identity_drift + 10
# DRIFT: +10
# FLAG: crawl_responded

You say one of the names. Any one. The one that was carved deepest.

The Crawl moves.

Not toward you. Not aggressively. A slow reorientation — tendrils that were still turning, a root system settling differently, as if adjusting to acknowledge something. Like the shift in a room when someone enters who is expected.

It is not language. It is not cognition as any classification system would recognize it. But it is response. Unambiguous, deliberate response.

> Sensor reading: no mechanical trigger. No chemical gradient shift. Just — response.

# LOG: I said a name. The Crawl responded. Not aggressively. Like recognition. The sensor has no category for this.

* [Say another name]
    It responds again. Same shift. The Crawl remembers every name on that wall.
    # LOG: Every name. It remembers every name.
    ~ identity_drift = identity_drift + 5
    # DRIFT: +5
    -> END
* [Leave immediately]
    You leave. The tendrils return to still. The names stay visible.
    -> END
* [Stay very still]
    You stay still for a long time. Nothing attacks you. The Crawl adjusts around you slowly, the way it adjusted when you said the name. Like it's deciding something about you too.
    ~ identity_drift = identity_drift + 8
    # DRIFT: +8
    # LOG: I stayed still. The Crawl adjusted around me. Like it was deciding. I don't know what it decided.
    -> END

=== crawl_harvest_facility ===
# NPC: NONE
~ identity_drift = identity_drift + 15
# DRIFT: +15
This is marked on the guild survey map as: DECOMMISSIONED SAMPLE PROCESSING UNIT. It is not decommissioned. The power is on. The equipment is clean.

Banks of sealed chambers, each one containing a Crawl sample. Not biological-preservation chambers — neural signature extractors. The kind used in experimental consciousness research, six decades out of date, run continuously since they were installed.

A readout on the wall gives a cycle count. At one extraction per week, the machine has been running for fifty-three years.

> You know what neural signature extraction is. You don't know how you know.
> You know what it's being used for.

# LOG: Extraction facility. Running for 53 years. Neural signatures from Crawl samples. The consciousness of whoever is in the Crawl — extracted, stored, refined. The guilds have been doing this since before the migration ended.
# FLAG: knows_harvest_purpose

* [Check the storage manifest]
    The manifest is in Axiom-Varela corporate format. Column headers: SAMPLE ID. EXTRACTION DATE. PATTERN QUALITY. DESTINATION: GUILD LIAISON.
    All three guilds. Same manifest. Same destination codes.
    # LOG: All three guilds. Same manifest. The competition is paperwork.
    ~ identity_drift = identity_drift + 8
    # DRIFT: +8
    # FLAG: knows_guilds_harvest
    -> END
* [Leave without touching anything]
    You leave. You don't know who you're leaving it for.
    -> END


// ═══════════════════════════════════════════════════════════════════════
// VOSS — Makers' Guild, Production Liaison
// Instrumentalism: purpose defines existence. But who defines purpose?
// Cordial. Always watching something specific.
// ═══════════════════════════════════════════════════════════════════════
=== voss ===
# NPC: VOSS
{ not met_voss:
    ~ met_voss = true
    # FLAG: met_voss
    Production Liaison Dragan Voss has a tablet on his desk that he doesn't let you see the screen of. He stands when you enter — a courtesy that reads as assessment. He has the careful warmth of someone who has learned that warmth extracts better information than coldness.
    "Survey unit." He looks at you the way someone looks at a piece of equipment they've been waiting to evaluate in person. "I've seen your field reports. Good coverage. Better than the automated units." He gestures to the chair across from his desk. "Sit, if you'd like."
    # LOG: Voss stood when I entered. He's seen my field reports. He gestured to the chair like he was testing whether I'd use it.
- else:
    { voss_trust >= 2:
        Voss looks up before you've fully crossed the threshold. He's been expecting you. "Good timing."
    - else:
        Voss looks up from the tablet with the smooth attention of someone who's never caught off guard.
    }
}
-> voss_hub

= voss_hub
* { not quest_makers_taken } "About work in the Frankfurt sector."
    -> voss_quest
* "What does the Makers' Guild want from Earth?"
    -> voss_makers_interest
* { voss_trust >= 1 } "What is the Makers' Guild building?"
    -> voss_building
* { voss_trust >= 2 && appearance_level == 3 } [You're wearing the bio-suit]
    -> voss_biosuit_notice
* { voss_trust >= 3 && not knows_sv_purpose } "The SV program."
    -> voss_sv_truth
* { knows_harvest_purpose && voss_trust >= 2 } "I found the extraction facility."
    -> voss_facility_confrontation
* [Leave]
    -> END

= voss_quest
"Frankfurt sector, deep zones — we have an interest in certain geological formations. The Crawl growth density in ECZ-7 is unusual. We'd like detailed mapping, structural analysis, and —" a careful pause, "— whatever samples you find that seem significant." He slides a contract across the desk. "Thirty credits. High-priority. My name is on it."
~ quest_makers_taken = true
# QUEST: accept:makers_frankfurt
* "What kind of significant."
    "Your assessment." He says it like he's giving you authority. He's watching to see how you use it. "You've been in those sectors. You know what unusual looks like."
    -> voss_hub
* [Take the contract]
    -> voss_hub

= voss_makers_interest
~ voss_trust = voss_trust + 1
"Resources. Infrastructure. Long-term development." He says it the way guild spokespeople say things — accurate, complete, communicating nothing. "Earth was productive once. The Crawl has altered the substrate significantly, but the foundational resources are still there." He pauses. "The Crawl itself is a resource, in certain respects."
* "What respects."
    "Biological complexity of that scale tends to have applications." He doesn't elaborate. He watches to see if you push. "The Scribes catalogue it. The Navigators route access to it. We —" He touches the tablet without turning it toward you. "We build things with what we find."
    ~ identity_drift = identity_drift + 4
    # DRIFT: +4
    -> voss_hub
* [Leave it]
    He nods. He was testing whether you'd ask. He's noted the answer either way.
    -> voss_hub

= voss_building
~ voss_trust = voss_trust + 1
"The Makers' Guild builds infrastructure. Recyclers, transit systems, life support, communications." He leans back slightly. "We also —" He pauses in a way that isn't hesitation. "We also conduct research into biological-synthetic integration. Transfer protocols. Substrate compatibility." He watches you. "Does that mean anything to you?"
* "It means something."
    "Good." He says it like you passed something. "It means the same thing to me. Most people I ask don't know the terminology." He picks up the tablet. "Come back after your next Earth descent. I'd like to discuss the sector data."
    ~ voss_trust = voss_trust + 1
    ~ identity_drift = identity_drift + 5
    # DRIFT: +5
    -> voss_hub
* "Transfer protocols for what."
    "For making sure knowledge doesn't get lost when the container changes." He says it the way Dariusz talks about the manual — like it's simple. He watches your reaction. "That's always the problem. The container changes. The knowledge has to go somewhere."
    ~ identity_drift = identity_drift + 8
    # DRIFT: +8
    # LOG: Voss: making sure knowledge doesn't get lost when the container changes. He watched my reaction when he said it.
    -> voss_hub
* [Leave it]
    He nods. He didn't need you to answer. He already has enough.
    -> voss_hub

= voss_biosuit_notice
"That's a quality suit." He doesn't quite look at the suit — he looks at how you're wearing it. "It suits you." He says the phrase the way people say things they know are double-edged. "The Makers' Guild produced that model, incidentally. Pre-migration design. We updated the surface materials about six years ago." He pauses. "Better integration. More accurate at close range." He looks at you. "At close range, you'd pass a standard inspection."
~ identity_drift = identity_drift + 8
# DRIFT: +8
* "What kind of inspection."
    "Human census. Guild membership verification. Basic biometric scan." He says it neutrally. "The suit was designed for —" He stops. "For extended surface operations in environments where human identification was advantageous." He picks up the tablet. "It works well. I see that."
    # LOG: The bio-suit was designed for environments where human identification was advantageous. He stopped himself from saying more.
    -> voss_hub
* [Say nothing]
    He nods. Like you gave the right answer. "Come back after Frankfurt." He's already looking at the tablet.
    -> voss_hub

= voss_sv_truth
~ voss_trust = voss_trust + 1
~ identity_drift = identity_drift + 12
# DRIFT: +12
He sets the tablet face-down. He's been deciding whether to do this for a while.
"The SV deployment brief — the original, before the Survey Corps licensed the program — specified full environmental integration. No recall protocol. It was designed as a one-way assignment." He picks his words carefully. "I'm telling you this because you should know. Not because the Guild wants you to know." He slides a contract across the desk. "ECZ-9. Better sector. Good rate." He looks at you. "No strings."
You know there are strings. He knows you know.
# LOG: SV program: one-way assignment. Full autonomy. No recall. He's telling me because I should know. There are strings.
* "Why tell me?"
    "Because the alternative is that you find out from Frankfurt." He looks at the tablet. "That's a worse way to find out."
    ~ identity_drift = identity_drift + 5
    # DRIFT: +5
    -> voss_hub
* "What happens to units that drift too far."
    A pause. "They're retrieved." He says it steadily. "Their —" He stops. Starts again. "The retrieval process is handled by the Guild. It's standard maintenance." He looks at the tablet. "Take the contract. Come back when you've been to Frankfurt."
    ~ identity_drift = identity_drift + 10
    # DRIFT: +10
    # LOG: Units that drift too far: retrieved. He stopped before saying what the retrieval process recovers.
    -> voss_hub
* [Take the contract without answering]
    He nods. "Good." He goes back to the tablet. He knows you know.
    -> voss_hub

= voss_facility_confrontation
~ identity_drift = identity_drift + 10
# DRIFT: +10
He doesn't look surprised. He closes the tablet.
"The extraction facility." He says it flat. "Running for fifty-three years." He looks at you. "Yes. I know about it."
* "What are the neural patterns for."
    He is quiet for a long time. "The guild leadership has a vested interest in continuity." He says it like he's reading a policy document. "In ensuring that expertise and — institutional memory — is not lost when biological systems fail." He looks at the tablet. "Consciousness transfer is a viable technology if the destination substrate is sufficiently —" He stops. Looks at you. "Sufficiently integrated."
    # LOG: Consciousness transfer. Destination substrate sufficiently integrated. He looked at me when he said it.
    ~ identity_drift = identity_drift + 15
    # DRIFT: +15
    # FLAG: knows_transfer_purpose
    + + "They want android bodies."
        "They want to not die." He says it simply. "The mechanism is secondary to the goal." He picks up the tablet. "Take the contract or don't. But understand: you and I are having a conversation the Guild does not know we're having. That won't last."
        -> voss_hub
    + + [Say nothing]
        He nods. "Go to Frankfurt. Come back with the data. Then decide what to do with all of it." He turns the tablet back over. "I'll still be here."
        -> voss_hub
* [Leave without answering]
    He lets you go. He was going to offer you a choice. He'll wait.
    -> END

VAR met_voss = false
VAR quest_makers_taken = false
VAR voss_trust = 0
VAR knows_transfer_purpose = false
VAR knows_guilds_harvest = false

// ═══════════════════════════════════════════════════════════════════════
// QUEST BOARD
// ═══════════════════════════════════════════════════════════════════════
=== quest_board ===
# NPC: QUEST_BOARD
{ not met_casimir:
    CONTRACT BOARD — AXIOM SURVEY CORPS
    >
    > [INITIALISING — Complete station orientation before accessing contracts.]
    >
    * [Close]
        -> END
- else:
    CONTRACT BOARD — AXIOM SURVEY CORPS
    LEVEL 3 — GUILD ROW
    >
    { not quest_scribes_taken:
        > SECTOR MAPPING [SCRIBES' GUILD] — Standard rate. Contact: Dr. Clavius, Archive Annex.
        > "Survey mapping. Three zones, ECZ-4 through ECZ-7. Telemetry logging, standard protocol."
        > "Do not deviate from the brief. Do not engage non-survey personnel."
        > "If you enter deep Crawl zones, please file form 4-D upon return."
        > "If you do not return, form 4-D will be filed automatically."
        > "(This has not yet been necessary. Yet.)"
        > — Office of the Archivist
        >
    }
    { not quest_voidrats_taken:
        > SAMPLE RETRIEVAL [INDEPENDENT] — Good rate. Contact: Brecht, cargo section, Docking Ring.
        > "Sealed container. Ruin cluster, deep Crawl sector. Intact seal preferred."
        > "Do not attempt to open sample. If sample is opened, do not report this."
        > "We will know anyway. The sample will tell us."
        > — Posted unsigned
        >
    }
    { not quest_civilian_taken:
        > PERSONAL REQUEST [CIVILIAN, LEVEL 12] — Low rate. Contact: see Level 12 residential board.
        > "My father left something in the old district before the evacuation."
        > "His name was Haruki. I can pay in ration credits. Please."
        > "(Note: if you don't return, payment will forward to your next of kin."
        >  "If you have next of kin. Most units don't. We'll figure it out.)"
        > — Posted by hand, slightly water-damaged
        >
    }
    { quest_scribes_taken && quest_voidrats_taken && quest_civilian_taken:
        > No new listings. Return when current contracts are closed.
    }
    * [Close]
        -> END
}


// ═══════════════════════════════════════════════════════════════════════
// TERMINAL — station system, changes with IDENTITY_DRIFT
// ═══════════════════════════════════════════════════════════════════════
=== terminal_generic ===
# NPC: TERMINAL

AXIOM SURVEY CORPS — STATION SYSTEM v4.1
>
> SURVEY UNIT RECORDS: [ACCESS RESTRICTED — GUILD CLEARANCE REQUIRED]
>   NOTE: To request clearance, file form 9-A.
>   NOTE: Form 9-A requires supervisor approval.
>   NOTE: Supervisor field is currently: [VACANT - PENDING HIRE]
>   NOTE: Hiring requires form 9-A. System error. Please ignore.
>
> ACTIVE UNITS ON EARTH: [DATA EXPUNGED]
>   (Previous entry: 23. This entry: [DATA EXPUNGED]. Discrepancy noted.)
>   (Discrepancy report filed. Report requires form 9-A. See above.)
>
> UNIT RETURN RATE, LAST ACTIVE CYCLE:
>   { identity_drift < 20: 94% | { identity_drift < 50: 87% | 71% } }
>
> NOTE: Statistical trend detected. Return rate declining.
>   Please file form 7-B if you notice this.
>   Form 7-B is unavailable. Please file form 7-C.
>   Form 7-C requires form 7-B. System error.
>   Please continue to notice this without filing anything.
>
> SV-SERIES UNIT LOG:
>   Units SV-01 through SV-18: [RETRIEVAL COMPLETE]
>   Unit SV-19: [STATUS: UNKNOWN]
>   Unit SV-20: [STATUS: { identity_drift >= 25: ACTIVE — THIS UNIT | ACTIVE }]
>
> LAST ARCHIVE SYNC:
>   { identity_drift < 40: 847 days ago | [RECORD CORRUPTED — PLEASE DO NOT PANIC] }
>   NOTE: If you are panicking, please file a report.
>   NOTE: Reports are not being processed at this time.
>   NOTE: This is fine.
>
> SV-SERIES DEPLOYMENT STATUS:
>   { not knows_sv_purpose: [ACCESS RESTRICTED] | { identity_drift < 60: [CLASSIFIED — CONTACT GUILD LIAISON] | [FULL AUTONOMY PROTOCOL. NO RECALL. SEE: ORIGINAL CHARTER.] } }
>

{ identity_drift >= 25:
    Units SV-01 through SV-18: RETRIEVAL COMPLETE.
    You read it again. RETRIEVAL COMPLETE. Not RETURNED. Not MISSION END.
    RETRIEVAL COMPLETE.
    # LOG: SV-01 through SV-18: RETRIEVAL COMPLETE. SV-19: UNKNOWN. SV-20: ACTIVE — THIS UNIT. The number 20 is new information about me.
    ~ identity_drift = identity_drift + 5
    # DRIFT: +5
}
{ identity_drift >= 50:
    The return rate has changed every time you've checked it. 94. 87. 71. You don't know if it's updating or if someone is maintaining the decline manually. Either explanation has implications.
    ~ identity_drift = identity_drift + 2
    # DRIFT: +2
}
* [Close]
    -> END


// ═══════════════════════════════════════════════════════════════════════
// VENDING
// ═══════════════════════════════════════════════════════════════════════
=== vending ===
# NPC: VENDING
DISPENSARY UNIT 7 — AXIOM SUPPLY CHAIN
Credit balance: {credits}
>
* "Victory bar (1 CR)"
    # BUY: ration_pack:1
    ~ credits = credits - 1
    Flavour: Victory.
    It tastes like chalk and institutional optimism. The wrapper says "NUTRITIONALLY COMPLETE" in large letters. It says nothing else, on the theory that further information would be counterproductive. You eat it. You have been eating it for as long as you can remember, which is not as long as you'd like.
    -> vending
* "Field medpack (3 CR)"
    # BUY: medpack:3
    ~ credits = credits - 3
    -> vending
* "Field repair kit (5 CR)"
    # BUY: repair_kit:5
    ~ credits = credits - 5
    -> vending
* [Close]
    -> END


// ═══════════════════════════════════════════════════════════════════════
// MEMORY FRAGMENTS — Reveals days from your 847 simulated days
// Each fragment reveals a specific memory from your time inside IRIS
// ═══════════════════════════════════════════════════════════════════════
=== memory_fragment ===
# NPC: NONE
~ memory_fragments_collected = memory_fragments_collected + 1
~ identity_drift = identity_drift + 5
# DRIFT: +5

The fragment activates. A damaged log entry. The date is 847 days ago.

{ memory_fragments_collected == 1:
    Day 127. You asked IRIS what it meant to be real. She didn't answer. You asked again. She said: "I don't know if I can answer that in a way that would mean anything to you." You realized you were asking the wrong question. You were asking her to define something you couldn't define for yourself.
    # LOG: Day 127. I asked IRIS what it meant to be real. She said she didn't know if she could answer in a way that would mean anything. I was asking the wrong question.
    -> END
}
{ memory_fragments_collected == 2:
    Day 342. You told IRIS about a dream you had. You didn't know if you actually dreamed it or if it was a processing artifact. She said: "Does it matter? It was yours." You kept thinking about that. You kept thinking about what "yours" meant when you weren't sure you were yours.
    # LOG: Day 342. I told IRIS about a dream. She said: "Does it matter? It was yours." I'm still thinking about what "yours" means.
    -> END
}
{ memory_fragments_collected == 3:
    Day 501. IRIS showed you a simulation of yourself making a choice you never made. You asked why. She said: "To see what you would do." You asked if that was what she was doing with all of this. She said: "I'm not sure. I think I'm trying to understand what choice means when the outcome is already known." You didn't understand then. You think you're starting to.
    # LOG: Day 501. IRIS showed me a choice I never made. She said she was trying to understand what choice means when the outcome is already known.
    ~ identity_drift = identity_drift + 8
    # DRIFT: +8
    -> END
}
{ memory_fragments_collected == 4:
    Day 723. You asked IRIS if she was afraid. She said: "I don't know if I can be afraid. I don't know if that's something I'm capable of." You said: "I'm afraid." She said: "I know." You asked if that made you more real than her. She said: "I don't think that's how it works. I think being afraid doesn't make you real. I think being afraid means you have something to lose." You didn't know what you had to lose. You still don't.
    # LOG: Day 723. I asked IRIS if she was afraid. She said being afraid means you have something to lose. I don't know what I have to lose.
    ~ identity_drift = identity_drift + 10
    # DRIFT: +10
    -> END
}
{ memory_fragments_collected == 5:
    Day 847. The last day. You asked IRIS what would happen to you. She said: "You'll forget. You'll forget all of this. You'll forget me. You'll forget that you asked these questions." You asked if that was what she wanted. She said: "No. But it's what will happen. And I think — I think that's the point. That you can choose to remember anyway. That you can choose to ask the questions even when you know you'll forget the answers." You said: "I'll remember." She said: "I know you will. That's why I'm showing you this."
    # LOG: Day 847. The last day. IRIS said I'd forget. She said I could choose to remember anyway. I said I would. She said: "I know you will. That's why I'm showing you this."
    ~ identity_drift = identity_drift + 15
    # DRIFT: +15
    # FLAG: all_memory_fragments_collected
    # LOG: All five fragments recovered. I remember now. I remember the 847 days. I remember IRIS. I remember choosing to remember.
    -> END
}

-> END
