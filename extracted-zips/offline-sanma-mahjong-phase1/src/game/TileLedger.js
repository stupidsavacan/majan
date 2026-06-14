(function attachTileLedger(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function expectedTileCount(ruleConfig) {
    return ruleConfig && ruleConfig.northMode === "disabled" ? 104 : 108;
  }

  function inspect(state, ruleConfig) {
    const errors = [];
    const warnings = [];
    const entries = [];
    const byId = Object.create(null);
    const counts = {
      wall: 0,
      deadWall: 0,
      doraIndicators: 0,
      hands: 0,
      discards: 0,
      melds: 0,
      kita: 0,
      total: 0,
    };

    function add(tile, location, countKey) {
      if (!tile) {
        errors.push(`null牌を検出しました: ${location}`);
        return;
      }
      if (!tile.instanceId) {
        errors.push(`instanceIdのない牌を検出しました: ${location}`);
        return;
      }
      if (tile.isRed && !["p", "s"].includes(tile.suit)) {
        warnings.push(`赤牌の牌種が不正です: ${tile.instanceId}`);
      }
      if (tile.isRed && tile.rank !== 5) {
        warnings.push(`赤牌が5ではありません: ${tile.instanceId}`);
      }
      const entry = { instanceId: tile.instanceId, baseId: tile.baseId, location, tile };
      entries.push(entry);
      counts[countKey] += 1;
      counts.total += 1;
      if (byId[tile.instanceId]) {
        errors.push(`牌IDが重複しています: ${tile.instanceId} (${byId[tile.instanceId].location}, ${location})`);
      } else {
        byId[tile.instanceId] = entry;
      }
    }

    const wall = state && state.wall;
    (wall && Array.isArray(wall.tiles) ? wall.tiles : []).forEach((tile, index) => add(tile, `wall[${index}]`, "wall"));
    (wall && Array.isArray(wall.deadWall) ? wall.deadWall : []).forEach((tile, index) => add(tile, `deadWall[${index}]`, "deadWall"));
    (state && Array.isArray(state.players) ? state.players : []).forEach((player, playerIndex) => {
      (player.hand || []).forEach((tile, index) => add(tile, `hand[${playerIndex}][${index}]`, "hands"));
      (player.discards || []).forEach((tile, index) => add(tile, `discard[${playerIndex}][${index}]`, "discards"));
      (player.melds || []).forEach((meld, meldIndex) => {
        (meld.tiles || []).forEach((tile, index) => add(tile, `meld[${playerIndex}][${meldIndex}][${index}]`, "melds"));
      });
      (player.kitaTiles || []).forEach((tile, index) => add(tile, `kita[${playerIndex}][${index}]`, "kita"));
    });

    const doraIndicators = wall && Array.isArray(wall.doraIndicators)
      ? wall.doraIndicators
      : (state && Array.isArray(state.doraIndicators) ? state.doraIndicators : []);
    counts.doraIndicators = doraIndicators.length;
    doraIndicators.forEach((tile) => {
      if (!tile || !tile.instanceId || !byId[tile.instanceId]) {
        errors.push("ドラ表示牌が牌台帳に存在しません");
      }
    });

    const expected = expectedTileCount(ruleConfig || (state && state.ruleConfig));
    if (counts.total !== expected) {
      errors.push(`牌総数が不正です: ${counts.total}/${expected}`);
    }
    return {
      ok: errors.length === 0,
      errors,
      warnings,
      counts,
      expectedTileCount: expected,
    };
  }

  Sanma.TileLedger = {
    expectedTileCount,
    inspect,
  };
})(window);
