const fs = require("fs");
const path = require("path");
const vm = require("vm");

const gameRoot = fs.existsSync(path.resolve(__dirname, "..", "src", "game", "RuleConfig.js"))
  ? ""
  : "extracted-zips/offline-sanma-mahjong-phase1";
global.window = global;
for (const file of [
  "src/game/RuleConfig.js",
  "src/game/RoundManager.js",
  "src/game/HonbaManager.js",
  "src/game/RankingManager.js",
  "src/game/EndConditionManager.js",
  "src/game/MatchManager.js",
  "src/game/Tile.js",
  "src/game/HandAnalysis.js",
  "src/game/DoraCalculator.js",
  "src/game/YakuAnalysis.js",
  "src/game/ScoreCalculator.js",
  "src/game/Settlement.js",
  "src/game/RiichiManager.js",
  "src/game/KanManager.js",
  "src/game/KitaManager.js",
  "src/game/ActionResolver.js",
  "src/game/CpuStrategy.js",
  "src/game/AssistManager.js",
  "src/game/GameRecord.js",
  "src/game/CallWindow.js",
  "src/game/Wall.js",
  "src/game/Player.js",
  "src/game/GameEngine.js",
]) {
  vm.runInThisContext(fs.readFileSync(path.resolve(__dirname, "..", gameRoot, file), "utf8"), { filename: file });
}

const { TileUtil, RuleConfig, ActionResolver, CallWindow, RiichiManager, KitaManager, Player, GameEngine } = global.Sanma;
let copyIndex = 0;

function tile(code) {
  const honorMap = { east: 1, south: 2, west: 3, north: 4, white: 5, green: 6, red: 7 };
  const suit = honorMap[code] ? "z" : code.slice(-1);
  const rank = honorMap[code] || Number(code.slice(0, -1));
  return TileUtil.createTile(suit, rank, ++copyIndex, false);
}

function hand(codes) {
  return codes.map(tile);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createState(options) {
  const config = RuleConfig.createRuleConfig(options && options.ruleConfig);
  const players = [
    new Player({ id: 0, name: "あなた", seatWind: "east", isHuman: true, points: 35000 }),
    new Player({ id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: 35000 }),
    new Player({ id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: 35000 }),
  ];
  return {
    ruleConfig: config,
    players,
    round: { roundWind: "east", dealerIndex: 0, honba: 0, riichiSticks: 0 },
    turnIndex: 0,
    phase: "human-discard",
    lastDiscard: null,
    wall: { doraIndicators: [], draw: () => tile("1s") },
  };
}

function action(state, id) {
  return ActionResolver.findAction(state, 0, id);
}

const validTsumoState = createState();
validTsumoState.players[0].hand = hand(["1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s", "white", "white", "white", "9m", "9m"]);
assert(action(validTsumoState, "tsumo").enabled, "和了形かつ役ありでツモが有効になりません");
validTsumoState.players[0].hand.pop();
assert(!action(validTsumoState, "tsumo").enabled, "和了形でない手牌のツモが有効です");

const riichiCodes = ["1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s", "east", "east", "east", "9m"];
const riichiState = createState();
riichiState.players[0].hand = hand(riichiCodes);
assert(action(riichiState, "riichi").enabled, "門前聴牌かつ1000点以上でリーチが有効になりません");
riichiState.players[0].points = 900;
assert(!action(riichiState, "riichi").enabled, "1000点未満でリーチが有効です");
riichiState.players[0].points = 35000;
riichiState.players[0].melds.push({ type: "pon", tiles: hand(["white", "white", "white"]), fromPlayerIndex: 1, open: true });
assert(!action(riichiState, "riichi").enabled, "副露済みでリーチが有効です");

const ponState = createState();
ponState.players[0].hand = hand(["white", "white", "1p"]);
ponState.lastDiscard = { playerIndex: 1, tile: tile("white") };
assert(action(ponState, "pon").enabled, "同一牌2枚でポンを検出できません");

const chiState = createState({ ruleConfig: { allowChi: true } });
chiState.players[0].hand = hand(["2p", "4p", "2s", "4s"]);
chiState.lastDiscard = { playerIndex: 2, tile: tile("3p") };
assert(action(chiState, "chi").enabled, "チーありルールで筒子のチーを検出できません");
chiState.ruleConfig.allowChi = false;
assert(!action(chiState, "chi").enabled, "チーなしルールでチーが有効です");
chiState.ruleConfig.allowChi = true;
chiState.lastDiscard = { playerIndex: 2, tile: tile("3m") };
assert(!action(chiState, "chi").enabled, "萬子の順子をチー可能として扱っています");
chiState.lastDiscard = { playerIndex: 2, tile: tile("east") };
assert(!action(chiState, "chi").enabled, "字牌をチー可能として扱っています");

const kitaState = createState({ ruleConfig: { northMode: "kita-dora" } });
kitaState.players[0].hand = hand(["north", "1p"]);
assert(action(kitaState, "kita").enabled, "北抜きルールで北抜きを検出できません");
const kitaResult = KitaManager.extract(kitaState, 0);
assert(kitaResult.applied && kitaState.players[0].kitaTiles.length === 1 && kitaState.players[0].hand.length === 2, "北抜きと補充牌が正しく処理されません");
const disabledNorthState = createState({ ruleConfig: { northMode: "disabled" } });
disabledNorthState.players[0].hand = [];
assert(!action(disabledNorthState, "kita").enabled, "北なしルールで北抜きが有効です");

const ronState = createState();
ronState.players[0].hand = hand(["1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s", "white", "white", "9m", "9m"]);
ronState.lastDiscard = { playerIndex: 2, tile: tile("white") };
assert(action(ronState, "ron").enabled, "役牌を完成させる捨て牌でロンを検出できません");
const callWindow = CallWindow.create(ronState, 0);
assert(callWindow && callWindow.actions[0].id === "ron", "呼び出し窓でロンが最優先になっていません");

const declarationState = createState();
declarationState.players[0].hand = hand(riichiCodes);
const declaration = RiichiManager.declare(declarationState, 0);
assert(declaration.applied && declarationState.players[0].points === 34000 && declarationState.round.riichiSticks === 1, "リーチ棒を正しく処理できません");

const engine = new GameEngine({ ruleConfig: { allowChi: true }, seed: "phase5-call", onChange: function noop() {} });
engine.players[0].hand = hand(["white", "white", "1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s", "9m", "9m"]);
const cpuDiscard = tile("white");
engine.players[1].discards = [cpuDiscard];
engine.lastDiscard = { playerIndex: 1, tile: cpuDiscard };
engine.callWindow = CallWindow.create(engine, 0);
engine.phase = "human-call";
engine.claimHumanCall("pon", 0);
assert(engine.phase === "caller-discard" && engine.players[0].melds.length === 1 && engine.players[0].melds[0].open, "ポン後に副露と打牌番を作れません");
assert(engine.players[1].discards.length === 0, "ポンした牌が河に残っています");

console.log("Phase 5 action resolver tests passed.");
