const fs = require("fs");
const path = require("path");
const { assert, projectRoot } = require("./test-helpers");

const repositoryRoot = path.resolve(projectRoot, "..", "..");
function read(relativePath) {
  return fs.readFileSync(path.resolve(repositoryRoot, relativePath), "utf8");
}

const readme = read("README.md");
const canonicalReadme = read("extracted-zips/offline-sanma-mahjong-phase1/README.md");
const testing = read("docs/TESTING.md");
const bugs = read("docs/BUGS.md");
const roadmap = read("docs/ROADMAP.md");
const index = read("docs/INDEX.md");
const architecture = read("docs/ARCHITECTURE.md");
const phase16 = read("docs/PHASE16_GAME_ENGINE_SPLIT.md");
const bugIntake = read("docs/PHASE16_1_BUG_INTAKE.md");
const changelog = read("CHANGELOG.md");
const runner = read("tests/run-all-tests.js");
const archiveFiles = fs.readdirSync(path.resolve(repositoryRoot, "docs", "archive"))
  .filter((file) => /^PHASE.*\.md$/.test(file));

assert(readme.startsWith("# オフライン三麻"), "README must be the current Japanese project entry");
assert(readme.includes("オフライン専用の一人用三麻ゲーム") && readme.includes("CPU 2人を相手"), "README must describe the current offline single-player game in Japanese");
assert(readme.includes("root の `index.html`") && readme.includes("正本アプリコピー"), "README must explain current entry points");
assert(readme.includes("歴史的な名前") && readme.includes("過去の実装区分の名残"), "README must explain remaining legacy phase labels conservatively");
assert(readme.includes("Flowモジュール") && readme.includes("GameEngine.js"), "README must describe the GameEngine/flow-module architecture");
assert(readme.includes("シャンテン推定") && readme.includes("可視牌カウント") && readme.includes("押し引きモード"), "README must document current CPU strategy inputs");
assert(readme.includes("相手の伏せ手牌、生牌山、王牌の中身") && readme.includes("使いません"), "README must document CPU fair-play visible-information limits");
assert(readme.includes("明槓") && readme.includes("槍槓") && readme.includes("嶺上") && readme.includes("槓ドラ"), "README must document current call/kan behavior");
assert(readme.includes("GameEngine.getState()") && readme.includes("CPU手牌") && readme.includes("tileLedger"), "README must document UI state masking");
assert(readme.includes("winResult.revealedHand"), "README must document ron hand reveal");
assert(readme.includes("localStorage") && readme.includes("最新20件") && readme.includes("ReplayViewer"), "README must document storage, records, and replay");
assert(!readme.includes("CPUは鳴き・ロンを自動スキップ"), "README must not retain stale CPU skip claims");
assert(!readme.includes("押し引き未実装"), "README must not say push/fold is unimplemented");

assert(canonicalReadme.startsWith("# オフライン三麻 - 正本アプリコピー"), "canonical README must identify the canonical app copy in Japanese");
assert(canonicalReadme.includes("root `index.html`") && canonicalReadme.includes("正本アプリコピー"), "canonical README must explain entry points");
assert(canonicalReadme.includes("CPUの通常ロン、槍槓ロン、ポン、チー、明槓"), "canonical README must document current CPU call support");
assert(canonicalReadme.includes("可視情報") && canonicalReadme.includes("相手の伏せ手牌"), "canonical README must document CPU fair-play limits");
assert(canonicalReadme.includes("GameEngine.getState() マスキング") && canonicalReadme.includes("tileLedger"), "canonical README must summarize current masking behavior");
assert(canonicalReadme.includes("牌譜、リプレイ、成績"), "canonical README must document current record/replay/stat support");
assert(!canonicalReadme.includes("CPUは鳴き・ロンを自動スキップ"), "canonical README must not retain stale CPU skip claims");

assert(index.includes("PHASE16_GAME_ENGINE_SPLIT.md"), "docs/INDEX.md must point to Phase 16 source of truth");
assert(architecture.includes("DrawContext") && architecture.includes("RecoveryFlow") && architecture.includes("Script Load Order"), "architecture doc must describe flow modules and load order");
assert(phase16.includes("Behavior Preservation Tests") && phase16.includes("RoundLifecycle") && phase16.includes("TurnFlow"), "Phase 16 report must describe split and tests");
assert(bugIntake.includes("bug_report") && bugIntake.includes("related_module"), "Phase 16.1 bug intake format must be documented");
assert(testing.includes("game-engine-public-api.test.js") && testing.includes("node tests/run-all-tests.js"), "testing doc must list Phase 16 tests and central runner");
assert(changelog.includes("Phase 16") && changelog.includes("Flow modules"), "CHANGELOG.md must include Phase 16 split history");
assert(bugs.includes("未解決") || bugs.includes("Known") || bugs.length > 0, "docs/BUGS.md must remain present");
assert(roadmap.includes("Roadmap") || roadmap.length > 0, "docs/ROADMAP.md must remain present");

[
  "game-engine-public-api.test.js",
  "game-engine-module-load-order.test.js",
  "game-engine-behavior-preservation.test.js",
  "flow-module-boundaries.test.js",
  "draw-context-flow-preservation.test.js",
  "record-flow-preservation.test.js",
  "recovery-flow-preservation.test.js",
  "ui-state-masking.test.js",
  "cpu-risk-analysis.test.js",
  "cpu-minkan-decision.test.js",
].forEach((file) => {
  assert(runner.includes(file), `${file} must be registered in tests/run-all-tests.js`);
});
assert(archiveFiles.length > 0, "historical Phase docs must remain archived");
archiveFiles.forEach((file) => {
  assert(read(path.join("docs", "archive", file)).replace(/^\uFEFF/, "").startsWith("> "), `${file} must retain an archive warning`);
});

console.log("Japanese documentation current-truth tests passed.");
