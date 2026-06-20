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

function findTile(player, baseId) {
  const tile = player.hand.find((candidate) => candidate.baseId === baseId);
  assert(tile, `${player.name || "player"} の手牌に ${baseId} がありません`);
  return tile;
}

function callEvents(engine) {
  return engine.gameRecord.rounds[engine.gameRecord.rounds.length - 1].events
    .filter((event) => event && event.type === "call");
}

function tile(baseId, instanceId) {
  return { baseId, label: baseId, instanceId };
}

function playersForRecord() {
  return [
    { id: 0, name: "あなた", seatWind: "east", isHuman: true, points: 35000 },
    { id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: 35000 },
    { id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: 35000 },
  ];
}

test("forged CPU pon option is rejected before hand/river/meld mutation", () => {
  const engine = createEngine(Sanma, "meld-state-forged-pon", { allowChi: true });
  arrangeEngine(Sanma, engine, {
    turnIndex: 0,
    phase: "human-discard",
    players: [
      { hand: ["1p"], discards: ["white"] },
      { hand: ["white", "white", "2p"], lastDraw: false },
      { hand: ["1s", "2s", "3s"], lastDraw: false },
    ],
  });
  const calledTile = setLastDiscardFromRiver(engine, 0, 0);
  const caller = engine.players[1];
  const white = findTile(caller, "z5");
  const twoPin = findTile(caller, "2p");
  const handIdsBefore = caller.hand.map((candidate) => candidate.instanceId).join(",");

  const applied = engine.applyCpuCall({
    playerIndex: 1,
    actionId: "pon",
    option: {
      type: "pon",
      tile: calledTile,
      fromPlayerIndex: 0,
      consumeInstanceIds: [white.instanceId, twoPin.instanceId],
    },
  }, { emit: false, log: false });

  assert(applied === false, "forged pon option was accepted");
  assert(caller.melds.length === 0, "forged pon created a meld");
  assert(caller.hand.map((candidate) => candidate.instanceId).join(",") === handIdsBefore, "forged pon mutated caller hand");
  assert(engine.players[0].discards.some((discard) => discard.instanceId === calledTile.instanceId), "forged pon removed source discard");
  assert(engine.lastDiscard && engine.lastDiscard.tile.instanceId === calledTile.instanceId, "forged pon corrupted lastDiscard");
  assert(callEvents(engine).length === 0, "forged pon recorded a call event");
});

test("forged CPU chi option is rejected before hand/river/meld mutation", () => {
  const engine = createEngine(Sanma, "meld-state-forged-chi", { allowChi: true });
  arrangeEngine(Sanma, engine, {
    turnIndex: 0,
    phase: "human-discard",
    players: [
      { hand: ["1p"], discards: ["3p"] },
      { hand: ["2p", "4p", "9s"], lastDraw: false },
      { hand: ["1s", "2s", "3s"], lastDraw: false },
    ],
  });
  const calledTile = setLastDiscardFromRiver(engine, 0, 0);
  const caller = engine.players[1];
  const twoPin = findTile(caller, "2p");
  const nineSou = findTile(caller, "9s");
  const handIdsBefore = caller.hand.map((candidate) => candidate.instanceId).join(",");

  const applied = engine.applyCpuCall({
    playerIndex: 1,
    actionId: "chi",
    option: {
      type: "chi",
      tile: calledTile,
      fromPlayerIndex: 0,
      consumeInstanceIds: [twoPin.instanceId, nineSou.instanceId],
    },
  }, { emit: false, log: false });

  assert(applied === false, "forged chi option was accepted");
  assert(caller.melds.length === 0, "forged chi created a meld");
  assert(caller.hand.map((candidate) => candidate.instanceId).join(",") === handIdsBefore, "forged chi mutated caller hand");
  assert(engine.players[0].discards.some((discard) => discard.instanceId === calledTile.instanceId), "forged chi removed source discard");
  assert(engine.lastDiscard && engine.lastDiscard.tile.instanceId === calledTile.instanceId, "forged chi corrupted lastDiscard");
  assert(callEvents(engine).length === 0, "forged chi recorded a call event");
});

test("RecoveryManager preserves pending CPU call by delegating to normal skip flow", () => {
  const engine = createEngine(Sanma, "meld-state-recovery-pending-call", { allowChi: true });
  arrangeEngine(Sanma, engine, {
    turnIndex: 1,
    phase: "cpu-running",
    players: [
      { hand: ["3p", "3p", "1s"], lastDraw: false },
      { hand: ["2s"], discards: ["3p"], lastDraw: false },
      { hand: ["2p", "4p", "9p"], lastDraw: false },
    ],
  });
  const discarded = setLastDiscardFromRiver(engine, 1, 0);
  engine.runCpuUntilHumanTurn = () => true;
  engine.resolveNonWinningCallsAfterDiscard(1);

  assert(engine.phase === "human-call" && engine.callWindow, "human call window was not opened");
  assert(engine.callWindow.pendingCpuCallCandidate, "pending CPU call candidate was not retained");
  const result = Sanma.RecoveryManager.closeStuckActionWindow(engine);

  assert(result && result.ok, "recovery skip did not succeed");
  assert(engine.callWindow === null, "recovery skip left callWindow open");
  assert(engine.lastDiscard === null, "recovery skip left lastDiscard after applying CPU call");
  assert(engine.players[2].melds.length === 1 && engine.players[2].melds[0].type === "chi", "recovery skip dropped pending CPU chi");
  assert(!engine.players[1].discards.some((tile) => tile.instanceId === discarded.instanceId), "recovery skip left called tile in source river");
  assert(engine.turnIndex === 2, "recovery skip did not move turn to CPU caller");
});

test("ReplayViewer rebuilds minkan with canonical live kan meld shape", () => {
  const called = tile("z5", "called-white");
  const handTiles = [tile("z5", "w1"), tile("z5", "w2"), tile("z5", "w3")];
  const record = Sanma.GameRecord.create({ players: playersForRecord() });
  Sanma.GameRecord.addEvent(record, "deal", {
    hands: [
      { playerIndex: 0, tiles: [called] },
      { playerIndex: 1, tiles: handTiles },
      { playerIndex: 2, tiles: [] },
    ],
  });
  Sanma.GameRecord.addEvent(record, "discard", { playerIndex: 0, playerName: "あなた", tile: called });
  Sanma.GameRecord.addEvent(record, "kan", {
    playerIndex: 1,
    playerName: "CPU 1",
    kanType: "minkan",
    fromPlayerIndex: 0,
    calledTile: called,
    consumedTileInstanceIds: handTiles.map((item) => item.instanceId),
    tiles: handTiles.concat(called),
  });

  const replay = Sanma.ReplayViewer.create(record);
  Sanma.ReplayViewer.jumpToEnd(replay);
  const meld = replay.view.melds[1][0];
  assert(meld && meld.type === "minkan", "minkan replay meld type did not preserve legacy kan type");
  assert(meld.kanType === "minkan", "minkan replay meld missing kanType");
  assert(meld.open === true, "minkan replay meld should be open");
  assert(meld.fromPlayerIndex === 0, "minkan replay meld missing source player");
  assert(meld.tiles.length === 4, "minkan replay meld should contain four tiles");
  assert(replay.view.discards[0].length === 0, "minkan replay left called tile in source river");
  assert(!replay.partial, `minkan replay produced diagnostics: ${replay.diagnostics.join(" / ")}`);
});

test("ReplayViewer rebuilds ankan with canonical closed kan meld shape", () => {
  const kanTiles = [tile("z5", "w1"), tile("z5", "w2"), tile("z5", "w3"), tile("z5", "w4")];
  const record = Sanma.GameRecord.create({ players: playersForRecord() });
  Sanma.GameRecord.addEvent(record, "deal", {
    hands: [
      { playerIndex: 0, tiles: [] },
      { playerIndex: 1, tiles: kanTiles },
      { playerIndex: 2, tiles: [] },
    ],
  });
  Sanma.GameRecord.addEvent(record, "kan", {
    playerIndex: 1,
    playerName: "CPU 1",
    kanType: "ankan",
    consumedTileInstanceIds: kanTiles.map((item) => item.instanceId),
    tiles: kanTiles,
  });

  const replay = Sanma.ReplayViewer.create(record);
  Sanma.ReplayViewer.jumpToEnd(replay);
  const meld = replay.view.melds[1][0];
  assert(meld && meld.type === "ankan", "ankan replay meld type did not preserve legacy kan type");
  assert(meld.kanType === "ankan", "ankan replay meld missing kanType");
  assert(meld.open === false, "ankan replay meld should be closed");
  assert(meld.tiles.length === 4, "ankan replay meld should contain four tiles");
  assert(!replay.partial, `ankan replay produced diagnostics: ${replay.diagnostics.join(" / ")}`);
});

test("ReplayViewer upgrades kakan to canonical live kan meld shape", () => {
  const called = tile("z5", "called-white");
  const ponTiles = [tile("z5", "w1"), tile("z5", "w2")];
  const added = tile("z5", "w3");
  const record = Sanma.GameRecord.create({ players: playersForRecord() });
  Sanma.GameRecord.addEvent(record, "deal", {
    hands: [
      { playerIndex: 0, tiles: [called] },
      { playerIndex: 1, tiles: ponTiles.concat(added) },
      { playerIndex: 2, tiles: [] },
    ],
  });
  Sanma.GameRecord.addEvent(record, "discard", { playerIndex: 0, playerName: "あなた", tile: called });
  Sanma.GameRecord.addEvent(record, "call", {
    playerIndex: 1,
    playerName: "CPU 1",
    action: "pon",
    fromPlayerIndex: 0,
    calledTile: called,
    tiles: ponTiles.concat(called),
  });
  Sanma.GameRecord.addEvent(record, "kan", {
    playerIndex: 1,
    playerName: "CPU 1",
    kanType: "kakan",
    meldIndex: 0,
    fromPlayerIndex: 0,
    consumedTileInstanceIds: [added.instanceId],
    tiles: ponTiles.concat(called, added),
  });

  const replay = Sanma.ReplayViewer.create(record);
  Sanma.ReplayViewer.jumpToEnd(replay);
  const meld = replay.view.melds[1][0];
  assert(meld && meld.type === "kakan", "kakan replay meld type did not preserve legacy kan type");
  assert(meld.kanType === "kakan", "kakan replay meld missing kanType");
  assert(meld.open === true, "kakan replay meld should be open");
  assert(meld.fromPlayerIndex === 0, "kakan replay meld did not preserve source player");
  assert(meld.tiles.length === 4, "kakan replay meld should contain four tiles");
  assert(!replay.partial, `kakan replay produced diagnostics: ${replay.diagnostics.join(" / ")}`);
});

if (failures.length > 0) {
  console.error(`\n${failures.length} CPU call meld-state regression test(s) failed.`);
  process.exit(1);
}

console.log("CPU call meld-state regression tests passed.");
