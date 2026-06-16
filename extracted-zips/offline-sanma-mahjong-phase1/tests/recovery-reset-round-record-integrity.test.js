const { assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const engine = createEngine(Sanma, "phase15-recovery-reset-record", {});
const beforeRoundCount = engine.gameRecord.rounds.length;
Sanma.GameRecord.addEvent(engine.gameRecord, "discard", { playerIndex: 0 });
const result = Sanma.RecoveryManager.resetCurrentRound(engine);
assert(result.ok, "RecoveryManager.resetCurrentRoundが成功しません");
assert(engine.gameRecord.rounds.length === beforeRoundCount + 1, "Recovery reset後に新roundが追加されません");
const previousRound = engine.gameRecord.rounds[beforeRoundCount - 1];
assert(previousRound.result && previousRound.result.recovery, "Recovery reset前のroundにrecovery resultが残りません");
assert(previousRound.recovery && previousRound.recovery.type === "reset_current_round", "Recovery reset理由が牌譜に保存されません");
const replay = Sanma.ReplayViewer.create(engine.gameRecord);
Sanma.ReplayViewer.jumpToEnd(replay);
assert(replay.view, "Recovery reset牌譜をReplayViewerが読み込めません");
assert(engine.phase === "human-discard" || engine.phase === "cpu-running" || engine.phase === "human-call", "Recovery reset後に対局進行可能なphaseではありません");

console.log("Phase 15 recovery reset round record integrity tests passed.");
