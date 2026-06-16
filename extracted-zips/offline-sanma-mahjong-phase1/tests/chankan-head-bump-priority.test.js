const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const waitOne = ["3p", "4p", "2s", "3s", "4s", "6p", "7p", "8p", "6s", "7s", "8s", "2p", "2p"];
const waitTwo = ["3p", "4p", "2s", "3s", "4s", "6s", "7s", "8s", "6p", "7p", "8p", "4s", "4s"];
const filler = ["1p", "2p", "3p", "6p", "7p", "8p", "1s", "2s", "3s", "9s"];
const kokushiWait = ["9m", "1p", "9p", "1s", "9s", "z1", "z2", "z3", "z4", "z5", "z6", "z7", "9m"];

function beginKakan(seed, declarerIndex, playerHands) {
  const engine = createEngine(Sanma, seed, { dramaticLuckAssist: false });
  const players = playerHands.map((hand) => ({ hand, lastDraw: false }));
  players[declarerIndex] = {
    hand: ["5p"].concat(filler),
    melds: [{ type: "pon", open: true, fromPlayerIndex: (declarerIndex + 1) % 3, tiles: ["5p", "5p", "5p"] }],
  };
  arrangeEngine(Sanma, engine, { turnIndex: declarerIndex, players });
  const option = Sanma.KanRules.getAvailableKanActions({ state: engine, playerIndex: declarerIndex })
    .find((candidate) => candidate.type === "kakan");
  assert(option, "頭ハネ槍槓テスト用の加槓候補がありません");
  assert(engine.beginKanAttempt(declarerIndex, option), "加槓試行を開始できません");
  return engine;
}

const cpuNearest = beginKakan("chankan-head-cpu-nearest", 1, [waitOne, [], waitTwo]);
assert(cpuNearest.phase === "win-ended" && cpuNearest.winResult.winnerIndex === 2, "遠い人間が最寄りCPU槍槓を奪いました");
assert(!cpuNearest.callWindow, "遠い人間向け槍槓窓が開きました");
assert(Sanma.TileLedger.inspect(cpuNearest, cpuNearest.ruleConfig).ok, "CPU最寄り槍槓後のTileLedgerが不正です");

const humanNearest = beginKakan("chankan-head-human-nearest", 2, [waitOne, waitTwo, []]);
assert(humanNearest.phase === "human-call" && humanNearest.callWindow.kind === "chankan", "最寄り人間向け槍槓窓が開きません");
assert(humanNearest.callWindow.pendingCpuRonCandidate.playerIndex === 1, "人間槍槓見逃し後の次順位CPUを保持していません");
assert(humanNearest.skipHumanCall(), "人間槍槓見逃しを処理できません");
assert(humanNearest.winResult.winnerIndex === 1, "人間槍槓見逃し後に次順位CPUが勝ちません");
assert(Sanma.TileLedger.inspect(humanNearest, humanNearest.ruleConfig).ok, "槍槓見逃し後のTileLedgerが不正です");

const cpuOnly = beginKakan("chankan-head-cpu-only", 0, [[], waitOne, waitTwo]);
assert(cpuOnly.winResult.winnerIndex === 1, "複数CPU槍槓で最小priorityOffsetのCPUを選びません");

const kokushi = createEngine(Sanma, "chankan-head-kokushi", { dramaticLuckAssist: false });
arrangeEngine(Sanma, kokushi, {
  turnIndex: 0,
  players: [
    { hand: ["1m", "1m", "1m", "1m", "2p", "3p", "4p", "6p", "7p", "8p", "2s", "3s", "4s", "5s"] },
    { hand: kokushiWait, lastDraw: false },
    { hand: waitOne, lastDraw: false },
  ],
});
const ankan = Sanma.KanRules.getAvailableKanActions({ state: kokushi, playerIndex: 0 })
  .find((candidate) => candidate.type === "ankan");
assert(kokushi.beginKanAttempt(0, ankan), "国士暗槓槍槓を開始できません");
assert(kokushi.winResult.context.isChankan && kokushi.winResult.winnerIndex === 1, "国士暗槓槍槓例外を維持していません");

const nonKokushi = createEngine(Sanma, "chankan-head-non-kokushi", { dramaticLuckAssist: false });
arrangeEngine(Sanma, nonKokushi, {
  turnIndex: 0,
  players: [
    { hand: ["1m", "1m", "1m", "1m", "2p", "3p", "4p", "6p", "7p", "8p", "2s", "3s", "4s", "5s"] },
    { hand: waitOne, lastDraw: false },
    { hand: ["1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "1s", "2s", "3s", "4s"], lastDraw: false },
  ],
});
const ordinaryAnkan = Sanma.KanRules.getAvailableKanActions({ state: nonKokushi, playerIndex: 0 })
  .find((candidate) => candidate.type === "ankan");
assert(nonKokushi.beginKanAttempt(0, ordinaryAnkan), "通常暗槓を開始できません");
assert(nonKokushi.phase !== "win-ended" && nonKokushi.players[0].melds[0].kanType === "ankan", "非国士が暗槓を槍槓しました");
assert(Sanma.TileLedger.inspect(nonKokushi, nonKokushi.ruleConfig).ok, "通常暗槓後のTileLedgerが不正です");

console.log("Phase 14.2D chankan head-bump priority tests passed.");
