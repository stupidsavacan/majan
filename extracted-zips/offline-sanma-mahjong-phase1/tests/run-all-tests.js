const path = require("path");
const { spawnSync } = require("child_process");
const { projectRoot } = require("./test-helpers");

const testFiles = [
  "hand-analysis.test.js",
  "yaku-analysis.test.js",
  "score-calculator.test.js",
  "action-resolver.test.js",
  "rules-scoring-regression.test.js",
  "advanced-rules.test.js",
  "state-integrity.test.js",
  "tile-design.test.js",
  "table-layout.test.js",
  "match-flow.test.js",
  "cpu-strategy.test.js",
  "storage-records.test.js",
  "replay-stats.test.js",
  "phase14-1-runtime.test.js",
  "phase14-1-kan-choice.test.js",
  "phase14-1-chankan.test.js",
  "phase14-1-fixed-meld-scoring.test.js",
  "phase14-1-assist-replay.test.js",
  "cpu-dealer-start-round.test.js",
  "settings-import-hardening.test.js",
  "record-import-hardening.test.js",
  "storage-render-failure.test.js",
  "assist-lastdraw-integrity.test.js",
  "cpu-kan-rinshan-win.test.js",
  "recovery-manager.test.js",
  "yakuman-multiplicity.test.js",
  "cpu-ron-reaction.test.js",
  "smoke.test.js",
  "regression.test.js",
  "source-format.test.js",
];

let failed = false;
testFiles.forEach((file) => {
  console.log(`\n=== ${file} ===`);
  const result = spawnSync(process.execPath, [path.resolve(projectRoot, "tests", file)], { stdio: "inherit" });
  if (result.status !== 0) failed = true;
});

if (failed) {
  console.error("\nPhase 14.2 test run failed.");
  process.exit(1);
}

console.log("\nAll Phase 14.2 tests passed.");
