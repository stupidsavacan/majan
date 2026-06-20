(function attachAdvancedStats(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function average(values) {
    const numeric = values.filter(Number.isFinite);
    return numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : null;
  }

  function modeCounter() {
    return { on: 0, off: 0, unknown: 0 };
  }

  function addMode(counter, value) {
    if (value === true) counter.on += 1;
    else if (value === false) counter.off += 1;
    else counter.unknown += 1;
  }

  function scoreFromResult(result, playerIndex) {
    const positive = (Array.isArray(result.changes) ? result.changes : [])
      .find((change) => change && change.playerIndex === playerIndex && Number(change.delta) > 0);
    return positive ? Number(positive.delta) : null;
  }

  function isStatsEligible(record) {
    if (!record || typeof record !== "object") return false;
    if (record.imported === true || record.statsEligible === false) return false;
    if (typeof record.completedAt !== "string" || !record.completedAt) return false;
    if (!Array.isArray(record.finalPoints) || record.finalPoints.length !== 3) return false;
    return true;
  }

  function isAfterSince(record, since) {
    if (!since) return true;
    const playedAt = record.completedAt || record.createdAt || "";
    return String(playedAt).localeCompare(String(since)) >= 0;
  }

  function isValidWinnerIndex(result, playerCount) {
    return Boolean(result
      && result.score
      && result.score.isValidWin === true
      && Number.isInteger(result.winnerIndex)
      && result.winnerIndex >= 0
      && result.winnerIndex < playerCount);
  }

  function countedYakumanName(result) {
    if (!result || !result.score || result.score.isYakuman !== true) return null;
    if (Array.isArray(result.yakuman) && result.yakuman.length > 0) return null;
    return result.score.limitName || "数え役満";
  }

  function calculate(records, options) {
    const input = options || {};
    const safeRecords = Array.isArray(records) ? records : [];
    const officialRecords = safeRecords.filter((record) => isStatsEligible(record) && isAfterSince(record, input.since));
    const entries = Sanma.RecordIndex.build(officialRecords);
    const ranks = entries.map((entry) => entry.finalRank);
    const finalPoints = entries.map((entry) => entry.finalPoints);
    const yakuFrequency = {};
    const yakumanNames = {};
    const modes = {
      highScoreMode: modeCounter(),
      allowChi: modeCounter(),
      tsumoLoss: modeCounter(),
    };
    let wins = 0;
    let losses = 0;
    let tsumoWins = 0;
    let ronWins = 0;
    let yakumanCount = 0;
    let dealInCount = 0;
    let dealInKnownRounds = 0;
    const winScores = [];

    officialRecords.forEach((record) => {
      if (!record || typeof record !== "object") return;
      const playerIndex = Sanma.RecordIndex.humanIndex(record);
      const rules = record.ruleConfig || {};
      addMode(modes.highScoreMode, rules.highScoreMode);
      addMode(modes.allowChi, rules.allowChi);
      addMode(modes.tsumoLoss, rules.tsumoLoss);
      (Array.isArray(record.rounds) ? record.rounds : []).forEach((round) => {
        const result = round && round.result;
        if (!isValidWinnerIndex(result, Math.max((record.players || []).length, 3))) return;
        if (result.winnerIndex === playerIndex) {
          wins += 1;
          if (result.winType === "tsumo") tsumoWins += 1;
          if (result.winType === "ron") ronWins += 1;
          const score = scoreFromResult(result, playerIndex);
          if (Number.isFinite(score)) winScores.push(score);
          const yaku = Array.isArray(result.yaku) ? result.yaku : [];
          const yakuman = Array.isArray(result.yakuman) ? result.yakuman : [];
          yaku.forEach((name) => {
            if (name) yakuFrequency[name] = (yakuFrequency[name] || 0) + 1;
          });
          yakuman.forEach((name) => {
            if (name) yakumanNames[name] = (yakumanNames[name] || 0) + 1;
          });
          const countedName = countedYakumanName(result);
          if (countedName) yakumanNames[countedName] = (yakumanNames[countedName] || 0) + 1;
          if ((result.score && result.score.isYakuman) || yakuman.length) yakumanCount += 1;
        } else {
          losses += 1;
          if (result.winType === "ron" && Array.isArray(result.changes) && result.changes.length > 0) {
            dealInKnownRounds += 1;
            if (result.changes.some((change) => change.playerIndex === playerIndex && Number(change.delta) < 0)) {
              dealInCount += 1;
            }
          }
        }
      });
    });

    const sortedYaku = Object.entries(yakuFrequency).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
    return {
      match: {
        gamesPlayed: entries.length,
        firstPlaceCount: entries.filter((entry) => entry.finalRank === 1).length,
        averageRank: average(ranks),
        averageFinalPoints: average(finalPoints),
        bestFinalPoints: finalPoints.filter(Number.isFinite).length ? Math.max(...finalPoints.filter(Number.isFinite)) : null,
      },
      hand: {
        wins,
        losses,
        dealInCount: dealInKnownRounds ? dealInCount : null,
        tsumoWinCount: tsumoWins,
        ronWinCount: ronWins,
        highestScore: winScores.length ? Math.max(...winScores) : null,
        yakumanCount,
      },
      yaku: {
        frequency: yakuFrequency,
        mostCommonYaku: sortedYaku.length ? { name: sortedYaku[0][0], count: sortedYaku[0][1] } : null,
        yakumanNames,
      },
      modeBreakdown: modes,
    };
  }

  function display(value, suffix) {
    if (value === null || value === undefined || Number.isNaN(value)) return "集計不可";
    return `${Number.isInteger(value) ? value : value.toFixed(2)}${suffix || ""}`;
  }

  Sanma.AdvancedStats = { calculate, display, isStatsEligible };
})(window);
