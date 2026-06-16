const fs = require("fs");
const path = require("path");
const vm = require("vm");

global.window = global;
for (const file of [
  "src/game/RuleConfig.js",
  "src/debug/DebugEventLog.js",
  "src/game/GameStateMachine.js",
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
  "src/game/FuritenManager.js",
  "src/game/RiichiRules.js",
  "src/game/KanRules.js",
  "src/game/EndTurnYakuResolver.js",
  "src/game/SanmaRuleDetails.js",
  "src/game/ActionResolver.js",
  "src/game/CpuStrategy.js",
  "src/game/AssistManager.js",
  "src/game/GameRecord.js",
  "src/game/CallWindow.js",
  "src/game/SeedPolicy.js",
  "src/game/Wall.js",
  "src/game/Player.js",
  "src/game/TileLedger.js",
  "src/game/InvariantChecker.js",
  "src/game/RecoveryManager.js",
  "src/game/DrawContext.js",
  "src/game/RecordFlow.js",
  "src/game/RoundLifecycle.js",
  "src/game/TurnFlow.js",
  "src/game/WinFlow.js",
  "src/game/CallFlow.js",
  "src/game/KanFlow.js",
  "src/game/RecoveryFlow.js",
  "src/game/GameEngine.js",
]) {
  vm.runInThisContext(fs.readFileSync(path.resolve(__dirname, "..", file), "utf8"), { filename: file });
}

const { TileUtil, HandAnalysis, YakuAnalysis, ScoreCalculator, Settlement } = global.Sanma;
let copyIndex = 0;

function tile(code) {
  const honorMap = { east: 1, south: 2, west: 3, north: 4, white: 5, green: 6, red: 7 };
  const suit = honorMap[code] ? "z" : code.slice(-1);
  const rank = honorMap[code] || Number(code.slice(0, -1));
  return TileUtil.createTile(suit, rank, ++copyIndex, false);
}

function calculate(codes, context, overrides) {
  const tiles = codes.map(tile);
  const ruleConfig = Object.assign({ northMode: "kita-dora", kuitan: true, tsumoLoss: false, countedYakuman: true }, overrides || {});
  const agariResult = HandAnalysis.analyzeAgari(tiles, ruleConfig);
  const yakuResult = YakuAnalysis.analyzeYaku({ tiles, ruleConfig, agariResult, context });
  return ScoreCalculator.calculateScore({ tiles, ruleConfig, agariResult, yakuResult, context });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const chiitoitsu = ["1m", "1m", "9m", "9m", "1p", "1p", "2p", "2p", "3s", "3s", "east", "east", "white", "white"];
const nonDealerRon = calculate(chiitoitsu, { winType: "ron", winnerIndex: 1, loserIndex: 2, dealerIndex: 0, seatWind: "south", roundWind: "east", isMenzen: true });
assert(nonDealerRon.fu === 25, "七対子が25符固定ではありません");
assert(nonDealerRon.payments.ron.amount === 1600, "子ロンの支払いが正しく丸められていません");

const dealerRon = calculate(chiitoitsu, { winType: "ron", winnerIndex: 0, loserIndex: 1, dealerIndex: 0, seatWind: "east", roundWind: "east", isMenzen: true });
assert(dealerRon.payments.ron.amount === 2400, "親ロンの支払いが正しく丸められていません");

const kokushi = ["1m", "9m", "1p", "9p", "1s", "9s", "east", "south", "west", "north", "white", "green", "red", "1m"];
const kokushiScore = calculate(kokushi, { winType: "ron", winnerIndex: 0, loserIndex: 1, dealerIndex: 0, seatWind: "east", roundWind: "east", isMenzen: true });
assert(kokushiScore.isYakuman && kokushiScore.limitName === "役満" && kokushiScore.fu === null, "国士無双が役満として計算されていません");

const dragonTriplet = ["1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s", "white", "white", "white", "9m", "9m"];
assert(calculate(dragonTriplet, { winType: "ron", winnerIndex: 1, loserIndex: 2, dealerIndex: 0, seatWind: "south", roundWind: "east", isMenzen: true }).fu === 40, "標準形の符計算が正しくありません");
const openWhiteMeld = { type: "pon", open: true, tiles: [tile("white"), tile("white"), tile("white")] };
const openTripletScore = calculate(dragonTriplet, { winType: "ron", winnerIndex: 1, loserIndex: 2, dealerIndex: 0, seatWind: "south", roundWind: "east", isMenzen: false, melds: [openWhiteMeld] });
assert(openTripletScore.details.some((detail) => detail.includes("么九牌の明刻 4符")), "副露した么九牌の明刻符が正しくありません");
const openWhiteKan = { type: "kan", open: true, tiles: [tile("white"), tile("white"), tile("white"), tile("white")] };
const openKanScore = calculate(dragonTriplet, { winType: "ron", winnerIndex: 1, loserIndex: 2, dealerIndex: 0, seatWind: "south", roundWind: "east", isMenzen: false, melds: [openWhiteKan] });
assert(openKanScore.details.some((detail) => detail.includes("么九牌の明槓 16符")), "副露した么九牌の明槓符が正しくありません");
const shanponRonScore = calculate(dragonTriplet, { winType: "ron", winnerIndex: 1, loserIndex: 2, dealerIndex: 0, seatWind: "south", roundWind: "east", isMenzen: true, waitType: "shanpon", winningTile: tile("white") });
assert(shanponRonScore.details.some((detail) => detail.includes("么九牌の明刻 4符")), "ロンで完成した双碰待ちの刻子を明刻扱いできません");
["kanchan", "penchan", "tanki"].forEach((waitType) => {
  const waitFuScore = calculate(dragonTriplet, { winType: "ron", winnerIndex: 1, loserIndex: 2, dealerIndex: 0, seatWind: "south", roundWind: "east", isMenzen: true, waitType });
  assert(waitFuScore.details.some((detail) => detail.includes("待ち形 2符")), `${waitType}の待ち符が付きません`);
});

const noYaku = ["1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "7s", "8s", "9s", "1m", "1m"];
assert(!calculate(noYaku, { winType: "ron", winnerIndex: 1, loserIndex: 2, dealerIndex: 0, seatWind: "south", roundWind: "east", isMenzen: true }).isValidWin, "役なし和了形が有効になっています");

const limitTiles = chiitoitsu.map(tile);
const limitAgari = HandAnalysis.analyzeAgari(limitTiles, { northMode: "kita-dora" });
function limitAt(han, countedYakuman) {
  return ScoreCalculator.calculateScore({
    tiles: limitTiles,
    ruleConfig: { countedYakuman },
    agariResult: limitAgari,
    yakuResult: { hasYaku: true, totalHan: han, isYakuman: false, yakuman: [], yaku: [] },
    context: { winType: "ron", winnerIndex: 1, loserIndex: 2, dealerIndex: 0, seatWind: "south", roundWind: "east", isMenzen: true },
  }).limitName;
}
assert(limitAt(5, true) === "満貫" && limitAt(6, true) === "跳満" && limitAt(8, true) === "倍満" && limitAt(11, true) === "三倍満" && limitAt(13, true) === "数え役満", "打点区分が正しくありません");

const lossOn = calculate(chiitoitsu, { winType: "tsumo", winnerIndex: 1, dealerIndex: 0, seatWind: "south", roundWind: "east", isMenzen: true }, { tsumoLoss: true });
const lossOff = calculate(chiitoitsu, { winType: "tsumo", winnerIndex: 1, dealerIndex: 0, seatWind: "south", roundWind: "east", isMenzen: true }, { tsumoLoss: false });
assert(lossOn.payments.tsumo.total === 2400 && lossOff.payments.tsumo.total === 3200, "ツモ損設定が支払いへ反映されていません");

const withCounters = calculate(chiitoitsu, { winType: "ron", winnerIndex: 1, loserIndex: 2, dealerIndex: 0, seatWind: "south", roundWind: "east", isMenzen: true, honba: 2, riichiSticks: 1 });
assert(withCounters.payments.ron.amount === 2200 && withCounters.payments.ron.winnerGain === 3200, "本場または供託が正しく適用されていません");

const players = [{ name: "親", points: 35000 }, { name: "子", points: 35000 }, { name: "放銃者", points: 35000 }];
const settlement = Settlement.applySettlement({ players, scoreResult: withCounters, context: withCounters.context });
assert(settlement.applied && players[1].points === 38200 && players[2].points === 32800, "点棒移動が正しくありません");

const engine = new global.Sanma.GameEngine({ ruleConfig: { tsumoLoss: false }, seed: "phase4-settlement", onChange: function noop() {} });
engine.humanPlayer.hand = chiitoitsu.map(tile);
engine.humanPlayer.lastDraw = engine.humanPlayer.hand[engine.humanPlayer.hand.length - 1];
engine.markOpeningInterrupted("通常ツモ得点テスト");
engine.lastDrawContext = engine.createNormalDrawContext(engine.humanPlayer);
engine.phase = "human-discard";
engine.turnIndex = 0;
engine.claimHumanTsumo();
assert(engine.phase === "win-ended" && engine.winResult && engine.winResult.settlement.applied, "人間のツモ和了で局終了できません");
assert(engine.players[0].points === 39800 && engine.players[1].points === 32600 && engine.players[2].points === 32600, "ツモ和了の点棒移動が正しくありません");

console.log("Phase 4 score calculator tests passed.");
