const { assert, createTileFactory, loadModules } = require("./test-helpers");

const Sanma = loadModules([
  "src/storage/settingsStorage.js",
  "src/storage/gameRecordStorage.js",
  "src/ui/settingsExportImport.js",
  "src/ui/recordPanel.js",
]);
const requiredModules = [
  "Sanma.RuleConfig",
  "Sanma.Wall",
  "Sanma.GameEngine",
  "Sanma.HandAnalysis",
  "Sanma.YakuAnalysis",
  "Sanma.ScoreCalculator",
  "Sanma.ActionResolver",
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

console.log(JSON.stringify({
  phase: 8,
  testSuite: "smoke",
  requiredModules,
  mustReturnNonZeroOnFailure: true,
}, null, 2));
