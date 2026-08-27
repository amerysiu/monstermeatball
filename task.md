# Monster Meatball — Complete Development Task List

## Goal
Build a reliable, balanced, replayable v1.0 web game using:
**4×4 → 5×5 → 6×6**, for **1–4 players**.

Development order:
**Rules Audit → Engine Fixes → Automated Tests → Simulation → Human Playtest → Balance → Gameplay Enhancement → Narrative → UX/Art/Sound → v1.0**

## 1. Rules & Engine Audit
- [ ] Solo completes all 3 rounds.
- [ ] 2P completes all 3 rounds.
- [ ] 3P completes all 3 rounds.
- [ ] 4P completes all 3 rounds.
- [ ] Verify 4×4 → 5×5 → 6×6 progression.
- [ ] Verify round-specific location counts.
- [ ] Reveal only adjacent tiles.
- [ ] Orthogonal movement only.
- [ ] Move only onto revealed tiles.
- [ ] Enforce one-visit-per-tile trail movement per round.
- [ ] Starting tile counts correctly.
- [ ] Reset per-round trail state correctly.
- [ ] Verify four valid starting corners.
- [ ] Verify AP: R1=2, R2=3, R3=3.
- [ ] AP can be spent in any legal sequence.
- [ ] Invalid actions do not consume action-cap slots.
- [ ] Verify Hunt/Extract limits.
- [ ] Verify Act/Move rules.
- [ ] R1 has no Stamina.
- [ ] R1 has no Kill States.
- [ ] R1 has no Spoilage.
- [ ] R1 cannot trigger Fog if Fog starts later.

## 2. Hunting & Kill States
- [ ] Verify ATK/HP resolution.
- [ ] Verify character ATK.
- [ ] Verify tool modifiers.
- [ ] Verify Stamina costs and failure penalties.
- [ ] Implement/test Clean Kill.
- [ ] Implement/test Rushed/Bold Kill.
- [ ] Implement/test Brutal/Desperate Kill.
- [ ] Implement/test Tamed state.
- [ ] Verify state affects extraction and bonuses.
- [ ] Verify every character has a viable Taming strategy.
- [ ] Verify Tamed monsters become Companions.
- [ ] Implement remaining Companion abilities.
- [ ] Verify Tame vs Kill is strategically meaningful.

## 3. Monster System
- [ ] Verify all monster cards and tiers.
- [ ] Verify round-specific monster pools.
- [ ] Verify deck shuffling.
- [ ] Monster-deck exhaustion does not prematurely end a round.
- [ ] Empty deck prevents draws but does not end the round.
- [ ] Verify Meat, Aroma, Seasoning, HP, ATK, flavor family.
- [ ] Verify all extraction edges and bonus edges.
- [ ] Rebalance monster numeric values after trials.

## 4. Extraction
- [ ] Hunt → Capture → correct shop → Extract.
- [ ] Butcher extraction works.
- [ ] Aromaist extraction works.
- [ ] Seasoning Mill extraction works.
- [ ] Extraction only occurs at the correct shop.
- [ ] Each monster can be extracted once only.
- [ ] Extraction consumes the captured monster.
- [ ] Verify extraction quantity.
- [ ] Verify kill-state effects.
- [ ] Verify monster orientation/state is preserved until extraction.
- [ ] Implement every bonus condition explicitly.
- [ ] Test Clean/Rushed/Brutal conditions.
- [ ] Test shop, tool and Fog conditions.
- [ ] Prevent unspecified bonus conditions from defaulting to TRUE.

## 5. Inventory & Capacity
- [ ] Implement captured-monster capacity.
- [ ] Implement ingredient capacity.
- [ ] Verify starting capacity.
- [ ] Verify upgrades.
- [ ] Prevent inventory overflow.
- [ ] Explain capacity limits in UI.
- [ ] Test extraction at full capacity.
- [ ] Test capture at full monster capacity.
- [ ] Test required disposal choices.

## 6. Flavor & Spoilage
- [ ] Verify Ember family.
- [ ] Verify Tide family.
- [ ] Verify Verdant family.
- [ ] Verify Bloom family.
- [ ] Verify Meat/Aroma/Seasoning mappings.
- [ ] Implement all incompatible combinations.
- [ ] Verify bad ingredients cannot coexist.
- [ ] Verify required disposal of spoiled ingredients.
- [ ] Verify spoilage timing.
- [ ] Test multi-ingredient edge cases.

## 7. Locations
Audit every location against the actual engine:
- [ ] Ruins
- [ ] Butcher
- [ ] Aromaist
- [ ] Seasoning Mill
- [ ] Strange Places
- [ ] Merchant's Camp
- [ ] Magic Well
- [ ] Old Watchtower
- [ ] Abandoned Kitchen
- [ ] Shrine of the Fog
- [ ] Crucible

For each:
- [ ] Reveal behavior.
- [ ] Act requirement.
- [ ] Resource/effect.
- [ ] AP cost.
- [ ] Round restriction.
- [ ] Player interaction.
- [ ] UI feedback.

Priority for unfinished utility locations:
1. [ ] Merchant
2. [ ] Magic Well
3. [ ] Watchtower
4. [ ] Shrine
5. [ ] Abandoned Kitchen

## 8. Tools
- [ ] Verify all six tools.
- [ ] Verify starting equipment.
- [ ] Implement Merchant purchasing.
- [ ] Verify costs and effects.
- [ ] Verify Hunt/Tame interactions.
- [ ] Verify extraction interactions.
- [ ] Implement upgrades if required.
- [ ] Prevent invalid purchases.

## 9. Fog
- [ ] Verify Fog starts in the correct round.
- [ ] Verify deck and draw rules.
- [ ] Verify all Fog effects.
- [ ] Verify Dark Hour.
- [ ] Verify Miasma.
- [ ] Verify discard/resolution.
- [ ] Verify monster/bonus interactions.
- [ ] Prevent impossible states.

## 10. Gourmet & Cooking
- [ ] Verify all 36 dishes.
- [ ] Verify Standard, Signature and Wildcard dishes.
- [ ] Verify ingredient requirements.
- [ ] Verify point values.
- [ ] Verify dish replenishment.
- [ ] Verify base score.
- [ ] Verify No/Partial/Diverse/Perfect Harmony.
- [ ] Verify corner-score interpretation.
- [ ] Verify Wildcard and Signature behavior.
- [ ] Verify round-end Gourmet resolution.
- [ ] Verify replacement cards.
- [ ] Verify ingredient persistence.

## 11. Round Transition
- [ ] Verify end-of-round condition.
- [ ] Verify map expansion.
- [ ] Decide/document player positioning between maps.
- [ ] Preserve ingredients as rules specify.
- [ ] Preserve tools.
- [ ] Preserve companions.
- [ ] Preserve Gourmet Points.
- [ ] Reset AP.
- [ ] Reset Stamina as specified.
- [ ] Reset visited tiles.
- [ ] Activate new mechanics.
- [ ] Refresh Gourmet cards correctly.

## 12. Automated Regression Tests
Expand `test-engine.js`.

Movement:
- [ ] Adjacent movement.
- [ ] Diagonal rejection.
- [ ] Unrevealed rejection.
- [ ] Previously visited rejection.
- [ ] Starting tile.
- [ ] Boundaries.

Actions:
- [ ] AP consumption.
- [ ] Invalid action does not consume cap.
- [ ] Hunt limit.
- [ ] Extract limit.
- [ ] Move/Act sequence.
- [ ] Zero-AP prevention.

Hunt:
- [ ] Success.
- [ ] Failure.
- [ ] Stamina.
- [ ] Tools.
- [ ] Kill states.
- [ ] Taming.

Extraction:
- [ ] Correct shop.
- [ ] Correct ingredient.
- [ ] Correct quantity.
- [ ] Once-only extraction.
- [ ] Bonus condition.
- [ ] Capacity.

Cooking/Fog:
- [ ] Ingredient requirements.
- [ ] Dish completion.
- [ ] Points.
- [ ] Harmony.
- [ ] Replacement Gourmet card.
- [ ] Fog round restrictions.
- [ ] Fog resolution.

## 13. 80-Game Trial
Run:
- [ ] 20 solo games.
- [ ] 20 two-player games.
- [ ] 20 three-player games.
- [ ] 20 four-player games.

Record:
- [ ] Rounds and turns.
- [ ] Turns/player.
- [ ] AP spent.
- [ ] Revealed/visited tiles.
- [ ] Map coverage.
- [ ] Monsters encountered.
- [ ] Successful/failed Hunts.
- [ ] Kill-state distribution.
- [ ] Tames.
- [ ] Extractions.
- [ ] Ingredients.
- [ ] Spoilage.
- [ ] Dishes.
- [ ] Gourmet Points.
- [ ] Fog events.
- [ ] Tools.
- [ ] Companions.
- [ ] Deck exhaustion.
- [ ] Unused map.
- [ ] No-meaningful-action turns.
- [ ] Engine errors.

## 14. Balance Analysis
Characters:
- [ ] Win rate.
- [ ] Average score.
- [ ] Hunt/Tame rates.
- [ ] Tool dependence.
- [ ] Dish success.
- [ ] Identify dominant/weak characters.

Monsters:
- [ ] Frequency.
- [ ] Difficulty.
- [ ] Reward.
- [ ] Extraction value.
- [ ] Taming/Companion value.

Locations:
- [ ] Visit frequency.
- [ ] Act frequency.
- [ ] Resource value.
- [ ] Strategic value.
- [ ] Identify useless locations.

Tools:
- [ ] Purchase/usage frequency.
- [ ] Win-rate impact.
- [ ] Identify over/underpowered tools.

Dishes:
- [ ] Completion rate.
- [ ] Average score.
- [ ] Ingredient difficulty.
- [ ] Harmony frequency.
- [ ] Identify dominant/impossible dishes.

## 15. Human Playtesting
Test:
- [ ] Solo.
- [ ] 2P.
- [ ] 3P.
- [ ] 4P.

Rate:
- [ ] Excitement.
- [ ] Confusion.
- [ ] Frustration.
- [ ] Meaningful choices.
- [ ] Downtime.
- [ ] Replay desire.
- [ ] Rules clarity.
- [ ] UI clarity.
- [ ] Hunting satisfaction.
- [ ] Extraction satisfaction.
- [ ] Cooking satisfaction.
- [ ] Scoring satisfaction.

Ask:
- [ ] Favorite decision?
- [ ] Repetitive part?
- [ ] Unfair/frustrating part?
- [ ] Unclear rule?
- [ ] Desired-but-unavailable action?
- [ ] Character they would replay?
- [ ] Memorable monster/location?
- [ ] Would they play again?

## 16. Gameplay Enhancement
Only after core validation:
- [ ] Monster tracking clues.
- [ ] Environmental clues.
- [ ] Partial monster information.
- [ ] Better route planning.
- [ ] Persistent/wounded monsters after failed Hunts.
- [ ] Monster-specific encounter effects.
- [ ] Limited trading.
- [ ] Shared discoveries.
- [ ] Temporary cooperation.
- [ ] Contested locations where appropriate.
- [ ] Reduce multiplayer downtime.
- [ ] Strengthen character identities.
- [ ] Safe dishes.
- [ ] High-risk/high-reward dishes.
- [ ] Harmony-focused dishes.
- [ ] Customer/request chains if justified by testing.

## 17. Replayability
Prioritize meaningful variation:
- [ ] Random maps.
- [ ] Random monster decks.
- [ ] Random Gourmet objectives.
- [ ] Character asymmetry.
- [ ] Tool choices.
- [ ] Kill/Tame choices.
- [ ] Fog events.
- [ ] Flavor combinations.
- [ ] Different endings.
- [ ] Optional customer chains.
- [ ] Character relationship events.
- [ ] Persistent monster events.
- [ ] Difficulty/variant modes.

## 18. Narrative
Round 1 — The First Hunt:
- [ ] Introduce world.
- [ ] Teach exploration/hunting.
- [ ] Introduce characters.

Round 2 — Into the Fog:
- [ ] Introduce Fog.
- [ ] Reveal deeper monster behavior.
- [ ] Introduce Taming/Companions.
- [ ] Reveal mystery.

Round 3 — The Forgotten Wilderness:
- [ ] Increase pressure.
- [ ] Reveal larger mystery.
- [ ] Prepare final challenge.

Final — The Crucible:
- [ ] Final culinary challenge.
- [ ] Resolve character arcs.
- [ ] Determine ending from gameplay.

## 19. Endings
Implement gameplay-driven endings:
- [ ] Master Chef.
- [ ] Guardian Chef.
- [ ] Wild Chef.
- [ ] Explorer Chef.
- [ ] Additional justified endings.

Base ending logic on:
- [ ] Kill states.
- [ ] Taming.
- [ ] Companion use.
- [ ] Exploration.
- [ ] Harmony.
- [ ] Spoilage management.
- [ ] Final dish.
- [ ] Gourmet score.

## 20. Web UI/UX
Board:
- [ ] 4×4.
- [ ] 5×5.
- [ ] 6×6.
- [ ] Revealed/unrevealed state.
- [ ] Visited trail.
- [ ] Current position.
- [ ] Legal moves.
- [ ] Legal Act targets.

Player panel:
- [ ] Character.
- [ ] ATK.
- [ ] AP.
- [ ] Stamina.
- [ ] Tools.
- [ ] Companions.
- [ ] Captured monsters.
- [ ] Ingredients.
- [ ] Gourmet Points.

Feedback:
- [ ] Explain why actions are unavailable.
- [ ] Highlight legal actions.
- [ ] Confirm irreversible actions.
- [ ] Show action history.
- [ ] Show round transitions.

## 21. Artwork
- [ ] Character artwork.
- [ ] Monster artwork.
- [ ] Location artwork.
- [ ] Gourmet artwork.
- [ ] Tool artwork.
- [ ] Meat icons.
- [ ] Aroma icons.
- [ ] Seasoning icons.
- [ ] Flavor-family icons.
- [ ] Kill-state symbols.
- [ ] Tame symbol.
- [ ] Fog symbols.
- [ ] Companion symbols.
- [ ] Consistent art bible.
- [ ] No cropped production assets.

## 22. Audio
- [ ] Reveal.
- [ ] Move.
- [ ] Hunt.
- [ ] Clean Kill.
- [ ] Rushed/Bold Kill.
- [ ] Brutal/Desperate Kill.
- [ ] Taming.
- [ ] Extraction.
- [ ] Cooking.
- [ ] Dish completion.
- [ ] Fog.
- [ ] Round transition.
- [ ] Final game.
- [ ] Volume/mute controls.

## 23. Accessibility
- [ ] Do not rely on color alone.
- [ ] Use icons + labels.
- [ ] Adequate contrast.
- [ ] Tooltips.
- [ ] Clear state indicators.
- [ ] Keyboard support where practical.
- [ ] Readable normal-size UI.
- [ ] Minimize hidden-rule memorization.

## 24. Final QA
- [ ] Full regression suite passes.
- [ ] 80-game simulation passes.
- [ ] Human playtests complete.
- [ ] Critical bugs fixed.
- [ ] Rule violations fixed.
- [ ] Character balance verified.
- [ ] Monster balance verified.
- [ ] Tool balance verified.
- [ ] Location balance verified.
- [ ] Dish balance verified.
- [ ] Game length verified.
- [ ] Multiplayer downtime acceptable.
- [ ] Replayability validated.
- [ ] UI stable.
- [ ] Artwork complete.
- [ ] Audio complete or intentionally deferred.
- [ ] Final scoring verified.
- [ ] Endings verified.

## 25. v1.0 Release Criteria
- [ ] All four player counts complete all 3 rounds.
- [ ] 4×4 → 5×5 → 6×6 is stable.
- [ ] No critical rules loopholes.
- [ ] Regression tests pass.
- [ ] 80-game simulation has no engine errors.
- [ ] No player-count mode is obviously broken.
- [ ] No character is overwhelmingly dominant.
- [ ] Every major location has a meaningful purpose.
- [ ] Hunt → Capture → Extract → Cook is satisfying.
- [ ] Tame vs Kill is meaningful.
- [ ] Spoilage creates decisions rather than frustration.
- [ ] Multiplayer downtime is acceptable.
- [ ] Players understand available actions.
- [ ] Game length is within target.
- [ ] Human testers want to replay.
- [ ] Story and mechanics reinforce each other.
- [ ] Web UI is stable.
- [ ] Production artwork is complete.
- [ ] Final QA passes.

## Development Principle

**Do not solve a gameplay problem by automatically adding more cards.**

First identify the underlying problem:
- Movement problem → improve movement.
- Lack of decisions → improve action choices.
- Confusing exploration → add information/clues.
- Multiplayer downtime → improve interaction.
- Weak character identity → improve asymmetry.
- Weak replayability → increase meaningful variation.
- Weak hunting → improve risk/reward.
- Weak extraction → improve resource decisions.
- Weak cooking → improve dish strategy.

Add new content only when testing demonstrates that the underlying system needs it.
