const { assert, loadModules } = require("./test-helpers");

const Sanma = loadModules();
const config = Sanma.RuleConfig.createRuleConfig({ gameLength: "tonpuu", allowTobi: true });
assert(config.matchLength === "tonpuu" && config.gameLength === "tonpuu", "旧gameLengthを対局形式へ移行できません");
assert(
  Sanma.RuleConfig.createRuleConfig({ matchLength: "single", gameLength: "hanchan" }).matchLength === "single",
  "新matchLengthを優先できません"
);

const match = new Sanma.MatchManager({ ruleConfig: config });
let state = match.getState();
assert(state.roundLabel === "東1局" && state.dealerIndex === 0, "対局開始時の局・親が不正です");
assert(state.players.every((player) => player.points === 35000), "対局開始点が不正です");

const settlementPlayers = [
  { name: "A", points: 34000 },
  { name: "B", points: 35000 },
  { name: "C", points: 34000 },
];
const stickSettlement = Sanma.Settlement.applySettlement({
  players: settlementPlayers,
  scoreResult: {
    isValidWin: true,
    payments: { ron: { amount: 1000, winnerGain: 3000 } },
  },
  context: { winType: "ron", winnerIndex: 0, loserIndex: 1 },
});
assert(stickSettlement.applied && settlementPlayers[0].points === 37000, "和了者が供託を回収できません");

match.completeRound({ winnerIndex: 1, winType: "tsumo" }, state.players);
assert(match.startNextRound(), "子の和了後に次局へ進めません");
state = match.getState();
assert(state.roundLabel === "東2局" && state.dealerIndex === 1, "子の和了後に親が移動しません");
assert(state.honba === 0, "子の和了後に本場がリセットされません");

match.completeRound({ winnerIndex: 1, winType: "ron" }, state.players);
assert(match.startNextRound(), "親の和了後に連荘できません");
state = match.getState();
assert(state.roundLabel === "東2局" && state.dealerIndex === 1, "親の和了後に局・親が変わりました");
assert(state.honba === 1, "親の和了後に本場が増えません");

match.syncRound(Object.assign(match.getRoundSnapshot(), { riichiSticks: 2 }));
match.completeRound({ winnerIndex: 2, winType: "ron" }, state.players);
state = match.getState();
assert(state.riichiSticks === 0, "和了後に供託が回収されません");

const drawMatch = new Sanma.MatchManager({ ruleConfig: config });
drawMatch.completeRound({ type: "exhaustive_draw", dealerTenpai: true }, drawMatch.getState().players);
drawMatch.startNextRound();
assert(drawMatch.getState().honba === 1 && drawMatch.getState().dealerIndex === 0, "親聴牌流局の連荘・本場が不正です");

const tobiMatch = new Sanma.MatchManager({ ruleConfig: config });
const tobiPlayers = tobiMatch.getState().players;
tobiPlayers[2].points = -100;
tobiMatch.completeRound({ winnerIndex: 0, winType: "ron" }, tobiPlayers);
assert(tobiMatch.getState().matchEnded && tobiMatch.getState().endReason === "トビ終了", "トビ終了を検出できません");

const finalMatch = new Sanma.MatchManager({ ruleConfig: config });
finalMatch.state.roundNumber = 3;
finalMatch.state.roundLabel = "東3局";
finalMatch.completeRound({ winnerIndex: 1, winType: "tsumo" }, finalMatch.getState().players);
assert(finalMatch.getState().matchEnded && finalMatch.getState().endReason === "オーラス終了", "東風戦の終了を検出できません");

const rankings = Sanma.RankingManager.rank([
  { id: 0, name: "A", points: 40000 },
  { id: 1, name: "B", points: 40000 },
  { id: 2, name: "C", points: 25000 },
], 40000);
assert(rankings[0].playerIndex === 0 && rankings[1].playerIndex === 1, "同点順位が決定的ではありません");
assert(rankings[0].label === "1位" && rankings[2].pointDelta === -15000, "順位表示・返し点差が不正です");

const record = Sanma.GameRecord.create({
  matchId: state.matchId,
  ruleConfig: config,
  players: state.players,
  roundLabel: state.roundLabel,
  dealerIndex: state.dealerIndex,
  honba: state.honba,
  riichiSticks: state.riichiSticks,
});
Sanma.GameRecord.completeRound(record, {
  winnerIndex: 1,
  winType: "ron",
  settlement: { changes: [{ playerIndex: 1, delta: 2000, after: 37000 }] },
}, [34000, 37000, 34000]);
Sanma.GameRecord.finishMatch(record, [34000, 37000, 34000], rankings);
const restored = Sanma.GameRecord.deserialize(Sanma.GameRecord.serialize(record));
assert(restored.matchId === state.matchId, "牌譜へmatchIdを保存できません");
assert(restored.rounds[0].dealerIndex === state.dealerIndex, "牌譜へdealerIndexを保存できません");
assert(restored.rounds[0].pointMovement[0].delta === 2000, "牌譜へ局の点棒移動を保存できません");
assert(Array.isArray(restored.finalRankings) && restored.finalRankings.length === 3, "牌譜へ最終順位を保存できません");

const engine = new Sanma.GameEngine({
  ruleConfig: { gameLength: "tonpuu" },
  seed: "phase10-engine",
  onChange: function noop() {},
});
engine.players[1].points += 2000;
engine.players[0].points -= 2000;
engine.finishGameRecord({ winnerIndex: 1, winType: "ron", settlement: { changes: [] } });
assert(engine.matchManager.getState().roundEnded, "GameEngineが局終了を対局状態へ反映できません");
assert(engine.startNextRound(), "GameEngineが次局を開始できません");
assert(engine.round.label === "東2局" && engine.round.dealerIndex === 1, "GameEngineの次局表示・親移動が不正です");
assert(engine.players[1].points === 37000 && engine.players[0].points === 33000, "次局開始時に点棒を保持できません");
assert(engine.gameRecord.rounds.length === 2, "対局牌譜へ次局を追加できません");

const singleEngine = new Sanma.GameEngine({
  ruleConfig: { gameLength: "single" },
  seed: "phase10-single",
  onChange: function noop() {},
});
singleEngine.finishGameRecord({ type: "exhaustive_draw", reason: "テスト流局" });
assert(singleEngine.matchManager.getState().matchEnded, "一局戦が対局終了になりません");
assert(singleEngine.gameRecord.completedAt, "対局終了時に牌譜を完了できません");
assert(singleEngine.startNextRound() === false, "対局終了後に次局へ進みました");

console.log("Phase 10 match flow tests passed.");
