const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const winningWait = ["3p", "4p", "2s", "3s", "4s", "6p", "7p", "8p", "6s", "7s", "8s", "2p", "2p"];
const honorFiller = ["z2", "z2", "z2", "z2", "z3", "z3", "z3", "z3", "z4", "z4", "z4", "z4", "z5"];
const discardHand = ["5p", "1m", "1m", "1m", "9m", "9m", "9m", "1p", "1p", "1p", "9p", "9p", "9p", "z1"];

function ledger(engine, label) {
  assert(Sanma.TileLedger.inspect(engine, engine.ruleConfig).ok, `${label}: TileLedgerが不正です`);
}

const humanDiscard = createEngine(Sanma, "cpu-ron-human-discard", {});
arrangeEngine(Sanma, humanDiscard, {
  turnIndex: 0,
  players: [
    { hand: discardHand },
    { hand: winningWait, lastDraw: false },
    { hand: honorFiller, lastDraw: false },
  ],
});
const pointsBefore = humanDiscard.players.map((player) => player.points);
const humanFive = humanDiscard.humanPlayer.hand.find((tile) => tile.baseId === "5p");
humanDiscard.discardHumanTile(humanFive.instanceId);
assert(humanDiscard.phase === "win-ended" && humanDiscard.winResult.winnerIndex === 1, "人間打牌に対するCPUロンが局を終了しません");
assert(humanDiscard.players.some((player, index) => player.points !== pointsBefore[index]), "CPUロン精算が点数へ反映されません");
ledger(humanDiscard, "人間打牌CPUロン");

const cpuDiscard = createEngine(Sanma, "cpu-ron-cpu-discard", {});
arrangeEngine(Sanma, cpuDiscard, {
  turnIndex: 1,
  players: [
    { hand: honorFiller, lastDraw: false },
    { hand: discardHand },
    { hand: winningWait, lastDraw: false },
  ],
});
cpuDiscard.tryCpuTsumo = () => false;
cpuDiscard.tryCpuKita = () => false;
cpuDiscard.tryCpuKan = () => false;
cpuDiscard.tryCpuRiichi = () => false;
cpuDiscard.chooseCpuDiscardIndex = (player) => player.hand.findIndex((tile) => tile.baseId === "5p");
cpuDiscard.runCpuUntilHumanTurn();
assert(cpuDiscard.phase === "win-ended" && cpuDiscard.winResult.winnerIndex === 2, "CPU打牌に対する別CPUロンが局を終了しません");
ledger(cpuDiscard, "CPU打牌CPUロン");

const furiten = createEngine(Sanma, "cpu-ron-furiten", {});
arrangeEngine(Sanma, furiten, {
  turnIndex: 0,
  players: [
    { hand: discardHand },
    { hand: winningWait, lastDraw: false, sameTurnFuriten: true },
    { hand: honorFiller, lastDraw: false },
  ],
});
furiten.runCpuUntilHumanTurn = () => true;
furiten.discardHumanTile(furiten.humanPlayer.hand.find((tile) => tile.baseId === "5p").instanceId);
assert(!furiten.winResult, "フリテンCPUがロンしました");
ledger(furiten, "フリテンCPU");

const ownDiscard = createEngine(Sanma, "cpu-ron-own-discard", {});
arrangeEngine(Sanma, ownDiscard, {
  turnIndex: 1,
  players: [
    { hand: honorFiller, lastDraw: false },
    { hand: discardHand },
    { hand: winningWait, lastDraw: false },
  ],
});
const ownFive = ownDiscard.players[1].discardTileByInstanceId(
  ownDiscard.players[1].hand.find((tile) => tile.baseId === "5p").instanceId
);
ownDiscard.lastDiscard = { playerIndex: 1, tile: ownFive };
const ownReaction = ownDiscard.findCpuRonAfterDiscard(1);
assert(!ownReaction || ownReaction.playerIndex !== 1, "CPUが自分の打牌へロンしました");
ledger(ownDiscard, "自己打牌ロン禁止");

const priority = createEngine(Sanma, "cpu-ron-priority", {});
arrangeEngine(Sanma, priority, {
  turnIndex: 0,
  players: [
    { hand: discardHand },
    { hand: winningWait, lastDraw: false },
    { hand: ["5p", "5p", "z2", "z2", "z2", "z3", "z3", "z3", "z4", "z4", "z4", "z5", "z5"], lastDraw: false },
  ],
});
const priorityFive = priority.humanPlayer.hand.find((tile) => tile.baseId === "5p");
priority.lastDiscard = { playerIndex: 0, tile: priorityFive };
assert(Sanma.ActionResolver.findAction(priority, 2, "pon").enabled, "CPUロン優先テストのポン候補がありません");
priority.lastDiscard = null;
priority.discardHumanTile(priorityFive.instanceId);
assert(priority.phase === "win-ended" && priority.winResult.winnerIndex === 1, "CPUロンがCPU呼び出し候補より優先されません");
ledger(priority, "CPUロン優先");

const humanOnly = createEngine(Sanma, "human-ron-window", {});
arrangeEngine(Sanma, humanOnly, {
  turnIndex: 1,
  players: [
    { hand: winningWait, lastDraw: false },
    { hand: discardHand },
    { hand: honorFiller, lastDraw: false },
  ],
});
humanOnly.tryCpuTsumo = () => false;
humanOnly.tryCpuKita = () => false;
humanOnly.tryCpuKan = () => false;
humanOnly.tryCpuRiichi = () => false;
humanOnly.chooseCpuDiscardIndex = (player) => player.hand.findIndex((tile) => tile.baseId === "5p");
humanOnly.runCpuUntilHumanTurn();
assert(
  humanOnly.phase === "human-call"
    && humanOnly.callWindow
    && humanOnly.callWindow.actions.some((action) => action.id === "ron"),
  "人間だけがロン可能な場合に人間ロン窓が開きません"
);
ledger(humanOnly, "人間ロン窓");

const nearest = createEngine(Sanma, "cpu-ron-nearest", {});
nearest.lastDiscard = { playerIndex: 0, tile: nearest.humanPlayer.hand[0] };
const originalEligibility = Sanma.FuritenManager.checkRonEligibility;
const originalAnalyzeWin = Sanma.ActionResolver.analyzeWin;
Sanma.FuritenManager.checkRonEligibility = () => ({ canRon: true, reasons: [] });
Sanma.ActionResolver.analyzeWin = () => ({ scoreResult: { isValidWin: true } });
const nearestReaction = nearest.findCpuRonAfterDiscard(0);
Sanma.FuritenManager.checkRonEligibility = originalEligibility;
Sanma.ActionResolver.analyzeWin = originalAnalyzeWin;
assert(nearestReaction && nearestReaction.playerIndex === 1, "複数CPUロン候補から打牌者に最も近いCPUを選べません");

console.log("Phase 14.2 CPU normal ron tests passed.");
