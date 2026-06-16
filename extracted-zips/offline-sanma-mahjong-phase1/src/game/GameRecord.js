(function attachGameRecord(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const MAX_EVENTS_PER_ROUND = 300;
  const MAX_IMPORT_CHARS = 1024 * 1024;
  const MAX_ROUNDS = 64;
  const MAX_STRING_LENGTH = 2048;
  const REQUIRED_PLAYER_COUNT = 3;
  let recordSequence = 0;

  function clone(value) {
    if (value === undefined) return null;
    return JSON.parse(JSON.stringify(value));
  }

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function validateStringLengths(value) {
    const queue = [value];
    while (queue.length > 0) {
      const current = queue.pop();
      if (typeof current === "string" && current.length > MAX_STRING_LENGTH) {
        throw new Error(`牌譜内の文字列は${MAX_STRING_LENGTH}文字以内で指定してください。`);
      }
      if (Array.isArray(current)) queue.push(...current);
      else if (isObject(current)) queue.push(...Object.keys(current), ...Object.values(current));
    }
  }

  function validateResult(result) {
    if (result === null || result === undefined) return;
    if (!isObject(result)) throw new Error("局結果の形式が不正です。");
    ["yaku", "yakuman"].forEach((key) => {
      if (result[key] !== undefined && !Array.isArray(result[key])) {
        throw new Error(`局結果の${key}は配列で指定してください。`);
      }
    });
    if (result.score !== undefined && result.score !== null) {
      if (!isObject(result.score)) throw new Error("局結果のscore形式が不正です。");
      ["isValidWin", "isYakuman"].forEach((key) => {
        if (result.score[key] !== undefined && typeof result.score[key] !== "boolean") {
          throw new Error(`局結果のscore.${key}は真偽値で指定してください。`);
        }
      });
      ["han", "fu", "yakumanCount", "basePoints"].forEach((key) => {
        if (result.score[key] !== undefined
          && result.score[key] !== null
          && !Number.isFinite(result.score[key])) {
          throw new Error(`局結果のscore.${key}は数値で指定してください。`);
        }
      });
      if (result.score.limitName !== undefined && typeof result.score.limitName !== "string") {
        throw new Error("局結果のscore.limitNameは文字列で指定してください。");
      }
    }
    if (result.changes !== undefined && !Array.isArray(result.changes)) {
      throw new Error("局結果のchangesは配列で指定してください。");
    }
  }

  function validateImportedRecord(record) {
    if (!isObject(record)
      || typeof record.id !== "string"
      || record.id.trim().length === 0
      || !Array.isArray(record.rounds)
      || record.rounds.length === 0) {
      throw new Error("牌譜データの形式が不正です。");
    }
    if (record.matchId !== undefined && typeof record.matchId !== "string") {
      throw new Error("牌譜のmatchIdは文字列で指定してください。");
    }
    if (record.createdAt !== undefined && typeof record.createdAt !== "string") {
      throw new Error("牌譜のcreatedAtは文字列で指定してください。");
    }
    if (!Array.isArray(record.players) || record.players.length !== REQUIRED_PLAYER_COUNT) {
      throw new Error(`牌譜のプレイヤー数は${REQUIRED_PLAYER_COUNT}人である必要があります。`);
    }
    const playerIds = record.players.map((player) => player && player.id);
    if (!playerIds.every(Number.isInteger)
      || playerIds.slice().sort((left, right) => left - right).some((id, index) => id !== index)) {
      throw new Error("牌譜のプレイヤーIDは0、1、2を重複なく指定してください。");
    }
    record.players.forEach((player) => {
      if (!isObject(player)) throw new Error("牌譜のプレイヤー形式が不正です。");
      if (player.name !== undefined && typeof player.name !== "string") {
        throw new Error("牌譜のプレイヤー名は文字列で指定してください。");
      }
      if (player.seatWind !== undefined && typeof player.seatWind !== "string") {
        throw new Error("牌譜の自風は文字列で指定してください。");
      }
    });
    if (record.rounds.length > MAX_ROUNDS) throw new Error(`牌譜の局数は${MAX_ROUNDS}局以内で指定してください。`);
    if (typeof record.seed === "string" && record.seed.length > 128) {
      throw new Error("牌譜のseedは128文字以内で指定してください。");
    }
    validateStringLengths(record);
    record.rounds.forEach((round) => {
      if (!isObject(round) || !Array.isArray(round.events)) throw new Error("局データの形式が不正です。");
      if (round.roundLabel !== undefined && typeof round.roundLabel !== "string") {
        throw new Error("局ラベルは文字列で指定してください。");
      }
      if (round.events.length > MAX_EVENTS_PER_ROUND) {
        throw new Error(`1局のイベント数は${MAX_EVENTS_PER_ROUND}件以内で指定してください。`);
      }
      validateResult(round.result);
    });
    return true;
  }

  function deserializeImported(text) {
    const source = String(text || "");
    if (source.length > MAX_IMPORT_CHARS) {
      throw new Error(`牌譜JSONは${MAX_IMPORT_CHARS}文字以内で指定してください。`);
    }
    const parsed = JSON.parse(source);
    validateImportedRecord(parsed);
    return normalize(parsed);
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

  function isProtectedEvent(event) {
    return Boolean(event && ["deal", "round_start", "win", "score_settlement"].includes(event.type));
  }

  function pruneEvents(events) {
    if (!Array.isArray(events) || events.length <= MAX_EVENTS_PER_ROUND) return Array.isArray(events) ? events : [];
    const pruned = events.slice();
    while (pruned.length > MAX_EVENTS_PER_ROUND) {
      const removableIndex = pruned.findIndex((event, index) => index > 0 && !isProtectedEvent(event));
      if (removableIndex >= 0) pruned.splice(removableIndex, 1);
      else pruned.splice(0, pruned.length - MAX_EVENTS_PER_ROUND);
    }
    return pruned;
  }

  function closeOpenRound(record, reason) {
    const round = currentRound(record);
    if (!round || round.result) return round;
    round.result = {
      type: "recovered_reset",
      winnerIndex: null,
      winType: null,
      dealerTenpai: false,
      yaku: [],
      yakuman: [],
      score: {
        isValidWin: false,
        isYakuman: false,
        han: 0,
        fu: null,
        yakumanCount: 0,
        basePoints: 0,
        limitName: "",
      },
      changes: [],
      reason: reason || "Recovery reset closed this unfinished round.",
      recovery: true,
      aborted: true,
    };
    round.recovery = {
      type: "reset_current_round",
      reason: round.result.reason,
      at: new Date().toISOString(),
    };
    return round;
  }

  function create(input) {
    const options = input || {};
    const createdAt = new Date().toISOString();
    recordSequence += 1;
    return {
      version: 2,
      eventSchemaVersion: 2,
      id: `record-${Date.now().toString(36)}-${recordSequence.toString(36)}`,
      matchId: String(options.matchId || ""),
      phase: 16,
      phaseLabel: "16",
      createdAt,
      seed: Sanma.SeedPolicy
        ? Sanma.SeedPolicy.requireValidSeed(options.seed)
        : String(options.seed || ""),
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
    closeOpenRound(record, "A new round was started after recovery before the previous round completed.");
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
      round.events = pruneEvents(round.events);
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
        yakumanCount: Number(score.yakumanCount) || 0,
        basePoints: Number(score.basePoints) || 0,
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
    normalized.eventSchemaVersion = Number(normalized.eventSchemaVersion) || 1;
    normalized.matchId = typeof normalized.matchId === "string" ? normalized.matchId : "";
    normalized.phase = Number(normalized.phase) || 8;
    normalized.phaseLabel = typeof normalized.phaseLabel === "string" ? normalized.phaseLabel : String(normalized.phase || "");
    normalized.rounds.forEach((round) => {
      if (!round || typeof round !== "object") throw new Error("局データの形式が不正です。");
      round.roundLabel = round.roundLabel || "東1局";
      round.honba = Number(round.honba) || 0;
      round.dealerIndex = Number.isInteger(round.dealerIndex) ? round.dealerIndex : 0;
      round.riichiSticks = Number(round.riichiSticks) || 0;
      round.startingPoints = Array.isArray(round.startingPoints) ? round.startingPoints : [];
      round.pointMovement = Array.isArray(round.pointMovement) ? round.pointMovement : [];
      round.events = Array.isArray(round.events)
        ? pruneEvents(round.events)
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
    MAX_IMPORT_CHARS,
    MAX_ROUNDS,
    MAX_STRING_LENGTH,
    REQUIRED_PLAYER_COUNT,
    create,
    addRound,
    addEvent,
    pruneEvents,
    closeOpenRound,
    compactResult,
    completeRound,
    finishMatch,
    finishRound,
    normalize,
    serialize,
    deserialize,
    deserializeImported,
    validateImportedRecord,
  };
})(window);
