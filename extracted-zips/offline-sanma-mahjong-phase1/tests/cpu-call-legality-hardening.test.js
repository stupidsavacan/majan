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

function snapshotEngine(engine) {
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
        tiles: meld.tiles.map((tile) => tile.instanceId),
      })),
      lastDraw: player.lastDraw && player.lastDraw.instanceId,
    })),
  });
}

function findHandTileIds(engine, playerIndex, predicate) {
  return engine.players[playerIndex].hand
    .filter(predicate)
    .map((tile) => tile.instanceId);
}

function arrangePon(seed) {
  const engine = createEngine(Sanma, seed, { allowChi: true });
  arrangeEngine(Sanma, engine, {
    turnIndex: 0,
    phase: "human-discard",
    players: [
      { hand: ["1p"], discards: ["white"] },
      { hand: ["white", "white", "1p", "2p"], lastDraw: false },
      { hand: ["1s", "2s", "3s"], lastDraw: false },
    ],
  });
  setLastDiscardFromRiver(engine, 0, 0);
  return engine;
}

function arrangeIllegalChi(seed) {
  const engine = createEngine(Sanma, seed, { allowChi: true });
  arrangeEngine(Sanma, engine, {
    turnIndex: 0,
    phase: "human-discard",
    players: [
      { hand: ["1p"], discards: ["3p"] },
      { hand: ["1p", "9p", "2s", "4s"], lastDraw: false },
      { hand: ["1s", "2s", "3s"], lastDraw: false },
    ],
  });
  setLastDiscardFromRiver(engine, 0, 0);
  return engine;
}

test("forged applyCpuCall pon consuming unrelated tiles is rejected without state mutation", () => {
  const engine = arrangePon("cpu-call-forged-pon");
  const calledTile = engine.lastDiscard.tile;
  const unrelatedConsumeIds = findHandTileIds(engine, 1, (tile) => tile.baseId !== calledTile.baseId).slice(0, 2);
  assert(unrelatedConsumeIds.length === 2, "偽装ポン用の無関係な消費牌が足りません");
  const before = snapshotEngine(engine);

  const result = engine.applyCpuCall({
    playerIndex: 1,
    actionId: "pon",
    option: {
      type: "pon",
      label: "forged pon",
      tile: calledTile,
      fromPlayerIndex: 0,
      consumeInstanceIds: unrelatedConsumeIds,
    },
  });

  assert(result === false, "偽装ポンが成功扱いになりました");
  assert(snapshotEngine(engine) === before, "偽装ポン失敗時にゲーム状態が変化しました");
});

test("forged applyCpuCall chi consuming non-sequence tiles is rejected without state mutation", () => {
  const engine = arrangeIllegalChi("cpu-call-forged-chi");
  const calledTile = engine.lastDiscard.tile;
  const unrelatedConsumeIds = engine.players[1].hand.slice(0, 2).map((tile) => tile.instanceId);
  const before = snapshotEngine(engine);

  const result = engine.applyCpuCall({
    playerIndex: 1,
    actionId: "chi",
    option: {
      type: "chi",
      label: "forged chi",
      tile: calledTile,
      fromPlayerIndex: 0,
      consumeInstanceIds: unrelatedConsumeIds,
    },
  });

  assert(result === false, "偽装チーが成功扱いになりました");
  assert(snapshotEngine(engine) === before, "偽装チー失敗時にゲーム状態が変化しました");
});

test("a genuine current legal pon option still succeeds after revalidation", () => {
  const engine = arrangePon("cpu-call-legal-pon-after-hardening");
  const candidates = Sanma.CallResolver.collectCpuCallCandidates(engine, 0);
  const candidate = candidates.find((entry) => entry.playerIndex === 1 && entry.actionId === "pon");
  assert(candidate, "合法ポン候補を検出できません");
  const calledTile = engine.lastDiscard.tile;

  const result = engine.applyCpuCall(candidate);

  assert(result === true, "合法ポンが拒否されました");
  assert(engine.players[1].melds.length === 1, "合法ポン後に副露が作られていません");
  assert(engine.players[1].melds[0].type === "pon", "合法ポン後の副露種別が不正です");
  assert(engine.players[1].melds[0].tiles.some((tile) => tile.instanceId === calledTile.instanceId), "副露に鳴いた捨て牌が含まれていません");
  assert(!engine.players[0].discards.some((tile) => tile.instanceId === calledTile.instanceId), "鳴かれた牌が河に残っています");
  assert(engine.lastDiscard === null, "合法ポン後にlastDiscardが残っています");
});

if (failures.length > 0) {
  console.error(`\n${failures.length} CPU call legality hardening test(s) failed.`);
  process.exit(1);
}

console.log("CPU call legality hardening tests passed.");
