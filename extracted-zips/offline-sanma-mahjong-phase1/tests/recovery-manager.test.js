const { assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();

function callWindow(fromPlayerIndex) {
  return {
    isOpen: true,
    fromPlayerIndex,
    actions: [{ id: "skip", label: "スキップ", enabled: true }],
  };
}

const humanRecovery = createEngine(Sanma, "recovery-human", {});
humanRecovery.phase = "human-call";
humanRecovery.callWindow = callWindow(2);
humanRecovery.humanPlayer.lastDraw = null;
const humanResult = Sanma.RecoveryManager.closeStuckActionWindow(humanRecovery);
assert(humanResult.ok && humanRecovery.phase === "human-discard", "人間手番への復旧がhuman-discardへ到達しません");
assert(humanRecovery.turnIndex === humanRecovery.humanPlayer.id && humanRecovery.humanPlayer.lastDraw, "人間手番への復旧でツモが完了しません");
assert(humanRecovery.phase !== "human-draw", "復旧が到達不能なhuman-drawで停止しました");

const cpuRecovery = createEngine(Sanma, "recovery-cpu-call", {});
let cpuResumeCalls = 0;
cpuRecovery.phase = "human-call";
cpuRecovery.callWindow = callWindow(0);
cpuRecovery.runCpuUntilHumanTurn = function resumeCpu() {
  cpuResumeCalls += 1;
  this.turnIndex = this.humanPlayer.id;
  this.phase = "human-discard";
  this.humanPlayer.lastDraw = this.humanPlayer.hand[this.humanPlayer.hand.length - 1];
  this.emitChange();
  return true;
};
const cpuResult = Sanma.RecoveryManager.closeStuckActionWindow(cpuRecovery);
assert(cpuResult.ok && cpuResumeCalls === 1, "呼び出し窓からCPU自動進行を再開しません");
assert(cpuRecovery.phase === "human-discard" && cpuRecovery.turnIndex === cpuRecovery.humanPlayer.id, "CPU復旧後の最終状態が不正です");

const staleCpu = createEngine(Sanma, "recovery-stale-cpu", {});
let staleResumeCalls = 0;
staleCpu.phase = "cpu-running";
staleCpu.turnIndex = 1;
staleCpu.cpuTaskActive = true;
staleCpu.runCpuUntilHumanTurn = function resumeStaleCpu() {
  staleResumeCalls += 1;
  this.turnIndex = this.humanPlayer.id;
  this.phase = "human-discard";
  this.humanPlayer.lastDraw = this.humanPlayer.hand[this.humanPlayer.hand.length - 1];
  this.emitChange();
  return true;
};
assert(Sanma.RecoveryManager.recover(staleCpu, {}).ok && staleResumeCalls === 1, "停止したCPU進行を再開しません");
assert(staleCpu.phase !== "cpu-running" && staleCpu.phase !== "human-draw", "復旧後もソフトロック状態です");
assert(Sanma.InvariantChecker.checkState(staleCpu, staleCpu.ruleConfig).ok, "復旧後のphase/turn組み合わせが不正です");

console.log("Phase 14.2 RecoveryManager tests passed.");
