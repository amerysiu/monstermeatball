// Monster Meatball v1 automated trial simulation
// Run: node v1-trial-sim.js
// Loads the current engine plus v1-rule-fixes.js and runs 20 games for
// 1P/2P/3P/4P = 80 total trials.

const { GameEngine } = require('./game-engine.js');
require('./v1-rule-fixes.js');
const { GAME_DATA } = require('./game-data.js');

const CHARACTERS = GAME_DATA.characters.map(c => c.id);
const TRIALS_PER_COUNT = 20;
const MAX_TURNS = 250;

function seedRandom(seed) {
    let s = seed >>> 0;
    return function() {
        s += 0x6D2B79F5;
        let t = s;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
function chooseRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function posKey(p) { return `${p.row},${p.col}`; }
function allCells(engine, predicate) {
    const out = [];
    for (let r=0;r<engine.gridSize;r++) for(let c=0;c<engine.gridSize;c++) {
        if (!predicate || predicate(engine.grid[r][c],r,c)) out.push({row:r,col:c});
    }
    return out;
}
function adjacent(engine,p,predicate) {
    return allCells(engine,(tile,r,c)=>Math.abs(r-p.row)+Math.abs(c-p.col)===1 && (!predicate || predicate(tile,r,c)));
}
function makeConfigs(n,gameNo) {
    return Array.from({length:n},(_,i)=>({id:`p${i+1}`,name:`P${i+1}`,characterId:CHARACTERS[(gameNo+i)%CHARACTERS.length]}));
}
function makeGame(n,gameNo) {
    const game=new GameEngine(makeConfigs(n,gameNo),{tier:'standard'});
    if(!GameEngine.v1RuleFixesInstalled) throw new Error('v1 rule patch was not installed');
    game.players.forEach(p=>p.visitedTiles=new Set([posKey(p.position)]));
    return game;
}
function tryCompleteDish(game,player) {
    if(!game.completeDish) return false;
    const dishes=GAME_DATA.dishes||GAME_DATA.gourmets||[];
    for(const d of dishes) {
        const id=d.id||d.name, req=d.ingredients||d.requirements;
        if(!req) continue;
        const tokens=player.ingredientTokens||{};
        if(!Object.entries(req).every(([type,count])=>(tokens[type]||0)>=count)) continue;
        const ingredients=[];
        for(const [type,count] of Object.entries(req)) for(let i=0;i<count;i++) ingredients.push(type);
        const result=game.completeDish(id,ingredients);
        if(result?.success) return true;
    }
    return false;
}
function botTurn(game) {
    const p=game.getCurrentPlayer();
    let safety=10;
    while(p.ap>0 && safety-->0) {
        if(tryCompleteDish(game,p)) continue;
        const here=game.grid[p.position.row][p.position.col];
        if(here?.type==='ruin' && !here.exhausted) {
            const states=game.getAvailableKillStates?game.getAvailableKillStates(p):['CAREFUL','BOLD','DESPERATE'];
            const usable=states.filter(s=>s!=='TAMED');
            const preferred=game.round===1?'CAREFUL':chooseRandom(usable.length?usable:['CAREFUL']);
            const r=game.hunt(preferred);
            if(r?.success || r?.reason?.includes('No AP')) continue;
        }
        if(p.capturedMonsters?.length) {
            const shops=adjacent(game,p,t=>['butcher','aromaist','seasoning_mill'].includes(t.type));
            if(shops.length) { const d=chooseRandom(shops); const r=game.move(d.row,d.col); if(r?.success) continue; }
        }
        const unknown=adjacent(game,p,t=>!t.revealed);
        if(unknown.length) { const d=chooseRandom(unknown); const r=game.explore(d.row,d.col); if(r?.success) continue; }
        const visited=p.visitedTiles||new Set(), legal=[];
        for(let r=0;r<game.gridSize;r++) for(let c=0;c<game.gridSize;c++) {
            if(Math.abs(r-p.position.row)+Math.abs(c-p.position.col)!==1) continue;
            if(!game.grid[r][c].revealed || visited.has(`${r},${c}`)) continue;
            legal.push({row:r,col:c});
        }
        if(legal.length) { const d=chooseRandom(legal); const r=game.move(d.row,d.col); if(r?.success) continue; }
        const rr=game.rest();
        if(rr?.success) continue;
        break;
    }
}
function playGame(playerCount,gameNo) {
    const originalRandom=Math.random;
    Math.random=seedRandom(0x4D4D0000+playerCount*1000+gameNo);
    const game=makeGame(playerCount,gameNo);
    let turns=0;
    const stats={players:playerCount,gameNo,roundsCompleted:0,turns:0,revealed:0,visited:0,hunts:0,captures:0,tames:0,dishes:0,score:0,fog:0,spoilage:0,deckExhausted:false,roundEndReason:[],noProgressTurns:0,completed:false,error:null};
    try {
        while(turns<MAX_TURNS) {
            const before=JSON.stringify({r:game.round,idx:game.currentPlayerIndex,pos:game.getCurrentPlayer().position,ap:game.getCurrentPlayer().ap});
            botTurn(game);
            const p=game.getCurrentPlayer();
            const ended=game.isRoundOver();
            const after=JSON.stringify({r:game.round,idx:game.currentPlayerIndex,pos:p.position,ap:p.ap});
            if(before===after) stats.noProgressTurns++;
            else stats.noProgressTurns=0;
            if(ended) {
                stats.roundEndReason.push(game.monsterDeck.length===0?'DECK_EXHAUSTION':'BORDER_GATE');
                if(game.round<3) { const ar=game.advanceRound(); if(!ar?.success) break; stats.roundsCompleted=game.round-1; continue; }
                stats.roundsCompleted=3; stats.completed=true; break;
            }
            const er=game.endTurn();
            if(!er?.success && !game.isRoundOver()) break;
            turns++;
        }
        stats.turns=turns;
        stats.revealed=allCells(game,t=>t.revealed).length;
        stats.visited=game.players.reduce((n,p)=>n+(p.visitedTiles?.size||0),0);
        stats.score=Math.max(...game.players.map(p=>p.gourmetPoints));
        stats.deckExhausted=game.monsterDeck.length===0;
        stats.hunts=game.players.reduce((n,p)=>n+p.killLog.CAREFUL+p.killLog.BOLD+p.killLog.DESPERATE,0);
        stats.tames=game.players.reduce((n,p)=>n+p.killLog.TAMED,0);
        stats.captures=game.players.reduce((n,p)=>n+p.capturedMonsters.length,0);
        stats.dishes=game.players.reduce((n,p)=>n+(p.completedDishes?.length||0),0);
        stats.error=stats.completed?null:`Stopped before completing Round 3 (R${game.round})`;
    } catch(e) { stats.error=e.stack||String(e); }
    finally { Math.random=originalRandom; }
    return stats;
}
const all=[];
for(const n of [1,2,3,4]) for(let i=1;i<=TRIALS_PER_COUNT;i++) all.push(playGame(n,i));
function avg(xs){return xs.reduce((a,b)=>a+b,0)/(xs.length||1);}
for(const n of [1,2,3,4]) {
    const rows=all.filter(x=>x.players===n);
    console.log(`\n=== ${n} PLAYER / ${rows.length} TRIALS ===`);
    console.log('completed:',rows.filter(x=>x.completed).length,'/',rows.length);
    console.log('avg turns:',avg(rows.map(x=>x.turns)).toFixed(1));
    console.log('avg score:',avg(rows.map(x=>x.score)).toFixed(1));
    console.log('avg revealed:',avg(rows.map(x=>x.revealed)).toFixed(1));
    console.log('deck exhaustion:',rows.filter(x=>x.deckExhausted).length);
    console.log('errors:',rows.filter(x=>x.error).length);
    console.log('round-end reasons:',Object.fromEntries([...new Set(rows.flatMap(x=>x.roundEndReason))].map(k=>[k,rows.filter(x=>x.roundEndReason.includes(k)).length])));
}
console.log('\n=== RAW TRIAL RESULTS ===');
console.log(JSON.stringify(all,null,2));
