const { assert, loadModules } = require("./phase14-2-test-utils");
const { createTileFactory } = require("./test-helpers");

const Sanma = loadModules();
const tile = createTileFactory(Sanma.TileUtil);
const ruleConfig = Sanma.RuleConfig.createRuleConfig({ doubleYakuman: true });
const codes = ["1m", "9m", "1p", "9p", "1s", "9s", "east", "south", "west", "north", "white", "green", "red", "1m"];

function analyze(context) {
  const tiles = codes.map((code) => tile(code));
  const agariResult = Sanma.HandAnalysis.analyzeAgari(tiles, ruleConfig);
  const yakuResult = Sanma.YakuAnalysis.analyzeYaku({
    tiles,
    ruleConfig,
    agariResult,
    context: Object.assign({
      winType: "ron",
      winnerIndex: 0,
      loserIndex: 1,
      dealerIndex: 0,
      seatWind: "east",
      roundWind: "east",
      isMenzen: true,
    }, context || {}),
  });
  const scoreResult = Sanma.ScoreCalculator.calculateScore({
    tiles,
    ruleConfig,
    agariResult,
    yakuResult,
    context: yakuResult.context,
  });
  return { yakuResult, scoreResult };
}

const normal = analyze({ winningTile: tile("9p") });
assert(normal.yakuResult.yakuman.find((item) => item.id === "kokushi-musou").yakuman === 1, "通常国士無双が1倍役満ではありません");
assert(normal.scoreResult.yakumanCount === 1 && normal.scoreResult.payments.ron.amount === 48000, "親の単一役満が48000点ではありません");

const thirteen = analyze({ winningTile: tile("1m") });
assert(thirteen.yakuResult.yakuman.find((item) => item.id === "kokushi-musou-13-wait").yakuman === 2, "国士無双十三面待ちが2倍役満ではありません");
assert(thirteen.scoreResult.yakumanCount === 2, "国士無双十三面待ちの倍率を合算していません");

const triple = analyze({ winningTile: tile("1m"), isTenho: true });
assert(triple.yakuResult.yakuman.some((item) => item.id === "tenho"), "天和を役満として追加していません");
assert(triple.scoreResult.yakumanCount === 3 && triple.scoreResult.payments.ron.amount === 144000, "天和と国士十三面の複合3倍役満が144000点ではありません");
assert(triple.yakuResult.dora.length === 0 && triple.scoreResult.han === 0, "役満へドラを加算しました");

const chiho = analyze({ winningTile: tile("9p"), isChiho: true });
assert(chiho.yakuResult.yakuman.some((item) => item.id === "chiho"), "地和を役満として追加していません");

const manual = Sanma.ScoreCalculator.calculateScore({
  ruleConfig,
  agariResult: { isAgari: true, bestPattern: { type: "kokushi" } },
  yakuResult: {
    hasYaku: true,
    totalHan: 0,
    isYakuman: true,
    yakuman: [{ yakuman: 2 }, { yakuman: 1 }],
    yaku: [],
  },
  context: { winType: "ron", winnerIndex: 0, loserIndex: 1, dealerIndex: 0, isMenzen: true },
});
assert(manual.yakumanCount === 3 && manual.payments.ron.amount === 144000, "役満配列長ではなく倍率合計を使用していません");

console.log("Phase 14.2 yakuman multiplicity tests passed.");
