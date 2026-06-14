(function attachKitaManager(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function northTiles(player) {
    return (player && player.hand ? player.hand : []).filter((tile) => tile.suit === "z" && tile.rank === 4);
  }

  function canExtract(state, playerIndex) {
    const player = state && state.players ? state.players[playerIndex] : null;
    if (!player) return { enabled: false, reason: "プレイヤーが見つかりません。", options: [] };
    if (player.hasRiichi) return { enabled: false, reason: "リーチ後は北抜きできません。", options: [] };
    if (Sanma.SanmaRuleDetails
      ? !Sanma.SanmaRuleDetails.canExtractKita(state.ruleConfig)
      : (!state.ruleConfig || state.ruleConfig.northMode !== "kita-dora")) {
      return { enabled: false, reason: "北抜きルールではありません。", options: [] };
    }
    const options = northTiles(player);
    return options.length > 0
      ? { enabled: true, reason: "手牌の北を抜けます。", options }
      : { enabled: false, reason: "手牌に北がありません。", options };
  }

  function extract(state, playerIndex, instanceId) {
    const availability = canExtract(state, playerIndex);
    if (!availability.enabled) return { applied: false, reason: availability.reason };
    const player = state.players[playerIndex];
    const target = instanceId
      ? availability.options.find((tile) => tile.instanceId === instanceId)
      : availability.options[0];
    if (!target) return { applied: false, reason: "指定された北が手牌にありません。" };

    const index = player.hand.findIndex((tile) => tile.instanceId === target.instanceId);
    const extracted = player.hand.splice(index, 1)[0];
    player.kitaTiles.push(extracted);
    const shouldReplace = !Sanma.SanmaRuleDetails
      || Sanma.SanmaRuleDetails.shouldDrawKitaReplacement(state.ruleConfig);
    const replacement = shouldReplace && state.wall && typeof state.wall.draw === "function" ? state.wall.draw() : null;
    if (replacement) player.receiveTile(replacement);
    state.lastDrawContext = { playerIndex, isRinshan: false, isKitaReplacement: Boolean(replacement) };
    return {
      applied: true,
      extracted,
      replacement,
      reason: replacement ? "北を抜いて補充牌をツモりました。" : "北を抜きましたが、補充できる牌がありません。",
    };
  }

  Sanma.KitaManager = { canExtract, extract };
})(window);
