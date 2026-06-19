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
  let failedRecordCommits = new Map();

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
      messagePanel.textContent = `エラー: ${detail}。「新しい対局」または保存データのリセットで復旧できます。`;
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
      "RuleConfig", "TileUtil", "HandAnalysis", "DoraCalculator", "YakuAnalysis", "ScoreCalculator", "Settlement",
      "RoundManager", "HonbaManager", "RankingManager", "EndConditionManager", "MatchManager",
      "RiichiManager", "KanManager", "KitaManager", "FuritenManager", "RiichiRules", "KanRules",
      "EndTurnYakuResolver", "SanmaRuleDetails", "ActionResolver", "CpuStrategy", "CallResolver", "AssistManager",
      "GameRecord", "CallWindow", "Wall", "SeedPolicy", "Player", "GameEngine", "SettingsStorage",
      "GameRecordStorage", "RenderTiles", "RenderTable", "SettingsPanel", "SettingsExportImport", "RecordPanel",
      "DebugEventLog", "GameStateMachine", "TileLedger", "InvariantChecker", "RecoveryManager", "SaveMigration",
      "RecordIndex", "AdvancedStats", "ReplayViewer", "RecordListPanel",
      "DrawContext", "RecordFlow", "RoundLifecycle", "TurnFlow", "WinFlow", "CallFlow", "KanFlow", "RecoveryFlow",
    ];
    const recordDiagnostics = Sanma.GameRecordStorage.getDiagnostics();
    const settingsDiagnostics = Sanma.SettingsStorage.getDiagnostics();
    return {
      app_phase: "16",
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
        size_bytes: recordDiagnostics.records.sizeBytes,
        near_storage_limit: recordDiagnostics.records.nearStorageLimit,
        failed_save_count: failedRecordCommits.size,
        retry_available: failedRecordCommits.size > 0,
      },
      state_machine: latestState ? latestState.gameState : null,
      invariants_ok: latestState && latestState.invariantReport
        ? latestState.invariantReport.ok
        : null,
      storage_migrations: Sanma.SaveMigration.getEvents().slice(0, 10),
      last_error: lastAppError || recordDiagnostics.localStorage.lastError || settingsDiagnostics.lastError,
      offline_font_ready: offlineFontReady(),
      offline: { external_network_required: false },
    };
  }

  function commitCompletedRecord(state) {
    const record = state.gameRecord;
    if (!record || !record.completedAt || committedRecordIds.has(record.id) || failedRecordCommits.has(record.id)) {
      return { saved: false, skipped: true };
    }
    const result = Sanma.GameRecordStorage.commitRecord(record);
    if (!result.saved) {
      failedRecordCommits.set(record.id, Sanma.GameRecord.normalize(record));
      lastAppError = "終了牌譜を保存できませんでした。画面表示は継続します。牌譜削除または保存データリセット後に再試行できます。";
      console.warn(lastAppError);
      return { saved: false, skipped: false };
    }
    failedRecordCommits.delete(record.id);
    committedRecordIds.add(record.id);
    return result;
  }

  function retryFailedRecordCommits(trigger) {
    const pending = Array.from(failedRecordCommits.values());
    if (pending.length === 0) return { saved: false, skipped: true, trigger };
    let savedCount = 0;
    pending.forEach((record) => {
      failedRecordCommits.delete(record.id);
      committedRecordIds.delete(record.id);
      const state = { gameRecord: record };
      const result = commitCompletedRecord(state);
      if (result.saved) savedCount += 1;
    });
    if (savedCount > 0 && failedRecordCommits.size === 0) {
      lastAppError = null;
      if (messagePanel) messagePanel.textContent = "保存失敗牌譜の再保存に成功しました。";
    }
    return {
      saved: savedCount > 0,
      savedCount,
      remaining: failedRecordCommits.size,
      skipped: false,
      trigger,
    };
    const record = latestState && latestState.gameRecord;
    if (!record || !record.completedAt || !failedRecordCommits.has(record.id)) {
      return { saved: false, skipped: true, trigger };
    }
    failedRecordCommits.delete(record.id);
    committedRecordIds.delete(record.id);
    const result = commitCompletedRecord(latestState);
    if (result.saved) {
      lastAppError = null;
      if (messagePanel) messagePanel.textContent = "保存領域の変更後、終了牌譜の保存を再試行して成功しました。";
    }
    return Object.assign({ trigger }, result);
  }

  function discardFailedRecordCommits() {
    failedRecordCommits.clear();
    return { discarded: true, failedSaveCount: 0 };
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
        onKan: safeAction("カン", () => engine.requestHumanKan()),
        onSelectKan: safeAction("カン候補選択", (optionIndex) => engine.selectHumanKan(optionIndex)),
        onCancelKan: safeAction("カン候補取消", () => engine.cancelHumanKanChoice()),
        onCall: safeAction("鳴き", (actionId, optionIndex) => engine.claimHumanCall(actionId, optionIndex)),
        onSkipCall: safeAction("鳴きスキップ", () => engine.skipHumanCall()),
        onNextRound: safeAction("次局へ", () => engine.startNextRound()),
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
        const validation = Sanma.SeedPolicy.validateSeed(options.seed);
        if (!validation.ok) {
          if (messagePanel) messagePanel.textContent = validation.reason;
          return false;
        }
        currentSeed = validation.seed;
      }
      engine = new Sanma.GameEngine({
        ruleConfig: currentConfig,
        seed: currentSeed,
        onChange: render,
      });
      return true;
    } catch (error) {
      showError(error, "新しい対局");
      return false;
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
    const records = Sanma.GameRecordStorage.loadRecords();
    Sanma.RecordPanel.render(recordsRoot, {
      records,
      entries: Sanma.GameRecordStorage.loadIndex(records),
      stats: Sanma.GameRecordStorage.loadStats(),
      advancedStats: Sanma.AdvancedStats.calculate(records),
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
        discardFailedRecordCommits();
        renderRecords();
      }),
      onResetStats: safeAction("成績リセット", () => {
        if (!Sanma.GameRecordStorage.resetStats()) throw new Error("成績をリセットできませんでした。");
        renderRecords();
      }),
      onDelete: safeAction("牌譜削除", (recordId) => {
        if (!Sanma.GameRecordStorage.deleteRecord(recordId)) throw new Error("選択した牌譜を削除できませんでした。");
        failedRecordCommits.delete(recordId);
        renderRecords();
      }),
      onImport: safeAction("牌譜インポート", (text, status) => {
        const activeRecordId = engine && engine.gameRecord ? engine.gameRecord.id : null;
        const result = Sanma.GameRecordStorage.importRecord(text, { activeRecordId });
        if (!result.ok) {
          status.textContent = result.reason;
          return;
        }
        committedRecordIds.add(result.record.id);
        renderRecords();
        const nextStatus = recordsRoot.querySelector(".transfer-status");
        if (nextStatus) nextStatus.textContent = result.reason;
      }),
    });
  }

  function bindUi() {
    requiredElement("newGameButton").addEventListener("click", safeAction(
      "新しい対局ボタン",
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
      startNewRound({ seed: seedInput.value.trim() });
    }));
    requiredElement("resetStorageButton").addEventListener("click", safeAction("全保存データリセット", () => {
      if (!Sanma.SettingsStorage.resetAllStorage()) throw new Error("全保存データをリセットできませんでした。");
      committedRecordIds.clear();
      discardFailedRecordCommits();
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

  function setBindingsForTest(bindings) {
    const input = bindings || {};
    if (Object.prototype.hasOwnProperty.call(input, "tableRoot")) tableRoot = input.tableRoot;
    if (Object.prototype.hasOwnProperty.call(input, "messagePanel")) messagePanel = input.messagePanel;
    if (Object.prototype.hasOwnProperty.call(input, "debugRoot")) debugRoot = input.debugRoot;
    if (Object.prototype.hasOwnProperty.call(input, "currentConfig")) currentConfig = input.currentConfig;
    if (Object.prototype.hasOwnProperty.call(input, "engine")) engine = input.engine;
  }

  Sanma.AppRuntime = {
    commitCompletedRecord,
    retryFailedRecordCommits,
    discardFailedRecordCommits,
    render,
    startNewRound,
    setBindingsForTest,
    getCurrentSeed: () => currentSeed,
    getEngine: () => engine,
    getLastError: () => lastAppError,
    getFailedRecordCommitIds: () => Array.from(failedRecordCommits.keys()),
    getFailedRecordCommits: () => Array.from(failedRecordCommits.values()),
  };

  try {
    initialize();
  } catch (error) {
    showError(error, "初期化");
  }
})(window);
