(function attachCallResolver(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  const callActionIds = ["kan", "pon", "chi"];
  const priorityByActionId = { kan: 2, pon: 3, chi: 4 };

  function hasLiveWallForNonWinningCall(state) {
    if (!state || !state.wall || typeof state.wall.remainingCount !== "function") return true;
    return state.wall.remainingCount() > 0;
  }

  function optionKey(option) {
    const consumeIds = (option && option.consumeInstanceIds ? option.consumeInstanceIds : [])
      .slice()
      .sort()
      .join(",");
    const tileId = option && option.tile ? option.tile.instanceId : "";
    const fromPlayerIndex = option && Number.isInteger(option.fromPlayerIndex)
      ? option.fromPlayerIndex
      : "";
    const meldIndex = option && Number.isInteger(option.meldIndex) ? option.meldIndex : "";
    return [option && option.type, fromPlayerIndex, tileId, consumeIds, meldIndex].join("|");
  }

  function candidateKey(candidate) {
    return [
      candidate && candidate.playerIndex,
      candidate && candidate.actionId,
      candidate && candidate.sourcePlayerIndex,
      optionKey(candidate && candidate.option),
    ].join("::");
  }

  function turnDistance(state, discarderIndex, playerIndex) {
    const playerCount = state && state.players ? state.players.length : 0;
    if (!playerCount) return 99;
    return (playerIndex - discarderIndex + playerCount) % playerCount;
  }

  function cloneActionWithOptions(action, options) {
    return Object.assign({}, action, {
      enabled: options.length > 0,
      options,
    });
  }

  function getLegalCallActions(state, playerIndex) {
    if (!state || !state.players || !state.players[playerIndex] || !Sanma.ActionResolver) return [];
    if (!hasLiveWallForNonWinningCall(state)) return [];

    return callActionIds
      .map((actionId) => {
        const action = Sanma.ActionResolver.findAction(state, playerIndex, actionId);
        if (!action || !action.enabled) return null;
        const options = (action.options || []).filter((option) => (
          actionId !== "kan" || option.type === "minkan"
        ));
        if (options.length === 0) return null;
        return cloneActionWithOptions(action, options);
      })
      .filter(Boolean)
      .sort((left, right) => priorityByActionId[left.id] - priorityByActionId[right.id]);
  }

  function collectCpuCallCandidates(state, discarderIndex) {
    if (!state || !Array.isArray(state.players) || !state.lastDiscard || !state.lastDiscard.tile) return [];
    const sourcePlayerIndex = Number.isInteger(discarderIndex)
      ? discarderIndex
      : state.lastDiscard.playerIndex;
    if (state.lastDiscard.playerIndex !== sourcePlayerIndex) return [];
    if (!hasLiveWallForNonWinningCall(state)) return [];

    const candidates = [];
    state.players.forEach((player, playerIndex) => {
      if (!player || player.isHuman || playerIndex === sourcePlayerIndex) return;
      getLegalCallActions(state, playerIndex).forEach((action) => {
        (action.options || []).forEach((option, optionIndex) => {
          candidates.push({
            playerIndex,
            actionId: action.id,
            optionIndex,
            option,
            priority: priorityByActionId[action.id],
            sourcePlayerIndex,
            reason: action.reason || "",
          });
        });
      });
    });

    candidates.sort((left, right) => (
      left.priority - right.priority
      || turnDistance(state, sourcePlayerIndex, left.playerIndex)
        - turnDistance(state, sourcePlayerIndex, right.playerIndex)
      || priorityByActionId[left.actionId] - priorityByActionId[right.actionId]
      || left.optionIndex - right.optionIndex
      || String(candidateKey(left)).localeCompare(String(candidateKey(right)))
    ));
    return candidates;
  }

  function normalizeCandidate(state, candidate) {
    if (!candidate) return null;
    const sourcePlayerIndex = Number.isInteger(candidate.sourcePlayerIndex)
      ? candidate.sourcePlayerIndex
      : state && state.lastDiscard && state.lastDiscard.playerIndex;
    const legalCandidates = collectCpuCallCandidates(state, sourcePlayerIndex);
    const requestedKey = candidateKey(candidate);
    return legalCandidates.find((legalCandidate) => candidateKey(legalCandidate) === requestedKey) || null;
  }

  function selectCpuCallCandidate(state, candidates) {
    const inputCandidates = Array.isArray(candidates)
      ? candidates
      : collectCpuCallCandidates(state, state && state.lastDiscard && state.lastDiscard.playerIndex);
    const legalCandidates = inputCandidates
      .map((candidate) => normalizeCandidate(state, candidate))
      .filter(Boolean);

    if (legalCandidates.length === 0) return null;

    const strategy = Sanma.CpuStrategy && Sanma.CpuStrategy.chooseCall;
    if (typeof strategy === "function") {
      const selected = strategy({
        state,
        player: state.players[legalCandidates[0].playerIndex],
        legalCalls: legalCandidates,
        random: state.random,
      });
      if (selected === null) return null;
      const legalSelected = normalizeCandidate(state, selected);
      if (legalSelected) return legalSelected;
    }

    return legalCandidates[0];
  }

  Sanma.CallResolver = {
    getLegalCallActions,
    collectCpuCallCandidates,
    selectCpuCallCandidate,
  };
})(window);
