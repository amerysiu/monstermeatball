// Test suite for game-engine.js — run with: node test-engine.js
const { GameEngine } = require('./game-engine.js');
const { GAME_DATA } = require('./game-data.js');

let passed = 0, failed = 0;
function assert(cond, msg) {
    if (cond) { passed++; console.log('  ✅', msg); }
    else { failed++; console.log('  ❌', msg); }
}

// ===================================================================
console.log('\n=== TEST 1: Engine setup ===');
const engine = new GameEngine([
    { id: 'p1', name: 'Alice', characterId: 'butcher_bob' },
    { id: 'p2', name: 'Bob', characterId: 'tracker_tessa' }
], { tier: 'standard' });

assert(engine.players.length === 2, 'Two players created');
assert(engine.round === 1, 'Starts at Round 1');
assert(engine.gridSize === 3, 'Round 1 grid is 3x3');
assert(engine.players[0].stamina === 3, 'Bob starts at 3 Stamina');
assert(engine.players[1].stamina === 4, 'Tessa starts at 4 Stamina (her max)');
assert(engine.players[0].position.row === 0 && engine.players[0].position.col === 0, 'Player 1 starts at top-left corner');
assert(engine.players[1].position.row === 0 && engine.players[1].position.col === 2, 'Player 2 starts at top-right corner');
assert(engine.getCurrentPlayer().ap === 2, 'First player AP ready at Round 1 pool (2) immediately after construction');

// ===================================================================
console.log('\n=== TEST 2: Explore reveals type only, not contents ===');
const exploreResult = engine.explore(0, 1); // adjacent to (0,0)
assert(exploreResult.success, 'Explore succeeds on adjacent unrevealed tile');
assert(engine.grid[0][1].revealed === true, 'Tile marked revealed');
assert(engine.grid[0][1].contents === null, 'Tile contents still null (Act = commitment, not Explore)');
assert(engine.getCurrentPlayer().ap === 1, 'AP decremented after Explore');

const badExplore = engine.explore(2, 2); // not adjacent to (0,0)
assert(badExplore.success === false, 'Explore fails on non-adjacent tile');

// ===================================================================
console.log('\n=== TEST 3: Move requires revealed + adjacent ===');
const badMove = engine.move(1, 1); // adjacent to (0,1)? no, (0,1) is Bob's position now... wait Bob still at (0,0)
// Bob is still at (0,0); (1,1) is not adjacent to (0,0)
assert(badMove.success === false, 'Move fails to non-adjacent tile');

const okMove = engine.move(0, 1); // adjacent and now revealed
assert(okMove.success, 'Move succeeds to adjacent revealed tile');
assert(engine.getCurrentPlayer().position.col === 1, 'Player position updated');
assert(engine.getCurrentPlayer().ap === 0, 'AP now 0 after Explore+Move');

const noAP = engine.move(0, 0);
assert(noAP.success === false && noAP.reason.includes('AP'), 'Move fails with no AP remaining');

// ===================================================================
console.log('\n=== TEST 4: Round 1 Hunt is always Clean, no Stamina interaction ===');
engine.currentPlayerIndex = 0; // back to Bob for a clean test
const bob = engine.getCurrentPlayer();
bob.ap = 2;
bob.position = { row: 0, col: 0 }; // corner, which is a 'ruin' per mapLayouts round 1
const staminaBefore = bob.stamina;

const huntResult = engine.hunt(null); // Round 1 ignores kill state choice
assert(huntResult.success !== undefined, 'Hunt returns a result');
if (huntResult.success) {
    assert(bob.killLog.CLEAN === 1, 'Round 1 successful hunt logs as CLEAN');
    assert(bob.stamina === staminaBefore, 'Round 1 hunt does not touch Stamina');
    assert(bob.capturedMonsters.length === 1, 'Captured monster added to inventory');
} else {
    console.log('    (Hunt failed this run due to ATK<HP roll — acceptable, checking failure path)');
    assert(bob.stamina === staminaBefore, 'Round 1 failed hunt also does not touch Stamina');
}

// ===================================================================
console.log('\n=== TEST 5: Extraction — Bold kill grants shop-matching edge ===');
// Force a known state: manually inject a captured monster with BOLD kill state
const testEngine2 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'hunter_hank' }], { tier: 'standard' });
testEngine2.round = 2; // simulate round 2 for kill-state logic
const p = testEngine2.getCurrentPlayer();
p.ap = 3;
p.capturedMonsters.push({ instanceId: 'test1', monsterId: 'grumble_boar', killState: 'BOLD' });
// Move to the Butcher shop tile — need to find it in the (round-1-sized, since we didn't rebuild grid) grid
// Rebuild grid for round 2 explicitly for this test
testEngine2._setupRoundGrid(2);
testEngine2.gridSize = 4;
// Find a butcher tile position
let butcherPos = null;
for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (testEngine2.grid[r][c].type === 'butcher') butcherPos = {row:r,col:c};
testEngine2.grid[butcherPos.row][butcherPos.col].revealed = true;
p.position = butcherPos;

const extractResult = testEngine2.extract('test1', 'top');
assert(extractResult.success, 'Bold-kill extraction at Butcher (top edge) succeeds');
assert(p.ingredientTokens['Red Meat'] === 2, 'Grumble Boar Top edge grants 2x Red Meat');
assert(p.capturedMonsters.length === 0, 'Captured monster removed from inventory after extraction');

const wrongEdge = testEngine2.extract('test1', 'left'); // already extracted, but test edge-mismatch path separately below
assert(wrongEdge.success === false, 'Cannot re-extract an already-extracted monster');

// ===================================================================
console.log('\n=== TEST 6: Careful kill locks to lowest edge — wrong shop fails ===');
const testEngine3 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'trapper_tim' }], { tier: 'standard' });
testEngine3.round = 2;
testEngine3._setupRoundGrid(2);
const p3 = testEngine3.getCurrentPlayer();
// Flame Lizard: top(Red Meat,2), left(Spicy Aroma,1), right(Fiery Seasoning,1) — lowest is a TIE between left/right at 1.
// Use Grumble Boar instead: top=2(Red Meat), left=1(Earthy Aroma), right=1(Herbal Seasoning) — lowest tie again.
// Use Tide Eel: top=1,left=1,right=1 all equal — still a tie. Use Sky Serpent for a clean non-tie case:
// Sky Serpent: top=1(White Meat), left=2(Sweet Aroma), right=2(Mystic Seasoning) -> lowest = top (White Meat)
p3.capturedMonsters.push({ instanceId: 'test2', monsterId: 'sky_serpent', killState: 'CAREFUL' });
let aromaistPos = null, butcherPos3 = null;
for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    if (testEngine3.grid[r][c].type === 'aromaist') aromaistPos = {row:r,col:c};
    if (testEngine3.grid[r][c].type === 'butcher') butcherPos3 = {row:r,col:c};
}
testEngine3.grid[aromaistPos.row][aromaistPos.col].revealed = true;
p3.position = aromaistPos;
p3.ap = 2;

const wrongShopCareful = testEngine3.extract('test2', 'left'); // Aromaist gives 'left' edge, but Careful requires 'top' (lowest)
assert(wrongShopCareful.success === false, 'Careful-kill extraction fails at the WRONG shop (Aromaist) for Sky Serpent (lowest edge is top/Meat)');

testEngine3.grid[butcherPos3.row][butcherPos3.col].revealed = true;
p3.position = butcherPos3;
const rightShopCareful = testEngine3.extract('test2', 'top');
assert(rightShopCareful.success, 'Careful-kill extraction SUCCEEDS at the matching shop (Butcher, since top=White Meat is the lowest edge)');
assert(p3.ingredientTokens['White Meat'] === 1, 'Correct ingredient and amount granted');

// ===================================================================
console.log('\n=== TEST 7: Tame grants immediate ingredient + Companion, no shop needed ===');
const testEngine4 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'trapper_tim' }], { tier: 'standard' });
testEngine4.round = 2;
testEngine4._setupRoundGrid(2);
testEngine4._buildMonsterDeck(2);
testEngine4.monsterDeck = [GAME_DATA.monsters.find(m => m.id === 'candy_slime')]; // force known monster
const p4 = testEngine4.getCurrentPlayer();
p4.ap = 2;
// Find a ruin tile
let ruinPos = null;
for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (testEngine4.grid[r][c].type === 'ruin') { ruinPos = {row:r,col:c}; break; }
testEngine4.grid[ruinPos.row][ruinPos.col].revealed = true;
p4.position = ruinPos;

const tameResult = testEngine4.hunt('TAMED');
assert(tameResult.success && tameResult.tamed, 'Tame succeeds and reports tamed=true');
assert(p4.companions.includes('candy_slime'), 'Monster added to Companions list');
assert(p4.killLog.TAMED === 1, 'Kill log records TAMED');
assert(Object.keys(p4.ingredientTokens).length > 0, 'Immediate ingredient granted on Tame, no shop visit needed');
assert(p4.capturedMonsters.length === 0, 'Tamed monster never enters capturedMonsters (skips extraction entirely)');

// ===================================================================
console.log('\n=== TEST 8: Spoilage triggers on cross-Family tokens ===');
const testEngine5 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'hunter_hank' }], { tier: 'standard' });
const p5 = testEngine5.getCurrentPlayer();
p5.ingredientTokens = { 'Fiery Seasoning': 2, 'Sweet Aroma': 1 }; // Ember vs Bloom
const hits = testEngine5._runSpoilageCheck(p5, 1);
assert(hits.length === 1, 'Spoilage check detects the Ember/Bloom conflict');
assert(!p5.ingredientTokens['Sweet Aroma'], 'Sweet Aroma discarded due to spoilage');
assert(!p5.ingredientTokens['Fiery Seasoning'], 'Fiery Seasoning also discarded (same family group)');

// ===================================================================
console.log('\n=== TEST 9: Dish completion via corner-scoring, tokens spent correctly ===');
const testEngine6 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'hunter_hank' }], { tier: 'standard' });
const p6 = testEngine6.getCurrentPlayer();
p6.ingredientTokens = { 'Red Meat': 2, 'Fiery Seasoning': 1 }; // all Ember -> Perfect Harmony
const dishResult = testEngine6.completeDish('hearty_boar_stew', ['Red Meat', 'Red Meat', 'Fiery Seasoning']);
assert(dishResult.success, 'Dish completes successfully');
assert(dishResult.corner === 'bottomRight', 'Resolves to Perfect Harmony corner');
assert(dishResult.score === 7, 'Score matches expected Perfect value (7) for Hearty Boar Stew');
assert(p6.gourmetPoints === 7, 'Points added to player total');
assert(Object.keys(p6.ingredientTokens).length === 0, 'All spent tokens removed from inventory');

const insufficientDish = testEngine6.completeDish('hearty_boar_stew', ['Red Meat', 'Red Meat', 'Fiery Seasoning']);
assert(insufficientDish.success === false, 'Dish fails when player lacks the tokens (already spent)');

// ===================================================================
console.log('\n=== TEST 10: Signature dish rejects wrong Family ===');
const testEngine7 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'hunter_hank' }], { tier: 'standard' });
const p7 = testEngine7.getCurrentPlayer();
p7.ingredientTokens = { 'Red Meat': 2, 'Herbal Seasoning': 1 }; // mixed Ember + Verdant
const badSignature = testEngine7.completeDish('inferno_meatballs', ['Red Meat', 'Red Meat', 'Herbal Seasoning']);
assert(badSignature.success === false, 'Signature dish (Ember-locked) rejects mixed-Family ingredients');
assert(p7.ingredientTokens['Red Meat'] === 2, 'Tokens NOT spent on a failed/invalid dish attempt');

// ===================================================================
console.log('\n=== TEST 11: Catch-up special rule (Scrappy Surprise) ===');
const testEngine8 = new GameEngine([
    { id: 'p1', name: 'Leader', characterId: 'hunter_hank' },
    { id: 'p2', name: 'Underdog', characterId: 'butcher_bob' }
], { tier: 'standard' });
testEngine8.players[0].gourmetPoints = 10;
testEngine8.players[1].gourmetPoints = 3;
testEngine8.currentPlayerIndex = 1; // Underdog's turn
const underdog = testEngine8.getCurrentPlayer();
underdog.ingredientTokens = { 'Red Meat': 2, 'Fiery Seasoning': 1 };
const scrappyResult = testEngine8.completeDish('scrappy_surprise', ['Red Meat', 'Red Meat', 'Fiery Seasoning']);
assert(scrappyResult.success, 'Scrappy Surprise completes');
// Base perfect score for scrappy_surprise is 8; catchup adds min(3, 10-3=7)=3 -> total 11
assert(scrappyResult.score === 11, `Catch-up bonus applied correctly (expected 11, got ${scrappyResult.score})`);

// ===================================================================
console.log('\n=== TEST 12: End turn resets AP and advances player ===');
const testEngine9 = new GameEngine([
    { id: 'p1', name: 'First', characterId: 'hunter_hank' },
    { id: 'p2', name: 'Second', characterId: 'butcher_bob' }
], { tier: 'standard' });
testEngine9.getCurrentPlayer().ap = 0;
const endResult = testEngine9.endTurn();
assert(endResult.success, 'endTurn succeeds');
assert(testEngine9.currentPlayerIndex === 1, 'Turn advances to next player');
assert(testEngine9.getCurrentPlayer().ap === 2, 'Next player AP refilled to Round 1 pool (2)');

// ===================================================================
console.log('\n=== TEST 13: Round advancement — grid rebuild, Stamina/AP refill, catch-up first player ===');
testEngine9.players[0].gourmetPoints = 20;
testEngine9.players[1].gourmetPoints = 5;
testEngine9.players[0].stamina = 0;
const advanceResult = testEngine9.advanceRound();
assert(advanceResult.success, 'advanceRound succeeds');
assert(testEngine9.round === 2, 'Round incremented to 2');
assert(testEngine9.gridSize === 4, 'Grid rebuilt to 4x4 for Round 2');
assert(testEngine9.players[0].stamina === testEngine9.players[0].character.maxStamina, 'Stamina refilled for new round');
assert(testEngine9.players[1].ap === 3, 'AP pool updated to Round 2 value (3)');
assert(testEngine9.currentPlayerIndex === 1, 'Lowest-scoring player (index 1) goes first in new round');

// ===================================================================
console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
