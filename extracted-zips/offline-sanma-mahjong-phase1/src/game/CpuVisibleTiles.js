(function attachCpuVisibleTiles(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function maxCopiesForBaseId(baseId, ruleConfig) {
    if (ruleConfig && ruleConfig.northMode === "disabled" && baseId === "z4") return 0;
    return 4;
  }

  function addTile(counts, tile) {
    if (!tile || !tile.baseId) return;
    counts[tile.baseId] = (counts[tile.baseId] || 0) + 1;
  }

  function addTiles(target, tiles) {
    if (!Array.isArray(tiles)) return;
    tiles.forEach((tile) => {
      if (tile) target.push(tile);
    });
  }

  function getDoraIndicators(state) {
    if (state && state.wall && Array.isArray(state.wall.doraIndicators)) return state.wall.doraIndicators;
    if (state && Array.isArray(state.doraIndicators)) return state.doraIndicators;
    return [];
  }

  function getVisibleTilesForPlayer(state, playerIndex) {
    const visible = [];
    const players = Array.isArray(state && state.players) ? state.players : [];
    const self = players[playerIndex];

    if (self) addTiles(visible, self.hand);

    players.forEach((player) => {
      if (!player) return;
      addTiles(visible, player.discards);
      addTiles(visible, player.kitaTiles);
      (player.melds || []).forEach((meld) => addTiles(visible, meld && meld.tiles));
    });

    addTiles(visible, getDoraIndicators(state));

    if (state && state.lastDiscard && state.lastDiscard.tile) {
      const lastDiscardTile = state.lastDiscard.tile;
      const alreadyVisible = visible.some((tile) => tile && tile.instanceId === lastDiscardTile.instanceId);
      if (!alreadyVisible) visible.push(lastDiscardTile);
    }

    return visible;
  }

  function getVisibleCountsForPlayer(state, playerIndex) {
    const counts = Object.create(null);
    getVisibleTilesForPlayer(state, playerIndex).forEach((tile) => addTile(counts, tile));
    return counts;
  }

  function getRemainingVisibleEstimate(state, playerIndex, baseId) {
    const ruleConfig = state && state.ruleConfig ? state.ruleConfig : {};
    const counts = getVisibleCountsForPlayer(state, playerIndex);
    return Math.max(0, maxCopiesForBaseId(baseId, ruleConfig) - (counts[baseId] || 0));
  }

  function fallbackLegalTileTypes(ruleConfig) {
    const types = [];
    ["m", "p", "s"].forEach((suit) => {
      for (let rank = 1; rank <= 9; rank += 1) {
        if (suit === "m" && rank > 1 && rank < 9) continue;
        types.push({ tileType: Sanma.TileUtil.baseId(suit, rank) });
      }
    });
    for (let rank = 1; rank <= 7; rank += 1) {
      if (rank === 4 && ruleConfig && ruleConfig.northMode === "disabled") continue;
      types.push({ tileType: Sanma.TileUtil.baseId("z", rank) });
    }
    return types;
  }

  function getRemainingByBaseId(state, playerIndex) {
    const result = Object.create(null);
    const ruleConfig = state && state.ruleConfig ? state.ruleConfig : {};
    const legalTypes = Sanma.HandAnalysis && typeof Sanma.HandAnalysis.getLegalTileTypes === "function"
      ? Sanma.HandAnalysis.getLegalTileTypes(ruleConfig)
      : fallbackLegalTileTypes(ruleConfig);
    legalTypes.forEach((type) => {
      const baseId = type.tileType || type.baseId;
      if (baseId) result[baseId] = getRemainingVisibleEstimate(state, playerIndex, baseId);
    });
    if (ruleConfig.northMode === "disabled") result.z4 = 0;
    return result;
  }

  Sanma.CpuVisibleTiles = {
    getVisibleTilesForPlayer,
    getVisibleCountsForPlayer,
    getRemainingVisibleEstimate,
    getRemainingByBaseId,
  };
})(window);
