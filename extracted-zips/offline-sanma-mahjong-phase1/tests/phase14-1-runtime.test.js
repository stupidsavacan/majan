const fs = require("fs");
const path = require("path");
const { assert, projectRoot } = require("./test-helpers");

const repositoryRoot = path.resolve(projectRoot, "..", "..");
const read = (relativePath) => fs.readFileSync(path.resolve(repositoryRoot, relativePath), "utf8");
const readCanonical = (relativePath) => fs.readFileSync(path.resolve(projectRoot, relativePath), "utf8");

const readme = read("README.md");
const rootIndex = read("index.html");
const rootMain = read("src/main.js");
const canonicalMain = readCanonical("src/main.js");

assert(
  readme.includes("canonical runtime") && readme.includes("index.html"),
  "READMEにcanonical runtimeの入口が明記されていません"
);
assert(
  rootMain.includes("SanmaDeprecatedRootLoader") && rootMain.includes("実行入口ではありません"),
  "root src/main.jsが明示的な非入口になっていません"
);
assert(
  !rootMain.includes("document.createElement(\"script\")") && !rootMain.includes("loadNext("),
  "root src/main.jsに古い動的ローダーが残っています"
);
[
  "src/game/GameEngine.js",
  "src/game/GameStateMachine.js",
  "src/game/TileLedger.js",
  "src/ui/ReplayViewer.js",
  "src/main.js",
].forEach((modulePath) => {
  assert(rootIndex.includes(modulePath), `root index.htmlが${modulePath}を読み込んでいません`);
});
assert(canonicalMain.includes("ReplayViewer"), "canonical mainの診断対象からReplayViewerが欠落しています");

console.log("Phase 14.1 runtime entrypoint tests passed.");
