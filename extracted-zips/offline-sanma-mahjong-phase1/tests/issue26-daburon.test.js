const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const waitOne = ["3p", "4p", "2s", "3s", "4s", "6p", "7p", "8p", "6s", "7s", "8s", "2p", "2p"];
const waitTwo = ["3p", "4p", "2s", "3s", "4s", "6s", "7s", "8s", "6p", "7p", "8p", "4s", "4s"];
const filler = ["1m", "1m", "1m", "9m", "9m", "9m", "1p", "1p", "1p", "9p", "9p", "9p", "z1"];

function arrangeDiscard(seed, ruleConfig, discarderIndex, setups) {
  const engine = createEngine(Sanma, seed, Object.assign({ dramaticLuckAssist: false }, ruleConfig || {}));
  arrangeEngine(Sanma, engine, { turnIndex: discarderIndex, players: setups });
  const discard = engine.players[discarderIndex].discards.find((tile) => tile.baseId === "5p");
  assert(discard, "5p discard is required for daburon test");
  engine.lastDiscard = { playerIndex: discarderIndex, tile: discard };
  engine.round.honba = 1;
  engine.round.riichiSticks = 1;
  engine.matchManager.state.honba = 1;
  engine.matchManager.state.riichiSticks = 1;
  return engine;
}

const disabled = arrangeDiscard("issue26-disabled", { doubleRonPolicy: { allowed: false } }, 0, [
  { hand: filler, discards: ["5p"], lastDraw: false },
  { hand: waitOne, lastDraw: false },
  { hand: waitTwo, lastDraw: false },
]);
assert(disabled.resolveRonCandidatesAfterDiscard(0), "disabled double ron should still resolve head-bump");
assert(disabled.winResult.winnerIndex === 1, "disabled double ron should keep nearest winner only");
assert(!disabled.winResult.isMultiRon, "disabled double ron must not create multi result");

const enabled = arrangeDiscard("issue26-enabled", { doubleRonPolicy: { allowed: true } }, 0, [
  { hand: filler, discards: ["5p"], lastDraw: false },
  { hand: waitOne, lastDraw: false },
  { hand: waitTwo, lastDraw: false },
]);
const beforeLoser = enabled.players[0].points;
assert(enabled.resolveRonCandidatesAfterDiscard(0), "enabled double ron should resolve both CPU winners");
assert(enabled.winResult.isMultiRon, "enabled double ron should produce multi result");
assert(enabled.winResult.winnerIndexes.join(",") === "1,2", "enabled double ron should keep both winners in priority order");
assert(enabled.players[0].points < beforeLoser, "discarder should pay for both ron wins");
assert(enabled.winResult.settlement.winners[0].riichiStickGain === 1000, "riichi sticks should go to the first head-bump-order winner");
assert(enabled.winResult.settlement.winners[1].riichiStickGain === 0, "second double-ron winner should not duplicate riichi sticks");
assert(enabled.matchManager.state.lastResult.winnerIndexes.join(",") === "1,2", "match result should preserve multiple winners");
assert(enabled.gameRecord.rounds[enabled.gameRecord.rounds.length - 1].events.filter((event) => event.type === "win").length >= 2, "record should contain a win event for each winner");
assert(enabled.gameRecord.rounds[enabled.gameRecord.rounds.length - 1].events.some((event) => event.type === "score_settlement" && event.data.multiRon), "record should mark multi-ron settlement");
assert(Sanma.ReplayViewer.create(enabled.gameRecord, 0), "replay should create a state for double-ron records");

const dealerIncluded = arrangeDiscard("issue26-dealer-included", { doubleRonPolicy: { allowed: true } }, 2, [
  { hand: waitOne, lastDraw: false },
  { hand: waitTwo, lastDraw: false },
  { hand: filler, discards: ["5p"], lastDraw: false },
]);
dealerIncluded.round.dealerIndex = 0;
dealerIncluded.matchManager.state.dealerIndex = 0;
assert(dealerIncluded.resolveRonCandidatesAfterDiscard(2), "human+CPU double ron should open human ron window");
assert(dealerIncluded.phase === "human-call", "human candidate should still require explicit ron claim");
assert(dealerIncluded.claimHumanRon(), "human ron claim should resolve the double ron");
assert(dealerIncluded.winResult.isMultiRon, "human accepted double ron should produce multi result");
assert(dealerIncluded.winResult.winnerIndexes.includes(0) && dealerIncluded.winResult.winnerIndexes.includes(1), "human+CPU double ron should include both winners");
assert(dealerIncluded.matchManager.state.lastResult.dealerContinues, "dealer included in double ron should continue dealership");
assert(dealerIncluded.matchManager.pendingRound.honba === 2, "dealer double ron should increment honba by configured default 1");

const singleRon = arrangeDiscard("issue26-single", { doubleRonPolicy: { allowed: true } }, 0, [
  { hand: filler, discards: ["5p"], lastDraw: false },
  { hand: waitOne, lastDraw: false },
  { hand: ["z2", "z2", "z2", "z3", "z3", "z3", "z4", "z4", "z4", "z5", "z5", "z5", "z6"], lastDraw: false },
]);
assert(singleRon.resolveRonCandidatesAfterDiscard(0), "single ron should still resolve under enabled double ron policy");
assert(!singleRon.winResult.isMultiRon && singleRon.winResult.winnerIndex === 1, "single ron should stay a normal ron result");

console.log("Issue #26 daburon tests passed.");
