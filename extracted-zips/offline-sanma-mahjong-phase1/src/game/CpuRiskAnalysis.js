(function attachCpuRiskAnalysis(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function playersOf(state) {
    return Array.isArray(state && state.players) ? state.players : [];
  }

  function isRiichi(player) {
    return Boolean(player && (
      player.hasRiichi
      || (player.riichi && (player.riichi.declared || player.riichi.pending))
    ));
  }

  function isDealer(state, playerIndex) {
    return Boolean(state && state.round && state.round.dealerIndex === playerIndex);
  }

  function wallRemaining(state) {
    if (state && state.wall && typeof state.wall.remainingCount === "function") {
      return state.wall.remainingCount();
    }
    return Number.isFinite(state && state.wallRemaining) ? Number(state.wallRemaining) : 70;
  }

  function maxCopies(tile, ruleConfig) {
    if (!tile) return 4;
    if (tile.suit === "m" && tile.rank > 1 && tile.rank < 9) return 0;
    if (tile.suit === "z" && tile.rank === 4 && ruleConfig && ruleConfig.northMode === "disabled") return 0;
    return 4;
  }

  function baseId(suit, rank) {
    return Sanma.TileUtil && Sanma.TileUtil.baseId
      ? Sanma.TileUtil.baseId(suit, rank)
      : `${suit}${rank}`;
  }

  function discardBaseIds(player) {
    return new Set((player && player.discards || []).filter(Boolean).map((tile) => tile.baseId));
  }

  function countVisible(state, playerIndex, baseIdToCount) {
    if (baseIdToCount) return baseIdToCount;
    if (Sanma.CpuVisibleTiles && typeof Sanma.CpuVisibleTiles.getVisibleCountsForPlayer === "function") {
      return Sanma.CpuVisibleTiles.getVisibleCountsForPlayer(state, playerIndex);
    }
    return Object.create(null);
  }

  function getOpponentThreats(state, playerIndex) {
    const players = playersOf(state);
    const remaining = wallRemaining(state);
    return players
      .map((player, opponentIndex) => {
        if (!player || opponentIndex === playerIndex) return null;
        const openMeldCount = (player.melds || []).filter((meld) => meld && meld.open).length;
        const kitaCount = (player.kitaTiles || []).length;
        const riichi = isRiichi(player);
        let threatLevel = riichi ? 70 : 8;
        if (openMeldCount >= 2) threatLevel += 24;
        else if (openMeldCount === 1) threatLevel += 12;
        if (isDealer(state, opponentIndex)) threatLevel += 8;
        threatLevel += Math.min(16, kitaCount * 4);
        if (remaining <= 18) threatLevel += 8;
        if (remaining <= 8) threatLevel += 8;
        return {
          playerIndex: opponentIndex,
          playerName: player.name || `P${opponentIndex}`,
          riichi,
          dealer: isDealer(state, opponentIndex),
          openMeldCount,
          kitaCount,
          discardCount: (player.discards || []).length,
          threatLevel: clamp(threatLevel, 0, 100),
        };
      })
      .filter(Boolean);
  }

  function isSujiSafe(opponent, tile) {
    if (!tile || (tile.suit !== "p" && tile.suit !== "s" && tile.suit !== "m")) return false;
    const discarded = discardBaseIds(opponent);
    if (tile.rank <= 3 && discarded.has(baseId(tile.suit, tile.rank + 3))) return true;
    if (tile.rank >= 7 && discarded.has(baseId(tile.suit, tile.rank - 3))) return true;
    if (tile.rank >= 4 && tile.rank <= 6) {
      return discarded.has(baseId(tile.suit, tile.rank - 3))
        || discarded.has(baseId(tile.suit, tile.rank + 3));
    }
    return false;
  }

  function kabeReduction(state, playerIndex, tile, visibleCounts) {
    if (!tile || (tile.suit !== "p" && tile.suit !== "s" && tile.suit !== "m")) return 0;
    const counts = countVisible(state, playerIndex, visibleCounts);
    let reduction = 0;
    [-2, -1, 1, 2].forEach((offset) => {
      const rank = tile.rank + offset;
      if (rank < 1 || rank > 9) return;
      const count = counts[baseId(tile.suit, rank)] || 0;
      if (count >= 4) reduction += Math.abs(offset) === 1 ? 14 : 7;
    });
    return clamp(reduction, 0, 24);
  }

  function isDoraLike(state, tile) {
    const indicators = state && state.wall && Array.isArray(state.wall.doraIndicators)
      ? state.wall.doraIndicators
      : Array.isArray(state && state.doraIndicators) ? state.doraIndicators : [];
    return indicators.some((indicator) => indicator && indicator.baseId === tile.baseId);
  }

  function scoreTileDangerDetails(state, playerIndex, tile, opponentIndex) {
    const players = playersOf(state);
    const opponent = players[opponentIndex];
    const threats = getOpponentThreats(state, playerIndex);
    const threat = threats.find((entry) => entry.playerIndex === opponentIndex) || {
      riichi: false,
      dealer: false,
      openMeldCount: 0,
      threatLevel: 8,
    };
    const visibleCounts = countVisible(state, playerIndex);
    const visibleCount = tile && tile.baseId ? visibleCounts[tile.baseId] || 0 : 0;
    const reasons = [];

    if (!tile || !opponent) {
      return { danger: 50, reasons: ["評価対象なし"], opponentThreat: threat };
    }
    if (visibleCount >= maxCopies(tile, state && state.ruleConfig)) {
      return { danger: 0, reasons: ["4枚見え"], opponentThreat: threat };
    }
    if (threat.riichi && discardBaseIds(opponent).has(tile.baseId)) {
      return { danger: 2, reasons: ["現物"], opponentThreat: threat };
    }

    let danger = 10 + (threat.threatLevel * 0.45);
    if (threat.riichi) reasons.push("リーチ者あり");
    if (threat.dealer) reasons.push("親");
    if (threat.openMeldCount > 0) reasons.push(`副露${threat.openMeldCount}`);

    if (tile.suit === "z") {
      danger += visibleCount === 0 ? 22 : 10;
      danger -= visibleCount * 8;
      reasons.push(visibleCount === 0 ? "初牌字牌" : "字牌見え");
    } else {
      if (tile.rank >= 3 && tile.rank <= 7) {
        danger += tile.rank === 5 ? 16 : 10;
        reasons.push("中張牌");
      } else if (tile.rank === 2 || tile.rank === 8) {
        danger += 5;
        reasons.push("辺張周辺");
      } else {
        danger -= 5;
        reasons.push("端牌");
      }
      if (threat.riichi && isSujiSafe(opponent, tile)) {
        danger -= 13;
        reasons.push("筋");
      }
      const kabe = kabeReduction(state, playerIndex, tile, visibleCounts);
      if (kabe > 0) {
        danger -= kabe;
        reasons.push("壁");
      }
    }

    if (isDoraLike(state, tile)) {
      danger += 12;
      reasons.push("ドラ表示周辺");
    }

    return {
      danger: clamp(Math.round(danger), 0, 120),
      reasons,
      opponentThreat: threat,
    };
  }

  function scoreTileDangerAgainstOpponent(state, playerIndex, tile, opponentIndex) {
    return scoreTileDangerDetails(state, playerIndex, tile, opponentIndex).danger;
  }

  function explainTileDanger(state, playerIndex, tile) {
    const threats = getOpponentThreats(state, playerIndex);
    if (threats.length === 0) return { danger: 0, reasons: ["相手なし"], byOpponent: [] };
    const byOpponent = threats.map((threat) => Object.assign(
      { playerIndex: threat.playerIndex },
      scoreTileDangerDetails(state, playerIndex, tile, threat.playerIndex)
    ));
    byOpponent.sort((left, right) => right.danger - left.danger);
    const top = byOpponent[0] || { danger: 0, reasons: [] };
    return {
      danger: top.danger,
      reasons: top.reasons || [],
      byOpponent,
    };
  }

  function scoreTileDanger(state, playerIndex, tile) {
    return explainTileDanger(state, playerIndex, tile).danger;
  }

  function choosePushFoldMode(state, playerIndex, handValue, shanten) {
    const threats = getOpponentThreats(state, playerIndex);
    const maxThreat = threats.reduce((max, threat) => Math.max(max, threat.threatLevel), 0);
    const value = Number(handValue) || 0;
    const currentShanten = Number.isFinite(shanten) ? shanten : 3;
    if (maxThreat >= 60 && currentShanten >= 2 && value < 55) return "fold";
    if (maxThreat >= 75 && currentShanten >= 1 && value < 40) return "fold";
    if (maxThreat >= 45 && currentShanten >= 2) return "fold";
    if (currentShanten <= 0 && value >= 35) return "push";
    if (currentShanten <= 1 && value >= 55) return "push";
    if (maxThreat >= 40) return "balanced";
    return currentShanten <= 1 ? "push" : "balanced";
  }

  Sanma.CpuRiskAnalysis = {
    getOpponentThreats,
    scoreTileDangerAgainstOpponent,
    scoreTileDanger,
    explainTileDanger,
    choosePushFoldMode,
  };
})(window);
