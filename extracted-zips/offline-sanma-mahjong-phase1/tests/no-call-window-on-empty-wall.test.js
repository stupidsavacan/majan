const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const filler = ["1m", "9m", "1p", "2p", "3p", "4p", "6p", "7p", "8p", "1s", "2s", "3s", "z1"];
const winningWait = ["3p", "4p", "2s", "3s", "4s", "6p", "7p", "8p", "6s", "7s", "8s", "2p", "2p"];

function discardOnEmptyWall(setup, discarderIndex, discardBaseId) {
  const engine = createEngine(Sanma, `phase15-empty-wall-${discarderIndex}-${discardBaseId}`, { allowChi: true });
  arrangeEngine(Sanma, engine, Object.assign({ turnIndex: discarderIndex }, setup));
  engine.wall.tiles = [];
  engine.turnIndex = discarderIndex;
  engine.phase = "cpu-running";
  const discarder = engine.players[discarderIndex];
  const tile = discarder.discardTileByInstanceId(discarder.hand.find((item) => item.baseId === discardBaseId).instanceId);
  engine.lastDrawContext = { playerIndex: discarderIndex, isRinshan: false, isKitaReplacement: false };
  engine.handleDiscard(discarderIndex, tile);
  return engine;
}

const pon = discardOnEmptyWall({
  players: [
    { hand: ["5p", "5p", "1m", "1m", "9m", "9m", "1p", "1p", "9p", "9p", "1s", "1s", "z1"], lastDraw: false },
    { hand: ["5p"].concat(filler) },
    { hand: filler, lastDraw: false },
  ],
}, 1, "5p");
assert(pon.phase === "round-ended" && !pon.callWindow, "山0のポン可能局面でcallWindowが開きました");

const chi = discardOnEmptyWall({
  players: [
    { hand: ["3p", "4p", "1m", "1m", "9m", "9m", "1p", "1p", "9p", "9p", "1s", "1s", "z1"], lastDraw: false },
    { hand: filler, lastDraw: false },
    { hand: ["5p"].concat(filler) },
  ],
}, 2, "5p");
assert(chi.phase === "round-ended" && !chi.callWindow, "山0のチー可能局面でcallWindowが開きました");

const minkan = discardOnEmptyWall({
  players: [
    { hand: ["5p", "5p", "5p", "1m", "1m", "9m", "9m", "1p", "1p", "9p", "9p", "1s", "z1"], lastDraw: false },
    { hand: ["5p"].concat(filler) },
    { hand: filler, lastDraw: false },
  ],
}, 1, "5p");
assert(minkan.phase === "round-ended" && !minkan.callWindow, "山0の明槓可能局面でcallWindowが開きました");
assert(minkan.gameRecord.rounds[minkan.gameRecord.rounds.length - 1].result.type === "exhaustive_draw", "山0ロンなし局面で流局牌譜が保存されません");

const humanRon = discardOnEmptyWall({
  players: [
    { hand: winningWait, lastDraw: false },
    { hand: ["5p"].concat(filler) },
    { hand: filler, lastDraw: false },
  ],
}, 1, "5p");
assert(humanRon.phase === "human-call" && humanRon.callWindow.actions.some((action) => action.id === "ron"), "山0の人間ロン可能局面でロン窓が出ません");

const cpuRon = discardOnEmptyWall({
  players: [
    { hand: filler, lastDraw: false },
    { hand: ["5p"].concat(filler) },
    { hand: winningWait, lastDraw: false },
  ],
}, 1, "5p");
assert(cpuRon.phase === "win-ended" && cpuRon.winResult.winnerIndex === 2, "山0のCPUロン可能局面でCPUロンが解決されません");

console.log("Phase 15 no call window on empty wall tests passed.");
