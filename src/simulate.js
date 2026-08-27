// Simulation runner for Monster Meatball — 80-game trial (Section 13)
// Run: node simulate.js
// v3: much smarter AI — goal-oriented loop: explore→hunt→shop→extract→cook
const { GameEngine } = require('./game-engine.js');
const { GAME_DATA } = require('./game-data.js');

const CHARACTER_IDS = ['butcher_bob', 'tracker_tessa', 'trapper_tim', 'hunter_hank'];
const GAMES_PER_COUNT = { 1: 20, 2: 20, 3: 20, 4: 20 };

let totalGames = 0;
let totalErrors = 0;
const allResults = [];

function pickCharacters(count) {
    const shuffled = [...CHARACTER_IDS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

// BFS pathfinding — returns next move position toward target tile type
// Only searches revealed tiles
function findPathToType(engine, start, targetType) {
    const visited = new Set();
    const queue = [{ row: start.row, col: start.col, firstStep: null }];
    visited.add(`${start.row},${start.col}`);
    while (queue.length > 0) {
        const curr = queue.shift();
        if (curr.firstStep && engine.grid[curr.row][curr.col].type === targetType) {
            return curr.firstStep;
        }
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        for (const [dr, dc] of dirs) {
            const nr = curr.row + dr, nc = curr.col + dc;
            const key = `${nr},${nc}`;
            if (engine._inBounds(nr, nc) && engine.grid[nr][nc].revealed && !visited.has(key)) {
                visited.add(key);
                queue.push({ row: nr, col: nc, firstStep: curr.firstStep || { row: nr, col: nc } });
            }
        }
    }
    return null;
}

// BFS to nearest tile matching ANY of the target types
function findPathToAnyType(engine, start, targetTypes) {
    const visited = new Set();
    const queue = [{ row: start.row, col: start.col, firstStep: null }];
    visited.add(`${start.row},${start.col}`);
    while (queue.length > 0) {
        const curr = queue.shift();
        if (curr.firstStep && targetTypes.includes(engine.grid[curr.row][curr.col].type)) {
            return curr.firstStep;
        }
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        for (const [dr, dc] of dirs) {
            const nr = curr.row + dr, nc = curr.col + dc;
            const key = `${nr},${nc}`;
            if (engine._inBounds(nr, nc) && engine.grid[nr][nc].revealed && !visited.has(key)) {
                visited.add(key);
                queue.push({ row: nr, col: nc, firstStep: curr.firstStep || { row: nr, col: nc } });
            }
        }
    }
    return null;
}

// Find a specific ruin that has an active monster (not exhausted)
function findActiveRuin(engine, start) {
    const visited = new Set();
    const queue = [{ row: start.row, col: start.col, firstStep: null }];
    visited.add(`${start.row},${start.col}`);
    while (queue.length > 0) {
        const curr = queue.shift();
        if (curr.firstStep) {
            const tile = engine.grid[curr.row][curr.col];
            if (tile.type === 'ruin' && tile.revealed && !tile.exhausted) {
                return curr.firstStep;
            }
        }
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        for (const [dr, dc] of dirs) {
            const nr = curr.row + dr, nc = curr.col + dc;
            const key = `${nr},${nc}`;
            if (engine._inBounds(nr, nc) && engine.grid[nr][nc].revealed && !visited.has(key)) {
                visited.add(key);
                queue.push({ row: nr, col: nc, firstStep: curr.firstStep || { row: nr, col: nc } });
            }
        }
    }
    return null;
}

// Find nearest unrevealed tile adjacent to revealed tiles
function findNearestUnrevealed(engine, start) {
    const visited = new Set();
    const queue = [{ row: start.row, col: start.col, firstStep: null }];
    visited.add(`${start.row},${start.col}`);
    while (queue.length > 0) {
        const curr = queue.shift();
        if (curr.firstStep && !engine.grid[curr.row][curr.col].revealed) {
            return curr.firstStep;
        }
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        for (const [dr, dc] of dirs) {
            const nr = curr.row + dr, nc = curr.col + dc;
            const key = `${nr},${nc}`;
            if (engine._inBounds(nr, nc) && !visited.has(key)) {
                visited.add(key);
                queue.push({ row: nr, col: nc, firstStep: curr.firstStep || { row: nr, col: nc } });
            }
        }
    }
    return null;
}

// Pick best edge for extraction based on kill state and shop
function pickBestEdge(killState) {
    // Careful: locked to lowest edge ('top')
    if (killState === 'CAREFUL' || killState === 'TAMED') return 'top';
    // Bold/Desperate: we choose when navigating to a specific shop, so just pick shop edge
    return 'top'; // default; caller picks shop to match
}

// Shop edge map
const SHOP_EDGE_MAP = {
    'butcher': 'top',
    'aromaist': 'left',
    'seasoning': 'right'
};

// Try to complete any dish the player has ingredients for
const INGREDIENT_CATEGORIES = {
    meat: GAME_DATA.constants.INGREDIENT_TYPES.MEATS,
    aroma: GAME_DATA.constants.INGREDIENT_TYPES.AROMAS,
    seasoning: GAME_DATA.constants.INGREDIENT_TYPES.SEASONINGS
};

function tryCompleteDish(engine, player) {
    for (const dish of GAME_DATA.dishes) {
        const spent = [];
        const tempTokens = { ...player.ingredientTokens };
        let valid = true;
        const reqs = dish.requirements;

        for (const [cat, count] of Object.entries(reqs)) {
            if (cat === 'any') {
                const allTypes = Object.keys(tempTokens);
                let found = 0;
                for (const t of allTypes) {
                    while (tempTokens[t] > 0 && found < count) {
                        spent.push(t);
                        tempTokens[t]--;
                        if (tempTokens[t] === 0) delete tempTokens[t];
                        found++;
                    }
                    if (found >= count) break;
                }
                if (found < count) { valid = false; break; }
            } else if (cat === 'aromaOrSeasoning') {
                const validTypes = [...GAME_DATA.constants.INGREDIENT_TYPES.AROMAS, ...GAME_DATA.constants.INGREDIENT_TYPES.SEASONINGS];
                const avail = Object.keys(tempTokens).filter(t => validTypes.includes(t));
                let found = 0;
                for (const t of avail) {
                    while (tempTokens[t] > 0 && found < count) {
                        spent.push(t);
                        tempTokens[t]--;
                        if (tempTokens[t] === 0) delete tempTokens[t];
                        found++;
                    }
                    if (found >= count) break;
                }
                if (found < count) { valid = false; break; }
            } else if (cat === 'exoticMeat') {
                if ((tempTokens['Exotic Meat'] || 0) >= count) {
                    for (let i = 0; i < count; i++) {
                        spent.push('Exotic Meat');
                        tempTokens['Exotic Meat']--;
                        if (tempTokens['Exotic Meat'] === 0) delete tempTokens['Exotic Meat'];
                    }
                } else { valid = false; break; }
            } else {
                const validTypes = INGREDIENT_CATEGORIES[cat];
                if (!validTypes) { valid = false; break; }
                const avail = Object.keys(tempTokens).filter(t => validTypes.includes(t));
                let found = 0;
                for (const t of avail) {
                    while (tempTokens[t] > 0 && found < count) {
                        spent.push(t);
                        tempTokens[t]--;
                        if (tempTokens[t] === 0) delete tempTokens[t];
                        found++;
                    }
                    if (found >= count) break;
                }
                if (found < count) { valid = false; break; }
            }
        }

        if (valid && spent.length >= 1) {
            const result = engine.completeDish(dish.id, spent);
            if (result.success) return true;
        }
    }
    return false;
}

// Decide which shop the AI should go to based on carried kill tokens
function pickTargetShop(player) {
    // Look at first captured monster's edges to decide
    if (player.capturedMonsters.length === 0) return null;
    const first = player.capturedMonsters[0];
    // If Careful, lowest edge is 'top' → butcher
    if (first.killState === 'CAREFUL' || first.killState === 'TAMED') return 'butcher';
    // Bold/Desperate: any shop works — pick the one we can navigate to
    // Return all three, caller will pick reachable one
    return ['butcher', 'aromaist', 'seasoning'];
}

function runGame(playerCount) {
    const charIds = pickCharacters(playerCount);
    const playerConfigs = charIds.map((cid, i) => ({
        id: `p${i}`,
        name: `P${i}_${cid}`,
        characterId: cid
    }));

    const engine = new GameEngine(playerConfigs, { tier: 'standard' });
    const stats = {
        playerCount,
        characters: charIds,
        roundsCompleted: 0,
        turnsPerPlayer: new Array(playerCount).fill(0),
        totalAPSpent: 0,
        tilesRevealed: 0,
        tilesVisited: 0,
        monstersEncountered: 0,
        successfulHunts: 0,
        failedHunts: 0,
        killStates: { CAREFUL: 0, BOLD: 0, DESPERATE: 0, TAMED: 0 },
        extractions: 0,
        ingredientsGained: 0,
        spoilageEvents: 0,
        dishesCompleted: 0,
        finalScores: [],
        fogEvents: 0,
        toolsUsed: 0,
        companionsGained: 0,
        deckExhausted: false,
        noActionTurns: 0,
        errors: []
    };

    const maxRounds = GAME_DATA.constants.PLAYER_COUNT_RULES[playerCount]?.rounds?.slice(-1)[0] || 3;
    try {
        for (let round = 1; round <= maxRounds; round++) {
            if (round > 1) {
                const adv = engine.advanceRound();
                if (!adv.success) break;
            }

            let roundTurns = 0;
            const maxTurnsPerRound = 300;

            while (!engine.isRoundOver() && !engine.isRoundProductivelyOver() && roundTurns < maxTurnsPerRound) {
                const player = engine.getCurrentPlayer();
                const pIdx = engine.currentPlayerIndex;
                stats.turnsPerPlayer[pIdx]++;
                roundTurns++;

                let hadAction = false;
                let actionCount = 0;

                while (player.ap > 0 && actionCount < 20) {
                    if (engine.isRoundProductivelyOver()) break;
                    actionCount++;
                    const pos = player.position;
                    const tile = engine.grid[pos.row][pos.col];
                    let acted = false;

                    // PRIORITY 1: Try to complete a dish (free action, always worth trying)
                    if (!acted && Object.keys(player.ingredientTokens).length > 0) {
                        if (tryCompleteDish(engine, player)) {
                            stats.dishesCompleted++;
                            hadAction = true;
                            acted = true;
                        }
                    }

                    // PRIORITY 2: Extract if at shop and has captured monsters
                    if (!acted && player.capturedMonsters.length > 0 && engine.canExtractHere()) {
                        // Try to extract all carried monsters
                        for (let i = player.capturedMonsters.length - 1; i >= 0; i--) {
                            const captured = player.capturedMonsters[i];
                            // Pick the edge that matches this shop
                            const edge = SHOP_EDGE_MAP[tile.type] || 'top';
                            const result = engine.extract(captured.instanceId, edge);
                            if (result.success) {
                                stats.extractions++;
                                const ingrCount = result.ingredients ? result.ingredients.length : 0;
                                stats.ingredientsGained += ingrCount || 1;
                                if (result.spoilageHits && result.spoilageHits.length > 0) {
                                    stats.spoilageEvents += result.spoilageHits.length;
                                }
                                hadAction = true;
                                acted = true;
                                break;
                            }
                        }
                    }

                        // PRIORITY 3: Hunt if on a ruin with active monster
                    if (!acted && tile.type === 'ruin' && tile.revealed && !tile.exhausted && engine.canHuntHere() && engine.monsterDeck.length > 0) {
                        const killStates = engine.getAvailableKillStates(player);
                        const effectiveAtk = engine._getEffectiveAtk(player, null);
                        let choice;

                        // Determine best kill state based on actual success likelihood
                        // resolveHunt checks: playerAtk >= monster.hp (Careful/Desperate),
                        // ceil(monster.hp * 0.67) (Bold), or hp + buffer (Tamed)
                        const ruinContent = tile.contents;
                        const monsterHp = ruinContent ? ruinContent.monster.hp : 0;
                        const tameBuffer = GAME_DATA.constants.TAME_ATK_BUFFER || 1;
                        const tameRequiredAtk = ruinContent ? monsterHp + tameBuffer : 0;
                        const boldRequiredAtk = ruinContent ? Math.ceil(monsterHp * 0.67) : 0;

                        if (killStates.includes('TAMED') && player.companions.length < 3 && effectiveAtk >= tameRequiredAtk) {
                            choice = 'TAMED';
                        } else if (effectiveAtk >= monsterHp && killStates.includes('CAREFUL')) {
                            choice = 'CAREFUL';
                        } else if (effectiveAtk >= boldRequiredAtk && killStates.includes('BOLD') && player.stamina >= 1) {
                            choice = 'BOLD';
                        } else if (killStates.includes('DESPERATE')) {
                            choice = 'DESPERATE';
                        } else if (killStates.includes('CAREFUL')) {
                            choice = 'CAREFUL'; // might fail, but no other option
                        } else {
                            choice = killStates[0];
                        }

                        const result = engine.hunt(choice);
                        if (result.success) {
                            stats.successfulHunts++;
                            const ks = result.tamed ? 'TAMED' : (result.killState || 'BOLD');
                            stats.killStates[ks] = (stats.killStates[ks] || 0) + 1;
                            stats.monstersEncountered++;
                            hadAction = true;
                        } else {
                            stats.failedHunts++;
                            stats.monstersEncountered++;
                        }
                        acted = true;
                    }

                    // PRIORITY 4: Navigate — goal-oriented movement
                    if (!acted) {
                        let nextStep = null;

                        if (player.capturedMonsters.length > 0) {
                            // Has kill tokens → navigate to a shop for extraction
                            // For each carried kill, find the matching shop
                            const carried = player.capturedMonsters[0];
                            let targetShops;
                            if (carried.killState === 'CAREFUL' || carried.killState === 'TAMED') {
                                // Careful/Tamed: locked to lowest edge → 'top' → butcher
                                targetShops = ['butcher'];
                            } else {
                                // Bold/Desperate: any shop works, try all
                                targetShops = ['butcher', 'aromaist', 'seasoning'];
                            }
                            for (const st of targetShops) {
                                nextStep = findPathToType(engine, pos, st);
                                if (nextStep) break;
                            }
                            // If specific shop unreachable, try any shop
                            if (!nextStep) {
                                for (const st of ['butcher', 'aromaist', 'seasoning']) {
                                    nextStep = findPathToType(engine, pos, st);
                                    if (nextStep) break;
                                }
                            }
                        } else if (tile.type !== 'ruin' || tile.exhausted) {
                            // No kill tokens → navigate to an active ruin for hunting
                            nextStep = findActiveRuin(engine, pos);
                        }

                        // If no specific goal, try to reveal more of the map
                        if (!nextStep) {
                            nextStep = findNearestUnrevealed(engine, pos);
                        }

                        if (nextStep) {
                            const result = engine.move(nextStep.row, nextStep.col);
                            if (result.success) { acted = true; hadAction = true; }
                        } else {
                            // Random move to any revealed adjacent tile (last resort)
                            const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
                            const revealed = dirs
                                .map(([dr, dc]) => ({ row: pos.row + dr, col: pos.col + dc }))
                                .filter(p => engine._inBounds(p.row, p.col) && engine.grid[p.row][p.col].revealed);
                            if (revealed.length > 0) {
                                const target = revealed[Math.floor(Math.random() * revealed.length)];
                                const result = engine.move(target.row, target.col);
                                if (result.success) { acted = true; hadAction = true; }
                            }
                        }
                    }

                    // PRIORITY 5: Explore adjacent unrevealed tiles
                    if (!acted) {
                        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
                        for (const [dr, dc] of dirs) {
                            const nr = pos.row + dr, nc = pos.col + dc;
                            if (engine._inBounds(nr, nc) && !engine.grid[nr][nc].revealed) {
                                const result = engine.explore(nr, nc);
                                if (result.success) { acted = true; hadAction = true; break; }
                            }
                        }
                    }

                    // PRIORITY 6: Rest if stamina is low
                    if (!acted && player.stamina < engine._getEffectiveMaxStamina(player) * 0.5) {
                        const result = engine.rest();
                        if (result.success) { hadAction = true; acted = true; }
                    }

                    // PRIORITY 7: Utility tile actions
                    if (!acted) {
                        if (tile.type === 'well') { engine.actOnMagicWell(); acted = true; hadAction = true; }
                        else if (tile.type === 'watchtower') { engine.actOnWatchtower(); acted = true; hadAction = true; }
                        else if (tile.type === 'shrine') { engine.actOnShrine(); acted = true; hadAction = true; }
                    }

                    // PRIORITY 8: Rush toward far border if nothing useful to do
                    // The round ends when all players reach the far border (row = gridSize-1)
                    // or the monster deck empties. If no useful action available, head to border.
                    if (!acted) {
                        const farRow = engine.gridSize - 1;
                        // Rush to border if: no captures, no ingredients for dishes, no active ruins reachable,
                        // or the deck is nearly empty (within 2 cards)
                        const deckLow = engine.monsterDeck.length <= 2;
                        const noIngredients = Object.keys(player.ingredientTokens).length === 0;
                        const noCaptures = player.capturedMonsters.length === 0;
                        const canReachRuin = findActiveRuin(engine, pos) !== null;
                        const shouldRush = deckLow || (noIngredients && noCaptures && !canReachRuin);

                        if (shouldRush && player.position.row < farRow) {
                            // Move down toward the far border
                            const dirs = [[1,0],[0,-1],[0,1]]; // prefer down, then side
                            for (const [dr, dc] of dirs) {
                                const nr = pos.row + dr, nc = pos.col + dc;
                                if (engine._inBounds(nr, nc) && engine.grid[nr][nc].revealed) {
                                    const result = engine.move(nr, nc);
                                    if (result.success) { acted = true; hadAction = true; break; }
                                }
                            }
                        }
                    }

                    // PRIORITY 9: Rest as last resort
                    if (!acted && player.stamina < engine._getEffectiveMaxStamina(player)) {
                        const result = engine.rest();
                        if (result.success) { hadAction = true; acted = true; }
                    }

                    if (!acted) break;
                }

                if (!hadAction) stats.noActionTurns++;
                engine.endTurn();
            }

            if (engine.monsterDeck.length === 0) stats.deckExhausted = true;

            for (let r = 0; r < engine.gridSize; r++) {
                for (let c = 0; c < engine.gridSize; c++) {
                    if (engine.grid[r][c].revealed) stats.tilesRevealed++;
                }
            }
        }

        stats.roundsCompleted = engine.round;
        stats.finalScores = engine.players.map(p => p.gourmetPoints);
        stats.companionsGained = engine.players.reduce((s, p) => s + p.companions.length, 0);
        stats.fogEvents = engine.log.filter(l => l.includes('Fog card')).length;

    } catch (err) {
        stats.errors.push(err.message);
        totalErrors++;
    }

    return stats;
}

// Co-op mode simulation — 2P co-op with assist mechanic
function runCoopGame(difficulty = 'NORMAL') {
    const settings = GAME_DATA.constants.COOP_SETTINGS[difficulty];
    const chars = pickCharacters(2);
    const engine = new GameEngine([
        { id: 'p1', name: 'P1', characterId: chars[0] },
        { id: 'p2', name: 'P2', characterId: chars[1] }
    ], { mode: 'coop' });

    const stats = {
        playerCount: 2,
        mode: 'coop',
        difficulty,
        targetDishes: settings.festivalDishes,
        successfulHunts: 0,
        monstersEncountered: 0,
        failedHunts: 0,
        extractions: 0,
        ingredientsGained: 0,
        spoilageEvents: 0,
        dishesCompleted: 0,
        assistsUsed: 0,
        finalScores: [],
        companionsGained: 0,
        turnsPerPlayer: [0, 0],
        noActionTurns: 0,
        gameWon: false,
        darkHourTrack: 0,
        errors: []
    };

    try {
        const maxRounds = GAME_DATA.constants.PLAYER_COUNT_RULES[2]?.rounds?.slice(-1)[0] || 3;

        for (let round = 1; round <= maxRounds; round++) {
            if (round > 1) {
                const adv = engine.advanceRound();
                if (!adv.success) break;
            }

            let roundTurns = 0;
            const maxTurnsPerRound = 200;

            while (!engine.isRoundOver() && !engine.isRoundProductivelyOver() && roundTurns < maxTurnsPerRound) {
                const player = engine.getCurrentPlayer();
                const pIdx = engine.currentPlayerIndex;
                stats.turnsPerPlayer[pIdx]++;
                roundTurns++;

                let hadAction = false;
                let actionCount = 0;

                while (player.ap > 0 && actionCount < 20) {
                    if (engine.isRoundProductivelyOver()) break;
                    actionCount++;
                    const pos = player.position;
                    const tile = engine.grid[pos.row][pos.col];
                    let acted = false;

                    // PRIORITY 0: Complete a dish (free action)
                    if (!acted && Object.keys(player.ingredientTokens).length > 0) {
                        if (tryCompleteDish(engine, player)) {
                            stats.dishesCompleted++;
                            hadAction = true;
                            acted = true;
                        }
                    }

                    // PRIORITY 0.5: Co-op — always converge toward ally first
                    // Both players should be on the same tile to enable assists for harder monsters
                    if (!acted && engine.mode === 'coop') {
                        const ally = engine.players.find((a, i) => i !== engine.currentPlayerIndex);
                        if ( ally && (ally.position.row !== pos.row || ally.position.col !== pos.col)) {
                            // First try to move toward ally
                            const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
                            let bestDir = null, bestDist = Infinity;
                            for (const [dr, dc] of dirs) {
                                const nr = pos.row + dr, nc = pos.col + dc;
                                if (engine._inBounds(nr, nc) && engine.grid[nr][nc].revealed) {
                                    const dist = Math.abs(nr - ally.position.row) + Math.abs(nc - ally.position.col);
                                    if (dist < bestDist) { bestDist = dist; bestDir = { row: nr, col: nc }; }
                                }
                            }
                            if (bestDir) {
                                const result = engine.move(bestDir.row, bestDir.col);
                                if (result.success) { hadAction = true; acted = true; break; }
                            } else if (player.ap >= 1) {
                                // All adjacent tiles unrevealed — explore to reveal a path
                                const result = engine.explore();
                                if (result.success) { hadAction = true; acted = true; break; }
                            }
                        }
                    }

                    // PRIORITY 1: Hunt — co-op: check for ally assist
                    if (!acted && tile.type === 'ruin' && tile.revealed && !tile.exhausted && engine.canHuntHere() && engine.monsterDeck.length > 0) {
                        const availableAssists = engine.getAvailableAssists();
                        const killStates = engine.getAvailableKillStates(player);
                        const ruinContent = tile.contents;
                        const monsterHp = ruinContent ? ruinContent.monster.hp : 0;
                        const effectiveAtk = engine._getEffectiveAtk(player, null);
                        const boldRequired = Math.ceil(monsterHp * 0.67);
                        const tameBuffer = GAME_DATA.constants.TAME_ATK_BUFFER || 1;
                        const tameRequired = ruinContent ? monsterHp + tameBuffer : 0;

                        let choice;
                        // Try solo first
                        if (effectiveAtk >= tameRequired && killStates.includes('TAMED') && player.companions.length < 3) {
                            choice = 'TAMED';
                        } else if (effectiveAtk >= monsterHp && killStates.includes('CAREFUL')) {
                            choice = 'CAREFUL';
                        } else if (effectiveAtk >= boldRequired && killStates.includes('BOLD') && player.stamina >= 1) {
                            choice = 'BOLD';
                        } else if (killStates.includes('DESPERATE')) {
                            choice = 'DESPERATE';
                        } else if (killStates.includes('CAREFUL')) {
                            choice = 'CAREFUL';
                        } else {
                            choice = killStates[0];
                        }

                        // If solo kill won't succeed, try with assist
                        let assistIdx = null;
                        if (choice === 'CAREFUL' && effectiveAtk < monsterHp && availableAssists.length > 0) {
                            // Find an ally whose assist would make the kill succeed
                            for (const a of availableAssists) {
                                if (effectiveAtk + a.bonus >= monsterHp) {
                                    assistIdx = a.index;
                                    break;
                                }
                            }
                        } else if (choice === 'TAMED' && effectiveAtk < tameRequired && availableAssists.length > 0) {
                            for (const a of availableAssists) {
                                if (effectiveAtk + a.bonus >= tameRequired) {
                                    assistIdx = a.index;
                                    choice = 'TAMED';
                                    break;
                                }
                            }
                        } else if (choice === 'BOLD' && effectiveAtk < boldRequired && availableAssists.length > 0) {
                            for (const a of availableAssists) {
                                if (effectiveAtk + a.bonus >= boldRequired) {
                                    assistIdx = a.index;
                                    break;
                                }
                            }
                        }

                        const result = engine.hunt(choice, assistIdx);
                        stats.monstersEncountered++;
                        if (result.success) {
                            stats.successfulHunts++;
                            if (assistIdx !== null) stats.assistsUsed++;
                            if (result.tamed) stats.companionsGained++;
                        } else {
                            stats.failedHunts++;
                        }
                        hadAction = true;
                        acted = true;
                    }

                    // PRIORITY 2: Extract
                    if (!acted && player.capturedMonsters.length > 0 && engine.canExtractHere()) {
                        for (let i = player.capturedMonsters.length - 1; i >= 0; i--) {
                            const captured = player.capturedMonsters[i];
                            const shopEdgeMap = { butcher: 'top', aromaist: 'left', seasoning: 'right' };
                            const edge = shopEdgeMap[tile.type] || 'top';
                            const result = engine.extract(captured.instanceId, edge);
                            if (result.success) {
                                stats.extractions++;
                                stats.ingredientsGained += (result.ingredients ? result.ingredients.length : 0) || 1;
                                if (result.spoilageHits && result.spoilageHits.length > 0) {
                                    stats.spoilageEvents += result.spoilageHits.length;
                                }
                                hadAction = true;
                                acted = true;
                            }
                        }
                    }

                    // PRIORITY 3: Navigate toward nearest ruin
                    if (!acted) {
                        const target = findActiveRuin(engine, pos);
                        if (target) {
                            const step = findPathToType(engine, pos, 'ruin');
                            if (step) {
                                const result = engine.move(step.row, step.col);
                                if (result.success) { hadAction = true; acted = true; }
                            }
                        }
                    }

                    // PRIORITY 4: Explore unexplored neighbors
                    if (!acted) {
                        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
                        for (const [dr, dc] of dirs) {
                            const nr = pos.row + dr, nc = pos.col + dc;
                            if (engine._inBounds(nr, nc) && !engine.grid[nr][nc].revealed) {
                                const result = engine.explore(nr, nc);
                                if (result.success) { hadAction = true; acted = true; break; }
                            }
                        }
                    }

                    // PRIORITY 5: Border rush when productive play is done
                    if (!acted) {
                        const deckLow = engine.monsterDeck.length <= 2;
                        const noIngredients = Object.keys(player.ingredientTokens).length === 0;
                        const noCaptures = player.capturedMonsters.length === 0;
                        const canReachRuin = findActiveRuin(engine, pos) !== null;
                        const shouldRush = deckLow || (noIngredients && noCaptures && !canReachRuin);
                        const farRow = engine.gridSize - 1;

                        if (shouldRush && player.position.row < farRow) {
                            const dirs = [[1,0],[0,-1],[0,1]];
                            for (const [dr, dc] of dirs) {
                                const nr = pos.row + dr, nc = pos.col + dc;
                                if (engine._inBounds(nr, nc) && engine.grid[nr][nc].revealed) {
                                    const result = engine.move(nr, nc);
                                    if (result.success) { acted = true; hadAction = true; break; }
                                }
                            }
                        }
                    }

                    // If nothing happened, break to avoid infinite loop
                    if (!acted) break;
                }

                if (!hadAction) stats.noActionTurns++;
                engine.endTurn();
            }
        }

        stats.roundsCompleted = engine.round;
        stats.finalScores = engine.players.map(p => p.gourmetPoints);
        stats.companionsGained = engine.players.reduce((s, p) => s + p.companions.length, 0);
        stats.spoilageEvents = engine.log.filter(l => l.includes('spoilage') || l.includes('Spoilage')).length;
        stats.gameWon = stats.dishesCompleted >= settings.festivalDishes;

    } catch (err) {
        stats.errors.push(err.message);
        totalErrors++;
    }

    return stats;
}

// Run all games
console.log('Monster Meatball — Simulation Runner v4 (Bold threshold, 1P=2R, co-op assist, round skip)');
console.log('===================================================================================\n');

for (const [count, numGames] of Object.entries(GAMES_PER_COUNT)) {
    const playerCount = parseInt(count);
    console.log(`--- ${playerCount}P: running ${numGames} games ---`);
    for (let i = 0; i < numGames; i++) {
        const stats = runGame(playerCount);
        allResults.push(stats);
        totalGames++;
        if (stats.errors.length > 0) {
            console.log(`  Game ${i + 1}: ERROR - ${stats.errors[0]}`);
        } else {
            const scores = stats.finalScores.join('/');
            console.log(`  Game ${i + 1}: R${stats.roundsCompleted} | scores: ${scores} | hunts: ${stats.successfulHunts}/${stats.monstersEncountered} | dishes: ${stats.dishesCompleted} | ext: ${stats.extractions}`);
        }
    }
}

// Run co-op games
console.log('\n--- Co-op: running 20 games (NORMAL difficulty) ---');
for (let i = 0; i < 20; i++) {
    const stats = runCoopGame('NORMAL');
    allResults.push(stats);
    totalGames++;
    if (stats.errors.length > 0) {
        console.log(`  Game ${i + 1}: ERROR - ${stats.errors[0]}`);
    } else {
        const scores = stats.finalScores.join('/');
        const won = stats.gameWon ? 'WON' : 'LOST';
        console.log(`  Game ${i + 1}: R${stats.roundsCompleted} | ${won} | scores: ${scores} | dishes: ${stats.dishesCompleted}/${stats.targetDishes} | assists: ${stats.assistsUsed} | hunts: ${stats.successfulHunts}/${stats.monstersEncountered}`);
    }
}

// Summary
console.log('\n===================================================');
console.log('SUMMARY');
console.log('===================================================');
console.log(`Total games: ${totalGames}`);
console.log(`Errors: ${totalErrors}`);

for (const count of [1, 2, 3, 4]) {
    const games = allResults.filter(r => r.playerCount === count && r.mode !== 'coop');
    if (games.length === 0) continue;
    console.log(`\n--- ${count}P (${games.length} games) ---`);
    const avg = (arr) => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
    console.log(`  Avg rounds completed: ${avg(games.map(g => g.roundsCompleted))}`);
    console.log(`  Avg turns/player: ${avg(games.map(g => g.turnsPerPlayer.reduce((a, b) => a + b, 0) / g.turnsPerPlayer.length))}`);
    console.log(`  Avg successful hunts: ${avg(games.map(g => g.successfulHunts))}`);
    console.log(`  Avg extractions: ${avg(games.map(g => g.extractions))}`);

    const ks = { CAREFUL: 0, BOLD: 0, DESPERATE: 0, TAMED: 0 };
    games.forEach(g => { for (const [k, v] of Object.entries(g.killStates)) ks[k] += v; });
    const totalKills = Object.values(ks).reduce((a, b) => a + b, 0);
    console.log(`  Kill states: ${totalKills > 0 ? Object.entries(ks).map(([k, v]) => `${k}: ${(v/totalKills*100).toFixed(0)}% (${v})`).join(', ') : 'none'}`);

    console.log(`  Avg dishes: ${avg(games.map(g => g.dishesCompleted))}`);
    console.log(`  Avg total score: ${avg(games.map(g => g.finalScores.reduce((a, b) => a + b, 0)))}`);
    console.log(`  Avg companions: ${avg(games.map(g => g.companionsGained))}`);
    console.log(`  Avg spoilage events: ${avg(games.map(g => g.spoilageEvents))}`);
    console.log(`  Avg fog events: ${avg(games.map(g => g.fogEvents))}`);
    console.log(`  Avg no-action turns: ${avg(games.map(g => g.noActionTurns))}`);
    console.log(`  Errors: ${games.filter(g => g.errors.length > 0).length}`);

    const scores = games.map(g => g.finalScores.reduce((a, b) => a + b, 0));
    const zeros = scores.filter(s => s === 0).length;
    const nonzeros = scores.filter(s => s > 0);
    console.log(`  Score dist: ${zeros} zeros, non-zero avg: ${nonzeros.length > 0 ? avg(nonzeros) : 'N/A'}`);
}

// Co-op summary
const coopGames = allResults.filter(r => r.mode === 'coop');
if (coopGames.length > 0) {
    console.log(`\n--- Co-op (${coopGames.length} games, NORMAL difficulty) ---`);
    const avg = (arr) => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
    console.log(`  Target dishes: ${coopGames[0].targetDishes}`);
    console.log(`  Win rate: ${coopGames.filter(g => g.gameWon).length}/${coopGames.length} (${(coopGames.filter(g => g.gameWon).length/coopGames.length*100).toFixed(0)}%)`);
    console.log(`  Avg dishes completed: ${avg(coopGames.map(g => g.dishesCompleted))}`);
    console.log(`  Avg assists used: ${avg(coopGames.map(g => g.assistsUsed))}`);
    console.log(`  Avg successful hunts: ${avg(coopGames.map(g => g.successfulHunts))}`);
    console.log(`  Avg extractions: ${avg(coopGames.map(g => g.extractions))}`);
    console.log(`  Avg companions: ${avg(coopGames.map(g => g.companionsGained))}`);
    console.log(`  Avg spoilage events: ${avg(coopGames.map(g => g.spoilageEvents))}`);
    console.log(`  Avg no-action turns: ${avg(coopGames.map(g => g.noActionTurns))}`);
    console.log(`  Errors: ${coopGames.filter(g => g.errors.length > 0).length}`);
}
