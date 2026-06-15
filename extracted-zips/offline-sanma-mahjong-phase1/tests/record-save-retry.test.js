const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { assert, createStorage, loadModules } = require("./phase14-2-test-utils");
const { projectRoot } = require("./test-helpers");

const storage = createStorage();
global.localStorage = storage.storage;
global.document = { fonts: null, getElementById() { return null; } };
const originalError = console.error;
console.error = function expectedInitializationError() {};
const Sanma = loadModules(["src/storage/SaveMigration.js", "src/storage/settingsStorage.js", "src/storage/gameRecordStorage.js"]);
let renderCount = 0;
Sanma.RenderTable = { renderTable() { renderCount += 1; }, renderMessages() {}, renderDebug() {} };
vm.runInThisContext(fs.readFileSync(path.resolve(projectRoot, "src/main.js"), "utf8"), { filename: "src/main.js" });
console.error = originalError;
Sanma.AppRuntime.setBindingsForTest({
  tableRoot: {},
  messagePanel: {},
  debugRoot: {},
  currentConfig: Sanma.RuleConfig.createRuleConfig({}),
});

function completedRecord(seed) {
  const record = Sanma.GameRecord.create({
    seed,
    players: [
      { id: 0, name: "あなた", seatWind: "east", isHuman: true, points: 35000 },
      { id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: 35000 },
      { id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: 35000 },
    ],
  });
  record.completedAt = new Date().toISOString();
  return record;
}

let shouldSave = false;
let commitCalls = 0;
Sanma.GameRecordStorage.commitRecord = () => {
  commitCalls += 1;
  return { saved: shouldSave };
};
const warnings = [];
const originalWarn = console.warn;
console.warn = (message) => warnings.push(String(message));

const deleteRetryState = { gameRecord: completedRecord("record-delete-retry") };
Sanma.AppRuntime.render(deleteRetryState);
Sanma.AppRuntime.render(deleteRetryState);
assert(renderCount === 2 && commitCalls === 1, "保存失敗後に描画停止または毎描画再試行が発生しました");
assert(deleteRetryState.diagnostics.records.retry_available, "保存失敗の再試行可能状態を診断へ表示しません");
assert(warnings.some((message) => message.includes("再試行")), "保存失敗警告が再試行可能であることを示しません");
shouldSave = true;
assert(Sanma.AppRuntime.retryFailedRecordCommits("record-delete").saved, "牌譜削除後の保存再試行に成功しません");
assert(Sanma.AppRuntime.getFailedRecordCommitIds().length === 0, "成功した再試行後も失敗状態が残りました");

shouldSave = false;
const resetRetryState = { gameRecord: completedRecord("record-reset-retry") };
Sanma.AppRuntime.render(resetRetryState);
assert(Sanma.AppRuntime.getFailedRecordCommitIds().length === 1, "保存リセット再試行テストの失敗状態がありません");
shouldSave = true;
assert(Sanma.AppRuntime.retryFailedRecordCommits("storage-reset").saved, "保存データリセット後の保存再試行に成功しません");
console.warn = originalWarn;

console.log("Phase 14.2 follow-up completed record retry tests passed.");
