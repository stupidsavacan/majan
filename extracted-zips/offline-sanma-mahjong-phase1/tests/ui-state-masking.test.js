const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const engine = createEngine(Sanma, "ui-state-masking", { allowChi: true });

let state = engine.getState();
assert(state.players[0].hand.length === engine.players[0].hand.length, "human hand must remain visible to the human UI");
[1, 2].forEach((playerIndex) => {
  assert(state.players[playerIndex].handCount === engine.players[playerIndex].hand.length, "CPU hand count must be visible");
  assert(state.players[playerIndex].hand.length === engine.players[playerIndex].hand.length, "CPU hidden hand placeholders must preserve count");
  assert(state.players[playerIndex].hand.every((tile) => tile === null), "CPU concealed hand tiles must be masked");
  assert(state.players[playerIndex].lastDraw === null, "CPU lastDraw must be masked");
});
assert(state.deadWallCount === null, "dead wall count must not be exposed in normal UI state");
assert(state.totalKnownTileCount === null, "total hidden tile count must not be exposed in normal UI state");
assert(!state.gameRecord.rounds, "current gameRecord body must not be exposed through UI state");
assert(Number.isInteger(state.gameRecord.eventCount), "gameRecord summary must keep eventCount");
assert(!state.invariantReport.tileLedger, "invariantReport must not expose tileLedger details");
assert(!state.tileLedger.counts && !state.tileLedger.locations, "tileLedger summary must not expose hidden locations/counts");

engine.cpuThinkingLog.unshift({
  player: "CPU 1",
  action: "discard",
  selectedDiscard: "9m",
  selectedTileInstanceId: "secret-selected-id",
  hand: "1p 2p 3p",
  candidates: [{
    tileInstanceId: "secret-candidate-id",
    tileLabel: "1p",
    tileType: "1p",
    score: 10,
    shanten: 1,
    visibleCount: 2,
    remainingVisibleEstimate: 2,
    danger: 4,
    pushFoldMode: "fold",
    handValue: 12,
  }],
  assist: {
    type: "assist",
    applied: true,
    outgoing: engine.players[1].hand[0],
    incoming: engine.wall.tiles[0],
    integrityValid: true,
  },
});
state = engine.getState();
const logEntry = state.cpuThinkingLog[0];
assert(!Object.prototype.hasOwnProperty.call(logEntry, "hand"), "cpuThinkingLog must not expose full CPU hand strings");
assert(!Object.prototype.hasOwnProperty.call(logEntry, "selectedTileInstanceId"), "cpuThinkingLog must not expose selected tile instance id");
assert(!Object.prototype.hasOwnProperty.call(logEntry.candidates[0], "tileLabel"), "cpuThinkingLog candidates must not expose candidate tile label");
assert(!Object.prototype.hasOwnProperty.call(logEntry.candidates[0], "tileInstanceId"), "cpuThinkingLog candidates must not expose candidate tile instance id");
assert(!Object.prototype.hasOwnProperty.call(logEntry.candidates[0], "tileType"), "cpuThinkingLog candidates must not expose candidate tile type");
assert(logEntry.candidates[0].danger === 4 && logEntry.candidates[0].pushFoldMode === "fold", "safe candidate diagnostics must remain visible");
assert(!logEntry.assist.outgoing && !logEntry.assist.incoming, "assist events in UI state must not expose swapped tiles");

arrangeEngine(Sanma, engine, {
  turnIndex: 0,
  phase: "human-call",
  players: [
    { hand: ["1p", "1p"], lastDraw: false },
    { hand: ["2p"], discards: ["1p"], lastDraw: false },
    { hand: ["white", "white"], lastDraw: false },
  ],
});
engine.callWindow = {
  isOpen: true,
  playerIndex: 0,
  fromPlayerIndex: 1,
  tile: engine.players[1].discards[0],
  pendingCpuCallCandidate: {
    playerIndex: 2,
    playerName: "CPU 2",
    actionId: "pon",
    priority: 3,
    turnDistance: 1,
    option: {
      type: "pon",
      tile: engine.players[1].discards[0],
      consumeInstanceIds: engine.players[2].hand.map((tile) => tile.instanceId),
    },
  },
  actions: [],
};
state = engine.getState();
assert(state.callWindow.pendingCpuCallCandidate.playerIndex === 2, "pending CPU call summary must keep player index");
assert(!state.callWindow.pendingCpuCallCandidate.option.consumeInstanceIds, "pending CPU call summary must hide consume ids");
assert(!state.callWindow.pendingCpuCallCandidate.option.tile, "pending CPU call summary must hide called tile object");

engine.winResult = {
  winnerIndex: 2,
  winnerName: "CPU 2",
  winType: "ron",
  score: { limitName: "満貫" },
  settlement: { changes: [] },
  revealedHand: {
    playerIndex: 2,
    playerName: "CPU 2",
    concealedTiles: engine.players[2].hand.map((tile) => engine.tileSnapshot(tile)),
    winningTile: engine.tileSnapshot(engine.players[1].discards[0]),
    melds: [],
    kitaTiles: [],
  },
};
state = engine.getState();
assert(state.winResult.revealedHand.concealedTiles.length === engine.players[2].hand.length, "ron winner hand must remain revealed after win");
assert(state.players[2].hand.every((tile) => tile === null), "non-table player snapshot must still hide CPU hand outside win reveal");

console.log("UI state masking tests passed.");
