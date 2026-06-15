const fs = require("fs");
const path = require("path");
const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");
const { projectRoot } = require("./test-helpers");

const Sanma = loadModules();
const waitOne = ["3p", "4p", "2s", "3s", "4s", "6p", "7p", "8p", "6s", "7s", "8s", "2p", "2p"];
const waitTwo = ["3p", "4p", "2s", "3s", "4s", "6s", "7s", "8s", "6p", "7p", "8p", "4s", "4s"];

assert(Sanma.RuleConfig.defaultRuleConfig.doubleRonPolicy.allowed === false, "既定doubleRonPolicy.allowedがfalseではありません");
assert(Sanma.RuleConfig.createRuleConfig({ doubleRonPolicy: { allowed: true } }).doubleRonPolicy.allowed === false, "未実装のダブロンを設定で有効化できました");

function arrangeCandidates(seed, discarderIndex, humanCandidate) {
  const engine = createEngine(Sanma, seed, { dramaticLuckAssist: false });
  const players = [
    humanCandidate ? { hand: waitOne, lastDraw: false } : { hand: ["5p"], lastDraw: false },
    { hand: humanCandidate ? waitTwo : waitOne, lastDraw: false },
    { hand: humanCandidate ? ["5p"] : waitTwo, lastDraw: false },
  ];
  if (!humanCandidate) players[0].discards = ["5p"];
  else players[2].discards = ["5p"];
  arrangeEngine(Sanma, engine, { turnIndex: discarderIndex, players });
  engine.players.forEach((player) => { player.hasRiichi = true; });
  engine.lastDiscard = {
    playerIndex: discarderIndex,
    tile: engine.players[discarderIndex].discards[0] || engine.players[discarderIndex].hand[0],
  };
  return engine;
}

const cpuOnly = arrangeCandidates("no-double-cpu", 0, false);
assert(cpuOnly.resolveRonCandidatesAfterDiscard(0), "複数CPUロン候補を解決できません");
assert(cpuOnly.phase === "win-ended" && cpuOnly.winResult.winnerIndex === 1, "捨てたプレイヤーから最寄りのCPU一人を選択しません");

const humanFirst = arrangeCandidates("no-double-human", 2, true);
assert(humanFirst.resolveRonCandidatesAfterDiscard(2), "人間とCPUのロン候補を解決できません");
assert(humanFirst.phase === "human-call" && humanFirst.callWindow.pendingCpuRonCandidate.playerIndex === 1, "人間ロン窓をCPUロンより先に開きません");
assert(humanFirst.skipHumanCall(), "人間ロン見逃しを処理できません");
assert(humanFirst.phase === "win-ended" && humanFirst.winResult.winnerIndex === 1, "人間見逃し後に最寄りCPUロンを解決しません");

const chankanCpu = createEngine(Sanma, "no-double-chankan-cpu", { dramaticLuckAssist: false });
arrangeEngine(Sanma, chankanCpu, {
  turnIndex: 0,
  players: [
    { hand: ["5p"] },
    { hand: waitOne, lastDraw: false },
    { hand: waitTwo, lastDraw: false },
  ],
});
const cpuInterrupts = chankanCpu.findChankanInterrupts({
  playerIndex: 0,
  kanType: "kakan",
  declaredTile: chankanCpu.players[0].hand[0],
});
assert(cpuInterrupts.length === 2, "複数CPU槍槓候補を収集できません");
assert(chankanCpu.openOrResolveChankan(cpuInterrupts, {
  playerIndex: 0,
  kanType: "kakan",
  declaredTile: chankanCpu.players[0].hand[0],
}), "複数CPU槍槓候補を解決できません");
assert(chankanCpu.winResult.winnerIndex === 1, "複数CPU槍槓で最寄りCPU一人を選びません");

const chankanHuman = createEngine(Sanma, "no-double-chankan-human", { dramaticLuckAssist: false });
arrangeEngine(Sanma, chankanHuman, {
  turnIndex: 2,
  players: [
    { hand: waitOne, lastDraw: false },
    { hand: waitTwo, lastDraw: false },
    { hand: ["5p"] },
  ],
});
const mixedInterrupts = chankanHuman.findChankanInterrupts({
  playerIndex: 2,
  kanType: "kakan",
  declaredTile: chankanHuman.players[2].hand[0],
});
assert(chankanHuman.openOrResolveChankan(mixedInterrupts, {
  playerIndex: 2,
  kanType: "kakan",
  declaredTile: chankanHuman.players[2].hand[0],
}), "人間とCPUの槍槓候補を解決できません");
assert(chankanHuman.phase === "human-call" && chankanHuman.callWindow.pendingCpuRonCandidate.playerIndex === 1, "人間槍槓窓をCPU槍槓より先に開きません");

const readme = fs.readFileSync(path.resolve(projectRoot, "README.md"), "utf8");
assert(readme.includes("ダブロン") && readme.includes("未実装"), "READMEがダブロン未実装を明記していません");

console.log("Phase 14.2C no-double-ron policy tests passed.");
