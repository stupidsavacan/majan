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

function requireCallResolver() {
  assert(Sanma.CallResolver, "CPU鳴き候補を集約する Sanma.CallResolver が読み込まれていません");
  assert(
    typeof Sanma.CallResolver.getLegalCallActions === "function",
    "Sanma.CallResolver.getLegalCallActions が必要です"
  );
  assert(
    typeof Sanma.CallResolver.collectCpuCallCandidates === "function",
    "Sanma.CallResolver.collectCpuCallCandidates が必要です"
  );
  assert(
    typeof Sanma.CallResolver.selectCpuCallCandidate === "function",
    "Sanma.CallResolver.selectCpuCallCandidate が必要です"
  );
}

function requireCpuCallApi(engine) {
  assert(typeof Sanma.CpuStrategy.chooseCall === "function", "Sanma.CpuStrategy.chooseCall が必要です");
  assert(typeof engine.applyCpuCall === "function", "GameEngine.applyCpuCall が必要です");
  assert(typeof engine.applyOpenCall === "function", "GameEngine.applyOpenCall が必要です");
  assert(
    typeof engine.resolveNonWinningCallsAfterDiscard === "function",
    "GameEngine.resolveNonWinningCallsAfterDiscard が必要です"
  );
}

function setLastDiscardFromRiver(engine, playerIndex, discardIndex) {
  const tile = engine.players[playerIndex].discards[discardIndex || 0];
  assert(tile, `player ${playerIndex} の河に対象牌がありません`);
  engine.lastDiscard = engine.createLastDiscard(playerIndex, tile);
  return tile;
}

function callEvents(engine) {
  return engine.gameRecord.rounds[engine.gameRecord.rounds.length - 1].events
    .filter((event) => event && event.type === "call");
}

function findCandidate(engine, discarderIndex, playerIndex, actionId) {
  requireCallResolver();
  const candidates = Sanma.CallResolver.collectCpuCallCandidates(engine, discarderIndex);
  return candidates.find((candidate) => (
    candidate.playerIndex === playerIndex
    && candidate.actionId === actionId
  ));
}

function assertNoCalledTileInRiver(engine, sourcePlayerIndex, calledTile) {
  assert(
    !engine.players[sourcePlayerIndex].discards.some((tile) => tile.instanceId === calledTile.instanceId),
    "鳴かれた牌が打牌者の河に残っています"
  );
}

function arrangePonFromHuman(seed) {
  const engine = createEngine(Sanma, seed, { allowChi: true });
  arrangeEngine(Sanma, engine, {
    turnIndex: 0,
    phase: "human-discard",
    players: [
      { hand: ["1p"], discards: ["white"] },
      { hand: ["white", "white", "2p"], lastDraw: false },
      { hand: ["1s", "2s", "3s"], lastDraw: false },
    ],
  });
  setLastDiscardFromRiver(engine, 0, 0);
  return engine;
}

function arrangeChiFromPrevious(seed) {
  const engine = createEngine(Sanma, seed, { allowChi: true });
  arrangeEngine(Sanma, engine, {
    turnIndex: 0,
    phase: "human-discard",
    players: [
      { hand: ["1p"], discards: ["3p"] },
      { hand: ["2p", "4p", "9s"], lastDraw: false },
      { hand: ["2s", "4s", "9p"], lastDraw: false },
    ],
  });
  setLastDiscardFromRiver(engine, 0, 0);
  return engine;
}

test("CPU鳴き用の契約APIが存在する", () => {
  const engine = arrangePonFromHuman("cpu-call-contract-api");
  requireCallResolver();
  requireCpuCallApi(engine);
});

test("CPUは自分の打牌を鳴き候補にしない", () => {
  const engine = createEngine(Sanma, "cpu-call-own-discard", { allowChi: true });
  arrangeEngine(Sanma, engine, {
    turnIndex: 1,
    phase: "cpu-running",
    players: [
      { hand: ["1p"], lastDraw: false },
      { hand: ["white", "white", "2p"], discards: ["white"], lastDraw: false },
      { hand: ["1s", "2s", "3s"], lastDraw: false },
    ],
  });
  setLastDiscardFromRiver(engine, 1, 0);
  requireCallResolver();
  const candidates = Sanma.CallResolver.collectCpuCallCandidates(engine, 1);
  assert(!candidates.some((candidate) => candidate.playerIndex === 1), "CPUが自己打牌に対して鳴き候補化されました");
});

test("CPUポン候補は合法な2枚消費だけを返す", () => {
  const engine = arrangePonFromHuman("cpu-call-pon-candidate");
  const candidate = findCandidate(engine, 0, 1, "pon");
  assert(candidate, "人間の白打牌に対するCPUポン候補を検出できません");
  assert(candidate.option && candidate.option.tile.instanceId === engine.lastDiscard.tile.instanceId, "ポン候補の対象牌が直近打牌ではありません");
  assert(candidate.option.fromPlayerIndex === 0, "ポン候補の打牌者が不正です");
  assert(candidate.option.consumeInstanceIds.length === 2, "ポン候補の消費枚数が2枚ではありません");
  assert(
    candidate.option.consumeInstanceIds.every((instanceId) => engine.players[1].hand.some((tile) => tile.instanceId === instanceId)),
    "ポン候補がCPU手牌に存在しない牌を消費しようとしています"
  );
});

test("CPUは2枚揃っていない牌をポンできない", () => {
  const engine = createEngine(Sanma, "cpu-call-illegal-pon", { allowChi: true });
  arrangeEngine(Sanma, engine, {
    turnIndex: 0,
    phase: "human-discard",
    players: [
      { hand: ["1p"], discards: ["white"] },
      { hand: ["white", "2p", "3p"], lastDraw: false },
      { hand: ["1s", "2s", "3s"], lastDraw: false },
    ],
  });
  setLastDiscardFromRiver(engine, 0, 0);
  requireCallResolver();
  const candidates = Sanma.CallResolver.collectCpuCallCandidates(engine, 0);
  assert(!candidates.some((candidate) => candidate.playerIndex === 1 && candidate.actionId === "pon"), "1枚しかない牌をCPUポン候補にしました");
});

test("CPUチーは上家の捨て牌だけを候補にする", () => {
  const previous = arrangeChiFromPrevious("cpu-call-chi-previous");
  const previousCandidate = findCandidate(previous, 0, 1, "chi");
  assert(previousCandidate, "上家の3pに対するCPUチー候補を検出できません");
  assert(previousCandidate.option.consumeInstanceIds.length === 2, "チー候補の消費枚数が2枚ではありません");

  const nonPrevious = createEngine(Sanma, "cpu-call-chi-non-previous", { allowChi: true });
  arrangeEngine(Sanma, nonPrevious, {
    turnIndex: 1,
    phase: "cpu-running",
    players: [
      { hand: ["2p", "4p", "9s"], lastDraw: false },
      { hand: ["1s"], discards: ["3p"], lastDraw: false },
      { hand: ["2s", "4s", "9p"], lastDraw: false },
    ],
  });
  setLastDiscardFromRiver(nonPrevious, 1, 0);
  requireCallResolver();
  const nonPreviousCandidates = Sanma.CallResolver.collectCpuCallCandidates(nonPrevious, 1);
  assert(
    !nonPreviousCandidates.some((candidate) => candidate.playerIndex === 0 && candidate.actionId === "chi"),
    "上家ではないCPUにチー候補を出しました"
  );
});

test("applyCpuCallのポンは手牌・河・副露・手番・記録を一貫して更新する", () => {
  const engine = arrangePonFromHuman("cpu-call-apply-pon");
  requireCpuCallApi(engine);
  const candidate = findCandidate(engine, 0, 1, "pon");
  const calledTile = engine.lastDiscard.tile;
  const consumedIds = candidate.option.consumeInstanceIds.slice();
  const handSizeBefore = engine.players[1].hand.length;
  engine.applyCpuCall(candidate);

  assert(engine.players[1].hand.length === handSizeBefore - 2, "CPUポン後の手牌枚数が2枚減っていません");
  assert(!consumedIds.some((instanceId) => engine.players[1].hand.some((tile) => tile.instanceId === instanceId)), "消費牌がCPU手牌に残っています");
  assert(engine.players[1].melds.length === 1, "CPUポン後に副露が1つ作られていません");
  const meld = engine.players[1].melds[0];
  assert(meld.type === "pon" && meld.open === true, "CPUポン副露が open な pon として作られていません");
  assert(meld.fromPlayerIndex === 0, "CPUポン副露の鳴き元が不正です");
  assert(meld.tiles.length === 3, "CPUポン副露の牌枚数が3枚ではありません");
  assert(meld.tiles.some((tile) => tile.instanceId === calledTile.instanceId), "副露に打牌者の捨て牌が含まれていません");
  assertNoCalledTileInRiver(engine, 0, calledTile);
  assert(engine.turnIndex === 1, "CPUポン後に鳴いたCPUが現在の打牌者になっていません");
  assert(engine.phase === "cpu-running", "CPU pon should leave the CPU runner active");
  assert(engine.lastDiscard === null, "CPUポン後に lastDiscard が残っています");
  assert(engine.callWindow === null, "CPUポン後に callWindow が残っています");
  assert(!Sanma.RiichiRules.isMenzen(engine.players[1]), "CPUポン後も門前扱いになっています");

  const events = callEvents(engine).filter((event) => event.data.playerIndex === 1);
  assert(events.length === 1, "CPUポンの call イベントが1件ではありません");
  const data = events[0].data;
  assert(data.playerName && data.action === "pon", "CPUポンの call イベントに playerName/action がありません");
  assert(data.fromPlayerIndex === 0, "CPUポンの call イベントの fromPlayerIndex が不正です");
  assert(Array.isArray(data.tiles) && data.tiles.length === 3, "CPUポンの call イベントに tiles が3枚記録されていません");
  assert(data.calledTile && data.calledTile.instanceId === calledTile.instanceId, "CPUポンの call イベントに calledTile が正しく記録されていません");
});

test("applyCpuCallのチーは正しい順子副露を作る", () => {
  const engine = arrangeChiFromPrevious("cpu-call-apply-chi");
  requireCpuCallApi(engine);
  const candidate = findCandidate(engine, 0, 1, "chi");
  const calledTile = engine.lastDiscard.tile;
  engine.applyCpuCall(candidate);
  const meld = engine.players[1].melds[0];
  assert(meld && meld.type === "chi" && meld.open === true, "CPUチー副露が open な chi として作られていません");
  assert(meld.tiles.map((tile) => tile.baseId).sort().join(",") === "2p,3p,4p", "CPUチー副露の構成牌が2p/3p/4pではありません");
  assertNoCalledTileInRiver(engine, 0, calledTile);
  assert(engine.turnIndex === 1 && engine.phase === "cpu-running", "CPU chi should leave the CPU runner active");
});

test("人間の鳴き窓がある場合はCPU候補をpendingにし、スキップ後にCPUが鳴く", () => {
  const engine = createEngine(Sanma, "cpu-call-human-window-fallback", { allowChi: true });
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
  requireCpuCallApi(engine);
  engine.resolveNonWinningCallsAfterDiscard(1);
  assert(engine.phase === "human-call" && engine.callWindow, "人間に鳴き選択肢があるのに人間鳴き窓が開いていません");
  assert(engine.callWindow.actions.some((action) => action.id === "pon"), "人間ポン選択肢が鳴き窓にありません");
  assert(engine.callWindow.pendingCpuCallCandidate, "CPU鳴き候補が pendingCpuCallCandidate として保持されていません");
  engine.skipHumanCall();
  assert(engine.players[2].melds.length === 1 && engine.players[2].melds[0].type === "chi", "CPU pending call was not resolved after human skip");
  assertNoCalledTileInRiver(engine, 1, discarded);
});

test("通常フローではCPU鳴き後にCPUが打牌して進行を再開する", () => {
  const engine = createEngine(Sanma, "cpu-call-flow-discard-after-call", { allowChi: true });
  arrangeEngine(Sanma, engine, {
    turnIndex: 0,
    phase: "human-discard",
    players: [
      { hand: ["white"], lastDraw: false },
      { hand: ["white", "white", "2p"], lastDraw: false },
      { hand: ["1s", "2s", "3s"], lastDraw: false },
    ],
  });
  requireCpuCallApi(engine);
  engine.tryCpuTsumo = () => false;
  engine.tryCpuKita = () => false;
  engine.tryCpuKan = () => false;
  engine.tryCpuRiichi = () => false;
  engine.chooseCpuDiscardIndex = (player) => Math.max(0, player.hand.findIndex((tile) => tile.baseId === "2p"));
  const humanDiscard = engine.players[0].hand.find((tile) => tile.baseId === "z5");
  engine.discardHumanTile(humanDiscard.instanceId);
  const events = engine.gameRecord.rounds[engine.gameRecord.rounds.length - 1].events;
  const callIndex = events.findIndex((event) => event && event.type === "call" && event.data.playerIndex === 1 && event.data.action === "pon");
  assert(callIndex >= 0, "人間打牌に対するCPUポンが通常フローで記録されません");
  assert(
    events.slice(callIndex + 1).some((event) => event && event.type === "discard" && event.data.playerIndex === 1),
    "CPUポン後に鳴いたCPUの次打牌が記録されません"
  );
  assert(!engine.players[0].discards.some((tile) => tile.baseId === "z5"), "called white tile remained in the human river after CPU call flow");
});

test("CPU候補がないときは通常の次順へ進む", () => {
  const engine = createEngine(Sanma, "cpu-call-no-candidate", { allowChi: true });
  arrangeEngine(Sanma, engine, {
    turnIndex: 0,
    phase: "human-discard",
    players: [
      { hand: ["white"], lastDraw: false },
      { hand: ["1p", "2p", "9s"], lastDraw: false },
      { hand: ["1s", "2s", "3s"], lastDraw: false },
    ],
  });
  requireCpuCallApi(engine);
  engine.runCpuUntilHumanTurn = () => true;
  const discarded = engine.players[0].hand.find((tile) => tile.baseId === "z5");
  engine.discardHumanTile(discarded.instanceId);
  assert(engine.players[1].melds.length === 0 && engine.players[2].melds.length === 0, "CPU候補がないのに副露が作られました");
  assert(engine.turnIndex === 1, "CPU候補がない場合に通常の下家へ手番が進みません");
});

test("ロン候補はCPU鳴き候補より必ず優先される", () => {
  const engine = createEngine(Sanma, "cpu-call-ron-priority", { allowChi: true });
  arrangeEngine(Sanma, engine, {
    turnIndex: 0,
    players: [
      { hand: ["5p", "1m", "1m", "1m", "9m", "9m", "9m", "1p", "1p", "1p", "9p", "9p", "9p", "east"] },
      { hand: ["3p", "4p", "2s", "3s", "4s", "6p", "7p", "8p", "6s", "7s", "8s", "2p", "2p"], lastDraw: false },
      { hand: ["5p", "5p", "south", "south", "south", "west", "west", "west", "north", "north", "north", "white", "white"], lastDraw: false },
    ],
  });
  requireCallResolver();
  const five = engine.humanPlayer.hand.find((tile) => tile.baseId === "5p");
  engine.lastDiscard = { playerIndex: 0, tile: five };
  assert(
    Sanma.CallResolver.collectCpuCallCandidates(engine, 0).some((candidate) => candidate.playerIndex === 2 && candidate.actionId === "pon"),
    "ロン優先テスト用のCPUポン候補が作れません"
  );
  engine.lastDiscard = null;
  engine.discardHumanTile(five.instanceId);
  assert(engine.phase === "win-ended" && engine.winResult && engine.winResult.winnerIndex === 1, "CPU鳴きがCPUロンをバイパスしました");
});

test("複数CPU候補は決定論的に優先順位で選ばれる", () => {
  const engine = createEngine(Sanma, "cpu-call-deterministic-candidates", { allowChi: true });
  arrangeEngine(Sanma, engine, {
    turnIndex: 0,
    phase: "human-discard",
    players: [
      { hand: ["1p"], discards: ["3p"] },
      { hand: ["2p", "4p", "9s"], lastDraw: false },
      { hand: ["3p", "3p", "9p"], lastDraw: false },
    ],
  });
  setLastDiscardFromRiver(engine, 0, 0);
  requireCallResolver();
    const candidates = Sanma.CallResolver.collectCpuCallCandidates(engine, 0);
    assert(candidates.some((candidate) => candidate.actionId === "chi" && candidate.playerIndex === 1), "チー候補がありません");
    assert(candidates.some((candidate) => candidate.actionId === "pon" && candidate.playerIndex === 2), "ポン候補がありません");
    const selected = Sanma.CallResolver.selectCpuCallCandidate(engine, candidates);
    assert(selected && selected.playerIndex === 2 && selected.actionId === "pon", "複数候補でポン優先の決定論的選択ができていません");
});

test("CPU strategy invalid candidate is rejected safely", () => {
  const engine = arrangePonFromHuman("cpu-call-strategy-illegal-guard");
  requireCallResolver();
  const originalChooseCall = Sanma.CpuStrategy.chooseCall;
  Sanma.CpuStrategy.chooseCall = () => ({ playerIndex: 2, actionId: "pon", optionIndex: 0, option: { type: "pon" }, priority: 0 });
  try {
    const candidates = Sanma.CallResolver.collectCpuCallCandidates(engine, 0);
    const selected = Sanma.CallResolver.selectCpuCallCandidate(engine, candidates);
    assert(selected === null, "CPU strategy illegal candidate was not rejected safely");
  } finally {
    Sanma.CpuStrategy.chooseCall = originalChooseCall;
  }
});

test("空山では非和了CPU鳴きを発生させない", () => {
  const engine = arrangePonFromHuman("cpu-call-empty-wall");
  engine.wall.tiles = [];
  requireCallResolver();
  const candidates = Sanma.CallResolver.collectCpuCallCandidates(engine, 0);
  assert(candidates.length === 0, "空山なのに非和了CPU鳴き候補が作られました");
});

test("CPU明槓候補はminkanだけに限定され、未対応なら候補なしにできる", () => {
  const engine = createEngine(Sanma, "cpu-call-minkan-scope", { allowChi: true });
  arrangeEngine(Sanma, engine, {
    turnIndex: 0,
    phase: "human-discard",
    players: [
      { hand: ["1p"], discards: ["white"] },
      { hand: ["white", "white", "white", "2p"], lastDraw: false },
      { hand: ["1s", "2s", "3s"], lastDraw: false },
    ],
  });
  setLastDiscardFromRiver(engine, 0, 0);
  requireCallResolver();
  const candidates = Sanma.CallResolver.collectCpuCallCandidates(engine, 0);
  const kanCandidates = candidates.filter((candidate) => candidate.actionId === "kan");
  assert(
    kanCandidates.every((candidate) => candidate.option && candidate.option.type === "minkan"),
    "CPU打牌反応のカン候補にminkan以外が混ざっています"
  );
});

test("既存の人間ポン挙動は維持される", () => {
  const engine = createEngine(Sanma, "cpu-call-human-behavior-preserved", { allowChi: true });
  arrangeEngine(Sanma, engine, {
    turnIndex: 0,
    phase: "human-call",
    players: [
      { hand: ["white", "white", "1p"] },
      { hand: ["2p"], discards: ["white"], lastDraw: false },
      { hand: ["1s", "2s", "3s"], lastDraw: false },
    ],
  });
  setLastDiscardFromRiver(engine, 1, 0);
  engine.callWindow = Sanma.CallWindow.create(engine, 0);
  engine.claimHumanCall("pon", 0);
  assert(engine.players[0].melds.length === 1 && engine.players[0].melds[0].open, "既存の人間ポンで副露が作られません");
  assert(engine.players[1].discards.length === 0, "既存の人間ポンで鳴かれた牌が河から除去されません");
});

test("CPU callイベントはReplayViewerで副露と河除去を再構築できる", () => {
  const players = [
    { id: 0, name: "あなた", seatWind: "east", isHuman: true, points: 35000 },
    { id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: 35000 },
    { id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: 35000 },
  ];
  const record = Sanma.GameRecord.create({ players });
  Sanma.GameRecord.addEvent(record, "deal", {
    hands: [
      { playerIndex: 0, tiles: ["white"] },
      { playerIndex: 1, tiles: ["white", "white", "2p"] },
      { playerIndex: 2, tiles: ["1s", "2s", "3s"] },
    ],
  });
  Sanma.GameRecord.addEvent(record, "discard", { playerIndex: 0, playerName: "あなた", tile: "white" });
  Sanma.GameRecord.addEvent(record, "call", {
    playerIndex: 1,
    playerName: "CPU 1",
    action: "pon",
    fromPlayerIndex: 0,
    tiles: ["white", "white", "white"],
    calledTile: "white",
  });
  const replay = Sanma.ReplayViewer.create(record);
  Sanma.ReplayViewer.jumpToEnd(replay);
  assert(replay.view.melds[1].length === 1 && replay.view.melds[1][0].type === "pon", "ReplayViewerがCPUポン副露を再構築できません");
  assert(replay.view.discards[0].length === 0, "ReplayViewerで鳴かれた牌が河に残っています");
  assert(!replay.partial, `ReplayViewerがCPUポン牌譜を部分再生扱いにしました: ${replay.diagnostics.join(" / ")}`);
});

if (failures.length > 0) {
  console.error(`\n${failures.length} CPU call reaction test(s) failed.`);
  process.exit(1);
}

console.log("CPU call reaction tests passed.");
