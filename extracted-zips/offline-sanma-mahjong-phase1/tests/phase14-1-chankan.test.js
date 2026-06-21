const { assert, loadModules } = require("./test-helpers");

const Sanma = loadModules();

function createEngine(seed) {
  return new Sanma.GameEngine({
    ruleConfig: Sanma.RuleConfig.createRuleConfig({}),
    seed,
    onChange() {},
  });
}

function arrange(engine, setup) {
  const pool = engine.wall.tiles.concat(engine.wall.deadWall);
  engine.players.forEach((player) => {
    pool.push(...player.hand, ...player.discards, ...player.kitaTiles);
    player.melds.forEach((meld) => pool.push(...meld.tiles));
    player.hand = [];
    player.discards = [];
    player.melds = [];
    player.kitaTiles = [];
    player.lastDraw = null;
    player.sameTurnFuriten = false;
    player.riichiMissedWin = false;
    player.hasRiichi = false;
    player.ippatsuActive = false;
  });

  function take(baseId) {
    const index = pool.findIndex((tile) => tile.baseId === baseId);
    if (index < 0) throw new Error(`牌が不足しています: ${baseId}`);
    return pool.splice(index, 1)[0];
  }

  (setup.players || []).forEach((playerSetup, playerIndex) => {
    const player = engine.players[playerIndex];
    player.hand = (playerSetup.hand || []).map(take);
    player.melds = (playerSetup.melds || []).map((meld) => ({
      type: meld.type,
      kanType: meld.kanType,
      open: meld.open !== false,
      fromPlayerIndex: meld.fromPlayerIndex,
      tiles: meld.tiles.map(take),
    }));
    player.discards = (playerSetup.discards || []).map(take);
    player.sortHand();
    player.lastDraw = player.hand[player.hand.length - 1] || null;
    player.sameTurnFuriten = Boolean(playerSetup.sameTurnFuriten);
    player.hasRiichi = Boolean(playerSetup.hasRiichi);
    player.ippatsuActive = Boolean(playerSetup.ippatsuActive);
    if (player.hasRiichi) player.riichi.declared = true;
  });

  engine.wall.deadWall = pool.splice(-14, 14);
  engine.wall.tiles = pool;
  engine.wall.doraIndicators = engine.wall.deadWall.length ? [engine.wall.deadWall[0]] : [];
  engine.wall.rinshanDrawCount = 0;
  engine.turnIndex = setup.turnIndex;
  engine.phase = engine.players[setup.turnIndex].isHuman ? "human-discard" : "cpu-running";
  engine.lastDiscard = setup.lastDiscard || null;
  engine.callWindow = null;
  engine.pendingWinContext = null;
  engine.pendingKanAttempt = null;
  return engine;
}

const filler = ["1p", "2p", "3p", "6p", "7p", "8p", "1s", "2s", "3s", "9s"];
const tanyaoFiveWait = ["3p", "4p", "2s", "3s", "4s", "6p", "7p", "8p", "6s", "7s", "8s", "2p", "2p"];
const kokushiOneManWait = ["9m", "1p", "9p", "1s", "9s", "z1", "z2", "z3", "z4", "z5", "z6", "z7", "9m"];

function kakanSetup(engine, declarerIndex, winnerIndex, winnerSetup) {
  const players = [{}, {}, {}];
  players[declarerIndex] = {
    hand: ["5p"].concat(filler),
    melds: [{ type: "pon", open: true, fromPlayerIndex: (declarerIndex + 1) % 3, tiles: ["5p", "5p", "5p"] }],
  };
  players[winnerIndex] = Object.assign({ hand: tanyaoFiveWait }, winnerSetup || {});
  const otherIndex = [0, 1, 2].find((index) => index !== declarerIndex && index !== winnerIndex);
  players[otherIndex] = { hand: ["1m", "9m", "1p", "9p", "1s", "9s", "z1", "z2", "z3", "z4", "z5", "z6", "z7"] };
  arrange(engine, { players, turnIndex: declarerIndex });
  return Sanma.KanRules.getAvailableKanActions({ state: engine, playerIndex: declarerIndex })
    .find((option) => option.type === "kakan");
}

function currentEvents(engine) {
  return engine.gameRecord.rounds[engine.gameRecord.rounds.length - 1].events;
}

const kakanRon = createEngine("phase14-1-kakan-ron");
const kakanRonOption = kakanSetup(kakanRon, 0, 1);
const doraBeforeRon = kakanRon.wall.doraIndicators.length;
const rinshanBeforeRon = kakanRon.wall.rinshanDrawCount;
assert(kakanRon.beginKanAttempt(0, kakanRonOption), "加槓宣言を開始できませんでした");
assert(kakanRon.phase === "win-ended" && kakanRon.winResult.winnerIndex === 1, "CPU槍槓ロンが解決されませんでした");
assert(kakanRon.winResult.context.isChankan, "槍槓の和了文脈が設定されていません");
assert(kakanRon.players[0].melds[0].type === "pon" && kakanRon.players[0].melds[0].tiles.length === 3, "槍槓成立後に加槓が確定しました");
assert(
  !(kakanRonOption.consumeInstanceIds || []).some((instanceId) => kakanRon.players[0].hand.some((tile) => tile.instanceId === instanceId)),
  "槍槓成立後に加槓牌が宣言者の手牌へ残っています"
);
assert(kakanRon.wall.doraIndicators.length === doraBeforeRon && kakanRon.wall.rinshanDrawCount === rinshanBeforeRon, "槍槓成立後にカンドラまたは嶺上牌が進みました");
assert(currentEvents(kakanRon).some((event) => event.type === "kan_attempt"), "牌譜にカン試行がありません");
assert(currentEvents(kakanRon).some((event) => event.type === "chankan_offer"), "牌譜に槍槓提示イベントがありません");
assert(currentEvents(kakanRon).some((event) => event.type === "chankan" && event.data.decision === "accept"), "牌譜に槍槓成立イベントがありません");
assert(currentEvents(kakanRon).some((event) => event.type === "win" && event.data.isChankan), "牌譜の和了イベントが槍槓を示していません");
assert(kakanRon.players[0].points < 35000 && kakanRon.players[1].points > 35000, "槓宣言者を放銃者とするロン精算が行われませんでした");
assert(Sanma.TileLedger.inspect(kakanRon, kakanRon.ruleConfig).ok, "槍槓成立後のTileLedgerが不正です");

const kakanNormal = createEngine("phase14-1-kakan-normal");
kakanSetup(kakanNormal, 0, 1, { hand: ["1m", "9m", "1p", "9p", "1s", "9s", "z1", "z2", "z3", "z4", "z5", "z6", "z7"] });
const normalOption = Sanma.KanRules.getAvailableKanActions({ state: kakanNormal, playerIndex: 0 }).find((option) => option.type === "kakan");
const normalDora = kakanNormal.wall.doraIndicators.length;
const normalRinshan = kakanNormal.wall.rinshanDrawCount;
assert(kakanNormal.beginKanAttempt(0, normalOption), "ロンなし加槓を実行できませんでした");
assert(kakanNormal.players[0].melds[0].tiles.length === 4, "ロンなし加槓が確定しませんでした");
assert(kakanNormal.wall.doraIndicators.length === normalDora + 1 && kakanNormal.wall.rinshanDrawCount === normalRinshan + 1, "ロンなし加槓でカンドラ・嶺上牌が進みませんでした");
assert(Sanma.TileLedger.inspect(kakanNormal, kakanNormal.ruleConfig).ok, "ロンなし加槓後のTileLedgerが不正です");

const kokushi = createEngine("phase14-1-kokushi-ankan");
arrange(kokushi, {
  turnIndex: 0,
  players: [
    { hand: ["1m", "1m", "1m", "1m", "2p", "3p", "4p", "6p", "7p", "8p", "2s", "3s", "4s", "5s"] },
    { hand: kokushiOneManWait },
    { hand: ["1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "1s", "2s", "3s", "4s"] },
  ],
});
const ankanOption = Sanma.KanRules.getAvailableKanActions({ state: kokushi, playerIndex: 0 }).find((option) => option.type === "ankan");
const kokushiDora = kokushi.wall.doraIndicators.length;
const kokushiRinshan = kokushi.wall.rinshanDrawCount;
assert(kokushi.beginKanAttempt(0, ankanOption), "国士暗槓槍槓の宣言を開始できませんでした");
assert(kokushi.phase === "win-ended" && kokushi.winResult.score.isYakuman, "国士無双による暗槓槍槓が役満精算されませんでした");
assert(kokushi.winResult.context.isChankan, "国士暗槓槍槓の文脈がありません");
assert(
  kokushi.players[0].melds.length === 0
    && kokushi.wall.doraIndicators.length === kokushiDora
    && kokushi.wall.rinshanDrawCount === kokushiRinshan,
  "国士暗槓槍槓後に暗槓・カンドラ・嶺上牌が進みました"
);
assert(currentEvents(kokushi).some((event) => event.type === "chankan" && event.data.isAnkanKokushiException), "牌譜が国士暗槓例外を区別していません");
assert(Sanma.TileLedger.inspect(kokushi, kokushi.ruleConfig).ok, "国士暗槓槍槓後のTileLedgerが不正です");

const nonKokushi = createEngine("phase14-1-non-kokushi-ankan");
arrange(nonKokushi, {
  turnIndex: 0,
  players: [
    { hand: ["1m", "1m", "1m", "1m", "2p", "3p", "4p", "6p", "7p", "8p", "2s", "3s", "4s", "5s"] },
    { hand: ["2p", "3p", "4p", "2s", "3s", "4s", "6p", "7p", "8p", "6s", "7s", "8s", "5p"] },
    { hand: ["1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "1s", "2s", "3s", "4s"] },
  ],
});
const nonKokushiOption = Sanma.KanRules.getAvailableKanActions({ state: nonKokushi, playerIndex: 0 }).find((option) => option.type === "ankan");
assert(nonKokushi.beginKanAttempt(0, nonKokushiOption), "通常暗槓を実行できませんでした");
assert(nonKokushi.phase !== "win-ended" && nonKokushi.players[0].melds[0].kanType === "ankan", "国士以外が暗槓を槍槓しました");
assert(Sanma.TileLedger.inspect(nonKokushi, nonKokushi.ruleConfig).ok, "通常暗槓後のTileLedgerが不正です");

const furiten = createEngine("phase14-1-furiten-chankan");
const furitenOption = kakanSetup(furiten, 0, 1, { hand: tanyaoFiveWait, sameTurnFuriten: true });
assert(furiten.beginKanAttempt(0, furitenOption), "フリテン時の加槓を実行できませんでした");
assert(furiten.phase !== "win-ended" && furiten.players[0].melds[0].tiles.length === 4, "フリテンが槍槓ロンしました");
assert(Sanma.TileLedger.inspect(furiten, furiten.ruleConfig).ok, "フリテン加槓後のTileLedgerが不正です");

const furitenKokushi = createEngine("phase14-1-furiten-kokushi-ankan");
arrange(furitenKokushi, {
  turnIndex: 0,
  players: [
    { hand: ["1m", "1m", "1m", "1m", "2p", "3p", "4p", "6p", "7p", "8p", "2s", "3s", "4s", "5s"] },
    { hand: kokushiOneManWait, sameTurnFuriten: true },
    { hand: ["1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "1s", "2s", "3s", "4s"] },
  ],
});
const furitenKokushiOption = Sanma.KanRules.getAvailableKanActions({
  state: furitenKokushi,
  playerIndex: 0,
}).find((option) => option.type === "ankan");
assert(furitenKokushi.beginKanAttempt(0, furitenKokushiOption), "フリテン国士待ち時の暗槓を実行できませんでした");
assert(
  furitenKokushi.phase !== "win-ended" && furitenKokushi.players[0].melds[0].kanType === "ankan",
  "フリテン国士待ちが暗槓を槍槓しました"
);
assert(Sanma.TileLedger.inspect(furitenKokushi, furitenKokushi.ruleConfig).ok, "フリテン国士暗槓後のTileLedgerが不正です");

const humanSkip = createEngine("phase14-1-human-skip");
const humanSkipOption = kakanSetup(humanSkip, 1, 0);
humanSkip.runCpuUntilHumanTurn = () => true;
assert(humanSkip.beginKanAttempt(1, humanSkipOption), "人間向け槍槓窓を開始できませんでした");
assert(humanSkip.phase === "human-call" && humanSkip.callWindow.kind === "chankan", "人間向け槍槓選択窓が開きませんでした");
assert(humanSkip.skipHumanCall(), "槍槓見逃しを処理できませんでした");
assert(humanSkip.humanPlayer.sameTurnFuriten, "槍槓見逃しが通常ロン同様のフリテンになりませんでした");
assert(humanSkip.players[1].melds[0].tiles.length === 4, "槍槓見逃し後に加槓が確定しませんでした");
assert(currentEvents(humanSkip).some((event) => event.type === "chankan" && event.data.decision === "skip"), "牌譜に槍槓見逃しがありません");

const ippatsu = createEngine("phase14-1-chankan-ippatsu");
const ippatsuOption = kakanSetup(ippatsu, 0, 1, {
  hand: tanyaoFiveWait,
  hasRiichi: true,
  ippatsuActive: true,
});
assert(ippatsu.beginKanAttempt(0, ippatsuOption), "一発中の槍槓を開始できませんでした");
assert(ippatsu.winResult.yaku.yaku.some((item) => item.id === "ippatsu"), "槍槓確定前に一発が消えました");

const daiminkan = createEngine("phase14-1-daiminkan");
arrange(daiminkan, {
  turnIndex: 0,
  players: [
    { hand: ["5p", "5p", "5p", "1m", "9m", "1p", "9p", "1s", "9s", "z1", "z2", "z3", "z4"] },
    { hand: tanyaoFiveWait },
    { hand: ["1p", "2p", "3p", "4p", "6p", "7p", "8p", "9p", "1s", "2s", "3s", "4s"], discards: ["5p"] },
  ],
});
daiminkan.lastDiscard = { playerIndex: 2, tile: daiminkan.players[2].discards[0] };
const daiminkanOption = Sanma.KanRules.getAvailableKanActions({
  state: daiminkan,
  playerIndex: 0,
}).find((option) => option.type === "minkan");
assert(daiminkan.beginKanAttempt(0, daiminkanOption), "大明槓を実行できませんでした");
assert(daiminkan.players[0].melds.some((meld) => meld.kanType === "minkan"), "大明槓が確定しませんでした");
assert(!currentEvents(daiminkan).some((event) => event.type === "chankan_offer"), "大明槓が通常槍槓判定へ入りました");
assert(Sanma.TileLedger.inspect(daiminkan, daiminkan.ruleConfig).ok, "大明槓後のTileLedgerが不正です");

console.log("Phase 14.1 chankan flow tests passed.");
