(function attachKanManager(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const TileUtil = Sanma.TileUtil;

  function groupByBaseId(tiles) {
    return (tiles || []).reduce((groups, tile) => {
      groups[tile.baseId] = groups[tile.baseId] || [];
      groups[tile.baseId].push(tile);
      return groups;
    }, {});
  }

  function getOptions(state, playerIndex) {
    const player = state && state.players ? state.players[playerIndex] : null;
    if (!player) return [];
    const groups = groupByBaseId(player.hand);
    const options = [];

    Object.keys(groups).forEach((baseId) => {
      if (groups[baseId].length === 4) {
        options.push({
          type: "ankan",
          label: `暗槓 ${TileUtil.getTileAriaLabel(groups[baseId][0])}`,
          tile: groups[baseId][0],
          consumeInstanceIds: groups[baseId].map((tile) => tile.instanceId),
        });
      }
    });

    (player.melds || []).forEach((meld, meldIndex) => {
      if (meld.type !== "pon" || !meld.tiles || meld.tiles.length === 0) return;
      const added = (groups[meld.tiles[0].baseId] || [])[0];
      if (added) {
        options.push({
          type: "kakan",
          label: `加槓 ${TileUtil.getTileAriaLabel(added)}`,
          tile: added,
          meldIndex,
          consumeInstanceIds: [added.instanceId],
        });
      }
    });

    const lastDiscard = state.lastDiscard;
    if (lastDiscard && lastDiscard.playerIndex !== playerIndex && lastDiscard.tile) {
      const matching = groups[lastDiscard.tile.baseId] || [];
      if (matching.length >= 3) {
        options.push({
          type: "minkan",
          label: `明槓 ${TileUtil.getTileAriaLabel(lastDiscard.tile)}`,
          tile: lastDiscard.tile,
          fromPlayerIndex: lastDiscard.playerIndex,
          consumeInstanceIds: matching.slice(0, 3).map((tile) => tile.instanceId),
        });
      }
    }
    return options;
  }

  function describeAvailability(state, playerIndex) {
    if (Sanma.KanRules) return Sanma.KanRules.describeAvailability(state, playerIndex, state && state.ruleConfig);
    const player = state && state.players ? state.players[playerIndex] : null;
    if (player && player.hasRiichi) {
      return { enabled: false, reason: "リーチ後はカンできません。", options: [] };
    }
    const options = getOptions(state, playerIndex);
    return options.length > 0
      ? { enabled: true, reason: "カン可能な牌があります。", options }
      : { enabled: false, reason: "カン可能な牌はありません。", options };
  }

  Sanma.KanManager = { getOptions, describeAvailability };
})(window);
