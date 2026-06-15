const { assert, createTileFactory, loadModules } = require("./test-helpers");

const Sanma = loadModules();
const tile = createTileFactory(Sanma.TileUtil);

function hand(codes) {
  return codes.map((code) => tile(code));
}

function stateWithMeld(meld, concealedCodes, winningCode) {
  const ruleConfig = Sanma.RuleConfig.createRuleConfig({});
  const players = [
    new Sanma.Player({ id: 0, name: "あなた", seatWind: "east", isHuman: true, points: 35000 }),
    new Sanma.Player({ id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: 35000 }),
    new Sanma.Player({ id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: 35000 }),
  ];
  players[0].hand = hand(concealedCodes);
  players[0].melds = [meld];
  const winningTile = tile(winningCode);
  return {
    state: {
      ruleConfig,
      players,
      round: { roundWind: "east", dealerIndex: 0, honba: 0, riichiSticks: 0 },
      turnIndex: 0,
      phase: "human-call",
      lastDiscard: { playerIndex: 2, tile: winningTile },
      wall: { doraIndicators: [], remainingCount: () => 30 },
      pendingWinContext: null,
    },
    winningTile,
  };
}

function analyze(meld, concealedCodes, winningCode) {
  const input = stateWithMeld(meld, concealedCodes, winningCode);
  return Sanma.ActionResolver.analyzeWin(input.state, 0, "ron", input.winningTile, 2);
}

function hasYaku(analysis, id) {
  return analysis.yakuResult.yaku.some((item) => item.id === id);
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

console.log("Phase 14.1 fixed meld scoring tests passed.");
