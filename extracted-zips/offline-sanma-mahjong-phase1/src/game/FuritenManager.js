(function attachFuritenManager(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function advancedConfig(ruleConfig) {
    return (ruleConfig && ruleConfig.advancedRules && ruleConfig.advancedRules.furiten) || {};
  }

  function createAnalysisTile(type, copyIndex) {
    return {
      suit: type.suit,
      rank: type.rank,
      baseId: type.tileType,
      instanceId: `furiten-analysis-${type.tileType}-${copyIndex}`,
      isRed: false,
    };
  }

  function currentWaitSet(player, ruleConfig) {
    if (!player || !Sanma.HandAnalysis) return [];
    const concealed = Array.isArray(player.hand) ? player.hand : [];
    const melds = Array.isArray(player.melds) ? player.melds : [];
    const ownedTiles = concealed.concat(melds.flatMap((meld) => (
      meld && Array.isArray(meld.tiles) ? meld.tiles : []
    )));
    return Sanma.HandAnalysis.getLegalTileTypes(ruleConfig || {}).filter((type) => {
      const ownedCount = ownedTiles.filter((tile) => tile && tile.baseId === type.tileType).length;
      if (ownedCount >= 4) return false;
      const candidate = createAnalysisTile(type, ownedCount);
      return Sanma.HandAnalysis.analyzeAgariWithMelds(
        concealed.concat(candidate),
        melds,
        ruleConfig || {}
      ).isAgari;
    }).map((type) => type.tileType);
  }

  function checkRonEligibility(input) {
    const options = input || {};
    const state = options.state || {};
    const player = state.players && state.players[options.playerIndex];
    const winningTile = options.winningTile;
    const rules = advancedConfig(options.ruleConfig || state.ruleConfig);
    const reasons = [];

    if (!player || !winningTile) {
      return { canRon: false, furiten: false, reasons: ["ロン判定に必要な情報がありません。"], canTsumo: true };
    }
    const waits = currentWaitSet(player, options.ruleConfig || state.ruleConfig);
    const discardedTypes = new Set((player.discards || []).filter(Boolean).map((tile) => tile.baseId));
    if (rules.genbutsu !== false && waits.some((tileType) => discardedTypes.has(tileType))) {
      reasons.push("現物フリテン");
    }
    if (rules.sameTurn !== false && player.sameTurnFuriten) {
      reasons.push("同巡フリテン");
    }
    if (rules.riichiMissedWin !== false && player.riichiMissedWin) {
      reasons.push("リーチ後見逃しフリテン");
    }

    return {
      canRon: reasons.length === 0,
      furiten: reasons.length > 0,
      reasons,
      canTsumo: rules.tsumoAllowedWhileFuriten !== false,
      waits,
    };
  }

  function markMissedRon(state, playerIndex) {
    const player = state && state.players ? state.players[playerIndex] : null;
    if (!player) return false;
    player.sameTurnFuriten = true;
    if (player.hasRiichi || (player.riichi && player.riichi.declared)) {
      player.riichiMissedWin = true;
    }
    return true;
  }

  function clearSameTurn(player) {
    if (!player) return false;
    player.sameTurnFuriten = false;
    return true;
  }

  Sanma.FuritenManager = {
    currentWaitSet,
    checkRonEligibility,
    markMissedRon,
    clearSameTurn,
  };
})(window);
