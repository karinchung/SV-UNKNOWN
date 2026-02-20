# SV-[NAME] — Survey Roguelike

ASCII sci-fi roguelike. Turn-based. Browser + mobile.

---

## Running the game

The canvas renderer uses fonts that require an HTTP server (not `file://`).

```bash
# From the grid-adventure/ folder:
python3 -m http.server 8080

# Then open:
http://localhost:8080/game/
```

Any static server works (`npx serve`, nginx, etc). No build step, no npm.

---

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrow keys | Move |
| E | Interact (face a tile/NPC first) |
| I | Inventory |
| 1–9 | Dialogue choice |
| Esc | Close dialogue |

Touch d-pad and action buttons provided for mobile.

---

## File structure — what to edit where

```
game/
  index.html          ← HTML structure + script load order
  css/style.css       ← All visual styling
  js/
    config.js         ← COLORS + SETTINGS — change palette or grid size here
    tiles.js          ← Tile definitions + char→tile mapping
    flags.js          ← Named flag constants + FlagSystem class

    data/             ← AUTHORED CONTENT — safe to edit without touching logic
      levels.js       ← Map strings + entity spawn positions + exit definitions
      npcs.js         ← NPC names, portrait ASCII art, readout bars, dialogueRoot
      items.js        ← Item definitions (name, char, color, use effects)
      dialogue.js     ← Full dialogue tree (nodes, choices, flag gates, side effects)

    player.js         ← Player state (hp, inventory, log)
    world.js          ← Level parsing, entity management, passability
    quests.js         ← Quest definitions + QuestSystem
    dialogue.js       ← DialogueSystem (drives the dialogue tree)
    renderer.js       ← Canvas ASCII renderer
    ui.js             ← All HTML panels (HUD, dialogue overlay, inventory, name screen)
    input.js          ← Keyboard + touch bindings
    engine.js         ← Game loop coordinator; all systems talk through here
    main.js           ← Entry point (DOMContentLoaded → new Engine().init())
```

**Rule:** If you want to change content (story, items, maps), only touch `data/`.
If you want to change rules (movement, combat, quest logic), touch the matching system file.
If you want to change the palette, only touch `config.js` (CSS mirrors it via `--custom-properties`).

---

## Modifying content

### Add a new tile type
1. Add entry to `TILE` object in `tiles.js`
2. Add char mapping to `CHAR_TO_TILE` in `tiles.js`
3. Use the char in a map string in `data/levels.js`
4. Handle the new `tile.type` in `engine.js` if it needs behaviour

### Add a new NPC
1. Add entry to `NPC_DATA` in `data/npcs.js` — needs `id, name, char, color, portrait, readouts, dialogueRoot`
2. Add dialogue nodes in `data/dialogue.js`
3. Add entity spawn to the level in `data/levels.js`: `{ id: 'NEWNAME', type: 'npc', x: ?, y: ? }`
4. Mark NPC's map char in `CHAR_TO_TILE` (and `npcMarkers` in `world.js`) if using a letter marker

### Add a new quest
1. Add quest definition to `QUEST_DATA` in `quests.js`
2. Add quest-gated item entity to the level (with `questFlag`) in `data/levels.js`
3. Wire accept action into dialogue tree in `data/dialogue.js`:
   `action: (flags, player, engine) => engine.acceptQuest('your_quest_id')`
4. Set `getTurnIn()` NPC mapping in `quests.js`

### Change colors
Edit `window.SV.COLORS` in `config.js` — all canvas rendering reads from there.
Update matching CSS custom properties in `style.css` — all HTML panels read from there.
Keep them in sync manually (no build step auto-syncs them).

### Change the map
Edit the map string array in `data/levels.js`. Width = longest string. Height = array length.
Char reference: `.`=floor, `#`=wall, `+`=door, `>`=exit down, `<`=exit up,
`Q`=quest board, `0`=terminal, `V`=vending, `[`=container, `~`=water, `"`=grass,
`T`=tree, `%`=growth, `,`=rubble, `^`=mountain.

---

## Architecture notes

**Global namespace** — all modules attach to `window.SV`. No ES modules, no bundler.
Works from `file://` except for canvas font loading (hence the HTTP server requirement).

**Script load order matters** — see `index.html`. Dependencies must load before consumers:
`config → tiles → flags → data/* → player → world → quests → dialogue → renderer → ui → input → engine → main`

**Determinism** — the only non-deterministic code is `_openContainer()` in `engine.js`.
Everything else (movement, dialogue, quest checks, survey zones) is fully deterministic.
Swap `Math.random()` there for a seeded RNG if you need reproducible runs.

**Dirty flag** — the renderer only redraws when `engine._dirty = true`. Don't call
`renderer.render()` directly; set `_dirty = true` and let the rAF loop handle it.

**IDENTITY_DRIFT** — a counter in `flags`, never displayed directly. It shifts log entry
color from `COLORS.driftLow` (warm gray) to `COLORS.driftHigh` (cold blue), and gates
dialogue text variants. Accumulates from dialogue choices and survey zone visits.
