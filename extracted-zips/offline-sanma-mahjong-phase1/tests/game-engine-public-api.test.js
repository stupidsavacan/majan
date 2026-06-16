const { assert, loadModules } = require("./test-helpers");

const Sanma = loadModules();
const publicApi = [
  "getState",
  "startNextRound",
  "discardHumanTile",
  "claimHumanTsumo",
  "declareHumanRiichi",
  "extractHumanKita",
  "requestHumanKan",
  "selectHumanKan",
  "cancelHumanKanChoice",
  "claimHumanCall",
  "skipHumanCall",
  "drawForHumanManually",
  "startRound",
];

const engine = new Sanma.GameEngine({
  ruleConfig: { dramaticLuckAssist: false, dramaticDrawAssist: false },
  seed: "phase16-public-api",
  onChange() {},
});

publicApi.forEach((name) => {
  assert(typeof engine[name] === "function", `GameEngine.${name} must remain a function`);
  assert(typeof Sanma.GameEngine.prototype[name] === "function", `prototype ${name} is missing`);
});

const state = engine.getState();
[
  "ruleConfig",
  "round",
  "players",
  "wallRemaining",
  "doraIndicators",
  "phase",
  "gameState",
  "turnIndex",
  "logs",
  "humanAvailableActions",
  "matchState",
  "gameRecord",
  "invariantReport",
  "tileLedger",
  "debugEvents",
  "seed",
].forEach((field) => {
  assert(Object.prototype.hasOwnProperty.call(state, field), `getState is missing ${field}`);
});

assert(state.players.length === 3, "getState must expose three players");
assert(state.phase === engine.phase, "getState phase must mirror engine.phase");
assert(state.turnIndex === engine.turnIndex, "getState turnIndex must mirror engine.turnIndex");
assert(Sanma.TileLedger.inspect(engine, engine.ruleConfig).ok, "TileLedger must pass after public API smoke");

console.log("Phase 16 GameEngine public API tests passed.");
