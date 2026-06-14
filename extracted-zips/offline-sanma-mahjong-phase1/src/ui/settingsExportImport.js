(function attachSettingsExportImport(global) { const Sanma = global.Sanma = global.Sanma || {};
  function exportSettings(settings) { return JSON.stringify({ version: 1, settings: Sanma.RuleConfig.createRuleConfig(settings) }, null, 2); } function importSettings(text) { const data = JSON.parse(text);
  if (!data || data.version !== 1 || !data.settings || typeof data.settings !== "object" || Array.isArray(data.settings)) throw new Error("設定JSONの形式が不正です。"); return Sanma.RuleConfig.createRuleConfig(data.settings);
  } Sanma.SettingsExportImport = { exportSettings, importSettings }; })(window);
