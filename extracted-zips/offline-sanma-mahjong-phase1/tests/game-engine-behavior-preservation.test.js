const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const filler = ["1m", "9m", "1p", "2p", "3p", "4p", "6p", "7p", "8p", "1s", "2s", "3s", "z1"];

function events(engine) {
  return engine.gameRecord.rounds[engine.gameRecord.rounds.length - 1].events;
}

function setDealer(engine, dealerIndex) {
  const state = engine.matchManager.state;
  state.dealerIndex = dealerIndex;
  state.roundNumber = dealerIndex + 1;
  state.roundLabel = Sanma.RoundManager.roundLabel(state.roundWind, state.roundNumber);
  state.players.forEach((player, playerIndex) => {
    player.seatWind = Sanma.RoundManager.seatWindFor(playerIndex, dealerIndex);
  });
}

function disableCpuSpecialActions(engine) {
  engine.tryCpuTsumo = () => false;
  engine.tryCpuKita = () => false;
  engine.tryCpuKan = () => false;
  engine.tryCpuRiichi = () => false;
}

const originalCallWindowCreate = Sanma.CallWindow.create;
try {
  Sanma.CallWindow.create = () => null;

  const humanDealer = createEngine(Sanma, "phase16-human-dealer", { dramaticLuckAssist: false });
  disableCpuSpecialActions(humanDealer);
  assert(humanDealer.phase === "human-discard", "human dealer must start in human-discard");
  assert(humanDealer.turnIndex === humanDealer.humanPlayer.id, "human dealer turnIndex must be human");
  assert(humanDealer.humanPlayer.hand.length === 14, "human dealer must start with 14 tiles");
  const discardId = humanDealer.humanPlayer.hand[0].instanceId;
  humanDealer.discardHumanTile(discardId);
  assert(events(humanDealer).some((event) => event.type === "discard" && event.data.playerIndex === 0), "human discard event must be recorded");
  assert(Sanma.TileLedger.inspect(humanDealer, humanDealer.ruleConfig).ok, "TileLedger must pass after human discard");

  const cpuDealer = createEngine(Sanma, "phase16-cpu-dealer", { dramaticLuckAssist: false });
  disableCpuSpecialActions(cpuDealer);
  setDealer(cpuDealer, 1);
  cpuDealer.startRound();
  assert(!(cpuDealer.phase === "human-discard" && cpuDealer.turnIndex === 1), "CPU dealer must not softlock in human-discard");
  assert(cpuDealer.players[1].discards.length === 1, "CPU dealer must make first discard");
  assert(cpuDealer.players[1].hand.length === 13, "CPU dealer must not keep 14 tiles after first discard");
  assert(Sanma.TileLedger.inspect(cpuDealer, cpuDealer.ruleConfig).ok, "TileLedger must pass after CPU dealer start");

  const exhaustive = createEngine(Sanma, "phase16-exhaustive", { allowChi: true });
  arrangeEngine(Sanma, exhaustive, {
    turnIndex: 1,
    players: [
      { hand: filler, lastDraw: false },
      { hand: ["5p"].concat(filler) },
      { hand: filler, lastDraw: false },
    ],
  });
  exhaustive.wall.deadWall = exhaustive.wall.deadWall.concat(exhaustive.wall.tiles);
  exhaustive.wall.tiles = [];
  exhaustive.phase = "cpu-running";
  exhaustive.lastDrawContext = { playerIndex: 1, isRinshan: false, isKitaReplacement: false };
  const discarded = exhaustive.players[1].discardTileByInstanceId(
    exhaustive.players[1].hand.find((tile) => tile.baseId === "5p").instanceId
  );
  exhaustive.handleDiscard(1, discarded);
  assert(exhaustive.phase === "round-ended", "empty wall discard without ron must end in exhaustive draw");
  assert(!exhaustive.callWindow, "empty wall discard must not leave a call window");
  assert(Sanma.TileLedger.inspect(exhaustive, exhaustive.ruleConfig).ok, "TileLedger must pass after exhaustive draw");
} finally {
  Sanma.CallWindow.create = originalCallWindowCreate;
}

console.log("Phase 16 GameEngine behavior preservation tests passed.");
