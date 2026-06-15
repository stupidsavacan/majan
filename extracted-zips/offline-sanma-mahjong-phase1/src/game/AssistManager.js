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

  function usageFor(state) {
    state.assistUsage = state.assistUsage || { opening: 0, drawsByPlayer: Object.create(null) };
    state.assistUsage.drawsByPlayer = state.assistUsage.drawsByPlayer || Object.create(null);
    return state.assistUsage;
  }

  function usageAllowed(state, ruleConfig, phase, player) {
    const usage = usageFor(state);
    if (phase === "opening") return usage.opening < 1;
    const used = Number(usage.drawsByPlayer[player.id]) || 0;
    const limit = player.isHuman
      ? Number(ruleConfig.maxAssistDrawsPerRoundForHuman) || 0
      : Number(ruleConfig.maxAssistDrawsPerRoundForCpu) || 0;
    return used < limit;
  }

  function markUsage(state, phase, player) {
    const usage = usageFor(state);
    if (phase === "opening") {
      usage.opening += 1;
    } else {
      usage.drawsByPlayer[player.id] = (Number(usage.drawsByPlayer[player.id]) || 0) + 1;
    }
  }

  function shanten(player, hand, ruleConfig) {
    return Sanma.CpuStrategy.estimateShanten({
      tiles: hand,
      ruleConfig,
      openMeldCount: Array.isArray(player.melds) ? player.melds.length : 0,
    });
  }

  function findSwap(state, player, phase, ruleConfig) {
    if (!player || !Array.isArray(player.hand) || !state.wall || !Array.isArray(state.wall.tiles)) return null;
    if (player.hand.length === 0 || state.wall.tiles.length === 0) return null;
    let handIndices;
    if (phase === "draw") {
      const drawIndex = player.lastDraw
        ? player.hand.findIndex((tile) => tile.instanceId === player.lastDraw.instanceId)
        : -1;
      if (drawIndex < 0) return null;
      handIndices = [drawIndex];
    } else {
      const discard = Sanma.CpuStrategy.chooseDiscard({ player, ruleConfig, random: () => 0 });
      const discardIndex = player.hand.findIndex((tile) => tile.instanceId === discard.tileInstanceId);
      handIndices = discardIndex >= 0 ? [discardIndex] : [];
    }
    if (handIndices.length === 0) return null;

    const baseline = shanten(player, player.hand, ruleConfig);
    let best = null;
    handIndices.forEach((handIndex) => {
      state.wall.tiles.forEach((candidate, wallIndex) => {
        const simulated = player.hand.slice();
        simulated[handIndex] = candidate;
        const candidateShanten = shanten(player, simulated, ruleConfig);
        if (candidateShanten >= baseline) return;
        if (!best || candidateShanten < best.afterShanten
          || (candidateShanten === best.afterShanten
            && String(candidate.instanceId).localeCompare(String(best.incoming.instanceId)) < 0)) {
          best = {
            handIndex,
            wallIndex,
            outgoing: player.hand[handIndex],
            incoming: candidate,
            beforeShanten: baseline,
            afterShanten: candidateShanten,
          };
        }
      });
    });
    return best;
  }

  function applySwap(state, player, phase, swap) {
    const replacedLastDraw = player.lastDraw
      && swap.outgoing
      && player.lastDraw.instanceId === swap.outgoing.instanceId;
    player.hand[swap.handIndex] = swap.incoming;
    state.wall.tiles[swap.wallIndex] = swap.outgoing;
    if (phase === "draw" || replacedLastDraw) player.lastDraw = swap.incoming;
    if (typeof player.sortHand === "function") player.sortHand();
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
    const allowed = enabled && player && usageAllowed(state, ruleConfig, phase, player);
    const conditionMet = allowed && roll < rate;
    const swap = conditionMet ? findSwap(state, player, phase, ruleConfig) : null;
    if (swap) {
      applySwap(state, player, phase, swap);
      markUsage(state, phase, player);
    }
    const after = tileIntegrity(state);
    let reason = "補助設定が無効です。";
    if (enabled && !allowed) reason = "この局の補助回数上限に達しています。";
    else if (allowed && !conditionMet) reason = "補助条件に達しませんでした。";
    else if (conditionMet && !swap) reason = "手牌を改善する安全な交換候補がありません。";
    else if (swap) reason = `手牌改善のため山牌と交換しました。シャンテン推定 ${swap.beforeShanten} → ${swap.afterShanten}`;

    return {
      type: "assist",
      phase,
      playerIndex: player && Number.isInteger(player.id) ? player.id : null,
      enabled,
      applied: Boolean(swap),
      rate,
      roll,
      reason,
      beforeShanten: swap ? swap.beforeShanten : null,
      afterShanten: swap ? swap.afterShanten : null,
      outgoing: swap ? swap.outgoing : null,
      incoming: swap ? swap.incoming : null,
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

  Sanma.AssistManager = {
    evaluate,
    evaluateOpening,
    evaluateDraw,
    tileIntegrity,
    findSwap,
  };
})(window);
