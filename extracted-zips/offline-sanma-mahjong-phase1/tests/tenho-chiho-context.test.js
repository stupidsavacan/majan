const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const kokushiThirteenWait = ["1m", "9m", "1p", "9p", "1s", "9s", "z1", "z2", "z3", "z4", "z5", "z6", "z7", "1m"];
const winningWait = ["3p", "4p", "2s", "3s", "4s", "6p", "7p", "8p", "6s", "7s", "8s", "2p", "2p"];
const filler = ["1m", "9m", "1p", "2p", "3p", "4p", "6p", "7p", "8p", "1s", "2s", "3s", "z1"];

const tenho = createEngine(Sanma, "tenho-real-flow", { doubleYakuman: true });
arrangeEngine(Sanma, tenho, {
  turnIndex: 0,
  players: [
    { hand: kokushiThirteenWait },
    { hand: filler, lastDraw: false },
    { hand: filler, lastDraw: false },
  ],
});
tenho.humanPlayer.lastDraw = tenho.humanPlayer.hand.find((tile) => tile.baseId === "1m");
assert(tenho.claimHumanTsumo() !== false, "親の配牌直後ツモ和了を解決できません");
assert(tenho.winResult.yaku.yakuman.some((item) => item.id === "tenho"), "実GameEngine配牌直後和了に天和がありません");
assert(tenho.winResult.yaku.yakuman.some((item) => item.id === "kokushi-musou-13-wait"), "実GameEngine天和に国士13面待ちがありません");
assert(tenho.winResult.score.yakumanCount === 3, "天和+国士13面待ちを3倍役満として得点計算しません");

function prepareChiho(seed, interrupted) {
  const engine = createEngine(Sanma, seed, {});
  arrangeEngine(Sanma, engine, {
    turnIndex: 1,
    players: [
      { hand: filler, lastDraw: false },
      { hand: winningWait, lastDraw: false },
      { hand: filler, lastDraw: false },
    ],
  });
  engine.noteOpeningDiscard(0);
  if (interrupted) engine.markOpeningInterrupted("テスト割り込み");
  const drawIndex = engine.wall.tiles.findIndex((tile) => tile.baseId === "5p");
  assert(drawIndex >= 0, "地和テストの和了牌が山にありません");
  const [winningTile] = engine.wall.tiles.splice(drawIndex, 1);
  engine.wall.tiles.unshift(winningTile);
  engine.tryCpuKita = () => false;
  engine.tryCpuKan = () => false;
  engine.tryCpuRiichi = () => false;
  engine.runCpuUntilHumanTurn();
  return engine;
}

const chiho = prepareChiho("chiho-real-flow", false);
assert(chiho.phase === "win-ended" && chiho.winResult.winnerIndex === 1, "子の第一ツモ和了を解決できません");
assert(chiho.winResult.yaku.yakuman.some((item) => item.id === "chiho"), "実GameEngine第一ツモ和了に地和がありません");

const interrupted = prepareChiho("chiho-interrupted", true);
assert(interrupted.phase === "win-ended", "割り込み後の通常ツモ和了を解決できません");
assert(!interrupted.winResult.yaku.yakuman.some((item) => item.id === "chiho"), "割り込み後の第一ツモへ地和を付与しました");

const laterDealer = createEngine(Sanma, "tenho-later-dealer", {});
arrangeEngine(Sanma, laterDealer, {
  turnIndex: 0,
  players: [
    { hand: ["3p", "4p", "5p", "2s", "3s", "4s", "6p", "7p", "8p", "6s", "7s", "8s", "2p", "2p"] },
    { hand: filler, lastDraw: false },
    { hand: filler, lastDraw: false },
  ],
});
laterDealer.markOpeningInterrupted("後続手番");
laterDealer.lastDrawContext = laterDealer.createNormalDrawContext(laterDealer.humanPlayer);
assert(laterDealer.claimHumanTsumo() !== false, "親の後続ツモ和了を解決できません");
assert(!laterDealer.winResult.yaku.yakuman.some((item) => item.id === "tenho"), "親の後続ツモへ天和を付与しました");

console.log("Phase 14.2 follow-up tenho/chiho runtime context tests passed.");
