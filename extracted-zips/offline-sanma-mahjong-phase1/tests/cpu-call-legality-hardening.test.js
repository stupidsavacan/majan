const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.error(`not ok - ${name}`);
    console.error(error && error.stack ? error.stack : error);
  }
}

function setLastDiscardFromRiver(engine, playerIndex, discardIndex) {
  const tile = engine.players[playerIndex].discards[discardIndex || 0];
  assert(tile, `player ${playerIndex} の河に対象牌がありません`);
  engine.lastDiscard = engine.createLastDiscard(playerIndex, tile);
  return tile;
}

function snapshotOpenCallState(engine) {
  return JSON.stringify({
    turnIndex: engine.turnIndex,
    phase: engine.phase,
    lastDiscard: engine.lastDiscard && {
      playerIndex: engine.lastDiscard.playerIndex,
      tileInstanceId: engine.lastDiscard.tile.instanceId,
    },
    callWindow: engine.callWindow,
    players: engine.players.map((player) => ({
      hand: player.hand.map((tile) => tile.instanceId),
      discards: player.discards.map((tile) => tile.instanceId),
      melds: player.melds.map((meld) => ({
        type: meld.type,
        open: meld.open,
        fromPlayerIndex: meld.fromPlayerIndex,
        tiles: (meld.tiles || []).map((tile) => tile.instanceId),
      })),
    })),
  });
}

function findByBaseId(player, baseId) {
  const tile = player.hand.find((candidate) => candidate.baseId === baseId);
  assert(tile, `${baseId} が手牌にありません`);
  return tile;
}

test("applyCpuCall rejects forged pon consume tiles that are not a current legal pon option", () => {
  const engine = createEngine(Sanma, "cpu-call-forged-pon-option", { allowChi: true });
  arrangeEngine(Sanma, engine, {
    turnIndex: 0,
    phase: "human-discard",
    players: [
      { hand: ["1s"], discards: ["white"] },
      { hand: ["white", "white", "1p", "2p"], lastDraw: false },
      { hand: ["1s", "2s", "3s"], lastDraw: false },
    ],
  });
  const calledTile = setLastDiscardFromRiver(engine, 0, 0);
  const before = snapshotOpenCallState(engine);
  const forgedCandidate = {
    playerIndex: 1,
    actionId: "pon",
    optionIndex: 0,
    option: {
      type: "pon",
      tile: calledTile,
      fromPlayerIndex: 0,
      consumeInstanceIds: [
        findByBaseId(engine.players[1], "1p").instanceId,
        findByBaseId(engine.players[1], "2p").instanceId,
      ],
    },
  };

  assert(engine.applyCpuCall(forgedCandidate, { emit: false, log: false }) === false, "forged pon option was accepted");
  assert(snapshotOpenCallState(engine) === before, "forged pon rejection mutated hand/river/meld/turn state");
});

test("applyCpuCall rejects forged chi consume tiles that are not a current legal sequence option", () => {
  const engine = createEngine(Sanma, "cpu-call-forged-chi-option", { allowChi: true });
  arrangeEngine(Sanma, engine, {
    turnIndex: 0,
    phase: "human-discard",
    players: [
      { hand: ["1s"], discards: ["3p"] },
      { hand: ["2p", "4p", "1s", "9s"], lastDraw: false },
      { hand: ["1p", "2p", "3p"], lastDraw: false },
    ],
  });
  const calledTile = setLastDiscardFromRiver(engine, 0, 0);
  const before = snapshotOpenCallState(engine);
  const forgedCandidate = {
    playerIndex: 1,
    actionId: "chi",
    optionIndex: 0,
    option: {
      type: "chi",
      tile: calledTile,
      fromPlayerIndex: 0,
      consumeInstanceIds: [
        findByBaseId(engine.players[1], "1s").instanceId,
        findByBaseId(engine.players[1], "9s").instanceId,
      ],
    },
  };

  assert(engine.applyCpuCall(forgedCandidate, { emit: false, log: false }) === false, "forged chi option was accepted");
  assert(snapshotOpenCallState(engine) === before, "forged chi rejection mutated hand/river/meld/turn state");
});

test("applyCpuCall still accepts a current legal pon option after revalidation", () => {
  const engine = createEngine(Sanma, "cpu-call-legal-pon-revalidation", { allowChi: true });
  arrangeEngine(Sanma, engine, {
    turnIndex: 0,
    phase: "human-discard",
    players: [
      { hand: ["1s"], discards: ["white"] },
      { hand: ["white", "white", "1p"], lastDraw: false },
      { hand: ["1s", "2s", "3s"], lastDraw: false },
    ],
  });
  const calledTile = setLastDiscardFromRiver(engine, 0, 0);
  const candidate = Sanma.CallResolver.collectCpuCallCandidates(engine, 0)
    .find((entry) => entry.playerIndex === 1 && entry.actionId === "pon");

  assert(candidate, "legal pon candidate was not collected");
  assert(engine.applyCpuCall(candidate, { emit: false, log: false }) === true, "legal pon option was rejected");
  assert(engine.players[1].melds.length === 1, "legal pon did not create one meld");
  assert(engine.players[1].melds[0].tiles.some((tile) => tile.instanceId === calledTile.instanceId), "legal pon meld does not contain the called tile");
  assert(!engine.players[0].discards.some((tile) => tile.instanceId === calledTile.instanceId), "legal pon did not remove the called tile from river");
});

if (failures.length > 0) {
  console.error(`\n${failures.length} CPU call legality hardening test(s) failed.`);
  process.exit(1);
}

console.log("CPU call legality hardening tests passed.");
