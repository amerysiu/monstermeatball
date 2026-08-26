# AGENTS.md — Monster Meatball

## What this repo is

A playable digital board game prototype (vanilla JS, no frameworks, no build step, no dependencies). A single `index.html` at the repo root is the shipped artifact — it inlines all CSS and JS. GitHub Pages serves it directly.

## Repo structure — two copies of the same code

```
index.html            ← self-contained game (CSS+JS inlined). This is what ships.
game-data.js          ← GAME_DATA constant + resolveHunt/resolveDishScore/checkSpoilage
game-engine.js        ← GameEngine class (turn logic, combat, extraction, scoring)
test-engine.js        ← standalone test suite (Node)

src/                  ← same code as separate files for local dev
  index.html          ← uses <link>/<script src> tags (not inlined)
  styles.css
  game-data.js
  game-engine.js
  main.js             ← DOM rendering + UI wiring (only in src/)
  test-engine.js

docs/                 ← game design docs (STORYBOARD, CHARACTER_REFERENCE, icon_design_spec)
PROJECT_STATUS.md     ← session-by-session development log
RULES.md              ← full rules document (design reference)
```

**CRITICAL**: Root files and `src/` files must stay in sync. They are the same code in two forms. When editing `game-data.js` or `game-engine.js`, update both locations.

## Commands

```bash
# Run tests (56 assertions, no dependencies needed)
cd src
node test-engine.js

# Syntax-check both JS files
node --check game-data.js
node --check game-engine.js
```

No lint, no typecheck, no formatter — this is vanilla JS with no toolchain.

## Architecture

- **`game-data.js`** — the single source of truth for all game constants: 4 characters, 20 monsters, 36 dishes, 4 Flavor Families, map layouts, tools, fog cards. Exports `GAME_DATA`, `resolveHunt`, `resolveDishScore`, `checkSpoilage`, `getCompanionFamily`.
- **`game-engine.js`** — the `GameEngine` class. Turn loop: Explore → Move → Hunt/Tame → Extract → Rest → Complete Dish → End Turn → Advance Round. Depends on everything from `game-data.js`.
- **`src/main.js`** — DOM rendering and UI event wiring. Only exists in `src/`, not at root.
- **Root `index.html`** — everything inlined (CSS + all JS concatenated). This is the production artifact.

In-browser: scripts share global scope via `<script>` tags. In Node (testing): `game-engine.js` uses `require('./game-data.js')` with a global-scope fallback guard.

## Key game rules that affect code

- Round 1: all kills are Careful, Stamina inactive, AP pool = 2. Round 2–3: AP pool = 3, Stamina active.
- Kill states: Careful (locks to lowest edge), Bold (shop-restricted edge), Desperate (bottom edge + double spoilage check), Tame (companion, not extraction).
- Spoilage: Ember≠Bloom, Tide≠Bloom (wait — actually Ember≠Bloom, Tide≠Verdant, Bloom≠Tide). Clears ALL units of both conflicting Families.
- Same-action cap: Hunt/Tame + Extract share a combined cap of 2 uses per turn.
- Ruin hunting limit: 3 attempts (successes AND failures) before exhausted.
- Duplicate HTML element IDs have caused bugs before — grep for collisions after adding elements.

## CI / GitHub Actions

- `.github/workflows/opencode.yml` — triggers on `/oc` or `/opencode` comments on issues/PRs. Runs the opencode agent with `deepseek-v4-flash-free`. Does NOT run tests.
- No test CI exists yet. If you add one, the command is `cd src && node test-engine.js`.

## What's still incomplete (as of Session 5)

- Utility tiles (Merchant, Kitchen, Shrine) are stubbed with TODO markers in the engine.
- Fog effects beyond Dark Hour/Miasma are logged but not fully simulated.
- Tool purchase UI doesn't exist — tools only show if starting equipment.
- Character passives beyond Bob/Hank/Tessa are defined in data but not all wired into engine logic.
- Visual assets: 0/142 images produced.
- Co-op mode: not implemented.
- Betrayal mechanic: not implemented.
