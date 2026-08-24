# 🍖 Monster Meatball

A board game about monster hunter-chefs who capture creatures, extract ingredients, and cook gourmet dishes for points. This repo contains a playable digital prototype alongside the full physical game design.

## ▶️ Play it

**Live version (once GitHub Pages is enabled — see below):**
`https://amerysiu.github.io/monstermeatball/`

**Locally:** just open `index.html` in any browser. It's a single self-contained file — no server, no build step, no dependencies.

## Enabling GitHub Pages

1. In this repo: **Settings → Pages**
2. Under "Build and deployment" → Source: **Deploy from a branch**
3. Branch: **main**, folder: **/ (root)**
4. Save. GitHub will publish `index.html` at the URL above within a minute or two.

## What's playable right now

- Full character select (4 heroes, each with real Stamina stats, passives, and a signature power)
- The three fixed map layouts (3×3 / 4×4 / 5×5), browsable before starting a game
- All 36 dishes as corner-scored cards (browsable in the Dish Gallery tab)
- A real turn loop: Explore → Hunt/Tame → Extract → Rest → Complete Dish → End Turn
- Stamina, AP pool, kill states (Careful/Bold/Desperate/Tame), the Flavor Family harmony/spoilage system, and catch-up mechanics are all live and tested

See `PROJECT_STATUS.md` for the full development log, what's tested, and what's still a known simplification (e.g. no card artwork yet, some Fog effects are simplified, tool-purchasing UI doesn't exist yet).

## Repo structure

```
index.html          ← the playable game (self-contained, this is what GitHub Pages serves)
src/                 ← the same code as separate, readable files
  index.html         ← same HTML, but with external <link>/<script> tags (for local dev)
  styles.css
  game-data.js       ← all game data: characters, monsters, dishes, map layouts, constants
  game-engine.js      ← the GameEngine class: turn logic, combat, extraction, scoring
  main.js            ← DOM rendering + UI wiring
  test-engine.js     ← 56-assertion test suite for game-engine.js (run: node src/test-engine.js)
docs/
  STORYBOARD.md              ← game world, character bios, ending table
  CHARACTER_REFERENCE.md     ← full character mechanics reference
  icon_design_spec.md        ← visual/icon design spec for card art (not yet produced)
PROJECT_STATUS.md    ← full session-by-session development log
```

## Running the test suite

```bash
cd src
node test-engine.js
```

56 assertions covering setup, movement/adjacency rules, Round-1-always-Clean, kill-state extraction legality (including the Careful-locks-to-lowest-edge rule), Tame/Companion mechanics, spoilage, corner-scored dish completion, signature-dish Family validation, catch-up scoring, and turn/round advancement.

## Known gaps

- No card artwork yet — everything renders with emoji icons and CSS
- Fog card effects beyond Dark Hour/Miasma are logged but not fully simulated
- Tool purchasing has no UI yet (tools only show if already a character's starting equipment)
- Extraction target selection (when holding multiple captured monsters) uses a plain browser `prompt()`, not a polished picker

Full details in `PROJECT_STATUS.md`.
