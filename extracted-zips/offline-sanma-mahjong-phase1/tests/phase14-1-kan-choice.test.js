const fs = require("fs");
const path = require("path");
const { assert, loadModules, projectRoot } = require("./test-helpers");

const Sanma = loadModules();

function createEngine() {
  return new Sanma.GameEngine({
    ruleConfig: Sanma.RuleConfig.createRuleConfig({}),
    seed: "phase14-1-kan-choice",
    onChange() {},
  });
}

function snapshotTiles(engine) {
  return Sanma.TileLedger.inspect(engine, engine.ruleConfig);
}

function arrangeHumanHand(engine, codes) {
  const pool = engine.wall.tiles.concat(engine.wall.deadWall);
  engine.players.forEach((player) => {
    pool.push(...player.hand, ...player.discards, ...player.kitaTiles);
    player.melds.forEach((meld) => pool.push(...meld.tiles));
    player.hand = [];
    player.discards = [];
    player.melds = [];
    player.kitaTiles = [];
    player.lastDraw = null;
  });
  function take(baseId) {
    const index = pool.findIndex((tile) => tile.baseId === baseId);
    if (index < 0) throw new Error(`牌が不足しています: ${baseId}`);
    return pool.splice(index, 1)[0];
  }
  engine.humanPlayer.hand = codes.map(take);
  engine.humanPlayer.sortHand();
  engine.humanPlayer.lastDraw = engine.humanPlayer.hand[engine.humanPlayer.hand.length - 1];
  engine.wall.deadWall = pool.splice(-14, 14);
  engine.wall.tiles = pool;
  engine.wall.doraIndicators = [engine.wall.deadWall[0]];
  engine.wall.rinshanDrawCount = 0;
  engine.turnIndex = engine.humanPlayer.id;
  engine.phase = "human-discard";
  engine.lastDiscard = null;
  engine.callWindow = null;
  engine.pendingKanChoice = null;
  engine.pendingKanAttempt = null;
}

const originalDescribe = Sanma.KanRules.describeAvailability;

const multipleEngine = createEngine();
const multipleOptions = [
  { type: "ankan", label: "暗槓 1筒", tile: multipleEngine.humanPlayer.hand[0], consumeInstanceIds: ["first"] },
  { type: "kakan", label: "加槓 9索", tile: multipleEngine.humanPlayer.hand[1], consumeInstanceIds: ["second"], meldIndex: 0 },
];
const beforeOpen = snapshotTiles(multipleEngine);
Sanma.KanRules.describeAvailability = () => ({ enabled: true, reason: "候補あり", options: multipleOptions });
let appliedOption = null;
multipleEngine.applyHumanKan = (option) => {
  appliedOption = option;
  return true;
};

assert(multipleEngine.requestHumanKan(), "複数カン候補で選択窓を開けませんでした");
assert(multipleEngine.phase === "human-kan-choice", "複数カン候補で専用フェーズへ移りませんでした");
assert(multipleEngine.pendingKanChoice.options.length === 2, "全カン候補が公開されていません");
assert(snapshotTiles(multipleEngine).counts.total === beforeOpen.counts.total, "選択窓を開いただけで牌が変化しました");
assert(appliedOption === null, "複数候補で先頭候補が自動実行されました");

assert(multipleEngine.selectHumanKan(1), "2番目のカン候補を選択できませんでした");
assert(appliedOption === multipleOptions[1], "選択した候補ではなく先頭候補が実行されました");

const cancelEngine = createEngine();
const beforeCancel = snapshotTiles(cancelEngine);
Sanma.KanRules.describeAvailability = () => ({ enabled: true, reason: "候補あり", options: multipleOptions });
cancelEngine.applyHumanKan = () => {
  throw new Error("取消時にカンを実行しました");
};
assert(cancelEngine.requestHumanKan(), "取消テスト用のカン選択窓を開けませんでした");
assert(cancelEngine.cancelHumanKanChoice(), "カン選択を取り消せませんでした");
const afterCancel = snapshotTiles(cancelEngine);
assert(cancelEngine.phase === "human-discard" && !cancelEngine.pendingKanChoice, "取消後に打牌フェーズへ戻りませんでした");
assert(afterCancel.ok && afterCancel.counts.total === beforeCancel.counts.total, "取消後のTileLedgerが不正です");

const singleEngine = createEngine();
const singleOption = { type: "ankan", label: "暗槓 1筒", tile: singleEngine.humanPlayer.hand[0], consumeInstanceIds: ["single"] };
Sanma.KanRules.describeAvailability = () => ({ enabled: true, reason: "候補あり", options: [singleOption] });
let singleApplied = null;
singleEngine.applyHumanKan = (option) => {
  singleApplied = option;
  return true;
};
assert(singleEngine.requestHumanKan(), "単一カン候補を実行できませんでした");
assert(singleApplied === singleOption && !singleEngine.pendingKanChoice, "単一候補が直接実行されませんでした");

Sanma.KanRules.describeAvailability = originalDescribe;

const actualMultiple = createEngine();
arrangeHumanHand(actualMultiple, [
  "1p", "1p", "1p", "1p",
  "9s", "9s", "9s", "9s",
  "2p", "3p", "4p", "5p", "6p", "7p",
]);
const actualOptions = Sanma.KanRules.getAvailableKanActions({
  state: actualMultiple,
  playerIndex: actualMultiple.humanPlayer.id,
});
assert(actualOptions.length === 2, "実局面で複数の暗槓候補を作成できませんでした");
const selectedBaseId = actualOptions[1].tile.baseId;
const unselectedBaseId = actualOptions[0].tile.baseId;
const beforeActualSelection = snapshotTiles(actualMultiple);
assert(actualMultiple.requestHumanKan(), "実局面で複数カン選択窓を開けませんでした");
assert(actualMultiple.selectHumanKan(1), "実局面で2番目のカン候補を実行できませんでした");
assert(
  actualMultiple.humanPlayer.melds.some((meld) =>
    meld.kanType === "ankan" && meld.tiles.every((tile) => tile.baseId === selectedBaseId)
  ),
  "実局面で選択した2番目の暗槓が確定しませんでした"
);
assert(
  actualMultiple.humanPlayer.hand.filter((tile) => tile.baseId === unselectedBaseId).length === 4,
  "実局面で選択していない先頭候補が消費されました"
);
const afterActualSelection = snapshotTiles(actualMultiple);
assert(
  beforeActualSelection.ok
    && afterActualSelection.ok
    && beforeActualSelection.counts.total === afterActualSelection.counts.total,
  "実局面のカン選択後にTileLedgerが不正です"
);

const actualSingle = createEngine();
arrangeHumanHand(actualSingle, [
  "1p", "1p", "1p", "1p",
  "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "1s", "2s",
]);
const beforeActualSingle = snapshotTiles(actualSingle);
assert(actualSingle.requestHumanKan(), "実局面の単一カン候補を実行できませんでした");
const afterActualSingle = snapshotTiles(actualSingle);
assert(actualSingle.humanPlayer.melds.length === 1, "実局面の単一カン候補が確定しませんでした");
assert(
  beforeActualSingle.ok && afterActualSingle.ok && beforeActualSingle.counts.total === afterActualSingle.counts.total,
  "実局面の単一カン後にTileLedgerが不正です"
);

const renderSource = fs.readFileSync(path.resolve(projectRoot, "src", "ui", "renderTable.js"), "utf8");
assert(renderSource.includes("renderKanChoice") && renderSource.includes("handlers.onSelectKan(index)"), "カン候補選択UIが接続されていません");
assert(renderSource.includes("handlers.onCancelKan"), "カン候補取消UIが接続されていません");

console.log("Phase 14.1 multiple kan choice tests passed.");
