(function attachRiichiManager(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function isMenzen(player) {
    if (Sanma.RiichiRules) return Sanma.RiichiRules.isMenzen(player);
    return Boolean(player && (player.melds || []).every((meld) => meld.open === false));
  }

  function analysisTiles(player) {
    const tiles = (player && player.hand ? player.hand : []).slice();
    (player && player.melds ? player.melds : []).forEach((meld) => {
      const meldTiles = Array.isArray(meld.tiles) ? meld.tiles : [];
      tiles.push(...meldTiles.slice(0, 3));
    });
    return tiles;
  }

  function canDeclare(state, playerIndex) {
    if (Sanma.RiichiRules) return Sanma.RiichiRules.canDeclare(state, playerIndex);
    const player = state && state.players ? state.players[playerIndex] : null;
    if (!player) return { enabled: false, reason: "プレイヤーが見つかりません。" };
    if (player.hasRiichi) return { enabled: false, reason: "すでにリーチしています。" };
    if (!isMenzen(player)) return { enabled: false, reason: "門前ではありません。" };
    if (Number(player.points) < 1000) return { enabled: false, reason: "持ち点が1000点未満です。" };

    const tenpai = Sanma.HandAnalysis.analyzeTenpai(analysisTiles(player), state.ruleConfig || {});
    if (!tenpai.isTenpai) return { enabled: false, reason: "聴牌していません。", tenpai };
    return { enabled: true, reason: "門前聴牌かつ1000点以上あります。", tenpai };
  }

  function declare(state, playerIndex) {
    if (Sanma.RiichiRules) return Sanma.RiichiRules.declare(state, playerIndex);
    const availability = canDeclare(state, playerIndex);
    if (!availability.enabled) return { applied: false, reason: availability.reason };
    const player = state.players[playerIndex];
    player.points -= 1000;
    player.hasRiichi = true;
    player.ippatsuActive = true;
    if (state.round) state.round.riichiSticks = (Number(state.round.riichiSticks) || 0) + 1;
    return { applied: true, reason: `${player.name || "プレイヤー"}がリーチを宣言しました。` };
  }

  Sanma.RiichiManager = { isMenzen, canDeclare, declare };
})(window);
