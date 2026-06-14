(function attachRecordIndex(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function humanIndex(record) {
    const player = (record.players || []).find((item) => item && item.isHuman);
    return player && Number.isInteger(player.id) ? player.id : 0;
  }

  function finalRank(record, playerIndex) {
    const ranking = (record.finalRankings || []).find((item) => (
      item && (item.playerIndex === playerIndex || item.playerId === playerIndex)
    ));
    if (ranking && Number.isInteger(ranking.rank)) return ranking.rank;
    if (!Array.isArray(record.finalPoints) || !Number.isFinite(record.finalPoints[playerIndex])) return null;
    const sorted = record.finalPoints
      .map((points, index) => ({ points: Number(points), index }))
      .filter((item) => Number.isFinite(item.points))
      .sort((left, right) => right.points - left.points || left.index - right.index);
    const position = sorted.findIndex((item) => item.index === playerIndex);
    return position >= 0 ? position + 1 : null;
  }

  function scoreValue(result) {
    const score = result && result.score ? result.score : {};
    if (score.isYakuman) return 1000000 + (Number(score.han) || 0);
    return (Number(score.han) || 0) * 1000 + (Number(score.fu) || 0);
  }

  function highestHand(record) {
    let highest = null;
    (record.rounds || []).forEach((round) => {
      const result = round && round.result;
      if (!result || !result.score || !result.score.isValidWin) return;
      if (!highest || scoreValue(result) > scoreValue(highest)) highest = result;
    });
    return highest;
  }

  function sizeBytes(value) {
    const text = JSON.stringify(value || {});
    try {
      return new Blob([text]).size;
    } catch (error) {
      return unescape(encodeURIComponent(text)).length;
    }
  }

  function buildEntry(record) {
    const playerIndex = humanIndex(record);
    const rank = finalRank(record, playerIndex);
    const finalPoints = Array.isArray(record.finalPoints) && Number.isFinite(record.finalPoints[playerIndex])
      ? Number(record.finalPoints[playerIndex])
      : null;
    const rounds = Array.isArray(record.rounds) ? record.rounds : [];
    const humanWins = rounds.filter((round) => round && round.result && round.result.winnerIndex === playerIndex).length;
    const losses = rounds.filter((round) => (
      round && round.result && Number.isInteger(round.result.winnerIndex) && round.result.winnerIndex !== playerIndex
    )).length;
    const yakuman = rounds.some((round) => (
      round && round.result && (
        (round.result.score && round.result.score.isYakuman)
        || (Array.isArray(round.result.yakuman) && round.result.yakuman.length > 0)
      )
    ));
    const highScore = rounds.some((round) => {
      const result = round && round.result;
      return result && result.score && (
        result.score.isYakuman
        || Boolean(result.score.limitName)
        || Number(result.score.han) >= 5
      );
    });
    const tags = [];
    if (rank) tags.push(`${rank}位`);
    if (humanWins > 0) tags.push("和了");
    if (losses > 0) tags.push("敗北");
    if (yakuman) tags.push("役満");
    if (highScore) tags.push("高打点");
    const mode = record.ruleConfig && (record.ruleConfig.matchLength || record.ruleConfig.gameLength);
    const modeLabel = mode === "single" ? "一局戦" : mode === "tonpuu" ? "東風戦" : mode === "hanchan" ? "半荘戦" : "対局";
    const summaryParts = [modeLabel];
    if (rank) summaryParts.push(`${rank}位`);
    if (finalPoints !== null) summaryParts.push(`${finalPoints}点`);
    return {
      id: String(record.id || ""),
      createdAt: String(record.createdAt || ""),
      matchId: String(record.matchId || ""),
      summary: summaryParts.join(" "),
      finalRank: rank,
      finalPoints,
      highestHand: highestHand(record),
      humanWins,
      losses,
      hasYakuman: yakuman,
      hasHighScore: highScore,
      tags,
      schemaVersion: Number(record.version) || 1,
      sizeBytes: sizeBytes(record),
    };
  }

  function build(records) {
    return (records || [])
      .map(buildEntry)
      .filter((entry) => entry.id)
      .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
  }

  function filter(entries, options) {
    const input = options || {};
    const query = String(input.query || "").trim().toLowerCase();
    return (entries || []).filter((entry) => {
      if (input.outcome === "win" && entry.humanWins < 1) return false;
      if (input.outcome === "loss" && entry.losses < 1) return false;
      if (input.tag === "yakuman" && !entry.hasYakuman) return false;
      if (input.tag === "highScore" && !entry.hasHighScore) return false;
      if (!query) return true;
      return `${entry.summary} ${entry.tags.join(" ")} ${entry.createdAt}`.toLowerCase().includes(query);
    });
  }

  Sanma.RecordIndex = {
    humanIndex,
    finalRank,
    highestHand,
    sizeBytes,
    buildEntry,
    build,
    filter,
  };
})(window);
