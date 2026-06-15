const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const engine = createEngine(Sanma, "cpu-kan-rinshan-win", {});
arrangeEngine(Sanma, engine, {
  turnIndex: 1,
  rinshan: "9m",
  players: [
    { hand: ["1m", "9m", "1p", "2p", "3p", "4p", "7p", "6p", "1s", "2s", "3s", "z1", "z2"], lastDraw: false },
    { hand: ["5p", "5p", "5p", "5p", "1p", "2p", "3p", "1s", "2s", "3s", "z5", "z5", "z5", "9m"] },
    { hand: ["1m", "9m", "1p", "2p", "3p", "4p", "6p", "7p", "1s", "2s", "3s", "z1", "z2"], lastDraw: false },
  ],
});
const cpu = engine.players[1];
const discardCount = cpu.discards.length;
const pointsBefore = engine.players.map((player) => player.points);
assert(engine.tryCpuKan(cpu), "CPUカンから嶺上ツモ和了へ進行しません");
assert(engine.phase === "win-ended" && engine.winResult.winnerIndex === 1, "CPU嶺上ツモで局が終了しません");
assert(engine.winResult.yaku.yaku.some((item) => item.id === "rinshan-kaihou"), "嶺上開花が役へ追加されません");
assert(cpu.discards.length === discardCount, "嶺上ツモ和了後にCPUが打牌しました");
assert(engine.players.some((player, index) => player.points !== pointsBefore[index]), "嶺上ツモ精算が点数へ反映されません");
assert(engine.lastDrawContext && engine.lastDrawContext.isRinshan, "嶺上文脈が保持されません");
assert(Sanma.TileLedger.inspect(engine, engine.ruleConfig).ok, "CPU嶺上ツモ後のTileLedgerが不正です");
assert(Sanma.InvariantChecker.checkState(engine, engine.ruleConfig).ok, "CPU嶺上ツモ後のInvariantCheckerが失敗しました");

console.log("Phase 14.2 CPU kan rinshan win tests passed.");
