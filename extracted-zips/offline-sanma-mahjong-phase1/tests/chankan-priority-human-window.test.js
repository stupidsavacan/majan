const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const winningWait = ["3p", "4p", "2s", "3s", "4s", "6p", "7p", "8p", "6s", "7s", "8s", "2p", "2p"];
const secondWinningWait = ["3p", "4p", "2s", "3s", "4s", "6s", "7s", "8s", "6p", "7p", "8p", "4s", "4s"];
const filler = ["1p", "2p", "3p", "6p", "7p", "8p", "1s", "2s", "3s", "9s"];

function bothCandidates(seed) {
  const engine = createEngine(Sanma, seed, {});
  arrangeEngine(Sanma, engine, {
    turnIndex: 2,
    players: [
      { hand: winningWait, lastDraw: false },
      { hand: secondWinningWait, lastDraw: false },
      {
        hand: ["5p"].concat(filler),
        melds: [{ type: "pon", open: true, fromPlayerIndex: 1, tiles: ["5p", "5p", "5p"] }],
      },
    ],
  });
  const option = Sanma.KanRules.getAvailableKanActions({ state: engine, playerIndex: 2 })
    .find((candidate) => candidate.type === "kakan");
  assert(option, "人間・CPU槍槓優先テストの加槓候補がありません");
  assert(engine.beginKanAttempt(2, option), "人間・CPU槍槓優先テストの加槓を開始できません");
  return engine;
}

const skipped = bothCandidates("chankan-priority-skip");
assert(skipped.phase === "human-call" && skipped.callWindow.kind === "chankan", "人間とCPUが槍槓可能なとき人間槍槓窓を先に開きません");
assert(skipped.callWindow.pendingCpuRonCandidate && skipped.callWindow.pendingCpuRonCandidate.playerIndex === 1, "人間見逃し後のCPU槍槓候補を保持していません");
assert(skipped.skipHumanCall(), "人間槍槓見逃しを処理できません");
assert(skipped.phase === "win-ended" && skipped.winResult.winnerIndex === 1, "人間槍槓見逃し後にCPU槍槓を解決しません");
assert(skipped.players[2].melds[0].tiles.length === 3, "CPU槍槓成立後に加槓を確定しました");
assert(Sanma.TileLedger.inspect(skipped, skipped.ruleConfig).ok, "CPU槍槓成立後のTileLedgerが不正です");

const accepted = bothCandidates("chankan-priority-accept");
assert(accepted.claimHumanRon(), "人間槍槓ロンを受理できません");
assert(accepted.phase === "win-ended" && accepted.winResult.winnerIndex === 0, "CPU槍槓が人間槍槓を横取りしました");
assert(accepted.winResult.context.isChankan, "人間槍槓の和了文脈がありません");
assert(accepted.players[2].melds[0].tiles.length === 3, "人間槍槓成立後に加槓を確定しました");
assert(Sanma.TileLedger.inspect(accepted, accepted.ruleConfig).ok, "人間槍槓成立後のTileLedgerが不正です");

console.log("Phase 14.2 follow-up human chankan priority tests passed.");
