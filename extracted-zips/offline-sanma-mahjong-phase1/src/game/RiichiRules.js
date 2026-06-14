(function attachRiichiRules(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function rulesFor(state) {
    return (state && state.ruleConfig && state.ruleConfig.advancedRules && state.ruleConfig.advancedRules.riichi) || {};
  }

  function isMenzen(player) {
    return Boolean(player && (player.melds || []).every((meld) => meld.open === false));
  }

  function analysisTiles(player) {
    const tiles = (player && player.hand ? player.hand : []).slice();
    (player && player.melds ? player.melds : []).forEach((meld) => {
      tiles.push(...(Array.isArray(meld.tiles) ? meld.tiles.slice(0, 3) : []));
    });
    return tiles;
  }

  function canDeclare(state, playerIndex) {
    const player = state && state.players ? state.players[playerIndex] : null;
    const rules = rulesFor(state);
    if (!player) return { enabled: false, reason: "プレイヤーが見つかりません。" };
    if (player.hasRiichi || (player.riichi && player.riichi.declared)) {
      return { enabled: false, reason: "すでにリーチしています。" };
    }
    if (rules.requiresMenzen !== false && !isMenzen(player)) {
      return { enabled: false, reason: "門前ではありません。" };
    }
    const minimumPoints = Number.isFinite(rules.minPoints) ? rules.minPoints : 1000;
    if (Number(player.points) < minimumPoints) {
      return { enabled: false, reason: `持ち点${minimumPoints}点未満です。` };
    }
    if (rules.forbidIfNoDrawLeft !== false
      && state.wall
      && typeof state.wall.remainingCount === "function"
      && state.wall.remainingCount() <= 0) {
      return { enabled: false, reason: "次の自摸牌が残っていないためリーチできません。" };
    }

    const tenpai = Sanma.HandAnalysis.analyzeTenpai(analysisTiles(player), state.ruleConfig || {});
    if (!tenpai.isTenpai) return { enabled: false, reason: "聴牌していません。", tenpai };
    return { enabled: true, reason: "門前聴牌かつ供託点を支払えます。", tenpai };
  }

  function declare(state, playerIndex) {
    const availability = canDeclare(state, playerIndex);
    if (!availability.enabled) return { applied: false, reason: availability.reason };
    const player = state.players[playerIndex];
    const rules = rulesFor(state);
    const stickValue = Number(state.ruleConfig && state.ruleConfig.riichiStickValue) || 1000;
    const turnIndex = Number.isInteger(state.turnIndex) ? state.turnIndex : null;

    player.points -= stickValue;
    player.hasRiichi = true;
    player.ippatsuActive = rules.ippatsu !== false;
    player.riichi = {
      declared: true,
      turnIndex,
      ippatsu: player.ippatsuActive,
      discardLocked: true,
      riichiStickPaid: true,
    };
    if (state.round) state.round.riichiSticks = (Number(state.round.riichiSticks) || 0) + 1;
    return { applied: true, reason: `${player.name || "プレイヤー"}がリーチを宣言しました。` };
  }

  function clearIppatsu(state) {
    (state && state.players ? state.players : []).forEach((player) => {
      player.ippatsuActive = false;
      if (player.riichi) player.riichi.ippatsu = false;
    });
  }

  Sanma.RiichiRules = {
    isMenzen,
    analysisTiles,
    canDeclare,
    declare,
    clearIppatsu,
  };
})(window);
