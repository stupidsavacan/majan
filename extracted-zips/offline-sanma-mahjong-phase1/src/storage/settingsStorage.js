(function attachSettingsStorage(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const RuleConfig = Sanma.RuleConfig;
  const STORAGE_KEY = "offlineSanma.phase1.settings";
  const status = { readable: true, writable: true, corruptedRecovered: false, lastError: null };

  function rememberError(error, kind) {
    status.lastError = error && error.message ? error.message : String(error);
    if (kind === "read") status.readable = false;
    if (kind === "write") status.writable = false;
  }

  function loadSettings() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      rememberError(error, "read");
      console.warn("Failed to load settings", error);
      return RuleConfig.createRuleConfig({});
    }
    try {
      return RuleConfig.createRuleConfig(raw ? JSON.parse(raw) : {});
    } catch (error) {
      status.corruptedRecovered = true;
      status.lastError = error.message;
      console.warn("Failed to load settings", error);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (removeError) {
        console.warn("Failed to remove corrupted settings", removeError);
      }
      return RuleConfig.createRuleConfig({});
    }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(RuleConfig.createRuleConfig(settings)));
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
      Object.keys(localStorage)
        .filter((key) => key.startsWith("offlineSanma."))
        .forEach((key) => localStorage.removeItem(key));
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
