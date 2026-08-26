# Monster Meatball v1.0 Audit Status — 2026-08-26

## Scope
Current `main` branch reviewed against the intended 4×4 → 5×5 → 6×6 trail game for 1–4 players.

## Implemented in this audit

1. **Trail movement guard** — a player cannot move onto a tile already visited during the current round. Starting tile counts as visited.
2. **Round-1 Fog guard** — Fog effects are inactive in Round 1.
3. **Monster-deck round-end fix** — an empty monster deck no longer ends a round by itself; the border/travel gate is authoritative.
4. **Three-round campaign for 1P/2P** — runtime player-count configuration is normalized to allow Round 1, 2 and 3 for every player count.
5. **Per-round trail reset** — the visited-tile trail and border-gate state reset when a new map is generated.
6. **80-game CI trial harness** — 20 deterministic trials each for 1P, 2P, 3P and 4P.
7. **CI workflow** — regression tests run before the 80-game trial simulation.

## Files added

- `v1-rule-fixes.js`
- `v1-trial-sim.js`
- `.github/workflows/v1-trial.yml`
- `docs/TRIAL_PLAN.md`

## Known items requiring a direct core-engine/data refactor

These were identified in the audit but are intentionally not silently reimplemented in the patch layer:

- Action-cap accounting should increment only after a legal/successful action. The current engine checks the cap before validating some actions.
- Bottom-edge conditional bonus predicates need a complete condition table rather than a permissive fallback.
- Ingredient and captured-monster capacity described by the rules is not yet consistently enforced in the engine.
- Merchant/tool acquisition and several utility locations remain incomplete.
- Several Companion abilities are data-defined but marked `wired: false`.

These should be addressed in the next core-engine pass after the trial harness establishes baseline behavior.

## Trial execution status

The CI workflow was committed, but the available GitHub Actions endpoint did not expose a new `push` run for the newly-created workflow during this audit. Therefore **no 80-game numerical results are claimed yet**. The harness is committed and ready to run in GitHub Actions or locally with Node.js.

## Acceptance criteria

The next milestone is not merely “the script runs.” A build should be considered v1.0-ready only when:

- 1P/2P/3P/4P all complete all three rounds in the trial matrix;
- no systematic premature deck-exhaustion round ends occur;
- no illegal tile revisits occur;
- no-progress turns remain rare and explainable;
- no player count has pathological game length or scoring;
- core rules have automated regression coverage.
