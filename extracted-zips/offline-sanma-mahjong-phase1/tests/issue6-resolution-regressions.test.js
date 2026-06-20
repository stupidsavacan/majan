const { arrangeEngine, assert, createEngine, createStorage, loadModules } = require("./phase14-2-test-utils");

const storage = createStorage();
global.localStorage = storage.storage;

const Sanma = loadModules([
  "src/storage/SaveMigration.js",
  "src/storage/gameRecordStorage.js",
]);

const players = [
  { id: 0, name: "Human", seatWind: "east", isHuman: true, points: 35000 },
  { id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: 35000 },
  { id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: 35000 },
];

function completeRecord(id, overrides) {
  const input = overrides || {};
  const createdAt = input.createdAt || "2026-06-19T00:00:00.000Z";
  const record = Sanma.GameRecord.create({
    players,
    ruleConfig: { matchLength: "tonpuu", allowChi: true, tsumoLoss: true },
    roundLabel: "east-1",
    dealerIndex: 0,
    startingPoints: [35000, 35000, 35000],
  });
  record.id = id;
  record.createdAt = createdAt;
  record.completedAt = input.completedAt === undefined ? createdAt : input.completedAt;
  record.finalPoints = input.finalPoints || [43000, 31000, 31000];
  record.finalRankings = input.finalRankings || [
    { playerIndex: 0, rank: 1, points: 43000 },
    { playerIndex: 1, rank: 2, points: 31000 },
    { playerIndex: 2, rank: 3, points: 31000 },
  ];
  record.rounds[0].result = Object.assign({
    type: "win",
    winnerIndex: 0,
    winType: "tsumo",
    yaku: ["riichi"],
    yakuman: [],
    score: {
      isValidWin: true,
      isYakuman: false,
      han: 5,
      fu: 30,
      basePoints: 2000,
      yakumanCount: 0,
      limitName: "mangan",
    },
    changes: [
      { playerIndex: 0, delta: 8000, after: 43000 },
      { playerIndex: 1, delta: -4000, after: 31000 },
      { playerIndex: 2, delta: -4000, after: 31000 },
    ],
  }, input.result || {});
  return record;
}

const multiPatternEngine = arrangeEngine(Sanma, createEngine(Sanma, "issue6-multi-pattern", {}), {
  turnIndex: 0,
  phase: "human-discard",
  players: [
    {
      hand: [
        "2p", "2p", "2p",
        "3p", "3p", "3p",
        "4p", "4p", "4p",
        "5p", "5p", "5p",
        "6p", "6p",
      ],
    },
  ],
});
multiPatternEngine.players[0].hasRiichi = true;
const multiPatternWin = Sanma.ActionResolver.analyzeWin(multiPatternEngine, 0, "tsumo", null, null);
assert(Array.isArray(multiPatternWin.scoreCandidates), "score candidates were not exposed");
assert(multiPatternWin.scoreCandidates.length > 1, "ambiguous hand did not enumerate multiple standard decompositions");
const bestRank = Math.max.apply(null, multiPatternWin.scoreCandidates.map((candidate) => candidate.rankScore));
assert(multiPatternWin.selectedScoreCandidate.rankScore === bestRank, "ambiguous hand did not choose the highest ranked score");
assert(multiPatternWin.scoreResult === multiPatternWin.selectedScoreCandidate.scoreResult, "selected score was not returned as scoreResult");

const staleWindow = createEngine(Sanma, "issue6-stale-call-window", {});
staleWindow.phase = "human-call";
staleWindow.turnIndex = staleWindow.humanPlayer.id;
staleWindow.callWindow = {
  isOpen: true,
  fromPlayerIndex: 1,
  actions: [{ id: "pon", options: [] }],
};
staleWindow.syncStateMachine("test stale call window");
assert(staleWindow.claimHumanCall("pon", 0) === false, "invalid call option should fail");
assert(staleWindow.callWindow === null, "failed human call left a stale callWindow");

const drawEngine = createEngine(Sanma, "issue6-exhaustive-tenpai", {});
const drawResult = drawEngine.withDrawTenpai({ type: "exhaustive_draw" });
assert(Array.isArray(drawResult.tenpaiStatuses) && drawResult.tenpaiStatuses.length === 3, "draw result missing all-player tenpai statuses");
assert(
  drawResult.tenpaiPlayerIndexes.length + drawResult.notenPlayerIndexes.length === 3,
  "draw result tenpai/noten indexes do not cover all players"
);
drawEngine.finishGameRecord(drawResult);
assert(Array.isArray(drawEngine.gameRecord.rounds[0].result.tenpaiStatuses), "game record did not persist draw tenpai statuses");

const preCompleted = createEngine(Sanma, "issue6-precompleted-round", {});
preCompleted.gameRecord.rounds[0].result = {
  type: "recovered_reset",
  winnerIndex: null,
  winType: null,
  yaku: [],
  yakuman: [],
  score: { isValidWin: false, isYakuman: false },
  changes: [],
};
preCompleted.finishGameRecord({ type: "exhaustive_draw", dealerTenpai: false });
assert(preCompleted.matchManager.getState().roundEnded, "finishGameRecord returned before syncing match state");

Sanma.GameRecordStorage.resetRecords();
assert(Sanma.GameRecordStorage.saveRecord(completeRecord("issue6-stats-reset")), "record save failed");
assert(Sanma.AdvancedStats.calculate(Sanma.GameRecordStorage.loadRecords()).match.gamesPlayed === 1, "saved record not counted before reset");
Sanma.GameRecordStorage.resetStats();
const resetStats = Sanma.GameRecordStorage.loadStats();
assert(resetStats.resetAt, "stats reset did not record resetAt");
assert(
  Sanma.AdvancedStats.calculate(Sanma.GameRecordStorage.loadRecords(), { since: resetStats.resetAt }).match.gamesPlayed === 0,
  "advanced stats ignored stats resetAt"
);

const invalidWinner = completeRecord("issue6-invalid-winner", {
  result: { winnerIndex: 99 },
});
assert(
  Sanma.AdvancedStats.calculate([invalidWinner]).hand.wins === 0
    && Sanma.AdvancedStats.calculate([invalidWinner]).hand.losses === 0,
  "invalid winnerIndex was counted by advanced stats"
);
assert(!Sanma.GameRecordStorage.importRecord(JSON.stringify(invalidWinner)).ok, "invalid winnerIndex import was accepted");

const invalidWin = completeRecord("issue6-invalid-win", {
  result: {
    score: { isValidWin: false, isYakuman: false, han: 0, fu: null, basePoints: 0, yakumanCount: 0, limitName: "" },
  },
});
const invalidWinStats = Sanma.AdvancedStats.calculate([invalidWin]);
assert(invalidWinStats.hand.wins === 0 && invalidWinStats.hand.losses === 0, "isValidWin=false result was counted");

const partialRecord = completeRecord("issue6-partial", { completedAt: null, finalPoints: [] });
assert(Sanma.AdvancedStats.calculate([partialRecord]).match.gamesPlayed === 0, "partial record was counted as played game");

const countedYakumanName = "\u6570\u3048\u5f79\u6e80";
const countedYakuman = completeRecord("issue6-counted-yakuman", {
  result: {
    yaku: [],
    yakuman: [],
    score: {
      isValidWin: true,
      isYakuman: true,
      han: 13,
      fu: null,
      basePoints: 8000,
      yakumanCount: 1,
      limitName: countedYakumanName,
    },
  },
});
assert(
  Sanma.AdvancedStats.calculate([countedYakuman]).yaku.yakumanNames[countedYakumanName] === 1,
  "counted yakuman name was not surfaced in advanced stats"
);

const tripleYakuman = completeRecord("issue6-triple-yakuman", {
  result: {
    score: {
      isValidWin: true,
      isYakuman: true,
      han: 0,
      fu: null,
      basePoints: 24000,
      yakumanCount: 3,
      limitName: "triple yakuman",
    },
  },
});
const tripleEntry = Sanma.RecordIndex.buildEntry(tripleYakuman);
assert(tripleEntry.yakumanCount === 3, "RecordIndex did not preserve yakuman multiplier");
assert(tripleEntry.tags.some((tag) => String(tag).startsWith("3")), "RecordIndex did not add a multi-yakuman tag");

const legacyReplay = completeRecord("issue6-legacy-replay");
legacyReplay.rounds[0].startingPoints = [35000, 35000, 35000];
legacyReplay.rounds[0].events = [];
legacyReplay.rounds[0].pointMovement = [
  { playerIndex: 0, delta: 8000, after: 43000 },
  { playerIndex: 1, delta: -4000, after: 31000 },
  { playerIndex: 2, delta: -4000, after: 31000 },
];
const replay = Sanma.ReplayViewer.create(legacyReplay);
Sanma.ReplayViewer.jumpToEnd(replay);
assert(replay.view.points[0] === 43000 && replay.view.points[1] === 31000, "legacy replay did not apply point movement fallback");

Sanma.GameRecordStorage.resetRecords();
const indexedRecord = completeRecord("issue6-stale-index");
assert(Sanma.GameRecordStorage.saveRecord(indexedRecord), "indexed record save failed");
storage.data[Sanma.GameRecordStorage.INDEX_KEY] = JSON.stringify({
  version: 1,
  entries: [{
    id: indexedRecord.id,
    createdAt: indexedRecord.createdAt,
    summary: "stale summary",
    finalRank: 3,
    finalPoints: 1,
    sizeBytes: 1,
    tags: ["stale"],
  }],
});
const repairedIndex = Sanma.GameRecordStorage.loadIndex(Sanma.GameRecordStorage.loadRecords());
assert(repairedIndex.length === 1 && repairedIndex[0].summary !== "stale summary", "stale same-id record index was trusted");

console.log("Issue #6 resolution regression tests passed.");
