const path = require("path");
const { assert, projectRoot } = require("./test-helpers");
const { validateWorkflowYaml } = require("./workflow-yaml-test-utils");

const repositoryRoot = path.resolve(projectRoot, "..", "..");
const testWorkflow = validateWorkflowYaml(path.resolve(repositoryRoot, ".github", "workflows", "test.yml"), assert);
const unpackWorkflow = validateWorkflowYaml(path.resolve(repositoryRoot, ".github", "workflows", "unpack-uploaded-zip.yml"), assert);

[testWorkflow, unpackWorkflow].forEach((workflow) => {
  assert(!workflow.includes("continue-on-error: true"), "workflowがテスト失敗を無視します");
  assert(!/run:\s*(?:echo|printf)\s+.*success/i.test(workflow), "workflowに偽成功コマンドがあります");
  assert(!/\b(?:npm|pnpm|yarn)\s+(?:run\s+)?test\b/.test(workflow), "workflowが中央ランナー以外をテスト成功条件にしています");
  assert(workflow.includes("node tests/run-all-tests.js"), "workflowが中央テストを実行しません");
});
assert(!/^\s*git push[^\r\n]*\bmain\b/m.test(unpackWorkflow), "ZIP展開workflowにmain直pushがあります");
assert(unpackWorkflow.includes("gh pr create"), "ZIP展開workflowにPR作成手順がありません");

console.log("Phase 14.2D Actions workflow hardening tests passed.");
