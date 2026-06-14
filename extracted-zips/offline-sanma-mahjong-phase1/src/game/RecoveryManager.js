(function attachRecoveryManager(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function record(state, label, data) {
    if (Sanma.DebugEventLog && state && state.debugEventLog) {
      Sanma.DebugEventLog.add(state.debugEventLog, "recoveryAction", Object.assign({ label }, data || {}));
    }
  }

  function closeStuckActionWindow(state) {
    if (!state || !state.callWindow) {
      return { ok: false, reason: "復旧対象の呼び出し窓がありません" };
    }
    const fromPlayerIndex = state.callWindow.fromPlayerIndex;
    if (Sanma.CallWindow) Sanma.CallWindow.close(state.callWindow, "状態復旧");
    state.callWindow = null;
    if (state.phase === "human-call") {
      state.turnIndex = Number.isInteger(fromPlayerIndex) && state.players && state.players.length
        ? (fromPlayerIndex + 1) % state.players.length
        : 0;
      state.phase = state.turnIndex === 0 ? "human-draw" : "cpu-running";
    }
    if (state.stateMachine && Sanma.GameStateMachine) {
      Sanma.GameStateMachine.syncLegacy(
        state.stateMachine,
        state.phase,
        state.matchManager && state.matchManager.state,
        "呼び出し窓を復旧"
      );
    }
    record(state, "呼び出し窓を閉じました");
    return { ok: true, reason: "不正な状態を検出しました。呼び出し窓を閉じて復旧しました。" };
  }

  function cancelPendingCpuTask(state) {
    if (!state) return { ok: false, reason: "復旧対象がありません" };
    state.cpuTaskActive = false;
    if (state.stateMachine && Sanma.GameStateMachine) {
      Sanma.GameStateMachine.cancelAll(state.stateMachine, "CPU処理を解除しました");
    }
    record(state, "CPU処理を解除しました");
    return { ok: true, reason: "CPU処理を解除して復旧しました。" };
  }

  function resetCurrentRound(engine) {
    if (!engine || typeof engine.startRound !== "function") {
      return { ok: false, reason: "この局をリセットできません" };
    }
    cancelPendingCpuTask(engine);
    engine.startRound();
    if (typeof engine.addLog === "function") engine.addLog("不正な状態を検出したため、この局をリセットして復旧しました。");
    record(engine, "この局をリセット");
    return { ok: true, reason: "この局をリセットして復旧しました。" };
  }

  function backupCorruptedStorage(storage, sourceKey, raw, reason) {
    if (!Sanma.SaveMigration || !storage) {
      return { ok: false, reason: "保存データを退避できませんでした" };
    }
    try {
      const backupKey = Sanma.SaveMigration.backupRaw(storage, sourceKey, raw, reason);
      return { ok: true, reason: "保存データを退避しました", backupKey };
    } catch (error) {
      return { ok: false, reason: `保存データを退避できませんでした: ${error.message}` };
    }
  }

  function recover(engine, report) {
    if (!engine) return { ok: false, reason: "復旧対象がありません" };
    if (engine.stateMachine && Sanma.GameStateMachine) {
      Sanma.GameStateMachine.transition(engine.stateMachine, "recovering", "不正状態の復旧");
    }
    if (engine.callWindow) return closeStuckActionWindow(engine);
    if (report && report.tileLedger && !report.tileLedger.ok) return resetCurrentRound(engine);
    return cancelPendingCpuTask(engine);
  }

  Sanma.RecoveryManager = {
    closeStuckActionWindow,
    cancelPendingCpuTask,
    resetCurrentRound,
    backupCorruptedStorage,
    recover,
  };
})(window);
