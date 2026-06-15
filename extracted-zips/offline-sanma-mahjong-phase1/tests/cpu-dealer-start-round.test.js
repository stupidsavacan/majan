const { assert, loadModules } = require("./test-helpers");

const Sanma = loadModules();

function createEngine(seed, ruleOverrides) {
  return new Sanma.GameEngine({
    ruleConfig: Object.assign({
      northMode: "normal-tile",
      dramaticLuckAssist: false,
      dramaticDrawAssist: false,
    }, ruleOverrides || {}),
    seed,
    onChange() {},
  });
}

function currentEvents(engine) {
  return engine.gameRecord.rounds[engine.gameRecord.rounds.length - 1].events;
}

function setDealer(engine, dealerIndex) {
  const state = engine.matchManager.state;
  state.dealerIndex = dealerIndex;
  state.roundNumber = dealerIndex + 1;
  state.roundLabel = Sanma.RoundManager.roundLabel(state.roundWind, state.roundNumber);
  state.players.forEach((player, playerIndex) => {
    player.seatWind = Sanma.RoundManager.seatWindFor(playerIndex, dealerIndex);
  });
}

function disableCpuSpecialActions(engine) {
  engine.tryCpuTsumo = () => false;
  engine.tryCpuKita = () => false;
  engine.tryCpuKan = () => false;
  engine.tryCpuRiichi = () => false;
}

function ensureTileInHand(engine, playerIndex, baseId) {
  const player = engine.players[playerIndex];
  if (player.hand.some((tile) => tile.baseId === baseId)) return;
  const wallIndex = engine.wall.tiles.findIndex((tile) => tile.baseId === baseId);
  const handIndex = player.hand.findIndex((tile) =>
    !player.lastDraw || tile.instanceId !== player.lastDraw.instanceId
  );
  assert(wallIndex >= 0 && handIndex >= 0, `手牌へ${baseId}を配置できませんでした`);
  const wallTile = engine.wall.tiles[wallIndex];
  engine.wall.tiles[wallIndex] = player.hand[handIndex];
  player.hand[handIndex] = wallTile;
  player.sortHand();
}

function assertInitialHands(engine, dealerIndex, label) {
  engine.players.forEach((player, playerIndex) => {
    const isDealer = playerIndex === dealerIndex;
    assert(
      player.hand.length === (isDealer ? 14 : 13),
      `${label}: プレイヤー${playerIndex}の配牌枚数が不正です`
    );
    assert(
      Boolean(player.lastDraw) === isDealer,
      `${label}: 親以外にlastDrawが残っているか、親のlastDrawがありません`
    );
  });
  assert(Sanma.TileLedger.inspect(engine, engine.ruleConfig).ok, `${label}: TileLedgerが不正です`);
}

function assertLegalHumanInteraction(engine, label) {
  const legal = (
    (engine.phase === "human-discard" && engine.turnIndex === engine.humanPlayer.id)
    || (engine.phase === "human-call" && engine.callWindow && engine.callWindow.isOpen)
    || engine.phase === "win-ended"
    || engine.phase === "round-ended"
  );
  assert(legal, `${label}: 合法な人間操作・和了・局終了状態へ到達しませんでした`);
  assert(
    !(engine.phase === "human-discard" && engine.turnIndex !== engine.humanPlayer.id),
    `${label}: 人間打牌フェーズなのにCPU手番です`
  );
}

const originalCallWindowCreate = Sanma.CallWindow.create;
const originalEvaluateDraw = Sanma.AssistManager.evaluateDraw;

try {
  Sanma.CallWindow.create = () => null;

  const humanDealer = createEngine("cpu-dealer-human-start");
  disableCpuSpecialActions(humanDealer);
  assert(humanDealer.round.dealerIndex === humanDealer.humanPlayer.id, "初局の人間親が維持されていません");
  assert(humanDealer.turnIndex === humanDealer.humanPlayer.id, "人間親開始時の手番が不正です");
  assert(humanDealer.phase === "human-discard", "人間親開始時に打牌フェーズではありません");
  assertInitialHands(humanDealer, humanDealer.humanPlayer.id, "人間親");
  const humanDiscardId = humanDealer.humanPlayer.hand[0].instanceId;
  humanDealer.discardHumanTile(humanDiscardId);
  assert(
    currentEvents(humanDealer).some((event) =>
      event.type === "discard" && event.data.playerIndex === humanDealer.humanPlayer.id
    ),
    "人間親の有効な打牌が進行しませんでした"
  );
  assert(
    !humanDealer.logs.some((message) => message === "現在はあなたの打牌番ではありません。"),
    "人間親の有効な打牌が手番外として拒否されました"
  );
  assertLegalHumanInteraction(humanDealer, "人間親打牌後");
  assert(Sanma.TileLedger.inspect(humanDealer, humanDealer.ruleConfig).ok, "人間親打牌後のTileLedgerが不正です");

  const drawAssistCalls = [];
  Sanma.AssistManager.evaluateDraw = (input) => {
    drawAssistCalls.push(input.player.id);
    return originalEvaluateDraw(input);
  };

  const cpuDealer = createEngine("cpu-dealer-auto-start");
  disableCpuSpecialActions(cpuDealer);
  setDealer(cpuDealer, 1);
  cpuDealer.startRound();

  const cpuDealerEvents = currentEvents(cpuDealer);
  const dealIndex = cpuDealerEvents.findIndex((event) => event.type === "deal");
  const cpuDealerDiscardIndex = cpuDealerEvents.findIndex((event) =>
    event.type === "discard" && event.data.playerIndex === 1
  );
  const cpuDealerDrawIndex = cpuDealerEvents.findIndex((event) =>
    event.type === "draw" && event.data.playerIndex === 1
  );
  const firstCpuDealerEvent = cpuDealerEvents.slice(dealIndex + 1).find((event) =>
    event.data && event.data.playerIndex === 1
  );
  assert(cpuDealer.round.dealerIndex === 1, "CPU 1親への実親ローテーションが保持されていません");
  assert(firstCpuDealerEvent && firstCpuDealerEvent.type === "discard", "CPU 1親のdeal後最初の本人イベントが初打牌ではありません");
  assert(cpuDealerDiscardIndex > dealIndex, "CPU 1親が初打牌を行いませんでした");
  assert(
    cpuDealerDrawIndex < 0 || cpuDealerDrawIndex > cpuDealerDiscardIndex,
    "CPU 1親が初打牌前に通常ツモしました"
  );
  assert(cpuDealer.players[1].discards.length === 1, "CPU 1親の初打牌が河にありません");
  assert(cpuDealer.players[1].hand.length === 13, "CPU 1親が初打牌後も14枚を保持しています");
  assert(!drawAssistCalls.includes(1), "CPU 1親の初打牌前にdraw assistが評価されました");
  assertLegalHumanInteraction(cpuDealer, "CPU 1親自動開始");
  assert(Sanma.TileLedger.inspect(cpuDealer, cpuDealer.ruleConfig).ok, "CPU 1親自動開始後のTileLedgerが不正です");

  const cpuTwoDealer = createEngine("cpu-two-dealer-auto-start");
  disableCpuSpecialActions(cpuTwoDealer);
  setDealer(cpuTwoDealer, 2);
  cpuTwoDealer.startRound();
  assert(cpuTwoDealer.round.dealerIndex === 2, "CPU 2親への実親ローテーションが保持されていません");
  assert(cpuTwoDealer.players[2].discards.length === 1, "CPU 2親が自動で初打牌しませんでした");
  assert(cpuTwoDealer.players[2].hand.length === 13, "CPU 2親が初打牌後も14枚を保持しています");
  assertLegalHumanInteraction(cpuTwoDealer, "CPU 2親自動開始");
  assert(Sanma.TileLedger.inspect(cpuTwoDealer, cpuTwoDealer.ruleConfig).ok, "CPU 2親自動開始後のTileLedgerが不正です");

  const cpuDealerKita = createEngine("cpu-dealer-kita-start", { northMode: "kita-dora" });
  cpuDealerKita.runCpuUntilHumanTurn = () => true;
  setDealer(cpuDealerKita, 1);
  cpuDealerKita.startRound();
  ensureTileInHand(cpuDealerKita, 1, "z4");
  delete cpuDealerKita.runCpuUntilHumanTurn;
  cpuDealerKita.tryCpuTsumo = () => false;
  cpuDealerKita.tryCpuKan = () => false;
  cpuDealerKita.tryCpuRiichi = () => false;
  drawAssistCalls.length = 0;
  cpuDealerKita.runCpuUntilHumanTurn();
  const cpuDealerKitaEvents = currentEvents(cpuDealerKita);
  const kitaIndex = cpuDealerKitaEvents.findIndex((event) =>
    event.type === "kita" && event.data.playerIndex === 1
  );
  const kitaDealerDiscardIndex = cpuDealerKitaEvents.findIndex((event) =>
    event.type === "discard" && event.data.playerIndex === 1
  );
  assert(kitaIndex >= 0 && kitaIndex < kitaDealerDiscardIndex, "CPU親の初打牌前の合法な北抜きが維持されていません");
  assert(!drawAssistCalls.includes(1), "CPU親の初打牌前の北抜き補充牌でdraw assistが評価されました");
  assert(Sanma.TileLedger.inspect(cpuDealerKita, cpuDealerKita.ruleConfig).ok, "CPU親北抜き後のTileLedgerが不正です");

  const humanCleanup = createEngine("cpu-dealer-last-draw-human");
  assertInitialHands(humanCleanup, 0, "lastDraw cleanup 人間親");

  const cpuOneCleanup = createEngine("cpu-dealer-last-draw-cpu1");
  cpuOneCleanup.runCpuUntilHumanTurn = () => true;
  setDealer(cpuOneCleanup, 1);
  cpuOneCleanup.startRound();
  assertInitialHands(cpuOneCleanup, 1, "lastDraw cleanup CPU 1親");

  const cpuTwoCleanup = createEngine("cpu-dealer-last-draw-cpu2");
  cpuTwoCleanup.runCpuUntilHumanTurn = () => true;
  setDealer(cpuTwoCleanup, 2);
  cpuTwoCleanup.startRound();
  assertInitialHands(cpuTwoCleanup, 2, "lastDraw cleanup CPU 2親");

  const laterCpuTurn = createEngine("cpu-dealer-normal-later-turn");
  disableCpuSpecialActions(laterCpuTurn);
  laterCpuTurn.turnIndex = 1;
  laterCpuTurn.phase = "cpu-running";
  laterCpuTurn.players[1].lastDraw = null;
  const laterWallCount = laterCpuTurn.wall.remainingCount();
  const laterEventCount = currentEvents(laterCpuTurn).length;
  Sanma.CallWindow.create = (state) => {
    if (!state.lastDiscard || state.lastDiscard.playerIndex !== 1) return null;
    return {
      isOpen: true,
      fromPlayerIndex: 1,
      actions: [{ id: "skip", label: "スキップ", enabled: true }],
    };
  };
  laterCpuTurn.runCpuUntilHumanTurn();
  const laterEvents = currentEvents(laterCpuTurn).slice(laterEventCount);
  assert(
    laterEvents.filter((event) => event.type === "draw" && event.data.playerIndex === 1).length === 1,
    "通常のCPU非親手番でツモイベントがちょうど1回記録されませんでした"
  );
  assert(
    laterEvents.some((event) => event.type === "discard" && event.data.playerIndex === 1),
    "通常のCPU非親手番で打牌が行われませんでした"
  );
  assert(laterCpuTurn.wall.remainingCount() === laterWallCount - 1, "通常のCPU非親手番でツモ枚数が1枚ではありません");
  assert(laterCpuTurn.players[1].hand.length === 13, "通常のCPU非親手番が打牌後13枚ではありません");
  assert(laterCpuTurn.phase === "human-call" && laterCpuTurn.callWindow, "CPU非親打牌後の人間操作窓が開きませんでした");
  assert(Sanma.TileLedger.inspect(laterCpuTurn, laterCpuTurn.ruleConfig).ok, "通常のCPU非親手番後のTileLedgerが不正です");
} finally {
  Sanma.CallWindow.create = originalCallWindowCreate;
  Sanma.AssistManager.evaluateDraw = originalEvaluateDraw;
}

console.log("CPU dealer start-round regression tests passed.");
