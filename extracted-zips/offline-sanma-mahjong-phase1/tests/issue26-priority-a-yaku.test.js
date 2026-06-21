const fs = require("fs");
const path = require("path");
const vm = require("vm");

const gameRoot = fs.existsSync(path.resolve(__dirname, "..", "src", "game", "Tile.js"))
  ? ""
  : "extracted-zips/offline-sanma-mahjong-phase1";
global.window = global;
for (const file of ["src/game/Tile.js", "src/game/HandAnalysis.js", "src/game/DoraCalculator.js", "src/game/YakuAnalysis.js"]) {
  vm.runInThisContext(fs.readFileSync(path.resolve(__dirname, "..", gameRoot, file), "utf8"), { filename: file });
}

const { TileUtil, HandAnalysis, YakuAnalysis } = global.Sanma;
const rule = { northMode: "kita-dora", kuitan: true, doubleYakuman: true };
let copyIndex = 0;

function tile(code, options) {
  const honorMap = { east: 1, south: 2, west: 3, north: 4, white: 5, green: 6, red: 7 };
  const suit = honorMap[code] ? "z" : code.slice(-1);
  const rank = honorMap[code] || Number(code.slice(0, -1));
  copyIndex += 1;
  return TileUtil.createTile(suit, rank, copyIndex, Boolean(options && options.red));
}

function hand(codes) {
  return codes.map((code) => typeof code === "string" ? tile(code) : tile(code.code, code));
}

function meld(type, codes, open) {
  return { type, open: open !== false, tiles: hand(codes) };
}

function analyze(codes, context, ruleOverrides) {
  const tiles = hand(codes);
  const effectiveRule = Object.assign({}, rule, ruleOverrides || {});
  return YakuAnalysis.analyzeYaku({
    tiles,
    ruleConfig: effectiveRule,
    agariResult: HandAnalysis.analyzeAgari(tiles, effectiveRule),
    context: Object.assign({ winType: "ron", isMenzen: true, seatWind: "east", roundWind: "south" }, context || {}),
  });
}

function analyzeWithMelds(concealedCodes, fixedMelds, context, ruleOverrides) {
  const concealedTiles = hand(concealedCodes);
  const meldTiles = fixedMelds.flatMap((fixed) => fixed.tiles || []);
  const tiles = concealedTiles.concat(meldTiles);
  const effectiveRule = Object.assign({}, rule, ruleOverrides || {});
  return YakuAnalysis.analyzeYaku({
    tiles,
    ruleConfig: effectiveRule,
    agariResult: HandAnalysis.analyzeAgariWithMelds(concealedTiles, fixedMelds, effectiveRule),
    context: Object.assign({ winType: "ron", isMenzen: false, seatWind: "east", roundWind: "south", melds: fixedMelds }, context || {}),
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function yakuItem(result, id) {
  return result.yaku.find((item) => item.id === id) || null;
}

function yakumanItem(result, id) {
  return result.yakuman.find((item) => item.id === id) || null;
}

function has(result, id) {
  return Boolean(yakuItem(result, id) || yakumanItem(result, id));
}

const closedHonitsu = analyze(["1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "white", "white", "white", "east", "east"]);
assert(yakuItem(closedHonitsu, "honitsu") && yakuItem(closedHonitsu, "honitsu").han === 3, "門前ホンイツを3飜で判定できません");

const openHonitsu = analyzeWithMelds(
  ["1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "east", "east"],
  [meld("pon", ["white", "white", "white"], true)]
);
assert(yakuItem(openHonitsu, "honitsu") && yakuItem(openHonitsu, "honitsu").han === 2, "鳴きホンイツを2飜で判定できません");

const closedChinitsu = analyze(["1p", "2p", "3p", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "9p", "9p"]);
assert(yakuItem(closedChinitsu, "chinitsu") && yakuItem(closedChinitsu, "chinitsu").han === 6, "門前チンイツを6飜で判定できません");

const openChinitsu = analyzeWithMelds(
  ["2p", "3p", "4p", "4p", "5p", "6p", "7p", "8p", "9p", "9p", "9p"],
  [meld("chi", ["1p", "2p", "3p"], true)]
);
assert(yakuItem(openChinitsu, "chinitsu") && yakuItem(openChinitsu, "chinitsu").han === 5, "鳴きチンイツを5飜で判定できません");

const suuankou = analyze(
  ["1p", "1p", "1p", "2p", "2p", "2p", "3s", "3s", "3s", "9s", "9s", "9s", "east", "east"],
  { winType: "tsumo", waitType: "shanpon", winningTile: tile("1p") }
);
assert(yakumanItem(suuankou, "suuankou") && suuankou.isYakuman, "四暗刻を役満として判定できません");

const suuankouTanki = analyze(
  ["1p", "1p", "1p", "2p", "2p", "2p", "3s", "3s", "3s", "9s", "9s", "9s", "east", "east"],
  { winType: "ron", waitType: "tanki", winningTile: tile("east") }
);
assert(yakumanItem(suuankouTanki, "suuankou-tanki") && yakumanItem(suuankouTanki, "suuankou-tanki").yakuman === 2, "四暗刻単騎をダブル役満として判定できません");

const openTripletHand = analyzeWithMelds(
  ["2p", "2p", "2p", "3s", "3s", "3s", "9s", "9s", "9s", "east", "east"],
  [meld("pon", ["1p", "1p", "1p"], true)],
  { waitType: "tanki", winningTile: tile("east") }
);
assert(!has(openTripletHand, "suuankou") && !has(openTripletHand, "suuankou-tanki"), "明刻を含む手を四暗刻にしてはいけません");

const daisangen = analyze(["white", "white", "white", "green", "green", "green", "red", "red", "red", "1p", "2p", "3p", "9m", "9m"]);
assert(yakumanItem(daisangen, "daisangen"), "大三元を役満として判定できません");

const tsuuiisou = analyze(["east", "east", "south", "south", "west", "west", "north", "north", "white", "white", "green", "green", "red", "red"]);
assert(yakumanItem(tsuuiisou, "tsuuiisou"), "字一色を役満として判定できません");

const shousuushii = analyze(["east", "east", "east", "south", "south", "south", "west", "west", "west", "north", "north", "1p", "2p", "3p"]);
assert(yakumanItem(shousuushii, "shousuushii"), "小四喜を役満として判定できません");

const daisuushii = analyze(["east", "east", "east", "south", "south", "south", "west", "west", "west", "north", "north", "north", "white", "white"]);
assert(yakumanItem(daisuushii, "daisuushii") && yakumanItem(daisuushii, "daisuushii").yakuman === 2, "大四喜をダブル役満として判定できません");

const kokushi = analyze(
  ["1m", "9m", "1p", "9p", "1s", "9s", "east", "south", "west", "north", "white", "green", "red", "1m"],
  { winningTile: tile("1m") }
);
assert(yakumanItem(kokushi, "kokushi-musou-13-wait") && kokushi.isYakuman, "既存の国士無双判定を壊してはいけません");

const doraOnly = analyze(
  ["1p", "2p", "3p", "4p", "5p", "6p", "2s", "3s", "4s", "7s", "8s", "9s", "1m", "1m"],
  { doraIndicators: [tile("1p")] }
);
assert(!doraOnly.hasYaku && doraOnly.dora.length === 0 && doraOnly.totalHan === 0, "ドラだけを役として扱ってはいけません");

console.log("Issue #26 Priority A yaku tests passed.");
