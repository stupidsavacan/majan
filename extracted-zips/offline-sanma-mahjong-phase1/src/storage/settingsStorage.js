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
      const result = SaveMigration.readAndMigrate({
        storage: localStorage,
        key: STORAGE_KEY,
        kind: "settings",
        fallback: RuleConfig.defaultRuleConfig,
      });
      if (result.recovered) status.corruptedRecovered = true;
      if (result.error) status.lastError = result.error;
      return RuleConfig.createRuleConfig(result.value.settings);
    } catch (error) {
      rememberError(error, "read");
      console.warn("Failed to load settings", error);
      return RuleConfig.createRuleConfig({});
    }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: SaveMigration.versions.settings,
        settings: RuleConfig.createRuleConfig(settings),
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
