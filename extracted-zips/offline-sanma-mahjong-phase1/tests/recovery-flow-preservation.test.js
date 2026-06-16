const { assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const engine = createEngine(Sanma, "phase16-recovery-flow", { dramaticLuckAssist: false });

assert(typeof Sanma.RecoveryFlow.skipHumanCall === "function", "RecoveryFlow skip bridge is missing");
assert(typeof Sanma.RecoveryFlow.finalizePendingKan === "function", "RecoveryFlow kan bridge is missing");
assert(typeof Sanma.RecoveryFlow.resolvePendingCpuRon === "function", "RecoveryFlow CPU ron bridge is missing");

const beforeRoundId = engine.gameRecord.rounds.length;
Sanma.RecoveryFlow.startRound(engine);
assert(engine.gameRecord.rounds.length === beforeRoundId + 1, "RecoveryFlow startRound bridge must start a new record round");
assert(engine.phase === "human-discard" || engine.phase === "cpu-running", "RecoveryFlow startRound must leave a legal active phase");
assert(Sanma.TileLedger.inspect(engine, engine.ruleConfig).ok, "TileLedger must pass after RecoveryFlow startRound bridge");

engine.phase = "human-call";
engine.turnIndex = 0;
engine.lastDiscard = { playerIndex: 1, tile: engine.players[1].hand[0] };
engine.callWindow = {
  isOpen: true,
  fromPlayerIndex: 1,
  actions: [{ id: "skip", label: "skip", enabled: true }],
};
Sanma.RecoveryManager.closeStuckActionWindow(engine);
assert(engine.phase !== "human-draw", "Recovery must not end in unreachable human-draw");
assert(!(engine.phase === "human-discard" && engine.turnIndex !== engine.humanPlayer.id), "Recovery must not leave human-discard on CPU turn");

console.log("Phase 16 recovery flow preservation tests passed.");
