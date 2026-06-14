const fs = require("fs");
const path = require("path");
const { assert, projectRoot } = require("./test-helpers");

const checkedJavaScriptRoots = [
  path.resolve(projectRoot, "src", "debug"),
  path.resolve(projectRoot, "src", "game"),
  path.resolve(projectRoot, "src", "storage"),
  path.resolve(projectRoot, "src", "ui"),
  path.resolve(projectRoot, "tests"),
];
const checkedCssRoots = [path.resolve(projectRoot, "src", "styles")];
const generatedCssExceptions = new Set(["yuji-mai-embedded.css"]);

function collectFiles(root, extension) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.resolve(root, entry.name);
    if (entry.isDirectory()) return collectFiles(fullPath, extension);
    return entry.name.endsWith(extension) ? [fullPath] : [];
  });
}

function checkFiles(files, thresholds, label) {
  assert(files.length > 0, `監査対象の${label}ファイルがありません`);
  files.forEach((file) => {
    const source = fs.readFileSync(file, "utf8");
    const lines = source.split(/\r?\n/);
    const longestLine = Math.max(...lines.map((line) => line.length));
    const relativePath = path.relative(projectRoot, file);

    assert(
      !(lines.length < thresholds.minimumLines && source.length > thresholds.compressedLength),
      `${relativePath} が圧縮された少数行の状態です`
    );
    assert(longestLine <= thresholds.maxLineLength, `${relativePath} に長すぎる圧縮行があります`);
  });
}

const javascriptFiles = checkedJavaScriptRoots.flatMap((root) => collectFiles(root, ".js")).sort();
const cssFiles = checkedCssRoots
  .flatMap((root) => collectFiles(root, ".css"))
  .filter((file) => !generatedCssExceptions.has(path.basename(file)))
  .sort();

checkFiles(javascriptFiles, { minimumLines: 10, compressedLength: 1000, maxLineLength: 240 }, "JavaScript");
checkFiles(cssFiles, { minimumLines: 10, compressedLength: 1200, maxLineLength: 320 }, "CSS");

console.log(
  `Source formatting checks passed for ${javascriptFiles.length} JavaScript and ${cssFiles.length} CSS files. `
  + `Generated exceptions: ${[...generatedCssExceptions].join(", ")}.`
);
