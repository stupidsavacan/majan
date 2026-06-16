(function attachKanRules(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function rulesFor(state, ruleConfig) {
    const config = ruleConfig || (state && state.ruleConfig) || {};
    return (config.advancedRules && config.advancedRules.kan) || {};
  }

  function hasLiveWall(state) {
    return Boolean(state && state.wall
      && typeof state.wall.remainingCount === "function"
      && state.wall.remainingCount() > 0);
  }

  function createAnalysisTile(type, copyIndex) {
    return {
      suit: type.suit,
      rank: type.rank,
      baseId: type.tileType,
      instanceId: `riichi-kan-analysis-${type.tileType}-${copyIndex}`,
      isRed: false,
    };
  }

  function waitTypes(concealedTiles, melds, ruleConfig) {
    const ownedTiles = concealedTiles.concat((melds || []).flatMap((meld) => (
      meld && Array.isArray(meld.tiles) ? meld.tiles : []
    )));
    return Sanma.HandAnalysis.getLegalTileTypes(ruleConfig || {}).filter((type) => {
      const ownedCount = ownedTiles.filter((tile) => tile && tile.baseId === type.tileType).length;
      if (ownedCount >= 4) return false;
      return Sanma.HandAnalysis.analyzeAgariWithMelds(
        concealedTiles.concat(createAnalysisTile(type, ownedCount)),
        melds || [],
        ruleConfig || {}
      ).isAgari;
    }).map((type) => type.tileType).sort();
  }

  function sameWaits(left, right) {
    return left.length > 0 && left.length === right.length
      && left.every((value, index) => value === right[index]);
  }

  function riichiAnkanKeepsWait(state, playerIndex, option) {
    const player = state.players[playerIndex];
    if (!player || !player.lastDraw || option.type !== "ankan"
      || !(option.consumeInstanceIds || []).includes(player.lastDraw.instanceId)) return false;
    const consumed = new Set(option.consumeInstanceIds || []);
    const consumedTiles = (player.hand || []).filter((tile) => consumed.has(tile.instanceId));
    const before = (player.hand || []).filter((tile) => tile.instanceId !== player.lastDraw.instanceId);
    const after = (player.hand || []).filter((tile) => !consumed.has(tile.instanceId));
    const afterMelds = (player.melds || []).concat({
      type: "kan",
      kanType: "ankan",
      open: false,
      tiles: consumedTiles,
    });
    return sameWaits(
      waitTypes(before, player.melds || [], state.ruleConfig),
      waitTypes(after, afterMelds, state.ruleConfig)
    );
  }

  function getAvailableKanActions(input) {
    const options = input || {};
    const state = options.state || {};
    const player = state.players && state.players[options.playerIndex];
    if (!player) return [];
    let candidates = Sanma.KanManager.getOptions(state, options.playerIndex);
    if (!hasLiveWall(state)) {
      candidates = candidates.filter((candidate) => candidate.type !== "minkan");
    }
    if (!player.hasRiichi) return candidates;
    return candidates.filter((candidate) => candidate.type === "ankan"
      && riichiAnkanKeepsWait(state, options.playerIndex, candidate));
  }

  function describeAvailability(state, playerIndex, ruleConfig) {
    const options = getAvailableKanActions({ state, playerIndex, ruleConfig });
    return options.length > 0
      ? { enabled: true, reason: "カン可能な牌があります。", options }
      : { enabled: false, reason: "カン可能な牌がありません。", options: [] };
  }

  function findCurrentOption(state, playerIndex, requested) {
    return getAvailableKanActions({ state, playerIndex, ruleConfig: state.ruleConfig }).find((candidate) => {
      if (!requested || candidate.type !== requested.type) return false;
      const left = (candidate.consumeInstanceIds || []).slice().sort().join(",");
      const right = (requested.consumeInstanceIds || []).slice().sort().join(",");
      return left === right && candidate.meldIndex === requested.meldIndex;
    }) || null;
  }

  function prepareKan(input) {
    const options = input || {};
    const state = options.state || {};
    const player = state.players && state.players[options.playerIndex];
    const requested = findCurrentOption(state, options.playerIndex, options.kanAction);
    if (!player || !requested) return { prepared: false, reason: "指定されたカンは実行できません。" };

    const consumed = (requested.consumeInstanceIds || []).map((instanceId) =>
      player.hand.find((tile) => tile.instanceId === instanceId)
    );
    if (consumed.some((tile) => !tile)) return { prepared: false, reason: "カンに必要な牌が不足しています。" };

    const discardOwner = requested.type === "minkan" ? state.players[requested.fromPlayerIndex] : null;
    const discardIndex = discardOwner && requested.tile
      ? discardOwner.discards.findIndex((tile) => tile.instanceId === requested.tile.instanceId)
      : -1;
    if (requested.type === "minkan" && (discardIndex < 0
      || !state.lastDiscard
      || state.lastDiscard.tile.instanceId !== requested.tile.instanceId)) {
      return { prepared: false, reason: "明槓対象の捨て牌が見つかりません。" };
    }

    return {
      prepared: true,
      reason: "カン宣言を受け付けました。",
      playerIndex: options.playerIndex,
      requested,
      declaredTile: requested.tile || consumed[0],
      consumed,
      discardOwner,
      discardIndex,
      kanType: requested.type,
    };
  }

  function finalizeKan(input) {
    const options = input || {};
    const state = options.state || {};
    const sourceAttempt = options.attempt || {};
    const attempt = sourceAttempt.prepared
      ? prepareKan({
        state,
        playerIndex: sourceAttempt.playerIndex,
        kanAction: sourceAttempt.requested,
        ruleConfig: options.ruleConfig,
      })
      : prepareKan(options);
    if (!attempt.prepared) return { applied: false, reason: attempt.reason };

    const player = state.players[attempt.playerIndex];
    const requested = attempt.requested;
    const consumed = attempt.consumed;
    const consumedIds = new Set(requested.consumeInstanceIds);
    player.hand = player.hand.filter((tile) => !consumedIds.has(tile.instanceId));

    let meld;
    if (requested.type === "kakan") {
      meld = player.melds[requested.meldIndex];
      meld.type = "kan";
      meld.kanType = "kakan";
      meld.tiles = meld.tiles.concat(consumed[0]);
      meld.open = true;
    } else {
      if (requested.type === "minkan") attempt.discardOwner.discards.splice(attempt.discardIndex, 1);
      meld = {
        type: "kan",
        kanType: requested.type,
        tiles: requested.type === "minkan" ? consumed.concat(requested.tile) : consumed.slice(),
        fromPlayerIndex: requested.fromPlayerIndex,
        open: requested.type !== "ankan",
      };
      player.melds.push(meld);
    }

    if (Sanma.RiichiRules) Sanma.RiichiRules.clearIppatsu(state);
    const rules = rulesFor(state, options.ruleConfig);
    const doraIndicator = rules.kanDora !== false && state.wall
      && typeof state.wall.revealKanDora === "function"
      ? state.wall.revealKanDora()
      : null;
    const replacement = rules.rinshan !== false && state.wall
      && typeof state.wall.drawRinshan === "function"
      ? state.wall.drawRinshan()
      : null;
    if (replacement) player.receiveTile(replacement);
    state.lastDrawContext = {
      playerIndex: attempt.playerIndex,
      isRinshan: Boolean(replacement),
      kanType: requested.type,
    };
    state.lastKanContext = {
      playerIndex: attempt.playerIndex,
      kanType: requested.type,
      tile: requested.tile,
      chankanEligible: false,
    };
    state.lastDiscard = null;
    state.callWindow = null;
    return {
      applied: true,
      reason: replacement ? "カンを実行し、嶺上牌を自摸りました。" : "カンを実行しました。",
      kanType: requested.type,
      meld,
      replacement,
      doraIndicator,
      attempt,
    };
  }

  function applyKan(input) {
    const attempt = prepareKan(input);
    if (!attempt.prepared) return { applied: false, reason: attempt.reason };
    return finalizeKan(Object.assign({}, input, { attempt }));
  }

  Sanma.KanRules = {
    getAvailableKanActions,
    describeAvailability,
    riichiAnkanKeepsWait,
    prepareKan,
    finalizeKan,
    applyKan,
  };
})(window);
