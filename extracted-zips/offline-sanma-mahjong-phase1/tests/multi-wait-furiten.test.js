const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const multiWait = ["4p", "5p", "2s", "3s", "4s", "6s", "7s", "8s", "1p", "1p", "1p", "z1", "z1"];

function setup(seed, playerIndex, discarderIndex, ownDiscard) {
  const engine = createEngine(Sanma, seed, { dramaticLuckAssist: false });
  const players = [{ hand: [] }, { hand: [] }, { hand: [] }];
  players[playerIndex] = { hand: multiWait, discards: ownDiscard ? ["3p"] : [], lastDraw: false };
  players[discarderIndex] = { hand: [], discards: ["6p"], lastDraw: false };
  arrangeEngine(Sanma, engine, { turnIndex: discarderIndex, players });
  engine.players[playerIndex].hasRiichi = true;
  engine.lastDiscard = {
    playerIndex: discarderIndex,
    tile: engine.players[discarderIndex].discards[0],
  };
  return engine;
}

const direct = setup("multi-wait-direct", 0, 2, true);
const directResult = Sanma.FuritenManager.checkRonEligibility({
  state: direct,
  playerIndex: 0,
  winningTile: direct.lastDiscard.tile,
  sourcePlayerIndex: 2,
  ruleConfig: direct.ruleConfig,
});
assert(directResult.waits.includes("3p") && directResult.waits.includes("6p"), "3p/6pの全待ちを計算できません");
assert(!directResult.canRon && directResult.reasons.includes("現物フリテン"), "3pを捨てた3p/6p待ちで6pロンを拒否しません");

const clear = setup("multi-wait-clear", 0, 2, false);
assert(Sanma.FuritenManager.checkRonEligibility({
  state: clear,
  playerIndex: 0,
  winningTile: clear.lastDiscard.tile,
  sourcePlayerIndex: 2,
  ruleConfig: clear.ruleConfig,
}).canRon, "待ち牌を捨てていない3p/6p待ちの6pロンを拒否しました");

assert(!direct.resolveRonCandidatesAfterDiscard(2), "多面待ちフリテンで人間ロン窓を開きました");
assert(direct.phase !== "human-call", "多面待ちフリテン後にhuman-callへ遷移しました");
assert(Sanma.TileLedger.inspect(direct, direct.ruleConfig).ok, "人間多面待ちフリテン判定後のTileLedgerが不正です");

const cpu = setup("multi-wait-cpu", 1, 0, true);
assert(!cpu.resolveRonCandidatesAfterDiscard(0), "多面待ちフリテンのCPUロンを解決しました");
assert(cpu.phase !== "win-ended", "多面待ちフリテンCPUが和了終了しました");
assert(Sanma.TileLedger.inspect(cpu, cpu.ruleConfig).ok, "CPU多面待ちフリテン判定後のTileLedgerが不正です");

const chankan = setup("multi-wait-chankan", 0, 2, true);
const interrupts = chankan.findChankanInterrupts({
  playerIndex: 2,
  kanType: "kakan",
  declaredTile: chankan.lastDiscard.tile,
});
assert(!interrupts.some((candidate) => candidate.playerIndex === 0), "多面待ちフリテンで槍槓ロンを許可しました");
assert(Sanma.TileLedger.inspect(chankan, chankan.ruleConfig).ok, "槍槓多面待ちフリテン判定後のTileLedgerが不正です");

const sameTurn = setup("multi-wait-same-turn", 0, 2, false);
sameTurn.players[0].sameTurnFuriten = true;
assert(!Sanma.FuritenManager.checkRonEligibility({
  state: sameTurn,
  playerIndex: 0,
  winningTile: sameTurn.lastDiscard.tile,
  ruleConfig: sameTurn.ruleConfig,
}).canRon, "同巡フリテンがロンを止めません");

const riichiMissed = setup("multi-wait-riichi-missed", 0, 2, false);
riichiMissed.players[0].riichiMissedWin = true;
assert(!Sanma.FuritenManager.checkRonEligibility({
  state: riichiMissed,
  playerIndex: 0,
  winningTile: riichiMissed.lastDiscard.tile,
  ruleConfig: riichiMissed.ruleConfig,
}).canRon, "リーチ後見逃しフリテンがロンを止めません");

const tsumo = setup("multi-wait-tsumo", 0, 2, true);
const winningTile = tsumo.players[2].discards.pop();
tsumo.players[0].receiveTile(winningTile);
tsumo.lastDiscard = null;
tsumo.turnIndex = 0;
tsumo.phase = "human-discard";
assert(Sanma.ActionResolver.findAction(tsumo, 0, "tsumo").enabled, "フリテン中の合法ツモを拒否しました");
assert(Sanma.TileLedger.inspect(tsumo, tsumo.ruleConfig).ok, "フリテンツモ判定後のTileLedgerが不正です");

console.log("Phase 14.2C multi-wait furiten tests passed.");
