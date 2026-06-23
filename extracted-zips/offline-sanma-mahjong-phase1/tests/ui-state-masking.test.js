const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const engine = createEngine(Sanma, "ui-state-masking", { allowChi: true });

function assertRenderableTile(tile, message) {
  assert(tile, `${message}: tile must exist`);
  assert(tile.instanceId, `${message}: instanceId must exist`);
  assert(tile.baseId, `${message}: baseId must exist`);
  assert(tile.suit, `${message}: suit must exist for renderTiles.js`);
  assert(Number.isInteger(tile.rank), `${message}: rank must exist for renderTiles.js`);
  assert(typeof tile.label === "string", `${message}: label must exist`);
  assert(Object.prototype.hasOwnProperty.call(tile, "isRed"), `${message}: isRed must exist`);
}

function moveWallTileToKita(engine, playerIndex, baseId) {
  const index = engine.wall.tiles.findIndex((tile) => tile && tile.baseId === baseId);
  assert(index >= 0, `kita tile source must exist: ${baseId}`);
  engine.players[playerIndex].kitaTiles.push(engine.wall.tiles.splice(index, 1)[0]);
}

let state = engine.getState();
assert(state.players[0].hand.length === engine.players[0].hand.length, "human hand must remain visible to the human UI");
state.players[0].hand.forEach((tile) => assertRenderableTile(tile, "human hand tiles must remain renderable"));
[1, 2].forEach((playerIndex) => {
  assert(state.players[playerIndex].handCount === engine.players[playerIndex].hand.length, "CPU hand count must be visible");
  assert(state.players[playerIndex].hand.length === engine.players[playerIndex].hand.length, "CPU hand snapshots must preserve count");
  state.players[playerIndex].hand.forEach((tile) => assertRenderableTile(tile, "CPU concealed hand snapshots must keep renderable tile fields"));
  assert(state.players[playerIndex].lastDraw === null, "CPU lastDraw must be masked");
});
assertRenderableTile(state.doraIndicators[0], "dora indicators must render with suit/rank");
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
    { hand: ["2p"], discards: ["1p"], melds: [{ type: "pon", tiles: ["3p", "3p", "3p"] }], lastDraw: false },
    { hand: ["white", "white"], lastDraw: false },
  ],
});
moveWallTileToKita(engine, 1, "z4");
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
assertRenderableTile(state.players[0].hand[0], "human hand must render with suit/rank after arranged state");
assertRenderableTile(state.players[1].hand[0], "CPU concealed hand snapshot must keep renderable fields after arranged state");
assertRenderableTile(state.players[1].discards[0], "discards must render with suit/rank");
assertRenderableTile(state.players[1].melds[0].tiles[0], "meld tiles must render with suit/rank");
assertRenderableTile(state.players[1].kitaTiles[0], "kita tiles must render with suit/rank");
assertRenderableTile(state.doraIndicators[0], "dora indicators must render with suit/rank after arranged state");
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
state.winResult.revealedHand.concealedTiles.forEach((tile) => assertRenderableTile(tile, "revealed ron hand tiles must render with suit/rank"));
assertRenderableTile(state.winResult.revealedHand.winningTile, "revealed winning tile must render with suit/rank");
state.players[2].hand.forEach((tile) => assertRenderableTile(tile, "CPU player snapshot hand must stay renderable outside win reveal"));

console.log("UI state masking tests passed.");
