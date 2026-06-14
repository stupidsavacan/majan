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
    if (player.riichi && player.riichi.pending) {
      return { enabled: false, reason: "リーチ宣言牌を選択中です。" };
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
    const discardOptions = getDeclarationDiscardOptions(state, playerIndex);
    if (!tenpai.isTenpai || discardOptions.length === 0) {
      return { enabled: false, reason: "リーチ宣言後に聴牌を維持できる打牌がありません。", tenpai, discardOptions };
    }
    return { enabled: true, reason: "リーチ宣言牌を選択できます。", tenpai, discardOptions };
  }

  function getDeclarationDiscardOptions(state, playerIndex) {
    const player = state && state.players ? state.players[playerIndex] : null;
    if (!player) return [];
    const tiles = analysisTiles(player);
    if (tiles.length !== 14) return [];
    return player.hand.filter((candidate) => {
      const remaining = tiles.filter((tile) => tile.instanceId !== candidate.instanceId);
      return Sanma.HandAnalysis.analyzeTenpai(remaining, state.ruleConfig || {}).isTenpai;
    });
  }

  function canDeclareDiscard(state, playerIndex, tile) {
    const player = state && state.players ? state.players[playerIndex] : null;
    if (!player || !player.riichi || !player.riichi.pending || !tile) return false;
    return (player.riichi.pendingDiscardInstanceIds || []).includes(tile.instanceId);
  }

  function declare(state, playerIndex) {
    const availability = canDeclare(state, playerIndex);
    if (!availability.enabled) return { applied: false, reason: availability.reason };
    const player = state.players[playerIndex];
    player.riichi = Object.assign({}, player.riichi, {
      declared: false,
      pending: true,
      ippatsu: false,
      discardLocked: false,
      riichiStickPaid: false,
      pendingDiscardInstanceIds: availability.discardOptions.map((tile) => tile.instanceId),
    });
    return {
      applied: true,
      pending: true,
      reason: `${player.name || "プレイヤー"}のリーチ宣言牌を選択してください。`,
      discardOptions: availability.discardOptions,
    };
  }

  function finalizeDeclaration(state, playerIndex, discardedTile) {
    const player = state && state.players ? state.players[playerIndex] : null;
    if (!player || !player.riichi || !player.riichi.pending) {
      return { applied: false, reason: "リーチ宣言待ちではありません。" };
    }
    if (!canDeclareDiscard(state, playerIndex, discardedTile)) {
      return { applied: false, reason: "聴牌を維持するリーチ宣言牌ではありません。" };
    }
    const rules = rulesFor(state);
    const stickValue = Number(state.ruleConfig && state.ruleConfig.riichiStickValue) || 1000;
    player.points -= stickValue;
    player.hasRiichi = true;
    player.ippatsuActive = rules.ippatsu !== false;
    player.riichi = {
      declared: true,
      pending: false,
      turnIndex: Number.isInteger(state.turnIndex) ? state.turnIndex : null,
      ippatsu: player.ippatsuActive,
      discardLocked: true,
      riichiStickPaid: true,
      declarationDiscardInstanceId: discardedTile ? discardedTile.instanceId : null,
      pendingDiscardInstanceIds: [],
    };
    if (state.round) state.round.riichiSticks = (Number(state.round.riichiSticks) || 0) + 1;
    return { applied: true, finalized: true, reason: `${player.name || "プレイヤー"}がリーチを宣言しました。` };
  }

  function handleDiscard(state, playerIndex, discardedTile) {
    const player = state && state.players ? state.players[playerIndex] : null;
    if (!player) return { applied: false, reason: "プレイヤーが見つかりません。" };
    if (player.riichi && player.riichi.pending) {
      return finalizeDeclaration(state, playerIndex, discardedTile);
    }
    if (player.hasRiichi && player.ippatsuActive) {
      player.ippatsuActive = false;
      if (player.riichi) player.riichi.ippatsu = false;
      return { applied: true, ippatsuExpired: true, reason: "一発有効巡が終了しました。" };
    }
    return { applied: true, reason: "" };
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
    getDeclarationDiscardOptions,
    canDeclareDiscard,
    declare,
    finalizeDeclaration,
    handleDiscard,
    clearIppatsu,
  };
})(window);
