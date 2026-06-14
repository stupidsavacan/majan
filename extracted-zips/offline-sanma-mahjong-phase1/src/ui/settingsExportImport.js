(function attachSettingsExportImport(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function exportSettings(settings) {
    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: Sanma.RuleConfig.createRuleConfig(settings || {}),
    }, null, 2);
  }

  function importSettings(text) {
    try {
      const parsed = JSON.parse(String(text || ""));
      const candidate = parsed && parsed.settings ? parsed.settings : parsed;
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
        return { ok: false, settings: null, reason: "設定JSONがオブジェクトではありません。" };
      }
      const defaults = Sanma.RuleConfig.defaultRuleConfig;
      const accepted = {};
      Object.keys(defaults).forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(candidate, key)) return;
        if (typeof candidate[key] === typeof defaults[key]) accepted[key] = candidate[key];
      });
      if (Object.keys(accepted).length === 0) {
        return { ok: false, settings: null, reason: "既知の設定項目がありません。" };
      }
      return {
        ok: true,
        settings: Sanma.RuleConfig.createRuleConfig(accepted),
        reason: "設定JSONを読み込みました。",
      };
    } catch (error) {
      return { ok: false, settings: null, reason: `設定JSONを読み込めません: ${error.message}` };
    }
  }

  function button(label, action) {
    const node = document.createElement("button");
    node.type = "button";
    node.textContent = label;
    node.dataset.settingsAction = action;
    return node;
  }

  function render(root, currentConfig, handlers) {
    root.innerHTML = "";
    const title = document.createElement("h3");
    title.textContent = "設定のエクスポート・インポート";
    const textarea = document.createElement("textarea");
    textarea.className = "transfer-textarea";
    textarea.placeholder = "設定JSONをここへ貼り付けてください。";
    const status = document.createElement("div");
    status.className = "transfer-status";
    const actions = document.createElement("div");
    actions.className = "panel-actions transfer-actions";

    const exportButton = button("設定JSONを表示", "export");
    exportButton.addEventListener("click", () => {
      textarea.value = exportSettings(currentConfig);
      status.textContent = "設定JSONを表示しました。";
    });
    const importButton = button("インポート", "import");
    importButton.addEventListener("click", () => {
      const result = importSettings(textarea.value);
      status.textContent = result.reason;
      if (result.ok && handlers && handlers.onImport) handlers.onImport(result.settings);
    });
    const resetButton = button("設定を初期化", "reset");
    resetButton.className = "danger";
    resetButton.addEventListener("click", () => {
      if (handlers && handlers.onReset) handlers.onReset();
      status.textContent = "設定を初期化しました。";
    });

    actions.append(exportButton, importButton, resetButton);
    root.append(title, textarea, actions, status);
  }

  Sanma.SettingsExportImport = { exportSettings, importSettings, render };
})(window);
