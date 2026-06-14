(function attachAssistManager(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function collectTileInstanceIds(state) {
    const ids = [];
    const wall = state && state.wall;
    ["tiles", "deadWall"].forEach((key) => {
      (wall && Array.isArray(wall[key]) ? wall[key] : []).forEach((tile) => {
        if (tile && tile.instanceId) ids.push(tile.instanceId);
      });
    });
    (state && Array.isArray(state.players) ? state.players : []).forEach((player) => {
      ["hand", "discards", "kitaTiles"].forEach((key) => {
        (player && Array.isArray(player[key]) ? player[key] : []).forEach((tile) => {
          if (tile && tile.instanceId) ids.push(tile.instanceId);
        });
      });
      (player && Array.isArray(player.melds) ? player.melds : []).forEach((meld) => {
        (meld && Array.isArray(meld.tiles) ? meld.tiles : []).forEach((tile) => {
          if (tile && tile.instanceId) ids.push(tile.instanceId);
        });
      });
    });
    return ids;
  }

  function tileIntegrity(state) {
    const ids = collectTileInstanceIds(state);
    const seen = new Set();
    const duplicateInstanceIds = [];
    ids.forEach((id) => {
      if (seen.has(id)) duplicateInstanceIds.push(id);
      seen.add(id);
    });
    return {
      tileCount: ids.length,
      duplicateInstanceIds,
      valid: duplicateInstanceIds.length === 0,
    };
  }

  function getRate(ruleConfig, phase, player) {
    if (phase === "opening") return Number(ruleConfig.dramaticOpeningHandRate) || 0;
    if (phase !== "draw" || ruleConfig.dramaticDrawAssist !== true) return 0;
    return player && player.isHuman
      ? Number(ruleConfig.dramaticDrawAssistRate) || 0
      : Number(ruleConfig.cpuDramaticDrawAssistRate) || 0;
  }

  function evaluate(input) {
    const options = input || {};
    const state = options.state || {};
    const ruleConfig = options.ruleConfig || state.ruleConfig || {};
    const player = options.player || null;
    const phase = options.phase || "draw";
    const before = tileIntegrity(state);
    const enabled = ruleConfig.dramaticLuckAssist === true && getRate(ruleConfig, phase, player) > 0;
    const random = typeof options.random === "function" ? options.random : Math.random;
    const rate = enabled ? getRate(ruleConfig, phase, player) : 0;
    const roll = enabled ? random() : null;
    const conditionMet = enabled && roll < rate;
    const after = tileIntegrity(state);
    let reason = "補助設定が無効です。";
    if (enabled && !conditionMet) reason = "補助条件に達しませんでした。";
    if (conditionMet) reason = "条件に達しましたが、安全な牌交換は未実装のため記録のみです。";

    return {
      type: "assist",
      phase,
      playerIndex: player && Number.isInteger(player.id) ? player.id : null,
      enabled,
      applied: false,
      rate,
      roll,
      reason,
      tileCountIntegrityChecked: true,
      beforeTileCount: before.tileCount,
      afterTileCount: after.tileCount,
      duplicateInstanceIds: after.duplicateInstanceIds,
      integrityValid: before.valid && after.valid && before.tileCount === after.tileCount,
    };
  }

  function evaluateOpening(input) {
    return evaluate(Object.assign({}, input || {}, { phase: "opening" }));
  }

  function evaluateDraw(input) {
    return evaluate(Object.assign({}, input || {}, { phase: "draw" }));
  }

  Sanma.AssistManager = { evaluate, evaluateOpening, evaluateDraw, tileIntegrity };
})(window);
