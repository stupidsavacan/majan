(function bootstrap(global) {
  const Sanma = global.Sanma;
  const tableRoot = document.getElementById("tableRoot");
  const messagePanel = document.getElementById("messagePanel");
  const settingsDialog = document.getElementById("settingsDialog");
  const settingsRoot = document.getElementById("settingsRoot");
  const debugDialog = document.getElementById("debugDialog");
  const debugRoot = document.getElementById("debugRoot");
  const seedInput = document.getElementById("seedInput");

  let currentConfig = Sanma.SettingsStorage.loadSettings();
  let currentSeed = "";
  let engine = null;
  let latestState = null;

  function render(state) {
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

  document.getElementById("newGameButton").addEventListener("click", () => startNewRound({ seed: currentSeed }));

  document.getElementById("settingsButton").addEventListener("click", () => {
    Sanma.SettingsPanel.renderSettings(settingsRoot, currentConfig);
    settingsDialog.showModal();
  });

  document.getElementById("saveSettingsButton").addEventListener("click", () => {
    currentConfig = Sanma.SettingsPanel.readSettings(settingsRoot, currentConfig);
    Sanma.SettingsStorage.saveSettings(currentConfig);
    startNewRound({ seed: currentSeed });
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
    currentConfig = Sanma.RuleConfig.createRuleConfig({});
    startNewRound({ seed: "" });
  });

  startNewRound({ seed: "" });
})(window);
