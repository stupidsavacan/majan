(function attachGameRecordStorage(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const SaveMigration = Sanma.SaveMigration;
  const RECORDS_KEY = "offlineSanma.phase8.records";
  const STATS_KEY = "offlineSanma.phase8.stats";
  const INDEX_KEY = "offlineSanma.phase13.recordIndex";
  const MAX_RECORDS = 20;
  const STORAGE_WARNING_BYTES = 4 * 1024 * 1024;
  const MAX_STORED_RECORDS_CHARS = Sanma.GameRecord.MAX_IMPORT_CHARS * MAX_RECORDS;
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

  function writeIndex(entries) {
    try {
      localStorage.setItem(INDEX_KEY, JSON.stringify({
        version: 1,
        entries: entries || [],
      }));
      return true;
    } catch (error) {
      rememberError(error, "write");
      return false;
    }
  }

  function rebuildIndex(records) {
    const entries = Sanma.RecordIndex.build(records || []);
    writeIndex(entries);
    return entries;
  }

  function indexMatchesRecords(entries, records) {
    if (!Array.isArray(records)) return true;
    if (entries.length !== records.length) return false;
    const recordIds = new Set(records.map((record) => record && record.id).filter(Boolean));
    return entries.every((entry) => entry && recordIds.has(entry.id));
  }

  function loadIndex(records) {
    try {
      const raw = localStorage.getItem(INDEX_KEY);
      if (!raw) return rebuildIndex(Array.isArray(records) ? records : loadRecords());
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.entries)) throw new Error("牌譜インデックスの形式が不正です");
      if (!indexMatchesRecords(parsed.entries, records)) throw new Error("牌譜本文とインデックスが一致しません");
      return parsed.entries.slice().sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
    } catch (error) {
      status.corruptedRecovered = true;
      status.lastError = error.message;
      backupCurrent(INDEX_KEY, "不正な牌譜インデックスを再構築しました");
      return rebuildIndex(Array.isArray(records) ? records : loadRecords());
    }
  }

  function loadRecords() {
    let loaded;
    try {
      const raw = localStorage.getItem(RECORDS_KEY);
      if (!raw) return [];
      if (raw.length > MAX_STORED_RECORDS_CHARS) throw new Error("保存牌譜全体のサイズが上限を超えています。");
      const parsed = JSON.parse(raw);
      loaded = Array.isArray(parsed) ? parsed : parsed && parsed.records;
      if (!Array.isArray(loaded)) throw new Error("保存牌譜の形式が不正です。");
    } catch (error) {
      status.corruptedRecovered = true;
      status.lastError = error.message;
      backupCurrent(RECORDS_KEY, "不正な保存牌譜を除外しました");
      writeJson(RECORDS_KEY, []);
      rebuildIndex([]);
      return [];
    }
    const records = [];
    let recovered = loaded.length > MAX_RECORDS;
    let invalidRecovered = false;
    loaded.slice(-MAX_RECORDS).forEach((record) => {
      try {
        Sanma.GameRecord.validateImportedRecord(record);
        records.push(Sanma.GameRecord.normalize(record));
      } catch (error) {
        recovered = true;
        invalidRecovered = true;
        status.corruptedRecovered = true;
        status.lastError = error.message;
      }
    });
    if (invalidRecovered) backupCurrent(RECORDS_KEY, "不正な牌譜を除外しました");
    if (recovered) {
      writeJson(RECORDS_KEY, records);
      rebuildIndex(records);
    }
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
    const limited = records.slice(-MAX_RECORDS);
    const saved = writeJson(RECORDS_KEY, limited);
    if (saved) rebuildIndex(limited);
    return saved;
  }

  function loadRecord(recordId) {
    return loadRecords().find((record) => record.id === recordId) || null;
  }

  function deleteRecord(recordId) {
    const records = loadRecords();
    const remaining = records.filter((record) => record.id !== recordId);
    if (remaining.length === records.length) return false;
    const saved = writeJson(RECORDS_KEY, remaining);
    if (saved) rebuildIndex(remaining);
    return saved;
  }

  function createImportedRecordId(existingIds) {
    let index = 1;
    let id = "";
    do {
      id = `imported-${Date.now().toString(36)}-${index.toString(36)}`;
      index += 1;
    } while (existingIds.has(id));
    return id;
  }

  function avoidImportIdCollision(record, options) {
    const input = options || {};
    const activeRecordId = typeof input.activeRecordId === "string" ? input.activeRecordId : "";
    const existingIds = new Set(loadRecords().map((item) => item && item.id).filter(Boolean));
    if (!existingIds.has(record.id) && record.id !== activeRecordId) return record;
    const sourceRecordId = record.id;
    record.sourceRecordId = typeof record.sourceRecordId === "string" ? record.sourceRecordId : sourceRecordId;
    record.id = createImportedRecordId(existingIds);
    return record;
  }

  function importRecord(text, options) {
    try {
      const record = Sanma.GameRecord.deserializeImported(String(text || ""));
      record.imported = true;
      record.statsEligible = false;
      avoidImportIdCollision(record, options);
      if (!saveRecord(record)) throw new Error("牌譜を保存できませんでした");
      return { ok: true, record, reason: "牌譜をインポートしました。" };
    } catch (error) {
      status.lastError = error.message;
      return { ok: false, record: null, reason: `牌譜をインポートできません: ${error.message}` };
    }
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
    if (score.isYakuman) return 1000000 * Math.max(1, Number(score.yakumanCount) || 1)
      + (Number(score.basePoints) || 0);
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
        yaku: Array.isArray(result.yaku) ? result.yaku : [],
        yakuman: Array.isArray(result.yakuman) ? result.yakuman : [],
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
      localStorage.removeItem(INDEX_KEY);
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
    const sizeBytes = Sanma.RecordIndex.sizeBytes(records);
    return {
      localStorage: Object.assign({}, status),
      records: {
        count: records.length,
        sizeLimitPolicy: `最新${MAX_RECORDS}件・1局${Sanma.GameRecord.MAX_EVENTS_PER_ROUND}イベント`,
        sizeBytes,
        nearStorageLimit: sizeBytes >= STORAGE_WARNING_BYTES,
      },
    };
  }

  Sanma.GameRecordStorage = {
    RECORDS_KEY,
    STATS_KEY,
    INDEX_KEY,
    MAX_RECORDS,
    MAX_STORED_RECORDS_CHARS,
    STORAGE_WARNING_BYTES,
    defaultStats,
    loadRecords,
    loadIndex,
    indexMatchesRecords,
    rebuildIndex,
    loadRecord,
    saveRecord,
    deleteRecord,
    avoidImportIdCollision,
    importRecord,
    loadStats,
    updateStats,
    commitRecord,
    resetRecords,
    resetStats,
    getDiagnostics,
  };
})(window);
