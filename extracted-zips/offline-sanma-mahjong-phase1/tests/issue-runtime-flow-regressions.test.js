const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();

function createRonEngine(seed, wallRemaining) {
  const engine = arrangeEngine(Sanma, createEngine(Sanma, seed, { allowChi: true }), {
    turnIndex: 1,
    phase: "cpu-running",
    players: [
      { hand: ["2p", "3p", "4p", "5p", "5p", "6p", "7p", "8p", "2s", "3s", "4s", "6s", "6s"], lastDraw: false },
      { hand: ["1p", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "1s", "2s", "3s", "4s"], lastDraw: false },
      { hand: ["1p", "9p", "1s", "1s", "2s", "3s", "4s", "5s", "6s", "7s", "8s", "9s", "9s"], lastDraw: false },
    ],
  });
  const discard = engine.players[1].hand.find((tile) => tile.baseId === "5p");
  const discarded = engine.players[1].discardTileByInstanceId(discard.instanceId);
  engine.recordGameEvent("discard", engine.playerTileEvent(engine.players[1], discarded));
  engine.lastDiscard = engine.createLastDiscard(1, discarded);
  engine.wall.tiles = engine.wall.tiles.slice(0, wallRemaining);
  return engine;
}

const kanFailure = createEngine(Sanma, "issue-kan-failure", {});
const pendingAttempt = {
  prepared: true,
  playerIndex: 0,
  kanType: "ankan",
  declaredTile: kanFailure.humanPlayer.hand[0],
  requested: {
    type: "ankan",
    tile: kanFailure.humanPlayer.hand[0],
    consumeInstanceIds: ["missing-a", "missing-b", "missing-c", "missing-d"],
  },
};
kanFailure.pendingKanAttempt = pendingAttempt;
const failedKan = kanFailure.finalizePendingKan();
assert(!failedKan.applied, "invalid kan finalization should fail in fixture");
assert(kanFailure.pendingKanAttempt === pendingAttempt, "failed pending kan finalization lost the original attempt");

const snapshotEngine = createEngine(Sanma, "issue-state-snapshot", {});
const snapshot = snapshotEngine.getState();
const originalHandLength = snapshotEngine.players[0].hand.length;
snapshot.players[0].hand.length = 0;
snapshot.doraIndicators.length = 0;
snapshot.logs.push("external mutation");
assert(snapshotEngine.players[0].hand.length === originalHandLength, "getState leaked live player hand reference");
assert(snapshotEngine.wall.doraIndicators.length > 0, "getState leaked live dora indicators reference");
assert(!snapshotEngine.logs.includes("external mutation"), "getState leaked live logs reference");

const staleDraw = createEngine(Sanma, "issue-recovery-human-draw", {});
staleDraw.phase = "human-draw";
staleDraw.turnIndex = staleDraw.humanPlayer.id;
staleDraw.humanPlayer.lastDraw = null;
staleDraw.lastDiscard = staleDraw.createLastDiscard(1, staleDraw.players[1].hand[0]);
assert(staleDraw.drawForHumanManually() !== false, "manual recovery draw should run");
assert(staleDraw.phase === "human-discard", "manual recovery draw did not reach human-discard");
assert(staleDraw.lastDiscard === null, "manual recovery draw left stale lastDiscard");

const tileCorruption = createEngine(Sanma, "issue-recovery-ledger", {});
tileCorruption.callWindow = { isOpen: true, fromPlayerIndex: 1, actions: [{ id: "skip" }] };
const originalRecoveryStartRound = Sanma.RecoveryFlow.startRound;
let resetCalled = false;
Sanma.RecoveryFlow.startRound = function observedStartRound(engine) {
  resetCalled = true;
  engine.phase = "human-discard";
  engine.callWindow = null;
  return true;
};
const recoveryResult = Sanma.RecoveryManager.recover(tileCorruption, { tileLedger: { ok: false, errors: ["duplicate"] } });
Sanma.RecoveryFlow.startRound = originalRecoveryStartRound;
assert(recoveryResult.ok && resetCalled, "Recovery did not prioritize tileLedger corruption with round reset");
assert(tileCorruption.callWindow === null, "Recovery tileLedger reset left stale callWindow");

const missingKan = createEngine(Sanma, "issue-missing-pending-kan", {});
missingKan.phase = "human-call";
missingKan.turnIndex = 0;
missingKan.pendingKanAttempt = null;
missingKan.callWindow = {
  isOpen: true,
  kind: "chankan",
  playerIndex: 0,
  fromPlayerIndex: 1,
  actions: [{ id: "ron", enabled: true }],
};
assert(Sanma.RecoveryManager.closeStuckActionWindow(missingKan).ok, "missing pending kan chankan recovery failed");
assert(missingKan.callWindow === null, "missing pending kan recovery left callWindow open");
assert(missingKan.phase !== "human-call", "missing pending kan recovery left dead human-call phase");

const ronWindow = createRonEngine("issue-ron-window-actions", 12);
assert(ronWindow.resolveRonCandidatesAfterDiscard(1), "human ron window did not open");
assert(ronWindow.phase === "human-call" && ronWindow.callWindow, "human ron window missing");
assert(ronWindow.callWindow.actions.length === 1 && ronWindow.callWindow.actions[0].id === "ron", "ron window includes non-ron call actions");

const emptyWallRon = createRonEngine("issue-empty-wall-ron-window-actions", 0);
assert(emptyWallRon.resolveRonCandidatesAfterDiscard(1), "empty-wall human ron window did not open");
assert(emptyWallRon.callWindow.actions.every((action) => action.id === "ron"), "empty-wall ron window includes non-ron actions");

const callRonReturn = createRonEngine("issue-call-ron-return", 12);
assert(callRonReturn.resolveRonCandidatesAfterDiscard(1), "call ron return fixture did not open ron window");
const ronReturn = callRonReturn.claimHumanCall("ron");
assert(ronReturn === true && callRonReturn.phase === "win-ended", "claimHumanCall('ron') did not return ron result");

const pendingCpu = createEngine(Sanma, "issue-pending-cpu-ron", {});
let resolvedCpu = null;
pendingCpu.callWindow = {
  pendingCpuRonCandidate: {
    playerIndex: 2,
    analysis: { scoreResult: { isValidWin: true } },
  },
};
pendingCpu.resolveRonWin = function resolveStored(playerIndex, analysis, metadata) {
  resolvedCpu = { playerIndex, analysis, metadata };
  return true;
};
assert(Sanma.RecoveryFlow.resolvePendingCpuRon(pendingCpu, 1), "stored pending CPU ron was not resolved");
assert(resolvedCpu && resolvedCpu.playerIndex === 2 && resolvedCpu.metadata.isCpuRon, "RecoveryFlow ignored stored pending CPU ron candidate");

console.log("Issue runtime flow regression tests passed.");
