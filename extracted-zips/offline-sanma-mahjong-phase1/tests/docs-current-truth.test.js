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
const changelog = read("CHANGELOG.md");
const archiveFiles = fs.readdirSync(path.resolve(repositoryRoot, "docs", "archive"))
  .filter((file) => /^PHASE.*\.md$/.test(file));

assert(readme.startsWith("# Offline Sanma Mahjong - Phase 15"), "READMEがPhase 15現在仕様の入口ではありません");
assert(readme.includes("CPU通常ロン") && readme.includes("CPUのポン/チー/明槓は未実装"), "READMEのCPUロン/CPU鳴き制限が現在仕様と一致しません");
assert(readme.includes("ダブロンは未実装"), "READMEがダブロン未実装を明記していません");
assert(testing.includes("pull request") && testing.includes("GitHub Actions") && testing.includes("node tests/run-all-tests.js"), "docs/TESTING.mdにPR/CI/中央テスト手順がありません");
assert(testing.includes("ZIP") && testing.includes("pull request"), "docs/TESTING.mdにZIP展開PRゲートがありません");
assert(index.includes("現在仕様の正本") && index.includes("過去資料警告"), "docs/INDEX.mdが正本と過去資料を区別していません");
assert(architecture.includes("window.Sanma") && architecture.includes("RecoveryManager"), "docs/ARCHITECTURE.mdが主要構成を説明していません");
assert(!/頭ハネ|槍槓|honbaPoints|山0枚|河底|明槓|ゾンビ/.test(bugs), "docs/BUGS.mdにPhase 15修正済みバグが現在バグとして残っています");
assert(!/頭ハネ|槍槓|honbaPoints|山0枚|河底|ゾンビ/.test(roadmap), "docs/ROADMAP.mdにPhase 15修正済み項目が未来作業として残っています");
assert(changelog.includes("Phase 15") && changelog.includes("failed record bodies"), "CHANGELOG.mdにPhase 15履歴がありません");
assert(archiveFiles.length > 0, "過去Phase資料がdocs/archiveへ移動されていません");
archiveFiles.forEach((file) => {
  assert(
    read(path.join("docs", "archive", file)).replace(/^\uFEFF/, "").startsWith("> 警告: この文書は過去資料です。"),
    `${file}に過去資料警告がありません`
  );
});

console.log("Phase 15 documentation current-truth tests passed.");
