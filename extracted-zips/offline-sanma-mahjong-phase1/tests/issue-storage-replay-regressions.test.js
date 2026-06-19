const { assert, loadModules } = require("./test-helpers");

const memory = {};
global.localStorage = {
  getItem(key) { return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null; },
  setItem(key, value) { memory[key] = String(value); },
  removeItem(key) { delete memory[key]; },
};

const Sanma = loadModules([
  "src/storage/SaveMigration.js",
  "src/storage/gameRecordStorage.js",
]);

const players = [
  { id: 0, name: "Human", seatWind: "east", isHuman: true, initialPoints: 35000 },
  { id: 1, name: "CPU 1", seatWind: "south", isHuman: false, initialPoints: 35000 },
  { id: 2, name: "CPU 2", seatWind: "west", isHuman: false, initialPoints: 35000 },
];

function completeRecord(id) {
  const record = Sanma.GameRecord.create({
    players,
    ruleConfig: { highScoreMode: false, allowChi: true, tsumoLoss: true },
    startingPoints: [35000, 35000, 35000],
  });
  record.id = id;
  record.createdAt = "2026-06-19T00:00:00.000Z";
  record.completedAt = "2026-06-19T00:00:00.000Z";
  record.finalPoints = [43000, 31000, 31000];
  record.finalRankings = [
    { playerIndex: 0, rank: 1, points: 43000 },
    { playerIndex: 1, rank: 2, points: 31000 },
    { playerIndex: 2, rank: 3, points: 31000 },
  ];
  record.rounds[0].result = {
    type: "win",
    winnerIndex: 0,
    winType: "tsumo",
    yaku: ["立直"],
    yakuman: [],
    score: { isValidWin: true, isYakuman: false, han: 5, fu: 30, basePoints: 2000, yakumanCount: 0, limitName: "満貫" },
    changes: [
      { playerIndex: 0, delta: 8000, after: 43000 },
      { playerIndex: 1, delta: -4000, after: 31000 },
      { playerIndex: 2, delta: -4000, after: 31000 },
    ],
  };
  return record;
}

const imported = completeRecord("import-official-pollution");
const importedResult = Sanma.GameRecordStorage.importRecord(JSON.stringify(imported));
assert(importedResult.ok, "valid exported/imported record should import");
assert(importedResult.record.imported === true && importedResult.record.statsEligible === false, "imported record was not marked stats-ineligible");
const importedStats = Sanma.AdvancedStats.calculate(Sanma.GameRecordStorage.loadRecords());
assert(importedStats.match.gamesPlayed === 0, "imported record polluted official advanced stats");

const invalidRankings = completeRecord("invalid-rankings");
invalidRankings.finalRankings[0].rank = 3;
assert(!Sanma.GameRecordStorage.importRecord(JSON.stringify(invalidRankings)).ok, "inconsistent finalRankings/finalPoints import was accepted");

const hugePoints = completeRecord("huge-points");
hugePoints.finalPoints = [999999999, -999999999, 35000];
assert(!Sanma.GameRecordStorage.importRecord(JSON.stringify(hugePoints)).ok, "huge or negative finalPoints import was accepted");

const badChanges = completeRecord("bad-changes");
badChanges.rounds[0].result.changes[0].delta = 999999999;
assert(!Sanma.GameRecordStorage.importRecord(JSON.stringify(badChanges)).ok, "inconsistent result.changes import was accepted");

const replayRecord = Sanma.GameRecord.create({ players });
Sanma.GameRecord.addEvent(replayRecord, "deal", {
  hands: [{ playerIndex: 0, tiles: [{ baseId: "1p", label: "1p", instanceId: "a" }] }],
});
Sanma.GameRecord.addEvent(replayRecord, "discard", { playerIndex: 0, tile: { baseId: "9p", label: "9p", instanceId: "missing" } });
const replay = Sanma.ReplayViewer.create(replayRecord);
Sanma.ReplayViewer.jumpToEnd(replay);
assert(replay.partial === true, "Replay did not mark missing tile removal as partial");
assert(replay.diagnostics && replay.diagnostics.length > 0, "Replay missing tile did not record diagnostics");

const kanReplayRecord = Sanma.GameRecord.create({ players });
Sanma.GameRecord.addEvent(kanReplayRecord, "deal", {
  hands: [{ playerIndex: 0, tiles: ["1p", "1p", "1p", "1p"] }],
});
Sanma.GameRecord.addEvent(kanReplayRecord, "kan", {
  playerIndex: 0,
  kanType: "ankan",
  tiles: ["1p", "1p", "1p", "1p"],
  consumedTileInstanceIds: [],
});
const kanReplay = Sanma.ReplayViewer.create(kanReplayRecord);
Sanma.ReplayViewer.jumpToEnd(kanReplay);
assert(kanReplay.view.hands[0].length === 0, "Replay did not fallback-remove kan tiles when consumed IDs were empty");

const prunedEvents = [];
prunedEvents.push({ index: 1, type: "deal", data: { hands: [{ playerIndex: 0, tiles: ["1p"] }] } });
for (let index = 2; index < Sanma.GameRecord.MAX_EVENTS_PER_ROUND + 20; index += 1) {
  prunedEvents.push({ index, type: "draw", data: { playerIndex: 0, tile: "2p" } });
}
prunedEvents.push({ index: 999, type: "win", data: { playerIndex: 0, winType: "tsumo" } });
const pruned = Sanma.GameRecord.pruneEvents(prunedEvents);
assert(pruned.some((event) => event && event.pruned === true), "pruned event log was not marked");
const prunedRecord = Sanma.GameRecord.create({ players });
prunedRecord.rounds[0].events = pruned;
const prunedReplay = Sanma.ReplayViewer.create(prunedRecord);
assert(prunedReplay.partial === true, "Replay did not warn for pruned record with deal event preserved");

console.log("Issue storage and replay regression tests passed.");
