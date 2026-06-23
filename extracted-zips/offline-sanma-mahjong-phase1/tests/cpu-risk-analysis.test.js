const { assert, createTileFactory, loadModules } = require("./test-helpers");

const Sanma = loadModules();
const tile = createTileFactory(Sanma.TileUtil);
const ruleConfig = Sanma.RuleConfig.createRuleConfig({});

function player(id, hand, discards, extra) {
  return Object.assign({
    id,
    name: `P${id}`,
    isHuman: id === 0,
    hand: (hand || []).map((code) => tile(code)),
    discards: (discards || []).map((code) => tile(code)),
    melds: [],
    kitaTiles: [],
    points: 35000,
  }, extra || {});
}

const state = {
  ruleConfig,
  round: { dealerIndex: 1 },
  players: [
    player(0, ["1p", "9p", "4p", "4p", "4p", "4p"], ["1s"]),
    player(1, [], ["2p", "8s"], { hasRiichi: true, isHuman: false }),
    player(2, [], ["9m"], { isHuman: false, melds: [{ type: "pon", open: true, tiles: [tile("white"), tile("white"), tile("white")] }] }),
  ],
  wall: {
    tiles: [tile("5p"), tile("5p"), tile("5p")],
    deadWall: [tile("red")],
    doraIndicators: [tile("red")],
    remainingCount() { return this.tiles.length; },
  },
};

const genbutsuDanger = Sanma.CpuRiskAnalysis.scoreTileDangerAgainstOpponent(state, 0, tile("2p"), 1);
const middleDanger = Sanma.CpuRiskAnalysis.scoreTileDangerAgainstOpponent(state, 0, tile("5s"), 1);
assert(genbutsuDanger < middleDanger, "genbutsu must be safer than a live middle tile");

const fourVisibleDanger = Sanma.CpuRiskAnalysis.scoreTileDangerAgainstOpponent(state, 0, tile("4p"), 1);
assert(fourVisibleDanger === 0, "four visible tiles must be treated as safe");

const honorUnknown = Sanma.CpuRiskAnalysis.scoreTileDangerAgainstOpponent(state, 0, tile("east"), 1);
const honorVisibleState = Object.assign({}, state, {
  players: [
    state.players[0],
    player(1, [], ["east", "east", "east"], { hasRiichi: true, isHuman: false }),
    state.players[2],
  ],
});
const honorVisible = Sanma.CpuRiskAnalysis.scoreTileDangerAgainstOpponent(honorVisibleState, 0, tile("east"), 1);
assert(honorVisible < honorUnknown, "visible honor tiles must be safer than an unseen honor");

const noSujiState = Object.assign({}, state, {
  players: [
    state.players[0],
    player(1, [], ["1s"], { hasRiichi: true, isHuman: false }),
    state.players[2],
  ],
});
const sujiDanger = Sanma.CpuRiskAnalysis.scoreTileDangerAgainstOpponent(state, 0, tile("5p"), 1);
const noSujiDanger = Sanma.CpuRiskAnalysis.scoreTileDangerAgainstOpponent(noSujiState, 0, tile("5p"), 1);
assert(sujiDanger < noSujiDanger, "suji must reduce riichi danger");

const kabeDanger = Sanma.CpuRiskAnalysis.scoreTileDangerAgainstOpponent(state, 0, tile("5p"), 1);
const noKabeState = Object.assign({}, state, {
  players: [
    player(0, ["1p", "9p"], ["1s"]),
    state.players[1],
    state.players[2],
  ],
});
const noKabeDanger = Sanma.CpuRiskAnalysis.scoreTileDangerAgainstOpponent(noKabeState, 0, tile("5p"), 1);
assert(kabeDanger < noKabeDanger, "kabe must reduce danger");

assert(
  Sanma.CpuRiskAnalysis.choosePushFoldMode(state, 0, 10, 3) === "fold",
  "strong threat with weak far hand must choose fold"
);
assert(
  Sanma.CpuRiskAnalysis.choosePushFoldMode(state, 0, 80, 0) === "push",
  "valuable tenpai hand must choose push"
);

const hiddenWallA = Sanma.CpuRiskAnalysis.scoreTileDanger(state, 0, tile("6p"));
state.wall.tiles.push(tile("6p"), tile("6p"), tile("6p"));
state.wall.deadWall.push(tile("6p"));
const hiddenWallB = Sanma.CpuRiskAnalysis.scoreTileDanger(state, 0, tile("6p"));
assert(hiddenWallA === hiddenWallB, "risk analysis must not inspect hidden wall or dead wall identities");

console.log("CPU risk analysis tests passed.");
