const fs = require("fs");
const path = require("path");
const { assert, loadModules, projectRoot } = require("./test-helpers");

const Sanma = loadModules();
const boundaries = {
  RoundLifecycle: ["startRound", "startNextRound", "dealInitialHands", "finishGameRecord", "withDrawTenpai"],
  TurnFlow: ["runCpuUntilHumanTurn", "runCpuUntilHumanTurnUnlocked", "continueAfterDiscard", "discardHumanTile"],
  WinFlow: ["tryCpuTsumo", "claimHumanTsumo", "collectRonCandidatesAfterDiscard", "resolveRonWin"],
  CallFlow: ["claimHumanCall", "skipHumanCall"],
  KanFlow: ["requestHumanKan", "selectHumanKan", "tryCpuKan", "openOrResolveChankan", "finalizePendingKan"],
  RecoveryFlow: ["skipHumanCall", "finalizePendingKan", "startRound", "resolvePendingCpuRon"],
  RecordFlow: ["recordGameEvent", "playerTileEvent", "tileSnapshot", "recordAssist"],
  DrawContext: ["createNormalDrawContext", "createLastDiscard", "createHumanWinContext"],
};

Object.entries(boundaries).forEach(([moduleName, methods]) => {
  assert(Sanma[moduleName], `${moduleName} must exist`);
  methods.forEach((method) => {
    assert(typeof Sanma[moduleName][method] === "function", `${moduleName}.${method} must be a function`);
  });
});

const engineSource = fs.readFileSync(path.resolve(projectRoot, "src", "game", "GameEngine.js"), "utf8");
assert(engineSource.split(/\r?\n/).length < 450, "GameEngine.js must remain a thin orchestrator");
[
  "Sanma.RoundLifecycle.startRound.call(this)",
  "Sanma.TurnFlow.runCpuUntilHumanTurn.call(this)",
  "Sanma.WinFlow.resolveRonWin.call(this",
  "Sanma.CallFlow.claimHumanCall.call(this",
  "Sanma.KanFlow.finalizePendingKan.call(this)",
  "Sanma.RecordFlow.recordGameEvent.call(this",
  "Sanma.DrawContext.createLastDiscard.call(this",
].forEach((needle) => {
  assert(engineSource.includes(needle), `GameEngine wrapper is missing ${needle}`);
});
assert(!engineSource.includes("for (let draw = 0; draw < 13"), "dealInitialHands detail must not live in GameEngine.js");
assert(!engineSource.includes("while (guard < 80"), "CPU loop detail must not live in GameEngine.js");

console.log("Phase 16 flow module boundary tests passed.");
