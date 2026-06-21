const fs = require("fs");
const path = require("path");
const { assert, loadModules, projectRoot } = require("./test-helpers");

const Sanma = loadModules();

function players() {
  return [
    { id: 0, name: "あなた", isHuman: true, seatWind: "east", points: 35000 },
    { id: 1, name: "CPU 1", isHuman: false, seatWind: "south", points: 35000 },
    { id: 2, name: "CPU 2", isHuman: false, seatWind: "west", points: 35000 },
  ];
}

function baseRecord(ruleConfig) {
  return Sanma.GameRecord.create({
    players: players(),
    startingPoints: [35000, 35000, 35000],
    ruleConfig: ruleConfig || Sanma.RuleConfig.createRuleConfig(),
    seed: "issue26-record-replay-stats-ui",
  });
}

(function testRuleSummaryDefaults() {
  const rules = Sanma.RuleConfig.createRuleConfig();
  assert(rules.allowChi === false, "Issue #26: 新規デフォルトはチーなしにする");
  assert(rules.doubleRonPolicy.allowed === false, "Issue #26: 新規デフォルトは頭ハネにする");
  const summary = Sanma.RuleConfig.describeRuleConfig(rules);
  assert(summary.includes("チーなし"), "ルール要約にチーなしを表示する");
  assert(summary.includes("ダブロンなし"), "ルール要約にダブロンなしを表示する");
  const chiOn = Sanma.RuleConfig.createRuleConfig({ allowChi: true, doubleRonPolicy: { allowed: false } });
  assert(chiOn.allowChi === true, "既存または明示チーあり設定は尊重する");
  assert(chiOn.doubleRonPolicy.allowed === false, "明示ダブロンなし設定は尊重する");
}());

(function testNewYakuNamesArePersisted() {
  const record = baseRecord();
  Sanma.GameRecord.completeRound(record, {
    type: "win",
    winnerIndex: 0,
    winType: "ron",
    yaku: {
      yaku: [{ id: "honitsu" }, { name: "chinitsu" }],
      yakuman: [{ id: "suuankou" }, { name: "daisangen" }],
    },
    score: { isValidWin: true, isYakuman: true, han: 0, fu: null, yakumanCount: 2, basePoints: 16000 },
    settlement: { changes: [
      { playerIndex: 0, delta: 32000, after: 67000 },
      { playerIndex: 1, delta: -32000, after: 3000 },
      { playerIndex: 2, delta: 0, after: 35000 },
    ] },
  }, [67000, 3000, 35000]);
  const result = record.rounds[0].result;
  assert(result.yaku.includes("混一色"), "honitsuは混一色として保存する");
  assert(result.yaku.includes("清一色"), "chinitsuは清一色として保存する");
  assert(result.yakuman.includes("四暗刻"), "suuankouは四暗刻として保存する");
  assert(result.yakuman.includes("大三元"), "daisangenは大三元として保存する");
  assert(result.winners.length === 1 && result.winners[0].winnerIndex === 0, "単独和了もwinners互換形式を持つ");
}());

(function testExhaustiveDrawSettlementIsSemantic() {
  const record = baseRecord();
  Sanma.GameRecord.addEvent(record, "score_settlement", {
    resultType: "exhaustive_draw",
    changes: [
      { playerIndex: 0, delta: 1500, after: 36500 },
      { playerIndex: 1, delta: 1500, after: 36500 },
      { playerIndex: 2, delta: -3000, after: 32000 },
    ],
  });
  Sanma.GameRecord.completeRound(record, {
    type: "exhaustive_draw",
    dealerTenpai: true,
    tenpaiPlayers: [0, 1],
    notenPlayers: [2],
    changes: [
      { playerIndex: 0, delta: 1500, after: 36500 },
      { playerIndex: 1, delta: 1500, after: 36500 },
      { playerIndex: 2, delta: -3000, after: 32000 },
    ],
    reason: "no_tiles",
  }, [36500, 36500, 32000]);
  const imported = Sanma.GameRecord.deserializeImported(JSON.stringify(Object.assign({}, record, {
    completedAt: "2026-06-21T00:00:00.000Z",
  })));
  assert(imported.rounds[0].result.type === "exhaustive_draw", "流局結果typeを保存する");
  assert(imported.rounds[0].result.tenpaiPlayers.length === 2, "テンパイ者を保存する");
  assert(imported.rounds[0].result.changes[2].delta === -3000, "ノーテン罰符を保存する");
  const state = Sanma.ReplayViewer.create(imported, 0);
  Sanma.ReplayViewer.jumpToEnd(state);
  assert(state.view.points[2] === 32000, "Replayでscore_settlement相当の点棒を反映する");
  assert(Sanma.ReplayViewer.eventText(record.rounds[0].events[0], record).includes("点棒精算"), "Replayの精算イベント表示が落ちない");
}());

(function testDoubleRonRecordReplayStats() {
  const record = baseRecord(Sanma.RuleConfig.createRuleConfig({ doubleRonPolicy: { allowed: true } }));
  Sanma.GameRecord.addEvent(record, "double_ron", {
    fromPlayerIndex: 1,
    winners: [{ winnerIndex: 0 }, { winnerIndex: 2 }],
    changes: [
      { playerIndex: 0, delta: 8000, after: 43000 },
      { playerIndex: 1, delta: -20000, after: 15000 },
      { playerIndex: 2, delta: 12000, after: 47000 },
    ],
  });
  Sanma.GameRecord.completeRound(record, {
    type: "double_ron",
    fromPlayerIndex: 1,
    winners: [
      {
        winnerIndex: 0,
        winType: "ron",
        fromPlayerIndex: 1,
        yaku: [{ id: "honitsu" }],
        score: { isValidWin: true, isYakuman: false, han: 3, fu: 40, basePoints: 8000 },
        pointTransfers: [{ fromPlayerIndex: 1, toPlayerIndex: 0, points: 8000 }],
      },
      {
        winnerIndex: 2,
        winType: "ron",
        fromPlayerIndex: 1,
        yakuman: [{ id: "daisangen" }],
        score: { isValidWin: true, isYakuman: true, han: 0, fu: null, yakumanCount: 1, basePoints: 12000 },
        pointTransfers: [{ fromPlayerIndex: 1, toPlayerIndex: 2, points: 12000 }],
      },
    ],
    changes: [
      { playerIndex: 0, delta: 8000, after: 43000 },
      { playerIndex: 1, delta: -20000, after: 15000 },
      { playerIndex: 2, delta: 12000, after: 47000 },
    ],
  }, [43000, 15000, 47000]);
  const normalized = Sanma.GameRecord.normalize(record);
  assert(normalized.rounds[0].result.winners.length === 2, "ダブロン複数勝者を保存する");
  assert(normalized.rounds[0].result.winners[0].yaku.includes("混一色"), "ダブロン勝者ごとの役を保存する");
  assert(normalized.rounds[0].result.winners[1].yakuman.includes("大三元"), "ダブロン勝者ごとの役満を保存する");
  const state = Sanma.ReplayViewer.create(normalized, 0);
  Sanma.ReplayViewer.jumpToEnd(state);
  assert(state.view.points[1] === 15000, "Replayがダブロンイベントで落ちず点棒を反映する");
  const stats = Sanma.AdvancedStats.calculate([normalized]);
  assert(stats.hand.wins === 1, "Statsは人間をダブロン勝者として集計する");
  assert(stats.hand.doubleRonCount === 1, "Statsはダブロン回数を集計する");
  assert(stats.yaku.frequency["混一色"] === 1, "Statsは新規役を集計する");
  assert(stats.yaku.yakumanNames["大三元"] === undefined, "人間以外の役満は人間Statsを汚染しない");
  const importedStats = Sanma.AdvancedStats.calculate([Object.assign({}, normalized, { imported: true, statsEligible: false })]);
  assert(importedStats.match.gamesPlayed === 0, "import牌譜は公式Stats対象外のまま");
}());

(function testIndexLoadsRequiredScripts() {
  const rootIndex = fs.readFileSync(path.resolve(projectRoot, "..", "..", "index.html"), "utf8");
  const canonicalIndex = fs.readFileSync(path.resolve(projectRoot, "index.html"), "utf8");
  [rootIndex, canonicalIndex].forEach((html, index) => {
    assert(html.includes("GameRecord.js"), `index ${index}: GameRecord.js scriptが必要`);
    assert(html.includes("ReplayViewer.js"), `index ${index}: ReplayViewer.js scriptが必要`);
    assert(html.includes("AdvancedStats.js"), `index ${index}: AdvancedStats.js scriptが必要`);
    assert(html.includes("RecordIndex.js"), `index ${index}: RecordIndex.js scriptが必要`);
  });
}());

console.log("issue26-record-replay-stats-ui tests passed");
