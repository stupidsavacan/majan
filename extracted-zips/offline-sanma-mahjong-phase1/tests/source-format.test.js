const fs = require("fs");
const path = require("path");
const { assert, projectRoot } = require("./test-helpers");

const checkedRoots = [
  path.resolve(projectRoot, "src", "game"),
  path.resolve(projectRoot, "src", "storage"),
  path.resolve(projectRoot, "src", "ui"),
  path.resolve(projectRoot, "tests"),
];

function collectJavaScriptFiles(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.resolve(root, entry.name);
    if (entry.isDirectory()) return collectJavaScriptFiles(fullPath);
    return entry.name.endsWith(".js") ? [fullPath] : [];
  });
}

const files = checkedRoots.flatMap(collectJavaScriptFiles).sort();
assert(files.length > 0, "監査対象のJavaScriptファイルがありません");

files.forEach((file) => {
  const source = fs.readFileSync(file, "utf8");
  const lines = source.split(/\r?\n/);
  const longestLine = Math.max(...lines.map((line) => line.length));
  const label = path.relative(projectRoot, file);

  assert(!(lines.length < 10 && source.length > 1000), `${label} が圧縮された少数行の状態です`);
  assert(longestLine <= 240, `${label} に240文字を超える圧縮行があります`);
});

console.log(`Source formatting checks passed for ${files.length} JavaScript files.`);
