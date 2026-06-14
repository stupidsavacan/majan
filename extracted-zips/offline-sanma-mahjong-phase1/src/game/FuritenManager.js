(function attachFuritenManager(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function advancedConfig(ruleConfig) {
    return (ruleConfig && ruleConfig.advancedRules && ruleConfig.advancedRules.furiten) || {};
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
    if (rules.genbutsu !== false
      && (player.discards || []).some((tile) => tile && tile.baseId === winningTile.baseId)) {
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
    checkRonEligibility,
    markMissedRon,
    clearSameTurn,
  };
})(window);
