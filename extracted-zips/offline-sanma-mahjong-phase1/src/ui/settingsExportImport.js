(function attachSettingsExportImport(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const PUBLIC_SETTINGS_SCHEMA = Object.freeze({
    matchLength: Object.freeze({ type: "enum", values: Object.freeze(["single", "tonpuu", "hanchan"]) }),
    northMode: Object.freeze({ type: "enum", values: Object.freeze(["kita-dora", "normal-tile", "disabled"]) }),
    allowChi: Object.freeze({ type: "boolean" }),
    tsumoLoss: Object.freeze({ type: "boolean" }),
    highScoreMode: Object.freeze({ type: "boolean" }),
    uraDora: Object.freeze({ type: "boolean" }),
    kanDora: Object.freeze({ type: "boolean" }),
    kanUraDora: Object.freeze({ type: "boolean" }),
    redDoraMode: Object.freeze({ type: "enum", values: Object.freeze(["standard", "none", "custom"]) }),
    kuitan: Object.freeze({ type: "boolean" }),
    atozuke: Object.freeze({ type: "boolean" }),
    startingPoints: Object.freeze({ type: "integer", min: 10000, max: 100000 }),
  });

  function publicSettings(settings) {
    const source = settings || {};
    return Object.keys(PUBLIC_SETTINGS_SCHEMA).reduce((result, key) => {
      if (Object.prototype.hasOwnProperty.call(source, key)) result[key] = source[key];
      return result;
    }, {});
  }

  function exportSettings(settings) {
    return JSON.stringify({
      version: Sanma.SaveMigration ? Sanma.SaveMigration.versions.settings : 2,
      exportedAt: new Date().toISOString(),
      settings: publicSettings(Sanma.RuleConfig.createRuleConfig(settings || {})),
    }, null, 2);
  }

  function validateValue(key, value, rule) {
    if (rule.type === "boolean" && typeof value !== "boolean") {
      return `${key} は真偽値で指定してください。`;
    }
    if (rule.type === "enum" && !rule.values.includes(value)) {
      return `${key} の値が不正です。`;
    }
    if (rule.type === "integer"
      && (!Number.isInteger(value) || value < rule.min || value > rule.max)) {
      return `${key} は ${rule.min} 以上 ${rule.max} 以下の整数で指定してください。`;
    }
    return "";
  }

  function importSettings(text) {
    try {
      const parsed = JSON.parse(String(text || ""));
      const wrapped = parsed
        && typeof parsed === "object"
        && !Array.isArray(parsed)
        && Object.prototype.hasOwnProperty.call(parsed, "settings");
      if (wrapped) {
        const unknownWrapperKey = Object.keys(parsed)
          .find((key) => !["version", "exportedAt", "settings"].includes(key));
        if (unknownWrapperKey) {
          return { ok: false, settings: null, reason: `インポートできない設定項目です: ${unknownWrapperKey}` };
        }
      }
      const candidate = wrapped ? parsed.settings : parsed;
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
        return { ok: false, settings: null, reason: "設定JSONはオブジェクトで指定してください。" };
      }
      const keys = Object.keys(candidate);
      if (keys.length === 0) return { ok: false, settings: null, reason: "公開設定項目がありません。" };
      const unknown = keys.find((key) => !Object.prototype.hasOwnProperty.call(PUBLIC_SETTINGS_SCHEMA, key));
      if (unknown) return { ok: false, settings: null, reason: `インポートできない設定項目です: ${unknown}` };
      for (const key of keys) {
        const reason = validateValue(key, candidate[key], PUBLIC_SETTINGS_SCHEMA[key]);
        if (reason) return { ok: false, settings: null, reason };
      }
      return {
        ok: true,
        settings: Sanma.RuleConfig.createRuleConfig(publicSettings(candidate)),
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
    textarea.id = "settingsJson";
    textarea.className = "transfer-textarea";
    textarea.placeholder = "設定JSONをここへ貼り付けてください";
    const status = document.createElement("div");
    status.id = "settingsTransferStatus";
    status.className = "transfer-status";
    const actions = document.createElement("div");
    actions.className = "panel-actions transfer-actions";

    const exportButton = button("設定JSONを表示", "export");
    exportButton.id = "exportSettingsButton";
    exportButton.addEventListener("click", () => {
      textarea.value = exportSettings(currentConfig);
      status.textContent = "設定JSONを表示しました。";
    });
    const importButton = button("インポート", "import");
    importButton.id = "importSettingsButton";
    importButton.addEventListener("click", () => {
      const result = importSettings(textarea.value);
      status.textContent = result.reason;
      if (result.ok && handlers && handlers.onImport) handlers.onImport(result.settings);
    });
    const resetButton = button("設定を初期化", "reset");
    resetButton.id = "resetSettingsButton";
    resetButton.className = "danger";
    resetButton.addEventListener("click", () => {
      if (handlers && handlers.onReset) handlers.onReset();
      status.textContent = "設定を初期化しました。";
    });

    actions.append(exportButton, importButton, resetButton);
    root.append(title, textarea, actions, status);
  }

  Sanma.SettingsExportImport = {
    PUBLIC_SETTINGS_SCHEMA,
    publicSettings,
    exportSettings,
    importSettings,
    render,
  };
})(window);
