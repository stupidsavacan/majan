const fs = require("fs");
const path = require("path");
const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");
const { projectRoot } = require("./test-helpers");

const Sanma = loadModules();

function setLastDiscardFromRiver(engine, playerIndex, discardIndex) {
  const tile = engine.players[playerIndex].discards[discardIndex];
  engine.lastDiscard = { playerIndex, tile, at: new Date().toISOString() };
  return tile;
}

function assertRevealedHandMatchesPlayer(revealedHand, player, winningTile) {
  assert(revealedHand, "revealedHand is missing");
  assert(revealedHand.playerIndex === player.id, "revealedHand playerIndex is wrong");
  assert(revealedHand.concealedTiles.length === player.hand.length, "concealed tile snapshot count is wrong");
  assert(
    revealedHand.concealedTiles.every((tile) => player.hand.some((handTile) => handTile.instanceId === tile.instanceId)),
    "concealed tile snapshot does not match winner hand"
  );
  assert(revealedHand.winningTile.instanceId === winningTile.instanceId, "ron winning tile snapshot is wrong");
  assert(
    !revealedHand.concealedTiles.some((tile) => tile.instanceId === winningTile.instanceId),
    "ron winning tile must be shown separately from concealedTiles"
  );
}

const singleEngine = createEngine(Sanma, "ron-hand-reveal-single", { allowChi: true });
arrangeEngine(Sanma, singleEngine, {
  turnIndex: 0,
  phase: "cpu-running",
  players: [
    { hand: ["1s"], discards: ["9m"], lastDraw: false },
    {
      hand: ["2p", "3p", "4p", "5p", "6p", "7p", "7s", "8s", "9s", "9m"],
      melds: [{ type: "pon", open: true, fromPlayerIndex: 0, tiles: ["white", "white", "white"] }],
      lastDraw: false,
    },
    { hand: ["1p"], lastDraw: false },
  ],
});
singleEngine.players[1].kitaTiles = [Sanma.TileUtil.createTile("z", 4, 9001, false)];
const singleWinningTile = setLastDiscardFromRiver(singleEngine, 0, 0);
const singleHandIdsBefore = singleEngine.players[1].hand.map((tile) => tile.instanceId).join(",");
const singleAnalysis = Sanma.ActionResolver.analyzeWin(singleEngine, 1, "ron", singleWinningTile, 0);
assert(singleAnalysis.scoreResult.isValidWin, "single ron test hand must be valid");
assert(singleEngine.resolveRonWin(1, singleAnalysis, {}), "single ron must resolve");
assertRevealedHandMatchesPlayer(singleEngine.winResult.revealedHand, singleEngine.players[1], singleWinningTile);
assert(singleEngine.winResult.revealedHand.melds.length === 1, "single ron reveal must include melds");
assert(singleEngine.winResult.revealedHand.kitaTiles.length === 1, "single ron reveal must include kita tiles");
assert(
  singleEngine.players[1].hand.map((tile) => tile.instanceId).join(",") === singleHandIdsBefore,
  "revealedHand snapshot must not mutate winner hand"
);
const singleUiState = singleEngine.getState();
assert(singleUiState.players[1].hand.every((tile) => tile === null), "CPU hand must stay masked in UI state after ron");
assert(
  singleUiState.winResult.revealedHand.concealedTiles.length === singleEngine.players[1].hand.length,
  "ron winner hand must be revealed only through winResult"
);

const doubleEngine = createEngine(Sanma, "ron-hand-reveal-double", {
  allowChi: true,
  doubleRonPolicy: { allowed: true },
});
arrangeEngine(Sanma, doubleEngine, {
  turnIndex: 0,
  phase: "cpu-running",
  players: [
    { hand: ["1s"], discards: ["9m"], lastDraw: false },
    {
      hand: ["2p", "3p", "4p", "5p", "6p", "7p", "7s", "8s", "9s", "9m"],
      melds: [{ type: "pon", open: true, fromPlayerIndex: 0, tiles: ["white", "white", "white"] }],
      lastDraw: false,
    },
    {
      hand: ["1p", "2p", "3p", "7p", "8p", "9p", "1s", "2s", "3s", "7s", "8s", "9s", "9m"],
      lastDraw: false,
    },
  ],
});
const doubleWinningTile = setLastDiscardFromRiver(doubleEngine, 0, 0);
const candidates = [1, 2].map((playerIndex, priorityOffset) => ({
  playerIndex,
  priorityOffset: priorityOffset + 1,
  analysis: Sanma.ActionResolver.analyzeWin(doubleEngine, playerIndex, "ron", doubleWinningTile, 0),
}));
assert(candidates.every((candidate) => candidate.analysis.scoreResult.isValidWin), "double ron test hands must be valid");
assert(Sanma.WinFlow.resolveMultiRonWin.call(doubleEngine, candidates, {}), "double ron must resolve");
assert(doubleEngine.winResult.winners.length === 2, "double ron must keep every winner");
doubleEngine.winResult.winners.forEach((winner) => {
  assertRevealedHandMatchesPlayer(winner.revealedHand, doubleEngine.players[winner.winnerIndex], doubleWinningTile);
});
const doubleUiState = doubleEngine.getState();
doubleUiState.winResult.winners.forEach((winner) => {
  assert(winner.revealedHand && winner.revealedHand.winningTile, "double ron UI state must keep each winner reveal");
});
assert(doubleUiState.players[1].hand.every((tile) => tile === null), "double ron UI state must still mask CPU 1 hand snapshot");
assert(doubleUiState.players[2].hand.every((tile) => tile === null), "double ron UI state must still mask CPU 2 hand snapshot");

const renderTableSource = fs.readFileSync(path.resolve(projectRoot, "src", "ui", "renderTable.js"), "utf8");
const mainCss = fs.readFileSync(path.resolve(projectRoot, "src", "styles", "main.css"), "utf8");
assert(renderTableSource.includes("function renderRevealedHand"), "renderTable must include revealed hand rendering");
assert(renderTableSource.includes("winner.revealedHand"), "double ron render must use each winner revealedHand");
assert(renderTableSource.includes("winResult.revealedHand"), "single ron render must use winResult revealedHand");
assert(mainCss.includes(".revealed-hand"), "revealed hand CSS is missing");

console.log("Ron hand reveal tests passed.");
