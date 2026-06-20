const fs = require("fs");
const path = require("path");
const { assert, projectRoot } = require("./test-helpers");

const repositoryRoot = path.resolve(projectRoot, "..", "..");

function read(relativePath) {
  return fs.readFileSync(path.resolve(repositoryRoot, relativePath), "utf8");
}

const readme = read("README.md");
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
assert(readme.includes("GameEngine"), "README must describe the current GameEngine split");
assert(readme.includes("Phase 16.2 Issue #6 Resolution"), "README must document the Issue #6 fixes");
assert(readme.includes("issue6-resolution-regressions.test.js"), "README must list the Issue #6 regression test");
assert(readme.includes("CPUのポン/チー/明槓は実装済み"), "README must not claim CPU non-winning calls are still unimplemented");
assert(readme.includes("CPU戦略は簡易"), "README must keep CPU strategy limitations honest");

assert(index.includes("PHASE16_GAME_ENGINE_SPLIT.md"), "docs/INDEX.md must point to Phase 16 source of truth");
assert(architecture.includes("DrawContext") && architecture.includes("RecoveryFlow") && architecture.includes("Script Load Order"), "architecture doc must describe flow modules and load order");
assert(phase16.includes("Behavior Preservation Tests") && phase16.includes("RoundLifecycle") && phase16.includes("TurnFlow"), "Phase 16 report must describe split and tests");
assert(bugIntake.includes("bug_report") && bugIntake.includes("related_module"), "Phase 16.1 bug intake format must be documented");
assert(testing.includes("game-engine-public-api.test.js"), "testing doc must list Phase 16 tests");
assert(testing.includes("issue6-resolution-regressions.test.js"), "testing doc must list Issue #6 regression coverage");
assert(testing.includes("node tests/run-all-tests.js"), "testing doc must list the central runner");
assert(bugs.includes("Issue #6") && bugs.includes("issue6-resolution-regressions.test.js"), "docs/BUGS.md must document Issue #6 as fixed with regression coverage");
assert(!bugs.includes("CPU pon/chi/minkan"), "docs/BUGS.md must not list CPU non-winning calls as a current limitation");
assert(!roadmap.includes("CPUポン/チー/明槓の実装と検証"), "docs/ROADMAP.md must not list implemented CPU calls as future work");
assert(changelog.includes("Phase 16") && changelog.includes("Flow modules"), "CHANGELOG.md must include Phase 16 split history");

[
  "game-engine-public-api.test.js",
  "game-engine-module-load-order.test.js",
  "game-engine-behavior-preservation.test.js",
  "flow-module-boundaries.test.js",
  "draw-context-flow-preservation.test.js",
  "record-flow-preservation.test.js",
  "recovery-flow-preservation.test.js",
  "issue6-resolution-regressions.test.js",
].forEach((file) => {
  assert(runner.includes(file), `${file} must be registered in tests/run-all-tests.js`);
});

assert(archiveFiles.length > 0, "historical Phase docs must remain archived");
archiveFiles.forEach((file) => {
  assert(read(path.join("docs", "archive", file)).replace(/^\uFEFF/, "").startsWith("> "), `${file} must retain an archive warning`);
});

console.log("Phase 16 documentation current-truth tests passed.");
