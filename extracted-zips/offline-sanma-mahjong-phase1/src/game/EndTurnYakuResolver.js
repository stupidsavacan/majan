(function attachEndTurnYakuResolver(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function resolve(input) {
    const options = input || {};
    const state = options.state || {};
    const player = state.players && state.players[options.playerIndex];
    const ruleConfig = options.ruleConfig || state.ruleConfig || {};
    const rules = (ruleConfig.advancedRules && ruleConfig.advancedRules.endTurnYaku) || {};
    const winType = options.winType || "debug";
    const lastDraw = state.lastDrawContext || {};
    const pending = state.pendingWinContext || {};
    const wallEmpty = Boolean(state.wall
      && typeof state.wall.remainingCount === "function"
      && state.wall.remainingCount() <= 0);
    const houteiEligible = Boolean(
      state.lastDiscard
        && state.lastDiscard.isFinalDrawDiscard === true
    );
    const isRinshan = rules.rinshanKaihou !== false
      && winType === "tsumo"
      && lastDraw.playerIndex === options.playerIndex
      && lastDraw.isRinshan === true;
    const isChankan = rules.chankan !== false && winType === "ron" && pending.isChankan === true;
    const isRiichi = Boolean(player && (player.hasRiichi || (player.riichi && player.riichi.declared)));
    const uraEnabled = isRiichi
      && ruleConfig.uraDora !== false
      && (!ruleConfig.advancedRules
        || !ruleConfig.advancedRules.riichi
        || ruleConfig.advancedRules.riichi.uraDora !== false);

    let uraDoraIndicators = uraEnabled && state.wall && typeof state.wall.getUraDoraIndicators === "function"
      ? state.wall.getUraDoraIndicators()
      : [];
    const kanRules = (ruleConfig.advancedRules && ruleConfig.advancedRules.kan) || {};
    if (kanRules.kanUra === false) uraDoraIndicators = uraDoraIndicators.slice(0, 1);

    return {
      isTsumo: winType === "tsumo",
      isRiichi,
      isIppatsu: isRiichi && Boolean(player && player.ippatsuActive),
      isRinshan,
      isChankan,
      isTenho: winType === "tsumo" && lastDraw.isTenho === true,
      isChiho: winType === "tsumo" && lastDraw.isChiho === true,
      isHaitei: rules.haitei !== false && winType === "tsumo" && wallEmpty && !isRinshan && !lastDraw.isKitaReplacement,
      isHoutei: rules.houtei !== false && winType === "ron" && wallEmpty && houteiEligible && !isChankan,
      uraDoraIndicators,
    };
  }

  Sanma.EndTurnYakuResolver = { resolve };
})(window);
