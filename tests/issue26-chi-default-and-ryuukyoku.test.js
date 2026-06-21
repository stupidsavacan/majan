const { arrangeEngine, assert, createEngine, loadModules } = require("../extracted-zips/offline-sanma-mahjong-phase1/tests/phase14-2-test-utils");

const Sanma = loadModules();

function setupChiScenario(engine, discarderIndex, callerIndex) {
  arrangeEngine(Sanma, engine, {
    turnIndex: callerIndex,
    phase: "human-call",
    players: [
      { hand: ["2p", "3p", "4p", "9m", "1s", "3s", "5s", "7s", "9s", "z1", "z2", "z3", "z4"], lastDraw: false },
      { hand: ["2p", "4p", "1m", "9m", "1s", "3s", "5s", "7s", "9s", "z1", "z2", "z3", "z4"], lastDraw: false },
      { hand: ["3p", "1m", "9m", "1s", "2s", "3s", "4s", "5s", "6s", "7s", "8s", "9s", "z5"], lastDraw: false },
    ],
  });
  engine.lastDiscard = {
    playerIndex: discarderIndex,
    tile: engine.players[discarderIndex].hand.find((tile) => tile.baseId === "3p"),
  };
  return engine;
}

function setupDrawHands(engine, hands, dealerIndex) {
  arrangeEngine(Sanma, engine, {
    turnIndex: dealerIndex || 0,
    players: hands.map((hand) => ({ hand, lastDraw: false })),
  });
  engine.round.dealerIndex = dealerIndex || 0;
  engine.matchManager.state.dealerIndex = dealerIndex || 0;
  return engine;
}

function deltas(result) {
  return (result.settlement.changes || []).map((change) => change.delta);
}

const defaultConfig = Sanma.RuleConfig.createRuleConfig({});
assert(defaultConfig.allowChi === false, "default allowChi should be false");
assert(Sanma.RuleConfig.createRuleConfig({ allowChi: true }).allowChi === true, "explicit allowChi true should be preserved");
assert(Sanma.RuleConfig.describeRuleConfig(defaultConfig).includes("チーなし"), "rule summary should expose chi-off");
assert(Sanma.RuleConfig.describeRuleConfig(Sanma.RuleConfig.createRuleConfig({ allowChi: true })).includes("チーあり"), "rule summary should expose chi-on");

const chiOffHuman = setupChiScenario(createEngine(Sanma, "issue26-chi-off-human", {}), 2, 0);
const chiOffHumanAction = Sanma.ActionResolver.findAction(chiOffHuman, 0, "chi");
assert(!chiOffHumanAction.enabled, "allowChi false should hide human chi candidates");
assert((chiOffHumanAction.options || []).length === 0, "allowChi false should expose no human chi options");
assert(!Sanma.CallWindow.create(chiOffHuman, 0), "allowChi false should not open a chi-only human call window");

const chiOnHuman = setupChiScenario(createEngine(Sanma, "issue26-chi-on-human", { allowChi: true }), 2, 0);
const chiOnHumanAction = Sanma.ActionResolver.findAction(chiOnHuman, 0, "chi");
assert(chiOnHumanAction.enabled, "allowChi true should restore human chi candidates");
assert((chiOnHumanAction.options || []).length > 0, "allowChi true should expose human chi options");

const chiOffCpu = setupChiScenario(createEngine(Sanma, "issue26-chi-off-cpu", {}), 0, 1);
const chiOffCpuCandidates = Sanma.CallResolver.collectCpuCallCandidates(chiOffCpu, 0);
assert(!chiOffCpuCandidates.some((candidate) => candidate.actionId === "chi"), "allowChi false should hide CPU chi candidates");

const chiOnCpu = setupChiScenario(createEngine(Sanma, "issue26-chi-on-cpu", { allowChi: true }), 0, 1);
const chiOnCpuCandidates = Sanma.CallResolver.collectCpuCallCandidates(chiOnCpu, 0);
assert(chiOnCpuCandidates.some((candidate) => candidate.actionId === "chi"), "allowChi true should restore CPU chi candidates");

const tenpaiA = ["2s", "3s", "4s", "2p", "3p", "4p", "6p", "7p", "8p", "6s", "7s", "8s", "5p"];
const tenpaiB = ["1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "1s", "2s", "3s", "z1"];
const tenpaiC = ["1m", "1m", "1m", "9m", "9m", "9m", "1s", "2s", "3s", "7s", "8s", "9s", "z5"];
const notenA = ["1m", "9m", "1p", "3p", "5p", "7p", "9p", "1s", "4s", "7s", "z1", "z2", "z3"];
const notenB = ["1m", "9m", "2p", "4p", "6p", "8p", "2s", "5s", "8s", "z4", "z5", "z6", "z7"];

const oneTenpai = setupDrawHands(createEngine(Sanma, "issue26-one-tenpai", {}), [tenpaiA, notenA, notenB], 0);
const oneResult = oneTenpai.withDrawTenpai({ type: "exhaustive_draw" });
assert(oneResult.dealerTenpai, "dealer tenpai should be preserved on exhaustive draw");
assert(JSON.stringify(oneResult.tenpaiPlayers) === JSON.stringify([0]), "one-tenpai result should list tenpai player");
assert(JSON.stringify(deltas(oneResult)) === JSON.stringify([3000, -1500, -1500]), "one-tenpai draw settlement should be +3000/-1500/-1500");
assert(oneTenpai.players[0].points === 38000 && oneTenpai.players[1].points === 33500 && oneTenpai.players[2].points === 33500, "one-tenpai settlement should update points");

const twoTenpai = setupDrawHands(createEngine(Sanma, "issue26-two-tenpai", {}), [tenpaiA, tenpaiB, notenB], 0);
const twoResult = twoTenpai.withDrawTenpai({ type: "exhaustive_draw" });
assert(JSON.stringify(twoResult.tenpaiPlayers) === JSON.stringify([0, 1]), "two-tenpai result should list both tenpai players");
assert(JSON.stringify(deltas(twoResult)) === JSON.stringify([1500, 1500, -3000]), "two-tenpai draw settlement should be +1500/+1500/-3000");

const allTenpai = setupDrawHands(createEngine(Sanma, "issue26-all-tenpai", {}), [tenpaiA, tenpaiB, tenpaiC], 0);
const allTenpaiResult = allTenpai.withDrawTenpai({ type: "exhaustive_draw" });
assert(JSON.stringify(deltas(allTenpaiResult)) === JSON.stringify([0, 0, 0]), "all-tenpai draw should not move points");

const allNoten = setupDrawHands(createEngine(Sanma, "issue26-all-noten", {}), [notenA, notenB, ["1m", "9m", "1p", "4p", "7p", "2s", "5s", "8s", "z1", "z3", "z5", "z6", "z7"]], 0);
const allNotenResult = allNoten.withDrawTenpai({ type: "exhaustive_draw" });
assert(JSON.stringify(deltas(allNotenResult)) === JSON.stringify([0, 0, 0]), "all-noten draw should not move points");

const managerDealerTenpai = new Sanma.MatchManager({ ruleConfig: {} });
managerDealerTenpai.completeRound({ type: "exhaustive_draw", dealerTenpai: true }, managerDealerTenpai.state.players);
assert(managerDealerTenpai.pendingRound.dealerIndex === 0, "dealer tenpai draw should renchan");
assert(managerDealerTenpai.pendingRound.honba === 1, "dealer tenpai draw should increment honba");

const managerDealerNoten = new Sanma.MatchManager({ ruleConfig: {} });
managerDealerNoten.completeRound({ type: "exhaustive_draw", dealerTenpai: false }, managerDealerNoten.state.players);
assert(managerDealerNoten.pendingRound.dealerIndex === 1, "dealer noten draw should rotate dealer");
assert(managerDealerNoten.pendingRound.honba === 0, "dealer noten draw should reset honba");

const recordEngine = setupDrawHands(createEngine(Sanma, "issue26-record", {}), [tenpaiA, notenA, notenB], 0);
recordEngine.finishGameRecord({ type: "exhaustive_draw", reason: "test draw" });
const recordedRound = recordEngine.gameRecord.rounds[recordEngine.gameRecord.rounds.length - 1];
assert(JSON.stringify(recordedRound.result.tenpaiPlayers) === JSON.stringify([0]), "record should retain tenpai players");
assert(JSON.stringify(recordedRound.result.notenPlayers) === JSON.stringify([1, 2]), "record should retain noten players");
assert(recordedRound.result.drawSettlement && recordedRound.result.drawSettlement.changes.length === 3, "record should retain draw settlement changes");
assert(recordedRound.events.some((event) => event.type === "score_settlement" && event.data.type === "exhaustive_draw"), "record should include exhaustive draw score_settlement event");

console.log("Issue 26 chi default and ryuukyoku tests passed.");
