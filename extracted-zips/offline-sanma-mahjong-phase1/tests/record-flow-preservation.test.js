const { assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules(["src/storage/gameRecordStorage.js"]);
const engine = createEngine(Sanma, "phase16-record-flow", { dramaticLuckAssist: false });
const currentRound = engine.gameRecord.rounds[engine.gameRecord.rounds.length - 1];

assert(currentRound.events.some((event) => event.type === "deal"), "deal event must exist before pruning");
for (let index = 0; index < 1300; index += 1) {
  Sanma.RecordFlow.recordGameEvent.call(engine, "debug", { index });
}
assert(currentRound.events.some((event) => event.type === "deal"), "deal event must survive record pruning");

Sanma.RecordFlow.recordGameEvent.call(engine, "score_settlement", { winnerIndex: 0, deltas: [1000, -500, -500] });
assert(
  currentRound.events.some((event) => event.type === "score_settlement"),
  "score_settlement event must be recorded through RecordFlow"
);
assert(
  Sanma.DebugEventLog.list(engine.debugEventLog).some((event) => event.type === "settlementResult"),
  "score_settlement must still bridge to debug event log"
);

const snapshot = Sanma.RecordFlow.tileSnapshot.call(engine, engine.players[0].hand[0]);
assert(snapshot && snapshot.instanceId && snapshot.baseId && snapshot.label, "tileSnapshot must preserve compact tile data");

console.log("Phase 16 record flow preservation tests passed.");
