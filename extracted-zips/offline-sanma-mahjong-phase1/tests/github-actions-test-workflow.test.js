const fs = require("fs");
const path = require("path");
const { assert, projectRoot } = require("./test-helpers");

const repositoryRoot = path.resolve(projectRoot, "..", "..");
const workflowPath = path.resolve(repositoryRoot, ".github", "workflows", "test.yml");
assert(fs.existsSync(workflowPath), ".github/workflows/test.ymlがありません");
const workflow = fs.readFileSync(workflowPath, "utf8");
assert(/pull_request\s*:/.test(workflow), "test workflowがpull_requestで実行されません");
assert(/push\s*:/.test(workflow), "test workflowがpushで実行されません");
assert(workflow.includes("node tests/run-all-tests.js"), "test workflowが中央テストランナーを実行しません");
assert(!workflow.includes("continue-on-error: true"), "test workflowが失敗を無視します");
assert(!/run:\s*(echo|printf)\s+.*success/i.test(workflow), "test workflowが偽の成功コマンドだけを実行します");
assert(workflow.includes("actions/setup-node@v4"), "test workflowが安定Node.jsを設定しません");

console.log("Phase 14.2C GitHub Actions workflow tests passed.");
