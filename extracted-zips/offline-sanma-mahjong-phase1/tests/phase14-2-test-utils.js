const { assert, loadModules } = require("./test-helpers");

function createStorage() {
  const data = {};
  return {
    data,
    storage: {
      getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
      setItem(key, value) { data[key] = String(value); },
      removeItem(key) { delete data[key]; },
      key(index) { return Object.keys(data)[index] || null; },
      get length() { return Object.keys(data).length; },
    },
  };
}

function createEngine(Sanma, seed, ruleConfig) {
  return new Sanma.GameEngine({
    ruleConfig: ruleConfig || {},
    seed,
    onChange() {},
  });
}

function arrangeEngine(Sanma, engine, setup) {
  const pool = engine.wall.tiles.concat(engine.wall.deadWall);
  engine.players.forEach((player) => {
    pool.push(...player.hand, ...player.discards, ...player.kitaTiles);
    player.melds.forEach((meld) => pool.push(...meld.tiles));
    player.hand = [];
    player.discards = [];
    player.melds = [];
    player.kitaTiles = [];
    player.lastDraw = null;
    player.sameTurnFuriten = false;
    player.riichiMissedWin = false;
  });

  function normalizeBaseId(code) {
    if (code && typeof code === "object" && code.baseId) return code.baseId;
    if (typeof code !== "string") return code;
    if (/^z[1-7]$/.test(code)) return code;
    const honorMap = { east: 1, south: 2, west: 3, north: 4, white: 5, green: 6, red: 7 };
    if (honorMap[code]) return Sanma.TileUtil.baseId("z", honorMap[code]);
    const suited = code.match(/^([1-9])([mps])$/);
    if (suited) return Sanma.TileUtil.baseId(suited[2], Number(suited[1]));
    return code;
  }

  function take(baseId) {
    const index = pool.findIndex((tile) => tile.baseId === normalizeBaseId(baseId));
    assert(index >= 0, `牌が不足しています: ${baseId}`);
    return pool.splice(index, 1)[0];
  }

  (setup.players || []).forEach((playerSetup, playerIndex) => {
    const player = engine.players[playerIndex];
    player.hand = (playerSetup.hand || []).map(take);
    player.discards = (playerSetup.discards || []).map(take);
    player.melds = (playerSetup.melds || []).map((meld) => ({
      type: meld.type,
      kanType: meld.kanType,
      open: meld.open !== false,
      fromPlayerIndex: meld.fromPlayerIndex,
      tiles: meld.tiles.map(take),
    }));
    player.sortHand();
    player.lastDraw = playerSetup.lastDraw === false ? null : (player.hand[player.hand.length - 1] || null);
    player.sameTurnFuriten = Boolean(playerSetup.sameTurnFuriten);
  });

  const rinshan = setup.rinshan ? take(setup.rinshan) : null;
  engine.wall.deadWall = pool.splice(-13, 13);
  if (rinshan) engine.wall.deadWall.push(rinshan);
  else if (pool.length) engine.wall.deadWall.push(pool.pop());
  engine.wall.tiles = pool;
  engine.wall.doraIndicators = engine.wall.deadWall.length ? [engine.wall.deadWall[0]] : [];
  engine.wall.rinshanDrawCount = 0;
  engine.turnIndex = setup.turnIndex;
  engine.phase = setup.phase || (engine.players[setup.turnIndex].isHuman ? "human-discard" : "cpu-running");
  engine.lastDiscard = null;
  engine.callWindow = null;
  engine.pendingWinContext = null;
  engine.pendingKanAttempt = null;
  engine.initialDealerDiscardPending = false;
  return engine;
}

module.exports = {
  arrangeEngine,
  assert,
  createEngine,
  createStorage,
  loadModules,
};
