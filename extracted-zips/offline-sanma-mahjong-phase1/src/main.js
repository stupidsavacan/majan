(function bootstrap(global) {
  "use strict";

  const Sanma = global.Sanma;
  let tableRoot = null;
  let messagePanel = null;
  let settingsDialog = null;
  let settingsRoot = null;
  let settingsTransferRoot = null;
  let recordsDialog = null;
  let recordsRoot = null;
  let debugDialog = null;
  let debugRoot = null;
  let seedInput = null;
  let currentConfig = null;
  let currentSeed = "";
  let engine = null;
  let latestState = null;
  let lastAppError = null;
  let committedRecordIds = new Set();

  function requiredElement(id) {
    const node = document.getElementById(id);
    if (!node) throw new Error(`必須UI要素 #${id} が見つかりません。`);
    return node;
  }

  function showError(error, context) {
    const detail = error && error.message ? error.message : String(error);
    lastAppError = `${context}: ${detail}`;
    console.error(lastAppError, error);
    if (messagePanel) {
      messagePanel.textContent = `エラー: ${detail}。「新しい局」または保存データのリセットで復旧できます。`;
    }
  }

  function safeAction(context, action) {
    return function guardedAction(...args) {
      try {
        return action(...args);
      } catch (error) {
        showError(error, context);
        return undefined;
      }
    };
  }

  function offlineFontReady() {
    try {
      return document.fonts ? document.fonts.check('16px "Yuji Mai Embedded"') : null;
    } catch (error) {
      showError(error, "オフラインフォント診断");
      return null;
    }
  }

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
      app_phase: "9.1",
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
      last_error: lastAppError || recordDiagnostics.localStorage.lastError || settingsDiagnostics.lastError,
      offline_font_ready: offlineFontReady(),
      offline: { external_network_required: false },
    };
  }

  function commitCompletedRecord(state) {
    const record = state.gameRecord;
    if (!record || !record.completedAt || committedRecordIds.has(record.id)) return;
    const result = Sanma.GameRecordStorage.commitRecord(record);
    if (!result.saved) throw new Error("終了牌譜を保存できませんでした。");
    committedRecordIds.add(record.id);
  }

  function render(state) {
    try {
      commitCompletedRecord(state);
      state.diagnostics = diagnostics();
      latestState = state;
      Sanma.RenderTable.renderTable(tableRoot, state, {
        onDiscard: safeAction("打牌", (instanceId) => engine.discardHumanTile(instanceId)),
        onTsumo: safeAction("ツモ和了", () => engine.claimHumanTsumo()),
        onRiichi: safeAction("リーチ", () => engine.declareHumanRiichi()),
        onKita: safeAction("北抜き", () => engine.extractHumanKita()),
        onKan: safeAction("カン確認", () => engine.requestHumanKan()),
        onCall: safeAction("鳴き", (actionId, optionIndex) => engine.claimHumanCall(actionId, optionIndex)),
        onSkipCall: safeAction("鳴きスキップ", () => engine.skipHumanCall()),
      });
      Sanma.RenderTable.renderMessages(messagePanel, state);
      Sanma.RenderTable.renderDebug(debugRoot, state);
    } catch (error) {
      showError(error, "画面描画");
    }
  }

  function startNewRound(options) {
    try {
      if (options && Object.prototype.hasOwnProperty.call(options, "seed")) {
        currentSeed = options.seed;
      }
      engine = new Sanma.GameEngine({
        ruleConfig: currentConfig,
        seed: currentSeed,
        onChange: render,
      });
    } catch (error) {
      showError(error, "新しい局");
    }
  }

  function renderSettingsUi(message) {
    Sanma.SettingsPanel.renderSettings(settingsRoot, currentConfig);
    Sanma.SettingsExportImport.render(settingsTransferRoot, currentConfig, {
      onImport: safeAction("設定JSONインポート", (settings) => {
        if (!Sanma.SettingsStorage.saveSettings(settings)) {
          throw new Error("読み込んだ設定を保存できませんでした。");
        }
        currentConfig = settings;
        renderSettingsUi("設定JSONを読み込み、保存しました。");
      }),
      onReset: safeAction("設定初期化", () => {
        if (!Sanma.SettingsStorage.resetSettings()) {
          throw new Error("設定を初期化できませんでした。");
        }
        currentConfig = Sanma.RuleConfig.createRuleConfig({});
        renderSettingsUi("設定を初期化しました。");
      }),
    });
    const status = settingsTransferRoot.querySelector(".transfer-status");
    if (message && status) status.textContent = message;
  }

  function renderRecords() {
    Sanma.RecordPanel.render(recordsRoot, {
      records: Sanma.GameRecordStorage.loadRecords(),
      stats: Sanma.GameRecordStorage.loadStats(),
      diagnostics: Sanma.GameRecordStorage.getDiagnostics(),
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
      onResetRecords: safeAction("牌譜リセット", () => {
        if (!Sanma.GameRecordStorage.resetRecords()) throw new Error("牌譜をリセットできませんでした。");
        committedRecordIds.clear();
        if (latestState && latestState.gameRecord) committedRecordIds.add(latestState.gameRecord.id);
        renderRecords();
      }),
      onResetStats: safeAction("成績リセット", () => {
        if (!Sanma.GameRecordStorage.resetStats()) throw new Error("成績をリセットできませんでした。");
        renderRecords();
      }),
    });
  }

  function bindUi() {
    requiredElement("newGameButton").addEventListener("click", safeAction(
      "新しい局ボタン",
      () => startNewRound({ seed: currentSeed })
    ));
    requiredElement("settingsButton").addEventListener("click", safeAction("設定画面", () => {
      renderSettingsUi();
      settingsDialog.showModal();
    }));
    requiredElement("saveSettingsButton").addEventListener("click", safeAction("設定保存", () => {
      const settings = Sanma.SettingsPanel.readSettings(settingsRoot, currentConfig);
      if (!Sanma.SettingsStorage.saveSettings(settings)) throw new Error("設定を保存できませんでした。");
      currentConfig = settings;
      startNewRound({ seed: currentSeed });
    }));
    requiredElement("recordsButton").addEventListener("click", safeAction("牌譜・成績画面", () => {
      renderRecords();
      recordsDialog.showModal();
    }));
    requiredElement("debugButton").addEventListener("click", safeAction("デバッグ画面", () => {
      if (latestState) {
        latestState.diagnostics = diagnostics();
        Sanma.RenderTable.renderDebug(debugRoot, latestState);
      }
      seedInput.value = currentSeed;
      debugDialog.showModal();
    }));
    requiredElement("applySeedButton").addEventListener("click", safeAction("固定seed", () => {
      currentSeed = seedInput.value.trim();
      startNewRound({ seed: currentSeed });
    }));
    requiredElement("resetStorageButton").addEventListener("click", safeAction("全保存データリセット", () => {
      if (!Sanma.SettingsStorage.resetAllStorage()) throw new Error("全保存データをリセットできませんでした。");
      committedRecordIds.clear();
      currentConfig = Sanma.RuleConfig.createRuleConfig({});
      startNewRound({ seed: "" });
      messagePanel.textContent = "設定・牌譜・成績をリセットしました。";
    }));
  }

  function initialize() {
    messagePanel = requiredElement("messagePanel");
    tableRoot = requiredElement("tableRoot");
    settingsDialog = requiredElement("settingsDialog");
    settingsRoot = requiredElement("settingsRoot");
    settingsTransferRoot = requiredElement("settingsTransferRoot");
    recordsDialog = requiredElement("recordsDialog");
    recordsRoot = requiredElement("recordsRoot");
    debugDialog = requiredElement("debugDialog");
    debugRoot = requiredElement("debugRoot");
    seedInput = requiredElement("seedInput");
    currentConfig = Sanma.SettingsStorage.loadSettings();
    committedRecordIds = new Set(Sanma.GameRecordStorage.loadRecords().map((record) => record.id));
    bindUi();
    startNewRound({ seed: "" });
  }

  try {
    initialize();
  } catch (error) {
    showError(error, "初期化");
  }
})(window);
