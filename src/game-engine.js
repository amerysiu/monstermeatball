// Monster Meatball - game-engine.js
// Session 5: Turn engine wiring AP spending, Stamina, Hunt/Tame/Extract,
// dish completion, and round progression to the data layer built in
// Sessions 2-3. Depends on GAME_DATA, resolveHunt, resolveDishScore,
// checkSpoilage from game-data.js.
//
// In the browser, game-data.js is loaded first via a separate <script src>
// tag (or, in the bundled standalone build, concatenated earlier in the
// same <script> block), so GAME_DATA etc. are already in the shared global
// scope by the time this file runs — no import needed there.
// In Node (for testing), we fall back to require(). This MUST use property
// assignment on the Node `global` object rather than `var`/`let`/`const`
// declarations — declaring `var GAME_DATA` here would collide with the
// `const GAME_DATA` from game-data.js at PARSE TIME (a SyntaxError,
// unconditionally, regardless of whether this branch ever executes) in any
// context where both files share one scope, such as this bundled build.
if (typeof window === 'undefined' && typeof GAME_DATA === 'undefined') {
    const _gd = require('./game-data.js');
    global.GAME_DATA = _gd.GAME_DATA;
    global.resolveDishScore = _gd.resolveDishScore;
    global.checkSpoilage = _gd.checkSpoilage;
    global.resolveHunt = _gd.resolveHunt;
}
//
// SCOPE: Core loop (Explore/Move/Hunt/Tame/Extract/Rest/CompleteDish/EndTurn)
// is fully implemented and tested. Utility tiles (Merchant, Kitchen, Shrine)
// are stubbed with TODO markers — their full trade/peek UIs are future work.
// Fog card effects are logged/applied where simple (Dark Hour flag, Miasma
// penalty) but multi-turn effect tracking (Collapsed Path duration, etc.)
// is simplified to "applies this round" rather than exact tile-blocking.

class GameEngine {
    constructor(playerConfigs, options = {}) {
        // playerConfigs: [{ id, name, characterId }, ...]
        this.mode = options.mode || 'competitive'; // 'competitive' | 'coop'
        this.tier = options.tier || 'standard';     // 'basic' | 'standard' | 'expert'
        this.round = 1;
        this.log = [];

        this.players = playerConfigs.map((cfg, i) => this._createPlayer(cfg, i));
        this.currentPlayerIndex = 0;

        this.darkHourActive = false;
        this.miasmaActive = false;

        this._setupRoundGrid(this.round);
        this._buildMonsterDeck(this.round);

        // Starting corner tiles must be revealed immediately — a player
        // standing on a tile obviously knows what type it is, even before
        // spending an Explore action. (Monster/fog CONTENTS still stay
        // hidden until Act, per the Fog of Flavor delayed-revelation rule.)
        this.players.forEach(p => { this.grid[p.position.row][p.position.col].revealed = true; });

        // Ready the first player's turn immediately — AP starts at 0 in
        // _createPlayer, but the actual first turn must be playable without
        // requiring an artificial extra endTurn() call first.
        this.players[this.currentPlayerIndex].ap = GAME_DATA.constants.ROUND_GRIDS[this.round].apPool;
    }

    // ----------------------------------------------------------------
    // Setup helpers
    // ----------------------------------------------------------------
    _createPlayer(cfg, index) {
        const character = GAME_DATA.characters.find(c => c.id === cfg.characterId);
        if (!character) throw new Error(`Unknown character: ${cfg.characterId}`);

        const baseRerolls = 2;
        const bonusRerolls = character.startingResource?.type === 'reroll_token'
            ? character.startingResource.count : 0;

        // Assign starting corner based on player index (0=TL,1=TR,2=BL,3=BR)
        const gridSize = GAME_DATA.constants.ROUND_GRIDS[1].size;
        const corners = [
            { row: 0, col: 0 }, { row: 0, col: gridSize - 1 },
            { row: gridSize - 1, col: 0 }, { row: gridSize - 1, col: gridSize - 1 }
        ];

        return {
            id: cfg.id,
            name: cfg.name,
            characterId: cfg.characterId,
            character,
            stamina: character.maxStamina,
            ap: 0,
            apMax: GAME_DATA.constants.ROUND_GRIDS[1].apPool,
            position: corners[index % 4],
            capturedMonsters: [],   // [{instanceId, monsterId, killState}]
            ingredientTokens: {},   // { 'Red Meat': 2, ... }
            companions: [],         // [monsterId, ...]
            killLog: { CAREFUL: 0, BOLD: 0, DESPERATE: 0, TAMED: 0 },
            gourmetPoints: 0,
            rerollTokens: baseRerolls + bonusRerolls,
            signaturePowerUsed: false,
            hankFreeHuntUsedThisRound: false,
            fogFaceUpPending: false // Tessa's constraint flag
        };
    }

    _setupRoundGrid(round) {
        const layout = GAME_DATA.mapLayouts[round];
        this.grid = layout.grid.map(row =>
            row.map(type => ({ type, revealed: false, contents: null }))
        );
        this.gridSize = layout.grid.length;
    }

    _buildMonsterDeck(round) {
        let pool;
        if (round === 1) pool = GAME_DATA.monsters.filter(m => m.tier === 1);
        else if (round === 2) pool = GAME_DATA.monsters.filter(m => m.tier === 1 || m.tier === 2);
        else pool = GAME_DATA.monsters.filter(m => m.tier === 2 || m.tier === 3);

        this.monsterDeck = this._shuffle([...pool]);
        this._monsterInstanceCounter = 0;
    }

    _shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    _logEvent(msg) {
        this.log.push(`[R${this.round}] ${msg}`);
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    _isAdjacent(a, b) {
        const dr = Math.abs(a.row - b.row), dc = Math.abs(a.col - b.col);
        return (dr + dc) === 1;
    }

    _inBounds(row, col) {
        return row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize;
    }

    // ----------------------------------------------------------------
    // AP-costed actions
    // ----------------------------------------------------------------

    /** Explore: reveal a tile's TYPE only (no monster/fog content yet). */
    explore(row, col) {
        const player = this.getCurrentPlayer();
        if (player.ap <= 0) return this._fail('No AP remaining.');
        if (!this._inBounds(row, col)) return this._fail('Out of bounds.');
        if (!this._isAdjacent(player.position, { row, col })) return this._fail('Tile is not adjacent to you.');

        const tile = this.grid[row][col];
        if (tile.revealed) return this._fail('Tile already revealed.');

        tile.revealed = true;
        player.ap -= 1;
        this._logEvent(`${player.name} explored (${row},${col}) → revealed as ${tile.type}.`);
        return { success: true, tileType: tile.type };
    }

    /** Move: relocate to an adjacent, already-revealed tile. */
    move(row, col) {
        const player = this.getCurrentPlayer();
        if (player.ap <= 0) return this._fail('No AP remaining.');
        if (!this._inBounds(row, col)) return this._fail('Out of bounds.');
        if (!this._isAdjacent(player.position, { row, col })) return this._fail('Tile is not adjacent to you.');

        const tile = this.grid[row][col];
        if (!tile.revealed) return this._fail('Cannot move to an unrevealed tile.');

        player.position = { row, col };
        player.ap -= 1;
        this._logEvent(`${player.name} moved to (${row},${col}).`);
        return { success: true };
    }

    /** Rest: +1 Stamina, costs 1 AP. */
    rest() {
        const player = this.getCurrentPlayer();
        if (player.ap <= 0) return this._fail('No AP remaining.');

        const before = player.stamina;
        player.stamina = Math.min(player.character.maxStamina, player.stamina + GAME_DATA.constants.STAMINA.restRecoverPerAP);
        player.ap -= 1;
        this._logEvent(`${player.name} rested: Stamina ${before} → ${player.stamina}.`);
        return { success: true, staminaAfter: player.stamina };
    }

    /**
     * Which kill states are currently legal for the player, given Stamina.
     * Round 1: always just CLEAN (handled separately in hunt()).
     */
    getAvailableKillStates(player) {
        if (this.round === 1) return ['CLEAN'];
        const states = ['TAMED']; // Taming always available if you can fight at all
        if (player.stamina > 0) {
            states.unshift('CAREFUL');
        }
        states.push('BOLD', 'DESPERATE'); // always available regardless of Stamina (that's the whole point of the 0-Stamina rule)
        return states;
    }

    /**
     * Hunt or Tame a monster on the player's CURRENT tile (must be a Ruin,
     * revealed, and not yet acted on this visit).
     * killStateChoice: 'CAREFUL' | 'BOLD' | 'DESPERATE' | 'TAMED' (ignored in Round 1)
     */
    hunt(killStateChoice) {
        const player = this.getCurrentPlayer();
        if (player.ap <= 0) return this._fail('No AP remaining.');

        const tile = this.grid[player.position.row][player.position.col];
        if (tile.type !== 'ruin') return this._fail('Not standing on a Ruin.');
        if (!tile.revealed) return this._fail('Tile not yet explored.');

        // Draw a monster if this Ruin hasn't been engaged yet (Act = commitment)
        if (!tile.contents) {
            if (this.monsterDeck.length === 0) return this._fail('Monster deck exhausted.');
            tile.contents = { monster: this.monsterDeck.pop(), instanceId: `m${++this._monsterInstanceCounter}` };
        }
        const monster = tile.contents.monster;

        // Hank's free-hunt passive
        let staminaOverride = null;
        if (player.character.id === 'hunter_hank' && !player.hankFreeHuntUsedThisRound) {
            staminaOverride = player.stamina; // resolveHunt will compute normally, we refund after
        }

        const playerAtk = player.character.baseAttack; // TODO: + equipped tool bonuses
        const mappedState = this.round === 1 ? null : killStateChoice;
        const result = resolveHunt(player.character, playerAtk, monster, player.stamina, mappedState, this.round);

        // Apply Hank's "once per round free hunt" by refunding the Stamina delta
        if (staminaOverride !== null && result.success) {
            const staminaSpent = staminaOverride - result.staminaAfter;
            if (staminaSpent > 0) {
                result.staminaAfter = staminaOverride;
                player.hankFreeHuntUsedThisRound = true;
                this._logEvent(`${player.name} (Hank) used Steady Nerve — Hunt cost no Stamina.`);
            }
        }

        player.stamina = result.staminaAfter;
        player.ap -= 1;

        if (!result.success) {
            this._logEvent(`${player.name} failed to hunt ${monster.name}. ${result.note}`);
            tile.contents = null; // monster flees; Ruin can be re-attempted (fresh draw) on a future Act
            return { success: false, monster, note: result.note, staminaAfter: player.stamina };
        }

        const finalKillState = result.killState; // 'CLEAN' in Round 1, else chosen state
        player.killLog[finalKillState] = (player.killLog[finalKillState] || 0) + 1;

        if (finalKillState === 'TAMED') {
            // Immediate guaranteed lowest-edge ingredient, monster becomes Companion, never spoils.
            const edges = monster.edges;
            const lowestEdge = ['top', 'left', 'right']
                .map(k => ({ key: k, ...edges[k] }))
                .sort((a, b) => a.value - b.value)[0];
            this._grantIngredient(player, lowestEdge.type, lowestEdge.value);
            player.companions.push(monster.id);
            tile.contents = null;
            this._logEvent(`${player.name} Tamed ${monster.name}! Gained ${lowestEdge.value}x ${lowestEdge.type}. Companion bonus: ${monster.companionBonus}`);
            return { success: true, tamed: true, monster, ingredientGranted: lowestEdge, staminaAfter: player.stamina };
        }

        // Otherwise: captured, awaiting extraction at a shop.
        player.capturedMonsters.push({
            instanceId: tile.contents.instanceId,
            monsterId: monster.id,
            killState: finalKillState
        });
        tile.contents = null; // Ruin is spent once resolved (captured monster now lives in inventory)
        this._logEvent(`${player.name} captured ${monster.name} (${finalKillState}). Awaiting extraction.`);
        return { success: true, tamed: false, monster, killState: finalKillState, staminaAfter: player.stamina };
    }

    /**
     * Extract: at a shop tile, convert a captured monster into ingredient tokens.
     * shopType: 'butcher' | 'aromaist' | 'seasoning'
     * chosenEdge: 'top' | 'left' | 'right' | 'bottom'
     */
    extract(capturedInstanceId, chosenEdge) {
        const player = this.getCurrentPlayer();
        if (player.ap <= 0) return this._fail('No AP remaining.');

        const tile = this.grid[player.position.row][player.position.col];
        const shopEdgeMap = { butcher: 'top', aromaist: 'left', seasoning: 'right' };
        const isTessaSkip = player.character.id === 'tracker_tessa' && tile.type === 'ruin';

        if (!isTessaSkip && !shopEdgeMap[tile.type]) {
            return this._fail('Not standing on a shop (or eligible Ruin for Tessa).');
        }

        const capturedIndex = player.capturedMonsters.findIndex(c => c.instanceId === capturedInstanceId);
        if (capturedIndex === -1) return this._fail('No such captured monster in inventory.');
        const captured = player.capturedMonsters[capturedIndex];
        const monster = GAME_DATA.monsters.find(m => m.id === captured.monsterId);

        // shopEdge = null means "no shop restriction" (Tessa's Ruin-skip passive)
        const shopEdge = isTessaSkip ? null : shopEdgeMap[tile.type];
        const allowed = this._legalEdges(captured.killState, monster, shopEdge);
        if (!allowed.includes(chosenEdge)) {
            const reason = allowed.length === 0
                ? `Careful kill locked this monster to its lowest edge, which isn't available here — try the matching shop instead.`
                : `Kill state ${captured.killState} only permits: ${allowed.join(', ')}`;
            return this._fail(reason);
        }

        const edgeData = monster.edges[chosenEdge];
        if (chosenEdge === 'bottom' && edgeData.condition) {
            const conditionMet = this._checkBonusCondition(edgeData.condition, player);
            if (!conditionMet) return this._fail(`Bottom edge condition not met: ${edgeData.condition}`);
        }

        this._grantIngredient(player, edgeData.type, edgeData.value);
        player.capturedMonsters.splice(capturedIndex, 1);
        player.ap -= 1;

        const spoilageHits = this._runSpoilageCheck(player, captured.killState === 'DESPERATE' ? 2 : 1);

        this._logEvent(`${player.name} extracted ${edgeData.value}x ${edgeData.type} from ${monster.name} at ${tile.type}.`);
        return { success: true, ingredientGranted: edgeData, spoilageHits, staminaAfter: player.stamina };
    }

    _lowestEdgeKey(monster) {
        return ['top', 'left', 'right']
            .map(k => ({ k, v: monster.edges[k].value }))
            .sort((a, b) => a.v - b.v)[0].k;
    }

    /**
     * shopEdge: the single edge this shop grants ('top'/'left'/'right'), or
     * null if there is no shop restriction (Tessa's Ruin-skip passive).
     * CAREFUL locks to the monster's globally-lowest edge regardless of shop
     * — if that doesn't match the shop you're at, extraction fails here
     *   (you must find the matching shop instead). This is intentional:
     *   it's the mechanical "penalty" for playing it safe at capture time.
     */
    _legalEdges(killState, monster, shopEdge) {
        const lowestKey = this._lowestEdgeKey(monster);

        if (killState === 'CAREFUL') {
            if (shopEdge === null) return [lowestKey]; // Tessa: always gets her locked edge
            return shopEdge === lowestKey ? [lowestKey] : [];
        }
        if (killState === 'DESPERATE') {
            return shopEdge === null ? ['top', 'left', 'right', 'bottom'] : [shopEdge, 'bottom'];
        }
        // CLEAN or BOLD
        return shopEdge === null ? ['top', 'left', 'right'] : [shopEdge];
    }

    _checkBonusCondition(condition, player) {
        if (condition === 'Dark Hour') return this.darkHourActive;
        if (condition === 'Clean Kill') return true; // validated by caller context already having CLEAN
        // Other conditions (specific kill states, tool usage) — simplified pass-through for now.
        return true;
    }

    _grantIngredient(player, type, amount) {
        player.ingredientTokens[type] = (player.ingredientTokens[type] || 0) + amount;
    }

    _runSpoilageCheck(player, times = 1) {
        let allHits = [];
        for (let i = 0; i < times; i++) {
            const heldTypes = Object.keys(player.ingredientTokens).filter(t => player.ingredientTokens[t] > 0);
            const hits = checkSpoilage(heldTypes);
            hits.forEach(pair => {
                // "Dispose of both" — discard the ENTIRE held stack of every
                // ingredient type belonging to either conflicting Family,
                // not just one unit. Spoilage is a type-level conflict.
                Object.entries(GAME_DATA.families).forEach(([key, fam]) => {
                    if (key === pair.a || key === pair.b) {
                        [fam.meat, fam.aroma, fam.seasoning].forEach(t => {
                            if (player.ingredientTokens[t] > 0) {
                                delete player.ingredientTokens[t];
                            }
                        });
                    }
                });
            });
            if (hits.length > 0) allHits = allHits.concat(hits);
            else break; // no more spoilage triggers, stop early even if times=2
        }
        if (allHits.length > 0) this._logEvent(`${player.name} spoilage triggered: ${allHits.map(h => h.message).join('; ')}`);
        return allHits;
    }

    /** Complete a dish: spend ingredient tokens, score via corner resolution. */
    completeDish(dishId, spentIngredientNames) {
        const player = this.getCurrentPlayer();
        const dish = GAME_DATA.dishes.find(d => d.id === dishId);
        if (!dish) return this._fail('Unknown dish.');

        // Verify player actually holds enough of each spent ingredient
        const tally = {};
        spentIngredientNames.forEach(n => tally[n] = (tally[n] || 0) + 1);
        for (const [type, count] of Object.entries(tally)) {
            if ((player.ingredientTokens[type] || 0) < count) {
                return this._fail(`Not enough ${type} (have ${player.ingredientTokens[type] || 0}, need ${count}).`);
            }
        }

        const expertTier = this.tier === 'expert';
        const result = resolveDishScore(dish, spentIngredientNames, expertTier);
        if (!result.valid) {
            return this._fail(result.reason);
        }

        // Spend the tokens
        Object.entries(tally).forEach(([type, count]) => {
            player.ingredientTokens[type] -= count;
            if (player.ingredientTokens[type] === 0) delete player.ingredientTokens[type];
        });

        let finalScore = result.score;

        // Special-rule dishes (lightweight handling of the few that need it)
        if (dish.special) {
            finalScore += this._applySpecialRule(dish.special, player, result);
        }

        player.gourmetPoints += finalScore;
        this._logEvent(`${player.name} completed "${dish.name}" via ${result.corner} → +${finalScore} pts (total ${player.gourmetPoints}).`);
        return { success: true, corner: result.corner, score: finalScore, totalPoints: player.gourmetPoints };
    }

    _applySpecialRule(special, player, harmonyResult) {
        const lowestOtherScore = Math.min(...this.players.filter(p => p !== player).map(p => p.gourmetPoints));
        switch (special.rule) {
            case 'catchup_flat':
                return player.gourmetPoints < lowestOtherScore ? 2 : 0; // note: compares BEFORE this dish's points added
            case 'catchup_scaling':
                return player.gourmetPoints < lowestOtherScore
                    ? Math.min(3, lowestOtherScore - player.gourmetPoints) : 0;
            case 'tame_bonus':
                return player.companions.length >= 1 ? 2 : 0;
            case 'clean_kill_bonus':
                return Math.min(3, player.killLog.CAREFUL || 0);
            default:
                return 0; // dish_steal / round_restriction require cross-player/turn-order context handled by caller UI
        }
    }

    /** End the current player's turn; advance to next; reset their AP. */
    endTurn() {
        const player = this.getCurrentPlayer();
        this._logEvent(`${player.name} ended their turn.`);

        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        const next = this.getCurrentPlayer();
        next.ap = GAME_DATA.constants.ROUND_GRIDS[this.round].apPool;

        return { success: true, nextPlayer: next.name };
    }

    /** Advance to the next round: new grid, refill Stamina/AP, rebuild monster deck. */
    advanceRound() {
        if (this.round >= 3) return this._fail('Already in final round.');
        this.round += 1;
        this._setupRoundGrid(this.round);
        this._buildMonsterDeck(this.round);

        this.players.forEach(p => {
            p.stamina = p.character.maxStamina;
            p.ap = GAME_DATA.constants.ROUND_GRIDS[this.round].apPool;
            p.hankFreeHuntUsedThisRound = false;
            // Reposition to corners again for the new (larger) grid
        });
        const corners = [
            { row: 0, col: 0 }, { row: 0, col: this.gridSize - 1 },
            { row: this.gridSize - 1, col: 0 }, { row: this.gridSize - 1, col: this.gridSize - 1 }
        ];
        this.players.forEach((p, i) => { p.position = corners[i % 4]; });
        this.players.forEach(p => { this.grid[p.position.row][p.position.col].revealed = true; });

        // Catch-up: lowest-scoring player goes first (Session 2 rule)
        const lowestIdx = this.players.reduce((best, p, i, arr) =>
            p.gourmetPoints < arr[best].gourmetPoints ? i : best, 0);
        this.currentPlayerIndex = lowestIdx;

        this._logEvent(`--- Round ${this.round} begins. First player: ${this.players[lowestIdx].name} ---`);
        return { success: true, round: this.round, firstPlayer: this.players[lowestIdx].name };
    }

    /** Public UI helper: what edges WOULD be legal for a captured monster if
     * extracted right now, at the player's current tile. Returns [] if not
     * standing somewhere extraction is possible at all. */
    previewLegalEdges(capturedInstanceId) {
        const player = this.getCurrentPlayer();
        const tile = this.grid[player.position.row][player.position.col];
        const shopEdgeMap = { butcher: 'top', aromaist: 'left', seasoning: 'right' };
        const isTessaSkip = player.character.id === 'tracker_tessa' && tile.type === 'ruin';
        if (!isTessaSkip && !shopEdgeMap[tile.type]) return [];

        const captured = player.capturedMonsters.find(c => c.instanceId === capturedInstanceId);
        if (!captured) return [];
        const monster = GAME_DATA.monsters.find(m => m.id === captured.monsterId);
        const shopEdge = isTessaSkip ? null : shopEdgeMap[tile.type];
        return this._legalEdges(captured.killState, monster, shopEdge);
    }

    /** Public UI helper: is the current tile a Ruin ready to Hunt/Tame? */
    canHuntHere() {
        const player = this.getCurrentPlayer();
        const tile = this.grid[player.position.row][player.position.col];
        return tile.type === 'ruin' && tile.revealed;
    }

    /** Public UI helper: can the player Extract at their current tile? */
    canExtractHere() {
        const player = this.getCurrentPlayer();
        const tile = this.grid[player.position.row][player.position.col];
        const isShop = ['butcher', 'aromaist', 'seasoning'].includes(tile.type);
        const isTessaSkip = player.character.id === 'tracker_tessa' && tile.type === 'ruin';
        return (isShop || isTessaSkip) && player.capturedMonsters.length > 0;
    }

    _fail(reason) {
        return { success: false, reason };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameEngine };
}
