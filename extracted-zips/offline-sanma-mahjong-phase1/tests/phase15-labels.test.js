const fs = require("fs");
const path = require("path");
const { assert, loadModules, projectRoot } = require("./test-helpers");

const Sanma = loadModules();
const rootIndex = fs.readFileSync(path.resolve(projectRoot, "..", "..", "index.html"), "utf8");
const canonicalIndex = fs.readFileSync(path.resolve(projectRoot, "index.html"), "utf8");
const rootReadme = fs.readFileSync(path.resolve(projectRoot, "..", "..", "README.md"), "utf8");
const docsIndex = fs.readFileSync(path.resolve(projectRoot, "..", "..", "docs", "INDEX.md"), "utf8");

assert(rootIndex.includes("Phase 15"), "root index title/h1がPhase 15を含みません");
assert(canonicalIndex.includes("Phase 15"), "canonical index title/h1がPhase 15を含みません");
assert(rootReadme.startsWith("# Offline Sanma Mahjong - Phase 15"), "READMEがPhase 15現在版を示していません");
assert(docsIndex.includes("Phase 15"), "docs/INDEX.mdがPhase 15を現在正本として示していません");

const record = Sanma.GameRecord.create({
  players: [
    { id: 0, name: "Human", seatWind: "east", isHuman: true, points: 35000 },
    { id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: 35000 },
    { id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: 35000 },
  ],
});
assert(record.phase === 15 && record.phaseLabel === "15", "新規GameRecordがPhase 15ラベルを持ちません");
const old = JSON.parse(JSON.stringify(record));
delete old.phaseLabel;
old.phase = 8;
assert(Sanma.GameRecord.normalize(old).phaseLabel === "8", "古い牌譜のphase互換読込が壊れました");

console.log("Phase 15 label alignment tests passed.");
