(function attachSettingsStorage(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const RuleConfig = Sanma.RuleConfig;
  const SaveMigration = Sanma.SaveMigration;
  const STORAGE_KEY = "offlineSanma.phase1.settings";
  const status = { readable: true, writable: true, corruptedRecovered: false, lastError: null };

  function rememberError(error, kind) {
    status.lastError = error && error.message ? error.message : String(error);
    if (kind === "read") status.readable = false;
    if (kind === "write") status.writable = false;
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return RuleConfig.createRuleConfig({});
      const parsed = JSON.parse(raw);
      const defaults = RuleConfig.publicSettings(RuleConfig.defaultRuleConfig);
      const migrated = SaveMigration.migrateParsed("settings", parsed, defaults);
      const candidate = migrated && migrated.value && migrated.value.settings
        ? migrated.value.settings
        : defaults;
      const validation = RuleConfig.validatePublicSettings(candidate);
      if (!validation.ok) {
        throw new Error(validation.reason);
      }
      if (migrated && migrated.migrated) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          version: SaveMigration.versions.settings,
          settings: validation.settings,
        }));
      }
      return RuleConfig.createRuleConfig(validation.settings);
    } catch (error) {
      status.corruptedRecovered = true;
      status.lastError = error.message;
      const defaults = RuleConfig.publicSettings(RuleConfig.defaultRuleConfig);
      let raw = null;
      try {
        raw = localStorage.getItem(STORAGE_KEY);
      } catch (readError) {
        rememberError(readError, "read");
      }
      if (raw) {
        try {
          SaveMigration.backupRaw(localStorage, STORAGE_KEY, raw, `不正な設定を拒否しました: ${error.message}`);
        } catch (backupError) {
          status.lastError = `${error.message} / 退避失敗: ${backupError.message}`;
          status.writable = false;
        }
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          version: SaveMigration.versions.settings,
          settings: defaults,
        }));
      } catch (writeError) {
        status.lastError = `${status.lastError} / 初期値保存失敗: ${writeError.message}`;
        status.writable = false;
      }
      console.warn("Failed to load settings", error);
      return RuleConfig.createRuleConfig(defaults);
    }
  }

  function saveSettings(settings) {
    try {
      const publicSettings = RuleConfig.publicSettings(settings);
      const validation = RuleConfig.validatePublicSettings(publicSettings);
      if (!validation.ok) throw new Error(validation.reason);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: SaveMigration.versions.settings,
        settings: validation.settings,
      }));
      status.writable = true;
      return true;
    } catch (error) {
      rememberError(error, "write");
      console.warn("Failed to save settings", error);
      return false;
    }
  }

  function resetAllStorage() {
    try {
      const keys = new Set([
        STORAGE_KEY,
        "offlineSanma.phase8.records",
        "offlineSanma.phase8.stats",
      ]);
      Object.keys(localStorage)
        .filter((key) => key.startsWith("offlineSanma."))
        .forEach((key) => keys.add(key));
      if (Number.isInteger(localStorage.length) && typeof localStorage.key === "function") {
        for (let index = 0; index < localStorage.length; index += 1) {
          const key = localStorage.key(index);
          if (key && key.startsWith("offlineSanma.")) keys.add(key);
        }
      }
      keys.forEach((key) => localStorage.removeItem(key));
      status.writable = true;
      return true;
    } catch (error) {
      rememberError(error, "write");
      console.warn("Failed to reset storage", error);
      return false;
    }
  }

  function resetSettings() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      rememberError(error, "write");
      return false;
    }
  }

  function getDiagnostics() {
    return Object.assign({}, status);
  }

  Sanma.SettingsStorage = {
    STORAGE_KEY,
    loadSettings,
    saveSettings,
    resetSettings,
    resetAllStorage,
    getDiagnostics,
  };
})(window);
