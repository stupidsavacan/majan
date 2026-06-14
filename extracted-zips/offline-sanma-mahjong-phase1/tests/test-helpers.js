const fs = require("fs");
const path = require("path");
const vm = require("vm");

const projectRoot = fs.existsSync(path.resolve(__dirname, "..", "src", "game", "RuleConfig.js"))
  ? path.resolve(__dirname, "..")
  : path.resolve(__dirname, "..", "extracted-zips", "offline-sanma-mahjong-phase1");

const gameModules = [
  "src/game/RuleConfig.js",
  "src/game/RoundManager.js",
  "src/game/HonbaManager.js",
  "src/game/RankingManager.js",
  "src/game/EndConditionManager.js",
  "src/game/MatchManager.js",
  "src/game/Tile.js",
  "src/game/HandAnalysis.js",
  "src/game/DoraCalculator.js",
  "src/game/YakuAnalysis.js",
  "src/game/ScoreCalculator.js",
  "src/game/Settlement.js",
  "src/game/RiichiManager.js",
  "src/game/KanManager.js",
  "src/game/KitaManager.js",
  "src/game/ActionResolver.js",
  "src/game/CpuStrategy.js",
  "src/game/AssistManager.js",
  "src/game/GameRecord.js",
  "src/game/CallWindow.js",
  "src/game/Wall.js",
  "src/game/Player.js",
  "src/game/GameEngine.js",
];

function loadModules(extraModules) {
  global.window = global;
  global.Sanma = {};
  gameModules.concat(extraModules || []).forEach((file) => {
    vm.runInThisContext(fs.readFileSync(path.resolve(projectRoot, file), "utf8"), { filename: file });
  });
  return global.Sanma;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createTileFactory(TileUtil) {
  let copyIndex = 1000;
  return function tile(code, isRed) {
    const honorMap = { east: 1, south: 2, west: 3, north: 4, white: 5, green: 6, red: 7 };
    const suit = honorMap[code] ? "z" : code.slice(-1);
    const rank = honorMap[code] || Number(code.slice(0, -1));
    return TileUtil.createTile(suit, rank, copyIndex += 1, Boolean(isRed));
  };
}

module.exports = { assert, createTileFactory, gameModules, loadModules, projectRoot };
