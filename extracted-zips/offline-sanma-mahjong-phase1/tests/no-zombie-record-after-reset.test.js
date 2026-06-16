const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { assert, createStorage, loadModules } = require("./phase14-2-test-utils");
const { projectRoot } = require("./test-helpers");

global.localStorage = createStorage().storage;
global.document = { fonts: null, getElementById() { return null; } };
const originalError = console.error;
console.error = function ignoreExpectedBootstrapError() {};
const Sanma = loadModules(["src/storage/SaveMigration.js", "src/storage/settingsStorage.js", "src/storage/gameRecordStorage.js"]);
Sanma.RenderTable = { renderTable() {}, renderMessages() {}, renderDebug() {} };
vm.runInThisContext(fs.readFileSync(path.resolve(projectRoot, "src/main.js"), "utf8"), { filename: "src/main.js" });
console.error = originalError;
Sanma.AppRuntime.setBindingsForTest({ tableRoot: {}, messagePanel: {}, debugRoot: {}, currentConfig: Sanma.RuleConfig.createRuleConfig({}) });

function completedRecord(id) {
  const record = Sanma.GameRecord.create({
    seed: id,
    players: [
      { id: 0, name: "Human", seatWind: "east", isHuman: true, points: 35000 },
      { id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: 35000 },
      { id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: 35000 },
    ],
  });
  record.id = id;
  record.completedAt = new Date().toISOString();
  return record;
}

Sanma.GameRecordStorage.commitRecord = () => ({ saved: false });
Sanma.AppRuntime.render({ gameRecord: completedRecord("phase15-zombie") });
assert(Sanma.AppRuntime.getFailedRecordCommitIds().length === 1, "保存失敗牌譜が準備できません");
Sanma.GameRecordStorage.resetRecords();
Sanma.AppRuntime.discardFailedRecordCommits();
assert(Sanma.AppRuntime.getFailedRecordCommitIds().length === 0, "牌譜リセット後にfailed_save_countが0になりません");
Sanma.GameRecordStorage.commitRecord = (record) => {
  Sanma.GameRecordStorage.saveRecord(record);
  return { saved: true };
};
assert(!Sanma.AppRuntime.retryFailedRecordCommits("after-reset").saved, "リセット後に保存失敗牌譜がゾンビ再保存されました");
assert(Sanma.GameRecordStorage.loadRecords().length === 0, "リセット後に牌譜一覧が空のままになりません");

console.log("Phase 15 no zombie record after reset tests passed.");
