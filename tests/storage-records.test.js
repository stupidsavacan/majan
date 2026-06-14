const { assert, createTileFactory, loadModules } = require("./test-helpers");

const storageData = {};
global.localStorage = {
  getItem(key) { return Object.prototype.hasOwnProperty.call(storageData, key) ? storageData[key] : null; },
  setItem(key, value) { storageData[key] = String(value); },
  removeItem(key) { delete storageData[key]; },
};

const Sanma = loadModules([
  "src/storage/settingsStorage.js",
  "src/storage/gameRecordStorage.js",
  "src/ui/settingsExportImport.js",
]);
const tile = createTileFactory(Sanma.TileUtil);

const settings = Sanma.RuleConfig.createRuleConfig({
  allowChi: false,
  highScoreMode: true,
  northMode: "normal-tile",
});
const exported = Sanma.SettingsExportImport.exportSettings(settings);
const imported = Sanma.SettingsExportImport.importSettings(exported);
assert(imported.ok, "設定JSONを再インポートできません");
assert(imported.settings.allowChi === false, "設定JSONでallowChiを往復できません");
assert(imported.settings.highScoreMode === true, "設定JSONでhighScoreModeを往復できません");
assert(!Sanma.SettingsExportImport.importSettings("{broken-json").ok, "不正な設定JSONを受理しました");
assert(!Sanma.SettingsExportImport.importSettings('{"unknown":true}').ok, "既知項目のない設定JSONを受理しました");
assert(Sanma.SettingsStorage.saveSettings(settings), "設定を保存できません");
assert(Sanma.SettingsStorage.resetSettings(), "設定だけを初期化できません");
assert(Sanma.SettingsStorage.loadSettings().allowChi === true, "設定初期化後に既定値へ戻りません");
storageData[Sanma.SettingsStorage.STORAGE_KEY] = "{}";
storageData[Sanma.GameRecordStorage.RECORDS_KEY] = "[]";
storageData[Sanma.GameRecordStorage.STATS_KEY] = "{}";
assert(Sanma.SettingsStorage.resetAllStorage(), "全保存データを初期化できません");
assert(
  !storageData[Sanma.SettingsStorage.STORAGE_KEY]
    && !storageData[Sanma.GameRecordStorage.RECORDS_KEY]
    && !storageData[Sanma.GameRecordStorage.STATS_KEY],
  "全保存データ初期化で設定・牌譜・成績が残っています"
);

storageData[Sanma.SettingsStorage.STORAGE_KEY] = "{broken-json";
const originalWarn = console.warn;
console.warn = function expectedStorageWarning() {};
const recoveredSettings = Sanma.SettingsStorage.loadSettings();
console.warn = originalWarn;
assert(recoveredSettings && !storageData[Sanma.SettingsStorage.STORAGE_KEY], "壊れた設定を安全に初期化できません");
assert(Sanma.SettingsStorage.getDiagnostics().corruptedRecovered, "壊れた設定の復旧状態を診断へ記録できません");
assert(Sanma.SettingsStorage.getDiagnostics().readable, "JSON破損をlocalStorage読取不能として扱っています");

const players = [
  { id: 0, name: "あなた", seatWind: "east", isHuman: true, points: 35000 },
  { id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: 35000 },
  { id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: 35000 },
];
const record = Sanma.GameRecord.create({
  seed: "phase8-record",
  ruleConfig: settings,
  players,
  roundLabel: "東1局",
  honba: 0,
});
const addedRound = Sanma.GameRecord.addRound(record, { roundLabel: "東2局", honba: 1 });
assert(addedRound && record.rounds.length === 2, "牌譜へ局を追加できません");
record.rounds.pop();
Sanma.GameRecord.addEvent(record, "deal", { dealerIndex: 0 });
Sanma.GameRecord.addEvent(record, "win", { playerIndex: 0, winType: "tsumo" });
Sanma.GameRecord.finishRound(record, {
  winnerIndex: 0,
  winType: "tsumo",
  yaku: { yaku: [{ name: "門前清自摸和" }], yakuman: [] },
  score: { isValidWin: true, isYakuman: false, han: 2, fu: 30, limitName: "" },
  settlement: { changes: [{ playerIndex: 0, delta: 2000, after: 37000 }] },
}, [37000, 34000, 34000]);

const serialized = Sanma.GameRecord.serialize(record);
const restored = Sanma.GameRecord.deserialize(serialized);
assert(restored.id === record.id && restored.rounds[0].events.length === 2, "牌譜を作成・直列化できません");
assert(Sanma.GameRecordStorage.saveRecord(record), "牌譜を保存できません");
assert(Sanma.GameRecordStorage.loadRecords()[0].id === record.id, "保存した牌譜を読み込めません");
storageData[Sanma.GameRecordStorage.RECORDS_KEY] = JSON.stringify([{ bad: true }, record]);
assert(Sanma.GameRecordStorage.loadRecords().length === 1, "不正な個別牌譜を読み飛ばせません");
storageData[Sanma.GameRecordStorage.RECORDS_KEY] = "{broken-json";
assert(Sanma.GameRecordStorage.loadRecords().length === 0, "壊れた牌譜保存を安全に復旧できません");
assert(Sanma.GameRecordStorage.getDiagnostics().localStorage.readable, "牌譜JSON破損をlocalStorage読取不能として扱っています");
const emptyDiagnostics = Sanma.GameRecordStorage.getDiagnostics();
assert(
  typeof emptyDiagnostics.localStorage.readable === "boolean"
    && typeof emptyDiagnostics.localStorage.writable === "boolean"
    && emptyDiagnostics.records.count === 0,
  "空の保存領域を診断できません"
);

const engine = new Sanma.GameEngine({
  ruleConfig: settings,
  seed: "phase8-engine-record",
  onChange: function noop() {},
});
engine.humanPlayer.hand = [
  "1p", "2p", "3p",
  "4p", "5p", "6p",
  "7s", "8s", "9s",
  "white", "white", "white",
  "9m", "9m",
].map((code) => tile(code));
engine.phase = "human-discard";
engine.turnIndex = 0;
engine.claimHumanTsumo();
assert(engine.gameRecord.completedAt, "GameEngineが和了時に牌譜を完了できません");
assert(
  engine.gameRecord.rounds[0].events.some((event) => event.type === "win")
    && engine.gameRecord.rounds[0].events.some((event) => event.type === "score_settlement"),
  "GameEngineが和了・精算イベントを牌譜へ記録できません"
);
const eventIndexes = engine.gameRecord.rounds[0].events.map((event) => event.index);
assert(
  eventIndexes.every((index, position) => position === 0 || index > eventIndexes[position - 1]),
  "GameEngineの牌譜イベントが時系列順ではありません"
);
assert(
  engine.gameRecord.rounds[0].events.filter((event) => event.type === "win").length === 1,
  "GameEngineの和了イベントが重複しています"
);

Sanma.GameRecordStorage.resetRecords();
Sanma.GameRecordStorage.resetStats();
const committed = Sanma.GameRecordStorage.commitRecord(record);
assert(committed.saved && committed.isNew, "終了牌譜を確定保存できません");
const duplicateCommit = Sanma.GameRecordStorage.commitRecord(record);
assert(duplicateCommit.saved && !duplicateCommit.isNew, "同一牌譜IDの重複保存を判定できません");
const stats = Sanma.GameRecordStorage.loadStats();
assert(stats.gamesPlayed === 1 && stats.roundsPlayed === 1, "対局・局数を集計できません");
assert(stats.wins === 1 && stats.losses === 0, "人間の和了を成績へ反映できません");
assert(stats.totalScoreMovement === 2000, "点数収支を成績へ反映できません");
assert(stats.highestHand && stats.highestHand.score.han === 2, "最高打点を保存できません");
const lowerRecord = Sanma.GameRecord.create({ players, ruleConfig: settings });
Sanma.GameRecord.finishRound(lowerRecord, {
  winnerIndex: 0,
  winType: "tsumo",
  yaku: { yaku: [{ name: "門前清自摸和" }], yakuman: [] },
  score: { isValidWin: true, isYakuman: false, han: 1, fu: 30, limitName: "" },
}, [36000, 34500, 34500]);
Sanma.GameRecordStorage.updateStats(lowerRecord);
assert(
  Sanma.GameRecordStorage.loadStats().highestHand.score.han === 2,
  "低い和了で最高打点を上書きしました"
);

const capped = Sanma.GameRecord.create({ players, ruleConfig: settings });
for (let index = 0; index < Sanma.GameRecord.MAX_EVENTS_PER_ROUND + 50; index += 1) {
  Sanma.GameRecord.addEvent(capped, "draw", { index });
}
assert(
  capped.rounds[0].events.length === Sanma.GameRecord.MAX_EVENTS_PER_ROUND,
  "大きなイベントログを上限内へ制限できません"
);

Sanma.GameRecordStorage.resetRecords();
for (let index = 0; index < Sanma.GameRecordStorage.MAX_RECORDS + 5; index += 1) {
  const limitedRecord = Sanma.GameRecord.create({ players, ruleConfig: settings });
  assert(Sanma.GameRecordStorage.saveRecord(limitedRecord), "牌譜上限テスト用データを保存できません");
}
assert(
  Sanma.GameRecordStorage.loadRecords().length === Sanma.GameRecordStorage.MAX_RECORDS,
  "保存牌譜数の上限を適用できません"
);

assert(Sanma.GameRecordStorage.resetRecords(), "牌譜をリセットできません");
assert(Sanma.GameRecordStorage.resetStats(), "成績をリセットできません");
assert(Sanma.GameRecordStorage.loadRecords().length === 0, "牌譜リセット後もデータが残っています");
assert(Sanma.GameRecordStorage.loadStats().gamesPlayed === 0, "成績リセット後もデータが残っています");
storageData[Sanma.GameRecordStorage.STATS_KEY] = JSON.stringify({ gamesPlayed: "broken", wins: 4 });
const repairedStats = Sanma.GameRecordStorage.loadStats();
assert(repairedStats.gamesPlayed === 0 && repairedStats.wins === 4, "壊れた成績フィールドを安全に正規化できません");
Sanma.GameRecordStorage.resetStats();
const zeroPointRecord = Sanma.GameRecord.create({ players, ruleConfig: settings });
Sanma.GameRecord.finishRound(zeroPointRecord, { type: "exhaustive_draw" }, [0, 52500, 52500]);
assert(
  Sanma.GameRecordStorage.updateStats(zeroPointRecord).totalScoreMovement === -35000,
  "持ち点0点を点数収支へ反映できません"
);

console.log("Phase 8 storage and records tests passed.");
