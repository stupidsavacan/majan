const path = require("path");
const { spawnSync } = require("child_process");
const { projectRoot } = require("./test-helpers");
const suites = ["hand-analysis", "yaku-analysis", "score-calculator", "action-resolver", "cpu-strategy", "storage-records", "smoke", "regression", "source-format"];
const failed = [];
suites.forEach((suite) => {
  console.log(`\n=== ${suite} ===`);
  const result = spawnSync(process.execPath, [path.resolve(projectRoot, "tests", `${suite}.test.js`)], { stdio: "inherit" });
  if (result.status !== 0) failed.push(suite);
});
console.log(JSON.stringify({ phase: 9, passed: failed.length === 0, suites, externalDependencies: [] }, null, 2));
if (failed.length) process.exit(1);
