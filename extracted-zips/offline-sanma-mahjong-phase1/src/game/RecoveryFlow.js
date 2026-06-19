(function attachRecoveryFlow(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  Sanma.RecoveryFlow = {
    skipHumanCall(engine) {
      if (engine && typeof engine.validateAction !== "function" && typeof engine.skipHumanCall === "function") {
        return engine.skipHumanCall();
      }
      return Sanma.CallFlow.skipHumanCall.call(engine);
    },

    finalizePendingKan(engine) {
      if (engine && typeof engine.validateAction !== "function" && typeof engine.finalizePendingKan === "function") {
        return engine.finalizePendingKan();
      }
      return Sanma.KanFlow.finalizePendingKan.call(engine);
    },

    startRound(engine) {
      return Sanma.RoundLifecycle.startRound.call(engine);
    },

    resolvePendingCpuRon(engine, discarderIndex) {
      const pending = engine
        && engine.callWindow
        && engine.callWindow.pendingCpuRonCandidate;
      if (pending && Number.isInteger(pending.playerIndex) && pending.analysis) {
        return engine.resolveRonWin(pending.playerIndex, pending.analysis, { isCpuRon: true });
      }
      return Sanma.WinFlow.resolveRonCandidatesAfterDiscard.call(engine, discarderIndex);
    },
  };
})(window);
