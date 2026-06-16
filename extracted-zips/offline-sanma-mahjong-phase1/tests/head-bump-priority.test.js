const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const waitOne = ["3p", "4p", "2s", "3s", "4s", "6p", "7p", "8p", "6s", "7s", "8s", "2p", "2p"];
const waitTwo = ["3p", "4p", "2s", "3s", "4s", "6s", "7s", "8s", "6p", "7p", "8p", "4s", "4s"];
const filler = ["1m", "1m", "1m", "9m", "9m", "9m", "1p", "1p", "1p", "9p", "9p", "9p", "z1"];

function arrangeDiscard(seed, discarderIndex, setups) {
  const engine = createEngine(Sanma, seed, { dramaticLuckAssist: false });
  arrangeEngine(Sanma, engine, { turnIndex: discarderIndex, players: setups });
  const discard = engine.players[discarderIndex].discards.find((tile) => tile.baseId === "5p");
  assert(discard, "頭ハネテスト用の5p捨て牌がありません");
  engine.lastDiscard = { playerIndex: discarderIndex, tile: discard };
  return engine;
}

const cpuNearest = arrangeDiscard("head-bump-cpu-nearest", 1, [
  { hand: waitOne, lastDraw: false },
  { hand: filler, discards: ["5p"], lastDraw: false },
  { hand: waitTwo, lastDraw: false },
]);
assert(cpuNearest.findCpuRonAfterDiscard(1).playerIndex === 2, "CPU補助ロン判定が最寄りCPUを選びません");
assert(cpuNearest.resolveRonCandidatesAfterDiscard(1), "CPU最寄りロンを解決できません");
assert(cpuNearest.phase === "win-ended" && cpuNearest.winResult.winnerIndex === 2, "遠い人間が最寄りCPUのロンを奪いました");
assert(!cpuNearest.callWindow, "遠い人間向けロン窓が開きました");
assert(Sanma.TileLedger.inspect(cpuNearest, cpuNearest.ruleConfig).ok, "CPU最寄りロン後のTileLedgerが不正です");

const humanNearest = arrangeDiscard("head-bump-human-nearest", 2, [
  { hand: waitOne, lastDraw: false },
  { hand: waitTwo, lastDraw: false },
  { hand: filler, discards: ["5p"], lastDraw: false },
]);
assert(humanNearest.findCpuRonAfterDiscard(2) === null, "CPU補助ロン判定が最寄り人間を飛び越えました");
assert(humanNearest.resolveRonCandidatesAfterDiscard(2), "人間最寄りロン候補を解決できません");
assert(humanNearest.phase === "human-call", "最寄り人間向けロン窓が開きません");
assert(humanNearest.callWindow.pendingCpuRonCandidate.playerIndex === 1, "人間見逃し後の次順位CPUを保持していません");
assert(humanNearest.skipHumanCall(), "最寄り人間の見逃しを処理できません");
assert(humanNearest.winResult.winnerIndex === 1, "人間見逃し後に次順位CPUが勝ちません");
assert(humanNearest.humanPlayer.sameTurnFuriten, "人間見逃しが同巡フリテンになりません");
assert(Sanma.TileLedger.inspect(humanNearest, humanNearest.ruleConfig).ok, "人間見逃し後CPUロンのTileLedgerが不正です");

const cpuOnly = arrangeDiscard("head-bump-cpu-only", 0, [
  { hand: filler, discards: ["5p"], lastDraw: false },
  { hand: waitOne, lastDraw: false },
  { hand: waitTwo, lastDraw: false },
]);
assert(cpuOnly.resolveRonCandidatesAfterDiscard(0), "複数CPUロン候補を解決できません");
assert(cpuOnly.winResult.winnerIndex === 1, "最小priorityOffsetのCPUを選びません");

const furitenNearest = arrangeDiscard("head-bump-furiten", 0, [
  { hand: filler, discards: ["5p"], lastDraw: false },
  { hand: waitOne, discards: ["5p"], lastDraw: false },
  { hand: waitTwo, lastDraw: false },
]);
assert(furitenNearest.resolveRonCandidatesAfterDiscard(0), "フリテン除外後のCPUロンを解決できません");
assert(furitenNearest.winResult.winnerIndex === 2, "フリテン候補を頭ハネ優先順から除外しません");
assert(Sanma.TileLedger.inspect(furitenNearest, furitenNearest.ruleConfig).ok, "フリテン除外後ロンのTileLedgerが不正です");

console.log("Phase 14.2D head-bump ron priority tests passed.");
