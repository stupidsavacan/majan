const fs = require("fs");
const path = require("path");
const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");
const { projectRoot } = require("./test-helpers");

const Sanma = loadModules();
const waitOne = ["3p", "4p", "2s", "3s", "4s", "6p", "7p", "8p", "6s", "7s", "8s", "2p", "2p"];
const waitTwo = ["3p", "4p", "2s", "3s", "4s", "6s", "7s", "8s", "6p", "7p", "8p", "4s", "4s"];

assert(Sanma.RuleConfig.defaultRuleConfig.doubleRonPolicy.allowed === false, "譌｢螳單oubleRonPolicy.allowed縺掲alse縺ｧ縺ｯ縺ゅｊ縺ｾ縺帙ｓ");
assert(Sanma.RuleConfig.createRuleConfig({ doubleRonPolicy: { allowed: true } }).doubleRonPolicy.allowed === false, "譛ｪ螳溯｣・・繝繝悶Ο繝ｳ繧定ｨｭ螳壹〒譛牙柑蛹悶〒縺阪∪縺励◆");

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
assert(cpuOnly.resolveRonCandidatesAfterDiscard(0), "隍・焚CPU繝ｭ繝ｳ蛟呵｣懊ｒ隗｣豎ｺ縺ｧ縺阪∪縺帙ｓ");
assert(cpuOnly.phase === "win-ended" && cpuOnly.winResult.winnerIndex === 1, "謐ｨ縺ｦ縺溘・繝ｬ繧､繝､繝ｼ縺九ｉ譛蟇・ｊ縺ｮCPU荳莠ｺ繧帝∈謚槭＠縺ｾ縺帙ｓ");

const humanFirst = arrangeCandidates("no-double-human", 2, true);
assert(humanFirst.resolveRonCandidatesAfterDiscard(2), "莠ｺ髢薙→CPU縺ｮ繝ｭ繝ｳ蛟呵｣懊ｒ隗｣豎ｺ縺ｧ縺阪∪縺帙ｓ");
assert(humanFirst.phase === "human-call" && humanFirst.callWindow.pendingCpuRonCandidate.playerIndex === 1, "莠ｺ髢薙Ο繝ｳ遯薙ｒCPU繝ｭ繝ｳ繧医ｊ蜈医↓髢九″縺ｾ縺帙ｓ");
assert(humanFirst.skipHumanCall(), "莠ｺ髢薙Ο繝ｳ隕矩・＠繧貞・逅・〒縺阪∪縺帙ｓ");
assert(humanFirst.phase === "win-ended" && humanFirst.winResult.winnerIndex === 1, "莠ｺ髢楢ｦ矩・＠蠕後↓譛蟇・ｊCPU繝ｭ繝ｳ繧定ｧ｣豎ｺ縺励∪縺帙ｓ");

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
assert(cpuInterrupts.length === 2, "隍・焚CPU讒肴ｧ灘呵｣懊ｒ蜿朱寔縺ｧ縺阪∪縺帙ｓ");
assert(chankanCpu.openOrResolveChankan(cpuInterrupts, {
  playerIndex: 0,
  kanType: "kakan",
  declaredTile: chankanCpu.players[0].hand[0],
}), "隍・焚CPU讒肴ｧ灘呵｣懊ｒ隗｣豎ｺ縺ｧ縺阪∪縺帙ｓ");
assert(chankanCpu.winResult.winnerIndex === 1, "隍・焚CPU讒肴ｧ薙〒譛蟇・ｊCPU荳莠ｺ繧帝∈縺ｳ縺ｾ縺帙ｓ");

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
}), "莠ｺ髢薙→CPU縺ｮ讒肴ｧ灘呵｣懊ｒ隗｣豎ｺ縺ｧ縺阪∪縺帙ｓ");
assert(chankanHuman.phase === "human-call" && chankanHuman.callWindow.pendingCpuRonCandidate.playerIndex === 1, "莠ｺ髢捺ｧ肴ｧ鍋ｪ薙ｒCPU讒肴ｧ薙ｈ繧雁・縺ｫ髢九″縺ｾ縺帙ｓ");

const readme = fs.readFileSync(path.resolve(projectRoot, "README.md"), "utf8");
assert(readme.includes("ダブロンは未実装"), "READMEがダブロン未実装を明記していません");

console.log("Phase 14.2C no-double-ron policy tests passed.");
