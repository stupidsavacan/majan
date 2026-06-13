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
      return RuleConfig.createRuleConfig({});
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(RuleConfig.createRuleConfig(settings)));
  }

  function resetAllStorage() {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("offlineSanma."))
      .forEach((key) => localStorage.removeItem(key));
  }

  Sanma.SettingsStorage = { loadSettings, saveSettings, resetAllStorage };
})(window);
