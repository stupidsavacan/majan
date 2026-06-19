const fs = require("fs");
const path = require("path");
const { assert, createTileFactory, loadModules, projectRoot } = require("./test-helpers");

const Sanma = loadModules();
const makeTile = createTileFactory(Sanma.TileUtil);

function createEngine(seed) {
  return new Sanma.GameEngine({
    ruleConfig: { allowChi: true, dramaticLuckAssist: false, dramaticDrawAssist: false },
    seed,
    onChange() {},
  });
}

function setupOpenCall(engine, callerIndex, sourceIndex, actionId) {
  const calledTile = makeTile(actionId === "chi" ? "4p" : "5p");
  const consumedOne = makeTile(actionId === "chi" ? "2p" : "5p");
  const consumedTwo = makeTile(actionId === "chi" ? "3p" : "5p");
  const keptTile = makeTile("7s");
  const caller = engine.players[callerIndex];
  const source = engine.players[sourceIndex];
  caller.hand = [consumedOne, consumedTwo, keptTile];
  caller.melds = [];
  source.discards = [calledTile];
  engine.lastDiscard = { playerIndex: sourceIndex, tile: calledTile };
  engine.callWindow = {
    fromPlayerIndex: sourceIndex,
    actions: [{
      id: actionId,
      options: [{
        fromPlayerIndex: sourceIndex,
        tile: calledTile,
        consumeInstanceIds: [consumedOne.instanceId, consumedTwo.instanceId],
      }],
    }],
  };
  engine.players.forEach((player) => {
    player.ippatsuActive = true;
    if (player.riichi) player.riichi.ippatsu = true;
  });
  return { calledTile, consumedOne, consumedTwo, keptTile };
}

function currentEvents(engine) {
  const rounds = engine && engine.gameRecord && Array.isArray(engine.gameRecord.rounds)
    ? engine.gameRecord.rounds
    : [];
  const round = rounds[rounds.length - 1];
  return round ? round.events : [];
}

assert(typeof Sanma.CallFlow.applyOpenCall === "function", "CallFlow.applyOpenCall is missing");
assert(typeof Sanma.CallFlow.applyCpuCall === "function", "CallFlow.applyCpuCall is missing");
assert(typeof Sanma.GameEngine.prototype.applyOpenCall === "function", "GameEngine.applyOpenCall wrapper is missing");
assert(typeof Sanma.GameEngine.prototype.applyCpuCall === "function", "GameEngine.applyCpuCall wrapper is missing");

{
  const engine = createEngine("meld-state-cpu-pon");
  const { calledTile, consumedOne, consumedTwo, keptTile } = setupOpenCall(engine, 1, 2, "pon");
  engine.phase = "cpu-running";
  engine.turnIndex = 2;
  const applied = engine.applyOpenCall(1, "pon", engine.callWindow.actions[0].options[0], { emit: false, log: false });

  assert(applied === true, "CPU pon did not apply through applyOpenCall");
  assert(engine.players[1].hand.length === 1 && engine.players[1].hand[0].instanceId === keptTile.instanceId, "applyOpenCall removed the wrong caller hand tiles");
  assert(!engine.players[1].hand.some((tile) => tile.instanceId === consumedOne.instanceId || tile.instanceId === consumedTwo.instanceId), "consumed tiles remained in caller hand");
  assert(engine.players[2].discards.length === 0, "called tile remained in the source river");
  assert(engine.players[1].melds.length === 1, "open call did not create a meld");
  assert(engine.players[1].melds[0].type === "pon", "meld type is not pon");
  assert(engine.players[1].melds[0].open === true, "meld open flag is missing");
  assert(engine.players[1].melds[0].fromPlayerIndex === 2, "meld source player is wrong");
  assert(engine.players[1].melds[0].tiles.some((tile) => tile.instanceId === calledTile.instanceId), "called tile was not included in the meld");
  assert(engine.players.every((player) => !player.ippatsuActive && (!player.riichi || player.riichi.ippatsu === false)), "ippatsu was not cleared for all players");
  assert(engine.turnIndex === 1 && engine.phase === "cpu-running", "CPU caller did not become the active actor");
  assert(engine.lastDiscard === null && engine.callWindow === null, "call state was not cleared after open call");
  assert(currentEvents(engine).some((event) => event.type === "call" && event.data.playerIndex === 1 && event.data.action === "pon"), "call event was not recorded");
}

{
  const engine = createEngine("meld-state-atomic-failure");
  setupOpenCall(engine, 1, 2, "pon");
  const option = Object.assign({}, engine.callWindow.actions[0].options[0], {
    consumeInstanceIds: [engine.callWindow.actions[0].options[0].consumeInstanceIds[0], "missing-tile-id"],
  });
  const beforeHand = engine.players[1].hand.map((tile) => tile.instanceId).join(",");
  const beforeRiver = engine.players[2].discards.map((tile) => tile.instanceId).join(",");
  const beforeMelds = engine.players[1].melds.length;
  const beforeTurn = engine.turnIndex;
  const beforePhase = engine.phase;
  const beforeEventCount = currentEvents(engine).length;
  const applied = engine.applyOpenCall(1, "pon", option, { emit: false, log: false });

  assert(applied === false, "invalid open call was applied");
  assert(engine.players[1].hand.map((tile) => tile.instanceId).join(",") === beforeHand, "failed call changed caller hand");
  assert(engine.players[2].discards.map((tile) => tile.instanceId).join(",") === beforeRiver, "failed call changed source river");
  assert(engine.players[1].melds.length === beforeMelds, "failed call created a meld");
  assert(engine.turnIndex === beforeTurn && engine.phase === beforePhase, "failed call changed turn or phase");
  assert(currentEvents(engine).length === beforeEventCount, "failed call recorded an event");
  assert(engine.lastDiscard && engine.callWindow, "failed call cleared pending call state");
}

{
  const engine = createEngine("meld-state-human-chi");
  setupOpenCall(engine, 0, 2, "chi");
  engine.phase = "human-call";
  engine.turnIndex = 1;
  const applied = engine.claimHumanCall("chi", 0);

  assert(applied === true, "claimHumanCall did not delegate chi to applyOpenCall");
  assert(engine.players[0].melds.length === 1 && engine.players[0].melds[0].type === "chi", "human chi meld was not created");
  assert(engine.players[0].melds[0].open === true, "human chi meld is not open");
  assert(engine.phase === "caller-discard" && engine.turnIndex === 0, "human caller was not moved to caller-discard");
}

{
  let delegated = null;
  const fakeEngine = {
    callWindow: { isOpen: true },
    beginKanAttempt(playerIndex, option) {
      delegated = { playerIndex, option };
      return true;
    },
  };
  const option = { type: "minkan", tile: makeTile("9p") };
  const applied = Sanma.CallFlow.applyCpuCall.call(fakeEngine, { playerIndex: 1, actionId: "kan", option });

  assert(applied === true, "CPU minkan was not delegated");
  assert(delegated && delegated.playerIndex === 1 && delegated.option === option, "CPU minkan did not call beginKanAttempt with the candidate option");
  assert(fakeEngine.callWindow === null, "CPU minkan delegation did not clear callWindow");
}

const callFlowSource = fs.readFileSync(path.resolve(projectRoot, "src", "game", "CallFlow.js"), "utf8");
assert(!callFlowSource.includes("this.humanPlayer.melds.push"), "old human pon/chi direct meld mutation remains");
assert(!callFlowSource.includes("const consumed = []"), "old human pon/chi direct hand consumption remains");

console.log("Meld hand state tests passed.");
