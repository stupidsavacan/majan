const { assert, createTileFactory, loadModules } = require("./test-helpers");

const Sanma = loadModules();
const tile = createTileFactory(Sanma.TileUtil);

function hand(codes) {
  return codes.map((code) => tile(code));
}

function players() {
  return [
    new Sanma.Player({ id: 0, name: "あなた", seatWind: "east", isHuman: true, points: 35000 }),
    new Sanma.Player({ id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: 35000 }),
    new Sanma.Player({ id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: 35000 }),
  ];
}

function state(overrides) {
  const ruleConfig = Sanma.RuleConfig.createRuleConfig(overrides || {});
  return {
    ruleConfig,
    players: players(),
    round: { roundWind: "east", dealerIndex: 0, honba: 0, riichiSticks: 0 },
    turnIndex: 0,
    phase: "human-discard",
    lastDiscard: null,
    wall: new Sanma.Wall(ruleConfig, { seed: "phase11-rules" }),
  };
}

function yakuFor(codes, context, ruleConfig) {
  const tiles = hand(codes);
  const agariResult = Sanma.HandAnalysis.analyzeAgari(tiles, ruleConfig);
  return Sanma.YakuAnalysis.analyzeYaku({ tiles, ruleConfig, agariResult, context });
}

const winningThirteen = ["1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s", "white", "white", "9m", "9m"];
const furitenState = state();
furitenState.players[0].hand = hand(winningThirteen);
furitenState.players[0].discards = [tile("white")];
furitenState.lastDiscard = { playerIndex: 2, tile: tile("white") };
const genbutsu = Sanma.FuritenManager.checkRonEligibility({
  state: furitenState,
  playerIndex: 0,
  winningTile: furitenState.lastDiscard.tile,
  sourcePlayerIndex: 2,
});
assert(!genbutsu.canRon && genbutsu.reasons.includes("現物フリテン"), "現物フリテンがロンを止めませんでした");
assert(!Sanma.ActionResolver.findAction(furitenState, 0, "ron").enabled, "ActionResolverが現物フリテンを無視しました");

furitenState.players[0].receiveTile(tile("white"));
furitenState.players[0].sameTurnFuriten = true;
assert(Sanma.ActionResolver.findAction(furitenState, 0, "tsumo").enabled, "フリテン中のツモ和了を止めました");

const sameTurnState = state();
sameTurnState.players[0].hand = hand(winningThirteen);
sameTurnState.players[0].sameTurnFuriten = true;
sameTurnState.lastDiscard = { playerIndex: 2, tile: tile("white") };
assert(!Sanma.ActionResolver.findAction(sameTurnState, 0, "ron").enabled, "同巡フリテンを無視しました");
Sanma.FuritenManager.markMissedRon(sameTurnState, 0);
assert(sameTurnState.players[0].sameTurnFuriten, "見逃し時に同巡フリテンを記録できませんでした");

const riichiState = state();
riichiState.players[0].hand = hand(["1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s", "east", "east", "east", "9m"]);
riichiState.players[0].melds.push({ type: "pon", tiles: hand(["white", "white", "white"]), open: true });
assert(!Sanma.RiichiRules.canDeclare(riichiState, 0).enabled, "副露手でリーチできました");
riichiState.players[0].melds = [];
riichiState.players[0].points = 999;
assert(!Sanma.RiichiRules.canDeclare(riichiState, 0).enabled, "1000点未満でリーチできました");
riichiState.players[0].points = 35000;
riichiState.wall.tiles = [];
assert(!Sanma.RiichiRules.canDeclare(riichiState, 0).enabled, "自摸牌がない状態でリーチできました");

const ippatsuState = state();
ippatsuState.players[0].hand = hand(["1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s", "east", "east", "east", "9m", "1m"]);
const pendingRiichi = Sanma.RiichiRules.declare(ippatsuState, 0);
assert(pendingRiichi.applied && pendingRiichi.pending && !ippatsuState.players[0].ippatsuActive, "リーチ宣言牌の選択待ちを開始できませんでした");
const riichiDiscard = ippatsuState.players[0].discardTileByInstanceId(pendingRiichi.discardOptions[0].instanceId);
assert(Sanma.RiichiRules.handleDiscard(ippatsuState, 0, riichiDiscard).finalized, "宣言打牌でリーチを確定できませんでした");
assert(ippatsuState.players[0].ippatsuActive && ippatsuState.players[0].riichi.ippatsu, "一発状態を開始できませんでした");
Sanma.RiichiRules.clearIppatsu(ippatsuState);
assert(!ippatsuState.players.some((player) => player.ippatsuActive), "鳴き後に一発状態が残りました");

const tanyao = ["2p", "3p", "4p", "3p", "4p", "5p", "4s", "5s", "6s", "6s", "7s", "8s", "2s", "2s"];
const uraConfig = Sanma.RuleConfig.createRuleConfig({});
const withUra = yakuFor(tanyao, {
  winType: "ron",
  isMenzen: true,
  isRiichi: true,
  uraDoraIndicators: [tile("1p")],
}, uraConfig);
const withoutRiichiUra = yakuFor(tanyao, {
  winType: "ron",
  isMenzen: true,
  isRiichi: false,
  uraDoraIndicators: [tile("1p")],
}, uraConfig);
assert(withUra.dora.some((item) => item.id === "ura-dora"), "リーチ和了で裏ドラを数えませんでした");
assert(!withoutRiichiUra.dora.some((item) => item.id === "ura-dora"), "非リーチ和了で裏ドラを数えました");

const kanState = state();
kanState.players[0].hand = hand(["5p", "5p", "5p", "5p"]);
const expectedFirstRinshan = kanState.wall.deadWall[13];
const countBeforeKan = kanState.wall.totalKnownTileCount(kanState.players);
const kanAction = Sanma.KanRules.getAvailableKanActions({ state: kanState, playerIndex: 0 })[0];
const kanResult = Sanma.KanRules.applyKan({ state: kanState, playerIndex: 0, kanAction });
assert(kanResult.applied && kanState.wall.doraIndicators.length === 2, "カン後にカンドラを表示できませんでした");
assert(kanResult.replacement && kanState.wall.totalKnownTileCount(kanState.players) === countBeforeKan, "カンで牌数が変化しました");
assert(kanResult.replacement === expectedFirstRinshan && kanState.wall.rinshanDrawCount === 1, "本来の嶺上牌を取得できませんでした");
const rinshanContext = Sanma.EndTurnYakuResolver.resolve({ state: kanState, playerIndex: 0, winType: "tsumo" });
assert(rinshanContext.isRinshan, "嶺上牌の和了文脈を渡せませんでした");
assert(yakuFor(tanyao, Object.assign({ winType: "tsumo", isMenzen: true }, rinshanContext), kanState.ruleConfig)
  .yaku.some((item) => item.id === "rinshan-kaihou"), "嶺上開花を役判定へ渡せませんでした");

const minkanState = state();
minkanState.players[0].hand = hand(["white", "white", "white"]);
const calledWhite = tile("white");
minkanState.players[2].discards = [calledWhite];
minkanState.lastDiscard = { playerIndex: 2, tile: calledWhite };
minkanState.turnIndex = 2;
minkanState.phase = "cpu-running";
const minkanAction = Sanma.ActionResolver.findAction(minkanState, 0, "kan");
assert(minkanAction.enabled && minkanAction.options.some((option) => option.type === "minkan"), "明槓を呼び出し操作として提示できませんでした");
assert(Sanma.KanRules.applyKan({
  state: minkanState,
  playerIndex: 0,
  kanAction: minkanAction.options.find((option) => option.type === "minkan"),
}).applied, "明槓を実行できませんでした");
assert(minkanState.players[2].discards.length === 0 && minkanState.players[0].melds[0].kanType === "minkan", "明槓の牌移動が不正です");

const kakanState = state();
kakanState.players[0].melds = [{ type: "pon", tiles: hand(["green", "green", "green"]), open: true, fromPlayerIndex: 1 }];
kakanState.players[0].hand = hand(["green"]);
const kakanAction = Sanma.KanRules.getAvailableKanActions({ state: kakanState, playerIndex: 0 })
  .find((option) => option.type === "kakan");
const kakanResult = Sanma.KanRules.applyKan({ state: kakanState, playerIndex: 0, kanAction: kakanAction });
assert(kakanResult.applied && !kakanResult.chankanContext && kakanState.players[0].melds[0].tiles.length === 4, "加槓の直接確定処理が不正です");

const chankanState = state();
chankanState.pendingWinContext = { isChankan: true };
const chankanContext = Sanma.EndTurnYakuResolver.resolve({ state: chankanState, playerIndex: 0, winType: "ron" });
assert(chankanContext.isChankan, "槍槓文脈を渡せませんでした");

const kitaState = state({ northMode: "kita-dora" });
kitaState.players[0].hand = hand(["north", "1p"]);
const countBeforeKita = kitaState.wall.totalKnownTileCount(kitaState.players);
const kitaResult = Sanma.KitaManager.extract(kitaState, 0);
assert(kitaResult.applied && kitaResult.replacement, "北抜きの補充牌を取得できませんでした");
assert(kitaState.wall.totalKnownTileCount(kitaState.players) === countBeforeKita, "北抜きで牌数が変化しました");

const illegalManzu = hand(["1m", "2m", "3m", "1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s", "east", "east"]);
assert(!Sanma.HandAnalysis.analyzeAgari(illegalManzu, state().ruleConfig).isAgari, "1m/9m以外の萬子順子を許可しました");
assert(!Sanma.SanmaRuleDetails.isManzuSequenceAllowed(), "三麻詳細ルールが萬子順子を許可しました");

console.log("Phase 11 advanced rule tests passed.");
