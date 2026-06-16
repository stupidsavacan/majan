const { assert, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();

function chankanEngine(hasPendingCpu) {
  return {
    phase: "human-call",
    players: [{ id: 0, isHuman: true }, { id: 1, isHuman: false }, { id: 2, isHuman: false }],
    pendingKanAttempt: { kanType: "kakan" },
    callWindow: {
      isOpen: true,
      kind: "chankan",
      fromPlayerIndex: 2,
      kanType: "kakan",
      isAnkanKokushiException: false,
      pendingCpuRonCandidate: hasPendingCpu ? { playerIndex: 1, analysis: { scoreResult: { isValidWin: true } } } : null,
      actions: [{ id: "ron", enabled: true }],
    },
    debugEventLog: Sanma.DebugEventLog.create(),
    skipHumanCall() {
      if (this.callWindow.pendingCpuRonCandidate) {
        this.phase = "win-ended";
        this.callWindow = null;
        this.pendingKanAttempt = null;
        return true;
      }
      this.finalizePendingKan();
      return true;
    },
    finalizePendingKan() {
      this.finalizedKan = true;
      this.pendingKanAttempt = null;
      this.callWindow = null;
      this.phase = "cpu-running";
      return { applied: true };
    },
  };
}

const withCpu = chankanEngine(true);
Sanma.RecoveryManager.closeStuckActionWindow(withCpu);
assert(withCpu.phase === "win-ended", "Recovery中のpending CPU槍槓が成立しません");
assert(withCpu.pendingKanAttempt === null, "CPU槍槓Recovery後にpendingKanAttemptが残りました");
assert(withCpu.callWindow === null, "CPU槍槓Recovery後にcallWindowが残りました");

const withoutCpu = chankanEngine(false);
Sanma.RecoveryManager.closeStuckActionWindow(withoutCpu);
assert(withoutCpu.finalizedKan, "pending CPU槍槓なしのRecoveryで保留カンが確定されません");
assert(withoutCpu.pendingKanAttempt === null, "保留カン確定Recovery後にpendingKanAttemptが残りました");
assert(withoutCpu.callWindow === null, "保留カン確定Recovery後にcallWindowが残りました");

console.log("Phase 15 recovery chankan window finalization tests passed.");
