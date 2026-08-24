# MONSTER MEATBALL — Complete Rules (Draft for Review)

*This is the first time all rules have been compiled into one document. Comment/edit freely — nothing here is final. Numbers in [brackets] are implementation-verified against `game-data.js`; anything not yet built is marked ⏳.*

---

- **Overview**
  - 1–4 players (2–3 recommended), 30–45 minutes
  - Players are Monster Chefs: hunt monsters → extract ingredients → cook dishes → score Gourmet Points
  - Three rounds, map grows each round: 3×3 → 4×4 → 5×5
  - Two modes: **Competitive** (highest score wins) and **Co-op** ("Feast Challenge" — beat a shared clock)
  - Three rules tiers, taught progressively:
    - **Basic** — Round 1 only, always Clean kills, no Stamina, no Spoilage, no Fog, no combos
    - **Standard** — full 3-round game, Kill States, Stamina, Spoilage, Fog, Harmony bonuses
    - **Expert** — adds Diverse Palate bonus, optional character rules (e.g. Hank's Impulsive)

- **Setup**
  - Each player picks a character (no duplicates)
    - *comment: currently enforced in the digital version — confirm this is also a physical-game rule, or can two players share a character in a bigger group?*
  - Players start at the four corners of the grid
    - All 4 corners are always Ruins, guaranteeing every player an immediate first action
  - Round 1 grid (3×3) is set up per a **fixed layout**, not random placement
    - *comment: fixed layout was a deliberate choice so shop scarcity can't accidentally cluster in one corner — flag if you'd rather have some randomization for replay variety*

- **Turn Structure — Action Points (AP)**
  - Each turn, spend your AP pool on any combination of actions, in any order
    - Round 1: **2 AP** [verified]
    - Round 2: **3 AP** [verified]
    - Round 3: **3 AP** [verified]
  - Available actions (each costs 1 AP unless noted):
    - **Explore** — reveal one adjacent unrevealed tile
      - Reveals the tile's *type* only (Ruin / Shop / Fog / etc.) — NOT its contents
      - Monster/Fog-card contents are only drawn when you later **Act** on that tile ("Flip = information, Act = commitment")
    - **Move** — move to an adjacent tile that's already revealed
    - **Act** — use the current tile's ability:
      - On a Ruin: **Hunt** or **Tame** (see Kill States below)
      - On a Shop: **Extract** (see Extraction below)
      - On a Strange Place: trigger a Fog card
      - On a utility tile: see Utility Tiles below
    - **Rest** — recover +1 Stamina
  - Your own starting tile is automatically revealed at the start of each round (you know where you're standing)

- **Stamina**
  - Represents hunting exhaustion; separate from AP
  - Max Stamina varies by character (see Characters below); refills to max at the start of each round
  - **Round 1: Stamina is inactive entirely** — all kills are automatically Clean, no cost, no choice
  - **Round 2+:**
    - A successful Hunt costs Stamina depending on Kill State chosen (see below)
    - A **failed** Hunt costs Stamina equal to the monster's ATK stat (minimum 1)
    - At 0 Stamina, you can still Hunt, but **only Bold or Desperate** kill states are available — you're too tired for a Careful/precise kill
    - Resting (1 AP) recovers +1 Stamina

- **Hunting — Kill States** *(Round 2+ only; Round 1 is always Clean, see above)*
  - When you Hunt a monster, choose one of four approaches:
    - **🗡️ Careful** — locks you to the monster's single lowest-value edge (see Extraction below); costs 1 Stamina
      - *comment: this is the trickiest rule to teach — "safe" kill actually restricts your options later. Worth a clearer name?*
    - **🗡️~ Bold** — normal edge access at whichever shop you extract at; **refunds Stamina** instead of costing it
    - **🛠️ Desperate** — unlocks the Bonus (bottom) edge in addition to the normal edge; costs 1 Stamina; **checks Spoilage twice** instead of once
    - **🤝 Tame** — an alternative to killing entirely (see Tame below)
  - A successful Hunt requires your ATK ≥ the monster's HP

- **Tame (alternative to killing)**
  - Choose Tame instead of a kill state when Hunting
  - Same success check (ATK ≥ HP)
  - On success:
    - Immediately gain **one guaranteed ingredient** — the monster's single lowest-value edge — **no shop visit needed**
    - This ingredient **never spoils**
    - The monster becomes a permanent **Companion** (not discarded, never extracted again)
    - Each monster has a unique passive **Companion Bonus** that stays active the rest of the game
  - Taming counts toward the "Guardian Chef" ending and Tame-related End-Game Tasks / dish bonuses

- **Capture → Extraction (two-phase system)**
  - Hunting a monster (Bold/Careful/Desperate) doesn't grant ingredients immediately — it goes to your **Captured Monsters** pile, showing its kill state
  - Later, visit a Shop and spend 1 AP to **Extract**:
    - **Butcher** grants the Top edge (Meat)
    - **Aromaist** grants the Left edge (Aroma)
    - **Seasoning Mill** grants the Right edge (Seasoning)
  - Which edges are actually legal depends on your kill state:
    - **Bold** — may take whichever edge matches the shop you're standing at
    - **Careful** — locked to the monster's single lowest-value edge; only extractable at the shop matching *that* edge, even if it's not the shop you'd expect
    - **Desperate** — may take the shop's normal edge **or** the Bottom bonus edge (if its condition is met, e.g. "during Dark Hour")
  - Extraction grants **ingredient tokens** (not physical rotation of the monster card past this point) — the monster card is discarded once extracted
  - After extraction, run a **Spoilage check** (once normally, twice if Desperate)

- **Character Exception — Tracker Tessa**
  - May Extract directly at a Ruin, skipping the shop trip entirely
  - Trade-off: must resolve any Fog card face-up *before* choosing her Risk Posture that turn (can't act on hidden information the way others can)

- **Flavor Families** *(the core organizing system — replaces an earlier ad-hoc combo list)*
  - Every ingredient belongs to exactly one of 4 Families (1 Meat + 1 Aroma + 1 Seasoning each):
    - 🔥 **Ember** — Red Meat / Spicy Aroma / Fiery Seasoning
    - 🌊 **Tide** — Sea Meat / Salty Aroma / Mineral Seasoning
    - 🌿 **Verdant** — White Meat / Earthy Aroma / Herbal Seasoning
    - 🌸 **Bloom** — Exotic Meat / Sweet Aroma / Mystic Seasoning
  - This single grouping drives **both** of the systems below

- **Spoilage**
  - Three cross-Family pairs are incompatible; if you hold ingredients from both sides of a pair, **all held units of every type in both Families are discarded**:
    - 🔥 Ember ≠ 🌸 Bloom
    - 🌊 Tide ≠ 🌿 Verdant
    - 🌸 Bloom ≠ 🌊 Tide
  - Checked after every Extraction (twice if the kill was Desperate)
  - Tamed ingredients are always immune to spoilage

- **Dish Completion — Corner Scoring**
  - Dish cards are square; each corner holds a pre-printed score for a different outcome
  - When you spend ingredients on a dish, check which Family condition they satisfy:
    - **Top-Left** — No Harmony (no single Family is a majority)
    - **Top-Right** — Partial Harmony (majority of spent ingredients share one Family)
    - **Bottom-Left** — Diverse Palate, **Expert tier only** (3+ different Families used)
    - **Bottom-Right** — Perfect Harmony (100% one Family)
  - Three dish types:
    - **Standard** (22 dishes) [verified] — generic ingredient slots, any Family works, all 4 corners active
    - **Signature** (8 dishes, 2 per Family) [verified] — locked to one specific Family; only Bottom-Right is reachable, other 3 corners are structurally "locked" on the card
    - **Wildcard** (6 dishes) [verified] — flexible, low base value, safety-valve dishes; all 4 corners active
  - A few dishes have extra special rules layered on top of their corner score:
    - Catch-up bonuses (flat or scaling, if you're behind on points)
    - A Clean-kill-count bonus
    - A Tame-count bonus
    - A "Legendary" dish that scores less if another player already completed it first
    - A Round-3-only restriction on the finale dish

- **Map — Fixed Layouts** *(not randomized — see comment above under Setup)*
  - Round 1 (3×3): 4 Ruins, 1 Butcher, 1 Aromaist, 1 Seasoning Mill, 2 Strange Places [verified]
  - Round 2 (4×4): 6 Ruins, 2 Butcher, 1 Aromaist, 1 Seasoning Mill, 3 Strange Places, 1 Merchant's Camp, 1 Magic Well, 1 Old Watchtower [verified]
  - Round 3 (5×5): 9 Ruins, 2 Butcher, 1 Aromaist, 1 Seasoning Mill, 5 Strange Places, 2 Merchant's Camp, 1 Magic Well, 1 Old Watchtower, 1 Abandoned Kitchen, 1 Shrine of the Fog, 1 Crucible (center) [verified]
  - Aromaist and Seasoning Mill deliberately stay at exactly 1 each even as the map grows — the intended scarcity bottleneck
  - The Crucible sits at the exact geometric center of Round 3 — equidistant from all 4 starting corners

- **Utility Tiles** *(Round 2+)*
  - **Merchant's Camp** 🏕️ — sell excess ingredients (2:1), buy Tools, or use Ingredient Insurance ⏳ *not yet built in the digital prototype*
  - **Magic Well** 💧 — full Stamina restore + 1 Reroll Token, OR cleanse one spoilage-flagged ingredient
  - **Old Watchtower** 🗼 — reveal 2 additional adjacent tiles for free (no AP cost)
  - **Abandoned Kitchen** 🍳 *(Round 3 only)* — complete a Wildcard Dish immediately, no shop needed ⏳
  - **Shrine of the Fog** ⛩️ *(Round 3 only)* — peek at the Crucible's monster draw before committing, OR guarantee your next kill is Clean ⏳
  - **The Crucible** 🔥 *(Round 3 center)* — draw 2 monsters, choose 1; forced Brutal-equivalent (Desperate) kill; any edge including Bottom; Spoilage checked twice

- **Fog of Flavor Cards** *(triggered by Acting on a Strange Place)*
  - **Dark Hour Descends** — begins "Dark Hour," lasts until round end; affects bonus-edge conditions
  - **Lingering Miasma** — all extractions -1 this round (min 1)
  - **Monster Migration** — place a facedown monster on an adjacent Ruin
  - **Hidden Opportunity** — ignore spoilage once this round
  - **Collapsed Path** — one tile blocked this round
  - **False Calm** — no effect (uncertainty/bluff card)

- **Tools** *(6 total, cost = ingredient tokens, all now touch Stamina)*
  - **Net** — upgrade Rushed→Clean if monster HP ≤ 2; no Stamina change
  - **Spear** — choose Clean or Rushed; if Rushed, refunds +2 Stamina total instead of +1
  - **Bow** — force Rushed, ignore monster reaction; normal Rushed refund applies
  - **Cleaver** — force Brutal; redundant-but-thematic on Butcher Bob, whose passive already zeroes Brutal's Stamina cost
  - **Hammer** — force Brutal; costs 1 EXTRA Stamina on top of normal cost; tool exhausts after use
  - **Trap** — Clean if monster was facedown; hunting a freshly-revealed monster with a Trap equipped costs 0 Stamina entirely

- **Characters** *(4 total)*
  - **🔪 Butcher Bob** — *Power → Restraint*
    - ATK 3 (highest), Max Stamina 3
    - Starts with: Cleaver equipped
    - Passive "Heavy Hand": Brutal/Desperate kills cost 0 Stamina; Clean/Careful kills cost +1 extra Stamina
    - Signature "Perfect Cut" (1/game): extract from 2 edges of the same monster in one Act
  - **🏹 Tracker Tessa** — *Precision → Adaptability*
    - ATK 2, Max Stamina 4 (highest)
    - Starts with: +1 Reroll Token (3 total instead of the standard 2)
    - Passive "Efficient Hunter": Extract directly at Ruins (skip shop); must resolve Fog cards face-up before choosing Risk Posture
    - Signature "Ambush Hunter" (1/game): Hunt 2 monsters in one Act
  - **🪤 Trapper Tim** — *Caution → Courage*
    - ATK 1 (lowest), Max Stamina 3
    - Starts with: Trap equipped
    - Passive "Snarer's Patience": facedown Ruins hunted immediately on reveal are always Clean-eligible regardless of Stamina
    - Signature "Preservation Expert" (1/game): ignore all spoilage checks for the rest of the round
  - **⚔️ Hunter Hank** — *Courage → Wisdom*
    - ATK 2, Max Stamina 3
    - Starts with: +1 bonus AP token, usable once, any round
    - Passive "Steady Nerve": once per round, Hunt without spending Stamina
    - Signature "Fearless Feast" (1/game): complete a dish without paying one required ingredient type
    - Optional Expert rule "Impulsive": in Round 1 only, if adjacent to an unrevealed Ruin at turn start, must Explore it first

- **Catch-Up Mechanics**
  - First player each round (Round 2+) is whoever has the **fewest** Gourmet Points, not a fixed rotation
  - Several dishes have built-in catch-up bonuses (flat +2, or scaling up to +3 based on point gap) — see Dish Completion above
  - *(Design intent from earlier discussion, not all yet ported to a single canonical list: Reroll Tokens, Market Refresh, "draw 2 monsters choose 1" — comment if you want these re-confirmed as still-active rules)*

- **Player Count Scaling** [verified from data]
  - 1 player: Co-op only, Rounds 1–2
  - 2 players: Rounds 1–2, recommended
  - 3 players: full Rounds 1–3, recommended
  - 4 players: full Rounds 1–3, "use simultaneous" flagged — *comment: simultaneous-turn variant for 4p was discussed early on but I don't see it implemented anywhere concrete; worth deciding if it's in or out*

- **Co-op Mode — "The Feast Challenge"**
  - Shared ingredient pool, free trading between players
  - A **Dark Hour Track** counts up; reaching its max = loss
  - Goal: complete a target number of Festival Dishes before the Track maxes out
  - Four difficulty presets [verified]:
    - Easy — 6 dishes, 3 starting ingredients, track speed ×0.5
    - Normal — 8 dishes, 2 starting ingredients, track speed ×1
    - Hard — 10 dishes, 1 starting ingredient, track speed ×1
    - Expert — 12 dishes, 0 starting ingredients, track speed ×2
  - ⏳ *not yet implemented in the digital prototype — competitive mode is what's actually playable right now*

- **Round Progression**
  - A round ends when either: every tile is revealed, or the monster deck for that round is exhausted
    - *comment: this is a simplified stand-in — the original design intent was closer to "no valid moves remain," which is more permissive. Confirm which you actually want.*
  - Between rounds: grid expands and rebuilds, Stamina and AP refill for everyone, players reposition to the new corners, first player becomes whoever has the fewest points

- **Ending / Win Condition**
  - Competitive: highest Gourmet Points after Round 3 wins
  - At game end, check each player's Kill Log (tally of Careful/Bold/Desperate/Tame counts) against the Ending Table for flavor (not scoring):
    - Tamed 3+ monsters → **The Guardian Chef**
    - Desperate/Brutal kills = majority → **The Wild Chef**
    - Careful/Clean kills = majority, zero Desperate → **The Master Chef**
    - Mixed, no clear majority → **The Forgotten Recipe**

---

*Sections marked ⏳ are designed but not yet built in the digital prototype. Sections marked [verified] are pulled directly from the current `game-data.js` so they're guaranteed accurate as of this writing — everything else reflects design discussion and may need a final confirmation pass.*
