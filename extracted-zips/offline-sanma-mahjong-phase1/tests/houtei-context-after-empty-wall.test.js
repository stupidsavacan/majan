const { assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();

function contextFor(lastDiscard, pendingWinContext) {
  const engine = createEngine(Sanma, "phase15-houtei-context", {});
  engine.wall.tiles = [];
  engine.lastDiscard = lastDiscard;
  engine.pendingWinContext = pendingWinContext || null;
  return Sanma.EndTurnYakuResolver.resolve({
    state: engine,
    playerIndex: 0,
    winType: "ron",
    loserIndex: 1,
    ruleConfig: engine.ruleConfig,
  });
}

assert(contextFor({ playerIndex: 1, tile: {}, isFinalDrawDiscard: true }).isHoutei, "最後の正常ツモ後のロンに河底が付きません");
assert(!contextFor({ playerIndex: 1, tile: {}, isFinalDrawDiscard: false }).isHoutei, "山0後の鳴き由来打牌ロンに河底が付きました");
assert(
  !contextFor({ playerIndex: 1, tile: {}, isFinalDrawDiscard: true }, { isChankan: true }).isHoutei,
  "槍槓ロンに河底が付きました"
);

console.log("Phase 15 houtei context after empty wall tests passed.");
