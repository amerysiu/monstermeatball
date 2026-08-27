// Monster Meatball - main.js
// Session 3: Data-driven UI renderer.
// Scope note: this renders real GAME_DATA (characters, fixed map layouts,
// corner-scored dishes) and provides reusable primitives (Stamina pips,
// AP pips, dish corner rendering) that the future turn engine will call.
// It does NOT yet implement full turn logic / AP spending / combat resolution
// — that remains the Phase 4 game-engine.js work noted in PROJECT_STATUS.md.

const FAMILY_ICON = { EMBER: '🔥', TIDE: '🌊', VERDANT: '🌿', BLOOM: '🌸' };
const LOCATION_CATEGORY_CLASS = {
    monster: 'tile-monster',
    shop: 'tile-shop',
    fog: 'tile-fog',
    utility: 'tile-utility',
    special: 'tile-special'
};

// ---------------------------------------------------------------------
// Preview Nav (Play / Characters / Map / Dishes tabs)
// ---------------------------------------------------------------------
function initPreviewNav() {
    const tabs = document.querySelectorAll('.preview-tab');
    const screenMap = {
        setup: 'setup-screen',
        characters: 'screen-characters',
        map: 'screen-map',
        dishes: 'screen-dishes'
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            Object.values(screenMap).forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });
            const target = document.getElementById(screenMap[tab.dataset.preview]);
            if (target) target.classList.remove('hidden');

            // Also hide the in-game screen if visible
            const gameScreen = document.getElementById('game-screen');
            if (gameScreen) gameScreen.classList.add('hidden');
        });
    });
}

// ---------------------------------------------------------------------
// Character Detail Screen
// ---------------------------------------------------------------------
function renderCharacterList() {
    const container = document.getElementById('character-full-list');
    if (!container) return;
    container.innerHTML = '';

    GAME_DATA.characters.forEach(c => {
        const card = document.createElement('div');
        card.className = 'character-full-card';
        card.innerHTML = `
            <h3>${c.name}</h3>
            <div class="char-arc">${c.arc}</div>
            <div class="char-quote">"${c.quote}"</div>
            <div class="char-bio">${c.bio}</div>
            <div class="char-stats">
                <span>⚔️ ATK: <b>${c.baseAttack}</b></span>
                <span>🔋 Max Stamina: <b>${c.maxStamina}</b></span>
            </div>
            <div class="char-passive"><b>Passive — ${c.passive.name}:</b> ${c.passive.text}</div>
            <div class="char-signature"><b>⭐ ${c.signaturePower.name}</b> (1/game): ${c.signaturePower.description}</div>
        `;
        container.appendChild(card);
    });
}

// ---------------------------------------------------------------------
// Map Layout Preview Screen
// ---------------------------------------------------------------------
function getLocationMeta(tileId) {
    return GAME_DATA.locationTypes.find(l => l.id === tileId) || { icon: '❓', name: tileId, type: 'monster' };
}

function renderMapPreview(round) {
    const container = document.getElementById('map-preview-grid');
    const noteEl = document.getElementById('map-design-note');
    if (!container) return;

    const layout = GAME_DATA.mapLayouts[round];
    const size = layout.grid.length;

    container.style.gridTemplateColumns = `repeat(${size}, ${size <= 3 ? 110 : size === 4 ? 90 : 76}px)`;
    container.style.gridTemplateRows = `repeat(${size}, ${size <= 3 ? 110 : size === 4 ? 90 : 76}px)`;
    container.innerHTML = '';

    layout.grid.forEach(row => {
        row.forEach(tileId => {
            const meta = getLocationMeta(tileId);
            const tile = document.createElement('div');
            tile.className = `location-tile ${LOCATION_CATEGORY_CLASS[meta.type] || ''}`;
            tile.innerHTML = `<span class="tile-emoji">${meta.icon}</span><span>${meta.name}</span>`;
            container.appendChild(tile);
        });
    });

    if (noteEl) noteEl.textContent = layout.designNote;
}

function initMapPreview() {
    const tabs = document.querySelectorAll('.map-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderMapPreview(parseInt(tab.dataset.round, 10));
        });
    });
    renderMapPreview(1); // default
}

// ---------------------------------------------------------------------
// Dish Gallery — Corner-Scored Cards
// ---------------------------------------------------------------------
function formatRequirements(dish) {
    const parts = [];
    if (dish.requirements.meat) parts.push(`${dish.requirements.meat} Meat`);
    if (dish.requirements.aroma) parts.push(`${dish.requirements.aroma} Aroma`);
    if (dish.requirements.seasoning) parts.push(`${dish.requirements.seasoning} Seasoning`);
    if (dish.requirements.aromaOrSeasoning) parts.push(`${dish.requirements.aromaOrSeasoning} Aroma/Seasoning`);
    if (dish.requirements.exoticMeat) parts.push(`${dish.requirements.exoticMeat} Exotic Meat`);
    if (dish.requirements.any) parts.push(`${dish.requirements.any} Any`);
    let text = parts.join(' + ');
    if (dish.type === 'signature') {
        text += ` (all ${GAME_DATA.families[dish.requiredFamily].name})`;
    }
    if (dish.note) text += ` — ${dish.note}`;
    return text;
}

function renderCorner(dish, cornerKey, cssClass) {
    const isLocked = dish.locked && dish.locked.includes(cornerKey);
    const value = dish.corners[cornerKey];
    const span = document.createElement('div');
    span.className = `dish-corner ${cssClass}${isLocked ? ' locked' : ''}`;
    span.textContent = isLocked ? '✕' : value;
    return span;
}

function renderDishGallery() {
    const container = document.getElementById('dish-gallery');
    if (!container) return;
    container.innerHTML = '';

    GAME_DATA.dishes.forEach(dish => {
        const card = document.createElement('div');
        card.className = `dish-card type-${dish.type}`;

        card.appendChild(renderCorner(dish, 'topLeft', 'top-left'));
        card.appendChild(renderCorner(dish, 'topRight', 'top-right'));
        card.appendChild(renderCorner(dish, 'bottomLeft', 'bottom-left'));
        card.appendChild(renderCorner(dish, 'bottomRight', 'bottom-right'));

        const name = document.createElement('div');
        name.className = 'dish-name';
        name.textContent = dish.name;
        card.appendChild(name);

        const req = document.createElement('div');
        req.className = 'dish-requirements';
        req.textContent = formatRequirements(dish);
        card.appendChild(req);

        const flavor = document.createElement('div');
        flavor.className = 'dish-flavor';
        flavor.textContent = dish.flavorText || '';
        card.appendChild(flavor);

        container.appendChild(card);
    });
}

// ---------------------------------------------------------------------
// Reusable Primitives — for the future turn engine to call directly
// ---------------------------------------------------------------------

// Renders N stamina pips into a container element, given current/max.
function renderStaminaPips(containerEl, current, max) {
    containerEl.innerHTML = '';
    for (let i = 0; i < max; i++) {
        const pip = document.createElement('span');
        pip.className = 'stamina-pip';
        if (i < current) {
            pip.classList.add('filled');
            if (current <= 1) pip.classList.add('low');
        }
        containerEl.appendChild(pip);
    }
}

// Renders AP pips (spent vs remaining) into a container element.
function renderAPPips(containerEl, spent, total) {
    containerEl.innerHTML = '';
    for (let i = 0; i < total; i++) {
        const pip = document.createElement('span');
        pip.className = 'ap-pip';
        if (i < spent) pip.classList.add('spent');
        pip.textContent = i < spent ? '✓' : '';
        containerEl.appendChild(pip);
    }
}

// Renders a single ingredient token chip (used for inventory display).
function renderTokenChip(ingredientName, count) {
    const familyEntry = Object.entries(GAME_DATA.families).find(([key, fam]) =>
        fam.meat === ingredientName || fam.aroma === ingredientName || fam.seasoning === ingredientName
    );
    const familyKey = familyEntry ? familyEntry[0] : null;
    const color = familyKey ? GAME_DATA.families[familyKey].color : '#999';
    const icon = familyKey ? FAMILY_ICON[familyKey] : '❓';

    const chip = document.createElement('div');
    chip.className = 'token-chip';
    chip.style.borderColor = color;
    chip.innerHTML = `
        <span class="token-icon">${icon}</span>
        <span class="token-count">×${count}</span>
        <span class="token-name">${ingredientName}</span>
    `;
    return chip;
}

// Renders a Companion card (Tamed monster, permanent).
function renderCompanionCard(monster) {
    const card = document.createElement('div');
    card.className = 'companion-card';
    card.innerHTML = `
        <b>${monster.name}</b>
        <div class="bonus-text">${monster.companionBonus}</div>
    `;
    return card;
}

// ---------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    initPreviewNav();
    renderCharacterList();
    initMapPreview();
    renderDishGallery();

    // Demo wiring for the in-game info bar primitives (shown before any
    // engine exists, so the header isn't empty on first paint).
    const staminaDisplay = document.getElementById('stamina-pips-display');
    const apDisplay = document.getElementById('ap-pips-display');
    if (staminaDisplay) renderStaminaPips(staminaDisplay, 3, 3);
    if (apDisplay) renderAPPips(apDisplay, 0, 2);

    initSetupScreen();
});

// =======================================================================
// SESSION 5: Interactive gameplay — wires GameEngine to the DOM.
// =======================================================================

let ENGINE = null;
let SELECTED_TILE = null; // {row, col} chosen by clicking a tile, for Explore/Move

const ALL_CHARACTER_IDS = GAME_DATA.characters.map(c => c.id);

function initSetupScreen() {
    const countButtons = document.querySelectorAll('.player-count-btn');
    let playerCount = 2;

    countButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            countButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            playerCount = parseInt(btn.dataset.count, 10);
            renderPlayerSetup(playerCount);
        });
    });

    renderPlayerSetup(playerCount);

    document.getElementById('btn-start-game').addEventListener('click', () => {
        const configs = collectPlayerConfigs();
        const errorEl = document.getElementById('setup-error');
        if (!configs) {
            errorEl.textContent = 'Please choose a different character for each player.';
            return;
        }
        errorEl.textContent = '';
        startGame(configs);
    });
}

function renderPlayerSetup(count) {
    const container = document.getElementById('player-setup');
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const row = document.createElement('div');
        row.className = 'player-card';
        row.innerHTML = `
            <h3>Player ${i + 1}</h3>
            <div class="character-selector" data-player-index="${i}">
                ${GAME_DATA.characters.map(c => `
                    <div class="character-option" data-char-id="${c.id}">
                        ${c.name}<br><small>${c.role}</small>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(row);
    }

    // Default-select distinct characters per player, then wire click toggles
    container.querySelectorAll('.character-selector').forEach((sel, idx) => {
        const options = sel.querySelectorAll('.character-option');
        options[idx % options.length].classList.add('selected');
        options.forEach(opt => {
            opt.addEventListener('click', () => {
                options.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
            });
        });
    });
}

function collectPlayerConfigs() {
    const selectors = document.querySelectorAll('.character-selector');
    const configs = [];
    const usedIds = new Set();

    for (const sel of selectors) {
        const selected = sel.querySelector('.character-option.selected');
        if (!selected) return null;
        const charId = selected.dataset.charId;
        if (usedIds.has(charId)) return null; // no duplicate characters
        usedIds.add(charId);
        const idx = parseInt(sel.dataset.playerIndex, 10);
        const charName = GAME_DATA.characters.find(c => c.id === charId).name;
        configs.push({ id: `p${idx + 1}`, name: `Player ${idx + 1} (${charName})`, characterId: charId });
    }
    return configs;
}

function startGame(configs) {
    const tier = document.getElementById('tier-select').value;
    const mode = document.querySelector('.mode-btn.active')?.id === 'btn-coop' ? 'coop' : 'competitive';
    ENGINE = new GameEngine(configs, { tier, mode });

    document.getElementById('setup-screen').classList.add('hidden');
    document.querySelectorAll('.preview-nav .preview-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('game-screen').classList.remove('hidden');

    wireGameActions();
    renderGameScreen();
}

// -----------------------------------------------------------------
// Rendering the live game state from ENGINE
// -----------------------------------------------------------------
function renderGameScreen() {
    if (!ENGINE) return;
    const player = ENGINE.getCurrentPlayer();
    const roundInfo = GAME_DATA.constants.ROUND_GRIDS[ENGINE.round];

    document.getElementById('current-round').textContent = ENGINE.round;
    document.querySelector('.grid-size').textContent = `(${roundInfo.size}×${roundInfo.size})`;
    document.getElementById('current-player-name').textContent = player.name;

    renderStaminaPips(document.getElementById('stamina-pips-display'), player.stamina, player.character.maxStamina);
    renderAPPips(document.getElementById('ap-pips-display'), roundInfo.apPool - player.ap, roundInfo.apPool);

    renderGameGrid();
    renderPlayerStatusList();
    renderInventory(player);
    updateActionButtonStates();

    document.getElementById('action-status').innerHTML = `<p>${ENGINE.log[ENGINE.log.length - 1] || 'Turn in progress.'}</p>`;
}

function renderGameGrid() {
    const container = document.getElementById('game-grid');
    const size = ENGINE.gridSize;
    container.className = ''; // clear old grid-3x3 etc class
    container.style.gridTemplateColumns = `repeat(${size}, ${size <= 3 ? 120 : size === 4 ? 100 : 90}px)`;
    container.style.gridTemplateRows = `repeat(${size}, ${size <= 3 ? 120 : size === 4 ? 100 : 90}px)`;
    container.innerHTML = '';

    const player = ENGINE.getCurrentPlayer();

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const tile = ENGINE.grid[r][c];
            const div = document.createElement('div');
            const isHere = player.position.row === r && player.position.col === c;
            const isSelected = SELECTED_TILE && SELECTED_TILE.row === r && SELECTED_TILE.col === c;
            const isAdjacent = (Math.abs(player.position.row - r) + Math.abs(player.position.col - c)) === 1;

            div.className = 'grid-tile' + (tile.revealed ? ' flipped' : '') + (isHere ? ' player-here' : '') + (isAdjacent ? ' clickable' : '');
            if (isSelected) div.style.boxShadow = '0 0 0 4px var(--accent-color)';

            if (tile.revealed) {
                const meta = getLocationMeta(tile.type);
                div.innerHTML = `<span class="tile-icon">${meta.icon}</span>`;
                div.title = meta.name;
            } else {
                div.innerHTML = `<span class="tile-icon">❓</span>`;
            }

            if (isAdjacent) {
                div.addEventListener('click', () => {
                    SELECTED_TILE = { row: r, col: c };
                    renderGameGrid(); // re-render to show selection highlight
                    updateActionButtonStates();
                });
            }

            container.appendChild(div);
        }
    }
}

function renderPlayerStatusList() {
    const container = document.getElementById('player-status-list');
    container.innerHTML = '';
    ENGINE.players.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = 'player-status-card' + (i === ENGINE.currentPlayerIndex ? ' active' : '');
        div.innerHTML = `
            <div class="player-name">${p.name}</div>
            <div class="score">${p.gourmetPoints} pts</div>
            <div style="font-size:0.75em;">🔋 ${p.stamina}/${p.character.maxStamina} · 🤝 ${p.companions.length} companions</div>
        `;
        container.appendChild(div);
    });
}

function renderInventory(player) {
    // Captured monsters (pre-extraction)
    const capturedEl = document.getElementById('captured-monsters');
    capturedEl.innerHTML = player.capturedMonsters.length === 0
        ? '<p style="font-size:0.8em;color:#999;">None yet.</p>'
        : '';
    player.capturedMonsters.forEach(c => {
        const monster = GAME_DATA.monsters.find(m => m.id === c.monsterId);
        const chip = document.createElement('div');
        chip.style.cssText = 'background:#fff3cd; padding:6px; border-radius:6px; margin-bottom:4px; font-size:0.8em;';
        chip.textContent = `${monster.name} (${c.killState})`;
        capturedEl.appendChild(chip);
    });

    // Ingredient tokens
    const tokenGrid = document.getElementById('ingredient-token-grid');
    tokenGrid.innerHTML = '';
    const entries = Object.entries(player.ingredientTokens);
    if (entries.length === 0) {
        tokenGrid.innerHTML = '<p style="font-size:0.8em;color:#999;">Empty.</p>';
    } else {
        entries.forEach(([type, count]) => tokenGrid.appendChild(renderTokenChip(type, count)));
    }

    // Companions
    const companionEl = document.getElementById('companion-list');
    companionEl.innerHTML = '';
    if (player.companions.length === 0) {
        companionEl.innerHTML = '<p style="font-size:0.8em;color:#999;">None yet.</p>';
    } else {
        player.companions.forEach(mid => {
            const monster = GAME_DATA.monsters.find(m => m.id === mid);
            companionEl.appendChild(renderCompanionCard(monster));
        });
    }

    // Tools
    const toolsEl = document.getElementById('tools-list');
    if (player.tools && player.tools.length > 0) {
        toolsEl.innerHTML = player.tools.map(toolId => {
            const tool = GAME_DATA.tools.find(t => t.id === toolId);
            return `<div style="font-size:0.85em;">🔧 ${tool ? tool.name : toolId}</div>`;
        }).join('');
    } else {
        const startingTool = player.character.startingResource?.type === 'tool' ? player.character.startingResource.id : null;
        toolsEl.innerHTML = startingTool
            ? `<div style="font-size:0.85em;">🔧 ${GAME_DATA.tools.find(t => t.id === startingTool)?.name || startingTool} (equipped)</div>`
            : '<p style="font-size:0.8em;color:#999;">No tools equipped.</p>';
    }
}

function updateActionButtonStates() {
    const player = ENGINE.getCurrentPlayer();
    const hasAP = player.ap > 0;
    const tile = ENGINE.grid[player.position.row][player.position.col];

    const exploreBtn = document.getElementById('btn-flip-tile');
    const moveBtn = document.getElementById('btn-move');
    const huntBtn = document.getElementById('btn-act-hunt');
    const tameBtn = document.getElementById('btn-act-tame');
    const extractBtn = document.getElementById('btn-open-extract');
    const restBtn = document.getElementById('btn-rest');
    const signatureBtn = document.getElementById('btn-use-power');

    const targetIsUnrevealed = SELECTED_TILE && !ENGINE.grid[SELECTED_TILE.row][SELECTED_TILE.col].revealed;
    const targetIsRevealed = SELECTED_TILE && ENGINE.grid[SELECTED_TILE.row][SELECTED_TILE.col].revealed;

    exploreBtn.disabled = !(hasAP && targetIsUnrevealed);
    moveBtn.disabled = !(hasAP && targetIsRevealed);
    huntBtn.disabled = !(hasAP && ENGINE.canHuntHere());
    tameBtn.disabled = huntBtn.disabled;
    extractBtn.disabled = !(hasAP && ENGINE.canExtractHere());
    restBtn.disabled = !hasAP;
    signatureBtn.disabled = player.signaturePowerUsed;

    document.getElementById('btn-complete-dish').disabled = Object.keys(player.ingredientTokens).length === 0;

    // Utility tile buttons — enabled only when standing on the right tile with AP
    const forageBtn = document.getElementById('btn-forage');
    forageBtn.disabled = !(hasAP && player.ap >= 2 && !player.forageUsedThisTurn && tile.revealed && ['ruin', 'butcher', 'aromaist', 'seasoning'].includes(tile.type));

    const wellBtn = document.getElementById('btn-well');
    wellBtn.disabled = !(hasAP && tile.type === 'well' && tile.revealed);

    const watchtowerBtn = document.getElementById('btn-watchtower');
    watchtowerBtn.disabled = !(hasAP && tile.type === 'watchtower' && tile.revealed);

    const shrineBtn = document.getElementById('btn-shrine');
    shrineBtn.disabled = !(hasAP && tile.type === 'shrine' && tile.revealed);

    const kitchenBtn = document.getElementById('btn-kitchen');
    kitchenBtn.disabled = !(hasAP && tile.type === 'kitchen' && tile.revealed);

    const merchantBtn = document.getElementById('btn-merchant');
    merchantBtn.disabled = !(hasAP && tile.type === 'merchant' && tile.revealed);

    // Co-op assist button — only in co-op, when ally on same tile and ally has AP
    const assistBtn = document.getElementById('btn-coop-assist');
    if (ENGINE.mode === 'coop' && ENGINE.canHuntHere()) {
        const assists = ENGINE.getAvailableAssists();
        assistBtn.disabled = assists.length === 0;
    } else {
        assistBtn.disabled = true;
    }
}

// -----------------------------------------------------------------
// Action wiring
// -----------------------------------------------------------------
function wireGameActions() {
    document.getElementById('btn-flip-tile').addEventListener('click', () => {
        if (!SELECTED_TILE) return;
        const result = ENGINE.explore(SELECTED_TILE.row, SELECTED_TILE.col);
        handleActionResult(result);
    });

    document.getElementById('btn-move').addEventListener('click', () => {
        if (!SELECTED_TILE) return;
        const result = ENGINE.move(SELECTED_TILE.row, SELECTED_TILE.col);
        SELECTED_TILE = null;
        handleActionResult(result);
    });

    document.getElementById('btn-rest').addEventListener('click', () => {
        const result = ENGINE.rest();
        handleActionResult(result);
    });

    document.getElementById('btn-act-hunt').addEventListener('click', () => openHuntModal(false));
    document.getElementById('btn-act-tame').addEventListener('click', () => openHuntModal(true));
    document.getElementById('btn-open-extract').addEventListener('click', openExtractionEntryPoint);

    document.getElementById('btn-complete-dish').addEventListener('click', openDishModal);

    document.getElementById('btn-forage').addEventListener('click', () => {
        handleActionResult(ENGINE.forage());
    });

    document.getElementById('btn-well').addEventListener('click', () => {
        handleActionResult(ENGINE.actOnMagicWell());
    });

    document.getElementById('btn-watchtower').addEventListener('click', () => {
        handleActionResult(ENGINE.actOnWatchtower());
    });

    document.getElementById('btn-shrine').addEventListener('click', () => {
        handleActionResult(ENGINE.actOnShrine());
    });

    document.getElementById('btn-kitchen').addEventListener('click', () => {
        openKitchenModal();
    });

    document.getElementById('btn-merchant').addEventListener('click', () => {
        openMerchantModal();
    });

    document.getElementById('btn-coop-assist').addEventListener('click', () => {
        openAssistModal();
    });

    document.getElementById('btn-end-turn').addEventListener('click', () => {
        SELECTED_TILE = null;
        const player = ENGINE.getCurrentPlayer();
        if (ENGINE.round < 3 && isRoundOver()) {
            ENGINE.advanceRound();
        } else {
            ENGINE.endTurn();
        }
        renderGameScreen();
    });

    document.getElementById('btn-cancel-hunt').addEventListener('click', () => closeModal('modal-monster'));
    document.getElementById('btn-cancel-extraction').addEventListener('click', () => closeModal('modal-extraction'));
    document.getElementById('btn-cancel-dish').addEventListener('click', () => closeModal('modal-dish'));
    document.getElementById('btn-cancel-merchant').addEventListener('click', () => closeModal('modal-merchant'));

    document.getElementById('toggle-ref').addEventListener('click', () => {
        document.getElementById('quick-ref').classList.toggle('collapsed');
    });
}

function isRoundOver() {
    return ENGINE.isRoundProductivelyOver() || ENGINE.isRoundOver();
}

function handleActionResult(result) {
    if (!result.success) {
        document.getElementById('action-status').innerHTML = `<p style="color:#c0392b;">⚠️ ${result.reason}</p>`;
        return;
    }
    renderGameScreen();
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

// --- Hunt / Tame Modal ---
function openHuntModal(tameOnly) {
    const player = ENGINE.getCurrentPlayer();
    const tile = ENGINE.grid[player.position.row][player.position.col];
    if (!tile.contents) {
        // Peek a monster from the deck for display purposes without committing
        // (actual draw happens inside engine.hunt() on confirm).
    }
    const previewMonster = tile.contents ? tile.contents.monster : ENGINE.monsterDeck[ENGINE.monsterDeck.length - 1];
    if (!previewMonster) {
        document.getElementById('action-status').innerHTML = '<p style="color:#c0392b;">⚠️ No monsters remain in the deck.</p>';
        return;
    }

    document.getElementById('player-atk').textContent = player.character.baseAttack;
    document.getElementById('monster-hp').textContent = previewMonster.hp;
    document.getElementById('monster-atk').textContent = previewMonster.atk;
    document.getElementById('monster-display').innerHTML = `<h3>${previewMonster.name}</h3>`;

    const available = ENGINE.getAvailableKillStates(player);
    document.querySelectorAll('.kill-state-btn').forEach(btn => {
        const state = btn.dataset.state;
        const isTameBtn = state === 'TAMED';
        btn.style.display = (tameOnly && !isTameBtn) || (!tameOnly && isTameBtn && ENGINE.round === 1) ? 'none' : '';
        btn.disabled = ENGINE.round > 1 && !available.includes(state);
        btn.classList.remove('selected');
    });

    let chosenState = ENGINE.round === 1 ? 'CLEAN' : null;
    document.querySelectorAll('.kill-state-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.kill-state-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            chosenState = btn.dataset.state;
        };
    });

    document.getElementById('btn-hunt-monster').onclick = () => {
        const result = ENGINE.hunt(chosenState);
        closeModal('modal-monster');
        if (!result.success) {
            document.getElementById('action-status').innerHTML = `<p style="color:#c0392b;">${previewMonster.name} got away! ${result.note}</p>`;
        } else if (result.tamed) {
            document.getElementById('action-status').innerHTML = `<p>🤝 Tamed ${result.monster.name}! Gained ${result.ingredientGranted.value}x ${result.ingredientGranted.type}.</p>`;
        } else {
            document.getElementById('action-status').innerHTML = `<p>⚔️ Captured ${result.monster.name} (${result.killState}). Visit a shop to extract.</p>`;
        }
        renderGameScreen();
    };

    document.getElementById('modal-monster').classList.remove('hidden');
}

// --- Extraction Modal ---
function openExtractionEntryPoint() {
    const player = ENGINE.getCurrentPlayer();
    if (player.capturedMonsters.length === 1) {
        openExtractionModalFor(player.capturedMonsters[0].instanceId);
        return;
    }
    // Multiple captured monsters: quick inline picker before the edge modal.
    const choice = player.capturedMonsters.map((c, i) => {
        const m = GAME_DATA.monsters.find(mm => mm.id === c.monsterId);
        return `${i + 1}. ${m.name} (${c.killState})`;
    }).join('\n');
    const pick = window.prompt(`Which captured monster to extract?\n${choice}\n\nEnter number:`);
    const idx = parseInt(pick, 10) - 1;
    if (idx >= 0 && idx < player.capturedMonsters.length) {
        openExtractionModalFor(player.capturedMonsters[idx].instanceId);
    }
}

function openExtractionModalFor(capturedInstanceId) {
    const legalEdges = ENGINE.previewLegalEdges(capturedInstanceId);
    const player = ENGINE.getCurrentPlayer();
    const captured = player.capturedMonsters.find(c => c.instanceId === capturedInstanceId);
    const monster = GAME_DATA.monsters.find(m => m.id === captured.monsterId);

    document.getElementById('extraction-monster-display').innerHTML = `<h3>${monster.name}</h3><p>Kill state: ${captured.killState}</p>`;

    document.querySelectorAll('.edge-btn').forEach(btn => {
        const edge = btn.dataset.edge;
        btn.disabled = !legalEdges.includes(edge);
        const edgeData = monster.edges[edge];
        btn.textContent = `${btn.dataset.edge === 'top' ? '⬆️ Top' : btn.dataset.edge === 'left' ? '⬅️ Left' : btn.dataset.edge === 'right' ? '➡️ Right' : '⬇️ Bottom'} (${edgeData.type} ×${edgeData.value})`;
        btn.onclick = () => {
            document.querySelectorAll('.edge-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        };
    });

    document.getElementById('btn-extract').onclick = () => {
        const chosen = document.querySelector('.edge-btn.selected');
        if (!chosen) return;
        const result = ENGINE.extract(capturedInstanceId, chosen.dataset.edge);
        closeModal('modal-extraction');
        handleActionResult(result);
    };

    document.getElementById('modal-extraction').classList.remove('hidden');
}

// --- Dish Completion Modal ---
function openDishModal() {
    const player = ENGINE.getCurrentPlayer();
    const container = document.getElementById('dish-selection');
    container.innerHTML = '<p style="font-size:0.85em;color:#666;">Pick a dish, then choose which specific ingredients to spend for each slot.</p>';

    GAME_DATA.dishes.forEach(dish => {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'border:2px solid #ddd; border-radius:8px; padding:8px; margin-bottom:8px;';
        wrapper.innerHTML = `<b>${dish.name}</b> <span style="font-size:0.8em;color:#666;">${formatRequirements(dish)}</span>`;

        const pickerRow = document.createElement('div');
        pickerRow.style.cssText = 'display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;';

        const slotPickers = []; // [{selectEl, category}]
        const addSlot = (category, count, pool) => {
            for (let i = 0; i < count; i++) {
                const select = document.createElement('select');
                select.innerHTML = `<option value="">-- ${category} --</option>` +
                    pool.filter(type => (player.ingredientTokens[type] || 0) > 0)
                        .map(type => `<option value="${type}">${type} (have ${player.ingredientTokens[type]})</option>`).join('');
                pickerRow.appendChild(select);
                slotPickers.push(select);
            }
        };

        if (dish.requirements.meat) addSlot('Meat', dish.requirements.meat, GAME_DATA.constants.INGREDIENT_TYPES.MEATS);
        if (dish.requirements.aroma) addSlot('Aroma', dish.requirements.aroma, GAME_DATA.constants.INGREDIENT_TYPES.AROMAS);
        if (dish.requirements.seasoning) addSlot('Seasoning', dish.requirements.seasoning, GAME_DATA.constants.INGREDIENT_TYPES.SEASONINGS);
        if (dish.requirements.any) addSlot('Any', dish.requirements.any,
            [...GAME_DATA.constants.INGREDIENT_TYPES.MEATS, ...GAME_DATA.constants.INGREDIENT_TYPES.AROMAS, ...GAME_DATA.constants.INGREDIENT_TYPES.SEASONINGS]);

        wrapper.appendChild(pickerRow);

        const tryBtn = document.createElement('button');
        tryBtn.textContent = 'Cook';
        tryBtn.className = 'btn-action';
        tryBtn.style.marginTop = '6px';
        tryBtn.onclick = () => {
            const chosen = slotPickers.map(s => s.value);
            if (chosen.some(v => !v)) {
                container.insertAdjacentHTML('afterbegin', '<p style="color:#c0392b;">Fill every slot before cooking.</p>');
                return;
            }
            const result = ENGINE.completeDish(dish.id, chosen);
            closeModal('modal-dish');
            if (!result.success) {
                document.getElementById('action-status').innerHTML = `<p style="color:#c0392b;">${result.reason}</p>`;
            } else {
                document.getElementById('action-status').innerHTML = `<p>🍽️ ${dish.name} → ${result.corner} → +${result.score} pts!</p>`;
            }
            renderGameScreen();
        };
        wrapper.appendChild(tryBtn);
        container.appendChild(wrapper);
    });

    document.getElementById('modal-dish').classList.remove('hidden');
}

// --- Kitchen Modal (Wildcard dishes only) ---
function openKitchenModal() {
    const player = ENGINE.getCurrentPlayer();
    const container = document.getElementById('dish-selection');
    container.innerHTML = '<p style="font-size:0.85em;color:#666;">Abandoned Kitchen: complete a Wildcard dish instantly.</p>';

    const wildcards = GAME_DATA.dishes.filter(d => d.type === 'wildcard');
    if (wildcards.length === 0) {
        container.innerHTML += '<p>No wildcard dishes available.</p>';
        document.getElementById('modal-dish').classList.remove('hidden');
        return;
    }

    wildcards.forEach(dish => {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'border:2px solid #ddd; border-radius:8px; padding:8px; margin-bottom:8px;';
        wrapper.innerHTML = `<b>${dish.name}</b> <span style="font-size:0.8em;color:#666;">${formatRequirements(dish)}</span>`;

        const pickerRow = document.createElement('div');
        pickerRow.style.cssText = 'display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;';

        const slotPickers = [];
        const addSlot = (category, count, pool) => {
            for (let i = 0; i < count; i++) {
                const select = document.createElement('select');
                select.innerHTML = `<option value="">-- ${category} --</option>` +
                    pool.filter(type => (player.ingredientTokens[type] || 0) > 0)
                        .map(type => `<option value="${type}">${type} (have ${player.ingredientTokens[type]})</option>`).join('');
                pickerRow.appendChild(select);
                slotPickers.push(select);
            }
        };

        if (dish.requirements.any) addSlot('Any', dish.requirements.any,
            [...GAME_DATA.constants.INGREDIENT_TYPES.MEATS, ...GAME_DATA.constants.INGREDIENT_TYPES.AROMAS, ...GAME_DATA.constants.INGREDIENT_TYPES.SEASONINGS]);
        if (dish.requirements.meat) addSlot('Meat', dish.requirements.meat, GAME_DATA.constants.INGREDIENT_TYPES.MEATS);
        if (dish.requirements.aroma) addSlot('Aroma', dish.requirements.aroma, GAME_DATA.constants.INGREDIENT_TYPES.AROMAS);
        if (dish.requirements.seasoning) addSlot('Seasoning', dish.requirements.seasoning, GAME_DATA.constants.INGREDIENT_TYPES.SEASONINGS);

        wrapper.appendChild(pickerRow);

        const tryBtn = document.createElement('button');
        tryBtn.textContent = 'Cook';
        tryBtn.className = 'btn-action';
        tryBtn.style.marginTop = '6px';
        tryBtn.onclick = () => {
            const chosen = slotPickers.map(s => s.value);
            if (chosen.some(v => !v)) {
                container.insertAdjacentHTML('afterbegin', '<p style="color:#c0392b;">Fill every slot before cooking.</p>');
                return;
            }
            const result = ENGINE.actOnKitchen(dish.id, chosen);
            closeModal('modal-dish');
            handleActionResult(result);
        };
        wrapper.appendChild(tryBtn);
        container.appendChild(wrapper);
    });

    document.getElementById('modal-dish').classList.remove('hidden');
}

// --- Merchant Modal (buy tools, sell ingredients) ---
function openMerchantModal() {
    const player = ENGINE.getCurrentPlayer();
    const modal = document.getElementById('modal-merchant');
    if (!modal) return;

    document.getElementById('merchant-modal-title').textContent = "Merchant's Camp";

    const toolList = document.getElementById('merchant-tool-list');
    const sellList = document.getElementById('merchant-sell-list');

    // Tools for sale
    toolList.innerHTML = '';
    const toolsForSale = GAME_DATA.tools.filter(t => {
        const startingTool = player.character.startingResource?.type === 'tool' ? player.character.startingResource.id : null;
        return t.id !== startingTool;
    });

    if (toolsForSale.length === 0) {
        toolList.innerHTML = '<p style="font-size:0.85em;color:#999;">No tools available.</p>';
    } else {
        toolsForSale.forEach(tool => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:4px 0;';
            row.innerHTML = `<span style="font-size:0.9em;">${tool.name} — ${tool.description || ''} (${formatToolCost(tool)})</span>`;
            const buyBtn = document.createElement('button');
            buyBtn.textContent = 'Buy';
            buyBtn.className = 'btn-action';
            buyBtn.style.cssText = 'font-size:0.8em; padding:4px 10px;';
            buyBtn.disabled = player.tools.includes(tool.id);
            buyBtn.onclick = () => {
                const result = ENGINE.actOnMerchant('buy_tool', { toolId: tool.id });
                closeModal('modal-merchant');
                handleActionResult(result);
            };
            row.appendChild(buyBtn);
            toolList.appendChild(row);
        });
    }

    // Sell ingredients (sell 2 of one type for 1 of another)
    sellList.innerHTML = '<p style="font-size:0.85em;color:#666;">Sell 2 of one ingredient for 1 of another.</p>';
    const entries = Object.entries(player.ingredientTokens);
    if (entries.length === 0) {
        sellList.innerHTML = '<p style="font-size:0.85em;color:#999;">No ingredients to sell.</p>';
    } else {
        const toBuy = [
            ...GAME_DATA.constants.INGREDIENT_TYPES.MEATS,
            ...GAME_DATA.constants.INGREDIENT_TYPES.AROMAS,
            ...GAME_DATA.constants.INGREDIENT_TYPES.SEASONINGS
        ].filter(t => !(player.ingredientTokens[t] > 0) || Object.keys(player.ingredientTokens).length === 1);
        entries.forEach(([type, count]) => {
            if (count < 2) return;
            const row = document.createElement('div');
            row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:4px 0;';
            const buySelect = document.createElement('select');
            buySelect.style.cssText = 'font-size:0.8em;';
            buySelect.innerHTML = `<option value="">-- want --</option>` +
                toBuy.map(t => `<option value="${t}">${t}</option>`).join('');
            row.innerHTML = `<span style="font-size:0.9em;">Sell 2× ${type}</span>`;
            const sellBtn = document.createElement('button');
            sellBtn.textContent = 'Trade';
            sellBtn.className = 'btn-action';
            sellBtn.style.cssText = 'font-size:0.8em; padding:4px 10px;';
            sellBtn.onclick = () => {
                const buyType = buySelect.value;
                if (!buyType) return;
                const result = ENGINE.actOnMerchant('sell', { sellType: type, buyType });
                closeModal('modal-merchant');
                handleActionResult(result);
            };
            row.appendChild(buySelect);
            row.appendChild(sellBtn);
            sellList.appendChild(row);
        });
    }

    modal.classList.remove('hidden');
}

function formatToolCost(tool) {
    if (tool.cost.type === 'any_different') return `${tool.cost.count} different ingredients`;
    if (tool.cost.type === 'any') return `${tool.cost.count} any ingredients`;
    return Object.entries(tool.cost).map(([k, v]) => `${v}× ${k}`).join(', ');
}

// --- Co-op Assist Modal ---
function openAssistModal() {
    const assists = ENGINE.getAvailableAssists();
    if (assists.length === 0) return;

    const modal = document.getElementById('modal-merchant');
    if (!modal) return;

    document.getElementById('merchant-modal-title').textContent = 'Co-op Assist';
    const toolList = document.getElementById('merchant-tool-list');
    const sellList = document.getElementById('merchant-sell-list');

    toolList.innerHTML = '<p style="font-size:0.85em;color:#666;">Choose an ally to assist your hunt. They spend 1 AP and add ⌈ATK/2⌉ bonus damage.</p>';
    sellList.innerHTML = '';

    assists.forEach(a => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid #eee;';
        row.innerHTML = `<span><b>${a.name}</b> — +${a.bonus} ATK (${a.apCost} AP)</span>`;
        const chooseBtn = document.createElement('button');
        chooseBtn.textContent = 'Assist';
        chooseBtn.className = 'btn-action btn-tame';
        chooseBtn.style.cssText = 'font-size:0.8em; padding:4px 10px;';
        chooseBtn.onclick = () => {
            closeModal('modal-merchant');
            openHuntModalWithAssist(a.index);
        };
        row.appendChild(chooseBtn);
        sellList.appendChild(row);
    });

    modal.classList.remove('hidden');
}

function openHuntModalWithAssist(allyIndex) {
    const player = ENGINE.getCurrentPlayer();
    const tile = ENGINE.grid[player.position.row][player.position.col];
    const previewMonster = tile.contents ? tile.contents.monster : ENGINE.monsterDeck[ENGINE.monsterDeck.length - 1];
    if (!previewMonster) {
        document.getElementById('action-status').innerHTML = '<p style="color:#c0392b;">⚠️ No monsters remain in the deck.</p>';
        return;
    }

    const ally = ENGINE.players[allyIndex];
    document.getElementById('player-atk').textContent = player.character.baseAttack + Math.ceil(ally.character.baseAttack / 2);
    document.getElementById('monster-hp').textContent = previewMonster.hp;
    document.getElementById('monster-atk').textContent = previewMonster.atk;
    document.getElementById('monster-display').innerHTML = `<h3>${previewMonster.name}</h3><p style="font-size:0.85em;color:#666;">${ally.name} assisting: +${Math.ceil(ally.character.baseAttack / 2)} ATK</p>`;

    const available = ENGINE.getAvailableKillStates(player);
    document.querySelectorAll('.kill-state-btn').forEach(btn => {
        const state = btn.dataset.state;
        const isTameBtn = state === 'TAMED';
        btn.style.display = (!isTameBtn && ENGINE.round === 1) ? 'none' : '';
        btn.disabled = ENGINE.round > 1 && !available.includes(state);
        btn.classList.remove('selected');
    });

    let chosenState = ENGINE.round === 1 ? 'CLEAN' : null;
    document.querySelectorAll('.kill-state-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.kill-state-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            chosenState = btn.dataset.state;
        };
    });

    document.getElementById('btn-hunt-monster').onclick = () => {
        const result = ENGINE.hunt(chosenState, allyIndex);
        closeModal('modal-monster');
        if (!result.success) {
            document.getElementById('action-status').innerHTML = `<p style="color:#c0392b;">${previewMonster.name} got away! ${result.note}</p>`;
        } else if (result.tamed) {
            document.getElementById('action-status').innerHTML = `<p>🤝 Tamed ${result.monster.name}! Gained ${result.ingredientGranted.value}x ${result.ingredientGranted.type}. ${result.assistLog || ''}</p>`;
        } else {
            document.getElementById('action-status').innerHTML = `<p>⚔️ Captured ${result.monster.name} (${result.killState}). ${result.assistLog || ''}</p>`;
        }
        renderGameScreen();
    };

    document.getElementById('modal-monster').classList.remove('hidden');
}
