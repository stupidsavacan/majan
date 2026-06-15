const { assert, loadModules } = require("./test-helpers");

const storageData = {};
global.localStorage = {
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(storageData, key) ? storageData[key] : null;
  },
  setItem(key, value) {
    storageData[key] = String(value);
  },
  removeItem(key) {
    delete storageData[key];
  },
};

const Sanma = loadModules(["src/storage/SaveMigration.js"]);

function createEngine(seed, ruleConfig) {
  return new Sanma.GameEngine({
    ruleConfig: ruleConfig || {},
    seed,
    onChange: function noop() {},
  });
}

const machine = Sanma.GameStateMachine.create("waitingForCall");
const rejected = Sanma.GameStateMachine.validateAction(machine, "打牌", ["waitingForDiscard"]);
assert(!rejected.ok && rejected.state === "waitingForCall", "誤った状態の操作を拒否できません");

const doubleDiscardEngine = createEngine("phase12-double-discard");
const discardId = doubleDiscardEngine.humanPlayer.hand[0].instanceId;
doubleDiscardEngine.discardHumanTile(discardId);
const discardCountAfterFirst = doubleDiscardEngine.players
  .reduce((total, player) => total + player.discards.length, 0);
doubleDiscardEngine.discardHumanTile(discardId);
const discardCountAfterSecond = doubleDiscardEngine.players
  .reduce((total, player) => total + player.discards.length, 0);
assert(discardCountAfterSecond === discardCountAfterFirst, "二重打牌で牌が二枚処理されました");

const duplicateEngine = createEngine("phase12-duplicate");
duplicateEngine.wall.tiles.push(duplicateEngine.humanPlayer.hand[0]);
const duplicateReport = Sanma.TileLedger.inspect(duplicateEngine, duplicateEngine.ruleConfig);
assert(
  !duplicateReport.ok && duplicateReport.errors.some((error) => error.includes("ID")),
  "重複した牌instanceIdを検出できません"
);

const missingTurnEngine = createEngine("phase12-missing-turn");
missingTurnEngine.turnIndex = 99;
const missingTurnReport = Sanma.InvariantChecker.checkState(missingTurnEngine, missingTurnEngine.ruleConfig);
assert(!missingTurnReport.ok, "存在しない手番プレイヤーを検出できません");

const recoveryEngine = createEngine("phase12-recovery");
recoveryEngine.phase = "human-call";
recoveryEngine.callWindow = {
  fromPlayerIndex: 1,
  actions: [{ id: "skip", label: "スキップ" }],
};
const recovery = Sanma.RecoveryManager.closeStuckActionWindow(recoveryEngine);
assert(recovery.ok, "停止した呼び出し窓から復旧できません");
assert(
  (recoveryEngine.phase === "human-discard" && recoveryEngine.turnIndex === recoveryEngine.humanPlayer.id)
    || (recoveryEngine.phase === "human-call" && recoveryEngine.callWindow && recoveryEngine.callWindow.isOpen)
    || recoveryEngine.phase === "win-ended"
    || recoveryEngine.phase === "round-ended",
  "呼び出し窓の復旧後に合法な操作状態へ進められません"
);
assert(recoveryEngine.phase !== "human-draw" && recoveryEngine.phase !== "cpu-running", "復旧後に到達不能な状態で停止しました");

const corruptKey = "offlineSanma.phase1.settings";
storageData[corruptKey] = "{broken-json";
const corruptResult = Sanma.SaveMigration.readAndMigrate({
  storage: global.localStorage,
  key: corruptKey,
  kind: "settings",
  fallback: {},
});
assert(corruptResult.recovered && corruptResult.backupKey, "壊れた保存データを退避できません");
assert(storageData[corruptResult.backupKey].includes("{broken-json"), "退避データに元の値がありません");
assert(JSON.parse(storageData[corruptKey]).version === 2, "壊れた保存データを初期化できません");

const migrationKey = "offlineSanma.phase12.test.settings";
storageData[migrationKey] = JSON.stringify({ allowChi: false });
const firstMigration = Sanma.SaveMigration.readAndMigrate({
  storage: global.localStorage,
  key: migrationKey,
  kind: "settings",
  fallback: {},
});
const migratedRaw = storageData[migrationKey];
const secondMigration = Sanma.SaveMigration.readAndMigrate({
  storage: global.localStorage,
  key: migrationKey,
  kind: "settings",
  fallback: {},
});
assert(firstMigration.migrated && !secondMigration.migrated, "保存移行が冪等ではありません");
assert(storageData[migrationKey] === migratedRaw, "二回目の保存移行でデータが変化しました");

const cpuGuardEngine = createEngine("phase12-cpu-guard");
cpuGuardEngine.phase = "cpu-running";
cpuGuardEngine.turnIndex = 1;
cpuGuardEngine.cpuTaskActive = true;
const wallCountBeforeCpuGuard = cpuGuardEngine.wall.remainingCount();
assert(cpuGuardEngine.runCpuUntilHumanTurn() === false, "二重CPU処理を拒否できません");
assert(cpuGuardEngine.wall.remainingCount() === wallCountBeforeCpuGuard, "二重CPU処理で山が変化しました");

const normalEngine = createEngine("phase12-normal");
const normalInvariant = Sanma.InvariantChecker.checkState(normalEngine, normalEngine.ruleConfig);
assert(normalInvariant.ok, `通常局開始時の整合性検査に失敗しました: ${normalInvariant.errors.join(" / ")}`);
normalEngine.discardHumanTile(normalEngine.humanPlayer.hand[0].instanceId);
assert(
  Sanma.TileLedger.inspect(normalEngine, normalEngine.ruleConfig).ok,
  "通常の摸打後に牌台帳が不整合になりました"
);

const kitaEngine = createEngine("phase12-kita", { northMode: "kita-dora" });
const northIndex = kitaEngine.wall.tiles.findIndex((tile) => tile.baseId === "z4");
assert(northIndex >= 0, "北抜き検査用の北が山にありません");
const north = kitaEngine.wall.tiles.splice(northIndex, 1)[0];
const swapped = kitaEngine.humanPlayer.hand.pop();
kitaEngine.wall.tiles.push(swapped);
kitaEngine.humanPlayer.receiveTile(north);
const kitaResult = Sanma.KitaManager.extract(kitaEngine, kitaEngine.humanPlayer.id, north.instanceId);
assert(kitaResult.applied, "北抜き検査を実行できません");
assert(
  Sanma.TileLedger.inspect(kitaEngine, kitaEngine.ruleConfig).ok,
  "北抜き後に牌台帳が不整合になりました"
);

console.log("Phase 12 state integrity tests passed.");
