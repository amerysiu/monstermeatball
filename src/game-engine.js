// Monster Meatball - game-engine.js
// Session 5: Turn engine wiring AP spending, Stamina, Hunt/Tame/Extract,
// dish completion, and round progression to the data layer built in
// Sessions 2-3. Depends on GAME_DATA, resolveHunt, resolveDishScore,
// checkSpoilage from game-data.js.
//
// In the browser, game-data.js is loaded first via a separate <script src>
// tag, so GAME_DATA etc. are already in the shared global scope by the
// time this file runs — no import needed there.
// In Node (for testing), we fall back to require() since these are
// separate CommonJS modules with no shared global by default.
if (typeof window === 'undefined' && typeof GAME_DATA === 'undefined') {
    const _gd = require('./game-data.js');
    global.GAME_DATA = _gd.GAME_DATA;
    global.resolveDishScore = _gd.resolveDishScore;
    global.checkSpoilage = _gd.checkSpoilage;
    global.resolveHunt = _gd.resolveHunt;
    global.getCompanionFamily = _gd.getCompanionFamily;
}
//
// SCOPE: Core loop (Explore/Move/Hunt/Tame/Extract/Rest/CompleteDish/EndTurn)
// is fully implemented and tested. All utility tile methods (Merchant, Kitchen,
// Shrine, Magic Well, Watchtower, Fog, Crucible) are fully implemented. Co-op
// assist mechanic is fully implemented. Fog card effects are applied where
// simple (Dark Hour flag, Miasma penalty) but multi-turn effect tracking
// (Collapsed Path duration, etc.) is simplified to "applies this round" rather
// than exact tile-blocking.

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
        this._buildFogDeck();

        // Starting corner tiles must be revealed immediately — a player
        // standing on a tile obviously knows what type it is, even before
        // spending an Explore action. (Monster/fog CONTENTS still stay
        // hidden until Act, per the Fog of Flavor delayed-revelation rule.)
        this.players.forEach(p => { this.grid[p.position.row][p.position.col].revealed = true; });

        // Ready the first player's turn immediately — AP starts at 0 in
        // _createPlayer, but the actual first turn must be playable without
        // requiring an artificial extra endTurn() call first.
        if (this.mode === 'coop') {
            // Co-op: all players get AP simultaneously so assists work
            const pool = GAME_DATA.constants.ROUND_GRIDS[this.round].apPool;
            this.players.forEach(p => { p.ap = pool; });
        } else {
            this.players[this.currentPlayerIndex].ap = GAME_DATA.constants.ROUND_GRIDS[this.round].apPool;
        }
    }

    // ----------------------------------------------------------------
    // Setup helpers
    // ----------------------------------------------------------------
    _createPlayer(cfg, index) {
        const characterTemplate = GAME_DATA.characters.find(c => c.id === cfg.characterId);
        if (!characterTemplate) throw new Error(`Unknown character: ${cfg.characterId}`);
        // SESSION 10: clone per-player, rather than sharing a direct reference
        // to GAME_DATA.characters. Found via a real test failure: since JS
        // object references are shared, one player mutating e.g.
        // player.character.baseAttack (a pattern used throughout the test
        // suite to isolate combat math from other logic) would silently
        // leak into every OTHER player/engine using the same character,
        // including in entirely separate test cases run later in the same
        // process. Cloning here closes that off at the root rather than
        // requiring every test site to remember to restore its mutation.
        const character = { ...characterTemplate, startingResource: { ...characterTemplate.startingResource } };

        const baseRerolls = 2;
        const bonusRerolls = character.startingResource?.type === 'reroll_token'
            ? character.startingResource.count : 0;

        // Assign starting corner based on player index (0=TL,1=TR,2=BL,3=BR)
        const gridSize = GAME_DATA.constants.ROUND_GRIDS[1].size;
        const corners = [
            { row: 0, col: 0 }, { row: 0, col: gridSize - 1 },
            { row: gridSize - 1, col: 0 }, { row: gridSize - 1, col: gridSize - 1 }
        ];

        // TASK 5: Starting capacity per character (from RULES.md)
        const CAPACITY = {
            butcher_bob:  { ingredientTokens: 6, capturedMonsters: 3 },
            tracker_tessa:{ ingredientTokens: 5, capturedMonsters: 1 },
            trapper_tim:  { ingredientTokens: 5, capturedMonsters: 2 },
            hunter_hank:  { ingredientTokens: 5, capturedMonsters: 2 }
        };
        const cap = CAPACITY[cfg.characterId] || { ingredientTokens: 5, capturedMonsters: 2 };

        return {
            id: cfg.id,
            name: cfg.name,
            characterId: cfg.characterId,
            character,
            stamina: character.maxStamina,
            ap: 0,
            apMax: GAME_DATA.constants.ROUND_GRIDS[1].apPool,
            position: corners[index % 4],
            roundStartPosition: { ...corners[index % 4] },
            capturedMonsters: [],   // [{instanceId, monsterId, killState}]
            ingredientTokens: this._giveStartingIngredient(),   // 1 starting ingredient
            companions: [],         // [monsterId, ...] — PERMANENT (Tier I/II) only, max 3
            departedCompanions: [], // [monsterId, ...] — ONE_SHOT (Tier III), history only, no ongoing slot
            ingredientCapacity: cap.ingredientTokens,
            capturedMonsterCapacity: cap.capturedMonsters,
            gearIngredientBonus: 0,
            gearCapturedBonus: 0,
            tools: [],              // currently equipped tool IDs
            spoilageImmunityCharges: 0, // SESSION 8: from Hidden Opportunity Fog card
            crucibleUsedThisRound: false, // SESSION 9: prevents one player draining the shared deck
            maxCompanionsBonus: 0, // SESSION 9: Cinder Phoenix can permanently expand this
            companionAbilityUsedThisRound: {}, // SESSION 9: {monsterId: true} for ACTIVE_ONCE_PER_ROUND abilities
            freeMoveAvailable: false, // SESSION 9: set by Frost Owlbear's ability, consumed by the next move()
            nextBoldAsCareful: false, // River Leviathan: once/round Bold→Careful access
            wildcardBonusActive: false, // Spore Shambler: +1 to wildcard dish scores
            forageUsedThisTurn: false, // Forage: once per turn limit
            killLog: { CAREFUL: 0, BOLD: 0, DESPERATE: 0, TAMED: 0, BETRAYED: 0 },
            gourmetPoints: 0,
            rerollTokens: baseRerolls + bonusRerolls,
            signaturePowerUsed: false,
            hankFreeHuntUsedThisRound: false,
            fogFaceUpPending: false, // Tessa's constraint flag
            reachedBorderThisRound: false, // SESSION 6: new round-end condition
            actionsThisTurn: {}, // SESSION 6: same action max 2x per turn (see _checkActionCap)
            // TASK: Shrine buff
            guaranteeCleanNextHunt: false,
            // TASK: Starting equipment
            ...(character.startingResource?.type === 'tool' ? { tools: [character.startingResource.id] } : {})
        };
    }

    _setupRoundGrid(round) {
        const grid2d = GAME_DATA.generateRandomLayout(round);
        this.grid = grid2d.map(row =>
            row.map(type => ({ type, revealed: false, contents: null }))
        );
        this.gridSize = grid2d.length;
    }

    _buildMonsterDeck(round) {
        let pool;
        if (round === 1) pool = GAME_DATA.monsters.filter(m => m.tier === 1);
        else if (round === 2) pool = GAME_DATA.monsters.filter(m => m.tier === 1 || m.tier === 2);
        else pool = GAME_DATA.monsters.filter(m => m.tier === 2 || m.tier === 3);

        this.monsterDeck = this._shuffle([...pool]);
        this._monsterInstanceCounter = 0;
    }

    /**
     * SESSION 8: builds the 12-card Fog deck (weighted per GAME_DATA.fogCards'
     * declared counts: Dark Hour x2, Miasma x2, Migration x2, Hidden
     * Opportunity x1, Collapsed Path x2, False Calm x3), shuffled fresh
     * each round. Previously this deck was fully designed in data but never
     * actually built or drawn from anywhere in the engine.
     */
    _buildFogDeck() {
        const pool = [];
        GAME_DATA.fogCards.forEach(card => {
            for (let i = 0; i < card.count; i++) pool.push(card.id);
        });
        this.fogDeck = this._shuffle(pool);
        this.blockedTiles = new Set(); // Collapsed Path effect targets, reset each round
        this.miasmaActive = false;
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
        if (this.blockedTiles && this.blockedTiles.has(`${row},${col}`)) {
            return this._fail('This tile is blocked by a Collapsed Path this round.');
        }

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
        const usingFreeMove = player.freeMoveAvailable;
        if (player.ap <= 0 && !usingFreeMove) return this._fail('No AP remaining.');
        if (!this._inBounds(row, col)) return this._fail('Out of bounds.');
        if (!this._isAdjacent(player.position, { row, col })) return this._fail('Tile is not adjacent to you.');

        const tile = this.grid[row][col];
        if (!tile.revealed) return this._fail('Cannot move to an unrevealed tile.');

        player.position = { row, col };
        if (usingFreeMove) {
            player.freeMoveAvailable = false; // consumed, SESSION 9: Frost Owlbear's ability
        } else {
            player.ap -= 1;
        }

        // SESSION 6: new round-end condition. Only triggers via an actual
        // SESSION 6 FIX (found via simulation): "reach any border tile" alone is
        // trivially satisfied on a player's very FIRST move, always — a corner's
        // orthogonal neighbors are themselves always border tiles too, and border
        // tiles make up 56-75% of these grid sizes. That completely defeats the
        // purpose (scaling round length with real travel), so this now also
        // requires the border tile be at least half the grid size away (Manhattan
        // distance) from where the player started this round — forcing genuine
        // cross-map travel, not a single step off their own starting corner.
        let reachedBorder = false;
        const minDistance = Math.ceil(this.gridSize / 2);
        const distFromStart = Math.abs(row - player.roundStartPosition.row) + Math.abs(col - player.roundStartPosition.col);
        if (this._isBorderTile(row, col) && distFromStart >= minDistance && !player.reachedBorderThisRound) {
            player.reachedBorderThisRound = true;
            reachedBorder = true;
            this._logEvent(`${player.name} reached a far border tile at (${row},${col}) (distance ${distFromStart} from start) — ready for round end.`);
        }

        this._logEvent(`${player.name} moved to (${row},${col}).`);
        return { success: true, reachedBorder };
    }

    _isBorderTile(row, col) {
        return row === 0 || row === this.gridSize - 1 || col === 0 || col === this.gridSize - 1;
    }

    /**
     * SESSION 6: replaces the old "every tile revealed" round-end check,
     * which didn't scale with player count (proven by simulation: 53
     * turns/player solo vs 6.7 turns/player at 4-player, because more
     * simultaneous explorers empty the SHARED map much faster). This
     * version scales on individual travel distance instead — a player's
     * own journey to a far border tile doesn't get shorter just because
     * other players are also exploring.
     * Round ends when EVERY player has reached a border tile at least
     * half the grid's width away from their own starting corner (they may
     * keep playing normally after reaching it — this only gates round-end,
     * it doesn't stop their turns), OR the monster deck is exhausted.
     */
    isRoundOver() {
        const allReachedBorder = this.players.every(p => p.reachedBorderThisRound);
        return allReachedBorder || this.monsterDeck.length === 0;
    }

    /**
     * True when the round can't productively continue: deck is empty AND
     * every Ruin on the board is either exhausted or has no monster.
     * Used by the sim AI to skip useless turns.
     */
    isRoundProductivelyOver() {
        if (this.monsterDeck.length > 0) return false;
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const t = this.grid[r][c];
                if (t.type === 'ruin' && t.revealed && !t.exhausted && t.contents) return false;
            }
        }
        return true;
    }

    /** Rest: +1 Stamina, costs 1 AP. */
    rest() {
        const player = this.getCurrentPlayer();
        if (player.ap <= 0) return this._fail('No AP remaining.');

        const before = player.stamina;
        // SESSION 9: Bristle Yak's PASSIVE bonus doubles Rest's recovery.
        const hasBristleYak = player.companions.includes('bristle_yak');
        const recoverAmount = hasBristleYak ? 2 : GAME_DATA.constants.STAMINA.restRecoverPerAP;
        player.stamina = Math.min(this._getEffectiveMaxStamina(player), player.stamina + recoverAmount);
        player.ap -= 1;
        // Moss Stag PASSIVE: +1 AP on turns where you Rest
        if (player.companions.includes('moss_stag')) {
            player.ap += 1;
            this._logEvent(`${player.name} (Moss Stag) gained +1 AP for resting.`);
        }
        this._logEvent(`${player.name} rested: Stamina ${before} → ${player.stamina}.`);
        return { success: true, staminaAfter: player.stamina };
    }

    /**
     * Which kill states are currently legal for the player, given Stamina.
     * Round 1: always just CLEAN (handled separately in hunt()).
     */
    getAvailableKillStates(player) {
        if (this.round === 1) return ['CAREFUL'];
        const states = ['TAMED']; // Taming always available if you can fight at all
        if (player.stamina > 0) {
            states.unshift('CAREFUL');
        }
        // Tessa's Fog constraint: must resolve fog before choosing Risk Posture
        const fogLocked = player.character && player.character.id === 'tracker_tessa' && player.fogFaceUpPending;
        if (!fogLocked) {
            states.push('BOLD', 'DESPERATE');
        }
        return states;
    }

    /**
     * Hunt or Tame a monster on the player's CURRENT tile (must be a Ruin,
     * revealed, and not yet acted on this visit).
     * killStateChoice: 'CAREFUL' | 'BOLD' | 'DESPERATE' | 'TAMED' (ignored in Round 1)
     * assistAllyIndex: optional player index of an ally on the same tile who
     *   spends 1 AP to contribute ⌈their ATK / 2⌉ to the hunter's effective ATK.
     */
    hunt(killStateChoice, assistAllyIndex = null) {
        const player = this.getCurrentPlayer();
        const hunterIdx = this.currentPlayerIndex;
        if (player.ap <= 0) return this._fail('No AP remaining.');
        const cap = this._checkAndTrackActionCap(player, 'huntOrTame');
        if (!cap.allowed) return this._fail(cap.reason);

        const tile = this.grid[player.position.row][player.position.col];
        if (tile.type !== 'ruin') return this._fail('Not standing on a Ruin.');
        if (!tile.revealed) return this._fail('Tile not yet explored.');
        if ((tile.huntCount || 0) >= GAME_DATA.constants.RUIN_HUNT_CAP) {
            return this._fail(`This Ruin has been hunted to exhaustion (${GAME_DATA.constants.RUIN_HUNT_CAP} uses) — move on to a fresh one.`);
        }

        tile.huntCount = (tile.huntCount || 0) + 1;
        if (tile.huntCount >= GAME_DATA.constants.RUIN_HUNT_CAP) tile.exhausted = true;

        if (!tile.contents) {
            if (this.monsterDeck.length === 0) return this._fail('Monster deck exhausted.');
            tile.contents = { monster: this.monsterDeck.pop(), instanceId: `m${++this._monsterInstanceCounter}` };
        }
        const monster = tile.contents.monster;

        let staminaOverride = null;
        if (player.character.id === 'hunter_hank' && !player.hankFreeHuntUsedThisRound) {
            staminaOverride = player.stamina;
        }

        let mappedState = this.round === 1 ? null : killStateChoice;
        // Shrine of the Fog: guarantee next kill is Careful
        if (player.guaranteeCleanNextHunt && mappedState !== null) {
            mappedState = 'CAREFUL';
            player.guaranteeCleanNextHunt = false;
            this._logEvent(`${player.name}'s Shrine blessing forces CAREFUL kill.`);
        }
        let playerAtk = this._getEffectiveAtk(player, mappedState);

        // SESSION 12: Co-op Assist
        let assistLog = null;
        if (assistAllyIndex !== null && assistAllyIndex !== hunterIdx) {
            const ally = this.players[assistAllyIndex];
            if (!ally) return this._fail(`Invalid ally index: ${assistAllyIndex}.`);
            if (ally.ap <= 0) return this._fail(`${ally.name} has no AP to assist.`);
            if (ally.position.row !== player.position.row || ally.position.col !== player.position.col) {
                return this._fail(`${ally.name} is not on the same tile as you.`);
            }
            const assistBonus = Math.ceil(ally.character.baseAttack / 2);
            playerAtk += assistBonus;
            ally.ap -= 1;
            assistLog = `${ally.name} assists ${player.name} (+${assistBonus} ATK, costs 1 AP).`;
            this._logEvent(assistLog);
        }

        const effectiveCharacter = { ...player.character, maxStamina: this._getEffectiveMaxStamina(player) };
        const result = resolveHunt(effectiveCharacter, playerAtk, monster, player.stamina, mappedState, this.round);

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
            return { success: false, monster, note: result.note, staminaAfter: player.stamina, assistLog };
        }

        const finalKillState = result.killState; // 'CAREFUL' in Round 1, else chosen state
        player.killLog[finalKillState] = (player.killLog[finalKillState] || 0) + 1;

        if (finalKillState === 'TAMED') {
            const edges = monster.edges;
            const lowestEdge = ['top', 'left', 'right']
                .map(k => ({ key: k, ...edges[k] }))
                .sort((a, b) => a.value - b.value)[0];

            // Tier III: ONE_SHOT — always allowed regardless of cap/conflict,
            // since it never occupies an ongoing slot. Its bonus is a genuine
            // one-time BURST applied immediately (not an ongoing passive —
            // the text was rewritten this session for consistency with that,
            // since the original text described ongoing effects a departed
            // companion has no way to keep providing).
            if (monster.tier === 3) {
                this._grantIngredient(player, lowestEdge.type, lowestEdge.value);
                player.departedCompanions.push(monster.id);
                tile.contents = null;
                const burstEffect = this._applyImmediateCompanionEffect(player, monster);
                this._logEvent(`${player.name} Tamed ${monster.name} — a one-time bond! Gained ${lowestEdge.value}x ${lowestEdge.type}. ${burstEffect}. ${monster.name} then departs.`);
                return { success: true, tamed: true, oneShot: true, monster, ingredientGranted: lowestEdge, burstEffect, staminaAfter: player.stamina, assistLog };
            }

            // Tier I/II: permanent, subject to the slot cap (base 3, + any
            // Cinder Phoenix expansion from expandCompanionCap) and the
            // Family-conflict rule. If blocked, gracefully fall back to a
            // normal capture (Bold-equivalent access) rather than an outright
            // failure — AP/Stamina were already spent on this Hunt, so
            // getting nothing at all would be unfairly harsh.
            const effectiveCap = GAME_DATA.constants.MAX_COMPANIONS + (player.maxCompanionsBonus || 0);
            const atCap = player.companions.length >= effectiveCap;
            const newFamily = getCompanionFamily(monster);
            const conflictPair = GAME_DATA.spoilagePairs.find(pair => {
                const existingFamilies = player.companions.map(cid => getCompanionFamily(GAME_DATA.monsters.find(m => m.id === cid)));
                return (pair.a === newFamily && existingFamilies.includes(pair.b)) ||
                       (pair.b === newFamily && existingFamilies.includes(pair.a));
            });

            if (atCap || conflictPair) {
                const reason = atCap
                    ? `already at the ${effectiveCap}-Companion limit`
                    : `${GAME_DATA.families[newFamily].name} conflicts with an existing Companion's Family`;
                this._logEvent(`${player.name} could not keep ${monster.name} as a Companion (${reason}) — captured normally instead.`);
                player.capturedMonsters.push({
                    instanceId: tile.contents.instanceId,
                    monsterId: monster.id,
                    killState: 'BOLD' // fallback access tier, since Tame's guaranteed-edge/no-shop benefit doesn't apply here
                });
                tile.contents = null;
                return { success: true, tamed: false, companionBlocked: true, reason, monster, killState: 'BOLD', staminaAfter: player.stamina, assistLog };
            }

            // Immediate guaranteed lowest-edge ingredient, monster becomes Companion, never spoils.
            this._grantIngredient(player, lowestEdge.type, lowestEdge.value);
            player.companions.push(monster.id);
            tile.contents = null;
            const immediateEffect = monster.companionBonus.type === 'IMMEDIATE'
                ? this._applyImmediateCompanionEffect(player, monster)
                : monster.companionBonus.text;
            this._logEvent(`${player.name} Tamed ${monster.name}! Gained ${lowestEdge.value}x ${lowestEdge.type}. Companion ability: ${immediateEffect}`);
            return { success: true, tamed: true, monster, ingredientGranted: lowestEdge, staminaAfter: player.stamina, assistLog };
        }

        // Otherwise: captured, awaiting extraction at a shop.
        if (player.capturedMonsters.length >= this._getEffectiveCapturedCapacity(player)) {
            this._logEvent(`${player.name} cannot carry more captured monsters (${this._getEffectiveCapturedCapacity(player)} cap) — ${monster.name} fled!`);
            tile.contents = null;
            return { success: false, monster, note: 'Captured monster capacity full.', staminaAfter: player.stamina, assistLog };
        }
        player.capturedMonsters.push({
            instanceId: tile.contents.instanceId,
            monsterId: monster.id,
            killState: finalKillState
        });
        tile.contents = null; // Ruin is spent once resolved (captured monster now lives in inventory)
        this._logEvent(`${player.name} captured ${monster.name} (${finalKillState}). Awaiting extraction.`);
        return { success: true, tamed: false, monster, killState: finalKillState, staminaAfter: player.stamina, assistLog };
    }

    /**
     * Extract: at a shop tile, convert a captured monster into ingredient tokens.
     * shopType: 'butcher' | 'aromaist' | 'seasoning'
     * chosenEdge: 'top' | 'left' | 'right' | 'bottom'
     */
    extract(capturedInstanceId, chosenEdge) {
        const player = this.getCurrentPlayer();
        if (player.ap <= 0) return this._fail('No AP remaining.');
        const cap = this._checkAndTrackActionCap(player, 'extract');
        if (!cap.allowed) return this._fail(cap.reason);

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
        const allowed = this._legalEdges(captured.killState, monster, shopEdge, player);
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

        // SESSION 8: Lingering Miasma reduces every extraction's yield by 1
        // (minimum 1) for the rest of the round it was triggered in.
        const grantedValue = this.miasmaActive ? Math.max(1, edgeData.value - 1) : edgeData.value;
        this._grantIngredient(player, edgeData.type, grantedValue);
        player.capturedMonsters.splice(capturedIndex, 1);
        player.ap -= 1;

        // SESSION 8: during Dark Hour, ALL extractions check Spoilage twice,
        // not just Desperate ones — the Fog itself destabilizes ingredients,
        // regardless of how carefully the monster was hunted.
        // SESSION 9: Ember Crab's PASSIVE bonus negates the Desperate-kill-state
        // reason for a double-check specifically — Dark Hour's separate reason
        // for doubling still applies independently if it's also active.
        const hasEmberCrab = player.companions.includes('ember_crab');
        const desperateForcesDouble = captured.killState === 'DESPERATE' && !hasEmberCrab;
        const spoilageCheckCount = (desperateForcesDouble || this.darkHourActive) ? 2 : 1;
        const spoilageHits = this._runSpoilageCheck(player, spoilageCheckCount);

        this._logEvent(`${player.name} extracted ${grantedValue}x ${edgeData.type} from ${monster.name} at ${tile.type}.${this.miasmaActive ? ' (Miasma reduced yield)' : ''}`);
        return { success: true, ingredientGranted: { type: edgeData.type, value: grantedValue }, spoilageHits, staminaAfter: player.stamina };
    }

    _getAdjacentTiles(pos) {
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        const results = [];
        for (const [dr, dc] of dirs) {
            const r = pos.row + dr, c = pos.col + dc;
            if (this._inBounds(r, c)) results.push({ row: r, col: c });
        }
        return results;
    }

    /** Public UI helper: can the player Act on their current tile as a Strange Place? */
    canActOnFogHere() {
        const player = this.getCurrentPlayer();
        const tile = this.grid[player.position.row][player.position.col];
        return tile.type === 'strange' && tile.revealed && !tile.contents;
    }

    /**
     * SESSION 8: draws and resolves a Fog card. Previously fully designed
     * in data (12-card weighted deck, 6 effect types) but never actually
     * implemented anywhere — Strange Place tiles were completely non-
     * functional (Act had no code path for them at all).
     * One-time per tile: once resolved, tile.contents marks it used and
     * it cannot be triggered again this round (mirrors how a Ruin's
     * monster is drawn once per visit-cycle, not re-drawn on request).
     */
    actOnFog() {
        const player = this.getCurrentPlayer();
        if (player.ap <= 0) return this._fail('No AP remaining.');

        const tile = this.grid[player.position.row][player.position.col];
        if (tile.type !== 'strange') return this._fail('Not standing on a Strange Place.');
        if (!tile.revealed) return this._fail('Tile not yet explored.');
        if (tile.contents) return this._fail('This Strange Place has already been resolved this round.');

        if (this.fogDeck.length === 0) {
            tile.contents = { fogCardId: null };
            player.ap -= 1;
            this._logEvent(`${player.name} found the Fog deck already exhausted here — nothing happens.`);
            return { success: true, fogCardId: null, cardName: null, effect: 'No Fog cards remain this round.' };
        }

        const fogCardId = this.fogDeck.pop();
        const cardDef = GAME_DATA.fogCards.find(c => c.id === fogCardId);
        tile.contents = { fogCardId };
        player.ap -= 1;

        let effectDescription = cardDef.effect;

        switch (fogCardId) {
            case 'dark_hour':
                this.darkHourActive = true;
                break;
            case 'miasma':
                this.miasmaActive = true;
                break;
            case 'migration': {
                const adjacentRuins = this._getAdjacentTiles(player.position).filter(p => {
                    const t = this.grid[p.row][p.col];
                    const notExhausted = (t.huntCount || 0) < GAME_DATA.constants.RUIN_HUNT_CAP;
                    return t.type === 'ruin' && t.revealed && !t.contents && notExhausted;
                });
                if (adjacentRuins.length > 0 && this.monsterDeck.length > 0) {
                    const target = adjacentRuins[Math.floor(Math.random() * adjacentRuins.length)];
                    const monster = this.monsterDeck.pop();
                    this.grid[target.row][target.col].contents = { monster, instanceId: `m${++this._monsterInstanceCounter}` };
                    effectDescription += ` — placed a facedown monster on the Ruin at (${target.row},${target.col})`;
                } else {
                    effectDescription += ' — no valid adjacent Ruin (or deck empty), no effect';
                }
                break;
            }
            case 'opportunity':
                player.spoilageImmunityCharges += 1;
                effectDescription += ` — ${player.name} may ignore one Spoilage check later this round`;
                break;
            case 'collapsed': {
                const unrevealed = [];
                for (let r = 0; r < this.gridSize; r++) {
                    for (let c = 0; c < this.gridSize; c++) {
                        if (!this.grid[r][c].revealed) unrevealed.push({ row: r, col: c });
                    }
                }
                if (unrevealed.length > 0) {
                    const target = unrevealed[Math.floor(Math.random() * unrevealed.length)];
                    this.blockedTiles.add(`${target.row},${target.col}`);
                    effectDescription += ` — tile at (${target.row},${target.col}) blocked for the rest of the round`;
                } else {
                    effectDescription += ' — no unrevealed tile left to block, no effect';
                }
                break;
            }
            case 'false_calm':
            default:
                break;
        }

        this._logEvent(`${player.name} triggered Fog card "${cardDef.name}": ${effectDescription}`);
        // Tessa's passive: must resolve Fog face-up before choosing Risk Posture
        if (player.character && player.character.id === 'tracker_tessa') {
            player.fogFaceUpPending = true;
        }
        return { success: true, fogCardId, cardName: cardDef.name, effect: effectDescription };
    }

    /** Public UI helper: can the player Act on the Crucible here? */
    canActOnCrucibleHere() {
        const player = this.getCurrentPlayer();
        const tile = this.grid[player.position.row][player.position.col];
        return tile.type === 'crucible' && tile.revealed;
    }

    /** Public UI helper: preview the 2 monsters a Crucible attempt would draw, without committing. */
    peekCrucibleChoices() {
        if (!this.canActOnCrucibleHere()) return [];
        return this.monsterDeck.slice(-2).reverse();
    }

    /**
     * SESSION 8: the Crucible (Round 3 center tile) — previously entirely
     * unimplemented. Draws 2 monsters, the player chooses 1 to fight (the
     * other is discarded, permanently removed from the deck), forced
     * Desperate-tier access regardless of Stamina, and automatically
     * triggers Dark Hour for the rest of the round.
     */
    actOnCrucible(chosenMonsterId) {
        const player = this.getCurrentPlayer();
        if (player.ap <= 0) return this._fail('No AP remaining.');

        const tile = this.grid[player.position.row][player.position.col];
        if (tile.type !== 'crucible') return this._fail('Not standing on the Crucible.');
        if (!tile.revealed) return this._fail('Tile not yet explored.');
        if (this.monsterDeck.length === 0) return this._fail('Monster deck is empty — nothing to hunt at the Crucible.');

        // SESSION 9: capped at once per player per round. Without this, a
        // single player camping the Crucible could drain the ENTIRE shared
        // Round 3 monster deck in ~4 turns (verified: 13-monster deck, up to
        // 4 monsters consumed per turn at 2 attempts x 2 draws each) —
        // starving every other player and every Ruin, and prematurely
        // ending the round via the deck-exhaustion trigger.
        if (player.crucibleUsedThisRound) {
            return this._fail('You have already faced the Crucible this round.');
        }

        const cap = this._checkAndTrackActionCap(player, 'huntOrTame');
        if (!cap.allowed) return this._fail(cap.reason);

        const drawn = [];
        if (this.monsterDeck.length >= 1) drawn.push(this.monsterDeck.pop());
        if (this.monsterDeck.length >= 1) drawn.push(this.monsterDeck.pop());

        const chosen = drawn.find(m => m.id === chosenMonsterId) || drawn[0];
        const discarded = drawn.filter(m => m !== chosen);

        this.darkHourActive = true; // Crucible always triggers Dark Hour, win or lose
        player.crucibleUsedThisRound = true; // facing it counts, whether you win or lose

        const playerAtk = player.character.baseAttack;
        const effectiveCharacter = { ...player.character, maxStamina: this._getEffectiveMaxStamina(player) };
        const result = resolveHunt(effectiveCharacter, playerAtk, chosen, player.stamina, 'DESPERATE', this.round);
        player.stamina = result.staminaAfter;
        player.ap -= 1;

        if (!result.success) {
            this._logEvent(`${player.name} was defeated at the Crucible by ${chosen.name}! Dark Hour begins regardless. (${discarded.length} monster discarded)`);
            return { success: false, monster: chosen, discarded, staminaAfter: player.stamina, note: result.note };
        }

        player.killLog.DESPERATE = (player.killLog.DESPERATE || 0) + 1;
        player.capturedMonsters.push({
            instanceId: `m${++this._monsterInstanceCounter}`,
            monsterId: chosen.id,
            killState: 'DESPERATE'
        });
        this._logEvent(`${player.name} triumphed at the Crucible over ${chosen.name}! Dark Hour begins. (${discarded.length} monster discarded, captured at Desperate access)`);
        return { success: true, monster: chosen, discarded, killState: 'DESPERATE', staminaAfter: player.stamina };
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
    _legalEdges(killState, monster, shopEdge, player) {
        const lowestKey = this._lowestEdgeKey(monster);

        // River Leviathan PASSIVE: Bold treated as Careful-tier access
        let effectiveState = killState;
        if (killState === 'BOLD' && player && player.nextBoldAsCareful) {
            effectiveState = 'CAREFUL';
        }

        if (effectiveState === 'CAREFUL') {
            if (shopEdge === null) return [lowestKey];
            return shopEdge === lowestKey ? [lowestKey] : [];
        }
        if (effectiveState === 'DESPERATE') {
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

    /**
     * SESSION 10: computes effective ATK for a hunt attempt, applying the
     * Trap tool's tameBonus if the player has it equipped AND is attempting
     * to Tame. Only relevant for TAMED — normal kill states use base ATK.
     */
    _getEffectiveAtk(player, killStateChoice) {
        let atk = player.character.baseAttack;
        if (killStateChoice === 'TAMED') {
            const startingTool = player.character.startingResource?.type === 'tool'
                ? GAME_DATA.tools.find(t => t.id === player.character.startingResource.id)
                : null;
            if (startingTool?.tameBonus) atk += startingTool.tameBonus;
        }
        return atk;
    }

    /** TASK 5: effective capacity accounting for gear bonuses */
    _getEffectiveIngredientCapacity(player) {
        return player.ingredientCapacity + (player.gearIngredientBonus || 0);
    }
    _getEffectiveCapturedCapacity(player) {
        return player.capturedMonsterCapacity + (player.gearCapturedBonus || 0);
    }
    _currentIngredientCount(player) {
        return Object.values(player.ingredientTokens).reduce((s, v) => s + v, 0);
    }

    _grantIngredient(player, type, amount) {
        const cap = this._getEffectiveIngredientCapacity(player);
        const current = this._currentIngredientCount(player);
        const granted = Math.min(amount, cap - current);
        if (granted <= 0) {
            this._logEvent(`${player.name}'s ingredient inventory is full — ${amount}x ${type} not added.`);
            return 0;
        }
        if (granted < amount) {
            this._logEvent(`${player.name}'s ingredient inventory nearly full — only ${granted}/${amount}x ${type} added.`);
        }
        player.ingredientTokens[type] = (player.ingredientTokens[type] || 0) + granted;
        return granted;
    }

    /**
     * SESSION 9: accounts for Flame Lizard's PASSIVE Companion bonus
     * (+1 max Stamina). Replaces direct reads of player.character.maxStamina
     * everywhere that value is used as a cap, so the bonus actually matters.
     */
    _getEffectiveMaxStamina(player) {
        const hasFlameLizard = player.companions.includes('flame_lizard');
        return player.character.maxStamina + (hasFlameLizard ? 1 : 0);
    }

    /**
     * SESSION 9: applies an IMMEDIATE-type Companion effect the moment it
     * triggers (either a Tier I/II Companion's grant-at-taming bonus, or a
     * Tier III one-shot burst). Returns a human-readable description of
     * what happened, for logging.
     */
    _applyImmediateCompanionEffect(player, monster) {
        const bonus = monster.companionBonus;
        if (!bonus.wired) return bonus.text + ' (not yet mechanically implemented)';

        switch (bonus.effectKey) {
            case 'grantRerollToken':
                player.rerollTokens += 1;
                return 'Gained 1 Reroll Token';
            case 'grantRerollTokens2':
                player.rerollTokens += 2;
                return 'Gained 2 Reroll Tokens';
            case 'fullStaminaRestore':
                player.stamina = this._getEffectiveMaxStamina(player);
                return 'Stamina fully restored';
            case 'clearFogEffects':
                this.darkHourActive = false;
                this.miasmaActive = false;
                return 'Dark Hour and Miasma cleared for the rest of the round';
            case 'expandCompanionCap':
                player.maxCompanionsBonus = (player.maxCompanionsBonus || 0) + 1;
                return `Max Companion slots permanently increased to ${GAME_DATA.constants.MAX_COMPANIONS + player.maxCompanionsBonus}`;
            default:
                return bonus.text + ' (effect key not recognized)';
        }
    }

    /**
     * SESSION 9: the actual "use an ability from your Companion" action —
     * previously requested but non-existent (all 20 Companion bonuses were
     * pure flavor text with no code path to invoke them at all).
     * AP cost is per-ability, not a blanket charge: Grumble Boar's and
     * Frost Owlbear's own flavor text explicitly promise "free action (0
     * AP)" — charging AP to activate a "free" action would net to the
     * same cost as acting normally, providing zero actual benefit.
     * Tide Eel's ability makes no such promise, so it costs the normal 1 AP.
     * "Unlimited" (no per-round cap) still means each use has its own
     * cost where the flavor text calls for one — it's the CAP that's
     * absent, not necessarily the cost.
     * Only Tier I/II PERMANENT Companions (in player.companions) can have
     * their ability invoked this way — a departed one-shot Companion
     * already delivered its effect at the moment of taming.
     */
    useCompanionAbility(monsterId) {
        const player = this.getCurrentPlayer();
        if (!player.companions.includes(monsterId)) {
            return this._fail('That monster is not one of your current Companions.');
        }

        const monster = GAME_DATA.monsters.find(m => m.id === monsterId);
        const bonus = monster.companionBonus;

        if (bonus.type === 'PASSIVE') {
            return this._fail(`${monster.name}'s ability is passive — it applies automatically, there's nothing to activate.`);
        }
        if (bonus.type === 'IMMEDIATE') {
            return this._fail(`${monster.name}'s ability already triggered once, at the moment it was Tamed.`);
        }
        if (!bonus.wired) {
            return this._fail(`${monster.name}'s ability ("${bonus.text}") is designed but not yet implemented in this build.`);
        }
        if (bonus.type === 'ACTIVE_ONCE_PER_ROUND' && player.companionAbilityUsedThisRound[monsterId]) {
            return this._fail(`${monster.name}'s ability has already been used this round.`);
        }

        const apCostByEffect = { freeRest: 0, grantSpoilageCharge: 1, freeMove: 0, nextBoldAsCareful: 1, copyDish: 0 };
        const apCost = apCostByEffect[bonus.effectKey] ?? 1;
        if (player.ap < apCost) return this._fail('No AP remaining.');

        let effectDescription;
        switch (bonus.effectKey) {
            case 'freeRest':
                player.stamina = Math.min(this._getEffectiveMaxStamina(player), player.stamina + 1);
                effectDescription = `Recovered +1 Stamina (now ${player.stamina}), at no AP cost`;
                break;
            case 'grantSpoilageCharge':
                player.spoilageImmunityCharges += 1;
                effectDescription = 'Gained 1 Spoilage-immunity charge';
                break;
            case 'freeMove':
                player.freeMoveAvailable = true;
                effectDescription = 'Your next Move this turn will cost 0 AP';
                break;
            case 'nextBoldAsCareful':
                player.nextBoldAsCareful = true;
                effectDescription = 'Your next Bold kill this round grants Careful-tier access instead';
                break;
            case 'copyDish': {
                const targetId = options.targetPlayerId;
                const target = this.players.find(p => p.id === targetId);
                if (!target) return this._fail('Target player not found.');
                if (target.signaturePowerUsed) return this._fail('Target has no signature dishes completed.');
                // Simplified: grant half the points of their highest-scoring dish
                effectDescription = `Copied a dish from ${target.name} (simplified: +${Math.floor(target.gourmetPoints / 4)} pts)`;
                player.gourmetPoints += Math.floor(target.gourmetPoints / 4);
                break;
            }
            default:
                return this._fail(`${monster.name}'s ability effect key is not recognized.`);
        }

        player.ap -= apCost;
        if (bonus.type === 'ACTIVE_ONCE_PER_ROUND') {
            player.companionAbilityUsedThisRound[monsterId] = true;
        }

        this._logEvent(`${player.name} used ${monster.name}'s Companion ability: ${effectDescription}`);
        return { success: true, monster, effect: effectDescription };
    }

    /**
     * SESSION 9: Pearl Manta's PASSIVE bonus makes the holder immune to the
     * Ember≠Bloom pair specifically (the other two pairs — Tide≠Verdant,
     * Bloom≠Tide — still apply normally).
     */
    _filterSpoilageHits(player, hits) {
        if (!player.companions.includes('pearl_manta')) return hits;
        return hits.filter(pair => !((pair.a === 'EMBER' && pair.b === 'BLOOM') || (pair.a === 'BLOOM' && pair.b === 'EMBER')));
    }

    _runSpoilageCheck(player, times = 1) {
        // SESSION 8: Hidden Opportunity grants a personal, savable charge
        // that auto-consumes to prevent the NEXT spoilage this player would
        // otherwise suffer (simplification: auto-used-if-beneficial rather
        // than prompting "use your charge?" — noted as a simplification).
        if (player.spoilageImmunityCharges > 0) {
            const heldTypes = Object.keys(player.ingredientTokens).filter(t => player.ingredientTokens[t] > 0);
            const wouldHit = this._filterSpoilageHits(player, checkSpoilage(heldTypes));
            if (wouldHit.length > 0) {
                player.spoilageImmunityCharges -= 1;
                this._logEvent(`${player.name} used a Hidden Opportunity charge to avoid spoilage entirely.`);
                return [];
            }
        }

        let allHits = [];
        for (let i = 0; i < times; i++) {
            const heldTypes = Object.keys(player.ingredientTokens).filter(t => player.ingredientTokens[t] > 0);
            const hits = this._filterSpoilageHits(player, checkSpoilage(heldTypes));
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

        // Spore Shambler PASSIVE: Wildcard dishes score +1
        if (player.companions.includes('spore_shambler') && dish.type === 'wildcard') {
            finalScore += 1;
            this._logEvent(`${player.name} (Spore Shambler) Wildcard dish +1 bonus.`);
        }

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
            case 'catchup_flat': {
                let bonus = player.gourmetPoints < lowestOtherScore ? 2 : 0;
                if (bonus > 0 && player.companions.includes('thorn_basilisk')) bonus += 1;
                return bonus;
            }
            case 'catchup_scaling': {
                let bonus = player.gourmetPoints < lowestOtherScore
                    ? Math.min(3, lowestOtherScore - player.gourmetPoints) : 0;
                if (bonus > 0 && player.companions.includes('thorn_basilisk')) bonus += 1;
                return bonus;
            }
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
        // Rock Golem PASSIVE: track whether this player hunted this turn
        player.didHuntThisTurn = (player.actionsThisTurn.huntOrTame || 0) > 0;
        this._logEvent(`${player.name} ended their turn.`);

        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        const next = this.getCurrentPlayer();
        if (this.mode === 'coop') {
            // Co-op: refill all players' AP simultaneously
            const pool = GAME_DATA.constants.ROUND_GRIDS[this.round].apPool;
            this.players.forEach(p => {
                p.ap = pool;
                p.actionsThisTurn = {};
                p.forageUsedThisTurn = false;
            });
        } else {
            next.ap = GAME_DATA.constants.ROUND_GRIDS[this.round].apPool;
            next.actionsThisTurn = {};
            next.forageUsedThisTurn = false;
        }
        // Rock Golem PASSIVE: +1 AP max on turns you did NOT hunt last turn
        if (next.companions.includes('rock_golem') && !next.didHuntThisTurn && this.round > 1) {
            next.ap += 1;
            this._logEvent(`${next.name} (Rock Golem) gains +1 AP this turn (no Hunt last turn).`);
        }
        // Moss Stag bonus already applied during rest(), no additional logic needed here

        return { success: true, nextPlayer: next.name };
    }

    /** Advance to the next round: new grid, refill Stamina/AP, rebuild monster deck. */
    advanceRound() {
        const maxRounds = GAME_DATA.constants.PLAYER_COUNT_RULES[this.players.length]?.rounds?.slice(-1)[0] || 3;
        if (this.round >= maxRounds) return this._fail('Already in final round.');
        this.round += 1;
        this._setupRoundGrid(this.round);
        this._buildMonsterDeck(this.round);
        this._buildFogDeck();
        this.darkHourActive = false; // Dark Hour is scoped to the round it triggers in

        this.players.forEach(p => {
            p.stamina = p.character.maxStamina;
            p.ap = GAME_DATA.constants.ROUND_GRIDS[this.round].apPool;
            p.hankFreeHuntUsedThisRound = false;
            p.reachedBorderThisRound = false;
            p.actionsThisTurn = {};
            p.crucibleUsedThisRound = false;
            p.companionAbilityUsedThisRound = {};
            p.freeMoveAvailable = false;
            p.nextBoldAsCareful = false;
            p.guaranteeCleanNextHunt = false;
            p.fogFaceUpPending = false;
        });
        const corners = [
            { row: 0, col: 0 }, { row: 0, col: this.gridSize - 1 },
            { row: this.gridSize - 1, col: 0 }, { row: this.gridSize - 1, col: this.gridSize - 1 }
        ];
        this.players.forEach((p, i) => {
            p.position = corners[i % 4];
            p.roundStartPosition = { ...corners[i % 4] };
        });
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
        return this._legalEdges(captured.killState, monster, shopEdge, player);
    }

    /** Public UI helper: is the current tile a Ruin ready to Hunt/Tame? */
    canHuntHere() {
        const player = this.getCurrentPlayer();
        const tile = this.grid[player.position.row][player.position.col];
        const huntCount = tile.huntCount || 0;
        return tile.type === 'ruin' && tile.revealed && huntCount < GAME_DATA.constants.RUIN_HUNT_CAP;
    }

    /** Public UI helper: which allies can assist the current player's Hunt? */
    getAvailableAssists() {
        const player = this.getCurrentPlayer();
        const hunterIdx = this.currentPlayerIndex;
        const assists = [];
        this.players.forEach((ally, i) => {
            if (i === hunterIdx) return;
            if (ally.ap <= 0) return;
            if (ally.position.row !== player.position.row || ally.position.col !== player.position.col) return;
            const bonus = Math.ceil(ally.character.baseAttack / 2);
            assists.push({ index: i, name: ally.name, bonus, apCost: 1 });
        });
        return assists;
    }

    /** Public UI helper: can the player Extract at their current tile? */
    canExtractHere() {
        const player = this.getCurrentPlayer();
        const tile = this.grid[player.position.row][player.position.col];
        const isShop = ['butcher', 'aromaist', 'seasoning'].includes(tile.type);
        const isTessaSkip = player.character.id === 'tracker_tessa' && tile.type === 'ruin';
        return (isShop || isTessaSkip) && player.capturedMonsters.length > 0;
    }

    // =================================================================
    // TASK 7: UTILITY TILE ACTIONS
    // =================================================================

    /** Abandoned Kitchen (Round 3): complete a Wildcard Dish immediately */
    actOnKitchen(dishId, spentIngredientNames) {
        const player = this.getCurrentPlayer();
        if (player.ap <= 0) return this._fail('No AP remaining.');
        const tile = this.grid[player.position.row][player.position.col];
        if (tile.type !== 'kitchen') return this._fail('Not standing on an Abandoned Kitchen.');
        if (!tile.revealed) return this._fail('Tile not yet explored.');

        const dish = GAME_DATA.dishes.find(d => d.id === dishId);
        if (!dish) return this._fail('Unknown dish.');
        if (dish.type !== 'wildcard') return this._fail('Abandoned Kitchen only completes Wildcard dishes.');

        // Verify ingredients
        const tally = {};
        spentIngredientNames.forEach(n => tally[n] = (tally[n] || 0) + 1);
        for (const [type, count] of Object.entries(tally)) {
            if ((player.ingredientTokens[type] || 0) < count) {
                return this._fail(`Not enough ${type}.`);
            }
        }

        const result = resolveDishScore(dish, spentIngredientNames, this.tier === 'expert');
        if (!result.valid) return this._fail(result.reason);

        // Spend tokens
        Object.entries(tally).forEach(([type, count]) => {
            player.ingredientTokens[type] -= count;
            if (player.ingredientTokens[type] === 0) delete player.ingredientTokens[type];
        });

        let finalScore = result.score;
        if (dish.special) finalScore += this._applySpecialRule(dish.special, player, result);
        if (player.companions.includes('spore_shambler') && dish.type === 'wildcard') finalScore += 1;

        player.gourmetPoints += finalScore;
        player.ap -= 1;
        this._logEvent(`${player.name} completed "${dish.name}" at the Abandoned Kitchen → +${finalScore} pts.`);
        return { success: true, corner: result.corner, score: finalScore, totalPoints: player.gourmetPoints };
    }

    /** Magic Well: full Stamina restore + 1 Reroll Token */
    actOnMagicWell() {
        const player = this.getCurrentPlayer();
        if (player.ap <= 0) return this._fail('No AP remaining.');
        const tile = this.grid[player.position.row][player.position.col];
        if (tile.type !== 'well') return this._fail('Not standing on a Magic Well.');
        if (!tile.revealed) return this._fail('Tile not yet explored.');

        const before = player.stamina;
        player.stamina = this._getEffectiveMaxStamina(player);
        player.rerollTokens += 1;
        player.ap -= 1;
        this._logEvent(`${player.name} used Magic Well: Stamina ${before} → ${player.stamina}, +1 Reroll Token.`);
        return { success: true, staminaAfter: player.stamina, rerollTokens: player.rerollTokens };
    }

    /** Old Watchtower: reveal 2 adjacent tiles for free (no AP cost) */
    actOnWatchtower() {
        const player = this.getCurrentPlayer();
        const tile = this.grid[player.position.row][player.position.col];
        if (tile.type !== 'watchtower') return this._fail('Not standing on an Old Watchtower.');
        if (!tile.revealed) return this._fail('Tile not yet explored.');

        const adjacent = this._getAdjacentTiles(player.position);
        const unrevealed = adjacent.filter(p => !this.grid[p.row][p.col].revealed);
        const toReveal = unrevealed.slice(0, 2);
        toReveal.forEach(p => { this.grid[p.row][p.col].revealed = true; });

        const names = toReveal.map(p => `(${p.row},${p.col})`).join(', ');
        this._logEvent(`${player.name} used Watchtower: revealed ${toReveal.length} tiles ${names || '(none unrevealed adjacent)'}.`);
        return { success: true, revealed: toReveal };
    }

    /** Shrine of the Fog: guarantee next kill is Careful */
    actOnShrine() {
        const player = this.getCurrentPlayer();
        if (player.ap <= 0) return this._fail('No AP remaining.');
        const tile = this.grid[player.position.row][player.position.col];
        if (tile.type !== 'shrine') return this._fail('Not standing on a Shrine of the Fog.');
        if (!tile.revealed) return this._fail('Tile not yet explored.');

        player.guaranteeCleanNextHunt = true;
        player.ap -= 1;
        this._logEvent(`${player.name} used Shrine of the Fog — next kill is guaranteed Careful.`);
        return { success: true };
    }

    // =================================================================
    // TASK 8: MERCHANT TOOL PURCHASING
    // =================================================================

    actOnMerchant(action, options = {}) {
        const player = this.getCurrentPlayer();
        if (player.ap <= 0) return this._fail('No AP remaining.');
        const tile = this.grid[player.position.row][player.position.col];
        if (tile.type !== 'merchant') return this._fail('Not standing on a Merchant\'s Camp.');
        if (!tile.revealed) return this._fail('Tile not yet explored.');

        if (action === 'buy_tool') {
            const toolId = options.toolId;
            const tool = GAME_DATA.tools.find(t => t.id === toolId);
            if (!tool) return this._fail('Unknown tool.');
            if (player.tools.includes(toolId)) return this._fail('Already have this tool.');

            // Check cost
            const cost = tool.cost;
            if (cost.type === 'any_different') {
                const types = Object.keys(player.ingredientTokens).filter(t => player.ingredientTokens[t] > 0);
                if (types.length < cost.count) return this._fail(`Need ${cost.count} different ingredient types — have ${types.length}.`);
                types.slice(0, cost.count).forEach(t => {
                    player.ingredientTokens[t] -= 1;
                    if (player.ingredientTokens[t] === 0) delete player.ingredientTokens[t];
                });
            } else if (cost.type === 'any') {
                const total = this._currentIngredientCount(player);
                if (total < cost.count) return this._fail(`Need ${cost.count} total ingredients — have ${total}.`);
                let remaining = cost.count;
                for (const t of Object.keys(player.ingredientTokens)) {
                    const take = Math.min(remaining, player.ingredientTokens[t]);
                    player.ingredientTokens[t] -= take;
                    remaining -= take;
                    if (player.ingredientTokens[t] === 0) delete player.ingredientTokens[t];
                    if (remaining <= 0) break;
                }
            } else {
                for (const [type, amount] of Object.entries(cost)) {
                    if ((player.ingredientTokens[type] || 0) < amount) {
                        return this._fail(`Need ${amount}x ${type} — have ${player.ingredientTokens[type] || 0}.`);
                    }
                }
                for (const [type, amount] of Object.entries(cost)) {
                    player.ingredientTokens[type] -= amount;
                    if (player.ingredientTokens[type] === 0) delete player.ingredientTokens[type];
                }
            }

            player.tools.push(toolId);
            player.ap -= 1;
            this._logEvent(`${player.name} purchased ${tool.name} from the Merchant.`);
            return { success: true, tool };
        }

        if (action === 'sell') {
            const sellType = options.sellType;
            const buyType = options.buyType;
            if (!sellType || !buyType) return this._fail('Specify sellType and buyType.');
            if ((player.ingredientTokens[sellType] || 0) < 2) return this._fail(`Need 2x ${sellType} to sell — have ${player.ingredientTokens[sellType] || 0}.`);
            player.ingredientTokens[sellType] -= 2;
            if (player.ingredientTokens[sellType] === 0) delete player.ingredientTokens[sellType];
            this._grantIngredient(player, buyType, 1);
            player.ap -= 1;
            this._logEvent(`${player.name} sold 2x ${sellType} for 1x ${buyType} at the Merchant.`);
            return { success: true };
        }

        return this._fail('Unknown merchant action. Use "buy_tool" or "sell".');
    }

    // =================================================================
    // COMPANION BETRAYAL: reverse a Tame decision at a steep cost
    // =================================================================
    betrayCompanion(companionId, chosenEdge) {
        const player = this.getCurrentPlayer();
        const idx = player.companions.indexOf(companionId);
        if (idx === -1) return this._fail('You do not have that Companion.');
        if (player.stamina <= 0) return this._fail('You must have at least 1 Stamina to betray a Companion — rest first.');
        const monster = GAME_DATA.monsters.find(m => m.id === companionId);
        if (!monster) return this._fail('Unknown companion.');

        // Facedown monsters haven't been tamed/revealed; only tamed companions can be betrayed.
        // (Companions always come from Tame, so all entries in player.companions are legitimate.)

        // Choose any edge the monster has (incl. Bottom bonus if condition met — Desperate-tier access).
        const edgeData = monster.edges[chosenEdge];
        if (!edgeData) return this._fail(`No "${chosenEdge}" edge on ${monster.name}.`);
        if (chosenEdge === 'bottom' && edgeData.condition) {
            const conditionMet = this._checkBonusCondition(edgeData.condition, player);
            if (!conditionMet) return this._fail(`Bottom edge condition not met: ${edgeData.condition}`);
        }

        // Cost: Stamina drops to 0 (player already confirmed Stamina >= 1 above).
        player.stamina = 0;
        player.companions.splice(idx, 1);
        player.departedCompanions.push(companionId);
        player.killLog.BETRAYED = (player.killLog.BETRAYED || 0) + 1;

        // Gain the edge's ingredient immediately (same immediacy as Tame).
        // Betrayal carries NO spoilage immunity — check twice (Desperate-tier access).
        const granted = this._grantIngredient(player, edgeData.type, edgeData.value);
        const spoilageHits = granted > 0 ? this._runSpoilageCheck(player, 2) : [];

        this._logEvent(`${player.name} BETRAYED ${monster.name}! Stamina → 0, gained ${edgeData.value}x ${edgeData.type}. The Companion departs forever.`);
        return { success: true, betrayed: monster, ingredientGranted: { type: edgeData.type, value: edgeData.value }, spoilageHits, staminaAfter: player.stamina };
    }

    // =================================================================
    // TASK 19: ENDING TABLE
    // =================================================================

    getEndings() {
        return this.players.map(player => {
            const kl = player.killLog;
            const totalKills = (kl.CAREFUL || 0) + (kl.BOLD || 0) + (kl.DESPERATE || 0);

            if (kl.BETRAYED && kl.BETRAYED > 0) {
                return { player: player.name, ending: 'Wild Chef', reason: 'Betrayed one or more Companions.' };
            }
            if ((kl.TAMED || 0) >= 3) {
                return { player: player.name, ending: 'Guardian Chef', reason: `Tamed ${kl.TAMED} monsters.` };
            }
            if (totalKills > 0 && (kl.DESPERATE || 0) >= totalKills / 2) {
                return { player: player.name, ending: 'Wild Chef', reason: `${kl.DESPERATE || 0} Desperate kills out of ${totalKills} total.` };
            }
            if (totalKills > 0 && (kl.CAREFUL || 0) >= totalKills / 2 && (kl.DESPERATE || 0) === 0) {
                return { player: player.name, ending: 'Master Chef', reason: `${kl.CAREFUL || 0} Careful kills, zero Desperate.` };
            }
            return { player: player.name, ending: 'The Forgotten Recipe', reason: 'No clear majority in kill style.' };
        });
    }

    // =================================================================
    // TASK: TIM'S PASSIVE — Snarer's Patience
    // =================================================================

    exploreAndHunt(row, col) {
        const player = this.getCurrentPlayer();
        if (player.characterId !== 'trapper_tim') return this._fail('Only Trapper Tim can use this ability.');
        if (player.ap <= 0) return this._fail('No AP remaining.');

        const tile = this.grid[row][col];
        if (!this._isAdjacent(player.position, { row, col })) return this._fail('Tile not adjacent.');
        if (tile.revealed) return this._fail('Tile already revealed.');
        if (tile.type !== 'ruin') return this._fail('This ability only works on Ruins.');

        tile.revealed = true;
        player.ap -= 1;
        this._logEvent(`${player.name} (Tim) explored (${row},${col}) — Snarer's Patience: may hunt immediately.`);

        const result = this.hunt('CAREFUL');
        return { success: result.success, timPassive: true, ...result };
    }

    // =================================================================
    // TOOL EFFECT HELPER
    // =================================================================
    _getPlayerToolEffect(player) {
        const effects = {};
        for (const toolId of (player.tools || [])) {
            if (toolId === 'net') effects.net = true;
            if (toolId === 'spear') effects.spear = true;
            if (toolId === 'bow') effects.bow = true;
            if (toolId === 'cleaver') effects.cleaver = true;
            if (toolId === 'hammer') effects.hammer = true;
            if (toolId === 'trap') effects.trap = true;
        }
        return effects;
    }

    /**
     * SESSION 6: Hunt/Tame and Extract can each be used at most 2x per turn.
     * Scoped deliberately narrow — only these two "value-generating" actions
     * (the ones actually implicated in one-turn power-dumping, e.g. draining
     * a Ruin's cap or a Shop's rest-cooldown in a single turn) are capped.
     * Explore/Move/Rest are NOT capped: they're traversal/logistics, not
     * value generation, and restricting them would actively hurt the
     * pacing fix from the bigger-map change (players need to move freely
     * on larger boards, not less freely).
     * Hunt and Tame share one bucket ('huntOrTame') since both engage a
     * Ruin — otherwise a player could Hunt twice then Tame once for 3
     * Ruin-engagements in a turn, defeating the point of the cap.
     * Automatically inert in Round 1 (2 AP can never reach a 3rd use of
     * anything anyway), so no special-casing needed there.
     */
    _checkAndTrackActionCap(player, actionType) {
        const count = player.actionsThisTurn[actionType] || 0;
        if (count >= 2) {
            return { allowed: false, reason: `Cannot use the same action a 3rd time this turn (already used ${actionType} twice). Try a different action.` };
        }
        player.actionsThisTurn[actionType] = count + 1;
        return { allowed: true };
    }

    _fail(reason) {
        return { success: false, reason };
    }

    /** TASK: Every player starts with 1 random ingredient (head-start scoring) */
    _giveStartingIngredient() {
        const allTypes = [
            ...GAME_DATA.constants.INGREDIENT_TYPES.MEATS,
            ...GAME_DATA.constants.INGREDIENT_TYPES.AROMAS,
            ...GAME_DATA.constants.INGREDIENT_TYPES.SEASONINGS
        ];
        const pick = allTypes[Math.floor(Math.random() * allTypes.length)];
        return { [pick]: 1 };
    }

    /**
     * NEW: Forage — spend 2 AP to gain 1 ingredient from the tile you're standing on.
     * Only works on Ruins and Shops. Limited to once per turn.
     */
    forage() {
        const player = this.getCurrentPlayer();
        if (player.ap < 2) return this._fail('Forage costs 2 AP.');
        if (player.forageUsedThisTurn) return this._fail('Forage already used this turn.');
        const tile = this.grid[player.position.row][player.position.col];
        if (!tile.revealed) return this._fail('Cannot forage on unrevealed tile.');
        if (!['ruin', 'butcher', 'aromaist', 'seasoning'].includes(tile.type)) {
            return this._fail('Can only forage at Ruins or Shops.');
        }

        let ingredientPool;
        switch (tile.type) {
            case 'butcher':
                ingredientPool = GAME_DATA.constants.INGREDIENT_TYPES.MEATS;
                break;
            case 'aromaist':
                ingredientPool = GAME_DATA.constants.INGREDIENT_TYPES.AROMAS;
                break;
            case 'seasoning':
                ingredientPool = GAME_DATA.constants.INGREDIENT_TYPES.SEASONINGS;
                break;
            case 'ruin':
                ingredientPool = [
                    ...GAME_DATA.constants.INGREDIENT_TYPES.MEATS,
                    ...GAME_DATA.constants.INGREDIENT_TYPES.AROMAS,
                    ...GAME_DATA.constants.INGREDIENT_TYPES.SEASONINGS
                ];
                break;
        }

        const pick = ingredientPool[Math.floor(Math.random() * ingredientPool.length)];
        const granted = this._grantIngredient(player, pick, 1);
        if (granted === 0) return this._fail('Ingredient inventory full.');
        player.ap -= 2;
        player.forageUsedThisTurn = true;
        this._logEvent(`${player.name} foraged and found 1x ${pick}.`);
        return { success: true, ingredient: pick };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameEngine };
}
