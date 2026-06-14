(function attachGameRecordStorage(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const SaveMigration = Sanma.SaveMigration;
  const RECORDS_KEY = "offlineSanma.phase8.records";
  const STATS_KEY = "offlineSanma.phase8.stats";
  const MAX_RECORDS = 20;
  const status = {
    readable: true,
    writable: true,
    corruptedRecovered: false,
    lastError: null,
  };

  function defaultStats() {
    return {
      version: SaveMigration.versions.stats,
      gamesPlayed: 0,
      roundsPlayed: 0,
      wins: 0,
      losses: 0,
      yakumanCount: 0,
      highestHand: null,
      totalScoreMovement: 0,
      lastPlayedAt: null,
    };
  }

  function rememberError(error, kind) {
    status.lastError = error && error.message ? error.message : String(error);
    if (kind === "read") status.readable = false;
    if (kind === "write") status.writable = false;
  }

  function backupCurrent(key, reason) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? SaveMigration.backupRaw(localStorage, key, raw, reason) : null;
    } catch (error) {
      rememberError(error, "write");
      return null;
    }
  }

  function readJson(key, fallback) {
    const kind = key === RECORDS_KEY ? "records" : "stats";
    try {
      const result = SaveMigration.readAndMigrate({
        storage: localStorage,
        key,
        kind,
        fallback,
      });
      if (result.recovered) status.corruptedRecovered = true;
      if (result.error) status.lastError = result.error;
      return kind === "records" ? result.value.records : result.value;
    } catch (error) {
      rememberError(error, "read");
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      const storedValue = key === RECORDS_KEY
        ? { version: SaveMigration.versions.records, records: value }
        : Object.assign({}, value, { version: SaveMigration.versions.stats });
      localStorage.setItem(key, JSON.stringify(storedValue));
      status.writable = true;
      return true;
    } catch (error) {
      rememberError(error, "write");
      return false;
    }
  }

  function loadRecords() {
    const loaded = readJson(RECORDS_KEY, []);
    if (!Array.isArray(loaded)) {
      status.corruptedRecovered = true;
      writeJson(RECORDS_KEY, []);
      return [];
    }
    const records = [];
    let recovered = loaded.length > MAX_RECORDS;
    let invalidRecovered = false;
    loaded.slice(-MAX_RECORDS).forEach((record) => {
      try {
        records.push(Sanma.GameRecord.normalize(record));
      } catch (error) {
        recovered = true;
        invalidRecovered = true;
        status.corruptedRecovered = true;
        status.lastError = error.message;
      }
    });
    if (invalidRecovered) backupCurrent(RECORDS_KEY, "不正な牌譜を除外しました");
    if (recovered) writeJson(RECORDS_KEY, records);
    return records;
  }

  function saveRecord(record) {
    let normalized;
    try {
      normalized = Sanma.GameRecord.normalize(record);
    } catch (error) {
      rememberError(error, "write");
      return false;
    }
    const records = loadRecords();
    const existingIndex = records.findIndex((item) => item.id === normalized.id);
    if (existingIndex >= 0) records.splice(existingIndex, 1);
    records.push(normalized);
    return writeJson(RECORDS_KEY, records.slice(-MAX_RECORDS));
  }

  function loadStats() {
    const loaded = readJson(STATS_KEY, null);
    if (!loaded || typeof loaded !== "object" || Array.isArray(loaded)) return defaultStats();
    const stats = defaultStats();
    let recovered = false;
    ["gamesPlayed", "roundsPlayed", "wins", "losses", "yakumanCount", "totalScoreMovement"].forEach((key) => {
      if (Number.isFinite(loaded[key])) stats[key] = loaded[key];
      else if (loaded[key] !== undefined) recovered = true;
    });
    stats.highestHand = loaded.highestHand && typeof loaded.highestHand === "object"
      ? loaded.highestHand
      : null;
    stats.lastPlayedAt = typeof loaded.lastPlayedAt === "string" ? loaded.lastPlayedAt : null;
    if (loaded.highestHand !== undefined && loaded.highestHand !== null && !stats.highestHand) recovered = true;
    if (loaded.lastPlayedAt !== undefined && loaded.lastPlayedAt !== null && !stats.lastPlayedAt) recovered = true;
    if (recovered) {
      status.corruptedRecovered = true;
      backupCurrent(STATS_KEY, "不正な成績フィールドを修復しました");
      writeJson(STATS_KEY, stats);
    }
    return stats;
  }

  function scoreRank(result) {
    const score = result && result.score ? result.score : {};
    if (score.isYakuman) return 1000000 + (score.han || 0);
    return (Number(score.han) || 0) * 1000 + (Number(score.fu) || 0);
  }

  function updateStats(record) {
    const stats = loadStats();
    const rounds = record && Array.isArray(record.rounds) ? record.rounds : [];
    const results = rounds.map((round) => round && round.result ? round.result : {});
    const human = (record.players || []).find((player) => player.isHuman) || record.players[0];
    const humanIndex = human && Number.isInteger(human.id) ? human.id : 0;
    const initialPoints = human ? Number(human.initialPoints) || 0 : 0;
    const finalPointValue = Number(record.finalPoints && record.finalPoints[humanIndex]);
    const finalPoints = Number.isFinite(finalPointValue) ? finalPointValue : initialPoints;

    stats.gamesPlayed += 1;
    stats.roundsPlayed += Array.isArray(record.rounds) ? record.rounds.length : 1;
    results.forEach((result) => {
      if (Number.isInteger(result.winnerIndex)) {
        if (result.winnerIndex === humanIndex) stats.wins += 1;
        else stats.losses += 1;
      }
      if (result.score && result.score.isYakuman) stats.yakumanCount += 1;
    });
    stats.totalScoreMovement += finalPoints - initialPoints;
    stats.lastPlayedAt = record.completedAt || new Date().toISOString();
    results.forEach((result) => {
      if (!result.score || !result.score.isValidWin) return;
      const candidate = {
        winnerIndex: result.winnerIndex,
        winType: result.winType,
        yaku: result.yaku || [],
        yakuman: result.yakuman || [],
        score: result.score,
        playedAt: stats.lastPlayedAt,
      };
      if (!stats.highestHand || scoreRank(candidate) > scoreRank(stats.highestHand)) {
        stats.highestHand = candidate;
      }
    });
    writeJson(STATS_KEY, stats);
    return stats;
  }

  function commitRecord(record) {
    const records = loadRecords();
    const isNew = !records.some((item) => item.id === record.id);
    if (!saveRecord(record)) return { saved: false, stats: loadStats(), isNew: false };
    return { saved: true, stats: isNew ? updateStats(record) : loadStats(), isNew };
  }

  function resetRecords() {
    try {
      localStorage.removeItem(RECORDS_KEY);
      return true;
    } catch (error) {
      rememberError(error, "write");
      return false;
    }
  }

  function resetStats() {
    try {
      localStorage.removeItem(STATS_KEY);
      return true;
    } catch (error) {
      rememberError(error, "write");
      return false;
    }
  }

  function getDiagnostics() {
    const records = loadRecords();
    return {
      localStorage: Object.assign({}, status),
      records: {
        count: records.length,
        sizeLimitPolicy: `最新${MAX_RECORDS}件・1局${Sanma.GameRecord.MAX_EVENTS_PER_ROUND}イベント`,
      },
    };
  }

  Sanma.GameRecordStorage = {
    RECORDS_KEY,
    STATS_KEY,
    MAX_RECORDS,
    defaultStats,
    loadRecords,
    saveRecord,
    loadStats,
    updateStats,
    commitRecord,
    resetRecords,
    resetStats,
    getDiagnostics,
  };
})(window);
