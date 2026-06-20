const { assert, createTileFactory, loadModules } = require("./test-helpers");
const { arrangeEngine, createEngine } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const tile = createTileFactory(Sanma.TileUtil);

function hand(codes) {
  return codes.map((code) => tile(code));
}

function createPlayers() {
  return [
    new Sanma.Player({ id: 0, name: "あなた", seatWind: "east", isHuman: true, points: 35000 }),
    new Sanma.Player({ id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: 35000 }),
    new Sanma.Player({ id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: 35000 }),
  ];
}

function stateWithPlayerMeld(playerIndex, meld, concealedCodes, winningCode, loserIndex) {
  const ruleConfig = Sanma.RuleConfig.createRuleConfig({});
  const players = createPlayers();
  players[playerIndex].hand = hand(concealedCodes);
  players[playerIndex].melds = [meld];
  const winningTile = tile(winningCode);
  return {
    state: {
      ruleConfig,
      players,
      round: { roundWind: "east", dealerIndex: 0, honba: 0, riichiSticks: 0 },
      turnIndex: playerIndex,
      phase: "human-discard",
      lastDiscard: { playerIndex: loserIndex, tile: winningTile },
      wall: { doraIndicators: [], remainingCount: () => 30 },
      pendingWinContext: null,
    },
    winningTile,
  };
}

function stateWithMeld(meld, concealedCodes, winningCode) {
  const input = stateWithPlayerMeld(0, meld, concealedCodes, winningCode, 2);
  input.state.phase = "human-call";
  return input;
}

function analyze(meld, concealedCodes, winningCode) {
  const input = stateWithMeld(meld, concealedCodes, winningCode);
  return Sanma.ActionResolver.analyzeWin(input.state, 0, "ron", input.winningTile, 2);
}

function analyzePlayer(playerIndex, meld, concealedCodes, winningCode, loserIndex) {
  const input = stateWithPlayerMeld(playerIndex, meld, concealedCodes, winningCode, loserIndex);
  return {
    input,
    analysis: Sanma.ActionResolver.analyzeWin(input.state, playerIndex, "ron", input.winningTile, loserIndex),
  };
}

function hasYaku(analysis, id) {
  return analysis.yakuResult.yaku.some((item) => item.id === id);
}

function setLastDiscardFromRiver(engine, playerIndex, discardIndex) {
  const discardedTile = engine.players[playerIndex].discards[discardIndex || 0];
  assert(discardedTile, `player ${playerIndex} の河に対象牌がありません`);
  engine.lastDiscard = engine.createLastDiscard(playerIndex, discardedTile);
  return discardedTile;
}

const openChi = { type: "chi", open: true, fromPlayerIndex: 2, tiles: hand(["2p", "3p", "4p"]) };
const openTanyao = analyze(
  openChi,
  ["3p", "4p", "2s", "3s", "4s", "6p", "7p", "8p", "5s", "5s"],
  "5p"
);
assert(openTanyao.agariResult.isAgari, "固定順子を含む和了形を解析できませんでした");
assert(hasYaku(openTanyao, "tanyao") && openTanyao.scoreResult.isValidWin, "副露断么九を得点計算できませんでした");
assert(openTanyao.agariResult.bestPattern.melds.some((meld) => meld.fixed && meld.open), "固定面子のopen情報が失われました");
["riichi", "menzen-tsumo", "pinfu", "iipeikou", "chiitoitsu"].forEach((id) => {
  assert(!hasYaku(openTanyao, id), `副露手に門前限定役${id}が付きました`);
});

const noYakuOpen = analyze(
  { type: "chi", open: true, fromPlayerIndex: 2, tiles: hand(["1p", "2p", "3p"]) },
  ["4p", "5p", "7s", "8s", "9s", "1s", "2s", "3s", "9m", "9m"],
  "6p"
);
assert(noYakuOpen.agariResult.isAgari && !noYakuOpen.scoreResult.isValidWin, "副露役なし手を有効な和了として扱いました");
assert(!hasYaku(noYakuOpen, "pinfu"), "副露手に平和が付きました");

const openWhitePon = { type: "pon", open: true, fromPlayerIndex: 1, tiles: hand(["white", "white", "white"]) };
const openYakuhai = analyze(
  openWhitePon,
  ["2p", "3p", "4p", "5p", "6p", "7p", "2s", "3s", "4s", "5s"],
  "5s"
);
assert(hasYaku(openYakuhai, "yakuhai-dragon-5"), "副露役牌を検出できませんでした");
assert(openYakuhai.scoreResult.fu === 30, `明刻を含む符計算が不正です: ${openYakuhai.scoreResult.fu}`);

const openWhiteKan = { type: "kan", kanType: "minkan", open: true, fromPlayerIndex: 1, tiles: hand(["white", "white", "white", "white"]) };
const openKanScore = analyze(
  openWhiteKan,
  ["2p", "3p", "4p", "5p", "6p", "7p", "2s", "3s", "4s", "5s"],
  "5s"
);
assert(openKanScore.scoreResult.fu === 40, `明槓を含む符計算が不正です: ${openKanScore.scoreResult.fu}`);
assert(openKanScore.agariResult.bestPattern.melds.some((meld) => meld.fixed && meld.isKan && meld.open), "明槓メタデータが和了形から失われました");

const closedWhiteKan = { type: "kan", kanType: "ankan", open: false, tiles: hand(["white", "white", "white", "white"]) };
const closedKanScore = analyze(
  closedWhiteKan,
  ["2p", "3p", "4p", "5p", "6p", "7p", "2s", "3s", "4s", "5s"],
  "5s"
);
assert(closedKanScore.context.isMenzen, "暗槓で門前状態が失われました");
assert(closedKanScore.scoreResult.fu === 70, `暗槓を含む符計算が不正です: ${closedKanScore.scoreResult.fu}`);

const openToitoi = analyze(
  { type: "pon", open: true, fromPlayerIndex: 2, tiles: hand(["2p", "2p", "2p"]) },
  ["3p", "3p", "3p", "4s", "4s", "4s", "white", "white", "white", "5p"],
  "5p"
);
assert(hasYaku(openToitoi, "toitoi"), "固定刻子を含む対々和を検出できませんでした");

const cpuOpenChi = { type: "chi", open: true, fromPlayerIndex: 0, tiles: hand(["2p", "3p", "4p"]) };
const cpuOpenTanyao = analyzePlayer(
  1,
  cpuOpenChi,
  ["3p", "4p", "2s", "3s", "4s", "6p", "7p", "8p", "5s", "5s"],
  "5p",
  0
);
assert(!cpuOpenTanyao.analysis.context.isMenzen, "CPU副露手を門前として扱いました");
assert(!Sanma.RiichiRules.isMenzen(cpuOpenTanyao.input.state.players[1]), "CPU open meldでisMenzenがfalseになりませんでした");
assert(cpuOpenTanyao.analysis.context.melds === cpuOpenTanyao.input.state.players[1].melds, "CPU meldsが和了コンテキストに渡っていません");
assert(cpuOpenTanyao.analysis.agariResult.bestPattern.melds.some((meld) => meld.fixed && meld.open), "CPU open meldのopen情報が和了形から失われました");
assert(hasYaku(cpuOpenTanyao.analysis, "tanyao") && cpuOpenTanyao.analysis.scoreResult.isValidWin, "CPU副露断么九を得点計算できませんでした");
["riichi", "menzen-tsumo", "pinfu", "iipeikou", "chiitoitsu"].forEach((id) => {
  assert(!hasYaku(cpuOpenTanyao.analysis, id), `CPU副露手に門前限定役${id}が付きました`);
});
const cpuRiichiAction = Sanma.ActionResolver.findAction(cpuOpenTanyao.input.state, 1, "riichi");
assert(cpuRiichiAction && !cpuRiichiAction.enabled, "CPU副露手でリーチ可能になりました");
assert(cpuRiichiAction.reason.includes("門前"), `CPU副露手のリーチ不可理由が不正です: ${cpuRiichiAction.reason}`);

const cpuOpenYakuhai = analyzePlayer(
  2,
  { type: "pon", open: true, fromPlayerIndex: 0, tiles: hand(["white", "white", "white"]) },
  ["2p", "3p", "4p", "5p", "6p", "7p", "2s", "3s", "4s", "5s"],
  "5s",
  0
);
assert(hasYaku(cpuOpenYakuhai.analysis, "yakuhai-dragon-5"), "CPU副露役牌を検出できませんでした");
assert(cpuOpenYakuhai.analysis.scoreResult.isValidWin, "CPU副露役牌を有効な和了として扱えませんでした");

const liveCpuOpenPonEngine = createEngine(Sanma, "phase14-1-live-cpu-open-pon-scoring", { allowChi: true });
arrangeEngine(Sanma, liveCpuOpenPonEngine, {
  turnIndex: 0,
  phase: "human-discard",
  players: [
    { hand: ["1p"], discards: ["white"] },
    { hand: ["white", "white", "2p", "3p", "4p", "5p", "6p", "7p", "2s", "3s", "4s", "5s"], lastDraw: false },
    { hand: ["1s", "2s", "3s"], lastDraw: false },
  ],
});
setLastDiscardFromRiver(liveCpuOpenPonEngine, 0, 0);
const liveCpuPonCandidate = Sanma.CallResolver.collectCpuCallCandidates(liveCpuOpenPonEngine, 0)
  .find((candidate) => candidate.playerIndex === 1 && candidate.actionId === "pon");
assert(liveCpuPonCandidate, "実際のCPUポン候補を検出できませんでした");
assert(liveCpuOpenPonEngine.applyCpuCall(liveCpuPonCandidate), "実際のCPUポンを適用できませんでした");
const liveCpuMeld = liveCpuOpenPonEngine.players[1].melds[0];
assert(liveCpuMeld && liveCpuMeld.type === "pon" && liveCpuMeld.open === true, "実CPUポン副露がopen ponとして保存されていません");
const liveCpuOpenPonAnalysis = Sanma.ActionResolver.analyzeWin(liveCpuOpenPonEngine, 1, "ron", tile("5s"), 2);
assert(!liveCpuOpenPonAnalysis.context.isMenzen, "実CPUポン後の和了解析が門前扱いになりました");
assert(liveCpuOpenPonAnalysis.context.melds === liveCpuOpenPonEngine.players[1].melds, "実CPUポンmeldsが和了コンテキストに渡っていません");
assert(liveCpuOpenPonAnalysis.agariResult.bestPattern.melds.some((meld) => meld.fixed && meld.open), "実CPUポンのopen情報が和了形から失われました");
assert(hasYaku(liveCpuOpenPonAnalysis, "yakuhai-dragon-5"), "実CPUポン後の副露役牌を検出できませんでした");
assert(liveCpuOpenPonAnalysis.scoreResult.isValidWin, "実CPUポン後の副露役牌を有効な和了として扱えませんでした");
["riichi", "menzen-tsumo", "pinfu", "iipeikou", "chiitoitsu"].forEach((id) => {
  assert(!hasYaku(liveCpuOpenPonAnalysis, id), `実CPUポン後の副露手に門前限定役${id}が付きました`);
});

console.log("Phase 14.1 fixed meld scoring tests passed.");
