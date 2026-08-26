# MONSTER MEATBALL — Complete Rules (Draft for Review)

*This is the first time all rules have been compiled into one document. Comment/edit freely — nothing here is final. Numbers in [brackets] are implementation-verified against `game-data.js`; anything not yet built is marked ⏳.*

---

- **Overview**
  - 1–4 players (2–3 recommended), 30–45 minutes
  - Players are Monster Chefs: hunt monsters → extract ingredients → cook dishes → score Gourmet Points
  - Three rounds, map grows each round: 4×4 → 5×5 → 6×6 [CHANGED — bumped up one size step this session; smaller sizes caused a severe pacing problem at higher player counts, verified via simulation: 53 turns/player solo collapsed to 6.7 turns/player at 4 players]
  - Two modes: **Competitive** (highest score wins) and **Co-op** ("Feast Challenge" — beat a shared clock)
  - Three rules tiers, taught progressively:
    - **Basic** — Round 1 only, always Careful kills, no Stamina, no Spoilage, no Fog, no combos
    - **Standard** — full 3-round game, Kill States, Stamina, Spoilage, Fog, Harmony bonuses
    - **Expert** — adds Diverse Palate bonus, optional character rules (e.g. Hank's Impulsive)

- **Setup**
  - Each player picks a character (no duplicates)
    - *comment: currently enforced in the digital version — confirm this is also a physical-game rule, or can two players share a character in a bigger group?*
  - **Map placement is randomized each game** — for 4×4, 5×5, and 6×6 alike [CONFIRMED, implemented in the actual engine this session — previously the engine still silently used old fixed layout templates from before randomization was even decided, several sessions after that decision was made]
    - **Corners are mandatory Ruins** — always, regardless of shuffle, guaranteeing every player an immediate first action
    - Every other tile (Shops, Strange Places, utility tiles) is placed randomly among the remaining positions
    - Same location-type counts per round as before (e.g. Round 1 still gets exactly 7 Ruins / 1 Butcher / 1 Aromaist / 1 Seasoning Mill / 4 Strange Places — just shuffled placement)
  - **Starting position:**
    - **Co-op mode:** each player may choose *any* corner tile to start (not assigned)
    - **Competitive mode:** each player must choose a *different* corner from every other player
    - *comment: what determines choosing order (turn order? simultaneous? highest/lowest something)? Not yet specified — flag your preference.*

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
  - **Same-action cap:** Hunt/Tame and Extract can each be used at most **2 times per turn** [CONFIRMED, implemented in engine this session] — they share one combined cap (Hunt and Tame together count as one "Ruin engagement" bucket, so you can't dodge the cap by alternating between them). Explore/Move/Rest are deliberately **not** capped — they're traversal/logistics, not value generation, and restricting them would hurt movement on the bigger maps. This is automatically inert in Round 1 (2 AP can never reach a 3rd use of anything anyway)
    - *Why this exists: without it, one turn could drain a Ruin's entire hunt cap or hammer one shop in a single go, front-loading value that should be spread across multiple turns*
  - Your own starting tile is automatically revealed at the start of each round (you know where you're standing)

- **Stamina**
  - Represents hunting exhaustion; separate from AP
  - Max Stamina varies by character (see Characters below); refills to max at the start of each round
  - **Round 1: Stamina is inactive entirely** — all kills are automatically Careful, no cost, no choice
  - **Round 2+:**
    - A successful Hunt costs Stamina depending on Kill State chosen (see below)
    - A **failed** Hunt costs Stamina equal to the monster's ATK stat (minimum 1)
    - At 0 Stamina, you can still Hunt, but **only Bold or Desperate** kill states are available — you're too tired for a Careful/precise kill
    - Resting (1 AP) recovers +1 Stamina

- **Inventory Capacity** *(NEW — you can't hold unlimited ingredients or captured monsters)*
  - Two separate limits, both starting at a value that varies by character, both **expandable during play via Gear** (see Tools section below):
    - **Ingredient Token capacity** — the total number of tokens you can hold across all types combined
    - **Captured Monster capacity** — how many un-extracted monster cards you can be carrying at once (this is separate from Companions, which don't count against this limit — once Tamed, a monster is no longer "carried," it's a permanent fixture beside your Character card)
  - **What happens at the cap:** you simply cannot Hunt (if at Captured Monster cap) or gain a new ingredient (if at Token cap) until you free up space — by Extracting a captured monster, spending tokens on a dish, or losing tokens to Spoilage
    - *comment: should hitting the cap flat-out block the action, or force an immediate discard of your choice to make room? Blocking is simpler to teach; forced-discard keeps the tension higher but adds a decision mid-action. I've written it as "blocked" below — flag if you want the discard version instead.*
  - **Proposed starting values per character** (numbers are a first pass, easy to retune):

    | Character | Ingredient Tokens | Captured Monsters | Reasoning |
    |---|:---:|:---:|---|
    | Butcher Bob | 6 | 3 | Big, physically strong — matches his "family butcher shop" background |
    | Tracker Tessa | 5 | 1 | Travels light; also extracts directly at Ruins, so she rarely needs to *carry* monsters at all |
    | Trapper Tim | 5 | 2 | Cautious planner, average carry |
    | Hunter Hank | 5 | 2 | Balanced, no built-in weakness (matches his existing design identity) |

  - *comment: these are proposed defaults reflecting each character's existing flavor, not confirmed numbers — adjust freely.*
  - **Expansion via Gear:** certain Tools (see below) grant a permanent capacity increase in addition to their combat effect, once acquired

- **Monster Deck Preparation** *(answers: how is the monster card prepared — a side deck?)*
  - Yes — a **shared, shuffled, face-down deck** sits beside the board, built fresh each round from that round's tier pool (Round 1 = Tier I only, Round 2 = Tier I+II, Round 3 = Tier II+III)
  - The deck is NOT pre-assigned to specific Ruins — a card is only drawn from the top of the deck at the moment a player Acts (Hunts/Tames) on a Ruin for the first time
  - This matches the existing "Flip = information, Act = commitment" principle: exploring a Ruin tells you it's a Ruin, but not which monster is there — that's only revealed the moment someone actually commits to hunting there

- **Where does extraction info live — on the card, or a separate reference?**
  - **Recommendation: on the card itself, printed on all 4 edges.** This isn't really a close call given the game's core design pillar — the whole point of the rotation mechanic is that *the physical card is the interface*: no tokens, no external lookup, no separate reference sheet to cross-check
  - Concretely: each Monster card prints its Meat/Aroma/Seasoning/Bonus values directly on its four edges. When you extract, you're reading straight off the card in front of you, not flipping to a table
  - A separate side-deck/reference-sheet approach would work mechanically, but throws away the tactile clarity that's the game's signature idea — it would turn a glance into a lookup, which is exactly what the rotation system was built to avoid
  - Practical implication: once a monster is captured, keep the physical card with the player (showing its kill-state icon) until it's extracted at a shop — the card is doing double duty as both "what I caught" and "what I can get from it," which is why no separate stat sheet is needed

- **Hunting — Kill States** *(Round 2+ only; Round 1 is always Careful, see above)*
  - When you Hunt a monster, choose one of four approaches:
    - **🗡️ Careful** — locks you to the monster's single lowest-value edge (see Extraction below); costs 1 Stamina
      - *comment: this is the trickiest rule to teach — "safe" kill actually restricts your options later. Worth a clearer name?*
    - **🗡️~ Bold** — normal edge access at whichever shop you extract at; **refunds Stamina** instead of costing it
    - **🛠️ Desperate** — unlocks the Bonus (bottom) edge in addition to the normal edge; costs 1 Stamina; **checks Spoilage twice** instead of once
    - **🤝 Tame** — an alternative to killing entirely (see Tame below)
  - A successful Hunt requires your ATK ≥ the monster's HP

- **Tame (alternative to killing)**
  - Choose Tame instead of a kill state when Hunting
  - **Requires a higher bar than killing:** ATK ≥ HP + 2, not just ATK ≥ HP [CHANGED and CONFIRMED, implemented this session] — subduing a monster alive is harder than simply defeating it
    - **This is severe without tool help:** base ATK across the 4 characters is Bob 3 / Tessa 2 / Tim 1 / Hank 2. Since even the weakest monster in the game is HP 1 (needs ATK ≥ 3), only Butcher Bob can Tame *anything* unassisted, and only the 3 weakest Tier I monsters. Tessa and Hank cannot Tame anything at all without help — verified via a dedicated test that Tessa fails to Tame even the game's weakest monster
    - **Trap tool grants +2 effective ATK, specifically for Tame attempts only** (does not inflate normal killing power) — thematically fitting, since a trap is the archetypal live-capture tool, not a killing weapon. Trapper Tim starts equipped with Trap, so his effective Tame ATK is 1+2=3, matching Bob's unassisted baseline
    - *comment: this currently means Tessa and Hank have **no path to ever Taming anything** in the digital prototype, since Tools aren't yet dynamically acquirable (Merchant purchase is still ⏳) and neither starts with a Tame-capable tool. Worth deciding: is this the intended severity (Taming becomes Bob/Tim's specialty until Merchant purchasing exists), or should another tool/mechanism give Tessa/Hank a path sooner?*
  - Same underlying combat check either way — it's the *threshold* that differs, not the mechanism
  - On success, for **Tier I/II monsters** (the common case):
    - Immediately gain **one guaranteed ingredient** — the monster's single lowest-value edge — **no shop visit needed**, and this ingredient **never spoils**
    - The monster becomes a permanent **Companion**: place its card face-up **next to your Character card** — not in your regular Captured Monsters pile, and not discarded [CONFIRMED]
    - Subject to two limits, both [CONFIRMED, implemented and tested this session]:
      - **Cap: at most 3 permanent Companions at once** (before any Cinder Phoenix bonus — see Companion Ability Types below)
      - **Family conflict:** cannot hold two Companions whose Families conflict (same pairs as Spoilage — Ember≠Bloom, Tide≠Verdant, Bloom≠Tide). A Companion's Family is the majority Family among its 3 main edges
      - If either limit is hit, the Tame attempt **gracefully falls back to a normal capture** (Bold-tier access, awaiting shop extraction) rather than failing outright — your Stamina/AP were already spent on the Hunt, so getting nothing at all would be unfairly harsh
    - **No further shop extraction ever** — this monster provides no more ingredients through Butcher/Aromaist/Seasoning Mill. (It CAN still be given up later through Betrayal — see below — but that's a distinct, costly, one-way choice)
    - Each monster has a unique **Companion Ability** — see the new section immediately below for what these actually do and how to use them
  - On success, for **Tier III monsters** (rarer, more powerful) — see "One-Shot Companions" below, a meaningfully different path
  - Taming counts toward the "Guardian Chef" ending and Tame-related End-Game Tasks / dish bonuses

- **Companion Ability Types — What "Kill vs. Tame" Actually Trades Off** [NEW this session — previously every Companion Ability was pure flavor text with no way to actually use it]
  - There are now four distinct kinds of Companion ability, which is the real answer to "how do I use an ability from my Companion":
    1. **PASSIVE** — applies automatically, all the time, no action needed. Example: Flame Lizard's Companion grants +1 max Stamina for the rest of the game, forever, without you doing anything
    2. **ACTIVE, unlimited uses per game but each use has its own cost** — you actively choose *when* to trigger it, as a real action on your turn. "Unlimited" means no cap on how many rounds you can use it, not that it's free — though a few abilities' own flavor text specifically promises "free action (0 AP)," and those genuinely cost 0 to activate (see worked example below)
    3. **ACTIVE, once per round** — same as above, but locked out after the first use each round until it refills at the next round's start
    4. **ONE-SHOT** (Tier III only) — see below; a single powerful burst at the moment of taming, then the monster departs
  - **The actual decision this creates, concretely:**
    - **Kill it:** monster is consumed, you get ingredient *tokens* (fungible currency, spendable on any dish) — potentially a higher-value edge than Tame's guaranteed-lowest, but the monster provides nothing else, ever, after extraction
    - **Tame it (Tier I/II):** smaller guaranteed ingredient now, but you gain a standing asset for the rest of the game — either a permanent passive buff, or a reusable ability you get to decide when to spend, occupying one of only 3 precious slots
    - **Tame it (Tier III):** a middle path — smaller ingredient now, plus one genuinely powerful one-time effect, and the slot is never occupied at all since the monster leaves immediately after
  - **Worked example of an ACTIVE ability, start to finish:** Grumble Boar's Companion ability is "once per round, recover +1 Stamina as a free action." On your turn, you call `useCompanionAbility` targeting Grumble Boar — it costs 0 AP (matching its own "free action" text), grants +1 Stamina immediately, and locks that specific ability until next round. [CONFIRMED — tested end-to-end, including specifically verifying it doesn't cost AP, since an earlier draft of this rule would have charged 1 AP to activate a "free" action, netting to zero actual benefit]
  - **Current coverage of the 20 monsters' abilities** (accurate as of this session — some are real, some are still just described text with no code behind them yet):
    - ✅ **Mechanically real (13 of 20):** Flame Lizard (+1 max Stamina, PASSIVE), Grumble Boar (free Rest, ACTIVE/round), Tide Eel (grants a Spoilage-immunity charge, ACTIVE/round), Ember Crab (Desperate extractions single-check, PASSIVE), Bristle Yak (Rest recovers +2, PASSIVE), Candy Slime & Sky Serpent (+1 Reroll Token immediately, at taming), Pearl Manta (immune to Ember≠Bloom specifically, PASSIVE), Frost Owlbear (free Move, ACTIVE/round), and all four Tier III one-shot bursts (see below)
    - ⏳ **Still just descriptive text, not yet wired to real mechanics (7 of 20):** Moss Stag, Rock Golem, River Leviathan, Mirror Kitsune, Spore Shambler, Thorn Basilisk, Pepper Harpy — attempting to use one of these currently returns a clear "designed but not yet implemented" message rather than silently doing nothing

- **One-Shot Companions (Tier III)** [rewritten this session — the original flavor text for these 4 monsters described *ongoing* effects, which contradicted the mechanical reality that they depart immediately after Taming and can't keep providing anything ongoing. Rewritten as genuine one-time bursts, and now actually implemented, not just narrated]
  - Always allowed regardless of the 3-Companion cap or Family conflict — since the monster never sticks around, there's nothing to conflict with
  - Grants the same guaranteed lowest-edge ingredient as any Tame, **plus** an immediate, powerful, one-time effect, **then the monster departs** (recorded in a separate history list, doesn't occupy one of your 3 slots)
  - The four burst effects, all [CONFIRMED, tested]:
    - **Sulfur Wyrm** — immediately gain 2 Reroll Tokens
    - **Abyss Angler** — immediately clears Dark Hour and Miasma for the rest of the round (a genuine "hero saves the day" moment — verified this actually resets both flags, not just narratively)
    - **Iron Tortoise** — immediately restore your Stamina to maximum
    - **Cinder Phoenix** — immediately gain **+1 to your maximum Companion slots, permanently for the rest of the game** — meaning taming one, even though it itself doesn't stick around, opens room for a 4th *permanent* Companion later

- **Companion Betrayal** *(an optional way to reverse a Tame decision later, at a steep cost)*
  - At any time on your turn, you may choose to **Betray** one of your own Companions — no shop needed, no AP cost, but:
    - **Cost: your Stamina drops to 0**, regardless of what it currently is — you must have **at least 1 Stamina** to attempt this at all (if you're already at 0, you cannot betray a Companion until you've rested)
    - *comment: this reading treats "use up all Stamina" as "however much you have, all of it goes" — meaning a player who's already careful about resting could betray more easily than one who's been reckless. Flag if you instead meant a flat, fixed Stamina cost regardless of current total.*
  - On Betrayal:
    - Choose **any one edge** the monster hasn't already given you — including the Bottom bonus edge, if its condition is met (same access tier as a Desperate kill, since betrayal is at least as ruthless)
    - Gain that edge's ingredient immediately, no shop visit needed (same immediacy as the original Tame)
    - **Check Spoilage twice**, same as any Desperate-tier extraction
    - The Companion Ability ends immediately — the card is discarded, not kept
    - Mark it in your Kill Log as **Betrayed** — a distinct category from Careful/Bold/Desperate/Tame, since it matters differently for the ending (see below)
  - **Ending Table impact:** a player with **any** Betrayed Companions cannot achieve the "Guardian Chef" ending this game, regardless of how many other monsters they Tamed — and should likely qualify for "Wild Chef" outright, overriding the normal majority-kill-type check
    - *comment: this is my recommendation, not yet reflected in the Ending Table rewrite below — confirm before I lock it in, since it makes even a single Betrayal thematically decisive rather than just adding to a ratio.*
  - **Hook for future content:** specific Dish cards, End-Game Tasks, or Fog events could require or reward Betrayal directly (e.g. a dish that only unlocks its Perfect Harmony corner if you've Betrayed a Companion, echoing the "Wild Chef" arc). None of these exist yet — flagging this as a slot for future design, not committing to a specific card yet
  - ⏳ *Still not implemented in the digital prototype — this is the one major piece of the originally-designed Companion system that hasn't caught up yet. `game-engine.js`'s `killLog` currently has no BETRAYED category, and there's no Betrayal action at all.*

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

- **Shop Usage Limit** *(prevents a player — or the group — from farming one shop indefinitely)*
  - A shop tile (Butcher / Aromaist / Seasoning Mill) may be used for **2 consecutive Extractions**, then must **rest for 1 turn-cycle** before it can be used again
  - Track this with a small counter on the tile itself (e.g. 2 pip markers, physically flipped/removed as used) — matches the game's existing philosophy of physical state over external tracking
  - *comment: one thing to confirm — is "consecutive" counted per-shop globally (any players' uses back-to-back count toward the same 2, so the group collectively rests it), or per-player (only counts if the SAME player uses it twice in a row, resetting when someone else visits)? I've written this as the global/shared version below since shops are a communal board resource, not owned by one player — flag if you meant the per-player version instead, since it changes the pacing quite a bit (global is a much bigger bottleneck).*
  - Once rested (1 turn-cycle with no Extraction there), the counter resets and the shop is fully available again
  - ⏳ *Still not implemented in the digital prototype — the open question above needs an answer before this can be built. The Ruin cap below, by contrast, IS now implemented (its equivalent open question got resolved this session).*

- **Ruin Hunting Limit** *(prevents endlessly farming one Ruin instead of exploring)*
  - Each Ruin can be Hunted/Tamed at up to **3 times** before it's exhausted
  - On the 3rd hunt attempt at a Ruin (**counting both successes AND failures** — this open question is now resolved and implemented), the Ruin becomes **Exhausted**
    - An Exhausted Ruin can still be walked through / stood on (still a legal Move target), but no longer offers the Hunt or Tame action
    - Counting failures too prevents a Ruin with weak monsters from being farmed indefinitely by deliberately losing to dodge the cap
  - [CONFIRMED, implemented in the actual engine this session — this was previously only ever simulated at the bot-testing layer (a separate script used for balance analysis), never in the real game logic itself. Verified: a fresh Ruin allows exactly 3 attempts, the 4th is rejected with a clear message, and Monster Migration (see Fog Cards below) correctly skips an already-exhausted Ruin when choosing where to place a migrated monster]

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

- **Spoilage — How the Conflict System Actually Works**
  - Three cross-Family pairs are incompatible; if you hold ingredients from both sides of a pair, **all held units of every type in both Families are discarded** — not just one unit each:
    - 🔥 Ember ≠ 🌸 Bloom
    - 🌊 Tide ≠ 🌿 Verdant
    - 🌸 Bloom ≠ 🌊 Tide
  - **When it's checked:** after every Extraction — once normally, **twice** if the kill was Desperate (or, per the new Dark Hour rule below, twice for *any* extraction during Dark Hour)
  - **Why "twice" isn't usually scary:** the first check already clears out anything conflicting. If nothing conflicts anymore, the second check simply finds nothing to do — it's not a second *chance* to be punished, it's a safety net for the rare case where the first check's discard somehow still leaves a conflict (it currently can't, given only 3 pairs across 4 Families, but the double-check exists so Desperate/Dark-Hour extractions are unambiguously "riskier," not just narratively so)
  - **Worked example (why this matters strategically):**
    - You're holding: Red Meat ×2 (Ember), Spicy Aroma ×1 (Ember), Sweet Aroma ×1 (Bloom)
    - You Extract a new ingredient: Mystic Seasoning ×1 (Bloom)
    - Spoilage check runs: Ember present (Red Meat, Spicy Aroma) AND Bloom present (Sweet Aroma, Mystic Seasoning) → **conflict!**
    - Result: you lose **all four** — both Red Meat, the Spicy Aroma, the Sweet Aroma, and the Mystic Seasoning you just got. Not just the two that "touched," everything in both Families
  - **Why hold conflicting Families at all, then?** You usually shouldn't — this is deliberate pressure toward committing to one Family (rewarded by Perfect Harmony on dishes) rather than hoarding a bit of everything. The risk is the natural counterweight to greed: casting a wide net across Families for Diverse Palate (Expert tier) is viable, but every extraction while doing so is a small gamble that you'll draw into a conflicting pair before you can spend down to a dish
  - **What doesn't trigger it:** ingredients gained via **Tame are always immune**, since they're granted outside the normal extraction flow and represent a "clean, respectful" acquisition rather than an exploitative one — this is also a small mechanical nudge toward the Guardian Chef playstyle
  - **Interaction with Companion Betrayal:** a Betrayed edge is extracted at Desperate-tier access, so it **does** trigger the double-check — Betrayal gets no special immunity, unlike ordinary Taming

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
    - A Careful-kill-count bonus
    - A Tame-count bonus
    - A "Legendary" dish that scores less if another player already completed it first
    - A Round-3-only restriction on the finale dish

- **Map — Randomized Placement, Fixed Counts** [CHANGED — see Setup above]
  - Round 1 (4×4=16 tiles): 7 Ruins, 1 Butcher, 1 Aromaist, 1 Seasoning Mill, 4 Strange Places, 1 Merchant's Camp, 1 Magic Well [verified against actual game-data.js]
  - Round 2 (5×5=25 tiles): 10 Ruins, 2 Butcher, 1 Aromaist, 1 Seasoning Mill, 5 Strange Places, 2 Merchant's Camp, 1 Magic Well, 1 Old Watchtower, 1 Abandoned Kitchen, 1 Shrine of the Fog [verified]
  - Round 3 (6×6=36 tiles): 15 Ruins, 2 Butcher, 2 Aromaist, 2 Seasoning Mill, 6 Strange Places, 2 Merchant's Camp, 2 Magic Well, 2 Old Watchtower, 1 Abandoned Kitchen, 1 Shrine of the Fog, 1 Crucible [verified — note Aromaist/Seasoning Mill finally get a 2nd copy here, previously stuck at 1 forever even as the map tripled in size]
  - Aromaist and Seasoning Mill stay scarce (1 each) through Round 1–2, finally getting a 2nd copy at Round 3 — still the intended bottleneck, just no longer permanently frozen at 1 regardless of map size
  - **Correction to an earlier assumption in this doc:** the actual implemented `generateRandomLayout()` does **NOT** pin the Crucible to center — only the 4 corners are special-cased (always Ruin); the Crucible is just part of the same shuffled pool as everything else, so its position is now fully random each game
    - *comment: this means the "equidistant from all 4 corners" fairness property this doc previously assumed no longer holds as implemented — the Crucible could land anywhere, favoring whichever corner happens to be closest. Worth a real decision: pin it to center (restores fairness, matches the original design rationale), or keep it fully random (turns "where is the Crucible" into its own strategic unknown, which some groups might prefer)? Currently shipped behavior is the latter, by omission rather than a deliberate choice.*

- **Utility Tiles** *(Round 2+)*
  - **Merchant's Camp** 🏕️ — sell excess ingredients (2:1), buy Tools, or use Ingredient Insurance ⏳ *not yet built in the digital prototype*
  - **Magic Well** 💧 — full Stamina restore + 1 Reroll Token, OR cleanse one spoilage-flagged ingredient
  - **Old Watchtower** 🗼 — reveal 2 additional adjacent tiles for free (no AP cost)
  - **Abandoned Kitchen** 🍳 *(Round 3 only)* — complete a Wildcard Dish immediately, no shop needed ⏳
  - **Shrine of the Fog** ⛩️ *(Round 3 only)* — peek at the Crucible's monster draw before committing, OR guarantee your next kill is Careful ⏳
  - **The Crucible** 🔥 *(Round 3 center)* — draw 2 monsters, choose 1; forced Desperate kill; any edge including Bottom; Spoilage checked twice

- **Fog of Flavor Cards — How Events Actually Work** [CONFIRMED, fully implemented in the actual engine this session — previously this entire system was designed in detail but had ZERO code path; a player standing on a Strange Place and trying to Act would simply fail with "Not standing on a Ruin." Verified via 10+ dedicated tests, stable across repeated runs]
  - **When they trigger:** only when a player **Acts** on a Strange Place tile — matching the same "Explore = info, Act = commitment" rule as Ruins. Exploring a Strange Place just tells you it's a Strange Place; the card is only drawn and resolved when someone commits to Acting there
  - **One-time per tile:** once a Strange Place resolves a card, it's done for the round — can't be re-triggered for a second draw
  - **Deck composition (12 cards total):**
    - Dark Hour Descends ×2
    - Lingering Miasma ×2
    - Monster Migration ×2
    - Hidden Opportunity ×1
    - Collapsed Path ×2
    - False Calm ×3
  - **Who it affects:** all six cards affect the *whole table*, not just the player who triggered them — Fog is an environmental event, not a personal one (except Hidden Opportunity, which is personal). This means Acting on a Strange Place is a bit of a gamble even for a considerate player: you might be handing every other player a Dark Hour that benefits *their* monster's Bottom edge, not yours
  - **What each one does:**
    - **Dark Hour Descends** — begins "Dark Hour" for the rest of the round (see the dedicated Dark Hour section below)
    - **Lingering Miasma** — every Extraction this round yields 1 less of its ingredient (minimum 1) — verified: a 2-value edge extraction correctly yields 1 while Miasma is active
    - **Monster Migration** — take the top card of the current tier's Monster Deck and place it facedown on any adjacent-to-the-Strange-Place Ruin tile that is revealed, unclaimed, AND not already exhausted (verified this exclusion works — Migration will not waste a monster on a Ruin that can never be hunted again)
    - **Hidden Opportunity** — the *triggering player* gains a personal, savable charge that automatically absorbs their next Spoilage hit entirely (a small mercy in an otherwise table-wide event)
    - **Collapsed Path** — a random currently-unrevealed tile is blocked; Exploring it is rejected for the rest of the round (verified)
    - **False Calm** — nothing happens; exists purely so Acting on a Strange Place is never a sure thing either way, good or bad
  - **Design note on why False Calm exists at 3 copies (the most common single card):** without a "nothing happens" result, every Strange Place visit would be meaningfully swingy in one direction, making Strange Places either always-worth-it or always-to-avoid. Weighting the deck toward "no effect" keeps the *decision* to Act on a Strange Place itself uncertain, not just the outcome

- **Dark Hour — What It Actually Does** [CONFIRMED, fully implemented this session]
  - **Triggered by:** the "Dark Hour Descends" Fog card (2 copies in the deck), OR automatically the moment any player Acts on the Crucible in Round 3
  - **Duration:** lasts until the current round ends — not just the triggering player's turn, and not just until the next player's turn. It's a round-wide state
  - **Confirmed effects** [both now actually implemented and verified, not just designed]:
    - Any monster Bottom (bonus) edge with the condition **"Dark Hour"** printed on it becomes accessible — verified via a dedicated test that the same extraction attempt correctly fails without Dark Hour active and succeeds once it's active
    - **All Extractions check Spoilage twice during Dark Hour, regardless of kill state** — verified via a test where a normally-single-check Bold extraction still correctly spoiled a pre-existing ingredient because Dark Hour forced the second check
  - **How likely is Dark Hour to actually happen, and to stack with Miasma?** [NEW — computed this session, both mathematically and via a 50,000-trial simulation matching the math within 0.15 percentage points]
    - If players thoroughly trigger every revealed Strange Place in a round, **P(both Dark Hour AND Miasma active simultaneously) = 29% in Round 1, 43% in Round 2, 58% in Round 3**
    - This is not a rare edge case, especially by Round 3 — a majority of thorough games will see both stacked (double-Spoilage-checks AND -1 yield, compounding for the rest of the round)
    - *comment: is this intended tension (the late game is supposed to feel more dangerous), or too punishing once both land together? Worth a deliberate decision rather than leaving it as an emergent side effect of the deck math. One option if it's too harsh: a rule stating Miasma has no effect while Dark Hour is already active (they don't stack, whichever hits second is wasted) — not implemented, just a possible mitigation to consider.*
  - **Proposed additional effects** *(inspired by the original setting material, still NOT implemented — recommend a decision before treating these as more than draft)*:
    - **Monsters hit harder:** +1 ATK to every monster's fail-penalty for the rest of the round — missing a Hunt during Dark Hour costs more Stamina than usual
    - **Tracker Tessa's Ruin-skip passive is suspended during Dark Hour** — too chaotic to extract cleanly without a proper shop; she must visit a shop like everyone else until the round ends
      - *comment: this is a real character-balance decision, not just flavor — confirm you want Tessa specifically singled out here (the original setting notes mentioned "some characters lose their normal advantage" without naming who; Tessa's passive is the most obviously "clean/efficient" one to suspend thematically, but flag if you'd rather it be someone else, or no one)*

- **The Crucible — Round 3's Center Tile** [NEW section — this had ZERO implementation until this session, despite being the thematic centerpiece of the final round]
  - Draws 2 monsters from the shared deck; you choose 1 to fight, the other is **permanently discarded** (removed from the deck entirely, not returned)
  - Forces **Desperate**-tier access regardless of your current Stamina — the Crucible doesn't care how tired you are
  - Automatically triggers Dark Hour, win or lose
  - **Capped at once per player per round** [NEW, added this session after finding a real problem]: without this cap, one player parking at the Crucible could drain the *entire* shared Round 3 monster deck (13 monsters) in roughly 4 turns — since each attempt consumes 2 monsters and the per-turn action cap allows up to 2 attempts per turn, that's up to 4 monsters/turn from a single player, starving every other player and every Ruin, and prematurely ending the round via the deck-exhaustion trigger. Verified via a dedicated test that the cap closes this risk while still letting every player face it once
  - *comment: should there also be a hard limit on how many TOTAL times the Crucible can be used across the whole round (e.g., capped at once per player naturally limits it to your player count, but is that still too many attempts against a 13-monster deck at 3-4 players)? Not flagged as broken, just worth a sanity check at your intended player counts.*

- **Tools — What They Do (6 Combat Tools)** *(cost = ingredient tokens, all now touch Stamina)*
  - **Net** — upgrade Bold→Careful if monster HP ≤ 2; no Stamina change
  - **Spear** — choose Careful or Bold; if Bold, refunds +2 Stamina total instead of +1
  - **Bow** — force Bold, ignore monster reaction; normal Bold refund applies
  - **Cleaver** — force Desperate; redundant-but-thematic on Butcher Bob, whose passive already zeroes Desperate's Stamina cost
  - **Hammer** — force Desperate; costs 1 EXTRA Stamina on top of normal cost; tool exhausts after use
  - **Trap** — Careful if monster was facedown; hunting a freshly-revealed monster with a Trap equipped costs 0 Stamina entirely; **also grants +2 effective ATK specifically when attempting to Tame** [NEW this session]

- **Tools — How You Get Them** *(three separate paths, not just one)*
  - **1. Starting equipment:** each character begins with one Combat Tool already equipped (see Characters below) — free, no acquisition needed
  - **2. Purchased at Merchant's Camp** (Round 2+ utility tile): spend ingredient tokens to buy any Combat Tool or Gear item from a shared face-up market
    - ⏳ *the exact purchase costs/market size aren't finalized yet — flagging as still open*
  - **3. Found through play** [NEW — answers "obtained via explore or slaying a monster"]:
    - **Via Exploring:** certain Strange Place Fog cards can grant a Tool or Gear item directly, instead of (or alongside) their existing effect
      - *comment: none of the current 6 Fog card types do this yet — would need either a new 7th Fog card ("Abandoned Gear" or similar), or retrofitting an existing one (Hidden Opportunity feels like the natural fit thematically). Flag your preference before I lock in which.*
    - **Via slaying a monster:** certain monsters' **Bottom (bonus) edge** grants a Tool or Gear item *instead of* an ingredient, when accessed through a Desperate kill (same access rule as any other Bottom edge — condition must be met)
      - This only applies to specific monsters designed with a Gear bonus on their card — not a universal chance on every monster
      - *comment: none of the current 20 monsters have this yet (`companionBonus` exists for Tame, but nothing equivalent for "Gear drop on Desperate kill" — would need new fields added to a handful of monster cards. Flag if you want this on a specific subset, e.g. only Tier II/III monsters, or spread across all tiers.*

- **Gear — Capacity-Expanding Items** *(NEW — a second category of item, distinct from Combat Tools)*
  - Unlike Combat Tools (which affect kill states), Gear items permanently increase your Inventory Capacity (see above) once acquired
  - Proposed starter set:
    - **Hunting Satchel** — +2 Ingredient Token capacity
    - **Traveling Pack** — +1 Captured Monster capacity
    - **Reinforced Satchel** *(upgrade, replaces basic Satchel)* — +4 Ingredient Token capacity total
  - Acquired through the same three paths as Combat Tools above (Merchant purchase, Fog reward, or monster Bottom-edge drop)
  - *comment: this is a new item category I'm introducing to answer your capacity-expansion question cleanly — confirm you want Gear as a separate thing from Combat Tools (my recommendation, since they do genuinely different jobs) rather than folding capacity bonuses into the existing 6 Combat Tools as secondary properties*

- **Characters** *(4 total)*
  - **🔪 Butcher Bob** — *Power → Restraint*
    - ATK 3 (highest), Max Stamina 3
    - Starts with: Cleaver equipped
    - Passive "Heavy Hand": Desperate kills cost 0 Stamina; Careful kills cost +1 extra Stamina
    - Signature "Perfect Cut" (1/game): extract from 2 edges of the same monster in one Act
  - **🏹 Tracker Tessa** — *Precision → Adaptability*
    - ATK 2, Max Stamina 4 (highest)
    - Starts with: +1 Reroll Token (3 total instead of the standard 2)
    - Passive "Efficient Hunter": Extract directly at Ruins (skip shop); must resolve Fog cards face-up before choosing Risk Posture
    - Signature "Ambush Hunter" (1/game): Hunt 2 monsters in one Act
  - **🪤 Trapper Tim** — *Caution → Courage*
    - ATK 1 (lowest), Max Stamina 3
    - Starts with: Trap equipped
    - Passive "Snarer's Patience": facedown Ruins hunted immediately on reveal are always Careful-eligible regardless of Stamina
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
  - A round ends when either: **every player has reached a far border tile** (see below), or the monster deck for that round is exhausted [CHANGED and CONFIRMED this session — resolves the old open question in favor of a scaling-safe mechanism]
    - "Far border tile" means a tile on the outer edge of the map that is also at least half the grid's width away (Manhattan distance) from that player's own starting corner this round
    - *Why not just "any border tile":* the naive version ("reach any edge or corner") is trivially satisfied on a player's very first move, always — a corner's immediate neighbor is itself always a border tile too, and border tiles make up 56-75% of these grid sizes. This was caught via simulation before shipping and fixed with the minimum-distance requirement, which forces genuine cross-map travel
    - Reaching this doesn't force you to stop — you may keep taking normal turns afterward (more Hunts/Extracts/Dishes are still valuable); it only gates when the *round* is allowed to end, pacing around whoever needs the most travel time rather than whoever explores fastest
    - *Why this replaced "every tile revealed":* that version didn't scale with player count — verified via simulation that turns-per-player collapsed from 53 (solo) to 6.7 (4-player), because more simultaneous explorers empty a shared map far faster, regardless of what any individual player got to do. The border-distance condition scales on individual travel instead, which doesn't shrink just because others are also exploring
  - Between rounds: grid expands and rebuilds (randomly, see Map above), Stamina and AP refill for everyone, players reposition to new corners, first player becomes whoever has the fewest points

- **Ending / Win Condition**
  - Competitive: highest Gourmet Points after Round 3 wins
  - At game end, check each player's Kill Log (tally of Careful/Bold/Desperate/Tame/**Betrayed**) against the Ending Table for flavor (not scoring). Apply the *first* matching row, top to bottom:
    - **Betrayed 1+ Companions** → **The Wild Chef** [takes priority over everything below, per the Companion Betrayal discussion above; a single Betrayal is thematically decisive] — ⏳ *not yet meaningful in the digital prototype, since Betrayal itself isn't implemented yet*
    - Tamed 3+ monsters (and never Betrayed) → **The Guardian Chef**
    - Desperate kills = majority → **The Wild Chef**
    - Careful kills = majority, zero Desperate → **The Master Chef**
    - Mixed, no clear majority → **The Forgotten Recipe**
  - *comment: this makes Betrayal a hard gate rather than just another data point in the ratio — confirm that's actually what you want before treating it as final, since it means even a single act of Betrayal outweighs, say, taming 5 other monsters cleanly.*
  - ⏳ *The Ending Table lookup itself isn't wired into the engine yet either — Kill Log tallying happens correctly during play, but nothing currently reads it at game-end to actually assign an ending.*

---

*Sections marked ⏳ are designed but not yet built in the digital prototype. Sections marked [CONFIRMED] or [verified] reflect real, tested engine behavior as of this writing — everything else (including all *comment* notes) reflects design discussion still open for a decision.*
