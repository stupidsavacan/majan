const { assert, createTileFactory, loadModules } = require("./test-helpers");

const Sanma = loadModules(["src/storage/settingsStorage.js"]);
const { GameEngine, Settlement, TileUtil } = Sanma;
const tile = createTileFactory(TileUtil);

function allOwnedTiles(engine) {
  const playerTiles = engine.players.flatMap((player) => [
    ...(player.hand || []),
    ...(player.discards || []),
    ...(player.kitaTiles || []),
    ...(player.melds || []).flatMap((meld) => meld.tiles || []),
  ]);
  return [...engine.wall.tiles, ...engine.wall.deadWall, ...playerTiles];
}

function assertTileIntegrity(engine, expectedCount, label) {
  const tiles = allOwnedTiles(engine);
  assert(tiles.length === expectedCount, `${label}: expected ${expectedCount} owned tiles, got ${tiles.length}`);
  assert(tiles.every(Boolean), `${label}: null tile found`);
  const ids = tiles.map((ownedTile) => ownedTile.instanceId);
  assert(new Set(ids).size === ids.length, `${label}: duplicate tile instance ID found`);
}

const engine = new GameEngine({ ruleConfig: {}, seed: "phase6-integrity", onChange: function noop() {} });
assertTileIntegrity(engine, 108, "new round");
engine.discardHumanTile(engine.humanPlayer.hand[0].instanceId);
assert(["human-discard", "human-call", "round-ended"].includes(engine.phase), "discard flow entered an unexpected phase");
assertTileIntegrity(engine, 108, "after human and CPU discard flow");

const disabledNorthEngine = new GameEngine({
  ruleConfig: { northMode: "disabled" },
  seed: "phase6-disabled-north",
  onChange: function noop() {},
});
assertTileIntegrity(disabledNorthEngine, 104, "north disabled");

const manualDrawEngine = new GameEngine({ ruleConfig: {}, seed: "phase6-manual-draw", onChange: function noop() {} });
manualDrawEngine.phase = "human-draw";
manualDrawEngine.wall.tiles = [];
manualDrawEngine.drawForHumanManually();
assert(manualDrawEngine.phase === "round-ended", "empty manual draw did not end the round safely");
assert(manualDrawEngine.humanPlayer.hand.every(Boolean), "empty manual draw inserted a null tile");

const staleCallEngine = new GameEngine({ ruleConfig: {}, seed: "phase6-stale-call", onChange: function noop() {} });
staleCallEngine.players[0].hand = [tile("white"), tile("white"), tile("1p")];
const staleDiscard = tile("white");
staleCallEngine.players[1].discards = [];
staleCallEngine.lastDiscard = { playerIndex: 1, tile: staleDiscard };
staleCallEngine.callWindow = {
  fromPlayerIndex: 1,
  actions: [{
    id: "pon",
    options: [{
      fromPlayerIndex: 1,
      tile: staleDiscard,
      consumeInstanceIds: staleCallEngine.players[0].hand.slice(0, 2).map((ownedTile) => ownedTile.instanceId),
    }],
  }],
};
staleCallEngine.phase = "human-call";
const staleHandIds = staleCallEngine.players[0].hand.map((ownedTile) => ownedTile.instanceId);
staleCallEngine.claimHumanCall("pon", 0);
assert(staleCallEngine.players[0].melds.length === 0, "stale call created a meld");
assert(staleHandIds.every((instanceId) => staleCallEngine.players[0].hand.some((ownedTile) => ownedTile.instanceId === instanceId)), "stale call consumed tiles from the hand");
assert(staleCallEngine.callWindow === null || staleCallEngine.phase === "human-call", "stale call left an invalid call window");

const malformedCallEngine = new GameEngine({ ruleConfig: {}, seed: "phase6-malformed-call", onChange: function noop() {} });
malformedCallEngine.callWindow = {
  fromPlayerIndex: 1,
  actions: [{ id: "pon", options: [{ fromPlayerIndex: 1, tile: null, consumeInstanceIds: [] }] }],
};
malformedCallEngine.phase = "human-call";
malformedCallEngine.claimHumanCall("pon", 0);
assert(malformedCallEngine.callWindow === null || malformedCallEngine.phase === "human-call", "malformed call left an invalid call window");

const malformedPlayers = [
  { name: "A", points: 35000 },
  { name: "B", points: 35000 },
  { name: "C", points: 35000 },
];
const malformedSettlement = Settlement.applySettlement({
  players: malformedPlayers,
  scoreResult: {
    isValidWin: true,
    payments: { tsumo: { payers: [{ playerIndex: 99, amount: 1000 }], winnerGain: 1000 } },
  },
  context: { winType: "tsumo", winnerIndex: 0 },
});
assert(!malformedSettlement.applied, "malformed settlement was applied");
assert(malformedPlayers.every((player) => player.points === 35000), "malformed settlement partially mutated points");
const stringPaymentSettlement = Settlement.applySettlement({
  players: malformedPlayers,
  scoreResult: {
    isValidWin: true,
    payments: { ron: { amount: "1000", winnerGain: "1000" } },
  },
  context: { winType: "ron", winnerIndex: 0, loserIndex: 1 },
});
assert(!stringPaymentSettlement.applied, "string payment values were applied");
assert(malformedPlayers.every((player) => player.points === 35000), "string payment values mutated points");

const normalFive = tile("5p");
const redFive = tile("5p", true);
assert(normalFive.baseId === redFive.baseId && redFive.isRed, "red five did not normalize to the same base tile");

const storageData = { "offlineSanma.phase1.settings": "{broken-json" };
global.localStorage = {
  getItem(key) { return storageData[key] || null; },
  setItem(key, value) { storageData[key] = value; },
  removeItem(key) { delete storageData[key]; },
};
const originalWarn = console.warn;
console.warn = function expectedStorageWarning() {};
const recovered = Sanma.SettingsStorage.loadSettings();
assert(recovered && !storageData["offlineSanma.phase1.settings"], "corrupted localStorage was not recovered");
global.localStorage.setItem = function failSet() { throw new Error("quota"); };
assert(Sanma.SettingsStorage.saveSettings({}) === false, "storage save failure was not contained");
global.localStorage = new Proxy({}, {
  ownKeys() { throw new Error("blocked"); },
});
assert(Sanma.SettingsStorage.resetAllStorage() === false, "storage reset failure was not contained");
console.warn = originalWarn;

console.log("Phase 6 regression tests passed.");
