// Monster Meatball v1 Rule Integrity Fixes
// Load AFTER game-engine.js in the browser, or require after GameEngine in Node.
// This module patches the current engine without replacing the core engine file.
// The fixes are intentionally small and auditable.

(function installV1RuleFixes(root) {
    const Engine = root.GameEngine || (typeof GameEngine !== 'undefined' ? GameEngine : null);
    if (!Engine) throw new Error('GameEngine must be loaded before v1-rule-fixes.js');

    const originalExplore = Engine.prototype.explore;
    const originalMove = Engine.prototype.move;
    const originalIsRoundOver = Engine.prototype.isRoundOver;
    const originalAdvanceRound = Engine.prototype.advanceRound;
    const originalEndTurn = Engine.prototype.endTurn;

    function key(pos) { return `${pos.row},${pos.col}`; }

    // RULE FIX 1: Every player may travel onto a map tile only once per round.
    // Starting tile counts as visited. This is a trail game, not a free-roaming map.
    Engine.prototype._ensureVisitedState = function(player) {
        if (!player.visitedTiles) player.visitedTiles = new Set([key(player.position)]);
        else if (!(player.visitedTiles instanceof Set)) player.visitedTiles = new Set(player.visitedTiles);
    };

    Engine.prototype.explore = function(row, col) {
        const player = this.getCurrentPlayer();
        this._ensureVisitedState(player);
        return originalExplore.call(this, row, col);
    };

    Engine.prototype.move = function(row, col) {
        const player = this.getCurrentPlayer();
        this._ensureVisitedState(player);
        const destination = { row, col };
        if (player.visitedTiles.has(key(destination))) {
            return this._fail('You may not travel on a tile you have already visited this round.');
        }
        const result = originalMove.call(this, row, col);
        if (result && result.success) player.visitedTiles.add(key(destination));
        return result;
    };

    // RULE FIX 2: Round 1 is the teaching round. Fog effects do not trigger.
    // The core engine may still expose fog-resolution methods; this wrapper
    // makes any Round-1 fog attempt a harmless no-op.
    if (typeof Engine.prototype.actOnFog === 'function') {
        const originalActOnFog = Engine.prototype.actOnFog;
        Engine.prototype.actOnFog = function(...args) {
            if (this.round === 1) {
                this._logEvent('Round 1: Fog is inactive — Strange Place has no Fog effect.');
                return { success: true, inactive: true, reason: 'Fog is inactive in Round 1.' };
            }
            return originalActOnFog.apply(this, args);
        };
    }

    // RULE FIX 3: Monster deck exhaustion is not a round-end condition.
    // A round ends by the intended travel condition. Empty Ruin decks simply
    // mean no further monster can be drawn.
    Engine.prototype.isRoundOver = function() {
        const allReachedBorder = this.players.every(p => p.reachedBorderThisRound);
        return allReachedBorder;
    };

    // RULE FIX 4: Every player gets the full 4x4 -> 5x5 -> 6x6 campaign.
    // Reset each player's per-round trail and round-start position when the
    // next map is generated. Existing resources, companions and score persist.
    Engine.prototype.advanceRound = function(...args) {
        const result = originalAdvanceRound.apply(this, args);
        if (result && result.success) {
            this.players.forEach(p => {
                p.visitedTiles = new Set([key(p.position)]);
                p.roundStartPosition = { ...p.position };
                p.reachedBorderThisRound = false;
            });
        }
        return result;
    };

    // RULE FIX 5: Make player-count campaign length explicit for callers that
    // inspect GAME_DATA.constants.PLAYER_COUNTS. This does not alter scoring.
    if (root.GAME_DATA?.constants?.PLAYER_COUNTS) {
        ['1', '2'].forEach(n => {
            if (root.GAME_DATA.constants.PLAYER_COUNTS[n]) {
                root.GAME_DATA.constants.PLAYER_COUNTS[n].rounds = [1, 2, 3];
            }
        });
    }

    // Expose a marker so the UI/test runner can verify that the patch loaded.
    Engine.v1RuleFixesInstalled = true;
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { installed: true };
}
