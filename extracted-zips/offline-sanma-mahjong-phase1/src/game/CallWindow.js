(function attachCallWindow(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const callActionIds = ["ron", "kan", "pon", "chi"];
  const priority = { ron: 1, kan: 2, pon: 3, chi: 4 };

  function create(state, playerIndex) {
    const actions = Sanma.ActionResolver.getAvailableActions(state, playerIndex)
      .filter((action) => callActionIds.includes(action.id) && action.enabled)
      .map((action) => {
        if (action.id !== "kan") return action;
        const options = (action.options || []).filter((option) => option.type === "minkan");
        return Object.assign({}, action, { enabled: options.length > 0, options });
      })
      .filter((action) => action.enabled)
      .sort((a, b) => priority[a.id] - priority[b.id]);
    if (actions.length === 0) return null;
    return {
      isOpen: true,
      playerIndex,
      fromPlayerIndex: state.lastDiscard.playerIndex,
      tile: state.lastDiscard.tile,
      actions,
    };
  }

  function close(windowState, reason) {
    if (!windowState) return null;
    windowState.isOpen = false;
    windowState.closeReason = reason || "スキップ";
    return windowState;
  }

  Sanma.CallWindow = { create, close };
})(window);
