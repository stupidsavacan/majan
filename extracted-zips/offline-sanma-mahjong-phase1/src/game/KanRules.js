(function attachKanRules(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function rulesFor(state, ruleConfig) {
    const config = ruleConfig || (state && state.ruleConfig) || {};
    return (config.advancedRules && config.advancedRules.kan) || {};
  }

  function analysisTiles(player) {
    const tiles = (player.hand || []).slice();
    (player.melds || []).forEach((meld) => {
      tiles.push(...(Array.isArray(meld.tiles) ? meld.tiles.slice(0, 3) : []));
    });
    return tiles;
  }

  function waitTypes(tiles, ruleConfig) {
    const result = Sanma.HandAnalysis.analyzeTenpai(tiles, ruleConfig || {});
    return (result.waits || []).map((wait) => wait.tileType).sort();
  }

  function sameWaits(left, right) {
    return left.length > 0 && left.length === right.length && left.every((value, index) => value === right[index]);
  }

  function riichiAnkanKeepsWait(state, playerIndex, option) {
    const player = state.players[playerIndex];
    if (!player || !player.lastDraw || option.type !== "ankan") return false;
    const before = analysisTiles(player).filter((tile) => tile.instanceId !== player.lastDraw.instanceId);
    const consumed = new Set(option.consumeInstanceIds || []);
    const afterHand = (player.hand || []).filter((tile) => !consumed.has(tile.instanceId));
    const after = afterHand.slice();
    (player.melds || []).forEach((meld) => {
      after.push(...(Array.isArray(meld.tiles) ? meld.tiles.slice(0, 3) : []));
    });
    after.push(...(player.hand || []).filter((tile) => consumed.has(tile.instanceId)).slice(0, 3));
    return sameWaits(waitTypes(before, state.ruleConfig), waitTypes(after, state.ruleConfig));
  }

  function getAvailableKanActions(input) {
    const options = input || {};
    const state = options.state || {};
    const player = state.players && state.players[options.playerIndex];
    if (!player) return [];
    const candidates = Sanma.KanManager.getOptions(state, options.playerIndex);
    if (!player.hasRiichi) return candidates;
    if (rulesFor(state, options.ruleConfig).allowAnkanAfterRiichiOnlyIfWaitUnchanged === false) {
      return candidates.filter((candidate) => candidate.type === "ankan");
    }
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

  function applyKan(input) {
    const options = input || {};
    const state = options.state || {};
    const player = state.players && state.players[options.playerIndex];
    const requested = findCurrentOption(state, options.playerIndex, options.kanAction);
    if (!player || !requested) return { applied: false, reason: "指定されたカンは実行できません。" };

    const consumed = (requested.consumeInstanceIds || []).map((instanceId) =>
      player.hand.find((tile) => tile.instanceId === instanceId)
    );
    if (consumed.some((tile) => !tile)) return { applied: false, reason: "カンに必要な牌が不足しています。" };

    const discardOwner = requested.type === "minkan" ? state.players[requested.fromPlayerIndex] : null;
    const discardIndex = discardOwner && requested.tile
      ? discardOwner.discards.findIndex((tile) => tile.instanceId === requested.tile.instanceId)
      : -1;
    if (requested.type === "minkan" && (discardIndex < 0
      || !state.lastDiscard
      || state.lastDiscard.tile.instanceId !== requested.tile.instanceId)) {
      return { applied: false, reason: "明槓対象の捨て牌が見つかりません。" };
    }

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
      if (requested.type === "minkan") discardOwner.discards.splice(discardIndex, 1);
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
    const doraIndicator = rules.kanDora !== false && state.wall && typeof state.wall.revealKanDora === "function"
      ? state.wall.revealKanDora()
      : null;
    const replacement = rules.rinshan !== false && state.wall && typeof state.wall.drawRinshan === "function"
      ? state.wall.drawRinshan()
      : null;
    if (replacement) player.receiveTile(replacement);
    state.lastDrawContext = { playerIndex: options.playerIndex, isRinshan: Boolean(replacement), kanType: requested.type };
    state.lastKanContext = {
      playerIndex: options.playerIndex,
      kanType: requested.type,
      tile: requested.tile,
      chankanEligible: requested.type === "kakan" && rules.chankan !== false,
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
      chankanContext: state.lastKanContext.chankanEligible
        ? { isChankan: true, sourcePlayerIndex: options.playerIndex, winningTile: requested.tile }
        : null,
    };
  }

  Sanma.KanRules = {
    getAvailableKanActions,
    describeAvailability,
    riichiAnkanKeepsWait,
    applyKan,
  };
})(window);
