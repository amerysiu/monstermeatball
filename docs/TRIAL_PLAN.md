# Monster Meatball — v1.0 Trial & Validation Plan

## Objective
Validate the current rules and identify balance/loophole issues across solo, 2-, 3-, and 4-player games using the current 4×4 → 5×5 → 6×6 progression.

## Test Matrix
| Players | Round 1 | Round 2 | Round 3 | Target |
|---:|---:|---:|---:|---|
| 1 | 4×4 | 5×5 | 6×6 | 30–45 min |
| 2 | 4×4 | 5×5 | 6×6 | 35–50 min |
| 3 | 4×4 | 5×5 | 6×6 | 40–60 min |
| 4 | 4×4 | 5×5 | 6×6 | 45–75 min |

Run at least 20 simulated games per player count (80 total) after the rule-integrity fixes.

## Metrics
- rounds completed
- turns and turns/player
- AP spent
- tiles revealed / visited
- percentage of map revealed
- monsters hunted, failed, tamed
- Clean/Bold/Desperate/Tame distribution
- monsters extracted
- ingredients gained/lost to spoilage
- dishes completed
- Gourmet Points
- Dark Hours / Fog events
- tools acquired
- companions acquired
- unused map percentage
- turns with no meaningful legal action
- monster deck exhaustion events

## Rule Integrity Checklist
- [ ] Solo and 2P both complete all 3 rounds
- [ ] Movement is orthogonal, adjacent, revealed, and once-per-tile per round
- [ ] Starting tile counts as visited
- [ ] Round 1 has no Fog/kill-state/stamina system
- [ ] AP is exactly enforced
- [ ] Hunt/Extract action limits count only successful legal actions
- [ ] Monster deck exhaustion does not prematurely end a round
- [ ] Bottom-edge bonus conditions are actually checked
- [ ] Ingredient and captured-monster capacities are enforced
- [ ] Merchant/tool purchasing works
- [ ] Utility locations have real effects
- [ ] Companion abilities marked implemented actually execute
- [ ] Round transitions preserve intended player state and position
- [ ] Round-specific location counts match the rules

## Balance Targets
The first pass should not optimize for perfect symmetry. Look for:
- dominant characters
- dominant tools
- dominant monster families
- underused locations
- runaway scoring
- excessive spoilage
- excessive failed hunts
- excessive Taming
- insufficient extraction opportunities
- player downtime

## Feature Gate
Do not add new card families until the 80-game trial demonstrates that the core loop is stable. Afterward prioritize tracking/clue events, customer chains, character relationship events, persistent/wounded monsters, and narrative final outcomes.
