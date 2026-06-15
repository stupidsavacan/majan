const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const kokushiThirteenWait = ["1m", "9m", "1p", "9p", "1s", "9s", "z1", "z2", "z3", "z4", "z5", "z6", "z7", "1m"];
const winningWait = ["3p", "4p", "2s", "3s", "4s", "6p", "7p", "8p", "6s", "7s", "8s", "2p", "2p"];
const filler = ["1m", "9m", "1p", "2p", "3p", "4p", "6p", "7p", "8p", "1s", "2s", "3s", "z1"];

function currentEvents(engine) {
  return engine.gameRecord.rounds[engine.gameRecord.rounds.length - 1].events;
}

function arrangeDealerWin(engine) {
  arrangeEngine(Sanma, engine, {
    turnIndex: 0,
    players: [
      { hand: kokushiThirteenWait },
      { hand: filler, lastDraw: false },
      { hand: filler, lastDraw: false },
    ],
  });
  engine.humanPlayer.lastDraw = engine.humanPlayer.hand.find((tile) => tile.baseId === "1m");
}

const naturalDealer = createEngine(Sanma, "assist-guard-natural-tenho", { dramaticLuckAssist: false, doubleYakuman: true });
arrangeDealerWin(naturalDealer);
assert(naturalDealer.claimHumanTsumo() !== false, "自然な親配牌和了を解決できません");
assert(naturalDealer.winResult.yaku.yakuman.some((item) => item.id === "tenho"), "自然な親配牌和了に天和がありません");

const originalOpening = Sanma.AssistManager.evaluateOpening;
Sanma.AssistManager.evaluateOpening = (input) => ({
  type: "assist",
  phase: "opening",
  playerIndex: input.player.id,
  applied: true,
  beforeShanten: 1,
  afterShanten: 0,
  outgoing: input.player.hand[0],
  incoming: input.player.hand[0],
});
const assistedDealer = createEngine(Sanma, "assist-guard-assisted-tenho", { dramaticLuckAssist: true, doubleYakuman: true });
Sanma.AssistManager.evaluateOpening = originalOpening;
arrangeDealerWin(assistedDealer);
assert(assistedDealer.claimHumanTsumo() !== false, "assist適用後の親和了を解決できません");
assert(!assistedDealer.winResult.yaku.yakuman.some((item) => item.id === "tenho"), "assist適用後の親和了に天和を付与しました");
assert(assistedDealer.winResult.yaku.yakuman.some((item) => item.id.startsWith("kokushi")), "assist適用後の通常役満まで失いました");
assert(currentEvents(assistedDealer).some((event) => event.type === "assist"), "開局assistイベントを記録しません");
assert(assistedDealer.humanPlayer.hand.some((tile) => tile.instanceId === assistedDealer.humanPlayer.lastDraw.instanceId), "開局assist後のlastDrawが手牌内にありません");
assert(Sanma.TileLedger.inspect(assistedDealer, assistedDealer.ruleConfig).ok, "開局assist和了後のTileLedgerが不正です");

function runFirstDraw(seed, assisted) {
  const engine = createEngine(Sanma, seed, { dramaticLuckAssist: assisted, dramaticDrawAssist: assisted });
  arrangeEngine(Sanma, engine, {
    turnIndex: 1,
    players: [
      { hand: filler, lastDraw: false },
      { hand: winningWait, lastDraw: false },
      { hand: filler, lastDraw: false },
    ],
  });
  engine.players[1].hasRiichi = true;
  engine.noteOpeningDiscard(0);
  const drawIndex = engine.wall.tiles.findIndex((tile) => tile.baseId === "5p");
  assert(drawIndex >= 0, "地和assistテストの和了牌が山にありません");
  const [winningTile] = engine.wall.tiles.splice(drawIndex, 1);
  engine.wall.tiles.unshift(winningTile);
  engine.tryCpuKita = () => false;
  engine.tryCpuKan = () => false;
  engine.tryCpuRiichi = () => false;
  const originalDraw = Sanma.AssistManager.evaluateDraw;
  if (assisted) {
    Sanma.AssistManager.evaluateDraw = (input) => ({
      type: "assist",
      phase: "draw",
      playerIndex: input.player.id,
      applied: true,
      beforeShanten: 1,
      afterShanten: 0,
      outgoing: input.player.lastDraw,
      incoming: input.player.lastDraw,
    });
  }
  engine.runCpuUntilHumanTurn();
  Sanma.AssistManager.evaluateDraw = originalDraw;
  return engine;
}

const naturalChiho = runFirstDraw("assist-guard-natural-chiho", false);
assert(naturalChiho.winResult.yaku.yakuman.some((item) => item.id === "chiho"), "自然な子の第一ツモに地和がありません");

const assistedChiho = runFirstDraw("assist-guard-assisted-chiho", true);
assert(assistedChiho.phase === "win-ended", "assist適用後の子の第一ツモ和了を解決できません");
assert(!assistedChiho.winResult.yaku.yakuman.some((item) => item.id === "chiho"), "assist適用後の子の第一ツモに地和を付与しました");
assert(assistedChiho.winResult.yaku.yaku.some((item) => ["riichi", "menzen-tsumo", "tanyao"].includes(item.id)), "assist適用後の通常役を評価しません");
assert(currentEvents(assistedChiho).some((event) => event.type === "assist"), "第一ツモassistイベントを記録しません");
assert(assistedChiho.players[1].hand.some((tile) => tile.instanceId === assistedChiho.players[1].lastDraw.instanceId), "第一ツモassist後のlastDrawが手牌内にありません");
assert(Sanma.TileLedger.inspect(assistedChiho, assistedChiho.ruleConfig).ok, "第一ツモassist和了後のTileLedgerが不正です");

console.log("Phase 14.2C opening yaku assist guard tests passed.");
