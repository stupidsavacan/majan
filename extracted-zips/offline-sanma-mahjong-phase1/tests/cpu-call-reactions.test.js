const { assert, createTileFactory, loadModules } = require("./test-helpers");

const Sanma = loadModules();
const { RuleConfig, Player, CallResolver } = Sanma;
const tile = createTileFactory(Sanma.TileUtil);

function hand(codes) {
  return codes.map((code) => tile(code));
}

function createState(options) {
  const input = options || {};
  const players = [
    new Player({ id: 0, name: "あなた", seatWind: "east", isHuman: true, points: 35000 }),
    new Player({ id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: 35000 }),
    new Player({ id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: 35000 }),
  ];
  return {
    ruleConfig: RuleConfig.createRuleConfig(input.ruleConfig || {}),
    players,
    round: { roundWind: "east", dealerIndex: 0, honba: 0, riichiSticks: 0 },
    turnIndex: Number.isInteger(input.turnIndex) ? input.turnIndex : 0,
    phase: input.phase || "human-discard",
    lastDiscard: null,
    wall: {
      doraIndicators: [],
      remainingCount: () => (Number.isInteger(input.wallRemaining) ? input.wallRemaining : 20),
    },
  };
}

function setDiscard(state, playerIndex, code) {
  const discardedTile = tile(code);
  state.players[playerIndex].discards = [discardedTile];
  state.lastDiscard = { playerIndex, tile: discardedTile };
  return discardedTile;
}

const mixedState = createState();
setDiscard(mixedState, 0, "white");
mixedState.players[1].hand = hand(["white", "white", "white", "1p"]);
mixedState.players[2].hand = hand(["white", "white", "2p"]);

const legalActions = CallResolver.getLegalCallActions(mixedState, 1);
assert(legalActions.length === 2, "CPU 1 should have minkan and pon candidates");
assert(legalActions.every((action) => action.id !== "ron"), "non-winning call resolver must exclude ron");
assert(legalActions[0].id === "kan" && legalActions[0].options[0].type === "minkan", "minkan must be first");
assert(legalActions[1].id === "pon", "pon should follow minkan");

const mixedCandidates = CallResolver.collectCpuCallCandidates(mixedState, 0);
assert(mixedCandidates.length === 3, "CPU candidates should include CPU1 minkan/pon and CPU2 pon");
assert(
  mixedCandidates.map((candidate) => `${candidate.playerIndex}:${candidate.actionId}`).join(",") === "1:kan,1:pon,2:pon",
  "candidate ordering should be deterministic by priority then turn distance"
);
assert(mixedCandidates.every((candidate) => candidate.sourcePlayerIndex === 0), "source player must be the discarder");
assert(mixedCandidates.every((candidate) => candidate.actionId !== "ron"), "candidate collection must exclude ron");

const ownDiscardState = createState();
setDiscard(ownDiscardState, 1, "white");
ownDiscardState.players[1].hand = hand(["white", "white", "white"]);
ownDiscardState.players[2].hand = hand(["white", "white"]);
const ownDiscardCandidates = CallResolver.collectCpuCallCandidates(ownDiscardState, 1);
assert(
  ownDiscardCandidates.length === 1
    && ownDiscardCandidates[0].playerIndex === 2
    && ownDiscardCandidates[0].actionId === "pon",
  "discarding CPU must never be allowed to call its own discard"
);

const chiState = createState({ ruleConfig: { allowChi: true } });
setDiscard(chiState, 0, "3p");
chiState.players[1].hand = hand(["2p", "4p"]);
chiState.players[2].hand = hand(["2p", "4p"]);
const chiCandidates = CallResolver.collectCpuCallCandidates(chiState, 0)
  .filter((candidate) => candidate.actionId === "chi");
assert(
  chiCandidates.length === 1 && chiCandidates[0].playerIndex === 1,
  "chi should only be available to the next player and only when allowChi is true"
);

const noChiState = createState({ ruleConfig: { allowChi: false } });
setDiscard(noChiState, 0, "3p");
noChiState.players[1].hand = hand(["2p", "4p"]);
assert(
  CallResolver.collectCpuCallCandidates(noChiState, 0).every((candidate) => candidate.actionId !== "chi"),
  "chi candidates must respect allowChi"
);

const emptyWallState = createState({ wallRemaining: 0 });
setDiscard(emptyWallState, 0, "white");
emptyWallState.players[1].hand = hand(["white", "white", "white"]);
assert(
  CallResolver.getLegalCallActions(emptyWallState, 1).length === 0,
  "non-winning call actions must be suppressed on an empty live wall"
);
assert(
  CallResolver.collectCpuCallCandidates(emptyWallState, 0).length === 0,
  "non-winning CPU candidates must be suppressed on an empty live wall"
);

const legalSelection = CallResolver.selectCpuCallCandidate(mixedState, mixedCandidates);
assert(legalSelection === mixedCandidates[0], "default selection should choose the first deterministic legal candidate");

const originalChooseCall = Sanma.CpuStrategy.chooseCall;
Sanma.CpuStrategy.chooseCall = () => ({
  playerIndex: 2,
  actionId: "ron",
  optionIndex: 0,
  option: { type: "ron", consumeInstanceIds: [] },
  priority: 1,
  sourcePlayerIndex: 0,
});
const strategyFallback = CallResolver.selectCpuCallCandidate(mixedState, mixedCandidates);
Sanma.CpuStrategy.chooseCall = originalChooseCall;
assert(
  strategyFallback.playerIndex === mixedCandidates[0].playerIndex
    && strategyFallback.actionId === mixedCandidates[0].actionId,
  "invalid strategy output must not be returned as a CPU call candidate"
);

console.log("CPU call resolver legality tests passed.");
