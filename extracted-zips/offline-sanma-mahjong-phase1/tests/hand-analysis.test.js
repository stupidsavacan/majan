const fs = require("fs");
const path = require("path");
const vm = require("vm");

global.window = global;
for (const file of ["src/game/Tile.js", "src/game/HandAnalysis.js"]) {
  vm.runInThisContext(fs.readFileSync(path.resolve(__dirname, "..", file), "utf8"), { filename: file });
}

const { TileUtil, HandAnalysis } = global.Sanma;
const defaultRule = { northMode: "kita-dora" };
let copyIndex = 0;

function tile(code, options) {
  const honorMap = { east: 1, south: 2, west: 3, north: 4, white: 5, green: 6, red: 7 };
  let suit;
  let rank;
  if (honorMap[code]) {
    suit = "z";
    rank = honorMap[code];
  } else {
    suit = code.slice(-1);
    rank = Number(code.slice(0, -1));
  }
  copyIndex += 1;
  return TileUtil.createTile(suit, rank, copyIndex, Boolean(options && options.red));
}

function hand(codes) {
  return codes.map((code) => typeof code === "string" ? tile(code) : tile(code.code, code));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertWait(result, tileType, message) {
  assert(result.isTenpai, `${message}: 聴牌になりませんでした`);
  assert(result.waits.some((wait) => wait.tileType === tileType), `${message}: ${tileType}待ちがありません`);
}

const standard = hand(["1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s", "east", "east", "east", "9m", "9m"]);
assert(HandAnalysis.isStandardAgari(standard, defaultRule).isAgari, "標準形を判定できません");

const illegalManzuSequence = hand(["1m", "2m", "3m", "1p", "2p", "3p", "4p", "5p", "6p", "east", "east", "east", "9m", "9m"]);
assert(!HandAnalysis.isStandardAgari(illegalManzuSequence, defaultRule).isAgari, "萬子1-2-3を面子として扱っています");

const chiitoitsu = hand(["1m", "1m", "9m", "9m", "1p", "1p", "2p", "2p", "3s", "3s", "east", "east", "white", "white"]);
assert(HandAnalysis.isChiitoitsuAgari(chiitoitsu, defaultRule).isAgari, "七対子を判定できません");
assert(HandAnalysis.analyzeAgari(chiitoitsu, defaultRule).bestPattern.type === "chiitoitsu", "統合APIが七対子を返しません");

const quadAsPairs = hand(["1p", "1p", "1p", "1p", "2p", "2p", "3p", "3p", "4s", "4s", "east", "east", "white", "white"]);
assert(!HandAnalysis.isChiitoitsuAgari(quadAsPairs, defaultRule).isAgari, "槓子を七対子の2組として扱っています");

const kokushiCodes = ["1m", "9m", "1p", "9p", "1s", "9s", "east", "south", "west", "north", "white", "green", "red", "1m"];
assert(HandAnalysis.isKokushiAgari(hand(kokushiCodes), defaultRule).isAgari, "国士無双を判定できません");
assert(!HandAnalysis.isKokushiAgari(hand(kokushiCodes.slice(0, -2).concat(["2p", "1m"])), defaultRule).isAgari, "不足した国士無双を成立扱いしています");
assert(!HandAnalysis.isKokushiAgari(hand(kokushiCodes), { northMode: "disabled" }).isAgari, "北なしルールで国士無双を成立扱いしています");

const clearWait = hand(["1p", "2p", "3p", "4p", { code: "5p", red: true }, "6p", "7s", "8s", "9s", "east", "east", "east", "9m"]);
assertWait(HandAnalysis.analyzeTenpai(clearWait, defaultRule), "9m", "単騎待ち");

const notTenpai = hand(["1m", "9m", "1p", "3p", "5p", "7p", "9p", "1s", "3s", "5s", "7s", "9s", "east"]);
assert(!HandAnalysis.analyzeTenpai(notTenpai, defaultRule).isTenpai, "非聴牌手を聴牌扱いしています");

const redChiitoitsu = hand(["1m", "1m", "9m", "9m", "5p", { code: "5p", red: true }, "2p", "2p", "3s", "3s", "east", "east", "white", "white"]);
assert(HandAnalysis.isChiitoitsuAgari(redChiitoitsu, defaultRule).isAgari, "赤五を通常の五として正規化できません");

console.log("Phase 2 hand analysis tests passed.");
