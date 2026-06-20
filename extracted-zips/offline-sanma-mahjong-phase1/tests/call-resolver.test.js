const { assert, createTileFactory, loadModules } = require("./test-helpers");

const Sanma = loadModules();
const { CallResolver, Player, RuleConfig, TileUtil } = Sanma;
const tile = createTileFactory(TileUtil);

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
    turnIndex: 0,
    phase: "human-discard",
    lastDiscard: null,
    callWindow: null,
    wall: {
      doraIndicators: [],
      remainingCount: () => (Number.isInteger(input.wallRemaining) ? input.wallRemaining : 20),
    },
  };
}

function discardFrom(state, discarderIndex, code) {
  const discarded = tile(code);
  state.players[discarderIndex].discards.push(discarded);
  state.lastDiscard = { playerIndex: discarderIndex, tile: discarded };
  return discarded;
}

function snapshotState(state) {
  return JSON.stringify({
    turnIndex: state.turnIndex,
    phase: state.phase,
    lastDiscard: state.lastDiscard && {
      playerIndex: state.lastDiscard.playerIndex,
      tileInstanceId: state.lastDiscard.tile.instanceId,
    },
    callWindow: state.callWindow,
    players: state.players.map((player) => ({
      hand: player.hand.map((ownedTile) => ownedTile.instanceId),
      discards: player.discards.map((discardedTile) => discardedTile.instanceId),
      melds: player.melds,
      hasRiichi: player.hasRiichi,
      riichi: player.riichi,
      lastDraw: player.lastDraw && player.lastDraw.instanceId,
    })),
  });
}

function actionIds(candidates) {
  return candidates.map((candidate) => `${candidate.playerIndex}:${candidate.actionId}:${candidate.option.type}`);
}

assert(CallResolver, "Sanma.CallResolver must be attached");
assert(typeof CallResolver.getLegalCallActions === "function", "getLegalCallActions must be public");
assert(typeof CallResolver.collectCpuCallCandidates === "function", "collectCpuCallCandidates must be public");
assert(typeof CallResolver.selectCpuCallCandidate === "function", "selectCpuCallCandidate must be public");

const ponState = createState();
ponState.players[1].hand = hand(["white", "white", "1p"]);
discardFrom(ponState, 0, "white");
const beforePon = snapshotState(ponState);
const ponActions = CallResolver.getLegalCallActions(ponState, 1);
const ponCandidates = CallResolver.collectCpuCallCandidates(ponState, 0);
assert(snapshotState(ponState) === beforePon, "CallResolver must not mutate state while collecting pon candidates");
assert(ponActions.every((action) => action.id !== "ron"), "CallResolver must exclude ron actions");
assert(ponActions.some((action) => action.id === "pon"), "CPU pon must be detected from another player's discard");
assert(ponCandidates.length === 1 && ponCandidates[0].playerIndex === 1 && ponCandidates[0].actionId === "pon", "CPU pon candidate shape is wrong");
assert(ponCandidates[0].sourcePlayerIndex === 0 && ponCandidates[0].turnDistance === 1, "CPU pon candidate metadata is wrong");

const ownDiscardState = createState();
ownDiscardState.players[1].hand = hand(["white", "white", "1p"]);
discardFrom(ownDiscardState, 1, "white");
assert(CallResolver.getLegalCallActions(ownDiscardState, 1).length === 0, "A player must not call its own discard");

const oneMatchState = createState();
oneMatchState.players[1].hand = hand(["white", "1p", "2p"]);
discardFrom(oneMatchState, 0, "white");
assert(CallResolver.collectCpuCallCandidates(oneMatchState, 0).length === 0, "CPU pon must require two matching hand tiles");

const chiState = createState({ ruleConfig: { allowChi: true } });
chiState.players[1].hand = hand(["2p", "4p", "1s"]);
chiState.players[2].hand = hand(["2p", "4p", "1s"]);
discardFrom(chiState, 0, "3p");
const chiCandidates = CallResolver.collectCpuCallCandidates(chiState, 0);
assert(chiCandidates.length === 1 && chiCandidates[0].playerIndex === 1 && chiCandidates[0].actionId === "chi", "CPU chi must be limited to the next player after the discarder");

const chiDisabledState = createState({ ruleConfig: { allowChi: false } });
chiDisabledState.players[1].hand = hand(["2p", "4p", "1s"]);
discardFrom(chiDisabledState, 0, "3p");
assert(CallResolver.collectCpuCallCandidates(chiDisabledState, 0).length === 0, "CPU chi must respect allowChi=false");

const chiSuitState = createState({ ruleConfig: { allowChi: true } });
chiSuitState.players[1].hand = hand(["2p", "4p", "2s", "4s"]);
discardFrom(chiSuitState, 0, "3m");
assert(CallResolver.collectCpuCallCandidates(chiSuitState, 0).length === 0, "CPU chi must not allow manzu in this sanma model");
chiSuitState.players[0].discards = [];
discardFrom(chiSuitState, 0, "east");
assert(CallResolver.collectCpuCallCandidates(chiSuitState, 0).length === 0, "CPU chi must not allow honors");

const riichiState = createState();
riichiState.players[1].hand = hand(["white", "white", "white", "1p"]);
riichiState.players[1].hasRiichi = true;
discardFrom(riichiState, 0, "white");
assert(CallResolver.collectCpuCallCandidates(riichiState, 0).length === 0, "CPU must not collect non-winning calls after riichi");
assert(CallResolver.getLegalCallActions(riichiState, 1).length === 0, "Call actions must be hidden after riichi");

const pendingRiichiState = createState();
pendingRiichiState.players[1].hand = hand(["white", "white", "white", "1p"]);
pendingRiichiState.players[1].riichi = { pending: true, declared: false };
discardFrom(pendingRiichiState, 0, "white");
assert(CallResolver.collectCpuCallCandidates(pendingRiichiState, 0).length === 0, "CPU must not collect calls while riichi.pending is true");
assert(CallResolver.getLegalCallActions(pendingRiichiState, 1).length === 0, "Call actions must be hidden while riichi.pending is true");

const declaredRiichiState = createState();
declaredRiichiState.players[1].hand = hand(["white", "white", "white", "1p"]);
declaredRiichiState.players[1].riichi = { pending: false, declared: true };
discardFrom(declaredRiichiState, 0, "white");
assert(CallResolver.collectCpuCallCandidates(declaredRiichiState, 0).length === 0, "CPU must not collect calls while riichi.declared is true");
assert(CallResolver.getLegalCallActions(declaredRiichiState, 1).length === 0, "Call actions must be hidden while riichi.declared is true");

const minkanState = createState();
minkanState.players[1].hand = hand(["white", "white", "white", "1p"]);
discardFrom(minkanState, 0, "white");
const minkanCandidates = CallResolver.collectCpuCallCandidates(minkanState, 0);
assert(actionIds(minkanCandidates)[0] === "1:kan:minkan", "CPU minkan must be collected and sorted before pon");
assert(minkanCandidates.some((candidate) => candidate.actionId === "pon"), "Having three matching tiles should still expose the legal pon candidate");

const emptyWallState = createState({ wallRemaining: 0 });
emptyWallState.players[1].hand = hand(["white", "white", "white", "1p"]);
discardFrom(emptyWallState, 0, "white");
assert(CallResolver.collectCpuCallCandidates(emptyWallState, 0).length === 0, "CPU non-winning calls must not be collected with an empty wall");

const originalChooseCall = Sanma.CpuStrategy.chooseCall;
delete Sanma.CpuStrategy.chooseCall;
assert(CallResolver.selectCpuCallCandidate(minkanState, minkanCandidates) === minkanCandidates[0], "selectCpuCallCandidate must deterministically fall back to the first legal candidate when CpuStrategy.chooseCall is absent");
Sanma.CpuStrategy.chooseCall = ({ legalCalls }) => legalCalls[0];
assert(CallResolver.selectCpuCallCandidate(minkanState, minkanCandidates) === minkanCandidates[0], "selectCpuCallCandidate must accept a legal strategy result");
Sanma.CpuStrategy.chooseCall = () => ({ playerIndex: 2, actionId: "pon", optionIndex: 0, option: { type: "pon" } });
assert(CallResolver.selectCpuCallCandidate(minkanState, minkanCandidates) === null, "selectCpuCallCandidate must reject strategy results outside legal candidates");
if (originalChooseCall) {
  Sanma.CpuStrategy.chooseCall = originalChooseCall;
} else {
  delete Sanma.CpuStrategy.chooseCall;
}

console.log("Agent 20 CallResolver legal candidate tests passed.");
