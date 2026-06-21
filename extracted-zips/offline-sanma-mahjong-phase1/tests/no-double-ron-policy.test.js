const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const waitOne = ["3p", "4p", "2s", "3s", "4s", "6p", "7p", "8p", "6s", "7s", "8s", "2p", "2p"];
const waitTwo = ["3p", "4p", "2s", "3s", "4s", "6s", "7s", "8s", "6p", "7p", "8p", "4s", "4s"];
const filler = ["1m", "1m", "1m", "9m", "9m", "9m", "1p", "1p", "1p", "9p", "9p", "9p", "z1"];

assert(Sanma.RuleConfig.defaultRuleConfig.doubleRonPolicy.allowed === false, "default doubleRonPolicy.allowed should remain false");
assert(Sanma.RuleConfig.createRuleConfig({}).doubleRonPolicy.allowed === false, "default createRuleConfig should preserve head-bump");
assert(Sanma.RuleConfig.createRuleConfig({ doubleRonPolicy: { allowed: true } }).doubleRonPolicy.allowed === true, "doubleRonPolicy.allowed should be opt-in configurable");

function arrangeDiscard(seed, discarderIndex, setups) {
  const engine = createEngine(Sanma, seed, { dramaticLuckAssist: false });
  arrangeEngine(Sanma, engine, { turnIndex: discarderIndex, players: setups });
  const discard = engine.players[discarderIndex].discards.find((tile) => tile.baseId === "5p");
  assert(discard, "5p discard is required for no-double-ron policy test");
  engine.lastDiscard = { playerIndex: discarderIndex, tile: discard };
  return engine;
}

const cpuOnly = arrangeDiscard("no-double-cpu-only", 0, [
  { hand: filler, discards: ["5p"], lastDraw: false },
  { hand: waitOne, lastDraw: false },
  { hand: waitTwo, lastDraw: false },
]);
assert(cpuOnly.resolveRonCandidatesAfterDiscard(0), "CPU ron candidates should resolve under default head-bump");
assert(cpuOnly.phase === "win-ended" && cpuOnly.winResult.winnerIndex === 1, "default policy should choose nearest CPU only");
assert(!cpuOnly.winResult.isMultiRon, "default policy must not create multi ron result");

const humanFirst = arrangeDiscard("no-double-human-first", 2, [
  { hand: waitOne, lastDraw: false },
  { hand: waitTwo, lastDraw: false },
  { hand: filler, discards: ["5p"], lastDraw: false },
]);
assert(humanFirst.resolveRonCandidatesAfterDiscard(2), "human nearest ron should open under default head-bump");
assert(humanFirst.phase === "human-call", "human ron window should open under default head-bump");
assert(humanFirst.callWindow.pendingCpuRonCandidate.playerIndex === 1, "default policy should keep next CPU only as fallback");
assert(humanFirst.skipHumanCall(), "human ron skip should resolve fallback CPU");
assert(humanFirst.phase === "win-ended" && humanFirst.winResult.winnerIndex === 1, "fallback CPU should win after human skip");
assert(!humanFirst.winResult.isMultiRon, "human skip under default policy must not become double ron");

console.log("Default no-double-ron head-bump policy tests passed.");
