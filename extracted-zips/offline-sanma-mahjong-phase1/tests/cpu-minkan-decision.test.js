const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();

function setLastDiscardFromRiver(engine, playerIndex, discardIndex) {
  const tile = engine.players[playerIndex].discards[discardIndex];
  engine.lastDiscard = { playerIndex, tile, at: new Date().toISOString() };
  return tile;
}

const engine = createEngine(Sanma, "cpu-minkan-decision", { allowChi: true });
arrangeEngine(Sanma, engine, {
  turnIndex: 0,
  phase: "cpu-running",
  players: [
    { hand: ["1p"], discards: ["white"], lastDraw: false },
    {
      hand: [
        "white", "white", "white",
        "2p", "3p", "4p",
        "5p", "6p", "7p",
        "2s", "3s", "4s",
        "9m",
      ],
      lastDraw: false,
    },
    { hand: ["1s", "2s", "3s"], lastDraw: false },
  ],
});
setLastDiscardFromRiver(engine, 0, 0);
const candidates = Sanma.CallResolver.collectCpuCallCandidates(engine, 0);
const minkanCandidate = candidates.find((candidate) => candidate.playerIndex === 1
  && candidate.actionId === "kan"
  && candidate.option
  && candidate.option.type === "minkan");
assert(minkanCandidate, "minkan candidate must be collected for CPU");
const selected = Sanma.CallResolver.selectCpuCallCandidate(engine, candidates);
assert(selected === minkanCandidate, "CPU strategy must be able to select a strong minkan candidate");

const beforeDiscardCount = engine.players[0].discards.length;
const beforeHandCount = engine.players[1].hand.length;
const beforeRecordEvents = engine.gameRecord.rounds[engine.gameRecord.rounds.length - 1].events.length;
assert(engine.applyCpuCall(selected, { source: "cpu-minkan-decision-test" }), "CPU minkan must apply through applyCpuCall");
const meld = engine.players[1].melds.find((entry) => entry.type === "kan" && entry.kanType === "minkan");
assert(meld && meld.open, "CPU minkan must create an open kan meld");
assert(engine.players[0].discards.length === beforeDiscardCount - 1, "called tile must be removed from source river");
assert(engine.players[1].hand.length === beforeHandCount - 2, "CPU minkan must consume three tiles and then draw one rinshan tile");
assert(engine.lastDiscard === null, "minkan finalization must clear lastDiscard");
assert(engine.lastDrawContext && engine.lastDrawContext.isRinshan, "minkan must continue through rinshan draw context");
assert(engine.pendingKanAttempt === null, "minkan must finalize through KanFlow/KanRules");
assert(
  engine.gameRecord.rounds[engine.gameRecord.rounds.length - 1].events.length > beforeRecordEvents,
  "minkan must record kan/draw events"
);
assert(Sanma.TileLedger.inspect(engine, engine.ruleConfig).ok, "TileLedger must pass after CPU minkan");

const rejectEngine = createEngine(Sanma, "cpu-minkan-reject-fold", { allowChi: true });
arrangeEngine(Sanma, rejectEngine, {
  turnIndex: 0,
  phase: "cpu-running",
  players: [
    { hand: ["1p"], discards: ["white"], lastDraw: false },
    {
      hand: [
        "white", "white", "white",
        "1p", "4p", "7p",
        "1s", "4s", "7s",
        "1m", "9m", "east", "south",
      ],
      lastDraw: false,
    },
    { hand: ["2p"], discards: ["3p"], lastDraw: false },
  ],
});
rejectEngine.players[0].hasRiichi = true;
rejectEngine.wall.remainingCount = function remainingCount() { return 4; };
setLastDiscardFromRiver(rejectEngine, 0, 0);
const rejectCandidate = Sanma.CallResolver.collectCpuCallCandidates(rejectEngine, 0)
  .find((candidate) => candidate.actionId === "kan" && candidate.option.type === "minkan");
assert(rejectCandidate, "reject scenario must still have a legal minkan candidate");
assert(
  Sanma.CpuStrategy.chooseCall({
    state: rejectEngine,
    player: rejectEngine.players[1],
    legalCalls: [rejectCandidate],
    random: () => 0,
  }) === null,
  "CPU must reject minkan when weak, late, and defending"
);

console.log("CPU minkan decision tests passed.");
