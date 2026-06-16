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

const savedIds = [];
let saveEnabled = false;
Sanma.GameRecordStorage.commitRecord = (record) => {
  if (saveEnabled) savedIds.push(record.id);
  return { saved: saveEnabled };
};

const failed = completedRecord("phase15-failed-body");
Sanma.AppRuntime.render({ gameRecord: failed });
assert(Sanma.AppRuntime.getFailedRecordCommitIds().includes(failed.id), "保存失敗牌譜IDが失敗Mapに入りません");
assert(Sanma.AppRuntime.getFailedRecordCommits()[0].seed === failed.seed, "保存失敗牌譜本体が保持されていません");

const newer = completedRecord("phase15-newer-record");
saveEnabled = true;
Sanma.AppRuntime.render({ gameRecord: newer });
assert(savedIds.includes(newer.id), "新しい対局の保存が失敗Mapで妨げられました");

const retry = Sanma.AppRuntime.retryFailedRecordCommits("explicit-retry");
assert(retry.saved, "明示的な保存失敗牌譜の再試行が成功しません");
assert(savedIds.includes(failed.id), "新対局開始後に古い保存失敗牌譜本体を再保存できません");
assert(!Sanma.AppRuntime.getFailedRecordCommitIds().includes(failed.id), "保存成功後に失敗Mapから削除されません");

console.log("Phase 15 failed record retry retains record body tests passed.");
