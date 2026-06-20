const { assert, createStorage, loadModules } = require("./phase14-2-test-utils");

const storage = createStorage();
global.localStorage = storage.storage;
const Sanma = loadModules(["src/storage/SaveMigration.js", "src/storage/gameRecordStorage.js"]);
const players = [
  { id: 0, name: "あなた", seatWind: "east", isHuman: true, points: 35000 },
  { id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: 35000 },
  { id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: 35000 },
];
const valid = Sanma.GameRecord.create({ players, seed: "saved-record-valid" });
valid.completedAt = "2026-06-19T00:00:00.000Z";
valid.finalPoints = [43000, 31000, 31000];
valid.finalRankings = [
  { playerIndex: 0, rank: 1, points: 43000 },
  { playerIndex: 1, rank: 2, points: 31000 },
  { playerIndex: 2, rank: 3, points: 31000 },
];
valid.rounds[0].result = {
  type: "win",
  winnerIndex: 0,
  winType: "tsumo",
  yaku: ["riichi"],
  yakuman: [],
  score: { isValidWin: true, isYakuman: false, han: 5, fu: 30, limitName: "mangan" },
  changes: [
    { playerIndex: 0, delta: 8000, after: 43000 },
    { playerIndex: 1, delta: -4000, after: 31000 },
    { playerIndex: 2, delta: -4000, after: 31000 },
  ],
};

function stored(records) {
  storage.data[Sanma.GameRecordStorage.RECORDS_KEY] = JSON.stringify({ version: 2, records });
  return Sanma.GameRecordStorage.loadRecords();
}

const tooManyPlayers = JSON.parse(JSON.stringify(valid));
tooManyPlayers.id = "saved-too-many-players";
tooManyPlayers.players.push({ id: 3 });
assert(stored([valid, tooManyPlayers]).length === 1, "プレイヤー数不正の保存牌譜を読み込みました");

const tooManyRounds = JSON.parse(JSON.stringify(valid));
tooManyRounds.id = "saved-too-many-rounds";
tooManyRounds.rounds = Array.from({ length: Sanma.GameRecord.MAX_ROUNDS + 1 }, () => ({ events: [], result: null }));
assert(stored([valid, tooManyRounds]).length === 1, "局数超過の保存牌譜を読み込みました");

const longString = JSON.parse(JSON.stringify(valid));
longString.id = "saved-long-string";
longString.rounds[0].roundLabel = "x".repeat(Sanma.GameRecord.MAX_STRING_LENGTH + 1);
assert(stored([valid, longString]).length === 1, "長すぎる文字列を含む保存牌譜を読み込みました");

const malformed = JSON.parse(JSON.stringify(valid));
malformed.id = "saved-malformed-result";
malformed.rounds[0].result = { yaku: {}, yakuman: {}, score: null };
const loaded = stored([valid, malformed]);
assert(loaded.length === 1 && loaded[0].id === valid.id, "不正resultを含む保存牌譜を除外できません");
const index = Sanma.GameRecordStorage.loadIndex(loaded);
assert(index.length === 1 && index[0].id === valid.id, "不正保存牌譜がRecordIndexに含まれました");
assert(Sanma.AdvancedStats.calculate(loaded).match.gamesPlayed === 1, "保存牌譜の除外後に統計計算が停止しました");
const replay = Sanma.ReplayViewer.create(loaded[0]);
Sanma.ReplayViewer.jumpToEnd(replay);
assert(replay.view, "保存牌譜の除外後に再生が停止しました");
const diagnostics = Sanma.GameRecordStorage.getDiagnostics();
assert(diagnostics.localStorage.corruptedRecovered && diagnostics.localStorage.lastError, "保存牌譜拒否を診断へ記録しません");
assert(Object.keys(storage.data).some((key) => key.startsWith(Sanma.SaveMigration.BACKUP_PREFIX)), "不正保存牌譜を退避しません");

console.log("Phase 14.2 follow-up saved record hardening tests passed.");
