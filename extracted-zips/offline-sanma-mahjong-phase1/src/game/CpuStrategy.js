(function attachCpuStrategy(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function isSequenceSuit(index) {
    return (index >= 9 && index <= 17) || (index >= 18 && index <= 26);
  }

  function standardShanten(counts, openMeldCount) {
    let best = 8;

    function search(index, melds, pairs, taatsu) {
      while (index < counts.length && counts[index] === 0) index += 1;
      if (index >= counts.length) {
        const totalMelds = openMeldCount + melds;
        const usefulTaatsu = Math.min(taatsu, Math.max(0, 4 - totalMelds));
        best = Math.min(best, 8 - (totalMelds * 2) - usefulTaatsu - pairs);
        return;
      }

      counts[index] -= 1;
      search(index, melds, pairs, taatsu);
      counts[index] += 1;

      if (counts[index] >= 3) {
        counts[index] -= 3;
        search(index, melds + 1, pairs, taatsu);
        counts[index] += 3;
      }

      if (isSequenceSuit(index) && index % 9 <= 6
        && counts[index + 1] > 0 && counts[index + 2] > 0) {
        counts[index] -= 1;
        counts[index + 1] -= 1;
        counts[index + 2] -= 1;
        search(index, melds + 1, pairs, taatsu);
        counts[index] += 1;
        counts[index + 1] += 1;
        counts[index + 2] += 1;
      }

      if (counts[index] >= 2) {
        counts[index] -= 2;
        if (pairs === 0) search(index, melds, 1, taatsu);
        search(index, melds, pairs, taatsu + 1);
        counts[index] += 2;
      }

      if (isSequenceSuit(index) && index % 9 <= 7 && counts[index + 1] > 0) {
        counts[index] -= 1;
        counts[index + 1] -= 1;
        search(index, melds, pairs, taatsu + 1);
        counts[index] += 1;
        counts[index + 1] += 1;
      }

      if (isSequenceSuit(index) && index % 9 <= 6 && counts[index + 2] > 0) {
        counts[index] -= 1;
        counts[index + 2] -= 1;
        search(index, melds, pairs, taatsu + 1);
        counts[index] += 1;
        counts[index + 2] += 1;
      }
    }

    search(0, 0, 0, 0);
    return best;
  }

  function chiitoitsuShanten(counts) {
    const pairCount = counts.filter((count) => count >= 2).length;
    const uniqueCount = counts.filter((count) => count > 0).length;
    return 6 - pairCount + Math.max(0, 7 - uniqueCount);
  }

  function kokushiShanten(counts, ruleConfig) {
    if (ruleConfig && ruleConfig.northMode === "disabled") return 13;
    const required = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];
    const uniqueCount = required.filter((index) => counts[index] > 0).length;
    const hasPair = required.some((index) => counts[index] >= 2);
    return 13 - uniqueCount - (hasPair ? 1 : 0);
  }

  function estimateShanten(input) {
    const options = input || {};
    const tiles = Array.isArray(options.tiles) ? options.tiles : [];
    const converted = Sanma.HandAnalysis.toCountArray(tiles, options.ruleConfig || {});
    if (!converted.isValid) return 99;
    const openMeldCount = Math.max(0, Number(options.openMeldCount) || 0);
    const values = [standardShanten(converted.counts.slice(), openMeldCount)];
    if (openMeldCount === 0) {
      values.push(chiitoitsuShanten(converted.counts));
      values.push(kokushiShanten(converted.counts, options.ruleConfig || {}));
    }
    return Math.min(...values);
  }

  function tileTypeCounts(tiles, ruleConfig) {
    return Sanma.HandAnalysis.toCountArray(tiles, ruleConfig || {}).counts;
  }

  function hasSequenceShape(tile, counts) {
    if (!tile || (tile.suit !== "p" && tile.suit !== "s")) return false;
    const index = Sanma.HandAnalysis.getTypeIndex(tile);
    return [-2, -1, 1, 2].some((offset) => {
      const neighbor = index + offset;
      return neighbor >= 0
        && neighbor < counts.length
        && Math.floor(neighbor / 9) === Math.floor(index / 9)
        && counts[neighbor] > 0;
    });
  }

  function describeCandidate(tile, counts, shanten, tenpai, winningActionAvailable) {
    const reasons = [];
    let score = -shanten * 35;
    const typeIndex = Sanma.HandAnalysis.getTypeIndex(tile);
    const typeCount = counts[typeIndex] || 0;

    if (tile.suit === "z" && typeCount === 1) {
      score += 30;
      reasons.push("孤立字牌");
    }
    if ((tile.suit === "m" || tile.rank === 1 || tile.rank === 9) && typeCount === 1) {
      score += 16;
      reasons.push("孤立端牌");
    }
    if (typeCount >= 2) {
      score -= 15;
      reasons.push("対子を崩す");
    }
    if (hasSequenceShape(tile, counts)) {
      score -= 20;
      reasons.push("筋牌形を崩す");
    }
    if (tenpai) {
      score += 60;
      reasons.push("聴牌維持");
    }
    if (winningActionAvailable) {
      score += 1000;
      reasons.push("和了可能");
    }
    if (tile.isRed && typeCount >= 2) {
      score -= 8;
      reasons.push("赤牌を温存");
    }
    if (reasons.length === 0) reasons.push("シャンテン優先");
    return { score, reasons };
  }

  function chooseDiscard(input) {
    const options = input || {};
    const player = options.player || {};
    const hand = Array.isArray(player.hand) ? player.hand : [];
    const ruleConfig = options.ruleConfig || {};
    const random = typeof options.random === "function" ? options.random : Math.random;
    if (hand.length === 0) {
      return { tileInstanceId: null, reason: "手牌がありません。", candidates: [], score: 0 };
    }

    const counts = tileTypeCounts(hand, ruleConfig);
    const openMeldCount = Array.isArray(player.melds) ? player.melds.length : 0;
    const visibleCounts = Sanma.CpuVisibleTiles && options.state
      ? Sanma.CpuVisibleTiles.getVisibleCountsForPlayer(options.state, player.id)
      : Object.create(null);
    const remainingByBaseId = Sanma.CpuVisibleTiles && options.state
      ? Sanma.CpuVisibleTiles.getRemainingByBaseId(options.state, player.id)
      : Object.create(null);
    const winningActionAvailable = Boolean(
      options.analysis
      && options.analysis.scoreResult
      && options.analysis.scoreResult.isValidWin
    );
    const candidates = hand.map((tile, index) => {
      const remaining = hand.slice();
      remaining.splice(index, 1);
      const shanten = estimateShanten({ tiles: remaining, ruleConfig, openMeldCount });
      const tenpai = shanten <= 0;
      const visibleInfo = {
        count: visibleCounts[tile.baseId] || 0,
        remaining: Number.isInteger(remainingByBaseId[tile.baseId]) ? remainingByBaseId[tile.baseId] : null,
      };
      const described = describeCandidate(tile, counts, shanten, tenpai, winningActionAvailable);
      if (visibleInfo.remaining === 0) {
        described.score += 2;
        described.reasons.push("可視残り0枚");
      } else if (visibleInfo.remaining !== null) {
        described.reasons.push(`可視残り${visibleInfo.remaining}枚`);
      }
      const tieBreaker = random();
      return {
        tileInstanceId: tile.instanceId,
        tileLabel: Sanma.TileUtil.getTileAriaLabel(tile),
        tileType: tile.baseId,
        visibleCount: visibleInfo.count,
        remainingVisibleEstimate: visibleInfo.remaining,
        score: described.score + (tieBreaker / 1000),
        baseScore: described.score,
        shanten,
        tenpai,
        reasons: described.reasons,
        tieBreaker,
      };
    });

    candidates.sort((left, right) => (
      right.score - left.score
      || String(left.tileInstanceId).localeCompare(String(right.tileInstanceId))
    ));
    const selected = candidates[0];
    return {
      tileInstanceId: selected.tileInstanceId,
      reason: `${selected.reasons.join("、")}。シャンテン推定 ${selected.shanten}。`,
      candidates,
      score: selected.baseScore,
    };
  }

  function windRank(wind) {
    return { east: 1, south: 2, west: 3, north: 4 }[wind] || 0;
  }

  function isRiichiLocked(player) {
    return Boolean(player && (
      player.hasRiichi
      || (player.riichi && (player.riichi.pending || player.riichi.declared))
    ));
  }

  function actionIdForCall(candidate) {
    const option = candidate && candidate.option ? candidate.option : null;
    return String((candidate && (candidate.actionId || candidate.action || candidate.id))
      || (option && option.type)
      || "").toLowerCase();
  }

  function optionForCall(candidate) {
    return candidate && candidate.option ? candidate.option : candidate;
  }

  function consumeIdsForCall(candidate) {
    const option = optionForCall(candidate) || {};
    const ids = option.consumeInstanceIds
      || option.consumedTileInstanceIds
      || (candidate && candidate.consumeInstanceIds)
      || (candidate && candidate.consumedTileInstanceIds)
      || [];
    return Array.isArray(ids) ? ids : [];
  }

  function calledTileForCall(candidate, state) {
    const option = optionForCall(candidate) || {};
    return option.tile
      || (candidate && candidate.tile)
      || (state && state.lastDiscard && state.lastDiscard.tile)
      || null;
  }

  function isYakuhaiCall(candidate, player, state) {
    const tile = calledTileForCall(candidate, state);
    if (!tile || tile.suit !== "z") return false;
    if (tile.rank >= 5) return true;
    const round = state && state.round ? state.round : {};
    return tile.rank === windRank(player && player.seatWind)
      || tile.rank === windRank(round.roundWind || "east");
  }

  function shantenAfterOpenCall(candidate, player, state) {
    const hand = Array.isArray(player && player.hand) ? player.hand : [];
    const consumed = new Set(consumeIdsForCall(candidate));
    if (consumed.size === 0) return 99;
    const remaining = hand.filter((tile) => !consumed.has(tile.instanceId));
    if (remaining.length !== hand.length - consumed.size) return 99;
    const ruleConfig = (state && state.ruleConfig) || {};
    const openMeldCount = (Array.isArray(player.melds) ? player.melds.length : 0) + 1;
    return estimateShanten({ tiles: remaining, ruleConfig, openMeldCount });
  }

  function scoreCallCandidate(candidate, player, state, beforeShanten, random) {
    const actionId = actionIdForCall(candidate);
    const option = optionForCall(candidate) || {};
    const kanType = option.type || candidate.type;
    const tieBreaker = typeof random === "function" ? random() : 0;

    if (actionId === "kan" || kanType === "minkan") {
      return kanType === "minkan"
        ? { accepted: false, score: -500 + tieBreaker, reason: "明槓はV1では見送り" }
        : { accepted: false, score: -900 + tieBreaker, reason: "非対応のカン候補" };
    }

    if (actionId !== "pon" && actionId !== "chi") {
      return { accepted: false, score: -1000 + tieBreaker, reason: "非対応の鳴き候補" };
    }

    const afterShanten = shantenAfterOpenCall(candidate, player, state);
    if (afterShanten > beforeShanten) {
      return {
        accepted: false,
        score: -100 + (beforeShanten - afterShanten) + tieBreaker,
        reason: "推定シャンテンが悪化",
        afterShanten,
      };
    }

    let score = (beforeShanten - afterShanten) * 30 + tieBreaker;
    const reasons = [`推定シャンテン ${beforeShanten}→${afterShanten}`];
    if (actionId === "pon" && isYakuhaiCall(candidate, player, state)) {
      score += 60;
      reasons.push("役牌ポン");
    }
    if (actionId === "pon") score += 8;
    if (actionId === "chi") score += 4;

    return { accepted: true, score, reason: reasons.join("、"), afterShanten };
  }

  function chooseCall(input) {
    const options = input || {};
    const state = options.state || {};
    const player = options.player || {};
    const legalCalls = Array.isArray(options.legalCalls) ? options.legalCalls.filter(Boolean) : [];
    const random = typeof options.random === "function" ? options.random : function zeroRandom() { return 0; };
    if (legalCalls.length === 0) return null;

    const ranked = legalCalls.map((candidate, index) => {
      const candidatePlayer = (
        state
        && Array.isArray(state.players)
        && Number.isInteger(candidate.playerIndex)
        && state.players[candidate.playerIndex]
      ) || player;
      if (isRiichiLocked(candidatePlayer)) {
        return { candidate, index, accepted: false, score: -1000, reason: "リーチ中" };
      }
      const beforeShanten = estimateShanten({
        tiles: Array.isArray(candidatePlayer.hand) ? candidatePlayer.hand : [],
        ruleConfig: state.ruleConfig || {},
        openMeldCount: Array.isArray(candidatePlayer.melds) ? candidatePlayer.melds.length : 0,
      });
      return Object.assign(
        { candidate, index },
        scoreCallCandidate(candidate, candidatePlayer, state, beforeShanten, random)
      );
    }).filter((candidate) => candidate.accepted);

    ranked.sort((left, right) => (
      right.score - left.score
      || Number(left.candidate.priority || 0) - Number(right.candidate.priority || 0)
      || left.index - right.index
    ));
    return ranked.length > 0 ? ranked[0].candidate : null;
  }

  Sanma.CpuStrategy = { chooseDiscard, estimateShanten, chooseCall };
})(window);
