const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const kokushiThirteenWait = ["1m", "9m", "1p", "9p", "1s", "9s", "z1", "z2", "z3", "z4", "z5", "z6", "z7", "1m"];
const filler = ["2p", "3p", "4p", "6p", "7p", "8p", "2s", "3s", "4s", "6s", "7s", "8s", "5p"];

function makeCpuDealer(seed, assisted) {
  const engine = createEngine(Sanma, seed, { dramaticLuckAssist: assisted, doubleYakuman: true });
  arrangeEngine(Sanma, engine, {
    turnIndex: 1,
    players: [
      { hand: filler, lastDraw: false },
      { hand: kokushiThirteenWait },
      { hand: filler, lastDraw: false },
    ],
  });
  engine.round.dealerIndex = 1;
  engine.matchManager.state.dealerIndex = 1;
  engine.players[1].seatWind = "east";
  engine.initialDealerDiscardPending = true;
  engine.lastDrawContext = {
    playerIndex: 1,
    isRinshan: false,
    isInitialDealerDraw: true,
    isTenho: !assisted,
    isChiho: false,
  };
  engine.tryCpuKita = () => false;
  engine.tryCpuKan = () => false;
  engine.tryCpuRiichi = () => false;
  return engine;
}

const assistedCpuDealer = makeCpuDealer("phase15-cpu-dealer-assisted-tenho", true);
assistedCpuDealer.runCpuUntilHumanTurn();
assert(assistedCpuDealer.phase === "win-ended", "CPU親の和了形が解決されません");
assert(
  !assistedCpuDealer.winResult.yaku.yakuman.some((item) => item.id === "tenho"),
  "開局Assist適用後のCPU親に天和が復活しました"
);
assert(
  assistedCpuDealer.winResult.yaku.yakuman.some((item) => item.id.startsWith("kokushi")),
  "天和ガード後も通常の役満が消えてはいけません"
);

const naturalCpuDealer = makeCpuDealer("phase15-cpu-dealer-natural-tenho", false);
naturalCpuDealer.runCpuUntilHumanTurn();
assert(naturalCpuDealer.phase === "win-ended", "自然なCPU親天和が解決されません");
assert(
  naturalCpuDealer.winResult.yaku.yakuman.some((item) => item.id === "tenho"),
  "AssistなしのCPU親天和が維持されていません"
);

assert(Sanma.TileLedger.inspect(assistedCpuDealer, assistedCpuDealer.ruleConfig).ok, "Assist後CPU親天和ガードでTileLedgerが壊れました");
assert(Sanma.TileLedger.inspect(naturalCpuDealer, naturalCpuDealer.ruleConfig).ok, "自然CPU親天和でTileLedgerが壊れました");

console.log("Phase 15 CPU dealer opening assist tenho guard tests passed.");
