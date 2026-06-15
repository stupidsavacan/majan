const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();

function forceOpeningSwap(engine, player) {
  const outgoing = player.lastDraw;
  const incoming = engine.wall.tiles[0];
  const originalChooseDiscard = Sanma.CpuStrategy.chooseDiscard;
  const originalEstimateShanten = Sanma.CpuStrategy.estimateShanten;
  Sanma.CpuStrategy.chooseDiscard = () => ({ tileInstanceId: outgoing.instanceId });
  Sanma.CpuStrategy.estimateShanten = ({ tiles }) =>
    tiles.some((tile) => tile.instanceId === incoming.instanceId) ? 0 : 1;
  const event = Sanma.AssistManager.evaluateOpening({
    state: engine,
    ruleConfig: Object.assign({}, engine.ruleConfig, {
      dramaticLuckAssist: true,
      dramaticOpeningHandRate: 1,
    }),
    player,
    random: () => 0,
  });
  Sanma.CpuStrategy.chooseDiscard = originalChooseDiscard;
  Sanma.CpuStrategy.estimateShanten = originalEstimateShanten;
  engine.recordAssist(event);
  return { event, outgoing, incoming };
}

function verify(engine, player, label) {
  const swap = forceOpeningSwap(engine, player);
  assert(swap.event.applied, `${label}: 開幕補助交換が成立しません`);
  assert(player.lastDraw === swap.incoming, `${label}: lastDrawが交換後の牌を指していません`);
  assert(player.hand.some((tile) => tile.instanceId === player.lastDraw.instanceId), `${label}: lastDrawが手牌内にありません`);
  const analysis = Sanma.ActionResolver.analyzeWin(engine, player.id, "tsumo", null, null);
  assert(analysis.context.winningTile === player.lastDraw, `${label}: ツモ解析が有効なlastDrawを使用していません`);
  const assistRecord = engine.gameRecord.rounds[0].events.filter((event) => event.type === "assist").pop();
  assert(
    assistRecord
      && assistRecord.data.outgoing.instanceId === swap.outgoing.instanceId
      && assistRecord.data.incoming.instanceId === swap.incoming.instanceId,
    `${label}: 補助イベントの交換牌記録が不正です`
  );
  assert(Sanma.TileLedger.inspect(engine, engine.ruleConfig).ok, `${label}: TileLedgerが不正です`);
}

const humanDealer = createEngine(Sanma, "assist-lastdraw-human", { dramaticLuckAssist: false });
verify(humanDealer, humanDealer.humanPlayer, "人間親");

const cpuDealer = createEngine(Sanma, "assist-lastdraw-cpu", { dramaticLuckAssist: false });
arrangeEngine(Sanma, cpuDealer, {
  turnIndex: 1,
  players: [
    { hand: ["1m", "9m", "1p", "2p", "3p", "4p", "5p", "6p", "1s", "2s", "3s", "z1", "z2"], lastDraw: false },
    { hand: ["1m", "9m", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "1s", "2s", "3s", "z1", "z2"] },
    { hand: ["1m", "9m", "1p", "2p", "3p", "4p", "5p", "6p", "1s", "2s", "3s", "z1", "z2"], lastDraw: false },
  ],
});
cpuDealer.round.dealerIndex = 1;
verify(cpuDealer, cpuDealer.players[1], "CPU親");

console.log("Phase 14.2 assist lastDraw integrity tests passed.");
