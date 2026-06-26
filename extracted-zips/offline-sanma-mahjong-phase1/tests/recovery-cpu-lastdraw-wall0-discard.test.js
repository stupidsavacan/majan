const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();

const engine = createEngine(Sanma, "recovery-cpu-lastdraw-wall0", { dramaticLuckAssist: false });
arrangeEngine(Sanma, engine, {
  turnIndex: 1,
  phase: "cpu-running",
  players: [
    { hand: ["2p", "3p", "4p", "2s", "3s", "4s", "6p", "7p", "8p", "6s", "7s", "8s", "z1"], lastDraw: false },
    { hand: ["1m", "1m", "1m", "9m", "9m", "9m", "1p", "1p", "9p", "9p", "1s", "1s", "z1", "z2"] },
    { hand: ["2p", "2p", "3p", "3p", "4p", "4p", "5p", "5p", "6p", "6p", "7p", "7p", "8p"], lastDraw: false },
  ],
});

engine.wall.deadWall = engine.wall.deadWall.concat(engine.wall.tiles);
engine.wall.tiles = [];
engine.callWindow = null;
engine.lastDiscard = null;
engine.cpuTaskActive = true;
const cpu = engine.players[1];
const beforeHandCount = cpu.hand.length;
const beforeDiscardCount = cpu.discards.length;
assert(beforeHandCount === 14 && cpu.lastDraw, "CPU should start recovery with a pending drawn tile");
assert(engine.wall.remainingCount() === 0, "wall should be empty before recovery");

const result = Sanma.RecoveryManager.resumeTurn(engine, 1, "test recovery cpu lastDraw wall 0");
assert(result.ok, "recovery should resume CPU turn");
assert(cpu.discards.length === beforeDiscardCount + 1, "CPU should discard before exhaustive draw at wall 0");
assert(cpu.hand.length === beforeHandCount - 1, "CPU hand should return to 13 tiles after the pending discard");
assert(engine.phase === "round-ended" || engine.phase === "win-ended" || engine.phase === "human-call" || engine.phase === "human-discard", "recovery should end in a legal state");
assert(!(engine.phase === "cpu-running" && engine.turnIndex === 1), "recovery should not leave stale cpu-running after a pending discard");
assert(Sanma.TileLedger.inspect(engine, engine.ruleConfig).ok, "TileLedger should pass after recovery CPU discard");

const events = engine.gameRecord.rounds[engine.gameRecord.rounds.length - 1].events;
assert(events.some((event) => event.type === "discard" && event.data.playerIndex === 1), "record should contain CPU discard after recovery");

console.log("Recovery CPU lastDraw wall-0 discard regression tests passed.");
