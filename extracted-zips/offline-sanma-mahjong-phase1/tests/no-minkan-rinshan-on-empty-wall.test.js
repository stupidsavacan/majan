const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const filler = ["1m", "9m", "1p", "2p", "3p", "4p", "6p", "7p", "8p", "1s", "2s", "3s", "z1"];

function minkanState(seed, emptyWall) {
  const engine = createEngine(Sanma, seed, {});
  arrangeEngine(Sanma, engine, {
    turnIndex: 0,
    players: [
      { hand: ["5p", "5p", "5p", "1m", "1m", "9m", "9m", "1p", "1p", "9p", "9p", "1s", "z1"], lastDraw: false },
      { hand: ["5p"].concat(filler) },
      { hand: filler, lastDraw: false },
    ],
  });
  const discarder = engine.players[1];
  const tile = discarder.discardTileByInstanceId(discarder.hand.find((item) => item.baseId === "5p").instanceId);
  engine.lastDiscard = { playerIndex: 1, tile, isFinalDrawDiscard: Boolean(emptyWall) };
  if (emptyWall) engine.wall.tiles = [];
  return engine;
}

const empty = minkanState("phase15-empty-minkan", true);
const emptyKan = Sanma.ActionResolver.findAction(empty, 0, "kan");
assert(!emptyKan.enabled || !(emptyKan.options || []).some((option) => option.type === "minkan"), "山0で明槓actionが出ました");
const staleOption = {
  type: "minkan",
  tile: empty.lastDiscard.tile,
  fromPlayerIndex: 1,
  consumeInstanceIds: empty.players[0].hand.filter((tile) => tile.baseId === "5p").slice(0, 3).map((tile) => tile.instanceId),
};
assert(!Sanma.KanRules.prepareKan({ state: empty, playerIndex: 0, kanAction: staleOption, ruleConfig: empty.ruleConfig }).prepared, "山0の明槓直接要求が拒否されません");

const live = minkanState("phase15-live-minkan", false);
const liveKan = Sanma.ActionResolver.findAction(live, 0, "kan");
const liveOption = (liveKan.options || []).find((option) => option.type === "minkan");
assert(liveOption, "山あり明槓候補が消えました");
const result = Sanma.KanRules.applyKan({ state: live, playerIndex: 0, kanAction: liveOption, ruleConfig: live.ruleConfig });
assert(result.applied && result.replacement, "山あり明槓で嶺上牌を引けません");
assert(Sanma.TileLedger.inspect(live, live.ruleConfig).ok, "山あり明槓後にTileLedgerが壊れました");

console.log("Phase 15 no minkan rinshan on empty wall tests passed.");
