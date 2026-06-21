const fs = require("fs");
const path = require("path");
const vm = require("vm");

const projectRoot = path.resolve(__dirname, "..");
const gameRoot = fs.existsSync(path.resolve(projectRoot, "src", "game", "Tile.js"))
  ? ""
  : "extracted-zips/offline-sanma-mahjong-phase1";
const modules = [
  "src/game/RuleConfig.js",
  "src/game/Tile.js",
  "src/game/HandAnalysis.js",
  "src/game/DoraCalculator.js",
  "src/game/YakuAnalysis.js",
];

global.window = global;
global.Sanma = {};
modules.forEach((file) => {
  vm.runInThisContext(fs.readFileSync(path.resolve(projectRoot, gameRoot, file), "utf8"), { filename: file });
});

const Sanma = global.Sanma;
let copyIndex = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function tile(code) {
  const honorMap = { east: 1, south: 2, west: 3, north: 4, white: 5, green: 6, red: 7 };
  const suit = honorMap[code] ? "z" : code.slice(-1);
  const rank = honorMap[code] || Number(code.slice(0, -1));
  copyIndex += 1;
  return Sanma.TileUtil.createTile(suit, rank, copyIndex, false);
}

function hand(codes) {
  return codes.map(tile);
}

function kan(code, open) {
  return { type: "kan", open: open !== false, tiles: [tile(code), tile(code), tile(code), tile(code)] };
}

function analyze(codes, context, options) {
  const settings = options || {};
  const ruleConfig = Sanma.RuleConfig.createRuleConfig(Object.assign({ northMode: "kita-dora", kuitan: true, doubleYakuman: true }, settings.ruleConfig || {}));
  const concealedTiles = hand(codes);
  const fixedMelds = settings.fixedMelds || [];
  const allTiles = concealedTiles.concat(fixedMelds.flatMap((meld) => meld.tiles || []));
  const agariResult = fixedMelds.length
    ? Sanma.HandAnalysis.analyzeAgariWithMelds(concealedTiles, fixedMelds, ruleConfig)
    : Sanma.HandAnalysis.analyzeAgari(concealedTiles, ruleConfig);
  const yakuResult = Sanma.YakuAnalysis.analyzeYaku({
    tiles: allTiles,
    ruleConfig,
    agariResult,
    context: Object.assign({
      winType: "ron",
      isMenzen: fixedMelds.every((meld) => meld.open === false),
      seatWind: "east",
      roundWind: "south",
      waitType: null,
    }, context || {}),
  });
  return { agariResult, yakuResult };
}

function has(result, id) {
  return result.yakuResult.yaku.some((item) => item.id === id)
    || result.yakuResult.yakuman.some((item) => item.id === id);
}

function yakuItem(result, id) {
  return result.yakuResult.yaku.find((item) => item.id === id)
    || result.yakuResult.yakuman.find((item) => item.id === id);
}

const ittsuu = analyze(["1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "2s", "3s", "4s", "9m", "9m"]);
assert(has(ittsuu, "ittsuu"), "筒子123/456/789の一気通貫を判定できません");
assert(yakuItem(ittsuu, "ittsuu").han === 2, "門前一気通貫が2飜ではありません");
const noIttsuu = analyze(["1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s", "2s", "3s", "4s", "9m", "9m"]);
assert(!has(noIttsuu, "ittsuu"), "同色でない123/456/789を一気通貫にしています");

const chanta = analyze(["1p", "2p", "3p", "7p", "8p", "9p", "1s", "2s", "3s", "9s", "9s", "9s", "east", "east"]);
assert(has(chanta, "chanta"), "混全帯么九を判定できません");
const junchan = analyze(["1p", "2p", "3p", "7p", "8p", "9p", "1s", "2s", "3s", "7s", "8s", "9s", "1m", "1m"]);
assert(has(junchan, "junchan"), "純全帯么九を判定できません");
assert(!has(junchan, "chanta"), "純全帯么九に混全帯么九を二重計上しています");
const noChanta = analyze(["1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s", "1s", "1s", "1s", "9m", "9m"]);
assert(!has(noChanta, "chanta") && !has(noChanta, "junchan"), "中張牌順子を含む手をチャンタ系にしています");

const sanankouTsumo = analyze(["2p", "2p", "2p", "3s", "3s", "3s", "9p", "9p", "9p", "1s", "2s", "3s", "1m", "1m"], { winType: "tsumo" });
assert(has(sanankouTsumo, "sanankou"), "ツモ完成の三暗刻を判定できません");
const sanankouRonShanpon = analyze(["2p", "2p", "2p", "3s", "3s", "3s", "9p", "9p", "9p", "1s", "2s", "3s", "1m", "1m"], { winType: "ron", waitType: "shanpon", winningTile: tile("9p") });
assert(!has(sanankouRonShanpon, "sanankou"), "ロンで完成したシャンポン刻子を暗刻扱いしています");

const shousangen = analyze(["white", "white", "white", "green", "green", "green", "red", "red", "1p", "2p", "3p", "7s", "8s", "9s"]);
assert(has(shousangen, "shousangen"), "小三元を判定できません");

const ryanpeikou = analyze(["1p", "2p", "3p", "1p", "2p", "3p", "7s", "8s", "9s", "7s", "8s", "9s", "1m", "1m"]);
assert(has(ryanpeikou, "ryanpeikou"), "二盃口を七対子形から判定できません");
assert(!has(ryanpeikou, "iipeikou") && !has(ryanpeikou, "chiitoitsu"), "二盃口で一盃口/七対子を二重計上しています");
const iipeikou = analyze(["1p", "2p", "3p", "1p", "2p", "3p", "4s", "5s", "6s", "7s", "8s", "9s", "9m", "9m"]);
assert(has(iipeikou, "iipeikou") && !has(iipeikou, "ryanpeikou"), "一盃口と二盃口の排他が壊れています");

const chinroutou = analyze(["1m", "1m", "1m", "9m", "9m", "9m", "1p", "1p", "1p", "9s", "9s", "9s", "9p", "9p"]);
assert(has(chinroutou, "chinroutou") && yakuItem(chinroutou, "chinroutou").isYakuman, "清老頭を役満として判定できません");
const ryuuiisou = analyze(["2s", "2s", "2s", "3s", "3s", "3s", "4s", "4s", "4s", "6s", "6s", "6s", "8s", "8s"]);
assert(has(ryuuiisou, "ryuuiisou"), "發なし許可設定で緑一色を判定できません");
const ryuuiisouNeedsHatsu = analyze(["2s", "2s", "2s", "3s", "3s", "3s", "4s", "4s", "4s", "6s", "6s", "6s", "8s", "8s"], {}, { ruleConfig: { yakuRules: { ryuuiisouRequiresHatsu: true } } });
assert(!has(ryuuiisouNeedsHatsu, "ryuuiisou"), "發必須設定で發なし緑一色を許可しています");

const pureChuuren = analyze(["1p", "1p", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "9p", "9p", "5p"], { winningTile: tile("5p") });
assert(has(pureChuuren, "chuuren-9-wait") && yakuItem(pureChuuren, "chuuren-9-wait").yakuman === 2, "純正九蓮宝燈をダブル役満として判定できません");
const chuuren = analyze(["1s", "1s", "1s", "2s", "3s", "4s", "5s", "6s", "7s", "8s", "9s", "9s", "9s", "5s"], { winningTile: tile("1s") });
assert(has(chuuren, "chuuren-poutou") && !has(chuuren, "chuuren-9-wait"), "通常九蓮宝燈と純正九蓮宝燈の判定が壊れています");
const noManzuChuuren = analyze(["1m", "1m", "1m", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "9p", "9p"]);
assert(!has(noManzuChuuren, "chuuren-poutou") && !has(noManzuChuuren, "chuuren-9-wait"), "萬子混在形を九蓮宝燈にしています");

const sankantsu = analyze(["1s", "1s", "1s", "9m", "9m"], {}, { fixedMelds: [kan("2p", false), kan("3s", true), kan("9p", true)] });
assert(sankantsu.agariResult.isAgari && has(sankantsu, "sankantsu"), "三槓子を判定できません");
const suukantsu = analyze(["9m", "9m"], {}, { fixedMelds: [kan("2p", false), kan("3s", true), kan("9p", true), kan("1s", true)] });
assert(suukantsu.agariResult.isAgari && has(suukantsu, "suukantsu") && yakuItem(suukantsu, "suukantsu").isYakuman, "四槓子を役満として判定できません");

const sanshokuDoukou = analyze(["1m", "1m", "1m", "1p", "1p", "1p", "1s", "1s", "1s", "7p", "8p", "9p", "east", "east"]);
assert(has(sanshokuDoukou, "sanshoku-doukou"), "1萬/1筒/1索の三色同刻を判定できません");
const noSanshokuDoukou = analyze(["9m", "9m", "9m", "1p", "1p", "1p", "1s", "1s", "1s", "7p", "8p", "9p", "east", "east"]);
assert(!has(noSanshokuDoukou, "sanshoku-doukou"), "数字が揃っていない刻子を三色同刻にしています");

const tanyao = analyze(["2p", "3p", "4p", "3p", "4p", "5p", "4s", "5s", "6s", "6s", "7s", "8s", "2s", "2s"]);
assert(has(tanyao, "tanyao"), "既存の断么九判定が壊れています");
const kokushi = analyze(["1m", "9m", "1p", "9p", "1s", "9s", "east", "south", "west", "north", "white", "green", "red", "1m"]);
assert(has(kokushi, "kokushi-musou") && kokushi.yakuResult.isYakuman, "既存の国士無双判定が壊れています");
const ruleConfig = Sanma.RuleConfig.createRuleConfig();
assert(ruleConfig.yakuRules.renhou === "disabled", "人和の採用判断がRuleConfigに固定されていません");
assert(ruleConfig.yakuRules.nagashiMangan === "deferred", "流し満貫の流局処理待ち方針がRuleConfigに固定されていません");

console.log("Issue #26 Priority B/C yaku tests passed.");
