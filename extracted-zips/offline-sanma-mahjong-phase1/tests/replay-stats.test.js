const { assert, loadModules } = require("./test-helpers");

const storageData = {};
global.localStorage = {
  getItem(key) { return Object.prototype.hasOwnProperty.call(storageData, key) ? storageData[key] : null; },
  setItem(key, value) { storageData[key] = String(value); },
  removeItem(key) { delete storageData[key]; },
};

const Sanma = loadModules([
  "src/storage/SaveMigration.js",
  "src/storage/gameRecordStorage.js",
]);

const players = [
  { id: 0, name: "あなた", seatWind: "east", isHuman: true, points: 35000 },
  { id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: 35000 },
  { id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: 35000 },
];

function createRecord(id, createdAt, result, finalPoints, rank) {
  const record = Sanma.GameRecord.create({
    players,
    ruleConfig: {
      matchLength: "tonpuu",
      highScoreMode: true,
      allowChi: false,
      tsumoLoss: true,
    },
    roundLabel: "東1局",
    dealerIndex: 0,
    startingPoints: [35000, 35000, 35000],
  });
  record.id = id;
  record.createdAt = createdAt;
  Sanma.GameRecord.addEvent(record, "deal", {
    hands: [
      { playerIndex: 0, tiles: ["1p", "2p"] },
      { playerIndex: 1, tiles: ["3p"] },
      { playerIndex: 2, tiles: ["4p"] },
    ],
  });
  Sanma.GameRecord.addEvent(record, "draw", { playerIndex: 0, tile: "5p" });
  Sanma.GameRecord.addEvent(record, "discard", { playerIndex: 0, tile: "1p" });
  record.rounds[0].result = result;
  record.finalPoints = finalPoints || [];
  record.finalRankings = Number.isInteger(rank) ? [{ playerIndex: 0, rank }] : [];
  record.completedAt = createdAt;
  return record;
}

const winRecord = createRecord(
  "record-win",
  "2026-06-15T10:00:00.000Z",
  {
    type: "win",
    winnerIndex: 0,
    winType: "tsumo",
    yaku: ["門前清自摸和", "立直"],
    yakuman: [],
    score: { isValidWin: true, isYakuman: false, han: 5, fu: 30, limitName: "満貫" },
    changes: [
      { playerIndex: 0, delta: 8000, after: 43000 },
      { playerIndex: 1, delta: -4000, after: 31000 },
      { playerIndex: 2, delta: -4000, after: 31000 },
    ],
  },
  [43000, 31000, 31000],
  1
);
const lossRecord = createRecord(
  "record-loss",
  "2026-06-14T10:00:00.000Z",
  {
    type: "win",
    winnerIndex: 1,
    winType: "ron",
    yaku: ["役牌"],
    yakuman: [],
    score: { isValidWin: true, isYakuman: false, han: 2, fu: 40, limitName: "" },
    changes: [
      { playerIndex: 0, delta: -3900, after: 31100 },
      { playerIndex: 1, delta: 3900, after: 38900 },
    ],
  },
  [31100, 38900, 35000],
  2
);

const index = Sanma.RecordIndex.build([lossRecord, winRecord]);
assert(index.length === 2 && index[0].id === "record-win", "牌譜インデックスを新しい順に構築できません");
assert(index[0].tags.includes("和了") && index[0].tags.includes("高打点"), "牌譜インデックスのタグが不足しています");
assert(index[0].sizeBytes > 0 && index[0].schemaVersion === 2, "牌譜インデックスへサイズ・スキーマを記録できません");

const replay = Sanma.ReplayViewer.create(winRecord);
assert(replay.eventIndex === 0 && replay.view.hands[0].length === 0, "牌譜再生の開始状態が不正です");
Sanma.ReplayViewer.stepForward(replay);
assert(replay.eventIndex === 1 && replay.view.hands[0].join(",") === "1p,2p", "配牌イベントを再生できません");
Sanma.ReplayViewer.stepForward(replay);
assert(replay.view.hands[0].includes("5p"), "ツモイベントを再生できません");
Sanma.ReplayViewer.stepBack(replay);
assert(!replay.view.hands[0].includes("5p"), "牌譜を一手戻せません");

const partialRecord = Sanma.GameRecord.create({ players });
partialRecord.id = "record-partial";
Sanma.GameRecord.addEvent(partialRecord, "draw", { playerIndex: 0, tile: "9s" });
partialRecord.rounds[0].events.push(null, { type: "draw", data: { playerIndex: 99, tile: "1p" } });
const partialReplay = Sanma.ReplayViewer.create(partialRecord);
Sanma.ReplayViewer.jumpToEnd(partialReplay);
assert(partialReplay.partial && partialReplay.view.hands[0][0] === "9s", "古い不完全牌譜を安全に部分再生できません");

const riichiRecord = Sanma.GameRecord.create({
  players,
  startingPoints: [35000, 35000, 35000],
});
riichiRecord.id = "record-riichi-replay";
Sanma.GameRecord.addEvent(riichiRecord, "deal", {
  hands: [
    { playerIndex: 0, tiles: ["1p", "2p", "3p"] },
    { playerIndex: 1, tiles: [] },
    { playerIndex: 2, tiles: [] },
  ],
});
Sanma.GameRecord.addEvent(riichiRecord, "riichi", {
  playerIndex: 0,
  playerName: players[0].name,
  declarationDiscard: "3p",
  changes: [{ playerIndex: 0, delta: -1000, after: 34000 }],
});
const riichiReplay = Sanma.ReplayViewer.create(riichiRecord);
Sanma.ReplayViewer.stepForward(riichiReplay);
Sanma.ReplayViewer.stepForward(riichiReplay);
assert(riichiReplay.view.points[0] === 34000, "リーチイベントの供託支払いをReplayに反映できません");
Sanma.ReplayViewer.jumpToEnd(riichiReplay);
assert(riichiReplay.view.points[0] === 34000, "リーチ供託支払いをReplayで二重適用しています");

assert(!Sanma.GameRecordStorage.importRecord("{invalid-json").ok, "不正な牌譜インポートを受理しました");
assert(
  !Sanma.GameRecordStorage.importRecord(JSON.stringify({ id: "invalid-record", rounds: [] })).ok,
  "JSONとして読める不正な牌譜形式を受理しました"
);

const stats = Sanma.AdvancedStats.calculate([winRecord, lossRecord]);
assert(stats.match.gamesPlayed === 2 && stats.match.firstPlaceCount === 1, "対局数・1位回数を集計できません");
assert(stats.match.averageRank === 1.5 && stats.match.bestFinalPoints === 43000, "平均順位・最高最終点を集計できません");
assert(stats.hand.wins === 1 && stats.hand.losses === 1 && stats.hand.dealInCount === 1, "和了・敗北・放銃を集計できません");
assert(stats.hand.tsumoWinCount === 1 && stats.hand.highestScore === 8000, "ツモ和了・最高得点を集計できません");
assert(
  stats.yaku.frequency["立直"] === 1
    && stats.yaku.frequency["門前清自摸和"] === 1
    && stats.yaku.mostCommonYaku,
  "役頻度を集計できません"
);

const missingRecord = Sanma.GameRecord.create({ players: [] });
missingRecord.id = "record-missing";
const missingStats = Sanma.AdvancedStats.calculate([missingRecord]);
assert(missingStats.match.averageRank === null && missingStats.hand.highestScore === null, "不足データから架空の成績を生成しました");
assert(Sanma.AdvancedStats.display(missingStats.hand.highestScore) === "集計不可", "不足データを集計不可と表示できません");

Sanma.GameRecordStorage.resetRecords();
assert(Sanma.GameRecordStorage.saveRecord(winRecord), "削除テスト用牌譜を保存できません");
assert(Sanma.GameRecordStorage.saveRecord(lossRecord), "削除テスト用牌譜を保存できません");
assert(Sanma.GameRecordStorage.deleteRecord(winRecord.id), "選択牌譜を削除できません");
assert(
  Sanma.GameRecordStorage.loadRecords().length === 1
    && Sanma.GameRecordStorage.loadRecords()[0].id === lossRecord.id,
  "1件の削除で他の牌譜も削除しました"
);
storageData[Sanma.GameRecordStorage.INDEX_KEY] = JSON.stringify({
  version: 1,
  entries: [{ id: "stale-record", createdAt: "2020-01-01T00:00:00.000Z" }],
});
const repairedIndex = Sanma.GameRecordStorage.loadIndex(Sanma.GameRecordStorage.loadRecords());
assert(repairedIndex.length === 1 && repairedIndex[0].id === lossRecord.id, "本文と不一致の牌譜インデックスを再構築できません");

Sanma.GameRecordStorage.resetRecords();
for (let number = 0; number < Sanma.GameRecordStorage.MAX_RECORDS + 3; number += 1) {
  const record = createRecord(
    `record-cap-${number}`,
    new Date(Date.UTC(2026, 5, 1, 0, number)).toISOString(),
    null,
    [],
    null
  );
  assert(Sanma.GameRecordStorage.saveRecord(record), "上限確認用牌譜を保存できません");
}
assert(Sanma.GameRecordStorage.loadRecords().length === Sanma.GameRecordStorage.MAX_RECORDS, "牌譜保存上限が機能しません");
assert(Sanma.GameRecordStorage.loadIndex().length === Sanma.GameRecordStorage.MAX_RECORDS, "牌譜インデックスが保存上限と一致しません");

console.log("Phase 13 replay and advanced statistics tests passed.");
