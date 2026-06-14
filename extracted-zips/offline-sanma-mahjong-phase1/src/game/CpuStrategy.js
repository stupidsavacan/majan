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
      const described = describeCandidate(tile, counts, shanten, tenpai, winningActionAvailable);
      const tieBreaker = random();
      return {
        tileInstanceId: tile.instanceId,
        tileLabel: Sanma.TileUtil.getTileAriaLabel(tile),
        tileType: tile.baseId,
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

  Sanma.CpuStrategy = { chooseDiscard, estimateShanten };
})(window);
