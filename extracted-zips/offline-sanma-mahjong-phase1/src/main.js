(function bootstrap(global) {
  "use strict";
  const Sanma = global.Sanma;
  const byId = (id) => document.getElementById(id);
  const tableRoot = byId("tableRoot");
  const messagePanel = byId("messagePanel");
  const settingsDialog = byId("settingsDialog");
  const settingsRoot = byId("settingsRoot");
  const debugDialog = byId("debugDialog");
  const debugRoot = byId("debugRoot");
  const seedInput = byId("seedInput");
  const recordsDialog = byId("recordsDialog");
  const settingsJson = byId("settingsJson");
  let currentConfig = Sanma.SettingsStorage.loadSettings();
  let currentSeed = "";
  let engine = null;
  let latestState = null;
  let currentRecord = null;
  let recordedLogCount = 0;
  let roundSaved = false;

  function showError(error) {
    console.error(error);
    messagePanel.textContent = `エラー: ${error && error.message ? error.message : "不正な状態を検出しました"}。新しい局で復旧できます。`;
  }

  function diagnosticsText() {
    const storage = Sanma.GameRecordStorage.diagnostics();
    const modules = ["GameEngine", "GameRecord", "GameRecordStorage", "RecordPanel", "SettingsExportImport"];
    return `\n\nPhase 9 診断\napp_phase: 9\nmodules_loaded: ${modules.every((name) => Boolean(Sanma[name]))}\nlocal_storage: ${JSON.stringify(storage)}\noffline_font: ${document.fonts ? document.fonts.check('16px "Yuji Mai"') : "判定不可"}\nexternal_network_required: false`;
  }

  function saveEndedRound(state) {
    if (roundSaved || !currentRecord || !["win-ended", "round-ended"].includes(state.phase)) return;
    const round = currentRecord.rounds[0];
    round.result = state.winResult || { type: "exhaustive-draw" };
    currentRecord.finalPoints = state.players.map((player) => ({ name: player.name, points: player.points }));
    Sanma.GameRecordStorage.saveRecord(currentRecord);
    const movement = state.players[0].points - currentConfig.initialPoints;
    Sanma.GameRecordStorage.updateStats({
      won: Boolean(state.winResult && state.winResult.winnerIndex === 0),
      lost: Boolean(state.winResult && state.winResult.winnerIndex !== 0),
      scoreMovement: movement,
      highestHand: state.winResult && state.winResult.score ? { points: Math.abs(movement), label: "和了" } : null,
    });
    roundSaved = true;
  }

  function render(state) {
    try {
      latestState = state;
      const round = currentRecord && currentRecord.rounds[0];
      if (round) (state.logs || []).slice(recordedLogCount).forEach((message) => Sanma.GameRecord.addEvent(round, "event", message));
      recordedLogCount = (state.logs || []).length;
      saveEndedRound(state);
      Sanma.RenderTable.renderTable(tableRoot, state, {
        onDiscard: (id) => engine.discardHumanTile(id), onTsumo: () => engine.claimHumanTsumo(),
        onRiichi: () => engine.declareHumanRiichi(), onKita: () => engine.extractHumanKita(),
        onKan: () => engine.requestHumanKan(), onCall: (id, index) => engine.claimHumanCall(id, index),
        onSkipCall: () => engine.skipHumanCall(),
      });
      Sanma.RenderTable.renderMessages(messagePanel, state);
      Sanma.RenderTable.renderDebug(debugRoot, state);
    } catch (error) { showError(error); }
  }

  function startNewRound(options) {
    try {
      if (options && Object.prototype.hasOwnProperty.call(options, "seed")) currentSeed = options.seed;
      currentRecord = Sanma.GameRecord.create({ seed: currentSeed, ruleConfig: currentConfig, players: ["あなた", "CPU 1", "CPU 2"] });
      Sanma.GameRecord.addRound(currentRecord, { roundLabel: "東1局", honba: 0 });
      recordedLogCount = 0; roundSaved = false;
      engine = new Sanma.GameEngine({ ruleConfig: currentConfig, seed: currentSeed, onChange: render });
    } catch (error) { showError(error); }
  }

  byId("newGameButton").addEventListener("click", () => startNewRound({ seed: currentSeed }));
  byId("settingsButton").addEventListener("click", () => { Sanma.SettingsPanel.renderSettings(settingsRoot, currentConfig); settingsDialog.showModal(); });
  byId("saveSettingsButton").addEventListener("click", () => { currentConfig = Sanma.SettingsPanel.readSettings(settingsRoot, currentConfig); Sanma.SettingsStorage.saveSettings(currentConfig); startNewRound({ seed: currentSeed }); });
  byId("debugButton").addEventListener("click", () => { if (latestState) { Sanma.RenderTable.renderDebug(debugRoot, latestState); debugRoot.textContent += diagnosticsText(); } seedInput.value = currentSeed; debugDialog.showModal(); });
  byId("applySeedButton").addEventListener("click", () => startNewRound({ seed: seedInput.value.trim() }));
  byId("resetStorageButton").addEventListener("click", () => { Sanma.SettingsStorage.resetAllStorage(); currentConfig = Sanma.RuleConfig.createRuleConfig({}); startNewRound({ seed: "" }); messagePanel.textContent = "設定と保存データをリセットしました。"; });
  byId("recordsButton").addEventListener("click", () => { Sanma.RecordPanel.render(byId("recordsRoot")); recordsDialog.showModal(); });
  byId("copyRecordsButton").addEventListener("click", () => { settingsJson.value = JSON.stringify(Sanma.GameRecordStorage.loadRecords(), null, 2); });
  byId("resetRecordsButton").addEventListener("click", () => { Sanma.GameRecordStorage.resetRecords(); Sanma.GameRecordStorage.resetStats(); Sanma.RecordPanel.render(byId("recordsRoot")); });
  byId("exportSettingsButton").addEventListener("click", () => { settingsJson.value = Sanma.SettingsExportImport.exportSettings(currentConfig); });
  byId("importSettingsButton").addEventListener("click", () => { try { currentConfig = Sanma.SettingsExportImport.importSettings(settingsJson.value); Sanma.SettingsStorage.saveSettings(currentConfig); Sanma.SettingsPanel.renderSettings(settingsRoot, currentConfig); } catch (error) { settingsJson.value = `読み込みに失敗しました: ${error.message}`; } });
  byId("resetSettingsButton").addEventListener("click", () => { currentConfig = Sanma.RuleConfig.createRuleConfig({}); Sanma.SettingsStorage.saveSettings(currentConfig); Sanma.SettingsPanel.renderSettings(settingsRoot, currentConfig); settingsJson.value = "設定をリセットしました。"; });
  startNewRound({ seed: "" });
})(window);
