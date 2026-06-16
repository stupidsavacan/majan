const { assert, loadModules } = require("./test-helpers");

const Sanma = loadModules();
const agariResult = {
  isAgari: true,
  bestPattern: { type: "standard", pair: { tileTypes: ["2p"] }, melds: [] },
};
const yakuResult = {
  hasYaku: true,
  isYakuman: false,
  totalHan: 5,
  yaku: [{ id: "riichi", han: 1 }],
  yakuman: [],
};

function score(winType, honba, config) {
  return Sanma.ScoreCalculator.calculateScore({
    agariResult,
    yakuResult,
    context: {
      winType,
      winnerIndex: 0,
      loserIndex: 1,
      dealerIndex: 0,
      honba,
      riichiSticks: 0,
      isMenzen: true,
      melds: [],
    },
    ruleConfig: config,
  });
}

const defaults = Sanma.RuleConfig.createRuleConfig({});
const defaultRon = score("ron", 1, defaults);
assert(defaultRon.payments.ron.honba === 300, "既定ron本場点が300点ではありません");
const defaultTsumo = score("tsumo", 1, defaults);
assert(defaultTsumo.payments.tsumo.honbaTotal === 300, "既定tsumo本場合計が300点ではありません");
assert(defaultTsumo.payments.tsumo.payers.reduce((sum, payer) => sum + payer.honba, 0) === 300, "既定tsumo本場点を支払者へ正しく配分しません");

const custom = Sanma.RuleConfig.createRuleConfig({ honbaPoints: { ron: 700, tsumoTotal: 900 } });
assert(score("ron", 2, custom).payments.ron.honba === 1400, "custom honbaPoints.ronをロンへ反映しません");
const customTsumo = score("tsumo", 2, custom);
assert(customTsumo.payments.tsumo.honbaTotal === 1800, "custom honbaPoints.tsumoTotalをツモへ反映しません");
assert(customTsumo.payments.tsumo.payers.reduce((sum, payer) => sum + payer.honba, 0) === 1800, "custom tsumoTotalを決定的に配分しません");

const invalid = Sanma.RuleConfig.createRuleConfig({ honbaPoints: { ron: -100, tsumoTotal: 350 } });
assert(invalid.honbaPoints.ron === 300 && invalid.honbaPoints.tsumoTotal === 300, "不正honbaPointsを既定値へ正規化しません");

console.log("Phase 14.2D honbaPoints configuration tests passed.");
