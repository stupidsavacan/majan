const fs = require("fs");
const path = require("path");
const { assert, projectRoot } = require("./test-helpers");

const gameSourceDir = path.resolve(projectRoot, "src", "game");
const files = fs.readdirSync(gameSourceDir).filter((name) => name.endsWith(".js")).sort();

assert(files.length > 0, "src/game にJavaScriptファイルがありません");

files.forEach((name) => {
  const source = fs.readFileSync(path.resolve(gameSourceDir, name), "utf8");
  const lines = source.split(/\r?\n/);
  const longestLine = Math.max(...lines.map((line) => line.length));

  assert(!(lines.length < 10 && source.length > 1000), `${name} が圧縮された少数行の状態です`);
  assert(longestLine <= 240, `${name} に240文字を超える圧縮行があります`);
});

console.log("Game source formatting checks passed.");
