(function attachCallResolver(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  const CALL_ACTION_IDS = ["kan", "pon", "chi"];
  const ACTION_PRIORITIES = { kan: 2, pon: 3, chi: 4 };

  function hasLiveWallForNonWinningCall(state) {
    if (!state || !state.wall || typeof state.wall.remainingCount !== "function") return true;
    return state.wall.remainingCount() > 0;
  }

  function getPlayers(state) {
    return state && Array.isArray(state.players) ? state.players : [];
  }

  function isRiichiLocked(player) {
    return Boolean(player && (
      player.hasRiichi
      || (player.riichi && (player.riichi.pending || player.riichi.declared))
    ));
  }

  function hasCallTarget(state, playerIndex) {
    const players = getPlayers(state);
    const lastDiscard = state && state.lastDiscard;
    return Boolean(
      players[playerIndex]
      && lastDiscard
      && lastDiscard.tile
      && Number.isInteger(lastDiscard.playerIndex)
      && lastDiscard.playerIndex !== playerIndex
    );
  }

  function cloneActionWithOptions(action, options) {
    return {
      id: action.id,
      label: action.label,
      enabled: true,
      reason: action.reason || "",
      options: (options || []).slice(),
    };
  }

  function normaliseLegalAction(action) {
    if (!action || !action.enabled || !CALL_ACTION_IDS.includes(action.id)) return null;
    const options = Array.isArray(action.options) ? action.options : [];
    if (action.id === "kan") {
      const minkanOptions = options.filter((option) => option && option.type === "minkan");
      return minkanOptions.length > 0 ? cloneActionWithOptions(action, minkanOptions) : null;
    }
    return options.length > 0 ? cloneActionWithOptions(action, options) : null;
  }

  function getLegalCallActions(state, playerIndex) {
    const player = getPlayers(state)[playerIndex];
    if (
      !Sanma.ActionResolver
      || !hasCallTarget(state, playerIndex)
      || !hasLiveWallForNonWinningCall(state)
      || isRiichiLocked(player)
    ) {
      return [];
    }
    return Sanma.ActionResolver.getAvailableActions(state, playerIndex)
      .map(normaliseLegalAction)
      .filter(Boolean);
  }

  function turnDistanceFrom(discarderIndex, playerIndex, playerCount) {
    if (!playerCount) return 0;
    return (playerIndex - discarderIndex + playerCount) % playerCount;
  }

  function createCandidate(state, discarderIndex, playerIndex, action, option, optionIndex) {
    return {
      playerIndex,
      actionId: action.id,
      optionIndex,
      option,
      priority: ACTION_PRIORITIES[action.id],
      turnDistance: turnDistanceFrom(discarderIndex, playerIndex, getPlayers(state).length),
      sourcePlayerIndex: state.lastDiscard ? state.lastDiscard.playerIndex : discarderIndex,
      reason: action.reason || "",
    };
  }

  function sortCandidates(candidates) {
    return (candidates || []).slice().sort((left, right) => (
      left.priority - right.priority
      || left.turnDistance - right.turnDistance
      || CALL_ACTION_IDS.indexOf(left.actionId) - CALL_ACTION_IDS.indexOf(right.actionId)
      || left.optionIndex - right.optionIndex
      || left.playerIndex - right.playerIndex
    ));
  }

  function collectCpuCallCandidates(state, discarderIndex) {
    const players = getPlayers(state);
    const lastDiscard = state && state.lastDiscard;
    if (!lastDiscard || !lastDiscard.tile || lastDiscard.playerIndex !== discarderIndex) return [];

    const candidates = [];
    players.forEach((player, playerIndex) => {
      if (!player || player.isHuman || playerIndex === discarderIndex || isRiichiLocked(player)) return;
      getLegalCallActions(state, playerIndex).forEach((action) => {
        (action.options || []).forEach((option, optionIndex) => {
          candidates.push(createCandidate(state, discarderIndex, playerIndex, action, option, optionIndex));
        });
      });
    });
    return sortCandidates(candidates);
  }

  function sortedCandidateKey(candidate) {
    const option = candidate && candidate.option ? candidate.option : {};
    const consumed = Array.isArray(option.consumeInstanceIds)
      ? option.consumeInstanceIds.slice().sort().join(",")
      : "";
    const tileId = option.tile && option.tile.instanceId ? option.tile.instanceId : "";
    return [
      candidate && candidate.playerIndex,
      candidate && candidate.actionId,
      candidate && candidate.optionIndex,
      option.type || "",
      option.fromPlayerIndex,
      tileId,
      consumed,
    ].join("|");
  }

  function findLegalCandidate(candidates, selected) {
    if (!selected) return null;
    const direct = candidates.find((candidate) => candidate === selected);
    if (direct) return direct;
    const selectedCandidate = selected.candidate || selected;
    const selectedKey = sortedCandidateKey(selectedCandidate);
    return candidates.find((candidate) => sortedCandidateKey(candidate) === selectedKey) || null;
  }

  function selectCpuCallCandidate(state, candidates) {
    const sorted = sortCandidates(candidates || []);
    if (sorted.length === 0) return null;
    if (!Sanma.CpuStrategy || typeof Sanma.CpuStrategy.chooseCall !== "function") return sorted[0];

    const selected = Sanma.CpuStrategy.chooseCall({
      state,
      player: state && state.players ? state.players[sorted[0].playerIndex] : null,
      players: state && state.players ? state.players : [],
      legalCalls: sorted,
      candidates: sorted,
      ruleConfig: state && state.ruleConfig ? state.ruleConfig : {},
      random: state && typeof state.cpuRandom === "function" ? state.cpuRandom : Math.random,
    });
    return findLegalCandidate(sorted, selected);
  }

  Sanma.CallResolver = {
    getLegalCallActions,
    collectCpuCallCandidates,
    selectCpuCallCandidate,
  };
})(window);
