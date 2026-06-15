const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { assert, createStorage, loadModules } = require("./phase14-2-test-utils");
const { projectRoot } = require("./test-helpers");

const storage = createStorage();
global.localStorage = storage.storage;
global.document = {
  fonts: null,
  getElementById() { return null; },
};
const originalError = console.error;
console.error = function expectedInitializationError() {};
const Sanma = loadModules([
  "src/storage/SaveMigration.js",
  "src/storage/settingsStorage.js",
  "src/storage/gameRecordStorage.js",
]);
let tableRenderCount = 0;
Sanma.RenderTable = {
  renderTable() { tableRenderCount += 1; },
  renderMessages() {},
  renderDebug() {},
};
vm.runInThisContext(fs.readFileSync(path.resolve(projectRoot, "src/main.js"), "utf8"), { filename: "src/main.js" });
console.error = originalError;

const record = Sanma.GameRecord.create({
  players: [
    { id: 0, name: "あなた", seatWind: "east", isHuman: true, points: 35000 },
    { id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: 35000 },
    { id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: 35000 },
  ],
});
record.completedAt = new Date().toISOString();
const state = { gameRecord: record };
let commitCalls = 0;
Sanma.GameRecordStorage.commitRecord = () => {
  commitCalls += 1;
  return { saved: false };
};
Sanma.AppRuntime.setBindingsForTest({
  tableRoot: {},
  messagePanel: {},
  debugRoot: {},
  currentConfig: Sanma.RuleConfig.createRuleConfig({}),
});
const originalWarn = console.warn;
const warnings = [];
console.warn = (message) => warnings.push(String(message));
Sanma.AppRuntime.render(state);
Sanma.AppRuntime.render(state);
console.warn = originalWarn;

assert(tableRenderCount === 2, "牌譜保存失敗後にテーブル描画が継続しません");
assert(commitCalls === 1, "同じ保存失敗を描画ごとに無限再試行しました");
assert(warnings.some((message) => message.includes("保存")), "牌譜保存失敗の警告がありません");
assert(Sanma.AppRuntime.getLastError().includes("保存"), "牌譜保存失敗が診断情報へ反映されません");

console.log("Phase 14.2 storage render failure tests passed.");
