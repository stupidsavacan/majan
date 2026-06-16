const fs = require("fs");
const path = require("path");
const { assert, loadModules, projectRoot } = require("./test-helpers");

const Sanma = loadModules();
const rootIndex = fs.readFileSync(path.resolve(projectRoot, "..", "..", "index.html"), "utf8");
const canonicalIndex = fs.readFileSync(path.resolve(projectRoot, "index.html"), "utf8");
const rootReadme = fs.readFileSync(path.resolve(projectRoot, "..", "..", "README.md"), "utf8");
const docsIndex = fs.readFileSync(path.resolve(projectRoot, "..", "..", "docs", "INDEX.md"), "utf8");

assert(rootIndex.includes("Phase 16"), "root index title/h1がPhase 16を含みません");
assert(canonicalIndex.includes("Phase 16"), "canonical index title/h1がPhase 16を含みません");
assert(rootReadme.startsWith("# Offline Sanma Mahjong - Phase 16"), "READMEがPhase 16現在版を示していません");
assert(docsIndex.includes("Phase 16"), "docs/INDEX.mdがPhase 16を現在正本として示していません");

const record = Sanma.GameRecord.create({
  players: [
    { id: 0, name: "Human", seatWind: "east", isHuman: true, points: 35000 },
    { id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: 35000 },
    { id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: 35000 },
  ],
});
assert(record.phase === 16 && record.phaseLabel === "16", "新規GameRecordがPhase 16ラベルを持ちません");
const old = JSON.parse(JSON.stringify(record));
delete old.phaseLabel;
old.phase = 8;
assert(Sanma.GameRecord.normalize(old).phaseLabel === "8", "古い牌譜のphase互換読込が壊れました");

console.log("Phase 16 label alignment tests passed.");
