const { assert, createStorage, loadModules } = require("./phase14-2-test-utils");

const storage = createStorage();
global.localStorage = storage.storage;
const Sanma = loadModules([
  "src/storage/SaveMigration.js",
  "src/storage/gameRecordStorage.js",
  "src/ui/recordPanel.js",
]);

const players = [
  { id: 0, name: "あなた", seatWind: "east", isHuman: true, points: 35000 },
  { id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: 35000 },
  { id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: 35000 },
];
const validRecord = Sanma.GameRecord.create({ players, seed: "record-import-valid" });
validRecord.rounds[0].result = {
  winnerIndex: 0,
  winType: "ron",
  yaku: ["立直"],
  yakuman: [],
  score: { isValidWin: true, isYakuman: false, han: 1, fu: 30, limitName: "" },
  changes: [],
};
const validText = Sanma.GameRecord.serialize(validRecord);
assert(Sanma.GameRecordStorage.importRecord(validText).ok, "正規エクスポート牌譜をインポートできません");
const savedBefore = Sanma.GameRecordStorage.loadRecords().length;

let parseCalls = 0;
const originalParse = JSON.parse;
JSON.parse = function trackedParse(text) {
  parseCalls += 1;
  return originalParse(text);
};
const hugeResult = Sanma.GameRecordStorage.importRecord(" ".repeat(Sanma.GameRecord.MAX_IMPORT_CHARS + 1));
JSON.parse = originalParse;
assert(!hugeResult.ok && parseCalls === 0, "巨大牌譜をJSON.parse前に拒否できません");

function invalidRecord(mutator) {
  const value = originalParse(validText);
  value.id = `invalid-${Math.random()}`;
  mutator(value);
  const result = Sanma.GameRecordStorage.importRecord(JSON.stringify(value));
  assert(!result.ok, "不正牌譜を受理しました");
  assert(Sanma.GameRecordStorage.loadRecords().length === savedBefore, "不正牌譜を保存しました");
}

invalidRecord((record) => record.players.push({ id: 3 }));
invalidRecord((record) => record.rounds = Array.from({ length: Sanma.GameRecord.MAX_ROUNDS + 1 }, () => ({ events: [] })));
invalidRecord((record) => record.rounds[0].events = Array.from({ length: Sanma.GameRecord.MAX_EVENTS_PER_ROUND + 1 }, () => ({})));
invalidRecord((record) => record.rounds[0].roundLabel = "x".repeat(Sanma.GameRecord.MAX_STRING_LENGTH + 1));
invalidRecord((record) => record.rounds[0].result.yaku = {});
invalidRecord((record) => record.rounds[0].result.yakuman = {});
invalidRecord((record) => record.rounds[0].result.score = "broken");

const malformed = originalParse(validText);
malformed.rounds[0].result.yaku = {};
malformed.rounds[0].result.yakuman = {};
malformed.rounds[0].result.score = null;
const stats = Sanma.AdvancedStats.calculate([malformed]);
assert(stats && stats.hand.wins === 0 && stats.hand.losses === 0, "malformed null-score record was counted as a win/loss");
/*
assert(stats && stats.hand.wins === 1, "不正な役配列またはnull scoreで成績計算が停止しました");
*/
function node() {
  return {
    children: [],
    innerHTML: "",
    append(...items) { this.children.push(...items); },
    appendChild(item) { this.children.push(item); return item; },
  };
}
global.document = { createElement: node };
const statsRoot = node();
Sanma.RecordPanel.renderAdvancedStats(statsRoot, stats);
assert(statsRoot.children.length > 0, "不正牌譜入力後に成績UIを描画できません");
const replay = Sanma.ReplayViewer.create(malformed);
Sanma.ReplayViewer.jumpToEnd(replay);
assert(replay.view && Array.isArray(replay.view.hands), "不正scoreを含む牌譜で再生が停止しました");

console.log("Phase 14.2 record import hardening tests passed.");
