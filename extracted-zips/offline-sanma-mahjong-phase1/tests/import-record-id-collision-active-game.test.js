const { assert, createStorage, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules(["src/storage/SaveMigration.js", "src/storage/gameRecordStorage.js"]);
global.localStorage = createStorage().storage;

function record(id) {
  const item = Sanma.GameRecord.create({
    seed: id,
    players: [
      { id: 0, name: "Human", seatWind: "east", isHuman: true, points: 35000 },
      { id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: 35000 },
      { id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: 35000 },
    ],
  });
  item.id = id;
  return item;
}

const active = record("active-game-record");
const imported = record(active.id);
const collision = Sanma.GameRecordStorage.importRecord(JSON.stringify(imported), { activeRecordId: active.id });
assert(collision.ok, "現在対局IDと衝突する牌譜を安全にインポートできません");
assert(collision.record.id !== active.id, "衝突インポート牌譜が再採番されません");
assert(collision.record.sourceRecordId === active.id, "衝突インポート牌譜のsourceRecordIdが保持されません");

active.completedAt = new Date().toISOString();
assert(Sanma.GameRecordStorage.commitRecord(active).saved, "衝突インポート後に現在対局保存がスキップされました");
const ids = Sanma.GameRecordStorage.loadRecords().map((item) => item.id);
assert(ids.includes(active.id) && ids.includes(collision.record.id), "衝突後のRecordIndex対象牌譜が揃いません");
assert(Sanma.GameRecordStorage.loadIndex().length === 2, "衝突後のRecordIndexが整合しません");

const normal = Sanma.GameRecordStorage.importRecord(JSON.stringify(record("normal-import-record")));
assert(normal.ok && normal.record.id === "normal-import-record", "通常インポートのIDが不要に変わりました");

console.log("Phase 15 import record ID collision tests passed.");
