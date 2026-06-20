(function attachActionResolver(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const TileUtil = Sanma.TileUtil;

  function getAnalysisTiles(player, extraTiles) {
    const tiles = (player && player.hand ? player.hand : []).slice();
    (player && player.melds ? player.melds : []).forEach((meld) => {
      const meldTiles = Array.isArray(meld.tiles) ? meld.tiles : [];
      tiles.push(...meldTiles.slice(0, 3));
    });
    return tiles.concat(extraTiles || []);
  }

  function isMenzen(player) {
    return Sanma.RiichiRules
      ? Sanma.RiichiRules.isMenzen(player)
      : Sanma.RiichiManager.isMenzen(player);
  }

  function isRiichiLocked(player) {
    return Boolean(player && (
      player.hasRiichi
      || (player.riichi && (player.riichi.pending || player.riichi.declared))
    ));
  }

  function waitTypeForPattern(pattern, winningTile) {
    if (!pattern || !winningTile) return null;
    const tileType = winningTile.baseId;
    if (pattern.type === "chiitoitsu") return "tanki";
    if (pattern.type !== "standard") return null;

    const candidates = [];
    if (pattern.pair && pattern.pair.tileTypes.includes(tileType)) candidates.push("tanki");
    (pattern.melds || []).forEach((meld) => {
      if (meld.fixed) return;
      if (!meld.tileTypes.includes(tileType)) return;
      if (meld.kind === "triplet") {
        candidates.push("shanpon");
        return;
      }
      if (meld.kind !== "sequence") return;
      const ranks = meld.tileTypes.map((type) => Number(type[0]));
      const winningRank = Number(tileType[0]);
      if (winningRank === ranks[1]) {
        candidates.push("kanchan");
      } else if ((ranks[0] === 1 && winningRank === 3) || (ranks[0] === 7 && winningRank === 7)) {
        candidates.push("penchan");
      } else if (winningRank === ranks[0] || winningRank === ranks[2]) {
        candidates.push("ryanmen");
      }
    });

    return ["ryanmen", "kanchan", "penchan", "tanki", "shanpon"].find((type) => candidates.includes(type)) || null;
  }

  function createWinContext(state, playerIndex, winType, loserIndex, discardedTile) {
    const player = state.players[playerIndex];
    const round = state.round || {};
    const winningTile = winType === "ron"
      ? (discardedTile || (state.lastDiscard && state.lastDiscard.tile) || null)
      : (player.lastDraw || null);
    const context = {
      winType,
      winnerIndex: playerIndex,
      loserIndex,
      dealerIndex: Number.isInteger(round.dealerIndex) ? round.dealerIndex : 0,
      honba: Number(round.honba) || 0,
      riichiSticks: Number(round.riichiSticks) || 0,
      seatWind: player.seatWind,
      roundWind: round.roundWind || "east",
      isMenzen: isMenzen(player),
      isRiichi: Boolean(player.hasRiichi),
      isIppatsu: Boolean(player.ippatsuActive),
      melds: player.melds || [],
      winningTile,
      waitType: null,
      doraIndicators: state.wall ? state.wall.doraIndicators : (state.doraIndicators || []),
      kitaDoraCount: (player.kitaTiles || []).length,
    };
    return Sanma.EndTurnYakuResolver
      ? Object.assign(context, Sanma.EndTurnYakuResolver.resolve({
        state,
        playerIndex,
        winType,
        loserIndex,
        ruleConfig: state.ruleConfig || {},
      }))
      : context;
  }

  function analyzeWin(state, playerIndex, winType, discardedTile, loserIndex) {
    const player = state.players[playerIndex];
    const concealedTiles = (player.hand || []).slice().concat(discardedTile ? [discardedTile] : []);
    const fixedTiles = (player.melds || []).flatMap((meld) => Array.isArray(meld.tiles) ? meld.tiles : []);
    const tiles = concealedTiles.concat(fixedTiles);
    const context = createWinContext(state, playerIndex, winType, loserIndex, discardedTile);
    const agariResult = Sanma.HandAnalysis.analyzeAgariWithMelds(
      concealedTiles,
      player.melds || [],
      state.ruleConfig || {}
    );
    context.waitType = waitTypeForPattern(agariResult.bestPattern, context.winningTile);
    const yakuResult = Sanma.YakuAnalysis.analyzeYaku({ tiles, ruleConfig: state.ruleConfig || {}, agariResult, context });
    const scoreResult = Sanma.ScoreCalculator.calculateScore({ tiles, ruleConfig: state.ruleConfig || {}, agariResult, yakuResult, context });
    return { tiles, context, agariResult, yakuResult, scoreResult };
  }

  function matchingTiles(player, tile) {
    return (player.hand || []).filter((candidate) => TileUtil.isSameBase(candidate, tile));
  }

  function ponAvailability(state, playerIndex) {
    if (isRiichiLocked(state.players[playerIndex])) {
      return { enabled: false, reason: "リーチ後はポンできません。", options: [] };
    }
    const lastDiscard = state.lastDiscard;
    if (!lastDiscard || !lastDiscard.tile || lastDiscard.playerIndex === playerIndex) {
      return { enabled: false, reason: "対象となる他家の捨て牌がありません。", options: [] };
    }
    const matches = matchingTiles(state.players[playerIndex], lastDiscard.tile);
    if (matches.length < 2) return { enabled: false, reason: "同じ牌が手牌に2枚ありません。", options: [] };
    return {
      enabled: true,
      reason: "同じ牌が手牌に2枚あります。",
      options: [{
        type: "pon",
        label: `ポン ${TileUtil.getTileAriaLabel(lastDiscard.tile)}`,
        tile: lastDiscard.tile,
        fromPlayerIndex: lastDiscard.playerIndex,
        consumeInstanceIds: matches.slice(0, 2).map((tile) => tile.instanceId),
      }],
    };
  }

  function chiAvailability(state, playerIndex) {
    if (isRiichiLocked(state.players[playerIndex])) {
      return { enabled: false, reason: "リーチ後はチーできません。", options: [] };
    }
    const lastDiscard = state.lastDiscard;
    if (!state.ruleConfig || state.ruleConfig.allowChi !== true) {
      return { enabled: false, reason: "チーなしルールです。", options: [] };
    }
    if (!lastDiscard || !lastDiscard.tile || lastDiscard.playerIndex === playerIndex) {
      return { enabled: false, reason: "対象となる他家の捨て牌がありません。", options: [] };
    }
    if ((lastDiscard.playerIndex + 1) % state.players.length !== playerIndex) {
      return { enabled: false, reason: "チーは上家の捨て牌に対してのみ可能です。", options: [] };
    }
    const tile = lastDiscard.tile;
    if (tile.suit !== "p" && tile.suit !== "s") {
      return { enabled: false, reason: "萬子と字牌はチーできません。", options: [] };
    }

    const options = [];
    for (let start = tile.rank - 2; start <= tile.rank; start += 1) {
      if (start < 1 || start > 7) continue;
      const requiredRanks = [start, start + 1, start + 2].filter((rank) => rank !== tile.rank);
      const consumed = requiredRanks.map((rank) => state.players[playerIndex].hand.find((candidate) => candidate.suit === tile.suit && candidate.rank === rank));
      if (consumed.every(Boolean)) {
        options.push({
          type: "chi",
          label: `チー ${start}-${start + 1}-${start + 2}${tile.suit}`,
          tile,
          fromPlayerIndex: lastDiscard.playerIndex,
          consumeInstanceIds: consumed.map((candidate) => candidate.instanceId),
        });
      }
    }
    return options.length > 0
      ? { enabled: true, reason: "順子を作れる組み合わせがあります。", options }
      : { enabled: false, reason: "チーできる組み合わせがありません。", options };
  }

  function ronAvailability(state, playerIndex) {
    const lastDiscard = state.lastDiscard;
    if (!lastDiscard || !lastDiscard.tile || lastDiscard.playerIndex === playerIndex) {
      return { enabled: false, reason: "対象となる他家の捨て牌がありません。", analysis: null };
    }
    if (Sanma.FuritenManager) {
      const furiten = Sanma.FuritenManager.checkRonEligibility({
        state,
        playerIndex,
        winningTile: lastDiscard.tile,
        sourcePlayerIndex: lastDiscard.playerIndex,
        ruleConfig: state.ruleConfig || {},
      });
      if (!furiten.canRon) {
        return { enabled: false, reason: furiten.reasons.join("・"), analysis: null, furiten };
      }
    }
    const analysis = analyzeWin(state, playerIndex, "ron", lastDiscard.tile, lastDiscard.playerIndex);
    return analysis.scoreResult.isValidWin
      ? { enabled: true, reason: "和了形かつ役ありです。", analysis }
      : { enabled: false, reason: analysis.scoreResult.reason, analysis };
  }

  function tsumoAvailability(state, playerIndex) {
    const analysis = analyzeWin(state, playerIndex, "tsumo", null, null);
    return analysis.scoreResult.isValidWin
      ? { enabled: true, reason: "和了形かつ役ありです。", analysis }
      : { enabled: false, reason: analysis.scoreResult.reason, analysis };
  }

  function action(id, label, availability, options) {
    return Object.assign({
      id,
      label,
      enabled: Boolean(availability && availability.enabled),
      reason: availability && availability.reason ? availability.reason : "",
    }, availability && availability.options ? { options: availability.options } : {}, options || {});
  }

  function getAvailableActions(state, playerIndex) {
    const player = state && state.players ? state.players[playerIndex] : null;
    if (!player) return [];
    const isTurn = !Number.isInteger(state.turnIndex) || state.turnIndex === playerIndex;
    const canDiscardPhase = !state.phase || state.phase === "human-discard" || state.phase === "caller-discard";
    const canDrawActionPhase = !state.phase || state.phase === "human-discard";
    const tsumo = tsumoAvailability(state, playerIndex);
    const ron = ronAvailability(state, playerIndex);
    const pon = ponAvailability(state, playerIndex);
    const chi = chiAvailability(state, playerIndex);
    const kan = Sanma.KanRules
      ? Sanma.KanRules.describeAvailability(state, playerIndex, state.ruleConfig)
      : Sanma.KanManager.describeAvailability(state, playerIndex);
    const riichi = Sanma.RiichiRules
      ? Sanma.RiichiRules.canDeclare(state, playerIndex)
      : Sanma.RiichiManager.canDeclare(state, playerIndex);
    const kita = Sanma.KitaManager.canExtract(state, playerIndex);
    const minkanAvailable = (kan.options || []).some((option) => option.type === "minkan");

    return [
      action("discard", "打牌", { enabled: isTurn && canDiscardPhase, reason: isTurn && canDiscardPhase ? "手番中です。" : "現在は打牌番ではありません。" }),
      action("tsumo", "ツモ", { enabled: isTurn && canDrawActionPhase && tsumo.enabled, reason: canDrawActionPhase ? tsumo.reason : "鳴いた直後はツモ和了できません。" }, { analysis: tsumo.analysis }),
      action("ron", "ロン", ron, { analysis: ron.analysis }),
      action("pon", "ポン", pon),
      action("chi", "チー", chi),
      action("kan", "カン", {
        enabled: kan.enabled && (minkanAvailable || (isTurn && canDrawActionPhase)),
        reason: minkanAvailable || canDrawActionPhase ? kan.reason : "鳴いた直後はカンできません。",
        options: kan.options,
      }),
      action("riichi", "リーチ", { enabled: isTurn && canDrawActionPhase && riichi.enabled, reason: canDrawActionPhase ? riichi.reason : "鳴いた直後はリーチできません。" }),
      action("kita", "北抜き", {
        enabled: !player.hasRiichi && isTurn && canDrawActionPhase && kita.enabled,
        reason: player.hasRiichi ? "リーチ後は北抜きできません。" : canDrawActionPhase ? kita.reason : "鳴いた直後は北抜きできません。",
        options: player.hasRiichi ? [] : kita.options,
      }),
    ];
  }

  function findAction(state, playerIndex, actionId) {
    return getAvailableActions(state, playerIndex).find((candidate) => candidate.id === actionId) || null;
  }

  Sanma.ActionResolver = {
    getAnalysisTiles,
    waitTypeForPattern,
    createWinContext,
    analyzeWin,
    getAvailableActions,
    findAction,
  };
})(window);
