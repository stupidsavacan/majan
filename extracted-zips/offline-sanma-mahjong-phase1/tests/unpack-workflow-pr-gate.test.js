const fs = require("fs");
const path = require("path");
const { assert, projectRoot } = require("./test-helpers");

const repositoryRoot = path.resolve(projectRoot, "..", "..");
const workflow = fs.readFileSync(path.resolve(repositoryRoot, ".github", "workflows", "unpack-uploaded-zip.yml"), "utf8");
const testing = fs.readFileSync(path.resolve(repositoryRoot, "docs", "TESTING.md"), "utf8");

assert(!/^\s*git push[^\r\n]*\bmain\b/m.test(workflow), "ZIP展開workflowがmainへ直接pushします");
assert(workflow.includes('branch="automation/unpack-uploaded-zip"'), "ZIP展開workflowの安定した専用ブランチがありません");
assert(workflow.includes("node tests/run-all-tests.js"), "ZIP展開後に中央テストを実行しません");
assert(workflow.indexOf("node tests/run-all-tests.js") < workflow.indexOf("git commit -m"), "ZIP展開workflowがテスト前にcommitします");
assert(workflow.includes("gh pr create") && workflow.includes("gh pr list") && workflow.includes("gh pr edit"), "ZIP展開workflowがPRを作成・更新しません");
assert(workflow.includes("actions/upload-artifact@v4"), "ZIP展開artifact uploadを維持していません");
assert(workflow.includes("contents: write") && workflow.includes("pull-requests: write"), "ZIP展開workflowのPR作成権限が不足しています");
assert(!workflow.includes("actions: write"), "ZIP展開workflowへ不要なactions write権限があります");
assert(testing.includes("ZIP展開PRゲート") && testing.includes("mainへ展開結果を直接pushしません"), "docs/TESTING.mdがZIP展開PR運用を説明していません");

console.log("Phase 14.2D unpack workflow PR gate tests passed.");
