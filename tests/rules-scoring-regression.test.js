const { assert, createTileFactory, loadModules } = require("./test-helpers");

const Sanma = loadModules();
const tile = createTileFactory(Sanma.TileUtil);

function hand(codes) {
  return codes.map((code) => typeof code === "string" ? tile(code) : tile(code.code, code.red));
}

function createState(ruleOverrides) {
  const players = [
    new Sanma.Player({ id: 0, name: "あなた", seatWind: "east", isHuman: true, points: 35000 }),
    new Sanma.Player({ id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: 35000 }),
    new Sanma.Player({ id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: 35000 }),
  ];
  return {
    ruleConfig: Sanma.RuleConfig.createRuleConfig(ruleOverrides || {}),
    players,
    round: { roundWind: "east", dealerIndex: 0, honba: 0, riichiSticks: 0 },
    turnIndex: 0,
    phase: "human-discard",
    lastDiscard: null,
    wall: { doraIndicators: [], draw: () => tile("1s") },
  };
}

function analyze(codes, context, ruleOverrides) {
  const tiles = hand(codes);
  const ruleConfig = Sanma.RuleConfig.createRuleConfig(ruleOverrides || {});
  const agariResult = Sanma.HandAnalysis.analyzeAgari(tiles, ruleConfig);
  const yakuResult = Sanma.YakuAnalysis.analyzeYaku({ tiles, ruleConfig, agariResult, context });
  const scoreResult = Sanma.ScoreCalculator.calculateScore({ tiles, ruleConfig, agariResult, yakuResult, context });
  return { tiles, ruleConfig, agariResult, yakuResult, scoreResult };
}

function hasYaku(result, id) {
  return result.yakuResult.yaku.some((item) => item.id === id);
}

function doraHan(result, id) {
  const item = result.yakuResult.dora.find((candidate) => candidate.id === id);
  return item ? item.han : 0;
}

const noYaku = ["1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "7s", "8s", "9s", "1m", "1m"];
const riichiOnly = analyze(noYaku, {
  winType: "ron",
  isMenzen: true,
  isRiichi: true,
  seatWind: "south",
  roundWind: "east",
});
assert(hasYaku(riichiOnly, "riichi") && riichiOnly.scoreResult.isValidWin, "リーチのみの和了を有効にできません");
assert(!hasYaku(analyze(noYaku, { winType: "ron", isMenzen: true }), "riichi"), "リーチ状態なしでリーチ役が付きました");
assert(!hasYaku(analyze(noYaku, { winType: "ron", isMenzen: false, isRiichi: true }), "riichi"), "副露手にリーチ役が付きました");

const ippatsu = analyze(noYaku, {
  winType: "ron",
  isMenzen: true,
  isRiichi: true,
  isIppatsu: true,
  seatWind: "south",
  roundWind: "east",
});
assert(hasYaku(ippatsu, "ippatsu"), "リーチ一発を判定できません");
assert(!hasYaku(analyze(noYaku, { winType: "ron", isMenzen: true, isIppatsu: true }), "ippatsu"), "リーチなしで一発が付きました");

const declarationState = createState();
declarationState.players[0].hand = hand(["1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s", "east", "east", "east", "9m", "1m"]);
const pendingDeclaration = Sanma.RiichiManager.declare(declarationState, 0);
assert(pendingDeclaration.applied && pendingDeclaration.pending, "リーチ宣言牌の選択待ちを開始できません");
assert(!declarationState.players[0].ippatsuActive && declarationState.players[0].points === 35000, "宣言打牌前に一発または供託が開始されました");
const declarationDiscard = declarationState.players[0].discardTileByInstanceId(pendingDeclaration.discardOptions[0].instanceId);
assert(Sanma.RiichiRules.handleDiscard(declarationState, 0, declarationDiscard).finalized, "宣言打牌でリーチを確定できません");
assert(declarationState.players[0].ippatsuActive && declarationState.players[0].points === 34000, "宣言打牌後に一発または供託を開始できません");
declarationState.players[0].receiveTile(tile("1m"));
const postRiichiDiscard = declarationState.players[0].discardTileByInstanceId(declarationState.players[0].lastDraw.instanceId);
Sanma.RiichiRules.handleDiscard(declarationState, 0, postRiichiDiscard);
assert(!declarationState.players[0].ippatsuActive, "打牌後に一発状態を解除できません");

const pendingRiichiEngine = new Sanma.GameEngine({ ruleConfig: {}, seed: "phase11-pending-riichi", onChange: function noop() {} });
pendingRiichiEngine.humanPlayer.hand = hand(["1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s", "east", "east", "east", "9m", "1m"]);
pendingRiichiEngine.phase = "human-discard";
pendingRiichiEngine.turnIndex = 0;
pendingRiichiEngine.declareHumanRiichi();
const pendingDiscardIds = pendingRiichiEngine.getState().pendingRiichiDiscardInstanceIds;
const invalidDeclarationTile = pendingRiichiEngine.humanPlayer.hand.find((ownedTile) => !pendingDiscardIds.includes(ownedTile.instanceId));
const pendingHandLength = pendingRiichiEngine.humanPlayer.hand.length;
pendingRiichiEngine.discardHumanTile(invalidDeclarationTile.instanceId);
assert(pendingRiichiEngine.humanPlayer.hand.length === pendingHandLength, "リーチ宣言待ち中に聴牌を崩す牌を打牌できました");
assert(pendingRiichiEngine.logs[0].includes("聴牌を維持するリーチ宣言牌"), "不正なリーチ宣言牌の拒否理由が不明です");

const pinfuState = createState();
pinfuState.players[0].hand = hand(["1p", "2p", "3p", "4p", "5p", "6p", "2s", "3s", "4s", "6s", "7s", "9m", "9m"]);
const pinfuWinningTile = tile("8s");
pinfuState.lastDiscard = { playerIndex: 2, tile: pinfuWinningTile };
const pinfuAnalysis = Sanma.ActionResolver.analyzeWin(pinfuState, 0, "ron", pinfuWinningTile, 2);
assert(pinfuAnalysis.context.winningTile === pinfuWinningTile, "ロン和了牌をcontextへ渡せません");
assert(pinfuAnalysis.context.waitType === "ryanmen", "実戦経路で両面待ちを判定できません");
assert(pinfuAnalysis.yakuResult.yaku.some((item) => item.id === "pinfu"), "実戦経路で平和を判定できません");

const kanchanState = createState();
kanchanState.players[0].hand = hand(["1p", "2p", "3p", "4p", "5p", "6p", "2s", "3s", "4s", "6s", "8s", "9m", "9m"]);
const kanchanTile = tile("7s");
const kanchanAnalysis = Sanma.ActionResolver.analyzeWin(kanchanState, 0, "ron", kanchanTile, 2);
assert(kanchanAnalysis.context.waitType === "kanchan", "嵌張待ちを判定できません");
assert(!kanchanAnalysis.yakuResult.yaku.some((item) => item.id === "pinfu"), "嵌張待ちに平和が付きました");

const penchanState = createState();
penchanState.players[0].hand = hand(["1p", "2p", "4p", "5p", "6p", "2s", "3s", "4s", "6s", "7s", "8s", "9m", "9m"]);
const penchanAnalysis = Sanma.ActionResolver.analyzeWin(penchanState, 0, "ron", tile("3p"), 2);
assert(penchanAnalysis.context.waitType === "penchan", "辺張待ちを判定できません");
assert(!penchanAnalysis.yakuResult.yaku.some((item) => item.id === "pinfu"), "辺張待ちに平和が付きました");

const tankiState = createState();
tankiState.players[0].hand = hand(["1p", "2p", "3p", "4p", "5p", "6p", "2s", "3s", "4s", "6s", "7s", "8s", "9m"]);
const tankiAnalysis = Sanma.ActionResolver.analyzeWin(tankiState, 0, "ron", tile("9m"), 2);
assert(tankiAnalysis.context.waitType === "tanki", "単騎待ちを判定できません");
assert(!tankiAnalysis.yakuResult.yaku.some((item) => item.id === "pinfu"), "単騎待ちに平和が付きました");

const tsumoState = createState();
tsumoState.players[0].hand = hand(["1p", "2p", "3p", "4p", "5p", "6p", "2s", "3s", "4s", "6s", "7s", "9m", "9m"]);
const tsumoWinningTile = tile("8s");
tsumoState.players[0].receiveTile(tsumoWinningTile);
const tsumoAnalysis = Sanma.ActionResolver.analyzeWin(tsumoState, 0, "tsumo", null, null);
assert(tsumoAnalysis.context.winningTile === tsumoWinningTile, "ツモ和了牌をcontextへ渡せません");
assert(tsumoAnalysis.context.waitType === "ryanmen", "ツモ時の両面待ちを判定できません");

const tanyao = ["2p", "3p", "4p", "3p", "4p", "5p", "4s", "5s", "6s", "6s", "7s", "8s", "2s", "2s"];
const redTanyao = tanyao.map((code, index) => index === 5 ? { code, red: true } : code);
assert(doraHan(analyze(redTanyao, { winType: "ron", isMenzen: true }), "red-dora") === 1, "赤ドラを加算できません");
const normalDora = analyze(tanyao, {
  winType: "ron",
  isMenzen: true,
  doraIndicators: [tile("1p")],
});
assert(doraHan(normalDora, "dora") === 1, "通常ドラを加算できません");

const doraOnly = analyze(noYaku, {
  winType: "ron",
  isMenzen: true,
  doraIndicators: [tile("6p")],
});
assert(!doraOnly.yakuResult.hasYaku && !doraOnly.scoreResult.isValidWin, "ドラのみの和了を有効にしました");
assert(doraOnly.yakuResult.dora.length === 0, "役なし手へドラ飜を適用しました");
const redDoraOnly = analyze(noYaku.map((code, index) => index === 4 ? { code, red: true } : code), {
  winType: "ron",
  isMenzen: true,
});
assert(!redDoraOnly.scoreResult.isValidWin && redDoraOnly.yakuResult.dora.length === 0, "赤ドラのみの和了を有効にしました");

assert(Sanma.DoraCalculator.nextDoraBaseId(tile("9p")) === "1p", "筒子ドラの循環が不正です");
assert(Sanma.DoraCalculator.nextDoraBaseId(tile("1m")) === "9m", "三麻萬子ドラ1m→9mが不正です");
assert(Sanma.DoraCalculator.nextDoraBaseId(tile("9m")) === "1m", "三麻萬子ドラ9m→1mが不正です");
assert(Sanma.DoraCalculator.nextDoraBaseId(tile("north")) === "z1", "風牌ドラの循環が不正です");
assert(Sanma.DoraCalculator.nextDoraBaseId(tile("red")) === "z5", "三元牌ドラの循環が不正です");

const kitaDora = analyze(tanyao, { winType: "ron", isMenzen: true, kitaDoraCount: 2 }, { northMode: "kita-dora" });
assert(doraHan(kitaDora, "kita-dora") === 2, "抜き北ドラを加算できません");
const normalNorth = analyze(tanyao, { winType: "ron", isMenzen: true, kitaDoraCount: 2 }, { northMode: "normal-tile" });
assert(doraHan(normalNorth, "kita-dora") === 0, "通常北ルールで抜き北ドラを加算しました");

const redIndicator = tile("1p", true);
const highScoreDora = analyze(tanyao, {
  winType: "ron",
  isMenzen: true,
  doraIndicators: [redIndicator],
}, { highScoreMode: true });
assert(doraHan(highScoreDora, "dora") === 2, "高得点モードの赤表示牌倍率を適用できません");

const kokushi = ["1m", "9m", "1p", "9p", "1s", "9s", "east", "south", "west", "north", "white", "green", "red", "1m"];
const yakuman = analyze(kokushi, {
  winType: "ron",
  isMenzen: true,
  doraIndicators: [tile("9p")],
});
assert(yakuman.scoreResult.isYakuman && yakuman.scoreResult.han === 0, "役満へドラ飜を加算しました");

const furitenState = createState();
furitenState.players[0].hand = hand(["1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s", "white", "white", "9m", "9m"]);
furitenState.players[0].discards = [tile("white")];
furitenState.lastDiscard = { playerIndex: 2, tile: tile("white") };
const furitenRon = Sanma.ActionResolver.findAction(furitenState, 0, "ron");
assert(!furitenRon.enabled && furitenRon.reason.includes("フリテン"), "自捨て牌フリテンでロンを止められません");
furitenState.players[0].receiveTile(furitenState.lastDiscard.tile);
assert(Sanma.ActionResolver.findAction(furitenState, 0, "tsumo").enabled, "自捨て牌フリテンでツモを止めました");
furitenState.players[0].hand.pop();
furitenState.players[0].lastDraw = null;
furitenState.players[0].discards = [];
assert(Sanma.ActionResolver.findAction(furitenState, 0, "ron").enabled, "非フリテンのロンを止めました");

const riichiActionState = createState();
riichiActionState.players[0].hasRiichi = true;
riichiActionState.players[0].hand = hand(["north", "white", "white", "white", "white"]);
riichiActionState.lastDiscard = { playerIndex: 2, tile: tile("white") };
["pon", "chi", "kan", "kita"].forEach((id) => {
  assert(!Sanma.ActionResolver.findAction(riichiActionState, 0, id).enabled, `リーチ後に${id}が有効です`);
});

const discardEngine = new Sanma.GameEngine({ ruleConfig: {}, seed: "phase9-2-riichi-lock", onChange: function noop() {} });
discardEngine.humanPlayer.hand = hand(["1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s", "east", "east", "east", "9m"]);
const lockedDraw = tile("1m");
discardEngine.humanPlayer.receiveTile(lockedDraw);
discardEngine.humanPlayer.hasRiichi = true;
discardEngine.phase = "human-discard";
discardEngine.turnIndex = 0;
const lockedTile = discardEngine.humanPlayer.hand.find((ownedTile) => ownedTile.instanceId !== lockedDraw.instanceId);
const handLengthBeforeReject = discardEngine.humanPlayer.hand.length;
discardEngine.discardHumanTile(lockedTile.instanceId);
assert(discardEngine.humanPlayer.hand.length === handLengthBeforeReject, "リーチ後の手出し拒否で牌を失いました");
assert(discardEngine.logs[0].includes("リーチ後はツモ切りのみです。"), "リーチ後の手出し拒否理由が不明です");
discardEngine.discardHumanTile(lockedDraw.instanceId);
assert(discardEngine.humanPlayer.discards.some((ownedTile) => ownedTile.instanceId === lockedDraw.instanceId), "リーチ後のツモ切りを実行できません");

const cpuDiscardState = createState();
cpuDiscardState.players[1].hand = hand(["1p", "2p", "3p"]);
cpuDiscardState.players[1].hasRiichi = true;
cpuDiscardState.players[1].lastDraw = cpuDiscardState.players[1].hand[2];
const cpuEngine = new Sanma.GameEngine({ ruleConfig: {}, seed: "phase9-2-cpu-lock", onChange: function noop() {} });
cpuEngine.players[1] = cpuDiscardState.players[1];
assert(cpuEngine.chooseCpuDiscardIndex(cpuEngine.players[1]) === 2, "CPUリーチ後のツモ切り位置が不正です");

const callEngine = new Sanma.GameEngine({ ruleConfig: { allowChi: true }, seed: "phase9-2-call-ippatsu", onChange: function noop() {} });
callEngine.players[0].hand = hand(["white", "white", "1p"]);
callEngine.players[1].ippatsuActive = true;
const calledTile = tile("white");
callEngine.players[2].discards = [calledTile];
callEngine.lastDiscard = { playerIndex: 2, tile: calledTile };
callEngine.callWindow = Sanma.CallWindow.create(callEngine, 0);
callEngine.phase = "human-call";
callEngine.claimHumanCall("pon", 0);
assert(!callEngine.players.some((player) => player.ippatsuActive), "鳴き成立後に一発状態が残りました");

const record = Sanma.GameRecord.create({ players: createState().players });
["deal", "draw", "discard"].forEach((type, index) => Sanma.GameRecord.addEvent(record, type, { index }));
assert(record.rounds[0].events.map((event) => event.type).join(",") === "deal,draw,discard", "牌譜イベントが時系列順ではありません");
assert(new Set(record.rounds[0].events.map((event) => event.index)).size === 3, "牌譜イベントが重複しています");

console.log("Phase 9.2 rules and scoring regression tests passed.");
