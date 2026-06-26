(function attachGameRecord(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const MAX_EVENTS_PER_ROUND = 300;
  const MAX_IMPORT_CHARS = 1024 * 1024;
  const MAX_ROUNDS = 64;
  const MAX_STRING_LENGTH = 2048;
  const REQUIRED_PLAYER_COUNT = 3;
  const MAX_REASONABLE_POINTS = 300000;
  let recordSequence = 0;

  const YAKU_DISPLAY_NAMES = Object.freeze({
    honitsu: "混一色",
    chinitsu: "清一色",
    ikkitsuukan: "一気通貫",
    ittsu: "一気通貫",
    chanta: "混全帯么九",
    junchan: "純全帯么九",
    sanankou: "三暗刻",
    sankantsu: "三槓子",
    shousangen: "小三元",
    sanshokuDoukou: "三色同刻",
    sanshoku_doukou: "三色同刻",
    ryanpeikou: "二盃口",
    suuankou: "四暗刻",
    suuankouTanki: "四暗刻単騎",
    daisangen: "大三元",
    tsuuiisou: "字一色",
    shousuushii: "小四喜",
    daisuushii: "大四喜",
    chinroutou: "清老頭",
    ryuuiisou: "緑一色",
    chuurenPoutou: "九蓮宝燈",
    chuuren_poutou: "九蓮宝燈",
    junseiChuurenPoutou: "純正九蓮宝燈",
    suukantsu: "四槓子",
    "suuankou-tanki": "四暗刻単騎",
    "kokushi-musou": "国士無双",
    "kokushi-musou-13-wait": "国士無双十三面待ち",
    "sanshoku-doukou": "三色同刻",
    "chuuren-poutou": "九蓮宝燈",
    "chuuren-9-wait": "純正九蓮宝燈",
  });

  function clone(value) {
    if (value === undefined) return null;
    return JSON.parse(JSON.stringify(value));
  }

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function yakuDisplayName(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return YAKU_DISPLAY_NAMES[value] || value;
    if (!isObject(value)) return String(value || "");
    const raw = value.displayName || value.label || value.name || value.id || value.key || "";
    return YAKU_DISPLAY_NAMES[raw] || raw;
  }

  function normalizeYakuArray(items) {
    return (Array.isArray(items) ? items : []).map(yakuDisplayName).filter(Boolean);
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

  function validateScore(score, label) {
    if (score === undefined || score === null) return;
    if (!isObject(score)) throw new Error(`${label || "局結果"}のscore形式が不正です。`);
    ["isValidWin", "isYakuman"].forEach((key) => {
      if (score[key] !== undefined && typeof score[key] !== "boolean") {
        throw new Error(`${label || "局結果"}のscore.${key}は真偽値で指定してください。`);
      }
    });
    ["han", "fu", "yakumanCount", "basePoints"].forEach((key) => {
      if (score[key] !== undefined && score[key] !== null && !Number.isFinite(score[key])) {
        throw new Error(`${label || "局結果"}のscore.${key}は数値で指定してください。`);
      }
    });
    if (score.limitName !== undefined && typeof score.limitName !== "string") {
      throw new Error(`${label || "局結果"}のscore.limitNameは文字列で指定してください。`);
    }
  }

  function validatePlayerIndex(value, label, options) {
    const allowNull = !options || options.allowNull !== false;
    if (value === undefined || (value === null && allowNull)) return;
    if (!Number.isInteger(value) || value < 0 || value >= REQUIRED_PLAYER_COUNT) {
      throw new Error(`${label} is out of range.`);
    }
  }

  function validatePlayerIndexArray(values, label) {
    if (values === undefined || values === null) return;
    if (!Array.isArray(values)) throw new Error(`${label} must be an array.`);
    values.forEach((value) => validatePlayerIndex(value, label, { allowNull: false }));
  }

  function validatePointTransfer(transfer, index) {
    if (!isObject(transfer)) throw new Error(`pointTransfers[${index}] is invalid.`);
    validatePlayerIndex(transfer.fromPlayerIndex, `pointTransfers[${index}].fromPlayerIndex`, { allowNull: false });
    validatePlayerIndex(transfer.toPlayerIndex, `pointTransfers[${index}].toPlayerIndex`, { allowNull: false });
    if (!Number.isFinite(Number(transfer.points)) || Number(transfer.points) < 0 || Number(transfer.points) > MAX_REASONABLE_POINTS) {
      throw new Error(`pointTransfers[${index}].points is invalid.`);
    }
  }

  function validateWinner(winner) {
    if (!isObject(winner)) throw new Error("局結果のwinners内容が不正です。");
    if (!Number.isInteger(winner.winnerIndex) || winner.winnerIndex < 0 || winner.winnerIndex >= REQUIRED_PLAYER_COUNT) {
      throw new Error("局結果のwinners.winnerIndexが不正です。");
    }
    validatePlayerIndex(winner.fromPlayerIndex, "winners.fromPlayerIndex");
    if (winner.winType !== undefined && winner.winType !== null && typeof winner.winType !== "string") {
      throw new Error("局結果のwinners.winTypeは文字列で指定してください。");
    }
    ["yaku", "yakuman"].forEach((key) => {
      if (winner[key] !== undefined && !Array.isArray(winner[key])) {
        throw new Error(`局結果のwinners.${key}は配列で指定してください。`);
      }
    });
    validateScore(winner.score, "局結果のwinners");
  }

  function validateResult(result) {
    if (result === null || result === undefined) return;
    if (!isObject(result)) throw new Error("局結果の形式が不正です。");
    ["yaku", "yakuman", "winners", "tenpaiPlayers", "notenPlayers", "tenpaiStatus"].forEach((key) => {
      if (result[key] !== undefined && !Array.isArray(result[key])) {
        throw new Error(`局結果の${key}は配列で指定してください。`);
      }
    });
    validatePlayerIndex(result.winnerIndex, "result.winnerIndex");
    validatePlayerIndex(result.fromPlayerIndex, "result.fromPlayerIndex");
    validatePlayerIndex(result.dealerIndex, "result.dealerIndex");
    validatePlayerIndexArray(result.tenpaiPlayers, "result.tenpaiPlayers");
    validatePlayerIndexArray(result.notenPlayers, "result.notenPlayers");
    if (Array.isArray(result.winners)) result.winners.forEach(validateWinner);
    validateScore(result.score, "局結果");
    if (result.changes !== undefined && !Array.isArray(result.changes)) {
      throw new Error("局結果のchangesは配列で指定してください。");
    }
    if (result.pointTransfers !== undefined && !Array.isArray(result.pointTransfers)) {
      throw new Error("局結果のpointTransfersは配列で指定してください。");
    }
    if (Array.isArray(result.pointTransfers)) result.pointTransfers.forEach(validatePointTransfer);
    if (result.drawSettlement !== undefined && result.drawSettlement !== null && !isObject(result.drawSettlement)) {
      throw new Error("局結果のdrawSettlement形式が不正です。");
    }
  }

  function validateRecordSemantics(record) {
    validateFinalPoints(record);
    validateFinalRankings(record);
    (record.rounds || []).forEach((round) => validateResultSemantics(round && round.result));
  }

  function validateFinalPoints(record) {
    if (record.finalPoints === undefined) return;
    if (!Array.isArray(record.finalPoints)) throw new Error("finalPointsは配列で指定してください。");
    if (record.finalPoints.length === 0) return;
    if (record.finalPoints.length !== REQUIRED_PLAYER_COUNT) {
      throw new Error(`finalPointsは${REQUIRED_PLAYER_COUNT}人分指定してください。`);
    }
    record.finalPoints.forEach((points) => {
      if (!Number.isFinite(Number(points)) || Number(points) < 0 || Number(points) > MAX_REASONABLE_POINTS) {
        throw new Error("finalPointsが妥当な点数範囲を超えています。");
      }
    });
  }

  function validateFinalRankings(record) {
    if (record.finalRankings === undefined) return;
    if (!Array.isArray(record.finalRankings)) throw new Error("finalRankingsは配列で指定してください。");
    if (record.finalRankings.length === 0) return;
    if (!Array.isArray(record.finalPoints) || record.finalPoints.length !== REQUIRED_PLAYER_COUNT) return;
    const expected = record.finalPoints
      .map((points, playerIndex) => ({ points: Number(points), playerIndex }))
      .sort((left, right) => right.points - left.points || left.playerIndex - right.playerIndex);
    const expectedRankByPlayer = new Map(expected.map((item, index) => [item.playerIndex, index + 1]));
    const seen = new Set();
    record.finalRankings.forEach((ranking) => {
      if (!isObject(ranking)
        || !Number.isInteger(ranking.playerIndex)
        || !Number.isInteger(ranking.rank)
        || ranking.playerIndex < 0
        || ranking.playerIndex >= REQUIRED_PLAYER_COUNT
        || ranking.rank < 1
        || ranking.rank > REQUIRED_PLAYER_COUNT) {
        throw new Error("finalRankings内容が不正です。");
      }
      if (seen.has(ranking.playerIndex)) throw new Error("finalRankingsに重複したプレイヤーがあります。");
      seen.add(ranking.playerIndex);
      if (record.finalRankings.length === REQUIRED_PLAYER_COUNT
        && ranking.rank !== expectedRankByPlayer.get(ranking.playerIndex)) {
        throw new Error("finalRankingsがfinalPointsと一致しません。");
      }
      if (record.finalRankings.length === REQUIRED_PLAYER_COUNT
        && ranking.points !== undefined
        && Number(ranking.points) !== Number(record.finalPoints[ranking.playerIndex])) {
        throw new Error("finalRankings.pointsがfinalPointsと一致しません。");
      }
    });
  }

  function validateResultSemantics(result) {
    if (!result || !Array.isArray(result.changes)) return;
    const seen = new Set();
    let deltaSum = 0;
    result.changes.forEach((change) => {
      if (!isObject(change)
        || !Number.isInteger(change.playerIndex)
        || change.playerIndex < 0
        || change.playerIndex >= REQUIRED_PLAYER_COUNT
        || !Number.isFinite(Number(change.delta))
        || !Number.isFinite(Number(change.after))) {
        throw new Error("局結果のchanges内容が不正です。");
      }
      if (seen.has(change.playerIndex)) throw new Error("局結果のchangesに重複したプレイヤーがあります。");
      seen.add(change.playerIndex);
      if (Math.abs(Number(change.delta)) > MAX_REASONABLE_POINTS
        || Number(change.after) < 0
        || Number(change.after) > MAX_REASONABLE_POINTS) {
        throw new Error("局結果のchangesが妥当な点数範囲を超えています。");
      }
      deltaSum += Number(change.delta);
    });
    if (seen.size < REQUIRED_PLAYER_COUNT) return;
    const score = isObject(result.score) ? result.score : {};
    const payments = isObject(score.payments) ? score.payments : {};
    const riichiStickAllowance = ["ron", "tsumo"]
      .map((key) => (isObject(payments[key]) && Number.isFinite(Number(payments[key].riichiSticks))
        ? Number(payments[key].riichiSticks)
        : 0))
      .reduce((sum, value) => sum + value, 0);
    const explicitAllowance = Number.isFinite(Number(result.riichiStickGain))
      ? Number(result.riichiStickGain)
      : 0;
    const allowedDelta = Math.max(0, riichiStickAllowance, explicitAllowance);
    if (Math.abs(deltaSum) <= 1 || Math.abs(deltaSum - allowedDelta) <= 1) return;
    if (Math.abs(deltaSum) > 1) throw new Error("局結果のchanges合計が0になりません。");
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
    validateRecordSemantics(record);
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
    return Boolean(event && ["deal", "round_start", "win", "score_settlement", "double_ron"].includes(event.type));
  }

  function pruneEvents(events) {
    if (!Array.isArray(events) || events.length <= MAX_EVENTS_PER_ROUND) return Array.isArray(events) ? events : [];
    const pruned = events.slice();
    let removed = false;
    while (pruned.length > MAX_EVENTS_PER_ROUND) {
      const removableIndex = pruned.findIndex((event, index) => index > 0 && !isProtectedEvent(event));
      if (removableIndex >= 0) {
        pruned.splice(removableIndex, 1);
        removed = true;
      } else {
        pruned.splice(0, pruned.length - MAX_EVENTS_PER_ROUND);
        removed = true;
      }
    }
    if (removed && pruned[0] && typeof pruned[0] === "object") pruned[0].pruned = true;
    return pruned;
  }

  function closeOpenRound(record, reason) {
    const round = currentRound(record);
    if (!round || round.result) return round;
    round.result = {
      type: "recovered_reset",
      winnerIndex: null,
      winners: [],
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

  function compactScore(score) {
    const input = score || {};
    return {
      isValidWin: Boolean(input.isValidWin),
      isYakuman: Boolean(input.isYakuman),
      han: Number(input.han) || 0,
      fu: input.fu === null || input.fu === undefined ? null : Number(input.fu),
      yakumanCount: Number(input.yakumanCount) || 0,
      basePoints: Number(input.basePoints) || 0,
      limitName: input.limitName || "",
    };
  }

  function yakuGroups(input) {
    const yaku = input && input.yaku ? input.yaku : {};
    if (Array.isArray(yaku)) return { yaku: normalizeYakuArray(yaku), yakuman: [] };
    return {
      yaku: normalizeYakuArray((yaku.yaku || []).concat(yaku.dora || [])),
      yakuman: normalizeYakuArray(yaku.yakuman || []),
    };
  }

  function compactDrawSettlement(input) {
    if (!input || typeof input !== "object") return null;
    return {
      applied: Boolean(input.applied),
      type: input.type || "exhaustive_draw",
      mode: input.mode || "noten-bappu-3000",
      tenpaiPlayers: Array.isArray(input.tenpaiPlayers) ? input.tenpaiPlayers.slice() : [],
      notenPlayers: Array.isArray(input.notenPlayers) ? input.notenPlayers.slice() : [],
      changes: (input.changes || []).map((change) => ({
        playerIndex: change.playerIndex,
        delta: change.delta,
        after: change.after,
      })),
      reason: input.reason || "",
    };
  }

  function compactWinner(winner, fallback) {
    const source = Object.assign({}, fallback || {}, winner || {});
    const groups = yakuGroups(source);
    return {
      winnerIndex: Number.isInteger(source.winnerIndex) ? source.winnerIndex : null,
      winType: source.winType || null,
      fromPlayerIndex: Number.isInteger(source.fromPlayerIndex) ? source.fromPlayerIndex : null,
      yaku: groups.yaku,
      yakuman: normalizeYakuArray(source.yakuman).concat(groups.yakuman).filter((name, index, array) => array.indexOf(name) === index),
      score: compactScore(source.score || {}),
      pointTransfers: Array.isArray(source.pointTransfers) ? clone(source.pointTransfers) : [],
      isChankan: Boolean(source.isChankan),
      kanType: source.kanType || null,
      isAnkanKokushiException: Boolean(source.isAnkanKokushiException),
    };
  }

  function compactResult(result) {
    const input = result || {};
    const settlement = input.settlement || {};
    const changes = Array.isArray(settlement.changes) ? settlement.changes : input.changes || [];
    const winners = Array.isArray(input.winners) && input.winners.length > 0
      ? input.winners.map((winner) => compactWinner(winner, input))
      : (Number.isInteger(input.winnerIndex) ? [compactWinner(input, {})] : []);
    const firstWinner = winners[0] || null;
    const rootGroups = yakuGroups(input);
    const yakuman = normalizeYakuArray(input.yakuman)
      .concat(rootGroups.yakuman)
      .filter((name, index, array) => array.indexOf(name) === index);
    const resultType = winners.length > 1 || input.isMultiRon
      ? "double_ron"
      : (input.type || (winners.length > 0 ? "win" : "exhaustive_draw"));
    const drawSettlement = input.drawSettlement
      || (resultType === "exhaustive_draw" ? input.settlement : null);
    return {
      type: resultType,
      winnerIndex: firstWinner ? firstWinner.winnerIndex : null,
      winners,
      winType: firstWinner ? firstWinner.winType : input.winType || null,
      fromPlayerIndex: Number.isInteger(input.fromPlayerIndex) ? input.fromPlayerIndex : null,
      dealerTenpai: Boolean(input.dealerTenpai),
      tenpaiPlayers: Array.isArray(input.tenpaiPlayers) ? input.tenpaiPlayers.slice() : [],
      notenPlayers: Array.isArray(input.notenPlayers) ? input.notenPlayers.slice() : [],
      tenpaiStatus: Array.isArray(input.tenpaiStatus) ? clone(input.tenpaiStatus) : [],
      drawSettlement: compactDrawSettlement(drawSettlement),
      yaku: normalizeYakuArray(input.yaku).concat(rootGroups.yaku).filter((name, index, array) => array.indexOf(name) === index),
      yakuman,
      score: compactScore(input.score || (firstWinner && firstWinner.score) || {}),
      changes: (changes || []).map((change) => ({
        playerIndex: change.playerIndex,
        delta: change.delta,
        after: change.after,
      })),
      pointTransfers: Array.isArray(input.pointTransfers) ? clone(input.pointTransfers) : [],
      isChankan: Boolean(input.isChankan || (firstWinner && firstWinner.isChankan)),
      kanType: input.kanType || (firstWinner && firstWinner.kanType) || null,
      isAnkanKokushiException: Boolean(input.isAnkanKokushiException || (firstWinner && firstWinner.isAnkanKokushiException)),
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

  function normalizeWinner(winner) {
    if (!isObject(winner)) return null;
    return {
      winnerIndex: Number.isInteger(winner.winnerIndex) ? winner.winnerIndex : null,
      winType: winner.winType || null,
      fromPlayerIndex: Number.isInteger(winner.fromPlayerIndex) ? winner.fromPlayerIndex : null,
      yaku: normalizeYakuArray(winner.yaku),
      yakuman: normalizeYakuArray(winner.yakuman),
      score: compactScore(winner.score || {}),
      pointTransfers: Array.isArray(winner.pointTransfers) ? winner.pointTransfers : [],
      isChankan: Boolean(winner.isChankan),
      kanType: winner.kanType || null,
      isAnkanKokushiException: Boolean(winner.isAnkanKokushiException),
    };
  }

  function normalizeResult(result) {
    if (!result || typeof result !== "object") return result || null;
    const normalized = clone(result);
    if (!Array.isArray(normalized.winners)) {
      normalized.winners = Number.isInteger(normalized.winnerIndex)
        ? [compactWinner(normalized, {})]
        : [];
    } else {
      normalized.winners = normalized.winners.map(normalizeWinner).filter(Boolean);
    }
    normalized.winnerIndex = normalized.winners.length ? normalized.winners[0].winnerIndex : null;
    normalized.yaku = normalizeYakuArray(normalized.yaku);
    normalized.yakuman = normalizeYakuArray(normalized.yakuman);
    normalized.score = compactScore(normalized.score || (normalized.winners[0] && normalized.winners[0].score) || {});
    normalized.changes = Array.isArray(normalized.changes) ? normalized.changes : [];
    normalized.pointTransfers = Array.isArray(normalized.pointTransfers) ? normalized.pointTransfers : [];
    normalized.tenpaiPlayers = Array.isArray(normalized.tenpaiPlayers) ? normalized.tenpaiPlayers : [];
    normalized.notenPlayers = Array.isArray(normalized.notenPlayers) ? normalized.notenPlayers : [];
    normalized.tenpaiStatus = Array.isArray(normalized.tenpaiStatus) ? normalized.tenpaiStatus : [];
    if (normalized.drawSettlement === undefined) normalized.drawSettlement = null;
    return normalized;
  }

  function normalize(record) {
    if (!record || typeof record !== "object" || !record.id || !Array.isArray(record.rounds) || record.rounds.length === 0) {
      throw new Error("牌譜データの形式が不正です。");
    }
    const normalized = clone(record);
    normalized.version = Math.max(Number(normalized.version) || 1, 2);
    normalized.eventSchemaVersion = Math.max(Number(normalized.eventSchemaVersion) || 1, 2);
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
      round.result = normalizeResult(round.result);
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
    YAKU_DISPLAY_NAMES,
    yakuDisplayName,
    normalizeYakuArray,
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
