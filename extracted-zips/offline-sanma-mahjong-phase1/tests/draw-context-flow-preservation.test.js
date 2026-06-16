const { assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();
const engine = createEngine(Sanma, "phase16-draw-context", { dramaticLuckAssist: false });

engine.openingYakuState = {
  dealerFirstDiscardPending: true,
  chihoEligible: true,
  firstDrawnPlayers: Object.create(null),
};
const cpuFirstDraw = Sanma.DrawContext.createNormalDrawContext.call(engine, engine.players[1]);
assert(cpuFirstDraw.isChiho === true, "first non-dealer draw must preserve chiho context");
const cpuSecondDraw = Sanma.DrawContext.createNormalDrawContext.call(engine, engine.players[1]);
assert(cpuSecondDraw.isChiho === false, "second draw must not preserve chiho context");
const dealerDraw = Sanma.DrawContext.createNormalDrawContext.call(engine, engine.players[0]);
assert(dealerDraw.isTenho === false && dealerDraw.isChiho === false, "normal draw context must not create tenho");

engine.lastDrawContext = {
  playerIndex: 0,
  isRinshan: false,
  isInitialDealerDraw: true,
  isTenho: true,
  isChiho: false,
};
Sanma.RecordFlow.recordAssist.call(engine, {
  applied: true,
  phase: "opening",
  playerIndex: 0,
  beforeShanten: 1,
  afterShanten: 0,
  outgoing: engine.players[0].hand[0],
  incoming: engine.players[0].hand[1],
});
assert(engine.lastDrawContext.isTenho === false, "opening assist must keep the Tenho guard");

engine.wall.tiles = [];
engine.phase = "cpu-running";
engine.lastDrawContext = { playerIndex: 0, isRinshan: false, isKitaReplacement: false };
const finalDiscard = Sanma.DrawContext.createLastDiscard.call(engine, 0, engine.players[0].hand[0]);
assert(finalDiscard.isFinalDrawDiscard === true, "normal final draw discard must mark houtei context");
engine.lastDrawContext = { playerIndex: 0, isRinshan: true, isKitaReplacement: false };
const rinshanDiscard = Sanma.DrawContext.createLastDiscard.call(engine, 0, engine.players[0].hand[0]);
assert(rinshanDiscard.isFinalDrawDiscard === false, "rinshan discard must not mark houtei context");
engine.phase = "caller-discard";
engine.lastDrawContext = { playerIndex: 0, isRinshan: false, isKitaReplacement: false };
const callerDiscard = Sanma.DrawContext.createLastDiscard.call(engine, 0, engine.players[0].hand[0]);
assert(callerDiscard.isFinalDrawDiscard === false, "caller discard must not mark houtei context");

console.log("Phase 16 draw context preservation tests passed.");
