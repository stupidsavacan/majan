const { assert, loadModules } = require("./test-helpers");

const Sanma = loadModules();

function arrangeAssistEngine(engine) {
  const pool = engine.wall.tiles.concat(engine.wall.deadWall);
  engine.players.forEach((player) => {
    pool.push(...player.hand);
    player.hand = [];
    player.discards = [];
    player.melds = [];
    player.kitaTiles = [];
  });
  function take(baseId) {
    const index = pool.findIndex((tile) => tile.baseId === baseId);
    if (index < 0) throw new Error(`牌が不足しています: ${baseId}`);
    return pool.splice(index, 1)[0];
  }
  const humanCodes = ["1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s", "z5", "z5", "9m", "9m", "z1"];
  engine.humanPlayer.hand = humanCodes.map(take);
  engine.humanPlayer.sortHand();
  engine.humanPlayer.lastDraw = engine.humanPlayer.hand.find((tile) => tile.baseId === "z1");
  const improvingWhite = take("z5");
  engine.wall.deadWall = pool.splice(-14, 14);
  engine.wall.tiles = [improvingWhite].concat(pool);
  engine.wall.doraIndicators = [engine.wall.deadWall[0]];
  engine.wall.rinshanDrawCount = 0;
}

const assistEngine = new Sanma.GameEngine({
  ruleConfig: {
    dramaticLuckAssist: true,
    dramaticDrawAssist: true,
    dramaticDrawAssistRate: 1,
    maxAssistDrawsPerRoundForHuman: 1,
  },
  seed: "phase14-1-assist-actual",
  onChange() {},
});
arrangeAssistEngine(assistEngine);
const beforeLedger = Sanma.TileLedger.inspect(assistEngine, assistEngine.ruleConfig);
const outgoingId = assistEngine.humanPlayer.lastDraw.instanceId;
const assistEvent = Sanma.AssistManager.evaluateDraw({
  state: assistEngine,
  ruleConfig: assistEngine.ruleConfig,
  player: assistEngine.humanPlayer,
  random: () => 0,
});
assistEngine.recordAssist(assistEvent);
const afterLedger = Sanma.TileLedger.inspect(assistEngine, assistEngine.ruleConfig);
assert(assistEvent.applied, "成立した補助条件で実際の牌交換が行われませんでした");
assert(assistEvent.afterShanten < assistEvent.beforeShanten, "補助交換で手牌が改善していません");
assert(assistEngine.humanPlayer.lastDraw.instanceId !== outgoingId, "補助後も元のツモ牌が残っています");
assert(beforeLedger.ok && afterLedger.ok && beforeLedger.counts.total === afterLedger.counts.total, "補助交換後のTileLedgerが不正です");
assert(
  assistEngine.gameRecord.rounds[assistEngine.gameRecord.rounds.length - 1].events.some((event) => event.type === "assist"),
  "実際に適用した補助が牌譜へ記録されませんでした"
);
const secondAssist = Sanma.AssistManager.evaluateDraw({
  state: assistEngine,
  ruleConfig: assistEngine.ruleConfig,
  player: assistEngine.humanPlayer,
  random: () => 0,
});
assert(!secondAssist.applied && secondAssist.reason.includes("上限"), "局ごとの補助回数上限が機能していません");

function token(instanceId, label, baseId) {
  return { instanceId, label, baseId: baseId || label, isRed: false };
}

const players = [
  { id: 0, name: "あなた", seatWind: "east", isHuman: true, points: 35000 },
  { id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: 35000 },
  { id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: 35000 },
];
const record = Sanma.GameRecord.create({ players, startingPoints: [35000, 35000, 35000] });
const fiveA = token("5p-0", "5p");
const fiveB = token("5p-1", "5p");
const twoA = token("2p-0", "2p");
const twoB = token("2p-1", "2p");
const twoC = token("2p-2", "2p");
const twoD = token("2p-3", "2p");
Sanma.GameRecord.addEvent(record, "deal", {
  hands: [
    { playerIndex: 0, tiles: [fiveA, fiveB, twoA, twoB, twoC, twoD] },
    { playerIndex: 1, tiles: [] },
    { playerIndex: 2, tiles: [] },
  ],
});
Sanma.GameRecord.addEvent(record, "discard", { playerIndex: 0, tile: fiveA, tileInstanceId: fiveA.instanceId });
Sanma.GameRecord.addEvent(record, "call", {
  playerIndex: 0,
  action: "pon",
  fromPlayerIndex: 1,
  calledTile: token("z5-3", "白", "z5"),
  tiles: [token("z5-0", "白", "z5"), token("z5-1", "白", "z5"), token("z5-3", "白", "z5")],
});
Sanma.GameRecord.addEvent(record, "kan", {
  playerIndex: 0,
  kanType: "ankan",
  consumedTileInstanceIds: [twoA.instanceId, twoB.instanceId, twoC.instanceId, twoD.instanceId],
  tiles: [twoA, twoB, twoC, twoD],
});
Sanma.GameRecord.addEvent(record, "assist", {
  playerIndex: 0,
  outgoing: fiveB,
  incoming: token("9s-0", "9s"),
});

const replay = Sanma.ReplayViewer.create(record);
Sanma.ReplayViewer.jumpToEnd(replay);
assert(!replay.view.hands[0].some((tile) => tile.instanceId === fiveA.instanceId), "打牌した同種牌のinstance IDが残りました");
assert(!replay.view.hands[0].some((tile) => tile.instanceId === fiveB.instanceId), "補助交換した牌のinstance IDが残りました");
assert(replay.view.hands[0].some((tile) => tile.instanceId === "9s-0"), "補助交換後の牌を再生できませんでした");
assert(replay.view.melds[0].some((meld) => meld.type === "ankan" && meld.tiles.length === 4), "暗槓をinstance ID単位で再生できませんでした");
Sanma.ReplayViewer.stepBack(replay);
assert(replay.view.hands[0].some((tile) => tile.instanceId === fiveB.instanceId), "一手戻しで補助前の牌へ戻れませんでした");

const engineRecord = new Sanma.GameEngine({ ruleConfig: {}, seed: "phase14-1-exact-record", onChange() {} }).gameRecord;
const dealEvent = engineRecord.rounds[0].events.find((event) => event.type === "deal");
assert(engineRecord.eventSchemaVersion === 2, "新規牌譜のイベントスキーマ版がありません");
assert(
  dealEvent.data.hands.every((entry) => entry.tiles.every((tile) => tile.instanceId && tile.label)),
  "新規配牌イベントがinstance ID付き牌トークンを保存していません"
);

console.log("Phase 14.1 assist and exact replay tests passed.");
