(function attachGameStateMachine(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  const states = Object.freeze([
    "booting",
    "idle",
    "dealing",
    "waitingForDraw",
    "waitingForDiscard",
    "waitingForCall",
    "resolvingAction",
    "resolvingWin",
    "roundEnded",
    "matchEnded",
    "recovering",
  ]);

  const legacyPhaseMap = Object.freeze({
    idle: "idle",
    dealing: "dealing",
    "human-draw": "waitingForDraw",
    "human-discard": "waitingForDiscard",
    "human-kan-choice": "resolvingAction",
    "caller-discard": "waitingForDiscard",
    "human-call": "waitingForCall",
    "cpu-running": "resolvingAction",
    "win-ended": "roundEnded",
    "round-ended": "roundEnded",
  });

  function fromLegacyPhase(phase, matchState) {
    if (matchState && matchState.matchEnded) return "matchEnded";
    return legacyPhaseMap[phase] || "recovering";
  }

  function create(initialState, eventLog) {
    return {
      state: states.includes(initialState) ? initialState : "booting",
      previousState: null,
      activeActions: Object.create(null),
      eventLog: eventLog || null,
    };
  }

  function record(machine, type, data) {
    if (Sanma.DebugEventLog && machine && machine.eventLog) {
      Sanma.DebugEventLog.add(machine.eventLog, type, data);
    }
  }

  function transition(machine, nextState, label) {
    if (!machine || !states.includes(nextState)) {
      return { ok: false, reason: "不明な状態へ遷移できません", state: machine ? machine.state : null };
    }
    const from = machine.state;
    if (from === nextState) return { ok: true, state: nextState, unchanged: true };
    machine.previousState = from;
    machine.state = nextState;
    record(machine, "stateTransition", { from, to: nextState, label: label || "" });
    return { ok: true, state: nextState };
  }

  function syncLegacy(machine, phase, matchState, label) {
    return transition(machine, fromLegacyPhase(phase, matchState), label || String(phase || ""));
  }

  function validateAction(machine, action, allowedStates) {
    const allowed = Array.isArray(allowedStates) ? allowedStates : [];
    const state = machine ? machine.state : "recovering";
    record(machine, "actionRequested", { action, state });
    if (!allowed.includes(state)) {
      const result = {
        ok: false,
        reason: `現在は${action}できる状態ではありません`,
        state,
      };
      record(machine, "actionRejected", result);
      return result;
    }
    return { ok: true, state };
  }

  function beginAction(machine, action, allowedStates) {
    const validation = validateAction(machine, action, allowedStates);
    if (!validation.ok) return validation;
    if (machine.activeActions[action]) {
      const result = {
        ok: false,
        reason: `${action}はすでに処理中です`,
        state: machine.state,
      };
      record(machine, "actionRejected", result);
      return result;
    }
    machine.activeActions[action] = true;
    return { ok: true, state: machine.state };
  }

  function endAction(machine, action) {
    if (machine && machine.activeActions) delete machine.activeActions[action];
  }

  function cancelAll(machine, reason) {
    if (!machine) return;
    machine.activeActions = Object.create(null);
    record(machine, "recoveryAction", { label: reason || "処理中操作を解除しました" });
  }

  Sanma.GameStateMachine = {
    states,
    legacyPhaseMap,
    fromLegacyPhase,
    create,
    transition,
    syncLegacy,
    validateAction,
    beginAction,
    endAction,
    cancelAll,
  };
})(window);
