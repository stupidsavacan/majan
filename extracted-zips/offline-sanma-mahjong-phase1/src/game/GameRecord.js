(function attachGameRecord(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const MAX_EVENTS_PER_ROUND = 300;
  let recordSequence = 0;

  function clone(value) {
    if (value === undefined) return null;
    return JSON.parse(JSON.stringify(value));
  }

  function playerSnapshot(player) {
    return {
      id: player.id,
      name: player.name,
      seatWind: player.seatWind,
      isHuman: Boolean(player.isHuman),
      initialPoints: Number(player.points) || 0,
    };
  }

  function createRound(input) {
    const options = input || {};
    return {
      roundLabel: options.roundLabel || "東1局",
      honba: Number(options.honba) || 0,
      dealerIndex: Number.isInteger(options.dealerIndex) ? options.dealerIndex : 0,
      riichiSticks: Number(options.riichiSticks) || 0,
      startingPoints: (options.startingPoints || []).map((points) => Number(points) || 0),
      events: [],
      result: null,
      pointMovement: [],
    };
  }

  function create(input) {
    const options = input || {};
    const createdAt = new Date().toISOString();
    recordSequence += 1;
    return {
      version: 2,
      id: `record-${Date.now().toString(36)}-${recordSequence.toString(36)}`,
      matchId: String(options.matchId || ""),
      phase: 13,
      createdAt,
      seed: String(options.seed || ""),
      ruleConfig: clone(options.ruleConfig || {}),
      players: (options.players || []).map(playerSnapshot),
      rounds: [createRound(options)],
      finalPoints: [],
      finalRankings: [],
      matchEndReason: "",
      completedAt: null,
    };
  }

  function addRound(record, input) {
    if (!record || !Array.isArray(record.rounds) || record.completedAt) return null;
    const round = createRound(input);
    record.rounds.push(round);
    return round;
  }

  function currentRound(record) {
    return record && Array.isArray(record.rounds) ? record.rounds[record.rounds.length - 1] : null;
  }

  function addEvent(record, type, data) {
    const round = currentRound(record);
    if (!round || !type || record.completedAt) return null;
    const event = {
      index: round.events.length > 0 ? round.events[round.events.length - 1].index + 1 : 1,
      type,
      at: new Date().toISOString(),
      data: clone(data || {}),
    };
    round.events.push(event);
    if (round.events.length > MAX_EVENTS_PER_ROUND) {
      round.events.splice(0, round.events.length - MAX_EVENTS_PER_ROUND);
    }
    return event;
  }

  function compactResult(result) {
    const input = result || {};
    const score = input.score || {};
    const yaku = input.yaku || {};
    const settlement = input.settlement || {};
    return {
      type: input.type || (input.winnerIndex === undefined ? "exhaustive_draw" : "win"),
      winnerIndex: Number.isInteger(input.winnerIndex) ? input.winnerIndex : null,
      winType: input.winType || null,
      dealerTenpai: Boolean(input.dealerTenpai),
      yaku: (yaku.yaku || []).concat(yaku.dora || []).map((item) => item.name),
      yakuman: (yaku.yakuman || []).map((item) => item.name),
      score: {
        isValidWin: Boolean(score.isValidWin),
        isYakuman: Boolean(score.isYakuman),
        han: Number(score.han) || 0,
        fu: score.fu === null || score.fu === undefined ? null : Number(score.fu),
        limitName: score.limitName || "",
      },
      changes: (settlement.changes || []).map((change) => ({
        playerIndex: change.playerIndex,
        delta: change.delta,
        after: change.after,
      })),
      reason: input.reason || "",
    };
  }

  function completeRound(record, result, finalPoints, metadata) {
    const round = currentRound(record);
    if (!round || record.completedAt) return record;
    round.result = compactResult(result);
    const details = metadata || {};
    if (Number.isInteger(details.dealerIndex)) round.dealerIndex = details.dealerIndex;
    if (Number.isFinite(details.honba)) round.honba = details.honba;
    if (Number.isFinite(details.riichiSticks)) round.riichiSticks = details.riichiSticks;
    round.pointMovement = Array.isArray(details.pointMovement)
      ? clone(details.pointMovement)
      : (round.result.changes || []).map((change) => ({
        playerIndex: change.playerIndex,
        delta: change.delta,
        after: change.after,
      }));
    record.finalPoints = (finalPoints || []).map((points) => Number(points) || 0);
    return record;
  }

  function finishMatch(record, finalPoints, rankings, reason) {
    if (!record || record.completedAt) return record;
    record.finalPoints = (finalPoints || []).map((points) => Number(points) || 0);
    record.finalRankings = clone(rankings || []);
    record.matchEndReason = reason || "";
    record.completedAt = new Date().toISOString();
    return record;
  }

  function finishRound(record, result, finalPoints) {
    completeRound(record, result, finalPoints);
    return finishMatch(record, finalPoints, [], "");
  }

  function normalize(record) {
    if (!record || typeof record !== "object" || !record.id || !Array.isArray(record.rounds) || record.rounds.length === 0) {
      throw new Error("牌譜データの形式が不正です。");
    }
    const normalized = clone(record);
    normalized.version = Number(normalized.version) || 1;
    normalized.matchId = typeof normalized.matchId === "string" ? normalized.matchId : "";
    normalized.phase = Number(normalized.phase) || 8;
    normalized.rounds.forEach((round) => {
      if (!round || typeof round !== "object") throw new Error("局データの形式が不正です。");
      round.roundLabel = round.roundLabel || "東1局";
      round.honba = Number(round.honba) || 0;
      round.dealerIndex = Number.isInteger(round.dealerIndex) ? round.dealerIndex : 0;
      round.riichiSticks = Number(round.riichiSticks) || 0;
      round.startingPoints = Array.isArray(round.startingPoints) ? round.startingPoints : [];
      round.pointMovement = Array.isArray(round.pointMovement) ? round.pointMovement : [];
      round.events = Array.isArray(round.events)
        ? round.events.slice(-MAX_EVENTS_PER_ROUND)
        : [];
    });
    normalized.players = Array.isArray(normalized.players) ? normalized.players : [];
    normalized.finalPoints = Array.isArray(normalized.finalPoints) ? normalized.finalPoints : [];
    normalized.finalRankings = Array.isArray(normalized.finalRankings) ? normalized.finalRankings : [];
    normalized.matchEndReason = typeof normalized.matchEndReason === "string" ? normalized.matchEndReason : "";
    return normalized;
  }

  function serialize(record) {
    return JSON.stringify(normalize(record));
  }

  function deserialize(text) {
    return normalize(JSON.parse(text));
  }

  Sanma.GameRecord = {
    MAX_EVENTS_PER_ROUND,
    create,
    addRound,
    addEvent,
    completeRound,
    finishMatch,
    finishRound,
    normalize,
    serialize,
    deserialize,
  };
})(window);
