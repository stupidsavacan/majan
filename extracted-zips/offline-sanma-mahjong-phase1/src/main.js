(function bootstrap(global) {
  const Sanma = global.Sanma;
  const tableRoot = document.getElementById("tableRoot");
  const messagePanel = document.getElementById("messagePanel");
  const settingsDialog = document.getElementById("settingsDialog");
  const settingsRoot = document.getElementById("settingsRoot");
  const settingsTransferRoot = document.getElementById("settingsTransferRoot");
  const recordsDialog = document.getElementById("recordsDialog");
  const recordsRoot = document.getElementById("recordsRoot");
  const debugDialog = document.getElementById("debugDialog");
  const debugRoot = document.getElementById("debugRoot");
  const seedInput = document.getElementById("seedInput");

  let currentConfig = Sanma.SettingsStorage.loadSettings();
  let currentSeed = "";
  let engine = null;
  let latestState = null;
  const committedRecordIds = new Set(Sanma.GameRecordStorage.loadRecords().map((record) => record.id));

  function diagnostics() {
    const requiredModules = [
      "RuleConfig", "TileUtil", "HandAnalysis", "YakuAnalysis", "ScoreCalculator", "Settlement",
      "RiichiManager", "KanManager", "KitaManager", "ActionResolver", "CpuStrategy", "AssistManager",
      "GameRecord", "CallWindow", "Wall", "Player", "GameEngine", "SettingsStorage",
      "GameRecordStorage", "RenderTiles", "RenderTable", "SettingsPanel", "SettingsExportImport", "RecordPanel",
    ];
    const recordDiagnostics = Sanma.GameRecordStorage.getDiagnostics();
    const settingsDiagnostics = Sanma.SettingsStorage.getDiagnostics();
    return {
      app_phase: 8,
      modules_loaded: requiredModules.every((name) => Boolean(Sanma[name])),
      loaded_modules: requiredModules.filter((name) => Boolean(Sanma[name])),
      local_storage: {
        readable: recordDiagnostics.localStorage.readable && settingsDiagnostics.readable,
        writable: recordDiagnostics.localStorage.writable && settingsDiagnostics.writable,
        corrupted_recovered: recordDiagnostics.localStorage.corruptedRecovered || settingsDiagnostics.corruptedRecovered,
      },
      records: {
        count: recordDiagnostics.records.count,
        size_limit_policy: recordDiagnostics.records.sizeLimitPolicy,
      },
      last_error: recordDiagnostics.localStorage.lastError || settingsDiagnostics.lastError,
      offline_font_ready: document.fonts ? document.fonts.check('16px "Yuji Mai Embedded"') : null,
      offline: { external_network_required: false },
    };
  }

  function commitCompletedRecord(state) {
    const record = state.gameRecord;
    if (!record || !record.completedAt || committedRecordIds.has(record.id)) return;
    const result = Sanma.GameRecordStorage.commitRecord(record);
    if (result.saved) committedRecordIds.add(record.id);
  }

  function render(state) {
    commitCompletedRecord(state);
    state.diagnostics = diagnostics();
    latestState = state;
    Sanma.RenderTable.renderTable(tableRoot, state, {
      onDiscard: (instanceId) => engine.discardHumanTile(instanceId),
      onTsumo: () => engine.claimHumanTsumo(),
      onRiichi: () => engine.declareHumanRiichi(),
      onKita: () => engine.extractHumanKita(),
      onKan: () => engine.requestHumanKan(),
      onCall: (actionId, optionIndex) => engine.claimHumanCall(actionId, optionIndex),
      onSkipCall: () => engine.skipHumanCall(),
    });
    Sanma.RenderTable.renderMessages(messagePanel, state);
    Sanma.RenderTable.renderDebug(debugRoot, state);
  }

  function startNewRound(options) {
    if (options && Object.prototype.hasOwnProperty.call(options, "seed")) {
      currentSeed = options.seed;
    }
    engine = new Sanma.GameEngine({
      ruleConfig: currentConfig,
      seed: currentSeed,
      onChange: render,
    });
  }

  function renderSettingsUi(message) {
    Sanma.SettingsPanel.renderSettings(settingsRoot, currentConfig);
    Sanma.SettingsExportImport.render(settingsTransferRoot, currentConfig, {
      onImport: (settings) => {
        currentConfig = settings;
        Sanma.SettingsStorage.saveSettings(currentConfig);
        renderSettingsUi("設定JSONを読み込み、保存しました。");
      },
      onReset: () => {
        Sanma.SettingsStorage.resetSettings();
        currentConfig = Sanma.RuleConfig.createRuleConfig({});
        renderSettingsUi("設定を初期化しました。");
      },
    });
    if (message) settingsTransferRoot.querySelector(".transfer-status").textContent = message;
  }

  document.getElementById("newGameButton").addEventListener("click", () => startNewRound({ seed: currentSeed }));

  document.getElementById("settingsButton").addEventListener("click", () => {
    renderSettingsUi();
    settingsDialog.showModal();
  });

  document.getElementById("saveSettingsButton").addEventListener("click", () => {
    currentConfig = Sanma.SettingsPanel.readSettings(settingsRoot, currentConfig);
    Sanma.SettingsStorage.saveSettings(currentConfig);
    startNewRound({ seed: currentSeed });
  });

  function renderRecords() {
    Sanma.RecordPanel.render(recordsRoot, {
      records: Sanma.GameRecordStorage.loadRecords(),
      stats: Sanma.GameRecordStorage.loadStats(),
    }, {
      onCopy: (text, status) => {
        if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
          status.textContent = "牌譜JSONを表示しました。手動でコピーしてください。";
          return;
        }
        navigator.clipboard.writeText(text)
          .then(() => { status.textContent = "牌譜JSONをコピーしました。"; })
          .catch(() => { status.textContent = "コピーできませんでした。手動でコピーしてください。"; });
      },
      onResetRecords: () => {
        Sanma.GameRecordStorage.resetRecords();
        committedRecordIds.clear();
        if (latestState && latestState.gameRecord) committedRecordIds.add(latestState.gameRecord.id);
        renderRecords();
      },
      onResetStats: () => {
        Sanma.GameRecordStorage.resetStats();
        renderRecords();
      },
    });
  }

  document.getElementById("recordsButton").addEventListener("click", () => {
    renderRecords();
    recordsDialog.showModal();
  });

  document.getElementById("debugButton").addEventListener("click", () => {
    if (latestState) Sanma.RenderTable.renderDebug(debugRoot, latestState);
    seedInput.value = currentSeed;
    debugDialog.showModal();
  });

  document.getElementById("applySeedButton").addEventListener("click", () => {
    currentSeed = seedInput.value.trim();
    startNewRound({ seed: currentSeed });
  });

  document.getElementById("resetStorageButton").addEventListener("click", () => {
    Sanma.SettingsStorage.resetAllStorage();
    committedRecordIds.clear();
    currentConfig = Sanma.RuleConfig.createRuleConfig({});
    startNewRound({ seed: "" });
  });

  startNewRound({ seed: "" });
})(window);
