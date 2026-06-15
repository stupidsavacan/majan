const { assert, createStorage, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules([
  "src/storage/SaveMigration.js",
  "src/storage/gameRecordStorage.js",
]);
const memory = createStorage();
global.localStorage = memory.storage;

function validRecord(id) {
  return Sanma.GameRecord.create({
    matchId: "match-record-id",
    seed: "record-id-validation",
    ruleConfig: Sanma.RuleConfig.createRuleConfig({}),
    players: [
      { id: 0, name: "あなた", seatWind: "east", isHuman: true, points: 35000 },
      { id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: 35000 },
      { id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: 35000 },
    ],
  });
}

function rejected(record, label) {
  const result = Sanma.GameRecordStorage.importRecord(JSON.stringify(record));
  assert(!result.ok, label);
}

const objectId = validRecord();
objectId.id = {};
rejected(objectId, "object型record.idを受理しました");

const emptyId = validRecord();
emptyId.id = "";
rejected(emptyId, "空文字record.idを受理しました");

const duplicatePlayers = validRecord();
duplicatePlayers.players[2].id = 1;
rejected(duplicatePlayers, "重複player.idを受理しました");

const missingPlayer = validRecord();
delete missingPlayer.players[2].id;
rejected(missingPlayer, "欠落player.idを受理しました");

const valid = validRecord();
assert(Sanma.GameRecordStorage.importRecord(JSON.stringify(valid)).ok, "正しい牌譜をインポートできません");
assert(Sanma.GameRecordStorage.deleteRecord(valid.id), "正しい文字列IDのインポート牌譜を削除できません");
assert(!Sanma.GameRecordStorage.loadRecord(valid.id), "削除した牌譜が残っています");

const invalidSaved = validRecord();
invalidSaved.id = {};
memory.storage.setItem(Sanma.GameRecordStorage.RECORDS_KEY, JSON.stringify({
  version: 2,
  records: [invalidSaved],
}));
const loaded = Sanma.GameRecordStorage.loadRecords();
const index = Sanma.GameRecordStorage.loadIndex(loaded);
assert(loaded.length === 0, "object型IDの保存牌譜を読み込みました");
assert(index.length === 0, "object型IDの保存牌譜をRecordIndexへ含めました");
assert(Sanma.GameRecordStorage.getDiagnostics().localStorage.corruptedRecovered, "不正保存牌譜の除外を診断へ記録しません");

console.log("Phase 14.2C record ID validation tests passed.");
