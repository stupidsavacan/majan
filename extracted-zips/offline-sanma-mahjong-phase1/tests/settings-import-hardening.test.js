const { assert, createEngine, createStorage, loadModules } = require("./phase14-2-test-utils");

const storage = createStorage();
global.localStorage = storage.storage;
const Sanma = loadModules([
  "src/storage/SaveMigration.js",
  "src/storage/settingsStorage.js",
  "src/ui/settingsExportImport.js",
]);

let activeConfig = Sanma.RuleConfig.createRuleConfig({ allowChi: true });
function attempt(value) {
  const before = activeConfig;
  const result = Sanma.SettingsExportImport.importSettings(JSON.stringify(value));
  if (result.ok) activeConfig = result.settings;
  else assert(activeConfig === before, "拒否した設定インポートが有効設定を変更しました");
  return result;
}

[
  { dramaticOpeningHandRate: 1 },
  { riichiStickValue: -1000 },
  { advancedRules: {} },
  { northMode: "invalid" },
  { redDoraMode: "invalid" },
  { startingPoints: -1 },
  { startingPoints: 100001 },
  { allowChi: "true" },
  { allowChi: false, advancedRules: {} },
  { settings: { allowChi: false }, advancedRules: {} },
].forEach((candidate) => {
  assert(!attempt(candidate).ok, `不正な設定を受理しました: ${JSON.stringify(candidate)}`);
});

const valid = attempt({
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
  startingPoints: 35000,
});
assert(valid.ok && activeConfig.allowChi === false && activeConfig.startingPoints === 35000, "公開UI設定をインポートできません");
assert(activeConfig.riichiStickValue === 1000, "拒否したriichiStickValueが有効設定へ混入しました");
const riichiEngine = createEngine(Sanma, "settings-riichi-value", activeConfig);
riichiEngine.humanPlayer.hand = [
  "1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s", "z1", "z1", "z1", "9m", "1m",
].map((code, index) => {
  const honor = code[0] === "z";
  return Sanma.TileUtil.createTile(honor ? "z" : code[1], Number(honor ? code[1] : code[0]), 5000 + index, false);
});
riichiEngine.humanPlayer.lastDraw = riichiEngine.humanPlayer.hand[riichiEngine.humanPlayer.hand.length - 1];
const pointsBeforeRiichi = riichiEngine.humanPlayer.points;
const riichi = Sanma.RiichiRules.declare(riichiEngine, riichiEngine.humanPlayer.id);
assert(riichi.applied && riichi.discardOptions.length > 0, "リーチ宣言待ちを開始できません");
const declarationDiscard = riichiEngine.humanPlayer.discardTileByInstanceId(riichi.discardOptions[0].instanceId);
const finalizedRiichi = Sanma.RiichiRules.handleDiscard(riichiEngine, riichiEngine.humanPlayer.id, declarationDiscard);
assert(
  finalizedRiichi.finalized && riichiEngine.humanPlayer.points === pointsBeforeRiichi - 1000,
  "拒否設定によりリーチで点数が増加しました"
);

const exported = Sanma.SettingsExportImport.exportSettings(activeConfig);
assert(Sanma.SettingsExportImport.importSettings(exported).ok, "公開設定のエクスポートを再インポートできません");
assert(!exported.includes("advancedRules") && !exported.includes("dramaticOpeningHandRate"), "設定エクスポートへ内部設定が混入しました");

const seed128 = "s".repeat(128);
const seed129 = "s".repeat(129);
const acceptedEngine = createEngine(Sanma, seed128, activeConfig);
assert(acceptedEngine.seed === seed128 && acceptedEngine.gameRecord.seed.length === 128, "128文字seedを受理できません");
let rejected = false;
try {
  createEngine(Sanma, seed129, activeConfig);
} catch (error) {
  rejected = error.message.includes("128");
}
assert(rejected, "129文字seedで新しい対局を開始しました");
assert(acceptedEngine.seed === seed128 && acceptedEngine.gameRecord.seed.length <= 128, "拒否seedが既存対局または牌譜へ入りました");
let wallRejected = false;
try {
  new Sanma.Wall(activeConfig, { seed: seed129 });
} catch (error) {
  wallRejected = error.message.includes("128");
}
assert(wallRejected, "長すぎるseedがWall.hashSeedへ渡りました");
assert(Sanma.SeedPolicy.deriveSeed(seed128, "cpu").length <= 128, "派生CPU seedが上限を超えました");

console.log("Phase 14.2 settings and seed hardening tests passed.");
