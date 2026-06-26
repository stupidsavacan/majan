const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const waitOne = ["3p", "4p", "2s", "3s", "4s", "6p", "7p", "8p", "6s", "7s", "8s", "2p", "2p"];
const waitTwo = ["3p", "4p", "2s", "3s", "4s", "6s", "7s", "8s", "6p", "7p", "8p", "4s", "4s"];
const filler = ["1p", "2p", "3p", "6p", "7p", "8p", "1s", "2s", "3s", "9s"];

function beginHumanCpuKakanChankan() {
  const engine = createEngine(Sanma, "chankan-double-ron", {
    dramaticLuckAssist: false,
    doubleRonPolicy: { allowed: true },
  });
  arrangeEngine(Sanma, engine, {
    turnIndex: 2,
    players: [
      { hand: waitOne, lastDraw: false },
      { hand: waitTwo, lastDraw: false },
      {
        hand: ["5p"].concat(filler),
        melds: [{ type: "pon", open: true, fromPlayerIndex: 0, tiles: ["5p", "5p", "5p"] }],
      },
    ],
  });
  const option = Sanma.KanRules.getAvailableKanActions({ state: engine, playerIndex: 2 })
    .find((candidate) => candidate.type === "kakan");
  assert(option, "kakan option is required");
  assert(engine.beginKanAttempt(2, option), "kakan chankan attempt should open");
  return engine;
}

const engine = beginHumanCpuKakanChankan();
assert(engine.phase === "human-call", "human chankan candidate should require explicit choice");
assert(engine.callWindow && engine.callWindow.kind === "chankan", "chankan call window should remain open");
assert(Array.isArray(engine.callWindow.ronCandidates), "chankan window should retain ron candidates");
assert(engine.callWindow.ronCandidates.length === 2, "human + CPU chankan candidates should both be retained");
assert(engine.claimHumanRon(), "human chankan acceptance should resolve");
assert(engine.winResult && engine.winResult.isMultiRon, "double-ron chankan should produce a multi-ron result");
assert(engine.winResult.winnerIndexes.join(",") === "0,1", "chankan double ron should preserve head-bump order");
assert(engine.winResult.isChankan, "multi-ron win result should keep chankan metadata");
assert(engine.winResult.winners.every((winner) => winner.isChankan && winner.kanType === "kakan"), "each winner should keep chankan metadata");
assert(engine.players[2].melds[0].tiles.length === 3, "accepted kakan chankan must not finalize the kakan meld");
assert(Sanma.TileLedger.inspect(engine, engine.ruleConfig).ok, "TileLedger should pass after chankan double ron");

const events = engine.gameRecord.rounds[engine.gameRecord.rounds.length - 1].events;
assert(events.filter((event) => event.type === "win" && event.data.isChankan).length === 2, "record should contain a chankan win event per winner");
assert(events.some((event) => event.type === "score_settlement" && event.data.multiRon), "record should mark chankan multi-ron settlement");
assert(events.some((event) => event.type === "chankan" && event.data.multiRon), "record should mark chankan accept as multi-ron");
assert(engine.gameRecord.rounds[engine.gameRecord.rounds.length - 1].result.winners.length === 2, "completed record result should retain both chankan winners");
assert(engine.gameRecord.rounds[engine.gameRecord.rounds.length - 1].result.winners.every((winner) => winner.isChankan), "completed record winners should retain chankan metadata");

console.log("Chankan double ron resolution regression tests passed.");
