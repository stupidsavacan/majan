const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const humanHand = ["z4", "1m", "9m", "1p", "2p", "3p", "4p", "5p", "6p", "1s", "2s", "3s", "z1", "z2"];
const cpuHand = ["z4", "1m", "9m", "1p", "2p", "3p", "4p", "5p", "6p", "1s", "2s", "3s", "z1", "z2"];
const filler = ["1m", "9m", "1p", "2p", "3p", "4p", "5p", "6p", "1s", "2s", "3s", "z1", "z2"];
const originalEvaluateDraw = Sanma.AssistManager.evaluateDraw;
const calls = [];
Sanma.AssistManager.evaluateDraw = ({ player }) => {
  calls.push(player.id);
  return {
    applied: true,
    phase: "draw",
    playerIndex: player.id,
    beforeShanten: 2,
    afterShanten: 1,
    outgoing: player.lastDraw,
    incoming: player.lastDraw,
  };
};

const human = createEngine(Sanma, "human-kita-assist", {});
arrangeEngine(Sanma, human, {
  turnIndex: 0,
  players: [
    { hand: humanHand },
    { hand: filler, lastDraw: false },
    { hand: filler, lastDraw: false },
  ],
});
const north = human.humanPlayer.hand.find((tile) => tile.baseId === "z4");
assert(human.extractHumanKita(north.instanceId) !== false, "人間の北抜きを実行できません");
assert(calls.includes(0), "人間北抜き補充牌でAssistManager.evaluateDrawを呼びません");
assert(human.assistEvents.some((event) => event.applied && event.playerIndex === 0), "人間北抜きassistイベントを記録しません");
assert(human.humanPlayer.lastDraw && human.humanPlayer.hand.some((tile) => tile.instanceId === human.humanPlayer.lastDraw.instanceId), "人間北抜きassist後のlastDrawが手牌内にありません");
assert(human.phase === "human-discard" && human.turnIndex === 0, "人間北抜きassist後の操作状態が不正です");
assert(Sanma.TileLedger.inspect(human, human.ruleConfig).ok, "人間北抜きassist後のTileLedgerが不正です");

const cpu = createEngine(Sanma, "cpu-kita-assist-consistency", {});
arrangeEngine(Sanma, cpu, {
  turnIndex: 1,
  players: [
    { hand: filler, lastDraw: false },
    { hand: cpuHand },
    { hand: filler, lastDraw: false },
  ],
});
cpu.tryCpuTsumo = () => false;
assert(!cpu.tryCpuKita(cpu.players[1]), "通常のCPU北抜きが局終了状態になりました");
assert(calls.includes(1), "CPU北抜き補充牌のassist評価が失われました");
assert(cpu.players[1].lastDraw && cpu.players[1].hand.some((tile) => tile.instanceId === cpu.players[1].lastDraw.instanceId), "CPU北抜きassist後のlastDrawが手牌内にありません");
assert(Sanma.TileLedger.inspect(cpu, cpu.ruleConfig).ok, "CPU北抜きassist後のTileLedgerが不正です");
Sanma.AssistManager.evaluateDraw = originalEvaluateDraw;

console.log("Phase 14.2 follow-up kita assist consistency tests passed.");
