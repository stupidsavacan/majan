const { assert, createStorage, loadModules } = require("./phase14-2-test-utils");

const storage = createStorage();
global.localStorage = storage.storage;
const Sanma = loadModules(["src/storage/SaveMigration.js", "src/storage/settingsStorage.js"]);

function loadStored(settings) {
  storage.data[Sanma.SettingsStorage.STORAGE_KEY] = JSON.stringify({ version: 2, settings });
  return Sanma.SettingsStorage.loadSettings();
}

const malicious = [
  { allowChi: false, advancedRules: { kan: { chankan: false } } },
  { allowChi: false, riichiStickValue: -1000 },
  { allowChi: false, dramaticDrawAssistRate: 1, maxAssistDrawsPerRoundForHuman: 999 },
  { allowChi: false, northMode: "invalid" },
];
malicious.forEach((settings) => {
  const config = loadStored(settings);
  assert(config.allowChi === false, "不正設定を含むlocalStorageを部分受理しました");
  assert(config.riichiStickValue === 1000, "localStorageがriichiStickValueを変更しました");
  assert(config.dramaticDrawAssistRate === Sanma.RuleConfig.defaultRuleConfig.dramaticDrawAssistRate, "localStorageがassist率を変更しました");
  assert(config.maxAssistDrawsPerRoundForHuman === Sanma.RuleConfig.defaultRuleConfig.maxAssistDrawsPerRoundForHuman, "localStorageがassist上限を変更しました");
  assert(config.advancedRules.kan.chankan === true, "localStorageがadvancedRulesを変更しました");
});
assert(Sanma.SettingsStorage.getDiagnostics().corruptedRecovered, "不正localStorage設定の拒否を診断へ記録しません");
assert(Sanma.SettingsStorage.getDiagnostics().lastError, "不正localStorage設定のエラーが診断にありません");
assert(Object.keys(storage.data).some((key) => key.startsWith(Sanma.SaveMigration.BACKUP_PREFIX)), "不正localStorage設定を退避しません");

const valid = loadStored({
  matchLength: "tonpuu",
  northMode: "normal-tile",
  allowChi: false,
  tsumoLoss: true,
  highScoreMode: false,
  uraDora: true,
  kanDora: true,
  kanUraDora: true,
  redDoraMode: "standard",
  kuitan: true,
  atozuke: true,
});
assert(valid.matchLength === "tonpuu" && valid.allowChi === false && valid.northMode === "normal-tile", "正しい公開設定をlocalStorageから読み込めません");

console.log("Phase 14.2 follow-up settings storage hardening tests passed.");
