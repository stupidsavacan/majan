const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const winningWait = ["3p", "4p", "2s", "3s", "4s", "6p", "7p", "8p", "6s", "7s", "8s", "2p", "2p"];
const discardHand = ["5p", "1m", "1m", "1m", "9m", "9m", "9m", "1p", "1p", "1p", "9p", "9p", "9p", "z1"];

function bothCandidates(seed) {
  const engine = createEngine(Sanma, seed, {});
  arrangeEngine(Sanma, engine, {
    turnIndex: 2,
    players: [
      { hand: winningWait, lastDraw: false },
      { hand: winningWait, lastDraw: false },
      { hand: discardHand },
    ],
  });
  engine.tryCpuTsumo = () => false;
  engine.tryCpuKita = () => false;
  engine.tryCpuKan = () => false;
  engine.tryCpuRiichi = () => false;
  engine.chooseCpuDiscardIndex = (player) => player.hand.findIndex((tile) => tile.baseId === "5p");
  engine.runCpuUntilHumanTurn();
  return engine;
}

const skipped = bothCandidates("ron-priority-skip");
assert(skipped.phase === "human-call", "人間とCPUがロン可能なとき人間ロン窓を先に開きません");
assert(skipped.callWindow.actions.length === 1 && skipped.callWindow.actions[0].id === "ron", "CPUロン候補がある人間窓に非ロン操作を残しました");
assert(skipped.callWindow.pendingCpuRonCandidate && skipped.callWindow.pendingCpuRonCandidate.playerIndex === 1, "人間見逃し後のCPUロン候補を保持していません");
assert(skipped.skipHumanCall(), "人間ロン見逃しを処理できません");
assert(skipped.phase === "win-ended" && skipped.winResult.winnerIndex === 1, "人間見逃し後に最寄りCPUロンを解決しません");
assert(Sanma.TileLedger.inspect(skipped, skipped.ruleConfig).ok, "人間見逃し後CPUロンのTileLedgerが不正です");

const accepted = bothCandidates("ron-priority-accept");
const cpuPointsBefore = accepted.players[1].points;
assert(accepted.claimHumanRon(), "人間ロンを受理できません");
assert(accepted.phase === "win-ended" && accepted.winResult.winnerIndex === 0, "CPUロンが人間ロンを横取りしました");
assert(accepted.players[1].points === cpuPointsBefore, "人間ロン受理後にCPUロンも精算しました");
assert(Sanma.TileLedger.inspect(accepted, accepted.ruleConfig).ok, "人間ロン受理後のTileLedgerが不正です");

console.log("Phase 14.2 follow-up human ron priority tests passed.");
