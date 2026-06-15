const { assert, loadModules } = require("./test-helpers");

const Sanma = loadModules();

function compactYakuman(count) {
  return Sanma.GameRecord.compactResult({
    winnerIndex: 0,
    winType: "ron",
    yaku: { yaku: [], dora: [], yakuman: [{ name: `${count}倍役満` }] },
    score: {
      isValidWin: true,
      isYakuman: true,
      yakumanCount: count,
      basePoints: 8000 * count,
      han: 0,
      fu: null,
      limitName: count === 1 ? "役満" : `${count}倍役満`,
    },
    settlement: { changes: [] },
  });
}

const single = compactYakuman(1);
const double = compactYakuman(2);
const triple = compactYakuman(3);
assert(single.score.yakumanCount === 1 && single.score.basePoints === 8000, "compact resultが単一役満倍率・基本点を保存しません");
assert(triple.score.yakumanCount === 3 && triple.score.basePoints === 24000, "compact resultが複合役満倍率・基本点を保存しません");
assert(Sanma.RecordIndex.scoreValue(single) < Sanma.RecordIndex.scoreValue(double), "単一役満と二倍役満を正しく順位付けしません");
assert(Sanma.RecordIndex.scoreValue(double) < Sanma.RecordIndex.scoreValue(triple), "二倍役満と三倍役満を正しく順位付けしません");

const record = {
  id: "yakuman-index-record",
  players: [{ id: 0, isHuman: true }, { id: 1 }, { id: 2 }],
  rounds: [{ events: [], result: single }, { events: [], result: triple }],
  finalPoints: [],
  finalRankings: [],
};
assert(Sanma.RecordIndex.highestHand(record).score.yakumanCount === 3, "最高打点が三倍役満を単一役満より優先しません");

const oldRecord = JSON.parse(JSON.stringify(record));
delete oldRecord.rounds[0].result.score.yakumanCount;
delete oldRecord.rounds[0].result.score.basePoints;
delete oldRecord.rounds[1].result.score.yakumanCount;
delete oldRecord.rounds[1].result.score.basePoints;
assert(Sanma.GameRecord.validateImportedRecord(oldRecord), "yakumanCountのない旧牌譜を拒否しました");
assert(Sanma.GameRecord.normalize(oldRecord).rounds.length === 2, "yakumanCountのない旧牌譜を安全に読み込めません");

console.log("Phase 14.2C yakuman record index tests passed.");
