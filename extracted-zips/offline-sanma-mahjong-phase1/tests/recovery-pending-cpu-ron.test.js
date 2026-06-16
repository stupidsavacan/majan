const { assert, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();

function engineWithWindow(kind, pending) {
  return {
    phase: "human-call",
    players: [{ id: 0, isHuman: true }, { id: 1, isHuman: false }, { id: 2, isHuman: false }],
    callWindow: {
      isOpen: true,
      kind,
      fromPlayerIndex: 2,
      pendingCpuRonCandidate: pending ? { playerIndex: 1, analysis: { scoreResult: { isValidWin: true } } } : null,
      actions: [{ id: "ron", enabled: true }],
    },
    debugEventLog: Sanma.DebugEventLog.create(),
    skipCalled: 0,
    skipHumanCall() {
      this.skipCalled += 1;
      this.callWindow = null;
      this.phase = pending ? "win-ended" : "cpu-running";
      this.recordedSettlement = Boolean(pending);
      return true;
    },
  };
}

const pendingDiscardRon = engineWithWindow("discard-ron", true);
const pendingResult = Sanma.RecoveryManager.closeStuckActionWindow(pendingDiscardRon);
assert(pendingResult.ok, "pending CPUロンのRecoveryが成功しません");
assert(pendingDiscardRon.skipCalled === 1, "pending CPUロンが通常skip経路へ渡されません");
assert(pendingDiscardRon.phase === "win-ended", "pending CPUロンが解決されません");
assert(pendingDiscardRon.recordedSettlement, "pending CPUロンのscore_settlement相当処理が実行されません");
assert(Sanma.DebugEventLog.list(pendingDiscardRon.debugEventLog).some((event) => event.type === "recoveryAction"), "pending CPUロンRecoveryがDebugEventLogへ残りません");

const pendingChankan = engineWithWindow("chankan", true);
const chankanResult = Sanma.RecoveryManager.closeStuckActionWindow(pendingChankan);
assert(chankanResult.ok, "pending CPU槍槓のRecoveryが成功しません");
assert(pendingChankan.phase === "win-ended", "pending CPU槍槓が解決されません");
assert(pendingChankan.callWindow === null, "pending CPU槍槓Recovery後にcallWindowが残りました");

console.log("Phase 15 recovery preserves pending CPU ron tests passed.");
