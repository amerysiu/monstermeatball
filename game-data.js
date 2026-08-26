// Monster Meatball - Game Data
// All cards, characters, and game constants
// SESSION 2 REVAMP: Stamina system, Tame/Companion mechanic, Flavor Families,
// corner-scoring, 20 monsters, expanded location set, AP-pool actions.

const GAME_DATA = {

    // ================================================================
    // CHARACTERS (4) — Stamina-linked passives define each arc mechanically
    // ================================================================
    characters: [
        {
            id: 'butcher_bob',
            name: 'Butcher Bob',
            role: 'Processor',
            arc: 'Power → Restraint',
            quote: 'A good hunter kills once. A good butcher wastes nothing.',
            bio: 'Enormous, cheerful, and surprisingly gentle. Bob grew up in his family\'s butcher shop and learned that hunting is easy — respecting what comes after is the hard part.',
            baseAttack: 3,
            maxStamina: 3,
            startingResource: { type: 'tool', id: 'cleaver', equipped: true },
            passive: {
                name: 'Heavy Hand',
                effects: [
                    { trigger: 'kill_state_brutal', effect: 'no_stamina_cost' },
                    { trigger: 'kill_state_clean_or_careful', effect: 'extra_stamina_cost', value: 1 }
                ],
                text: 'Brutal kills cost no Stamina. Clean/Careful kills cost +1 extra Stamina.'
            },
            signaturePower: {
                name: 'Perfect Cut',
                description: 'Extract from 2 edges of the same monster in one Act.',
                usesPerGame: 1
            }
        },
        {
            id: 'tracker_tessa',
            name: 'Tracker Tessa',
            role: 'Hunter',
            arc: 'Precision → Adaptability',
            quote: 'The perfect shot is the one that leaves the ingredients untouched.',
            bio: 'Precise, self-reliant, and a little too confident in her own read of the world. Tessa studies wind, footprints, and feeding patterns rather than trusting brute force.',
            baseAttack: 2,
            maxStamina: 4,
            startingResource: { type: 'reroll_token', count: 1 }, // extra, in addition to standard 2
            passive: {
                name: 'Efficient Hunter',
                effects: [
                    { trigger: 'always', effect: 'extract_at_ruin_skip_shop' },
                    { trigger: 'fog_card_drawn', effect: 'must_resolve_face_up_before_risk_posture' }
                ],
                text: 'May extract monsters at Ruins, skipping the shop trip. Must resolve Fog cards face-up before choosing Risk Posture (cannot bluff through uncertainty).'
            },
            signaturePower: {
                name: 'Ambush Hunter',
                description: 'Hunt 2 monsters in a single Act action.',
                usesPerGame: 1
            }
        },
        {
            id: 'trapper_tim',
            name: 'Trapper Tim',
            role: 'Planner',
            arc: 'Caution → Courage',
            quote: 'Why fight the monster when you can convince it to defeat itself?',
            bio: 'Clever, cautious, and quietly convinced that ten minutes of preparation beats ten seconds of combat. Tim would rather understand a monster than fight it.',
            baseAttack: 1,
            maxStamina: 3,
            startingResource: { type: 'tool', id: 'trap', equipped: true },
            passive: {
                name: "Snarer's Patience",
                effects: [
                    { trigger: 'hunt_facedown_ruin_immediately', effect: 'always_clean_eligible_ignores_stamina' }
                ],
                text: 'Facedown Ruins hunted immediately upon reveal are always Clean-kill eligible, regardless of current Stamina.'
            },
            signaturePower: {
                name: 'Preservation Expert',
                description: 'Ignore all spoilage checks for the rest of this round.',
                usesPerGame: 1
            }
        },
        {
            id: 'hunter_hank',
            name: 'Hunter Hank',
            role: 'All-rounder',
            arc: 'Courage → Wisdom',
            quote: "If it's bigger than me, it's probably worth hunting.",
            bio: 'The youngest, loudest, and most eager to prove himself. Hank believes courage solves everything a plan can\'t — until he meets something bravery alone can\'t defeat.',
            baseAttack: 2,
            maxStamina: 3,
            startingResource: { type: 'bonus_ap_token', count: 1, usableAnyRound: true },
            passive: {
                name: 'Steady Nerve',
                effects: [
                    { trigger: 'once_per_round', effect: 'hunt_without_stamina_cost' }
                ],
                text: 'Once per round, may Hunt without spending Stamina. No other built-in weakness.'
            },
            signaturePower: {
                name: 'Fearless Feast',
                description: 'Complete a dish without paying one required ingredient type.',
                usesPerGame: 1
            },
            optionalExpertRule: {
                name: 'Impulsive',
                roundsActive: [1],
                text: "In Round 1 only, if Hank is adjacent to an unrevealed Ruin at the start of his turn, he must spend his first AP exploring it. This restriction disappears from Round 2 onward, dramatizing Hank's growth."
            }
        }
    ],

    // ================================================================
    // MONSTERS (20 total)
    // Every monster follows the same edge shape (Top=Meat, Left=Aroma,
    // Right=Seasoning, Bottom=Bonus/conditional). ATK now matters: a
    // failed Hunt costs the player Stamina equal to this value (min 1).
    // companionBonus = permanent passive gained if Tamed instead of killed.
    // ================================================================
    monsters: [
        // --- TIER I (Round 1, HP 1-2, ATK 1) ---
        {
            id: 'flame_lizard', name: 'Flame Lizard', tier: 1, hp: 2, atk: 1,
            edges: {
                top: { type: 'Red Meat', value: 2 },
                left: { type: 'Spicy Aroma', value: 1 },
                right: { type: 'Fiery Seasoning', value: 1 },
                bottom: { type: 'Fiery Seasoning', value: 1, condition: 'Dark Hour' }
            },
            companionBonus: { text: '+1 max Stamina for the rest of the game.', type: 'PASSIVE', effectKey: 'maxStaminaBonus', wired: true }
        },
        {
            id: 'grumble_boar', name: 'Grumble Boar', tier: 1, hp: 2, atk: 1,
            edges: {
                top: { type: 'Red Meat', value: 2 },
                left: { type: 'Earthy Aroma', value: 1 },
                right: { type: 'Herbal Seasoning', value: 1 },
                bottom: { type: 'Red Meat', value: 1, condition: 'Clean Kill' }
            },
            companionBonus: { text: 'Once per round, may Rest as a free action (0 AP).', type: 'ACTIVE_ONCE_PER_ROUND', effectKey: 'freeRest', wired: true }
        },
        {
            id: 'tide_eel', name: 'Tide Eel', tier: 1, hp: 1, atk: 1,
            edges: {
                top: { type: 'Sea Meat', value: 1 },
                left: { type: 'Salty Aroma', value: 1 },
                right: { type: 'Mineral Seasoning', value: 1 },
                bottom: { type: 'Sea Meat', value: 1, condition: 'Extracted at Butcher' }
            },
            companionBonus: { text: 'Once per round, may grant yourself one Spoilage-immunity charge.', type: 'ACTIVE_ONCE_PER_ROUND', effectKey: 'grantSpoilageCharge', wired: true }
        },
        {
            id: 'moss_stag', name: 'Moss Stag', tier: 1, hp: 1, atk: 1,
            edges: {
                top: { type: 'White Meat', value: 1 },
                left: { type: 'Earthy Aroma', value: 1 },
                right: { type: 'Herbal Seasoning', value: 1 },
                bottom: { type: 'Herbal Seasoning', value: 1, condition: 'Clean Kill' }
            },
            companionBonus: { text: '+1 AP on any turn you also Rest.', type: 'PASSIVE', effectKey: 'apBonusOnRest', wired: false }
        },
        {
            id: 'ember_crab', name: 'Ember Crab', tier: 1, hp: 2, atk: 1,
            edges: {
                top: { type: 'Red Meat', value: 1 },
                left: { type: 'Spicy Aroma', value: 1 },
                right: { type: 'Mineral Seasoning', value: 1 },
                bottom: { type: 'Red Meat', value: 1, condition: 'Brutal Kill' }
            },
            companionBonus: { text: 'Your Desperate extractions only check Spoilage once (not twice) for the rest of the game.', type: 'PASSIVE', effectKey: 'desperateSingleCheck', wired: true }
        },
        {
            id: 'bristle_yak', name: 'Bristle Yak', tier: 1, hp: 2, atk: 1,
            edges: {
                top: { type: 'White Meat', value: 2 },
                left: { type: 'Earthy Aroma', value: 1 },
                right: { type: 'Fiery Seasoning', value: 1 },
                bottom: { type: 'White Meat', value: 1, condition: 'Rushed Kill' }
            },
            companionBonus: { text: 'Rest recovers +2 Stamina instead of +1, for the rest of the game.', type: 'PASSIVE', effectKey: 'enhancedRest', wired: true }
        },
        {
            id: 'candy_slime', name: 'Candy Slime', tier: 1, hp: 1, atk: 1,
            edges: {
                top: { type: 'Exotic Meat', value: 1 },
                left: { type: 'Sweet Aroma', value: 1 },
                right: { type: 'Mystic Seasoning', value: 1 },
                bottom: { type: 'Sweet Aroma', value: 1, condition: 'Tamed' }
            },
            companionBonus: { text: 'Gain 1 Reroll Token immediately when Tamed.', type: 'IMMEDIATE', effectKey: 'grantRerollToken', wired: true }
        },

        // --- TIER II (Round 2, HP 2-3, ATK 1-2) ---
        {
            id: 'sky_serpent', name: 'Sky Serpent', tier: 2, hp: 3, atk: 2,
            edges: {
                top: { type: 'White Meat', value: 1 },
                left: { type: 'Sweet Aroma', value: 2 },
                right: { type: 'Mystic Seasoning', value: 2 },
                bottom: { type: 'Mystic Seasoning', value: 1, condition: 'Rushed Kill' }
            },
            companionBonus: { text: '+1 Reroll Token immediately.', type: 'IMMEDIATE', effectKey: 'grantRerollToken', wired: true }
        },
        {
            id: 'rock_golem', name: 'Rock Golem', tier: 2, hp: 3, atk: 2,
            edges: {
                top: { type: 'Exotic Meat', value: 2 },
                left: { type: 'Salty Aroma', value: 1 },
                right: { type: 'Mineral Seasoning', value: 2 },
                bottom: { type: 'Mineral Seasoning', value: 1, condition: 'Extracted at Seasoning Mill' }
            },
            companionBonus: { text: '+1 max AP on turns you do not Hunt.', type: 'PASSIVE', effectKey: 'apBonusOnNoHunt', wired: false }
        },
        {
            id: 'river_leviathan', name: 'River Leviathan', tier: 2, hp: 3, atk: 2,
            edges: {
                top: { type: 'Sea Meat', value: 2 },
                left: { type: 'Salty Aroma', value: 2 },
                right: { type: 'Mystic Seasoning', value: 1 },
                bottom: { type: 'Sea Meat', value: 1, condition: 'Net used' }
            },
            companionBonus: { text: 'Once per round, treat a Bold kill as Careful-tier access.', type: 'ACTIVE_ONCE_PER_ROUND', effectKey: 'nextBoldAsCareful', wired: false }
        },
        {
            id: 'pearl_manta', name: 'Pearl Manta', tier: 2, hp: 2, atk: 1,
            edges: {
                top: { type: 'Sea Meat', value: 1 },
                left: { type: 'Sweet Aroma', value: 1 },
                right: { type: 'Mineral Seasoning', value: 1 },
                bottom: { type: 'Sweet Aroma', value: 1, condition: 'Tamed' }
            },
            companionBonus: { text: 'Immune to the Ember≠Bloom spoilage pair only, for the rest of the game.', type: 'PASSIVE', effectKey: 'emberBloomImmune', wired: true }
        },
        {
            id: 'mirror_kitsune', name: 'Mirror Kitsune', tier: 2, hp: 3, atk: 2,
            edges: {
                top: { type: 'Exotic Meat', value: 1 },
                left: { type: 'Sweet Aroma', value: 2 },
                right: { type: 'Mystic Seasoning', value: 2 },
                bottom: { type: 'Exotic Meat', value: 1, condition: 'Clean Kill' }
            },
            companionBonus: { text: 'Once per game, copy another player\'s completed Signature dish at half score (rounded down).', type: 'ACTIVE_ONCE_PER_GAME', effectKey: 'copyDish', wired: false }
        },
        {
            id: 'spore_shambler', name: 'Spore Shambler', tier: 2, hp: 2, atk: 1,
            edges: {
                top: { type: 'White Meat', value: 1 },
                left: { type: 'Earthy Aroma', value: 1 },
                right: { type: 'Herbal Seasoning', value: 2 },
                bottom: { type: 'Herbal Seasoning', value: 1, condition: 'Careful Kill' }
            },
            companionBonus: { text: 'Wildcard dishes score +1 for the rest of the game.', type: 'PASSIVE', effectKey: 'wildcardBonus', wired: false }
        },
        {
            id: 'frost_owlbear', name: 'Frost Owlbear', tier: 2, hp: 3, atk: 2,
            edges: {
                top: { type: 'White Meat', value: 2 },
                left: { type: 'Salty Aroma', value: 1 },
                right: { type: 'Mineral Seasoning', value: 1 },
                bottom: { type: 'White Meat', value: 1, condition: 'Brutal Kill' }
            },
            companionBonus: { text: 'Once per round, Move for free (0 AP).', type: 'ACTIVE_ONCE_PER_ROUND', effectKey: 'freeMove', wired: true }
        },
        {
            id: 'thorn_basilisk', name: 'Thorn Basilisk', tier: 2, hp: 3, atk: 2,
            edges: {
                top: { type: 'Exotic Meat', value: 2 },
                left: { type: 'Earthy Aroma', value: 1 },
                right: { type: 'Herbal Seasoning', value: 1 },
                bottom: { type: 'Exotic Meat', value: 1, condition: 'Extracted at Butcher' }
            },
            companionBonus: { text: 'Your Underdog Bonus (if active) grants +2 instead of +1.', type: 'PASSIVE', effectKey: 'enhancedUnderdog', wired: false }
        },
        {
            id: 'pepper_harpy', name: 'Pepper Harpy', tier: 2, hp: 2, atk: 2,
            edges: {
                top: { type: 'White Meat', value: 1 },
                left: { type: 'Spicy Aroma', value: 1 },
                right: { type: 'Fiery Seasoning', value: 1 },
                bottom: { type: 'Fiery Seasoning', value: 1, condition: 'Rushed Kill' }
            },
            companionBonus: { text: 'Explore actions reveal the tile type before you commit AP (free peek).', type: 'PASSIVE', effectKey: 'freePeek', wired: false }
        },

        // --- TIER III (Round 3, HP 3-4, ATK 2-3) ---
        {
            id: 'sulfur_wyrm', name: 'Sulfur Wyrm', tier: 3, hp: 4, atk: 3,
            edges: {
                top: { type: 'Red Meat', value: 2 },
                left: { type: 'Spicy Aroma', value: 2 },
                right: { type: 'Fiery Seasoning', value: 2 },
                bottom: { type: 'Fiery Seasoning', value: 2, condition: 'Dark Hour' }
            },
            companionBonus: { text: 'Immediately gain 2 Reroll Tokens.', type: 'IMMEDIATE', effectKey: 'grantRerollTokens2', wired: true }
        },
        {
            id: 'abyss_angler', name: 'Abyss Angler', tier: 3, hp: 3, atk: 2,
            edges: {
                top: { type: 'Sea Meat', value: 2 },
                left: { type: 'Salty Aroma', value: 1 },
                right: { type: 'Mystic Seasoning', value: 2 },
                bottom: { type: 'Sea Meat', value: 1, condition: 'Desperate Posture' }
            },
            companionBonus: { text: 'Immediately clears Dark Hour and Miasma for the rest of this round.', type: 'IMMEDIATE', effectKey: 'clearFogEffects', wired: true }
        },
        {
            id: 'iron_tortoise', name: 'Iron Tortoise', tier: 3, hp: 4, atk: 2,
            edges: {
                top: { type: 'Exotic Meat', value: 2 },
                left: { type: 'Salty Aroma', value: 1 },
                right: { type: 'Mineral Seasoning', value: 2 },
                bottom: { type: 'Mineral Seasoning', value: 1, condition: 'Careful Kill' }
            },
            companionBonus: { text: 'Immediately restore your Stamina to maximum.', type: 'IMMEDIATE', effectKey: 'fullStaminaRestore', wired: true }
        },
        {
            id: 'cinder_phoenix', name: 'Cinder Phoenix', tier: 3, hp: 4, atk: 3,
            edges: {
                top: { type: 'Red Meat', value: 2 },
                left: { type: 'Spicy Aroma', value: 1 },
                right: { type: 'Fiery Seasoning', value: 2 },
                bottom: { type: 'Fiery Seasoning', value: 2, condition: 'Brutal Kill' }
            },
            companionBonus: { text: 'Immediately gain +1 to your maximum Companion slots for the rest of the game.', type: 'IMMEDIATE', effectKey: 'expandCompanionCap', wired: true }
        }
    ],

    // ================================================================
    // FLAVOR FAMILIES — unify Harmony scoring & Spoilage under one model
    // ================================================================
    families: {
        EMBER:   { name: 'Ember',   color: '#FF4500', meat: 'Red Meat',    aroma: 'Spicy Aroma',  seasoning: 'Fiery Seasoning' },
        TIDE:    { name: 'Tide',    color: '#4A90A4', meat: 'Sea Meat',    aroma: 'Salty Aroma',   seasoning: 'Mineral Seasoning' },
        VERDANT: { name: 'Verdant', color: '#228B22', meat: 'White Meat',  aroma: 'Earthy Aroma',  seasoning: 'Herbal Seasoning' },
        BLOOM:   { name: 'Bloom',   color: '#9370DB', meat: 'Exotic Meat', aroma: 'Sweet Aroma',   seasoning: 'Mystic Seasoning' }
    },

    // Cross-family Spoilage pairs (unified with Family model)
    spoilagePairs: [
        { a: 'EMBER', b: 'BLOOM', message: '🔥 Ember ≠ 🌸 Bloom (Fiery/Spicy vs Sweet/Mystic)' },
        { a: 'TIDE',  b: 'VERDANT', message: '🌊 Tide ≠ 🌿 Verdant (Salty/Mineral vs Earthy/Herbal)' },
        { a: 'BLOOM', b: 'TIDE', message: '🌸 Bloom ≠ 🌊 Tide (Mystic vs Mineral)' }
    ],

    // ================================================================
    // DISHES (36 total) — corner-scored, validated in Session 2
    // ================================================================
    dishes: [
        // ============================================================
        // STANDARD DISHES (22) — generic slots, any Family qualifies
        // Corner formula: TL=base, TR=base+1, BL=base+2 (Expert, needs
        // ingredientCount>=3 or it's structurally locked), BR=base+ingredientCount
        // ============================================================
        {
            id: 'quick_griddle_cakes', name: 'Quick Griddle Cakes', type: 'standard',
            requirements: { meat: 1, aroma: 1 }, ingredientCount: 2,
            corners: { topLeft: 3, topRight: 4, bottomLeft: null, bottomRight: 5 },
            locked: ['bottomLeft'],
            flavorText: '"Fast, cheap, and it works." — The Off-Duty Guard'
        },
        {
            id: 'simple_skewers', name: 'Simple Skewers', type: 'standard',
            requirements: { meat: 2 }, ingredientCount: 2,
            corners: { topLeft: 3, topRight: 4, bottomLeft: null, bottomRight: 5 },
            locked: ['bottomLeft'],
            flavorText: '"No fuss. Just meat on a stick." — The Caravan Guide'
        },
        {
            id: 'broth_of_beginnings', name: 'Broth of Beginnings', type: 'standard',
            requirements: { aroma: 1, seasoning: 1 }, ingredientCount: 2,
            corners: { topLeft: 3, topRight: 4, bottomLeft: null, bottomRight: 5 },
            locked: ['bottomLeft'],
            flavorText: '"Every great chef starts with a good broth." — The Apprentice Cook'
        },
        {
            id: 'hearty_boar_stew', name: 'Hearty Boar Stew', type: 'standard',
            requirements: { meat: 2, seasoning: 1 }, ingredientCount: 3,
            corners: { topLeft: 4, topRight: 5, bottomLeft: 6, bottomRight: 7 },
            flavorText: '"A bowl that tastes like home." — The Weary Watchman'
        },
        {
            id: 'griffin_burger', name: 'Griffin Burger', type: 'standard',
            requirements: { meat: 2, aroma: 1 }, ingredientCount: 3,
            corners: { topLeft: 4, topRight: 5, bottomLeft: 6, bottomRight: 7 },
            flavorText: '"Best seller at every festival stall." — The Market Vendor'
        },
        {
            id: 'salted_catch_platter', name: 'Salted Catch Platter', type: 'standard',
            requirements: { meat: 1, aroma: 2 }, ingredientCount: 3,
            corners: { topLeft: 4, topRight: 5, bottomLeft: 6, bottomRight: 7 },
            flavorText: '"Smells like the docks at dawn." — The Retired Sailor'
        },
        {
            id: 'peppered_roast', name: 'Peppered Roast', type: 'standard',
            requirements: { meat: 2, seasoning: 1 }, ingredientCount: 3,
            corners: { topLeft: 4, topRight: 5, bottomLeft: 6, bottomRight: 7 },
            flavorText: '"Simple, but never boring." — The Innkeeper'
        },
        {
            id: 'sky_serpent_sushi', name: 'Sky Serpent Sushi', type: 'standard',
            requirements: { meat: 1, aroma: 1, seasoning: 1 }, ingredientCount: 3,
            corners: { topLeft: 4, topRight: 5, bottomLeft: 6, bottomRight: 7 },
            flavorText: '"Delicate. Precise. Almost too pretty to eat." — The Royal Food Critic'
        },
        {
            id: 'woodland_medley', name: 'Woodland Medley', type: 'standard',
            requirements: { meat: 1, aroma: 1, seasoning: 1 }, ingredientCount: 3,
            corners: { topLeft: 4, topRight: 5, bottomLeft: 6, bottomRight: 7 },
            flavorText: '"Tastes like a walk through the ruins." — The Old Ranger'
        },
        {
            id: 'travelers_curry', name: "Traveler's Curry", type: 'standard',
            requirements: { aroma: 2, seasoning: 1 }, ingredientCount: 3,
            corners: { topLeft: 4, topRight: 5, bottomLeft: 6, bottomRight: 7 },
            flavorText: '"Every region adds its own twist." — The Wandering Merchant'
        },
        {
            id: 'crystal_broth', name: 'Crystal Broth', type: 'standard',
            requirements: { meat: 1, seasoning: 2 }, ingredientCount: 3,
            corners: { topLeft: 4, topRight: 5, bottomLeft: 6, bottomRight: 7 },
            flavorText: '"You can see straight to the bottom of the bowl." — The Alchemist\'s Assistant'
        },
        {
            id: 'exotic_herb_dumplings', name: 'Exotic Herb Dumplings', type: 'standard',
            requirements: { meat: 2, aroma: 1 }, ingredientCount: 3,
            corners: { topLeft: 5, topRight: 6, bottomLeft: 7, bottomRight: 8 },
            flavorText: '"I want to taste every corner of the wilderness." — The Traveling Botanist'
        },
        {
            id: 'banquet_ribs', name: 'Banquet Ribs', type: 'standard',
            requirements: { meat: 3, seasoning: 1 }, ingredientCount: 4,
            corners: { topLeft: 6, topRight: 7, bottomLeft: 8, bottomRight: 10 },
            flavorText: '"Bring extra napkins." — The Festival Announcer'
        },
        {
            id: 'grand_aromatic_medley', name: 'Grand Aromatic Medley', type: 'standard',
            requirements: { meat: 1, aroma: 2, seasoning: 1 }, ingredientCount: 4,
            corners: { topLeft: 6, topRight: 7, bottomLeft: 8, bottomRight: 10 },
            flavorText: '"Every aroma the wilderness has to offer, in one bowl." — The Traveling Botanist'
        },
        {
            id: 'feast_of_the_hunt', name: 'Feast of the Hunt', type: 'standard',
            requirements: { meat: 2, aroma: 1, seasoning: 1 }, ingredientCount: 4,
            corners: { topLeft: 6, topRight: 7, bottomLeft: 8, bottomRight: 10 },
            flavorText: '"A dish worthy of the day\'s catch." — The Hunt Master'
        },
        {
            id: 'deep_forest_platter', name: 'Deep Forest Platter', type: 'standard',
            requirements: { aroma: 2, seasoning: 2 }, ingredientCount: 4,
            corners: { topLeft: 6, topRight: 7, bottomLeft: 8, bottomRight: 10 },
            flavorText: '"You can taste the moss." — The Hermit Botanist'
        },
        {
            id: 'underdogs_delight', name: "Underdog's Delight", type: 'standard',
            requirements: { meat: 1, aroma: 1 }, ingredientCount: 2,
            corners: { topLeft: 4, topRight: 5, bottomLeft: null, bottomRight: 6 },
            locked: ['bottomLeft'],
            special: { rule: 'catchup_flat', text: '+2 pts if you have fewer Gourmet Points than any opponent when scored' },
            flavorText: '"Everyone loves a comeback story." — The Tavern Regular'
        },
        {
            id: 'scrappy_surprise', name: 'Scrappy Surprise', type: 'standard',
            requirements: { meat: 2, seasoning: 1 }, ingredientCount: 3,
            corners: { topLeft: 5, topRight: 6, bottomLeft: 7, bottomRight: 8 },
            special: { rule: 'catchup_scaling', text: '+1 pt per point behind the leader (max +3)' },
            flavorText: '"Made from whatever was left in the pantry." — The Scullery Cook'
        },
        {
            id: 'master_hunters_banquet', name: "Master Hunter's Banquet", type: 'standard',
            requirements: { meat: 2, aroma: 1, seasoning: 1 }, ingredientCount: 4,
            corners: { topLeft: 6, topRight: 7, bottomLeft: 8, bottomRight: 10 },
            special: { rule: 'clean_kill_bonus', text: '+1 pt per Clean-Kill ingredient used (max +3)' },
            flavorText: '"He judges the hunter, not just the flavor." — The Royal Food Critic'
        },
        {
            id: 'guardians_tribute', name: "Guardian's Tribute", type: 'standard',
            requirements: { meat: 1, aroma: 1, seasoning: 1 }, ingredientCount: 3,
            corners: { topLeft: 5, topRight: 6, bottomLeft: 7, bottomRight: 8 },
            special: { rule: 'tame_bonus', text: '+2 pts if you have Tamed at least 1 monster this game' },
            flavorText: '"Offered in thanks, not in conquest." — The Shrine Keeper'
        },
        {
            id: 'final_course_crucible', name: 'Final Course: The Crucible', type: 'standard',
            requirements: { meat: 2, seasoning: 2 }, ingredientCount: 4,
            corners: { topLeft: 7, topRight: 8, bottomLeft: 9, bottomRight: 11 },
            special: { rule: 'round_restriction', text: 'May only be completed during Round 3' },
            flavorText: '"Where the first monster dish was ever made." — Ancient Inscription'
        },
        {
            id: 'emperors_feast', name: "The Emperor's Feast", type: 'standard',
            requirements: { meat: 2, aroma: 2, seasoning: 1 }, ingredientCount: 5,
            corners: { topLeft: 8, topRight: 9, bottomLeft: 10, bottomRight: 13 },
            special: { rule: 'dish_steal', text: 'Legendary: if another player already completed this dish, you score at the topLeft (No Harmony) value instead, regardless of your actual Harmony' },
            flavorText: '"Fit for a king — but only the first cook gets the credit." — The Royal Steward'
        },

        // ============================================================
        // SIGNATURE DISHES (8) — Family-locked, only bottomRight active.
        // 2 dishes per Family for thematic/mechanical symmetry.
        // ============================================================
        {
            id: 'inferno_meatballs', name: 'Inferno Meatballs', type: 'signature',
            requiredFamily: 'EMBER',
            requirements: { meat: 2, seasoning: 1 }, ingredientCount: 3,
            corners: { topLeft: null, topRight: null, bottomLeft: null, bottomRight: 9 },
            locked: ['topLeft', 'topRight', 'bottomLeft'],
            flavorText: '"Only extremely spicy food is worth eating." — The Hungry Blacksmith'
        },
        {
            id: 'ember_glazed_ribs', name: 'Ember-Glazed Ribs', type: 'signature',
            requiredFamily: 'EMBER',
            requirements: { meat: 3 }, ingredientCount: 3,
            corners: { topLeft: null, topRight: null, bottomLeft: null, bottomRight: 9 },
            locked: ['topLeft', 'topRight', 'bottomLeft'],
            flavorText: '"If it doesn\'t sear, it doesn\'t count." — The Forge Cook'
        },
        {
            id: 'tidewater_bisque', name: 'Tidewater Bisque', type: 'signature',
            requiredFamily: 'TIDE',
            requirements: { meat: 1, seasoning: 2 }, ingredientCount: 3,
            corners: { topLeft: null, topRight: null, bottomLeft: null, bottomRight: 9 },
            locked: ['topLeft', 'topRight', 'bottomLeft'],
            flavorText: '"Tastes like the tide going out." — The Frost Merchant'
        },
        {
            id: 'deep_current_platter', name: 'Deep Current Platter', type: 'signature',
            requiredFamily: 'TIDE',
            requirements: { meat: 2, aroma: 2 }, ingredientCount: 4,
            corners: { topLeft: null, topRight: null, bottomLeft: null, bottomRight: 11 },
            locked: ['topLeft', 'topRight', 'bottomLeft'],
            flavorText: '"Everything on this plate came from below the waves." — The Frost Merchant'
        },
        {
            id: 'verdant_garden_roast', name: 'Verdant Garden Roast', type: 'signature',
            requiredFamily: 'VERDANT',
            requirements: { meat: 2, aroma: 1 }, ingredientCount: 3,
            corners: { topLeft: null, topRight: null, bottomLeft: null, bottomRight: 9 },
            locked: ['topLeft', 'topRight', 'bottomLeft'],
            flavorText: '"Grown, not hunted — but no less alive." — The Herbalist'
        },
        {
            id: 'herbwood_terrine', name: 'Herbwood Terrine', type: 'signature',
            requiredFamily: 'VERDANT',
            requirements: { meat: 1, aroma: 1, seasoning: 1 }, ingredientCount: 3,
            corners: { topLeft: null, topRight: null, bottomLeft: null, bottomRight: 9 },
            locked: ['topLeft', 'topRight', 'bottomLeft'],
            flavorText: '"Earthy. Grounded. Honest food." — The Herbalist'
        },
        {
            id: 'bloomtide_nectar_cake', name: 'Bloomtide Nectar Cake', type: 'signature',
            requiredFamily: 'BLOOM',
            requirements: { aroma: 2, seasoning: 1 }, ingredientCount: 3,
            corners: { topLeft: null, topRight: null, bottomLeft: null, bottomRight: 9 },
            locked: ['topLeft', 'topRight', 'bottomLeft'],
            flavorText: '"Too pretty to eat, and yet—" — The Court Alchemist'
        },
        {
            id: 'mystic_petal_confection', name: 'Mystic Petal Confection', type: 'signature',
            requiredFamily: 'BLOOM',
            requirements: { meat: 1, aroma: 2 }, ingredientCount: 3,
            corners: { topLeft: null, topRight: null, bottomLeft: null, bottomRight: 9 },
            locked: ['topLeft', 'topRight', 'bottomLeft'],
            flavorText: '"It hums faintly when you cut into it." — The Court Alchemist'
        },

        // ============================================================
        // WILDCARD DISHES (6) — flexible, low-value safety valve.
        // All four corners active (never locked).
        // ============================================================
        {
            id: 'kitchen_sink_surprise', name: 'Kitchen Sink Surprise', type: 'wildcard',
            requirements: { meat: 2, aroma: 1, seasoning: 1 }, ingredientCount: 4,
            corners: { topLeft: 3, topRight: 4, bottomLeft: 5, bottomRight: 7 },
            flavorText: '"Whatever\'s fresh. Surprise me." — Anonymous Adventurer'
        },
        {
            id: 'mystery_meatball_medley', name: 'Mystery Meatball Medley', type: 'wildcard',
            requirements: { meat: 3 }, ingredientCount: 3,
            note: 'Must use 3 different Meat types',
            corners: { topLeft: 4, topRight: 5, bottomLeft: 6, bottomRight: 7 },
            flavorText: '"You never know what\'s inside until you bite." — The Street Vendor'
        },
        {
            id: 'aromatic_sampler', name: 'Aromatic Sampler', type: 'wildcard',
            requirements: { aroma: 3 }, ingredientCount: 3,
            note: 'Must use 3 different Aroma types',
            corners: { topLeft: 4, topRight: 5, bottomLeft: 6, bottomRight: 7 },
            flavorText: '"Close your eyes and guess." — The Perfumer'
        },
        {
            id: 'spice_rack_special', name: 'Spice Rack Special', type: 'wildcard',
            requirements: { seasoning: 3 }, ingredientCount: 3,
            note: 'Must use 3 different Seasoning types',
            corners: { topLeft: 4, topRight: 5, bottomLeft: 6, bottomRight: 7 },
            flavorText: '"Not for the faint of tongue." — The Spice Trader'
        },
        {
            id: 'quick_snack', name: 'Quick Snack', type: 'wildcard',
            requirements: { meat: 1, aromaOrSeasoning: 1 }, ingredientCount: 2,
            corners: { topLeft: 2, topRight: 3, bottomLeft: null, bottomRight: 4 },
            locked: ['bottomLeft'],
            flavorText: '"Eaten standing up, between fights." — Anonymous Adventurer'
        },
        {
            id: 'exotic_experiment', name: 'Exotic Experiment', type: 'wildcard',
            requirements: { exoticMeat: 1, any: 2 }, ingredientCount: 3,
            note: 'Requires at least 1 Exotic Meat',
            corners: { topLeft: 5, topRight: 6, bottomLeft: 7, bottomRight: 8 },
            flavorText: '"I have no idea what this is. Let\'s find out." — The Reckless Chef'
        }
    ],

    // Location Tiles (25 for 5x5 final round)


    // ================================================================
    // LOCATION TILES — expanded set, per-round counts
    // ================================================================
    locationTypes: [
        { id: 'ruin', name: 'Ruins', type: 'monster', icon: '⚔️', introducedRound: 1 },
        { id: 'strange', name: 'Strange Place', type: 'fog', icon: '🌫️', introducedRound: 1 },
        { id: 'butcher', name: 'Butcher Shop', type: 'shop', icon: '🔪', introducedRound: 1 },
        { id: 'aromaist', name: 'Aromaist Lab', type: 'shop', icon: '🧪', introducedRound: 1 },
        { id: 'seasoning', name: 'Seasoning Mill', type: 'shop', icon: '🌶️', introducedRound: 1 },
        { id: 'merchant', name: "Merchant's Camp", type: 'utility', icon: '🏕️', introducedRound: 2,
            effect: 'Act here: sell excess ingredients (2:1 conversion), buy Tools, or use Ingredient Insurance.' },
        { id: 'well', name: 'Magic Well', type: 'utility', icon: '💧', introducedRound: 2,
            effect: 'Act here: full Stamina restore + gain 1 Reroll Token, OR cleanse one spoilage-flagged ingredient.' },
        { id: 'watchtower', name: 'Old Watchtower', type: 'utility', icon: '🗼', introducedRound: 2,
            effect: 'Act here: reveal 2 additional adjacent tiles for free (no AP cost).' },
        { id: 'kitchen', name: 'Abandoned Kitchen', type: 'utility', icon: '🍳', introducedRound: 3,
            effect: 'Act here: complete a Wildcard Dish immediately, no shop needed.' },
        { id: 'shrine', name: 'Shrine of the Fog', type: 'utility', icon: '⛩️', introducedRound: 3,
            effect: "Act here: peek at the Crucible's monster draw before committing, OR guarantee your next kill is Clean." },
        { id: 'crucible', name: 'The Crucible', type: 'special', icon: '🔥', introducedRound: 3,
            effect: 'Draw 2 monsters, choose 1. Forced Brutal kill. Any edge including Bottom. Check spoilage twice.' }
    ],

    // Location counts per round grid — SESSION 6: bumped up one size step
    // (4x4/5x5/6x6 instead of 3x3/4x4/5x5), motivated by the simulation
    // finding that turns-per-player collapses badly at higher player counts
    // on small maps. Also gives Aromaist/Seasoning Mill a 2nd copy at
    // Round 3 (previously stuck at 1 forever, a bottleneck rather than
    // tension once maps this size), and phases utility tiles in from
    // Round 1 instead of Round 2.
    locationCounts: {
        1: { // 4x4 = 16 tiles
            ruin: 7, butcher: 1, aromaist: 1, seasoning: 1, strange: 4,
            merchant: 1, well: 1
        },
        2: { // 5x5 = 25 tiles
            ruin: 10, butcher: 2, aromaist: 1, seasoning: 1, strange: 5,
            merchant: 2, well: 1, watchtower: 1, kitchen: 1, shrine: 1
        },
        3: { // 6x6 = 36 tiles
            ruin: 15, butcher: 2, aromaist: 2, seasoning: 2, strange: 6,
            merchant: 2, well: 2, watchtower: 2, kitchen: 1, shrine: 1, crucible: 1
        }
    },

    // ================================================================
    // RANDOM MAP GENERATION — SESSION 6: replaces the old fixed
    // mapLayouts templates. Maps are randomized each game; only the 4
    // corners are guaranteed Ruins (every player gets an immediate first
    // action). Everything else is shuffled from the counts above.
    // ================================================================
    generateRandomLayout(round) {
        const counts = { ...this.locationCounts[round] };
        const size = this.constants.ROUND_GRIDS[round].size;
        const totalTiles = size * size;

        // Reserve the 4 corners as Ruin, remove them from the shuffle pool
        counts.ruin -= 4;

        const pool = [];
        Object.entries(counts).forEach(([type, count]) => {
            for (let i = 0; i < count; i++) pool.push(type);
        });

        // Fisher-Yates shuffle
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        const grid = [];
        let poolIndex = 0;
        for (let r = 0; r < size; r++) {
            const row = [];
            for (let c = 0; c < size; c++) {
                const isCorner = (r === 0 || r === size - 1) && (c === 0 || c === size - 1);
                row.push(isCorner ? 'ruin' : pool[poolIndex++]);
            }
            grid.push(row);
        }
        return grid;
    },

    // Old fixed mapLayouts templates — DEPRECATED, superseded by
    // generateRandomLayout() above. Kept only for historical reference;
    // no code reads this anymore.
    _mapLayoutsLegacy_UNUSED: {
        1: { // 3x3 — Round 1, Basic tier, always Clean
            grid: [
                ['ruin',     'strange',  'ruin'],
                ['butcher',  'aromaist', 'seasoning'],
                ['ruin',     'strange',  'ruin']
            ],
            designNote: 'Shops form a deliberate central row — reachable from any corner in exactly 2 moves. Teaches the Hunt→Extract loop fast with minimal travel friction. All 4 corners are Ruins so every starting player has an immediate action.'
        },
        2: { // 4x4 — Round 2, Standard tier, kill states begin
            grid: [
                ['ruin',     'strange',   'watchtower', 'ruin'],
                ['butcher',  'ruin',      'ruin',        'aromaist'],
                ['merchant', 'strange',   'strange',     'well'],
                ['ruin',     'seasoning', 'butcher',     'ruin']
            ],
            designNote: 'Butcher (top-left region + bottom-center) and Aromaist (right edge) sit apart deliberately. Seasoning Mill remains the sole scarce shop — placed adjacent to a corner but off the natural diagonal path, making it the clearest "detour or skip" decision each game. Watchtower and Well sit on opposite top/bottom edges so scouting and resting compete for different routes rather than stacking. Corners remain Ruins.'
        },
        3: { // 5x5 — Round 3, Expert tier, The Crucible
            grid: [
                ['ruin',     'strange',   'ruin',       'strange',  'ruin'],
                ['butcher',  'ruin',      'watchtower', 'ruin',     'aromaist'],
                ['strange',  'merchant',  'crucible',   'ruin',     'strange'],
                ['ruin',     'shrine',    'butcher',    'kitchen',  'merchant'],
                ['ruin',     'seasoning', 'strange',    'well',     'ruin']
            ],
            designNote: 'The Crucible sits at the exact geometric center (2,2) — every starting corner is equidistant, keeping the endgame race fair regardless of starting position. Butcher and Aromaist remain on opposite edges (row 1). Seasoning Mill sits alone in the bottom row, the single hardest shop to reach efficiently — by design, the sharpest resource-planning bottleneck in the game. Shrine of the Fog sits one step from the Crucible approach (a small mercy before the highest-risk zone). Corners remain Ruins for consistency across all 3 rounds.'
        }
    },

    // Fog Cards (12 total)
    fogCards: [
        { id: 'dark_hour', name: 'Dark Hour Descends', effect: 'Dark Hour begins until round end', count: 2 },
        { id: 'miasma', name: 'Lingering Miasma', effect: 'All extractions -1 (min 1) this round', count: 2 },
        { id: 'migration', name: 'Monster Migration', effect: 'Place facedown monster on adjacent Ruin', count: 2 },
        { id: 'opportunity', name: 'Hidden Opportunity', effect: 'Ignore spoilage once this round', count: 1 },
        { id: 'collapsed', name: 'Collapsed Path', effect: 'One tile blocked this round', count: 2 },
        { id: 'false_calm', name: 'False Calm', effect: 'No effect', count: 3 }
    ],

    // Tools (6 total) — costs denominated in ingredient tokens.
    // REVAMPED: each tool now also touches Stamina, since that's the core
    // tempo resource introduced in Session 2. Previously tools only
    // modified kill-state access, which left them disconnected from the
    // game's actual moment-to-moment tension.
    tools: [
        {
            id: 'net', name: 'Net',
            cost: { type: 'any_different', count: 2 },
            effect: 'Upgrade Rushed → Clean if monster HP ≤ 2',
            staminaInteraction: 'No Stamina cost change — Net is about precision, not effort.',
            flavorText: '"Slow enough to be safe, light enough to not tire your arms." — Trapper Tim'
        },
        {
            id: 'spear', name: 'Spear',
            cost: { 'Any Meat': 1, 'Any Aroma': 1 },
            effect: 'Choose Clean OR Rushed',
            staminaInteraction: 'If you choose Rushed with a Spear, refund 1 extra Stamina (total +2) — the reach keeps you out of danger.',
            flavorText: '"Distance is its own kind of safety." — Hunter Hank'
        },
        {
            id: 'bow', name: 'Bow',
            cost: { 'Any Meat': 1, 'Any Seasoning': 1 },
            effect: 'Force Rushed, ignore monster reaction',
            staminaInteraction: 'Rushed refund (+1 Stamina) still applies as normal.',
            flavorText: '"One shot. No wasted breath." — Tracker Tessa'
        },
        {
            id: 'cleaver', name: 'Cleaver',
            cost: { 'Any Meat': 2, 'Any Seasoning': 1 },
            effect: 'Force Brutal',
            staminaInteraction: 'If wielded by Butcher Bob, this simply confirms his passive (Brutal already costs him 0 Stamina). For any other character, Brutal still costs the normal 1 Stamina.',
            flavorText: '"Not a knife. A conversation-ender." — Butcher Bob'
        },
        {
            id: 'hammer', name: 'Hammer',
            cost: { type: 'any', count: 3 },
            effect: 'Brutal + tool exhausts after use',
            staminaInteraction: 'Costs 1 EXTRA Stamina on top of the normal Brutal cost (2 total) — overwhelming force is exhausting even for the strong.',
            flavorText: '"You only need to swing it once. You will only want to swing it once." — Butcher Bob'
        },
        {
            id: 'trap', name: 'Trap',
            cost: { 'Any Aroma': 1, 'Any Seasoning': 1 },
            effect: 'Careful if monster was facedown',
            staminaInteraction: 'Hunting a facedown (freshly revealed) monster with a Trap equipped costs 0 Stamina entirely — the trap does the work, not you.',
            tameBonus: 2, // SESSION 10: +2 effective ATK specifically for Tame attempts — a net/trap is the archetypal live-capture tool, thematically the natural fit
            flavorText: '"Why fight the monster when you can convince it to defeat itself?" — Trapper Tim'
        }
    ],

    // ================================================================
    // GAME CONSTANTS
    // ================================================================
    constants: {
        SPOILAGE_RULES_LEGACY_NOTE: 'Superseded by families/spoilagePairs above — kept only for old UI text references.',
        EXOTIC_SPOILAGE: 'Exotic Meat spoils at round end if unused',

        KILL_STATES: {
            CAREFUL:  { icon: '🗡️',  name: 'Careful',  effect: 'Locked to lowest edge only', staminaCost: 1 },
            BOLD:     { icon: '🗡️~', name: 'Bold',     effect: 'Normal edge at whichever shop you extract at', staminaCost: 0, staminaRefund: 1 },
            DESPERATE:{ icon: '🛠️',  name: 'Desperate',effect: 'Normal edge or Bottom bonus, check spoilage 2x', staminaCost: 1 },
            TAMED:    { icon: '🤝',  name: 'Tamed',    effect: 'Guaranteed lowest edge, monster becomes permanent Companion, never spoils', staminaCost: 1 }
        },

        INGREDIENT_TYPES: {
            MEATS: ['Red Meat', 'White Meat', 'Exotic Meat', 'Sea Meat'],
            AROMAS: ['Earthy Aroma', 'Sweet Aroma', 'Spicy Aroma', 'Salty Aroma'],
            SEASONINGS: ['Herbal Seasoning', 'Mystic Seasoning', 'Fiery Seasoning', 'Mineral Seasoning']
        },

        // Ingredient tokens: shared supply, ~8 copies of each of the 12 types
        TOKEN_SUPPLY_PER_TYPE: 8,

        // SESSION 7: Companion Type System
        // - Cap: at most 3 PERMANENT Companions per hero at once.
        // - Type/conflict: a Companion's "type" is the dominant Flavor
        //   Family among its monster's top/left/right edges (majority
        //   vote — verified no monster produces a 3-way tie). A hero
        //   cannot hold two Companions whose Families conflict (same
        //   pairs as Spoilage: Ember≠Bloom, Tide≠Verdant, Bloom≠Tide).
        // - Behavior split by monster tier:
        //     Tier I/II  -> PASSIVE: permanent, occupies one of the 3
        //                   slots, subject to the Family-conflict rule.
        //     Tier III   -> ONE_SHOT: grants its bonus once immediately,
        //                   then the monster DEPARTS (never occupies a
        //                   slot, never subject to the conflict rule,
        //                   since it doesn't stick around to conflict
        //                   with anything). Recorded in a separate
        //                   history list for ending/scoring purposes.
        MAX_COMPANIONS: 3,

        // SESSION 8: the actual per-Ruin hunt cap, moved from bot-simulation-only
        // enforcement (simulate.js) into the real engine, where it always should
        // have lived. Without this, a player can camp a single Ruin indefinitely.
        RUIN_HUNT_CAP: 3,

        // SESSION 10: Taming requires a HIGHER ATK threshold than killing —
        // subduing a monster alive is harder than simply defeating it.
        // Without tool help, this is severe: base ATK values are 3/2/1/2
        // across the 4 characters, and the weakest monster is HP 1, so
        // only Butcher Bob (ATK 3) can Tame anything at all unassisted
        // (and only the 3 weakest Tier I monsters). Everyone else needs
        // the Trap tool's tameBonus (see tools array) or a future
        // equivalent to ever Tame anything.
        TAME_ATK_BUFFER: 2,

        ROUND_GRIDS: {
            1: { size: 4, tiles: 16, killStates: false, staminaActive: false, apPool: 2 },
            2: { size: 5, tiles: 25, killStates: true,  staminaActive: true,  apPool: 3 },
            3: { size: 6, tiles: 36, killStates: true,  staminaActive: true,  apPool: 3 }
        },

        STAMINA: {
            defaultMax: 3,
            huntCost: 1,
            restRecoverPerAP: 1,
            wellFullRestore: true,
            atZeroStamina: 'Only Rushed or Brutal kills possible',
            failedHuntPenalty: 'Lose Stamina equal to Monster ATK (min 1)'
        },

        AP_ACTIONS: {
            explore: { cost: 1, effect: 'Reveal one adjacent unrevealed tile' },
            move:    { cost: 1, effect: 'Move to an adjacent already-revealed tile' },
            act:     { cost: 1, effect: 'Use current tile ability (Hunt, Extract, trigger Fog, etc.)' },
            rest:    { cost: 1, effect: 'Recover +1 Stamina' }
        },

        TAME: {
            description: 'Alternative to killing. Same success check (ATK ≥ Monster HP). On success, monster becomes a permanent Companion instead of being discarded.',
            yieldsOnTame: 'One guaranteed lowest-value edge ingredient immediately, no spoilage risk',
            afterTame: 'Monster never extracts again; Companion Bonus becomes active for rest of game',
            countsToward: ['Guardian Chef ending', "Guardian's Tribute dish bonus", 'relevant End-Game Tasks']
        },

        PLAYER_COUNT_RULES: {
            1: { rounds: [1, 2], coopOnly: true },
            2: { rounds: [1, 2], recommended: true },
            3: { rounds: [1, 2, 3], recommended: true },
            4: { rounds: [1, 2, 3], useSimultaneous: true }
        },

        COOP_SETTINGS: {
            EASY:   { festivalDishes: 6,  startingIngredients: 3, trackSpeed: 0.5 },
            NORMAL: { festivalDishes: 8,  startingIngredients: 2, trackSpeed: 1 },
            HARD:   { festivalDishes: 10, startingIngredients: 1, trackSpeed: 1 },
            EXPERT: { festivalDishes: 12, startingIngredients: 0, trackSpeed: 2 }
        }
    }
};

// ---------------------------------------------------------------------
// Harmony Resolution — determines which dish corner to score
// ---------------------------------------------------------------------
function resolveDishScore(dish, spentIngredients, expertTier = false) {
    const familyOf = (ingredientName) => {
        for (const [key, fam] of Object.entries(GAME_DATA.families)) {
            if (fam.meat === ingredientName || fam.aroma === ingredientName || fam.seasoning === ingredientName) {
                return key;
            }
        }
        return null;
    };

    const familyCounts = {};
    spentIngredients.forEach(ing => {
        const fam = familyOf(ing);
        if (fam) familyCounts[fam] = (familyCounts[fam] || 0) + 1;
    });

    const distinctFamilies = Object.keys(familyCounts).length;
    const total = spentIngredients.length;
    const maxCount = Math.max(...Object.values(familyCounts));
    const dominantFamily = Object.keys(familyCounts).find(f => familyCounts[f] === maxCount);

    if (dish.type === 'signature') {
        const isPerfect = distinctFamilies === 1 && dominantFamily === dish.requiredFamily;
        if (!isPerfect) {
            return { corner: null, score: 0, valid: false,
                      reason: `Requires all ingredients to be ${GAME_DATA.families[dish.requiredFamily].name} Family` };
        }
        return { corner: 'bottomRight', score: dish.corners.bottomRight, valid: true, familyBreakdown: familyCounts };
    }

    let corner;
    if (distinctFamilies === 1) {
        corner = 'bottomRight';
    } else if (expertTier && distinctFamilies >= 3) {
        corner = 'bottomLeft';
    } else if (maxCount > total / 2) {
        corner = 'topRight';
    } else {
        corner = 'topLeft';
    }

    return { corner, score: dish.corners[corner], valid: true, familyBreakdown: familyCounts };
}

// ---------------------------------------------------------------------
// Spoilage Check — uses the same Family model as Harmony
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// Companion Family — dominant Family among a monster's top/left/right
// edges (majority vote). Used for the Companion conflict rule (Session 7).
// Verified via a one-time check that no monster among the current 20
// produces a 3-way tie across 3 different Families; ties are still
// handled defensively by falling back to the top edge's Family.
// ---------------------------------------------------------------------
function getCompanionFamily(monster) {
    const familyOf = (ingredientName) => {
        for (const [key, fam] of Object.entries(GAME_DATA.families)) {
            if (fam.meat === ingredientName || fam.aroma === ingredientName || fam.seasoning === ingredientName) {
                return key;
            }
        }
        return null;
    };
    const fams = ['top', 'left', 'right'].map(k => familyOf(monster.edges[k].type));
    const counts = {};
    fams.forEach(f => { if (f) counts[f] = (counts[f] || 0) + 1; });
    const maxCount = Math.max(...Object.values(counts));
    const winners = Object.keys(counts).filter(k => counts[k] === maxCount);
    return winners.length === 1 ? winners[0] : fams[0]; // defensive tiebreak, not expected to trigger
}

function checkSpoilage(inventoryIngredientNames) {
    const familyOf = (ingredientName) => {
        for (const [key, fam] of Object.entries(GAME_DATA.families)) {
            if (fam.meat === ingredientName || fam.aroma === ingredientName || fam.seasoning === ingredientName) {
                return key;
            }
        }
        return null;
    };
    const familiesPresent = new Set(inventoryIngredientNames.map(familyOf).filter(Boolean));
    const triggered = [];
    GAME_DATA.spoilagePairs.forEach(pair => {
        if (familiesPresent.has(pair.a) && familiesPresent.has(pair.b)) {
            triggered.push(pair);
        }
    });
    return triggered;
}

// ---------------------------------------------------------------------
// Hunt Resolution — combat + Stamina cost/penalty, character passives applied
// ---------------------------------------------------------------------
// character: character object from GAME_DATA.characters (with any equipment/tool ATK bonus pre-added into playerAtk)
// monster: monster object from GAME_DATA.monsters
// currentStamina: player's current Stamina before this Hunt
// killStateChosen: 'CAREFUL' | 'BOLD' | 'DESPERATE' | 'TAMED'
// round: 1, 2, or 3 (Round 1 ignores Stamina entirely per Basic tier rule)
function resolveHunt(character, playerAtk, monster, currentStamina, killStateChosen, round) {
    // SESSION 10: Taming requires ATK >= HP + buffer (harder than a normal
    // kill, which only needs ATK >= HP) — subduing something alive is a
    // higher bar than defeating it. Round 1 never offers Tame at all
    // (Basic tier is always Careful), so this only matters Round 2+.
    const requiredAtk = killStateChosen === 'TAMED'
        ? monster.hp + GAME_DATA.constants.TAME_ATK_BUFFER
        : monster.hp;
    const success = playerAtk >= requiredAtk;

    if (round === 1) {
        // Basic tier: always Careful, no Stamina interaction at all
        return {
            success,
            staminaAfter: currentStamina,
            killState: success ? 'CAREFUL' : null,
            note: 'Round 1: Stamina inactive, always Careful on success.'
        };
    }

    if (!success) {
        const penalty = Math.max(1, monster.atk || 1);
        return {
            success: false,
            staminaAfter: Math.max(0, currentStamina - penalty),
            killState: null,
            note: `Failed Hunt: lost ${penalty} Stamina (Monster ATK).`
        };
    }

    // Determine Stamina cost for this kill state, applying character passives
    let staminaDelta = 0;
    const ks = GAME_DATA.constants.KILL_STATES[killStateChosen];
    staminaDelta -= (ks.staminaCost || 0);
    staminaDelta += (ks.staminaRefund || 0);

    // Butcher Bob: Desperate free, Careful +1 extra cost
    if (character.id === 'butcher_bob') {
        if (killStateChosen === 'DESPERATE') staminaDelta += 1; // refunds the 1 it would have cost
        if (killStateChosen === 'CAREFUL') staminaDelta -= 1;  // extra cost
    }

    // Trapper Tim: facedown-immediate hunts ignore Stamina cost for Careful
    // (engine-level check for "facedown immediate" happens outside this function;
    //  this stub assumes caller passes a flag if applicable — left as an extension point)

    const staminaAfter = Math.max(0, Math.min(character.maxStamina, currentStamina + staminaDelta));

    return {
        success: true,
        staminaAfter,
        killState: killStateChosen,
        note: `Hunt succeeded. Stamina ${currentStamina} → ${staminaAfter}.`
    };
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GAME_DATA, resolveDishScore, checkSpoilage, resolveHunt, getCompanionFamily };
}
