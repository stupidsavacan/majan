const fs = require("fs");
const path = require("path");
const vm = require("vm");

global.window = global;
for (const file of ["src/game/Tile.js", "src/game/HandAnalysis.js", "src/game/DoraCalculator.js", "src/game/YakuAnalysis.js"]) {
  vm.runInThisContext(fs.readFileSync(path.resolve(__dirname, "..", file), "utf8"), { filename: file });
}

const { TileUtil, HandAnalysis, YakuAnalysis } = global.Sanma;
const rule = { northMode: "kita-dora", kuitan: true };
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

function analyze(codes, context) {
  const tiles = hand(codes);
  return YakuAnalysis.analyzeYaku({
    tiles,
    ruleConfig: rule,
    agariResult: HandAnalysis.analyzeAgari(tiles, rule),
    context: Object.assign({ winType: "ron", isMenzen: true, seatWind: "east", roundWind: "south" }, context || {}),
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function has(result, id) {
  return result.yaku.some((item) => item.id === id) || result.yakuman.some((item) => item.id === id);
}

const tanyao = ["2p", "3p", "4p", "3p", "4p", "5p", "4s", "5s", "6s", "6s", "7s", "8s", "2s", "2s"];
assert(has(analyze(tanyao), "tanyao"), "断么九を判定できません");

const dragon = ["1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s", "white", "white", "white", "9m", "9m"];
assert(has(analyze(dragon), "yakuhai-dragon-5"), "三元牌の役牌を判定できません");

const seat = ["1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s", "east", "east", "east", "9m", "9m"];
assert(has(analyze(seat), "yakuhai-seat"), "自風牌の役牌を判定できません");

const round = ["1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s", "south", "south", "south", "9m", "9m"];
assert(has(analyze(round), "yakuhai-round"), "場風牌の役牌を判定できません");

const chiitoitsu = ["1m", "1m", "9m", "9m", "1p", "1p", "2p", "2p", "3s", "3s", "east", "east", "white", "white"];
assert(has(analyze(chiitoitsu), "chiitoitsu"), "七対子を判定できません");

const kokushi = ["1m", "9m", "1p", "9p", "1s", "9s", "east", "south", "west", "north", "white", "green", "red", "1m"];
const kokushiResult = analyze(kokushi);
assert(has(kokushiResult, "kokushi-musou") && kokushiResult.isYakuman, "国士無双を役満として判定できません");

const noYaku = ["1p", "2p", "3p", "4p", "5p", "6p", "2s", "3s", "4s", "7s", "8s", "9s", "1m", "1m"];
const noYakuResult = analyze(noYaku);
assert(!noYakuResult.hasYaku && noYakuResult.reason === "和了形ですが役がありません。", "役なし和了形を正しく報告できません");

const redTanyao = tanyao.map((code, index) => index === 5 ? { code, red: true } : code);
assert(has(analyze(redTanyao), "tanyao"), "赤五で断么九判定が壊れています");

const doubleWind = analyze(seat, { roundWind: "east" });
assert(has(doubleWind, "yakuhai-seat") && has(doubleWind, "yakuhai-round"), "連風牌を自風・場風として別々に数えていません");

assert(has(analyze(tanyao, { winType: "tsumo" }), "menzen-tsumo"), "門前清自摸和を判定できません");

const pinfu = ["1p", "2p", "3p", "4p", "5p", "6p", "2s", "3s", "4s", "6s", "7s", "8s", "9m", "9m"];
assert(has(analyze(pinfu, { waitType: "ryanmen" }), "pinfu"), "両面待ちが明示された平和を判定できません");
assert(!has(analyze(pinfu), "pinfu"), "待ち形不明の平和を保守的に除外していません");

const iipeikou = ["1p", "2p", "3p", "1p", "2p", "3p", "4s", "5s", "6s", "7s", "8s", "9s", "9m", "9m"];
assert(has(analyze(iipeikou), "iipeikou"), "一盃口を判定できません");

const toitoi = ["1p", "1p", "1p", "9p", "9p", "9p", "1s", "1s", "1s", "white", "white", "white", "9m", "9m"];
const toitoiResult = analyze(toitoi);
assert(has(toitoiResult, "toitoi") && has(toitoiResult, "honroutou"), "対々和・混老頭を判定できません");

console.log("Phase 3 yaku analysis tests passed.");
