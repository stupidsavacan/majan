const { assert, createStorage, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules(["src/storage/SaveMigration.js", "src/storage/gameRecordStorage.js"]);
global.localStorage = createStorage().storage;

const players = [
  { id: 0, name: "Human", seatWind: "east", isHuman: true, points: 35000 },
  { id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: 35000 },
  { id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: 35000 },
];
const record = Sanma.GameRecord.create({ seed: "phase15-pruning", players });
Sanma.GameRecord.addEvent(record, "deal", { marker: "initial" });
for (let index = 0; index < Sanma.GameRecord.MAX_EVENTS_PER_ROUND + 20; index += 1) {
  Sanma.GameRecord.addEvent(record, "discard", { index });
}
Sanma.GameRecord.addEvent(record, "win", { playerIndex: 0 });
Sanma.GameRecord.addEvent(record, "score_settlement", { changes: [] });

const events = record.rounds[0].events;
assert(events.length <= Sanma.GameRecord.MAX_EVENTS_PER_ROUND, "剪定後のイベント数が上限を超えています");
assert(events.some((event) => event.type === "deal"), "長い牌譜の剪定でdealイベントが消えました");
assert(events.some((event) => event.type === "win"), "長い牌譜の剪定でwinイベントが消えました");
assert(events.some((event) => event.type === "score_settlement"), "長い牌譜の剪定でscore_settlementイベントが消えました");

Sanma.GameRecord.finishRound(record, { type: "exhaustive_draw" }, [35000, 35000, 35000]);
assert(Sanma.GameRecordStorage.saveRecord(record), "剪定済み牌譜を保存できません");
const loaded = Sanma.GameRecordStorage.loadRecord(record.id);
assert(loaded.rounds[0].events.some((event) => event.type === "deal"), "保存/再読込後にdealイベントが消えました");

const oldRecord = JSON.parse(JSON.stringify(record));
delete oldRecord.phaseLabel;
const normalized = Sanma.GameRecord.normalize(oldRecord);
assert(normalized.phaseLabel, "古い形式の牌譜にphaseLabel互換値が入りません");

console.log("Phase 15 game record event pruning tests passed.");
