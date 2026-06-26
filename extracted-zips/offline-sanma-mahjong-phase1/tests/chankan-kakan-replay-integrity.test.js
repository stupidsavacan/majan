const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const waitOne = ["3p", "4p", "2s", "3s", "4s", "6p", "7p", "8p", "6s", "7s", "8s", "2p", "2p"];
const filler = ["1p", "2p", "3p", "6p", "7p", "8p", "1s", "2s", "3s", "9s"];

function resetDealEvent(engine) {
  const round = engine.gameRecord.rounds[engine.gameRecord.rounds.length - 1];
  round.events = [];
  Sanma.GameRecord.addEvent(engine.gameRecord, "deal", {
    hands: engine.players.map((player) => ({
      playerIndex: player.id,
      playerName: player.name,
      tiles: player.hand.map((tile) => engine.tileSnapshot(tile)),
    })),
  });
}

function hasTile(tiles, target) {
  return (tiles || []).some((tile) => Sanma.ReplayViewer.sameTile(tile, target));
}

const engine = createEngine(Sanma, "chankan-kakan-replay", { dramaticLuckAssist: false });
arrangeEngine(Sanma, engine, {
  turnIndex: 1,
  players: [
    { hand: waitOne, lastDraw: false },
    {
      hand: ["5p"].concat(filler),
      melds: [{ type: "pon", open: true, fromPlayerIndex: 2, tiles: ["5p", "5p", "5p"] }],
    },
    { hand: ["1m", "1m", "1m", "9m", "9m", "9m", "1p", "1p", "1p", "9p", "9p", "9p", "z1"], lastDraw: false },
  ],
});
resetDealEvent(engine);

const option = Sanma.KanRules.getAvailableKanActions({ state: engine, playerIndex: 1 })
  .find((candidate) => candidate.type === "kakan");
assert(option, "kakan option is required");
const movedTileId = option.consumeInstanceIds[0];
assert(engine.beginKanAttempt(1, option), "kakan chankan should open for human");
assert(engine.phase === "human-call" && engine.callWindow.kind === "chankan", "human chankan window should be open");
assert(engine.claimHumanRon(), "human should accept kakan chankan");

const liveDeclarer = engine.players[1];
const liveMovedTile = liveDeclarer.discards.find((tile) => tile.instanceId === movedTileId);
assert(liveMovedTile, "accepted kakan chankan should move the added tile to declarer river");
assert(!liveDeclarer.hand.some((tile) => tile.instanceId === movedTileId), "declarer hand should not retain the kakan-added tile");

const events = engine.gameRecord.rounds[engine.gameRecord.rounds.length - 1].events;
const moveEvent = events.find((event) => event.type === "chankan_tile_move");
assert(moveEvent && moveEvent.data.tile.instanceId === movedTileId, "record should contain chankan tile move event");

const replay = Sanma.ReplayViewer.create(engine.gameRecord, 0);
Sanma.ReplayViewer.jumpToEnd(replay);
assert(!hasTile(replay.view.hands[1], moveEvent.data.tile), "replay should remove the kakan-added tile from declarer hand");
assert(hasTile(replay.view.discards[1], moveEvent.data.tile), "replay should place the kakan-added tile in declarer river");
assert(replay.diagnostics.length === 0, "chankan replay should not produce diagnostics");

console.log("Chankan kakan replay integrity regression tests passed.");
