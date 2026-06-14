const path = require("path");
const { spawnSync } = require("child_process");
const { projectRoot } = require("./test-helpers");

const testFiles = [
  "hand-analysis.test.js",
  "yaku-analysis.test.js",
  "score-calculator.test.js",
  "action-resolver.test.js",
  "cpu-strategy.test.js",
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
  console.error("\nPhase 7 test run failed.");
  process.exit(1);
}

console.log("\nAll Phase 7 tests passed.");
