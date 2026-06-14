(function attachSaveMigration(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const BACKUP_PREFIX = "offlineSanma.phase12.backup";
  const versions = Object.freeze({ settings: 2, records: 2, stats: 2 });
  let backupSequence = 0;
  const eventLog = Sanma.DebugEventLog ? Sanma.DebugEventLog.create(50) : null;

  function record(type, data) {
    if (Sanma.DebugEventLog && eventLog) Sanma.DebugEventLog.add(eventLog, type, data);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function defaults(kind, fallback) {
    if (kind === "settings") return { version: versions.settings, settings: clone(fallback || {}) };
    if (kind === "records") return { version: versions.records, records: [] };
    return Object.assign({}, clone(fallback || {}), { version: versions.stats });
  }

  function migrateParsed(kind, parsed, fallback) {
    const targetVersion = versions[kind];
    if (!targetVersion) throw new Error(`不明な保存種別です: ${kind}`);
    if (!parsed || typeof parsed !== "object" || (Array.isArray(parsed) && kind !== "records")) {
      return { value: defaults(kind, fallback), migrated: true };
    }
    const currentVersion = Number(parsed.version) || 1;
    if (currentVersion > targetVersion) {
      return {
        value: defaults(kind, fallback),
        migrated: true,
        futureVersion: true,
        error: `未知の将来バージョンです: ${currentVersion}`,
      };
    }
    if (kind === "settings") {
      const source = parsed.settings && typeof parsed.settings === "object" ? parsed.settings : parsed;
      const missingFields = Object.keys(fallback || {})
        .some((key) => !Object.prototype.hasOwnProperty.call(source, key));
      const settings = Object.assign({}, clone(fallback || {}), clone(source));
      delete settings.version;
      return {
        value: { version: targetVersion, settings },
        migrated: currentVersion !== targetVersion || !parsed.settings || missingFields,
      };
    }
    if (kind === "records") {
      const records = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.records) ? parsed.records : []);
      return { value: { version: targetVersion, records: clone(records) }, migrated: currentVersion !== targetVersion || Array.isArray(parsed) };
    }
    const stats = Object.assign({}, clone(fallback || {}), parsed, { version: targetVersion });
    const missingFields = Object.keys(fallback || {})
      .some((key) => !Object.prototype.hasOwnProperty.call(parsed, key));
    return { value: stats, migrated: currentVersion !== targetVersion || missingFields };
  }

  function backupRaw(storage, sourceKey, raw, reason) {
    backupSequence += 1;
    const key = `${BACKUP_PREFIX}.${Date.now().toString(36)}.${backupSequence}`;
    storage.setItem(key, JSON.stringify({
      sourceKey,
      reason: reason || "保存データを退避しました",
      raw: String(raw || ""),
      backedUpAt: new Date().toISOString(),
    }));
    record("storageMigration", {
      kind: "backup",
      key: sourceKey,
      recovered: true,
      backupKey: key,
    });
    return key;
  }

  function readAndMigrate(input) {
    const options = input || {};
    const storage = options.storage || global.localStorage;
    const raw = storage.getItem(options.key);
    if (!raw) return { value: defaults(options.kind, options.fallback), migrated: false, recovered: false, backupKey: null };
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      const backupKey = backupRaw(storage, options.key, raw, `JSON解析失敗: ${error.message}`);
      const value = defaults(options.kind, options.fallback);
      storage.setItem(options.key, JSON.stringify(value));
      record("storageMigration", {
        kind: options.kind,
        key: options.key,
        recovered: true,
        backupKey,
      });
      return { value, migrated: true, recovered: true, backupKey, error: error.message };
    }
    const result = migrateParsed(options.kind, parsed, options.fallback);
    let backupKey = null;
    if (result.futureVersion) backupKey = backupRaw(storage, options.key, raw, "未知の将来バージョン");
    if (result.migrated) {
      storage.setItem(options.key, JSON.stringify(result.value));
      record("storageMigration", {
        kind: options.kind,
        key: options.key,
        recovered: Boolean(result.futureVersion),
        backupKey,
      });
    }
    return Object.assign(result, { recovered: Boolean(result.futureVersion), backupKey });
  }

  Sanma.SaveMigration = {
    BACKUP_PREFIX,
    versions,
    defaults,
    migrateParsed,
    backupRaw,
    readAndMigrate,
    getEvents: () => Sanma.DebugEventLog && eventLog ? Sanma.DebugEventLog.list(eventLog) : [],
  };
})(window);
