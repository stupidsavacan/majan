const { assert, createStorage, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules([
  "src/storage/SaveMigration.js",
  "src/storage/settingsStorage.js",
]);
const memory = createStorage();
global.localStorage = memory.storage;
const originalBackupRaw = Sanma.SaveMigration.backupRaw;

memory.storage.setItem(Sanma.SettingsStorage.STORAGE_KEY, JSON.stringify({
  version: 2,
  settings: { advancedRules: { furiten: { genbutsu: false } } },
}));
Sanma.SaveMigration.backupRaw = () => {
  throw new Error("storage full during backup");
};

let recovered;
let escaped = null;
try {
  recovered = Sanma.SettingsStorage.loadSettings();
} catch (error) {
  escaped = error;
}
assert(!escaped, `設定復旧で未捕捉例外が発生しました: ${escaped && escaped.message}`);
assert(recovered.advancedRules.furiten.genbutsu === true, "退避失敗後に既定設定を返しません");
const stored = JSON.parse(memory.storage.getItem(Sanma.SettingsStorage.STORAGE_KEY));
assert(stored.settings && stored.settings.northMode === Sanma.RuleConfig.defaultRuleConfig.northMode, "退避失敗後に公開既定設定を書き戻しません");
assert(Sanma.SettingsStorage.getDiagnostics().lastError.includes("退避失敗"), "退避失敗を診断へ記録しません");

Sanma.SaveMigration.backupRaw = originalBackupRaw;
memory.storage.setItem(Sanma.SettingsStorage.STORAGE_KEY, JSON.stringify({
  version: 2,
  settings: { northMode: "normal-tile", allowChi: false },
}));
const valid = Sanma.SettingsStorage.loadSettings();
assert(valid.northMode === "normal-tile" && valid.allowChi === false, "正しい保存設定を読み込めません");

console.log("Phase 14.2C settings recovery backup failure tests passed.");
