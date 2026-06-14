const fs = require("fs");
const path = require("path");
const { assert, createTileFactory, loadModules, projectRoot } = require("./test-helpers");

const Sanma = loadModules([
  "src/storage/settingsStorage.js",
  "src/storage/gameRecordStorage.js",
  "src/ui/settingsExportImport.js",
  "src/ui/recordPanel.js",
]);
const requiredModules = [
  "Sanma.RuleConfig",
  "Sanma.RoundManager",
  "Sanma.HonbaManager",
  "Sanma.RankingManager",
  "Sanma.EndConditionManager",
  "Sanma.MatchManager",
  "Sanma.Wall",
  "Sanma.GameEngine",
  "Sanma.HandAnalysis",
  "Sanma.DoraCalculator",
  "Sanma.YakuAnalysis",
  "Sanma.ScoreCalculator",
  "Sanma.ActionResolver",
  "Sanma.FuritenManager",
  "Sanma.RiichiRules",
  "Sanma.KanRules",
  "Sanma.EndTurnYakuResolver",
  "Sanma.SanmaRuleDetails",
  "Sanma.CpuStrategy",
  "Sanma.AssistManager",
  "Sanma.GameRecord",
  "Sanma.GameRecordStorage",
  "Sanma.SettingsExportImport",
  "Sanma.RecordPanel",
];

requiredModules.forEach((name) => {
  const moduleName = name.split(".")[1];
  assert(Sanma[moduleName], `${name} is not defined`);
});

const config = Sanma.RuleConfig.createRuleConfig({});
assert(config && config.northMode, "RuleConfig could not create a config");

const wall = new Sanma.Wall(config, "phase6-smoke-wall");
assert(wall.totalKnownTileCount([]) === 108, "Wall did not create 108 sanma tiles");

const engine = new Sanma.GameEngine({ ruleConfig: config, seed: "phase6-smoke-engine", onChange: function noop() {} });
assert(engine.players.length === 3 && engine.humanPlayer.hand.length === 14, "GameEngine did not start a round");

const tile = createTileFactory(Sanma.TileUtil);
const codes = ["1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s", "white", "white", "white", "9m", "9m"];
const tiles = codes.map((code) => tile(code));
const context = {
  winType: "tsumo",
  winnerIndex: 0,
  dealerIndex: 0,
  seatWind: "east",
  roundWind: "east",
  isMenzen: true,
};
const agariResult = Sanma.HandAnalysis.analyzeAgari(tiles, config);
assert(agariResult.isAgari, "HandAnalysis did not recognize a simple winning hand");
const yakuResult = Sanma.YakuAnalysis.analyzeYaku({ tiles, ruleConfig: config, agariResult, context });
assert(yakuResult.hasYaku, "YakuAnalysis did not recognize a simple yaku hand");
const scoreResult = Sanma.ScoreCalculator.calculateScore({ tiles, ruleConfig: config, agariResult, yakuResult, context });
assert(scoreResult.isValidWin, "ScoreCalculator did not score a simple valid win");
assert(Sanma.ActionResolver.findAction(engine, 0, "discard"), "ActionResolver could not resolve an action");

const canonicalIndex = fs.readFileSync(path.resolve(projectRoot, "index.html"), "utf8");
const mainSource = fs.readFileSync(path.resolve(projectRoot, "src", "main.js"), "utf8");
const referencedIds = [...mainSource.matchAll(/(?:requiredElement|document\.getElementById)\("([^"]+)"\)/g)]
  .map((match) => match[1]);
referencedIds.forEach((id) => {
  assert(canonicalIndex.includes(`id="${id}"`), `main.js references missing DOM id: ${id}`);
});

const scriptSources = [...canonicalIndex.matchAll(/<script src="([^"]+)"/g)].map((match) => match[1]);
assert(new Set(scriptSources).size === scriptSources.length, "index.html has duplicate script tags");
const requiredScriptOrder = [
  "src/game/RuleConfig.js",
  "src/game/RoundManager.js",
  "src/game/HonbaManager.js",
  "src/game/RankingManager.js",
  "src/game/EndConditionManager.js",
  "src/game/MatchManager.js",
  "src/game/DoraCalculator.js",
  "src/game/FuritenManager.js",
  "src/game/RiichiRules.js",
  "src/game/KanRules.js",
  "src/game/EndTurnYakuResolver.js",
  "src/game/SanmaRuleDetails.js",
  "src/game/GameRecord.js",
  "src/storage/settingsStorage.js",
  "src/storage/gameRecordStorage.js",
  "src/ui/renderTable.js",
  "src/ui/settingsExportImport.js",
  "src/ui/recordPanel.js",
  "src/main.js",
];
requiredScriptOrder.forEach((source) => {
  assert(scriptSources.includes(source), `index.html is missing ${source}`);
});
requiredScriptOrder.slice(1).forEach((source, index) => {
  assert(
    scriptSources.indexOf(requiredScriptOrder[index]) < scriptSources.indexOf(source),
    `index.html script order is invalid near ${source}`
  );
});

const repositoryRootIndexPath = path.resolve(projectRoot, "..", "..", "index.html");
const isNestedCanonicalApp = path.basename(projectRoot) === "offline-sanma-mahjong-phase1"
  && path.basename(path.dirname(projectRoot)) === "extracted-zips";
if (isNestedCanonicalApp && fs.existsSync(repositoryRootIndexPath)) {
  const repositoryRootIndex = fs.readFileSync(repositoryRootIndexPath, "utf8");
  [
    "src/game/RoundManager.js",
    "src/game/HonbaManager.js",
    "src/game/RankingManager.js",
    "src/game/EndConditionManager.js",
    "src/game/MatchManager.js",
    "src/game/FuritenManager.js",
    "src/game/RiichiRules.js",
    "src/game/KanRules.js",
    "src/game/EndTurnYakuResolver.js",
    "src/game/SanmaRuleDetails.js",
    "src/main.js",
  ].forEach((source) => {
    assert(
      repositoryRootIndex.includes(`extracted-zips/offline-sanma-mahjong-phase1/${source}`),
      `root index.html is missing canonical ${source}`
    );
  });
}

const settingsTransferSource = fs.readFileSync(path.resolve(projectRoot, "src", "ui", "settingsExportImport.js"), "utf8");
const recordPanelSource = fs.readFileSync(path.resolve(projectRoot, "src", "ui", "recordPanel.js"), "utf8");
["settingsJson", "exportSettingsButton", "importSettingsButton", "resetSettingsButton"].forEach((id) => {
  assert(settingsTransferSource.includes(`"${id}"`), `settings UI is missing generated id: ${id}`);
});
["recordsJson", "copyRecordsButton", "resetRecordsButton", "resetStatsButton"].forEach((id) => {
  assert(recordPanelSource.includes(`"${id}"`), `records UI is missing generated id: ${id}`);
});

console.log(JSON.stringify({
  phase: 11,
  testSuite: "smoke",
  requiredModules,
  mustReturnNonZeroOnFailure: true,
}, null, 2));
