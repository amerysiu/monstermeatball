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
assert(engine.gridSize === 4, 'Round 1 grid is 4x4');
assert(engine.players[0].stamina === 3, 'Bob starts at 3 Stamina');
assert(engine.players[1].stamina === 4, 'Tessa starts at 4 Stamina (her max)');
assert(engine.players[0].position.row === 0 && engine.players[0].position.col === 0, 'Player 1 starts at top-left corner');
assert(engine.players[1].position.row === 0 && engine.players[1].position.col === engine.gridSize - 1, 'Player 2 starts at top-right corner');
assert(engine.getCurrentPlayer().ap === 3, 'First player AP ready at Round 1 pool (3) immediately after construction');

// ===================================================================
console.log('\n=== TEST 2: Explore reveals type only, not contents ===');
const exploreResult = engine.explore(0, 1); // adjacent to (0,0)
assert(exploreResult.success, 'Explore succeeds on adjacent unrevealed tile');
assert(engine.grid[0][1].revealed === true, 'Tile marked revealed');
assert(engine.grid[0][1].contents === null, 'Tile contents still null (Act = commitment, not Explore)');
assert(engine.getCurrentPlayer().ap === 2, 'AP decremented after Explore (3→2)');

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
assert(engine.getCurrentPlayer().ap === 1, 'AP now 1 after Explore+Move (3→2→1)');

engine.getCurrentPlayer().ap = 0; // force 0 AP
const noAP = engine.move(0, 2); // adjacent to (0,1)
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
    assert(bob.killLog.CAREFUL === 1, 'Round 1 successful hunt logs as CAREFUL');
    assert(bob.stamina === staminaBefore, 'Round 1 hunt does not touch Stamina');
    assert(bob.capturedMonsters.length === 1, 'Captured monster added to inventory');
} else {
    console.log('    (Hunt failed this run due to ATK<HP roll — acceptable, checking failure path)');
    assert(bob.stamina === staminaBefore, 'Round 1 failed hunt also does not touch Stamina');
}

// ===================================================================
console.log('\n=== TEST 5: Extraction — Bold kill grants shop-matching edge ===');
// Force a known state: manually inject a captured monster with BOLD kill state
const testEngine2 = new GameEngine([{ id: 'p1', 'name': 'Solo', characterId: 'hunter_hank' }], { tier: 'standard' });
testEngine2.round = 2; // simulate round 2 for kill-state logic
const p = testEngine2.getCurrentPlayer();
p.ap = 3;
p.ingredientTokens = {}; // clear starting ingredient for clean test
p.capturedMonsters.push({ instanceId: 'test1', monsterId: 'grumble_boar', killState: 'BOLD' });
// Rebuild grid for round 2 explicitly for this test
testEngine2._setupRoundGrid(2);
// Find a butcher tile position
let butcherPos = null;
for (let r = 0; r < testEngine2.gridSize; r++) for (let c = 0; c < testEngine2.gridSize; c++) if (testEngine2.grid[r][c].type === 'butcher') butcherPos = {row:r,col:c};
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
p3.ingredientTokens = {}; // clear starting ingredient for clean test
// Flame Lizard: top(Red Meat,2), left(Spicy Aroma,1), right(Fiery Seasoning,1) — lowest is a TIE between left/right at 1.
// Use Grumble Boar instead: top=2(Red Meat), left=1(Earthy Aroma), right=1(Herbal Seasoning) — lowest tie again.
// Use Tide Eel: top=1,left=1,right=1 all equal — still a tie. Use Sky Serpent for a clean non-tie case:
// Sky Serpent: top=1(White Meat), left=2(Sweet Aroma), right=2(Mystic Seasoning) -> lowest = top (White Meat)
p3.capturedMonsters.push({ instanceId: 'test2', monsterId: 'sky_serpent', killState: 'CAREFUL' });
let aromaistPos = null, butcherPos3 = null;
for (let r = 0; r < testEngine3.gridSize; r++) for (let c = 0; c < testEngine3.gridSize; c++) {
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
for (let r = 0; r < testEngine4.gridSize; r++) for (let c = 0; c < testEngine4.gridSize; c++) if (testEngine4.grid[r][c].type === 'ruin') { ruinPos = {row:r,col:c}; break; }
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
assert(testEngine9.getCurrentPlayer().ap === 3, 'Next player AP refilled to Round 1 pool (3)');

// ===================================================================
console.log('\n=== TEST 13: Round advancement — grid rebuild, Stamina/AP refill, catch-up first player ===');
testEngine9.players[0].gourmetPoints = 20;
testEngine9.players[1].gourmetPoints = 5;
testEngine9.players[0].stamina = 0;
const advanceResult = testEngine9.advanceRound();
assert(advanceResult.success, 'advanceRound succeeds');
assert(testEngine9.round === 2, 'Round incremented to 2');
assert(testEngine9.gridSize === 5, 'Grid rebuilt to 5x5 for Round 2');
assert(testEngine9.players[0].stamina === testEngine9.players[0].character.maxStamina, 'Stamina refilled for new round');
assert(testEngine9.players[1].ap === 4, 'AP pool updated to Round 2 value (4)');
assert(testEngine9.currentPlayerIndex === 1, 'Lowest-scoring player (index 1) goes first in new round');

// ===================================================================
console.log('\n=== TEST 14: Diagonal movement rejected ===');
const eng14 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'hunter_hank' }]);
const p14 = eng14.getCurrentPlayer();
p14.ap = 3;
p14.position = { row: 1, col: 1 };
// (2,2) is diagonal from (1,1) — should fail
const diagMove = eng14.move(2, 2);
assert(diagMove.success === false, 'Diagonal move rejected');
// (2,1) is orthogonal — but unrevealed, so also rejected
const orthUnrevealed = eng14.move(2, 1);
assert(orthUnrevealed.success === false, 'Orthogonal move to unrevealed tile rejected');
// Reveal it first, then move
eng14.grid[2][1].revealed = true;
const orthOk = eng14.move(2, 1);
assert(orthOk.success, 'Move to adjacent revealed orthogonal tile succeeds');

// ===================================================================
console.log('\n=== TEST 15: Out of bounds movement rejected ===');
const eng15 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'hunter_hank' }]);
eng15.getCurrentPlayer().ap = 2;
eng15.getCurrentPlayer().position = { row: 0, col: 0 };
const oob = eng15.move(-1, 0);
assert(oob.success === false, 'Out of bounds move rejected');
const oob2 = eng15.move(0, eng15.gridSize);
assert(oob2.success === false, 'Out of bounds move rejected (col)');

// ===================================================================
console.log('\n=== TEST 16: Zero AP prevents all actions ===');
const eng16 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'hunter_hank' }]);
eng16.getCurrentPlayer().ap = 0;
assert(eng16.explore(0, 1).success === false, 'Explore fails with 0 AP');
assert(eng16.move(0, 1).success === false, 'Move fails with 0 AP');
assert(eng16.rest().success === false, 'Rest fails with 0 AP');
eng16.getCurrentPlayer().position = { row: 0, col: 0 };
eng16.grid[0][0].type = 'ruin';
assert(eng16.hunt('BOLD').success === false, 'Hunt fails with 0 AP');

// ===================================================================
console.log('\n=== TEST 17: Hunt/Extract action cap (max 2 per turn) ===');
const eng17 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'butcher_bob' }]);
eng17.round = 2;
const p17 = eng17.getCurrentPlayer();
p17.ap = 5;
p17.stamina = 3;
// Place player on a ruin
let ruinPos17 = null;
for (let r = 0; r < eng17.gridSize; r++) for (let c = 0; c < eng17.gridSize; c++) {
    if (eng17.grid[r][c].type === 'ruin') { ruinPos17 = { row: r, col: c }; break; }
    if (ruinPos17) break;
}
eng17.grid[ruinPos17.row][ruinPos17.col].revealed = true;
p17.position = ruinPos17;
// Force known monsters
eng17.monsterDeck = [
    GAME_DATA.monsters.find(m => m.id === 'flame_lizard'),
    GAME_DATA.monsters.find(m => m.id === 'tide_eel'),
    GAME_DATA.monsters.find(m => m.id === 'grumble_boar')
];
const hunt1 = eng17.hunt('BOLD');
assert(hunt1.success, '1st hunt succeeds');
p17.actionsThisTurn = {}; // reset for fresh cap test
p17.ap = 5;
// Manually set actionsThisTurn to 2 to test cap
p17.actionsThisTurn.huntOrTame = 2;
const huntBlocked = eng17.hunt('BOLD');
assert(huntBlocked.success === false, '3rd hunt blocked by action cap');

// ===================================================================
console.log('\n=== TEST 18: Failed hunt costs Stamina equal to monster ATK ===');
const eng18 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'trapper_tim' }]); // ATK 1
eng18.round = 2;
const p18 = eng18.getCurrentPlayer();
p18.ap = 3;
p18.stamina = 3;
eng18.monsterDeck = [GAME_DATA.monsters.find(m => m.id === 'sulfur_wyrm')]; // HP 4, ATK 3
let ruinPos18 = null;
for (let r = 0; r < eng18.gridSize; r++) for (let c = 0; c < eng18.gridSize; c++) {
    if (eng18.grid[r][c].type === 'ruin') { ruinPos18 = { row: r, col: c }; break; }
    if (ruinPos18) break;
}
eng18.grid[ruinPos18.row][ruinPos18.col].revealed = true;
p18.position = ruinPos18;
const failHunt = eng18.hunt('BOLD');
assert(failHunt.success === false, 'Tim (ATK 1) fails to kill Sulfur Wyrm (HP 4)');
assert(p18.stamina === 0, 'Stamina lost = monster ATK (3), from 3 → 0');

// ===================================================================
console.log('\n=== TEST 19: Bold kill refunds Stamina ===');
const eng19 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'hunter_hank' }]); // ATK 2
eng19.round = 2;
const p19 = eng19.getCurrentPlayer();
p19.ap = 3;
p19.stamina = 2;
eng19.monsterDeck = [GAME_DATA.monsters.find(m => m.id === 'tide_eel')]; // HP 1
let ruinPos19 = null;
for (let r = 0; r < eng19.gridSize; r++) for (let c = 0; c < eng19.gridSize; c++) {
    if (eng19.grid[r][c].type === 'ruin') { ruinPos19 = { row: r, col: c }; break; }
    if (ruinPos19) break;
}
eng19.grid[ruinPos19.row][ruinPos19.col].revealed = true;
p19.position = ruinPos19;
const boldHunt = eng19.hunt('BOLD');
assert(boldHunt.success, 'Bold hunt succeeds');
assert(p19.stamina === 3, 'Bold refunds +1 Stamina (2→3)');

// ===================================================================
console.log('\n=== TEST 20: Careful kill costs Stamina ===');
const eng20 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'butcher_bob' }]); // ATK 3
eng20.round = 2;
const p20 = eng20.getCurrentPlayer();
p20.ap = 3;
p20.stamina = 3;
eng20.monsterDeck = [GAME_DATA.monsters.find(m => m.id === 'tide_eel')];
let ruinPos20 = null;
for (let r = 0; r < eng20.gridSize; r++) for (let c = 0; c < eng20.gridSize; c++) {
    if (eng20.grid[r][c].type === 'ruin') { ruinPos20 = { row: r, col: c }; break; }
    if (ruinPos20) break;
}
eng20.grid[ruinPos20.row][ruinPos20.col].revealed = true;
p20.position = ruinPos20;
const carefulHunt = eng20.hunt('CAREFUL');
assert(carefulHunt.success, 'Careful hunt succeeds');
// Bob's passive: Careful costs +1 extra Stamina (total 2). But in R2, base Careful costs 1.
// Bob's Heavy Hand: Careful costs +1 extra. So 1+1 = 2 Stamina spent.
assert(p20.stamina === 1, 'Careful costs 2 Stamina for Bob (1 base + 1 extra from Heavy Hand)');

// ===================================================================
console.log('\n=== TEST 21: Capacity — ingredient overflow prevented ===');
const eng21 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'tracker_tessa' }]); // cap 5
const p21 = eng21.getCurrentPlayer();
p21.ingredientTokens = { 'Red Meat': 5 };
const granted = eng21._grantIngredient(p21, 'Sea Meat', 3);
assert(granted === 0, 'No ingredients granted when at capacity');
assert(p21.ingredientTokens['Sea Meat'] === undefined, 'Ingredient not added at capacity');
// Partial grant
p21.ingredientTokens = { 'Red Meat': 4 };
const partial = eng21._grantIngredient(p21, 'Sea Meat', 1);
assert(partial === 1, 'Only 1 granted when 4 of 5 slots used');
const partial2 = eng21._grantIngredient(p21, 'Sea Meat', 3);
assert(partial2 === 0, 'Full after first partial — second attempt gets 0');

// ===================================================================
console.log('\n=== TEST 22: Capacity — captured monster overflow prevented ===');
const eng22 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'tracker_tessa' }]); // cap 1
eng22.round = 2;
const p22 = eng22.getCurrentPlayer();
p22.ap = 3;
p22.stamina = 4;
p22.capturedMonsters.push({ instanceId: 'full1', monsterId: 'flame_lizard', killState: 'BOLD' });
eng22.monsterDeck = [GAME_DATA.monsters.find(m => m.id === 'tide_eel')];
let ruinPos22 = null;
for (let r = 0; r < eng22.gridSize; r++) for (let c = 0; c < eng22.gridSize; c++) {
    if (eng22.grid[r][c].type === 'ruin') { ruinPos22 = { row: r, col: c }; break; }
    if (ruinPos22) break;
}
eng22.grid[ruinPos22.row][ruinPos22.col].revealed = true;
p22.position = ruinPos22;
const blocked = eng22.hunt('BOLD');
assert(blocked.success === false, 'Hunt blocked when captured monster capacity full');
assert(blocked.note.includes('capacity'), 'Failure reason mentions capacity');

// ===================================================================
console.log('\n=== TEST 23: Magic Well restores Stamina and grants Reroll Token ===');
const eng23 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'hunter_hank' }]);
const p23 = eng23.getCurrentPlayer();
p23.ap = 2;
p23.stamina = 1;
p23.rerollTokens = 2;
// Find a well tile or create one
let wellPos = null;
for (let r = 0; r < eng23.gridSize; r++) for (let c = 0; c < eng23.gridSize; c++) {
    if (eng23.grid[r][c].type === 'well') { wellPos = { row: r, col: c }; break; }
    if (wellPos) break;
}
if (wellPos) {
    eng23.grid[wellPos.row][wellPos.col].revealed = true;
    p23.position = wellPos;
    const wellResult = eng23.actOnMagicWell();
    assert(wellResult.success, 'Magic Well action succeeds');
    assert(p23.stamina === p23.character.maxStamina, 'Stamina fully restored');
    assert(p23.rerollTokens === 3, 'Reroll Token granted');
    assert(p23.ap === 1, 'AP consumed by Magic Well');
} else {
    console.log('    (No well tile generated — skipping well test)');
}

// ===================================================================
console.log('\n=== TEST 24: Watchtower reveals 2 adjacent tiles for free ===');
const eng24 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'hunter_hank' }]);
const p24 = eng24.getCurrentPlayer();
p24.ap = 3;
let towerPos = null;
for (let r = 0; r < eng24.gridSize; r++) for (let c = 0; c < eng24.gridSize; c++) {
    if (eng24.grid[r][c].type === 'watchtower') { towerPos = { row: r, col: c }; break; }
    if (towerPos) break;
}
if (towerPos) {
    eng24.grid[towerPos.row][towerPos.col].revealed = true;
    p24.position = towerPos;
    const towerResult = eng24.actOnWatchtower();
    assert(towerResult.success, 'Watchtower action succeeds');
    assert(towerResult.revealed.length <= 2, 'At most 2 tiles revealed');
    assert(p24.ap === 3, 'Watchtower does NOT cost AP (free action)');
} else {
    console.log('    (No watchtower generated — skipping watchtower test)');
}

// ===================================================================
console.log('\n=== TEST 25: Shrine of the Fog guarantees next kill is Careful ===');
const eng25 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'hunter_hank' }]);
const p25 = eng25.getCurrentPlayer();
p25.ap = 2;
let shrinePos = null;
for (let r = 0; r < eng25.gridSize; r++) for (let c = 0; c < eng25.gridSize; c++) {
    if (eng25.grid[r][c].type === 'shrine') { shrinePos = { row: r, col: c }; break; }
    if (shrinePos) break;
}
if (shrinePos) {
    eng25.grid[shrinePos.row][shrinePos.col].revealed = true;
    p25.position = shrinePos;
    const shrineResult = eng25.actOnShrine();
    assert(shrineResult.success, 'Shrine action succeeds');
    assert(p25.guaranteeCleanNextHunt === true, 'guaranteeCleanNextHunt flag set');
    assert(p25.ap === 1, 'AP consumed by Shrine');
} else {
    console.log('    (No shrine generated — skipping shrine test)');
}

// ===================================================================
console.log('\n=== TEST 26: Merchant buy tool and sell ingredients ===');
const eng26 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'hunter_hank' }]);
const p26 = eng26.getCurrentPlayer();
p26.ap = 3;
p26.ingredientTokens = { 'Red Meat': 3, 'Sea Meat': 3, 'Spicy Aroma': 2 };
let merchantPos = null;
for (let r = 0; r < eng26.gridSize; r++) for (let c = 0; c < eng26.gridSize; c++) {
    if (eng26.grid[r][c].type === 'merchant') { merchantPos = { row: r, col: c }; break; }
    if (merchantPos) break;
}
if (merchantPos) {
    eng26.grid[merchantPos.row][merchantPos.col].revealed = true;
    p26.position = merchantPos;
    // Buy Net (cost: 2 different types)
    const buyResult = eng26.actOnMerchant('buy_tool', { toolId: 'net' });
    assert(buyResult.success, 'Buying Net from Merchant succeeds');
    assert(p26.tools.includes('net'), 'Net added to player tools');
    // Sell 2 Red Meat for 1 Sea Meat
    const sellResult = eng26.actOnMerchant('sell', { sellType: 'Red Meat', buyType: 'Sea Meat' });
    assert(sellResult.success, 'Selling 2:1 at Merchant succeeds');
    assert(!p26.ingredientTokens['Red Meat'] || p26.ingredientTokens['Red Meat'] === 0, 'Red Meat reduced to 0 by sell');
    // Can't buy same tool again
    const dupeBuy = eng26.actOnMerchant('buy_tool', { toolId: 'net' });
    assert(dupeBuy.success === false, 'Cannot buy duplicate tool');
} else {
    console.log('    (No merchant generated — skipping merchant test)');
}

// ===================================================================
console.log('\n=== TEST 27: Round 1 has no kill states, no Stamina, no Spoilage ===');
const eng27 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'hunter_hank' }]);
assert(eng27.round === 1, 'Starts in Round 1');
assert(eng27.players[0].stamina === 3, 'Stamina exists but is inactive in R1');
const r1avail = eng27.getAvailableKillStates(eng27.getCurrentPlayer());
assert(r1avail.length === 1 && r1avail[0] === 'CAREFUL', 'R1 only offers CAREFUL');

// ===================================================================
console.log('\n=== TEST 28: Ending table — Master Chef (majority Careful, zero Desperate) ===');
const eng28 = new GameEngine([
    { id: 'p1', name: 'Alice', characterId: 'hunter_hank' },
    { id: 'p2', name: 'Bob', characterId: 'butcher_bob' }
]);
eng28.players[0].killLog = { CAREFUL: 5, BOLD: 1, DESPERATE: 0, TAMED: 0 };
eng28.players[1].killLog = { CAREFUL: 2, BOLD: 2, DESPERATE: 1, TAMED: 0 };
const endings = eng28.getEndings();
assert(endings[0].ending === 'Master Chef', 'Alice is Master Chef (majority Careful, zero Desperate)');
// Bob: CAREFUL=2, BOLD=2, DESPERATE=1 out of 5 total — no majority, so Forgotten Recipe
assert(endings[1].ending === 'The Forgotten Recipe', 'Bob is Forgotten Recipe (no majority kill style)');

// ===================================================================
console.log('\n=== TEST 29: Ending table — Guardian Chef (3+ Tames) ===');
const eng29 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'trapper_tim' }]);
eng29.players[0].killLog = { CAREFUL: 0, BOLD: 0, DESPERATE: 0, TAMED: 4 };
const ending29 = eng29.getEndings();
assert(ending29[0].ending === 'Guardian Chef', 'Player with 4 Tames is Guardian Chef');

// ===================================================================
console.log('\n=== TEST 30: Ending table — Wild Chef (Betrayed overrides all) ===');
const eng30 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'trapper_tim' }]);
eng30.players[0].killLog = { CAREFUL: 6, BOLD: 0, DESPERATE: 0, TAMED: 3, BETRAYED: 1 };
const ending30 = eng30.getEndings();
assert(ending30[0].ending === 'Wild Chef', 'Betrayal overrides even 3 Tames → Wild Chef');

// ===================================================================
console.log('\n=== TEST 31: Tessa can extract at Ruins (skip shop) ===');
const eng31 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'tracker_tessa' }]);
eng31.round = 2;
const p31 = eng31.getCurrentPlayer();
p31.ap = 3;
p31.ingredientTokens = {}; // clear starting ingredient for clean test
p31.capturedMonsters.push({ instanceId: 'tessa1', monsterId: 'flame_lizard', killState: 'BOLD' });
let ruinPos31 = null;
for (let r = 0; r < eng31.gridSize; r++) for (let c = 0; c < eng31.gridSize; c++) {
    if (eng31.grid[r][c].type === 'ruin') { ruinPos31 = { row: r, col: c }; break; }
    if (ruinPos31) break;
}
eng31.grid[ruinPos31.row][ruinPos31.col].revealed = true;
p31.position = ruinPos31;
const tessaExtract = eng31.extract('tessa1', 'top');
assert(tessaExtract.success, 'Tessa extracts at Ruin (no shop needed)');
assert(p31.ingredientTokens['Red Meat'] === 2, 'Correct ingredient granted');

// ===================================================================
console.log('\n=== TEST 32: Deserted Hunt resets tile contents for fresh draw ===');
const eng32 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'hunter_hank' }]);
eng32.round = 2;
const p32 = eng32.getCurrentPlayer();
p32.ap = 3;
p32.stamina = 3;
// Force a monster the engine can't beat
eng32.monsterDeck = [GAME_DATA.monsters.find(m => m.id === 'sulfur_wyrm')]; // HP 4, ATK 3
let ruinPos32 = null;
for (let r = 0; r < eng32.gridSize; r++) for (let c = 0; c < eng32.gridSize; c++) {
    if (eng32.grid[r][c].type === 'ruin') { ruinPos32 = { row: r, col: c }; break; }
    if (ruinPos32) break;
}
eng32.grid[ruinPos32.row][ruinPos32.col].revealed = true;
p32.position = ruinPos32;
const fail32 = eng32.hunt('BOLD');
assert(fail32.success === false, 'Hunt fails (ATK 2 < HP 4)');
assert(eng32.grid[ruinPos32.row][ruinPos32.col].contents === null, 'Tile contents reset after failed hunt');

// ===================================================================
console.log('\n=== TEST 33: Tame blocked by companion cap falls back to capture ===');
const eng33 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'trapper_tim' }], { tier: 'standard' });
eng33.round = 2;
const p33 = eng33.getCurrentPlayer();
p33.ap = 5;
p33.companions = ['flame_lizard', 'grumble_boar', 'ember_crab']; // at cap (3)
// Ensure the 3 companions don't conflict (Flame=Ember, Grumble=Verdant, Ember=Ember... wait, Flame and Ember both EMBER)
// Fix: use non-conflicting companions
p33.companions = ['flame_lizard', 'tide_eel', 'candy_slime']; // Ember, Tide, Bloom — no conflicts
p33.stamina = 4;
eng33._buildMonsterDeck(2);
eng33.monsterDeck = [GAME_DATA.monsters.find(m => m.id === 'moss_stag')]; // Tier 1
let ruinPos33 = null;
for (let r = 0; r < eng33.gridSize; r++) for (let c = 0; c < eng33.gridSize; c++) {
    if (eng33.grid[r][c].type === 'ruin') { ruinPos33 = { row: r, col: c }; break; }
    if (ruinPos33) break;
}
eng33.grid[ruinPos33.row][ruinPos33.col].revealed = true;
p33.position = ruinPos33;
const tameBlocked = eng33.hunt('TAMED');
assert(tameBlocked.success, 'Tame attempt succeeds (graceful fallback)');
assert(tameBlocked.companionBlocked === true, 'Companion blocked due to cap');
assert(p33.capturedMonsters.length === 1, 'Monster captured normally as fallback');

// ===================================================================
console.log('\n=== TEST 34: Crucible triggers Dark Hour and limits to once per round ===');
const eng34 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'butcher_bob' }]);
eng34.round = 3;
eng34._setupRoundGrid(3);
eng34._buildMonsterDeck(3);
eng34.monsterDeck = [
    GAME_DATA.monsters.find(m => m.id === 'sulfur_wyrm'),
    GAME_DATA.monsters.find(m => m.id === 'abyss_angler'),
    GAME_DATA.monsters.find(m => m.id === 'iron_tortoise')
];
const p34 = eng34.getCurrentPlayer();
p34.ap = 5;
p34.stamina = 3;
let cruciblePos = null;
for (let r = 0; r < eng34.gridSize; r++) for (let c = 0; c < eng34.gridSize; c++) {
    if (eng34.grid[r][c].type === 'crucible') { cruciblePos = { row: r, col: c }; break; }
    if (cruciblePos) break;
}
if (cruciblePos) {
    eng34.grid[cruciblePos.row][cruciblePos.col].revealed = true;
    p34.position = cruciblePos;
    const crucResult = eng34.actOnCrucible('sulfur_wyrm');
    assert(crucResult.success || crucResult.success === false, 'Crucible action runs');
    assert(eng34.darkHourActive === true, 'Dark Hour triggered by Crucible');
    assert(p34.crucibleUsedThisRound === true, 'crucibleUsedThisRound flag set');
    const secondCruc = eng34.actOnCrucible('abyss_angler');
    assert(secondCruc.success === false, 'Second Crucible attempt blocked');
} else {
    console.log('    (No crucible generated — skipping crucible test)');
}

// ===================================================================
console.log('\n=== TEST 35: Companion abilities — Grumble Boar free Rest ===');
const eng35 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'hunter_hank' }]);
eng35.round = 2;
const p35 = eng35.getCurrentPlayer();
p35.companions = ['grumble_boar'];
p35.stamina = 1;
p35.ap = 2;
const boarResult = eng35.useCompanionAbility('grumble_boar');
assert(boarResult.success, 'Grumble Boar free Rest succeeds');
assert(p35.stamina === 2, 'Stamina increased by 1');
assert(p35.ap === 2, 'AP not consumed (free action)');

// ===================================================================
console.log('\n=== TEST 36: Frost Owlbear free Move ===');
const eng36 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'hunter_hank' }]);
eng36.round = 2;
const p36 = eng36.getCurrentPlayer();
p36.companions = ['frost_owlbear'];
p36.ap = 2;
const owlResult = eng36.useCompanionAbility('frost_owlbear');
assert(owlResult.success, 'Frost Owlbear free Move ability succeeds');
assert(p36.freeMoveAvailable === true, 'freeMoveAvailable flag set');
assert(p36.ap === 2, 'AP not consumed (free action)');
// Now move using the free move
p36.position = { row: 0, col: 0 };
eng36.grid[0][1].revealed = true;
const freeMove = eng36.move(0, 1);
assert(freeMove.success, 'Free move succeeds');
assert(p36.ap === 2, 'AP unchanged after free move');
assert(p36.freeMoveAvailable === false, 'freeMoveAvailable consumed');

// ===================================================================
console.log('\n=== TEST 37: River Leviathan Bold→Careful access ===');
const eng37 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'hunter_hank' }]);
eng37.round = 2;
const p37 = eng37.getCurrentPlayer();
p37.companions = ['river_leviathan'];
p37.ap = 3;
const rlResult = eng37.useCompanionAbility('river_leviathan');
assert(rlResult.success, 'River Leviathan ability succeeds');
assert(p37.nextBoldAsCareful === true, 'nextBoldAsCareful flag set');

// ===================================================================
console.log('\n=== TEST 38: Tide Eel grants Spoilage immunity charge ===');
const eng38 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'hunter_hank' }]);
eng38.round = 2;
const p38 = eng38.getCurrentPlayer();
p38.companions = ['tide_eel'];
p38.ap = 3;
p38.spoilageImmunityCharges = 0;
const tideResult = eng38.useCompanionAbility('tide_eel');
assert(tideResult.success, 'Tide Eel ability succeeds');
assert(p38.spoilageImmunityCharges === 1, 'Spoilage immunity charge granted');

// ===================================================================
console.log('\n=== TEST 39: Moonlight Passive Companion ability blocked ===');
const eng39 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'hunter_hank' }]);
const p39 = eng39.getCurrentPlayer();
p39.companions = ['flame_lizard'];
const passResult = eng39.useCompanionAbility('flame_lizard');
assert(passResult.success === false, 'PASSIVE ability cannot be activated');

// ===================================================================
console.log('\n=== TEST 40: Tool effect helper returns correct flags ===');
const eng40 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'hunter_hank' }]);
const p40 = eng40.getCurrentPlayer();
p40.tools = [];
let eff40 = eng40._getPlayerToolEffect(p40);
assert(Object.keys(eff40).length === 0, 'No tool: empty effects');

p40.tools = ['cleaver'];
eff40 = eng40._getPlayerToolEffect(p40);
assert(eff40.cleaver === true, 'Cleaver flag set');

p40.tools = ['hammer'];
eff40 = eng40._getPlayerToolEffect(p40);
assert(eff40.hammer === true, 'Hammer flag set');

p40.tools = ['net'];
eff40 = eng40._getPlayerToolEffect(p40);
assert(eff40.net === true, 'Net flag set');

p40.tools = ['spear'];
eff40 = eng40._getPlayerToolEffect(p40);
assert(eff40.spear === true, 'Spear flag set');

p40.tools = ['trap'];
eff40 = eng40._getPlayerToolEffect(p40);
assert(eff40.trap === true, 'Trap flag set');

p40.tools = ['bow'];
eff40 = eng40._getPlayerToolEffect(p40);
assert(eff40.bow === true, 'Bow flag set');

p40.tools = ['cleaver', 'net', 'trap'];
eff40 = eng40._getPlayerToolEffect(p40);
assert(eff40.cleaver === true && eff40.net === true && eff40.trap === true, 'Multiple tools: all flags set');

// ===================================================================
console.log('\n=== TEST 41: Kitchen — Wildcard dish completed at tile ===');
const eng41 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'tracker_tessa' }], { tier: 'standard' });
const p41 = eng41.getCurrentPlayer();
p41.ingredientTokens = { 'Red Meat': 2, 'White Meat': 2 };
p41.ap = 3;
const kitchenDish = GAME_DATA.dishes.find(d => d.id === 'quick_snack');
assert(kitchenDish && kitchenDish.type === 'wildcard', 'Quick Snack is a wildcard dish');
// Move to a kitchen tile
let kitchenPos = null;
for (let r = 0; r < eng41.gridSize; r++) for (let c = 0; c < eng41.gridSize; c++) {
    if (eng41.grid[r][c].type === 'kitchen') { kitchenPos = { row: r, col: c }; break; }
    if (kitchenPos) break;
}
if (kitchenPos) {
    eng41.grid[kitchenPos.row][kitchenPos.col].revealed = true;
    p41.position = kitchenPos;
    const kResult = eng41.actOnKitchen(kitchenDish.id, ['Red Meat', 'Red Meat']);
    assert(kResult.success, 'Kitchen wildcard dish completed');
    assert(kResult.score > 0, 'Score is positive');
    assert(p41.ingredientTokens['Red Meat'] === undefined, 'Red Meat spent');
    assert(p41.ingredientTokens['White Meat'] === 2, 'White Meat untouched');
    assert(p41.ap === 2, 'AP consumed by Kitchen');
} else {
    console.log('    (No kitchen tile generated — skipping)');
}

// ===================================================================
console.log('\n=== TEST 42: Kitchen rejects non-wildcard dish ===');
if (kitchenPos) {
    p41.ingredientTokens = { 'Red Meat': 3, 'Fiery Seasoning': 1 };
    p41.ap = 3;
    const badDish = GAME_DATA.dishes.find(d => d.type === 'standard');
    const badResult = eng41.actOnKitchen(badDish.id, ['Red Meat', 'Red Meat', 'Red Meat', 'Fiery Seasoning']);
    assert(badResult.success === false, 'Kitchen rejects non-wildcard dish');
}

// ===================================================================
console.log('\n=== TEST 43: gearIngredientBonus extends capacity ===');
const eng43 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'trapper_tim' }], { tier: 'standard' }); // base cap 4
const p43 = eng43.getCurrentPlayer();
p43.gearIngredientBonus = 2;
p43.ingredientTokens = { 'Red Meat': 5, 'Sea Meat': 1 }; // 6 items
const spResult = eng43._grantIngredient(p43, 'White Meat', 1); // should fit (cap = 4+2=6)
assert(spResult === 1, 'gearIngredientBonus=2 allows 6 items (base 4 + 2)');
assert(p43.ingredientTokens['White Meat'] === 1, 'White Meat added');

// ===================================================================
console.log('\n=== TEST 44: Action cap — failed hunt consumes cap, extract uses independent cap ===');
const eng44 = new GameEngine([
    { id: 'p1', name: 'Solo', characterId: 'hunter_hank' }
], { tier: 'standard' });
const p44 = eng44.getCurrentPlayer();
p44.ap = 4;
// Find a ruin with a strong monster
for (let r = 0; r < eng44.gridSize; r++) for (let c = 0; c < eng44.gridSize; c++) {
    const t = eng44.grid[r][c];
    if (t.type === 'ruin' && t.revealed && !t.contents && (t.huntCount || 0) === 0) {
        p44.position = { row: r, col: c };
        t.contents = { monster: { id: 'ironclad_behemoth', name: 'Ironclad Behemoth', tier: 3, hp: 99, atk: 3, edges: { top: { type: 'Red Meat', value: 3 }, left: { type: 'Earthy Aroma', value: 2 }, right: { type: 'Herbal Seasoning', value: 2 }, bottom: { type: 'Mineral Seasoning', value: 2 } } }, instanceId: 'm_test' };
        const failResult = eng44.hunt('CAREFUL');
        assert(!failResult.success, 'Failed hunt with ATK < HP');
        assert(p44.actionsThisTurn.huntOrTame === 1, 'Failed hunt still consumed 1 of huntOrTame cap');

        // Extract has its own cap — verify independent tracking
        p44.capturedMonsters.push({ instanceId: 'm_captured1', monsterId: 'flame_lizard', killState: 'BOLD' });
        let shopFound = false;
        for (let sr = 0; sr < eng44.gridSize && !shopFound; sr++) for (let sc = 0; sc < eng44.gridSize && !shopFound; sc++) {
            if (eng44.grid[sr][sc].type === 'butcher') {
                eng44.grid[sr][sc].revealed = true;
                p44.position = { row: sr, col: sc };
                shopFound = true;
            }
        }
        p44.ap = 3;
        const extractResult = eng44.extract('m_captured1', 'top');
        assert(extractResult.success, 'Extract succeeds (independent cap from hunt)');
        assert(p44.actionsThisTurn.extract === 1, 'Extract tracked under its own cap');
        assert(p44.actionsThisTurn.huntOrTame === 1, 'Hunt cap unchanged by extract');

        // Second hunt — should succeed (huntOrTame was 1)
        p44.ap = 3;
        p44.position = { row: r, col: c }; // move back to the ruin
        t.contents = { monster: { id: 'flame_lizard', name: 'Flame Lizard', tier: 1, hp: 2, atk: 1, edges: { top: { type: 'Red Meat', value: 2 }, left: { type: 'Spicy Aroma', value: 1 }, right: { type: 'Fiery Seasoning', value: 1 }, bottom: { type: 'Fiery Seasoning', value: 1 } } }, instanceId: 'm_test2' };
        t.huntCount = 0;
        t.exhausted = false;
        const hunt2 = eng44.hunt('CAREFUL');
        assert(hunt2.success, 'Second hunt succeeds');
        assert(p44.actionsThisTurn.huntOrTame === 2, 'huntOrTame cap now at 2');
        // Third hunt blocked by cap
        const hunt3 = eng44.hunt('CAREFUL');
        assert(!hunt3.success, 'Third hunt blocked by cap');
        break;
    }
}

// ===================================================================
console.log('\n=== TEST 45: Co-op — getAvailableAssists, assist AP cost, assist bonus ===');
const eng45 = new GameEngine([
    { id: 'p1', name: 'Leader', characterId: 'hunter_hank' },
    { id: 'p2', name: 'Ally', characterId: 'butcher_bob' }
], { mode: 'coop' });
// Both players should have AP in co-op mode
assert(eng45.players[0].ap === 3, 'P1 has AP in co-op');
assert(eng45.players[1].ap === 3, 'P2 has AP in co-op');
// Move both to same tile
eng45.players[0].position = { row: 0, col: 0 };
eng45.players[1].position = { row: 0, col: 0 };
// Check assists
const assists = eng45.getAvailableAssists();
assert(assists.length === 1, 'One ally available for assist');
assert(assists[0].index === 1, 'Ally is player index 1');
assert(assists[0].bonus === Math.ceil(3 / 2), 'Bob ATK 3 → assist bonus ceil(3/2)=2');
assert(assists[0].apCost === 1, 'Assist costs 1 AP');
// Ally with 0 AP should not appear
eng45.players[1].ap = 0;
const noAssists = eng45.getAvailableAssists();
assert(noAssists.length === 0, 'No assists when ally has 0 AP');

// ===================================================================
console.log('\n=== TEST 46: Forage — 2 AP cost, once per turn, tile restriction ===');
const eng46 = new GameEngine([
    { id: 'p1', name: 'Solo', characterId: 'hunter_hank' }
], { tier: 'standard' });
const p46 = eng46.getCurrentPlayer();
p46.ap = 4;
// Find a ruin tile
for (let r = 0; r < eng46.gridSize; r++) for (let c = 0; c < eng46.gridSize; c++) {
    if (eng46.grid[r][c].type === 'ruin') {
        eng46.grid[r][c].revealed = true;
        p46.position = { row: r, col: c };
        break;
    }
    break;
}
const forageResult = eng46.forage();
assert(forageResult.success, 'Forage succeeds on ruin');
assert(p46.ap === 2, 'Forage costs 2 AP');
assert(p46.forageUsedThisTurn === true, 'forageUsedThisTurn flag set');
const forage2 = eng46.forage();
assert(!forage2.success, 'Second forage blocked (once per turn)');
// Forage on unrevealed tile
p46.forageUsedThisTurn = false;
p46.ap = 4;
p46.position = { row: 0, col: 0 };
eng46.grid[0][0].revealed = false;
const forageUnrevealed = eng46.forage();
assert(!forageUnrevealed.success, 'Cannot forage on unrevealed tile');
// Forage at wrong tile type
eng46.grid[0][0].revealed = true;
eng46.grid[0][0].type = 'strange';
p46.position = { row: 0, col: 0 };
p46.forageUsedThisTurn = false;
p46.ap = 4;
const forageStrange = eng46.forage();
assert(!forageStrange.success, 'Cannot forage at Strange Place');

// ===================================================================
console.log('\n=== TEST 47: Desperate kill — double spoilage at extraction ===');
const eng47 = new GameEngine([
    { id: 'p1', name: 'Solo', characterId: 'hunter_hank' }
], { tier: 'standard' });
const p47 = eng47.getCurrentPlayer();
p47.ap = 4;
// Force round 2 for kill states
eng47.round = 2;
// Give player ingredients that will spoil (Ember + Bloom families)
p47.ingredientTokens = { 'Red Meat': 1, 'Sweet Aroma': 1 };
// Find a ruin and set a weak monster
for (let r = 0; r < eng47.gridSize; r++) for (let c = 0; c < eng47.gridSize; c++) {
    const t = eng47.grid[r][c];
    if (t.type === 'ruin' && t.revealed && !t.contents && (t.huntCount || 0) === 0) {
        p47.position = { row: r, col: c };
        t.contents = { monster: { id: 'flame_lizard', name: 'Flame Lizard', tier: 1, hp: 2, atk: 1, edges: { top: { type: 'Red Meat', value: 2 }, left: { type: 'Spicy Aroma', value: 1 }, right: { type: 'Fiery Seasoning', value: 1 }, bottom: { type: 'Fiery Seasoning', value: 1 } } }, instanceId: 'm_desp' };
        const despResult = eng47.hunt('DESPERATE');
        assert(despResult.success, 'Desperate kill succeeds');
        assert(despResult.killState === 'DESPERATE', 'Kill state is DESPERATE');
        // Monster captured; spoilage happens at extract, not hunt
        assert(p47.capturedMonsters.length === 1, 'Monster captured after Desperate kill');
        // Move to a shop to extract (spoilage fires during extract with double check for Desperate)
        let shopPos = null;
        for (let sr = 0; sr < eng47.gridSize && !shopPos; sr++) for (let sc = 0; sc < eng47.gridSize && !shopPos; sc++) {
            if (eng47.grid[sr][sc].type === 'butcher') {
                shopPos = { row: sr, col: sc };
            }
        }
        if (shopPos) {
            eng47.grid[shopPos.row][shopPos.col].revealed = true;
            p47.position = shopPos;
            p47.ap = 3;
            const extResult = eng47.extract('m_desp', 'top');
            assert(extResult.success, 'Extract succeeds');
            assert(extResult.spoilageHits && extResult.spoilageHits.length > 0, 'Desperate extract triggers spoilage check');
            // Ember (Red Meat) + Bloom (Sweet Aroma) conflict should discard both
            assert(!p47.ingredientTokens['Red Meat'], 'Red Meat lost to spoilage');
            assert(!p47.ingredientTokens['Sweet Aroma'], 'Sweet Aroma lost to spoilage');
        } else {
            console.log('    (No butcher tile generated — skipping spoilage assertion)');
        }
        break;
    }
}

// ===================================================================
console.log('\n=== TEST 48: Shrine guaranteeCleanNextHunt forces CAREFUL ===');
// Place shrine manually, use it, then hunt
const eng48 = new GameEngine([
    { id: 'p1', name: 'Solo', characterId: 'hunter_hank' }
], { tier: 'standard' });
const p48 = eng48.getCurrentPlayer();
eng48.round = 2;
p48.ap = 4;
// Place shrine tile at (0,0), player there
eng48.grid[0][0] = { type: 'shrine', revealed: true, contents: null };
p48.position = { row: 0, col: 0 };
const shrineResult = eng48.actOnShrine();
assert(shrineResult.success, 'Shrine activated');
assert(p48.guaranteeCleanNextHunt === true, 'guaranteeCleanNextHunt flag set');
assert(p48.ap === 3, 'Shrine costs 1 AP');
// Move to ruin and hunt
for (let r = 0; r < eng48.gridSize; r++) for (let c = 0; c < eng48.gridSize; c++) {
    const t = eng48.grid[r][c];
    if (t.type === 'ruin' && t.revealed && !t.contents && (t.huntCount || 0) === 0) {
        eng48.grid[r][c].revealed = true;
        p48.position = { row: r, col: c };
        t.contents = { monster: { id: 'flame_lizard', name: 'Flame Lizard', tier: 1, hp: 2, atk: 1, edges: { top: { type: 'Red Meat', value: 2 }, left: { type: 'Spicy Aroma', value: 1 }, right: { type: 'Fiery Seasoning', value: 1 }, bottom: { type: 'Fiery Seasoning', value: 1 } } }, instanceId: 'm_shrine' };
        const huntResult = eng48.hunt('BOLD'); // user chose BOLD but Shrine forces CAREFUL
        assert(huntResult.success, 'Hunt with Shrine blessing succeeds');
        assert(huntResult.killState === 'CAREFUL', 'Shrine forced CAREFUL kill despite BOLD choice');
        assert(p48.guaranteeCleanNextHunt === false, 'Flag consumed after use');
        break;
    }
}

// ===================================================================
console.log('\n=== TEST 49: Tessa fog face-up blocks BOLD/DESPERATE ===');
const eng49 = new GameEngine([
    { id: 'p1', name: 'Solo', characterId: 'tracker_tessa' }
], { tier: 'standard' });
const p49 = eng49.getCurrentPlayer();
eng49.round = 2;
// Before fog: BOLD and DESPERATE should be available
const statesBefore = eng49.getAvailableKillStates(p49);
assert(statesBefore.includes('BOLD'), 'BOLD available before fog');
assert(statesBefore.includes('DESPERATE'), 'DESPERATE available before fog');
// Set fogFaceUpPending
p49.fogFaceUpPending = true;
const statesDuring = eng49.getAvailableKillStates(p49);
assert(!statesDuring.includes('BOLD'), 'BOLD blocked while fogFaceUpPending');
assert(!statesDuring.includes('DESPERATE'), 'DESPERATE blocked while fogFaceUpPending');
assert(statesDuring.includes('CAREFUL'), 'CAREFUL still available');
assert(statesDuring.includes('TAMED'), 'TAMED still available');
// Clear the flag
p49.fogFaceUpPending = false;
const statesAfter = eng49.getAvailableKillStates(p49);
assert(statesAfter.includes('BOLD'), 'BOLD available again after fog resolved');
assert(statesAfter.includes('DESPERATE'), 'DESPERATE available again after fog resolved');
// Non-Tessa character should NOT be affected
const eng49b = new GameEngine([
    { id: 'p1', name: 'Solo', characterId: 'hunter_hank' }
], { tier: 'standard' });
const p49b = eng49b.getCurrentPlayer();
eng49b.round = 2;
p49b.fogFaceUpPending = true; // shouldn't affect Hank
const hankStates = eng49b.getAvailableKillStates(p49b);
assert(hankStates.includes('BOLD'), 'BOLD not blocked for non-Tessa');
assert(hankStates.includes('DESPERATE'), 'DESPERATE not blocked for non-Tessa');

// ===================================================================
console.log('\n=== TEST 50: Ruin exhaustion — 3 hunts then blocked ===');
const eng50 = new GameEngine([
    { id: 'p1', name: 'Solo', characterId: 'hunter_hank' }
], { tier: 'standard' });
const p50 = eng50.getCurrentPlayer();
p50.ap = 10;
// Find a ruin
for (let r = 0; r < eng50.gridSize; r++) for (let c = 0; c < eng50.gridSize; c++) {
    const t = eng50.grid[r][c];
    if (t.type === 'ruin' && t.revealed && (t.huntCount || 0) === 0) {
        p50.position = { row: r, col: c };
        // Hunt 3 times to exhaust (reset action cap each time so cap doesn't interfere)
        for (let h = 0; h < 3; h++) {
            t.contents = { monster: { id: 'flame_lizard', name: 'Flame Lizard', tier: 1, hp: 1, atk: 1, edges: { top: { type: 'Red Meat', value: 2 }, left: { type: 'Spicy Aroma', value: 1 }, right: { type: 'Fiery Seasoning', value: 1 }, bottom: { type: 'Fiery Seasoning', value: 1 } } }, instanceId: `m_exc${h}` };
            t.exhausted = false;
            p50.actionsThisTurn.huntOrTame = 0; // reset cap for each hunt
            const hr = eng50.hunt('CAREFUL');
            if (!hr.success) break;
        }
        assert(t.huntCount >= 3, 'Ruin huntCount is 3 after 3 hunts');
        assert(t.exhausted === true, 'Ruin marked exhausted after 3 hunts');
        // 4th hunt should fail
        t.contents = { monster: { id: 'flame_lizard', name: 'Flame Lizard', tier: 1, hp: 1, atk: 1, edges: { top: { type: 'Red Meat', value: 2 }, left: { type: 'Spicy Aroma', value: 1 }, right: { type: 'Fiery Seasoning', value: 1 }, bottom: { type: 'Fiery Seasoning', value: 1 } } }, instanceId: 'm_exc4' };
        p50.actionsThisTurn.huntOrTame = 0;
        const blockedHunt = eng50.hunt('CAREFUL');
        assert(!blockedHunt.success, '4th hunt blocked by exhaustion');
        break;
    }
}

// ===================================================================
console.log('\n=== TEST 51: isRoundProductivelyOver — deck empty + ruins exhausted ===');
const eng51 = new GameEngine([
    { id: 'p1', name: 'Solo', characterId: 'hunter_hank' }
], { tier: 'standard' });
// Deck has cards — not productive
assert(!eng51.isRoundProductivelyOver(), 'Not productive when deck has cards');
// Empty deck
eng51.monsterDeck = [];
assert(eng51.isRoundProductivelyOver(), 'Productive when deck empty and no ruin contents');
// Add a ruin with contents
eng51.grid[0][0] = { type: 'ruin', revealed: true, contents: { monster: {} }, huntCount: 0 };
assert(!eng51.isRoundProductivelyOver(), 'Not productive when ruin has monster');
// Exhaust that ruin
eng51.grid[0][0].exhausted = true;
eng51.grid[0][0].contents = null;
assert(eng51.isRoundProductivelyOver(), 'Productive when ruin exhausted and empty');

// ===================================================================
console.log('\n=== TEST 52: Co-op assist — actual hunt with assist bonus ===');
const eng52 = new GameEngine([
    { id: 'p1', name: 'Leader', characterId: 'hunter_hank' },
    { id: 'p2', name: 'Ally', characterId: 'butcher_bob' }
], { mode: 'coop' });
// Move to round 2 for kill states
eng52.round = 2;
// Put both on same ruin tile
eng52.grid[0][0] = { type: 'ruin', revealed: true, contents: null, huntCount: 0 };
eng52.players[0].position = { row: 0, col: 0 };
eng52.players[1].position = { row: 0, col: 0 };
eng52.players[0].ap = 3;
eng52.players[1].ap = 3;
// Place a monster that Hank (ATK 2) can't solo but can with Bob assist (ATK 3, bonus = ceil(3/2)=2, total 4)
eng52.grid[0][0].contents = { monster: { id: 'ironclad_behemoth', name: 'Ironclad Behemoth', tier: 3, hp: 4, atk: 3, edges: {} }, instanceId: 'm_coop' };
eng52.currentPlayerIndex = 0;
const coopResult = eng52.hunt('BOLD', 1); // Hank hunts with Bob assisting
assert(coopResult.success, 'Hunt succeeds with assist bonus');
assert(coopResult.assistLog !== null, 'Assist log present');
assert(eng52.players[1].ap === 2, 'Ally spent 1 AP for assist');

// ===================================================================
console.log('\n=== TEST 53: Desperate kill stamina cost (non-Bob) ===');
const eng53 = new GameEngine([
    { id: 'p1', name: 'Solo', characterId: 'tracker_tessa' }
], { tier: 'standard' });
const p53 = eng53.getCurrentPlayer();
eng53.round = 2;
p53.ap = 4;
p53.stamina = 3;
// Mark Hank's free hunt as used to prevent passive override (if using Hank)
// Tessa has no free-hunt passive so her stamina costs are normal
for (let r = 0; r < eng53.gridSize; r++) for (let c = 0; c < eng53.gridSize; c++) {
    const t = eng53.grid[r][c];
    if (t.type === 'ruin' && t.revealed && !t.contents && (t.huntCount || 0) === 0) {
        p53.position = { row: r, col: c };
        t.contents = { monster: { id: 'flame_lizard', name: 'Flame Lizard', tier: 1, hp: 2, atk: 1, edges: { top: { type: 'Red Meat', value: 2 }, left: { type: 'Spicy Aroma', value: 1 }, right: { type: 'Fiery Seasoning', value: 1 }, bottom: { type: 'Fiery Seasoning', value: 1 } } }, instanceId: 'm_desp2' };
        const dr = eng53.hunt('DESPERATE');
        assert(dr.success, 'Desperate hunt succeeds');
        assert(dr.killState === 'DESPERATE', 'Kill state is DESPERATE');
        // DESPERATE costs 1 stamina (from KILL_STATES), no character passive override for Tessa
        assert(p53.stamina === 2, 'Desperate costs 1 Stamina for non-Bob');
        break;
    }
}

// ===================================================================
console.log('\n=== TEST 54: Betrayal mechanic ===');
const eng54 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'butcher_bob' }]);
const p54 = eng54.getCurrentPlayer();
p54.companions.push('flame_lizard');
p54.stamina = 3;
// Cannot betray with 0 stamina
const betrayNoStamina = (() => { const e2 = new GameEngine([{ id: 'p1', name: 'X', characterId: 'butcher_bob' }]); e2.getCurrentPlayer().companions.push('flame_lizard'); e2.getCurrentPlayer().stamina = 0; return e2.betrayCompanion('flame_lizard', 'top'); })();
assert(betrayNoStamina.success === false, 'Cannot betray at 0 Stamina');
// Successful betrayal
const betrayResult = eng54.betrayCompanion('flame_lizard', 'top');
assert(betrayResult.success, 'Betray succeeds');
assert(p54.stamina === 0, 'Stamina drops to 0 after betrayal');
assert(p54.killLog.BETRAYED === 1, 'BETRAYED logged');
assert(p54.companions.length === 0, 'Companion removed');
assert(p54.departedCompanions.includes('flame_lizard'), 'Companion moved to departed');
assert(p54.ingredientTokens['Red Meat'] === 2, 'Gains top edge ingredient immediately');
// Ending is Wild Chef
const ending54 = eng54.getEndings();
assert(ending54[0].ending === 'Wild Chef', 'Betrayed → Wild Chef ending');
// Cannot betray a companion you no longer have
const betrayAgain = eng54.betrayCompanion('flame_lizard', 'left');
assert(betrayAgain.success === false, 'Cannot betray non-existent companion');

// ===================================================================
console.log('\n=== TEST 55: Merchant buy_tool uses correct engine API ===');
const eng55 = new GameEngine([{ id: 'p1', name: 'Solo', characterId: 'tracker_tessa' }], { tier: 'standard' });
const p55 = eng55.getCurrentPlayer();
// Give ingredients for a tool
const netTool = GAME_DATA.tools.find(t => t.id === 'net');
p55.ingredientTokens = { 'Red Meat': 1, 'Spicy Aroma': 1 };
p55.ap = 3;
// Move to merchant tile
for (let r = 0; r < eng55.gridSize; r++) for (let c = 0; c < eng55.gridSize; c++) {
    if (eng55.grid[r][c].type === 'merchant') {
        eng55.grid[r][c].revealed = true;
        p55.position = { row: r, col: c };
        const buyResult = eng55.actOnMerchant('buy_tool', { toolId: 'net' });
        assert(buyResult.success, 'Buy tool via buy_tool action');
        assert(p55.tools.includes('net'), 'Net added to tools');
        assert(p55.ap === 2, 'Buy consumes 1 AP');
        break;
    }
}

// ===================================================================
console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
