(function attachSettingsStorage(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const RuleConfig = Sanma.RuleConfig;
  const STORAGE_KEY = "offlineSanma.phase1.settings";

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return RuleConfig.createRuleConfig(raw ? JSON.parse(raw) : {});
    } catch (error) {
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
      return true;
    } catch (error) {
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
      console.warn("Failed to reset storage", error);
      return false;
    }
  }

  Sanma.SettingsStorage = { loadSettings, saveSettings, resetAllStorage };
})(window);
