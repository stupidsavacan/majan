const { assert, createTileFactory, loadModules } = require("./test-helpers");

const Sanma = loadModules();
const tile = createTileFactory(Sanma.TileUtil);
const ruleConfig = Sanma.RuleConfig.createRuleConfig({});

function playerWith(codes) {
  return {
    id: 1,
    name: "CPU 1",
    isHuman: false,
    hand: codes.map((code) => tile(code)),
    melds: [],
    discards: [],
    kitaTiles: [],
  };
}

function choose(player, seed) {
  return Sanma.CpuStrategy.chooseDiscard({
    player,
    ruleConfig,
    random: Sanma.createRandom(seed),
  });
}

const obviousHand = playerWith([
  "1p", "2p", "3p",
  "4p", "5p", "6p",
  "7s", "8s", "9s",
  "white", "white",
  "9m", "9m",
  "east",
]);
const originalIds = obviousHand.hand.map((ownedTile) => ownedTile.instanceId);
const obviousDecision = choose(obviousHand, "phase7-obvious");
assert(originalIds.includes(obviousDecision.tileInstanceId), "CPUが実際の手牌にない牌を選びました");
assert(obviousHand.hand.length === 14, "CPU戦略が手牌枚数を変更しました");
assert(
  originalIds.every((instanceId, index) => obviousHand.hand[index].instanceId === instanceId),
  "CPU戦略が手牌の内容または順序を変更しました"
);
assert(
  obviousHand.hand.find((ownedTile) => ownedTile.instanceId === obviousDecision.tileInstanceId).suit === "z",
  "明確な孤立字牌より有用な対子・順子候補を優先して捨てました"
);

const manzuHand = playerWith([
  "1m", "9m",
  "1p", "2p", "4p", "5p", "6p",
  "3s", "4s", "5s", "7s", "8s",
  "white", "white",
]);
const manzuDecision = choose(manzuHand, "phase7-manzu");
const manzuCandidates = manzuDecision.candidates.filter((candidate) => (
  candidate.tileType === "1m" || candidate.tileType === "9m"
));
assert(manzuCandidates.length === 2, "萬子1m/9mの候補を評価できません");
assert(
  manzuCandidates.every((candidate) => !candidate.reasons.includes("筋牌形を崩す")),
  "萬子1m/9mを順子候補として扱っています"
);

const firstDeterministic = choose(manzuHand, "phase7-fixed-seed");
const secondDeterministic = choose(manzuHand, "phase7-fixed-seed");
assert(
  firstDeterministic.tileInstanceId === secondDeterministic.tileInstanceId,
  "固定シードでCPU打牌が再現できません"
);
assert(
  firstDeterministic.candidates.map((candidate) => candidate.score).join(",")
    === secondDeterministic.candidates.map((candidate) => candidate.score).join(","),
  "固定シードで候補順位が再現できません"
);

const callPlayer = playerWith([
  "1p", "2p", "3p",
  "4p", "5p", "6p",
  "7s", "8s", "9s",
  "white", "white",
  "9m", "9m",
]);
callPlayer.seatWind = "east";
const discardedWhite = tile("white");
const ponCandidate = {
  playerIndex: 1,
  actionId: "pon",
  optionIndex: 0,
  priority: 3,
  option: {
    type: "pon",
    tile: discardedWhite,
    fromPlayerIndex: 0,
    consumeInstanceIds: callPlayer.hand
      .filter((ownedTile) => ownedTile.baseId === "z5")
      .map((ownedTile) => ownedTile.instanceId),
  },
};
const selectedPonCall = Sanma.CpuStrategy.chooseCall({
  state: { ruleConfig, round: { roundWind: "east" } },
  player: callPlayer,
  legalCalls: [ponCandidate],
  random: function zeroRandom() { return 0; },
});
assert(selectedPonCall === ponCandidate, "CPUが合法な役牌ポン候補をそのまま返しません");
assert(callPlayer.hand.length === 13, "CPU鳴き選択が手牌枚数を変更しました");

const chiPlayer = playerWith([
  "1p", "2p",
  "4p", "5p", "6p",
  "7p", "8p", "9p",
  "2s", "3s", "4s",
  "white", "white",
]);
const chiCandidate = {
  playerIndex: 1,
  actionId: "chi",
  optionIndex: 0,
  priority: 4,
  option: {
    type: "chi",
    tile: tile("3p"),
    fromPlayerIndex: 0,
    consumeInstanceIds: chiPlayer.hand
      .filter((ownedTile) => ownedTile.baseId === "1p" || ownedTile.baseId === "2p")
      .map((ownedTile) => ownedTile.instanceId),
  },
};
assert(
  Sanma.CpuStrategy.chooseCall({
    state: { ruleConfig },
    player: chiPlayer,
    legalCalls: [chiCandidate],
    random: function zeroRandom() { return 0; },
  }) === chiCandidate,
  "CPUが合法なチー候補をそのまま返しません"
);

const mixedIllegalCall = Sanma.CpuStrategy.chooseCall({
  state: { ruleConfig },
  player: chiPlayer,
  legalCalls: [{ actionId: "ron", option: { consumeInstanceIds: [] } }],
  random: function zeroRandom() { return 0; },
});
assert(mixedIllegalCall === null, "CPU鳴き選択が未対応または不正な候補を選びました");
assert(
  Sanma.CpuStrategy.chooseCall({ state: { ruleConfig }, player: chiPlayer, legalCalls: [] }) === null,
  "CPU鳴き選択が候補なしでnullを返しません"
);
const riichiPlayer = Object.assign(playerWith([
  "1p", "2p", "3p",
  "4p", "5p", "6p",
  "7s", "8s", "9s",
  "white", "white",
  "9m", "9m",
]), { hasRiichi: true });
assert(
  Sanma.CpuStrategy.chooseCall({
    state: { ruleConfig },
    player: riichiPlayer,
    legalCalls: [ponCandidate],
    random: function zeroRandom() { return 0; },
  }) === null,
  "CPU鳴き選択がリーチ後に候補を選びました"
);
const callSnapshot = JSON.stringify({ hand: callPlayer.hand, melds: callPlayer.melds, discards: callPlayer.discards });
Sanma.CpuStrategy.chooseCall({
  state: { ruleConfig, round: { roundWind: "east" } },
  player: callPlayer,
  legalCalls: [ponCandidate],
  random: function zeroRandom() { return 0; },
});
assert(
  JSON.stringify({ hand: callPlayer.hand, melds: callPlayer.melds, discards: callPlayer.discards }) === callSnapshot,
  "CPU鳴き選択がプレイヤー状態を変更しました"
);

const engine = new Sanma.GameEngine({
  ruleConfig,
  seed: "phase7-assist",
  onChange: function noop() {},
});
const integrityBefore = Sanma.AssistManager.tileIntegrity(engine);
const assistEvent = Sanma.AssistManager.evaluateDraw({
  state: engine,
  player: engine.players[1],
  ruleConfig,
  random: Sanma.createRandom("phase7-assist-event"),
});
const integrityAfter = Sanma.AssistManager.tileIntegrity(engine);
assert(assistEvent.applied === false, "AssistManagerが未実装の牌交換を適用しました");
assert(assistEvent.integrityValid, "AssistManagerの牌数整合性チェックが失敗しました");
assert(integrityBefore.tileCount === integrityAfter.tileCount, "AssistManagerが牌数を変更しました");
assert(integrityAfter.duplicateInstanceIds.length === 0, "AssistManagerが牌を複製しました");

const disabledEvent = Sanma.AssistManager.evaluateDraw({
  state: engine,
  player: engine.players[0],
  ruleConfig: Object.assign({}, ruleConfig, { dramaticLuckAssist: false }),
  random: Sanma.createRandom("phase7-disabled-assist"),
});
assert(!disabledEvent.enabled && !disabledEvent.applied, "無効化したAssistManagerが動作しました");

const cpuTsumoEngine = new Sanma.GameEngine({
  ruleConfig,
  seed: "phase7-cpu-tsumo",
  onChange: function noop() {},
});
cpuTsumoEngine.players[1].hand = [
  "1p", "2p", "3p",
  "4p", "5p", "6p",
  "7s", "8s", "9s",
  "white", "white", "white",
  "9m", "9m",
].map((code) => tile(code));
assert(cpuTsumoEngine.tryCpuTsumo(cpuTsumoEngine.players[1]), "CPUが有効なツモ和了を実行できません");
assert(
  cpuTsumoEngine.phase === "win-ended" && cpuTsumoEngine.winResult.winnerIndex === 1,
  "CPUツモ和了後に正しく局終了できません"
);

const cpuRiichiEngine = new Sanma.GameEngine({
  ruleConfig,
  seed: "phase7-cpu-riichi",
  onChange: function noop() {},
});
cpuRiichiEngine.players[1].hand = [
  "1p", "2p", "3p",
  "4p", "5p", "6p",
  "7s", "8s", "9s",
  "east", "east", "east",
  "9m", "1m",
].map((code) => tile(code));
const pointsBeforeRiichi = cpuRiichiEngine.players[1].points;
assert(cpuRiichiEngine.tryCpuRiichi(cpuRiichiEngine.players[1]), "CPUが聴牌時にリーチを宣言できません");
assert(
  cpuRiichiEngine.players[1].riichi.pending
    && !cpuRiichiEngine.players[1].hasRiichi
    && cpuRiichiEngine.players[1].points === pointsBeforeRiichi,
  "CPUリーチ宣言牌の選択待ちが正しくありません"
);
const cpuRiichiDiscardIndex = cpuRiichiEngine.chooseCpuDiscardIndex(cpuRiichiEngine.players[1]);
const cpuRiichiDiscard = cpuRiichiEngine.players[1].discardTileAt(cpuRiichiDiscardIndex);
assert(
  Sanma.RiichiRules.handleDiscard(cpuRiichiEngine, 1, cpuRiichiDiscard).finalized
    && cpuRiichiEngine.players[1].hasRiichi
    && cpuRiichiEngine.players[1].points === pointsBeforeRiichi - 1000,
  "CPUの宣言打牌または供託が正しくありません"
);

const cpuKitaEngine = new Sanma.GameEngine({
  ruleConfig,
  seed: "phase7-cpu-kita",
  onChange: function noop() {},
});
cpuKitaEngine.players[1].hand = [
  "north", "north", "north", "north",
  "1p", "2p", "4p", "5p", "7s", "8s", "1m", "9m", "white", "green",
].map((code) => tile(code));
assert(!cpuKitaEngine.tryCpuKita(cpuKitaEngine.players[1]), "補充牌がある抜き北で局を終了しました");
assert(cpuKitaEngine.players[1].kitaTiles.length === 4, "CPU抜き北が安全な上限内で完了しません");

console.log("Phase 7 CPU strategy and assist tests passed.");
