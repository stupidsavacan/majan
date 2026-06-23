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

assert(readme.startsWith("# Offline Sanma Mahjong - Phase 16"), "README must be the Phase 16 current entry");
assert(readme.includes("Flow モジュールへ分割") && readme.includes("GameEngine.js"), "README must describe Phase 16 GameEngine split");
assert(readme.includes("CPUのポン/チー/明槓は実装済み"), "README must document current CPU call support");
assert(readme.includes("簡易リスク分析") && readme.includes("押し引きモード") && readme.includes("明槓判断"), "README must document current CPU risk/call strategy");
assert(readme.includes("GameEngine.getState()") && readme.includes("CPU 手牌") && readme.includes("tileLedger"), "README must document UI state masking");
assert(readme.includes("winResult.revealedHand"), "README must document ron hand reveal");
assert(!readme.includes("CPUは鳴き・ロンを自動スキップ"), "README must not retain stale CPU skip claims");
assert(!readme.includes("押し引き未実装"), "README must not say push/fold is unimplemented");

assert(canonicalReadme.includes("ダブロンは `RuleConfig.doubleRonPolicy.allowed`"), "canonical README must document double ron support");
assert(canonicalReadme.includes("CPU の通常ロン、槍槓ロン、ポン、チー、明槓は実装済み"), "canonical README must document current CPU call support");
assert(canonicalReadme.includes("簡易リスク分析") && canonicalReadme.includes("getState()"), "canonical README must summarize current CPU and masking behavior");
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

console.log("Phase 16 documentation current-truth tests passed.");
