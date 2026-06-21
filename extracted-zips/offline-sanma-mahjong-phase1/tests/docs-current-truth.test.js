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
assert(readme.includes("挙動保存リファクタ") && readme.includes("GameEngine"), "README must describe Phase 16 as behavior-preserving GameEngine split");
assert(readme.includes("ダブロンは `RuleConfig.doubleRonPolicy.allowed` で切り替え可能") && readme.includes("CPUのポン/チー/明槓、CPU通常ロン、CPU槍槓は実装済み"), "README must keep current CPU/call behavior honest");
assert(index.includes("Phase 16現在の正本") && index.includes("PHASE16_GAME_ENGINE_SPLIT.md"), "docs/INDEX.md must point to Phase 16 source of truth");
assert(canonicalReadme.includes("ダブロンは `RuleConfig.doubleRonPolicy.allowed` で切り替え可能です。"), "canonical README must document double ron support");
assert(canonicalReadme.includes("CPU の通常ロン、槍槓ロン、ポン、チー、明槓は実装済みです。"), "canonical README must document current CPU call support");
assert(!canonicalReadme.includes("ダブロンは未実装") && !canonicalReadme.includes("CPUのポン/チー/明槓は未実装"), "canonical README must not retain stale unsupported claims");
assert(architecture.includes("DrawContext") && architecture.includes("RecoveryFlow") && architecture.includes("Script Load Order"), "architecture doc must describe flow modules and load order");
assert(phase16.includes("Behavior Preservation Tests") && phase16.includes("RoundLifecycle") && phase16.includes("TurnFlow"), "Phase 16 report must describe split and tests");
assert(bugIntake.includes("bug_report") && bugIntake.includes("related_module"), "Phase 16.1 bug intake format must be documented");
assert(testing.includes("game-engine-public-api.test.js") && testing.includes("node tests/run-all-tests.js"), "testing doc must list Phase 16 tests and central runner");
assert(!/槍槓|honbaPoints|山0枚|河底|明槓|ゾンビ/.test(bugs), "docs/BUGS.md must not list fixed Phase 15 bugs as current bugs");
assert(!/槍槓|honbaPoints|山0枚|河底|ゾンビ/.test(roadmap), "docs/ROADMAP.md must not list fixed Phase 15 bugs as future work");
assert(changelog.includes("Phase 16") && changelog.includes("Flow modules"), "CHANGELOG.md must include Phase 16 split history");
[
  "game-engine-public-api.test.js",
  "game-engine-module-load-order.test.js",
  "game-engine-behavior-preservation.test.js",
  "flow-module-boundaries.test.js",
  "draw-context-flow-preservation.test.js",
  "record-flow-preservation.test.js",
  "recovery-flow-preservation.test.js",
].forEach((file) => {
  assert(runner.includes(file), `${file} must be registered in tests/run-all-tests.js`);
});
assert(archiveFiles.length > 0, "historical Phase docs must remain archived");
archiveFiles.forEach((file) => {
  assert(read(path.join("docs", "archive", file)).replace(/^\uFEFF/, "").startsWith("> "), `${file} must retain an archive warning`);
});

console.log("Phase 16 documentation current-truth tests passed.");
