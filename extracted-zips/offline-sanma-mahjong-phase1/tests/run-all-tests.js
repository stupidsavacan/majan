const path = require("path");
const { spawnSync } = require("child_process");
const { projectRoot } = require("./test-helpers");

const testFiles = [
  "hand-analysis.test.js",
  "yaku-analysis.test.js",
  "score-calculator.test.js",
  "action-resolver.test.js",
  "rules-scoring-regression.test.js",
  "tile-design.test.js",
  "cpu-strategy.test.js",
  "storage-records.test.js",
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
  console.error("\nPhase 9.2 test run failed.");
  process.exit(1);
}

console.log("\nAll Phase 9.2 tests passed.");
