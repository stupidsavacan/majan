(function attachRecoveryManager(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function record(state, label, data) {
    if (Sanma.DebugEventLog && state && state.debugEventLog) {
      Sanma.DebugEventLog.add(state.debugEventLog, "recoveryAction", Object.assign({ label }, data || {}));
    }
  }

  function sync(state, label) {
    if (state && state.stateMachine && Sanma.GameStateMachine) {
      Sanma.GameStateMachine.syncLegacy(
        state.stateMachine,
        state.phase,
        state.matchManager && state.matchManager.state,
        label
      );
    }
  }

  function emit(state) {
    if (state && typeof state.emitChange === "function") state.emitChange();
  }

  function humanPlayerIndex(state) {
    const player = state && Array.isArray(state.players)
      ? state.players.find((candidate) => candidate && candidate.isHuman)
      : null;
    return player && Number.isInteger(player.id) ? player.id : 0;
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

  function resumeTurn(engine, nextPlayerIndex, label) {
    if (!engine || !Array.isArray(engine.players) || !engine.players[nextPlayerIndex]) {
      return { ok: false, reason: "復旧後の手番を決定できません" };
    }
    cancelPendingCpuTask(engine);
    engine.turnIndex = nextPlayerIndex;
    const humanIndex = humanPlayerIndex(engine);
    if (nextPlayerIndex === humanIndex) {
      const human = engine.players[humanIndex];
      if (human.lastDraw) {
        engine.phase = "human-discard";
        sync(engine, label);
        emit(engine);
      } else if (typeof engine.drawForHumanManually === "function") {
        engine.phase = "human-draw";
        sync(engine, label);
        engine.drawForHumanManually();
      } else {
        return { ok: false, reason: "人間手番を再開するツモ処理がありません" };
      }
    } else {
      engine.phase = "cpu-running";
      sync(engine, label);
      emit(engine);
      if (typeof engine.runCpuUntilHumanTurn !== "function") {
        return { ok: false, reason: "CPU手番を再開する処理がありません" };
      }
      engine.runCpuUntilHumanTurn();
    }
    record(engine, label, { nextPlayerIndex, phase: engine.phase });
    return { ok: true, reason: "不正な状態を検出し、進行可能な状態へ復旧しました。" };
  }

  function closeStuckActionWindow(state) {
    if (!state || !state.callWindow) {
      return { ok: false, reason: "復旧対象の呼び出し窓がありません" };
    }
    const hasPendingReaction = state.callWindow.kind === "chankan"
      || state.callWindow.pendingCpuRonCandidate
      || state.callWindow.pendingCpuCallCandidate;
    if (hasPendingReaction && typeof state.skipHumanCall === "function") {
      const kind = state.callWindow.kind || "discard-ron";
      const pendingRonPlayer = state.callWindow.pendingCpuRonCandidate
        ? state.callWindow.pendingCpuRonCandidate.playerIndex
        : null;
      const pendingCallPlayer = state.callWindow.pendingCpuCallCandidate
        ? state.callWindow.pendingCpuCallCandidate.playerIndex
        : null;
      record(state, "pending reaction recovery", { kind, pendingRonPlayer, pendingCallPlayer });
      const result = Sanma.RecoveryFlow
        ? Sanma.RecoveryFlow.skipHumanCall(state)
        : state.skipHumanCall();
      return {
        ok: result !== false,
        reason: "保留中のロン/槍槓/CPU鳴き処理を通常スキップ経路で復旧しました。",
        phase: state.phase,
      };
    }
    const fromPlayerIndex = state.callWindow.fromPlayerIndex;
    if (Sanma.CallWindow) Sanma.CallWindow.close(state.callWindow, "状態復旧");
    state.callWindow = null;
    const nextPlayerIndex = Number.isInteger(fromPlayerIndex) && state.players && state.players.length
      ? (fromPlayerIndex + 1) % state.players.length
      : humanPlayerIndex(state);
    return resumeTurn(state, nextPlayerIndex, "呼び出し窓を閉じて復旧しました");
  }

  function resetCurrentRound(engine) {
    if (!engine || typeof engine.startRound !== "function") {
      return { ok: false, reason: "この局をリセットできません" };
    }
    cancelPendingCpuTask(engine);
    if (Sanma.GameRecord && engine.gameRecord) {
      Sanma.GameRecord.addEvent(engine.gameRecord, "recovery", {
        action: "resetCurrentRound",
        reason: "RecoveryManager resetCurrentRound",
      });
      Sanma.GameRecord.closeOpenRound(engine.gameRecord, "RecoveryManager resetCurrentRound");
    }
    if (Sanma.RecoveryFlow) Sanma.RecoveryFlow.startRound(engine);
    else engine.startRound();
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
    if (report && report.tileLedger && !report.tileLedger.ok) return resetCurrentRound(engine);
    if (engine.callWindow) return closeStuckActionWindow(engine);
    if (engine.phase === "cpu-running") {
      return resumeTurn(engine, engine.turnIndex, "停止したCPU手番を再開しました");
    }
    cancelPendingCpuTask(engine);
    sync(engine, "復旧処理を完了しました");
    emit(engine);
    return { ok: true, reason: "復旧しました。" };
  }

  Sanma.RecoveryManager = {
    closeStuckActionWindow,
    cancelPendingCpuTask,
    resumeTurn,
    resetCurrentRound,
    backupCorruptedStorage,
    recover,
  };
})(window);
