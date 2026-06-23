const { assert, createTileFactory, loadModules } = require("./test-helpers");

const Sanma = loadModules();
const tile = createTileFactory(Sanma.TileUtil);

function player(hand, discards, melds, kitaTiles) {
  return {
    hand: (hand || []).map((code) => tile(code)),
    discards: (discards || []).map((code) => tile(code)),
    melds: (melds || []).map((meld) => ({
      type: meld.type || "pon",
      open: meld.open !== false,
      tiles: (meld.tiles || []).map((code) => tile(code)),
    })),
    kitaTiles: (kitaTiles || []).map((code) => tile(code)),
  };
}

const lastDiscard = tile("5p");
const visibleState = {
  ruleConfig: Sanma.RuleConfig.createRuleConfig({ northMode: "kita-dora" }),
  players: [
    player(["1p", "2p"], ["3p"], [{ type: "chi", tiles: ["4p", "5p", "6p"] }], ["north"]),
    player(["9p", "9p"], ["7s"], [{ type: "pon", tiles: ["white", "white", "white"] }]),
    player(["1s"], ["8s"]),
  ],
  wall: {
    tiles: [tile("9m"), tile("9m"), tile("9m"), tile("9m")],
    deadWall: [tile("1m")],
    doraIndicators: [tile("red")],
  },
  lastDiscard: { playerIndex: 1, tile: lastDiscard },
};

const visibleTiles = Sanma.CpuVisibleTiles.getVisibleTilesForPlayer(visibleState, 0);
const visibleCounts = Sanma.CpuVisibleTiles.getVisibleCountsForPlayer(visibleState, 0);

assert(visibleCounts["1p"] === 1 && visibleCounts["2p"] === 1, "CPU visible count must include own hand");
assert(visibleCounts["3p"] === 1 && visibleCounts["7s"] === 1 && visibleCounts["8s"] === 1, "CPU visible count must include rivers");
assert(visibleCounts["4p"] === 1 && visibleCounts["6p"] === 1, "CPU visible count must include meld tiles");
assert(visibleCounts.z4 === 1, "CPU visible count must include kita tiles");
assert(visibleCounts.z7 === 1, "CPU visible count must include public dora indicators");
assert(visibleCounts["5p"] === 2, "lastDiscard should be counted once when it is not already in a river");
assert(!visibleTiles.some((visible) => visible.baseId === "9m"), "CPU visible count must not inspect wall tiles");
assert(!visibleTiles.some((visible) => visible.baseId === "1m"), "CPU visible count must not inspect dead wall tiles");
assert(!visibleTiles.some((visible) => visible.baseId === "1s"), "CPU visible count must not inspect opponent concealed hands");

const disabledNorthState = Object.assign({}, visibleState, {
  ruleConfig: Sanma.RuleConfig.createRuleConfig({ northMode: "disabled" }),
});
assert(
  Sanma.CpuVisibleTiles.getRemainingVisibleEstimate(disabledNorthState, 0, "z4") === 0,
  "north remaining estimate must be 0 when northMode is disabled"
);

const decision = Sanma.CpuStrategy.chooseDiscard({
  player: visibleState.players[0],
  state: visibleState,
  ruleConfig: visibleState.ruleConfig,
  random: () => 0,
});
assert(
  decision.candidates.every((candidate) => Number.isInteger(candidate.visibleCount)),
  "CPU discard candidates must expose visible counts"
);
assert(
  decision.candidates.every((candidate) => candidate.remainingVisibleEstimate === null || Number.isInteger(candidate.remainingVisibleEstimate)),
  "CPU discard candidates must expose visible remaining estimates"
);
assert(
  decision.candidates.every((candidate) => Number.isInteger(candidate.danger) && candidate.pushFoldMode),
  "CPU discard candidates must expose danger and push/fold diagnostics"
);

console.log("CPU visible tile tests passed.");
