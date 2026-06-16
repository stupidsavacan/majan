const { arrangeEngine, assert, createEngine, loadModules } = require("./phase14-2-test-utils");

const Sanma = loadModules();

function setDealerMeldHand(engine, concealed, melds) {
  arrangeEngine(Sanma, engine, {
    turnIndex: 0,
    players: [
      { hand: concealed, melds },
      { hand: ["z2", "z2", "z2", "z2", "z3", "z3", "z3", "z3", "z4", "z4", "z4", "z4", "z5"], lastDraw: false },
      { hand: ["1m", "9m", "1p", "2p", "3p", "4p", "6p", "7p", "8p", "1s", "2s", "3s", "z1"], lastDraw: false },
    ],
  });
  engine.round.dealerIndex = 0;
  engine.matchManager.state.dealerIndex = 0;
}

const meld = [{ type: "chi", open: true, fromPlayerIndex: 2, tiles: ["2p", "3p", "4p"] }];
const tenpai = createEngine(Sanma, "phase15-meld-tenpai", {});
setDealerMeldHand(tenpai, ["2s", "3s", "4s", "6p", "7p", "8p", "6s", "7s", "8s", "5p"], meld);
const tenpaiResult = Sanma.HandAnalysis.analyzeTenpaiWithMelds(tenpai.players[0].hand, tenpai.players[0].melds, tenpai.ruleConfig);
assert(tenpaiResult.isTenpai, "副露固定の聴牌判定が聴牌を検出しません");
assert(tenpai.withDrawTenpai({ type: "exhaustive_draw" }).dealerTenpai, "流局時の親副露聴牌がdealerTenpaiになりません");

const noten = createEngine(Sanma, "phase15-meld-noten", {});
setDealerMeldHand(noten, ["1m", "9m", "1p", "3p", "5p", "7p", "9p", "1s", "4s", "7s"], meld);
assert(!noten.withDrawTenpai({ type: "exhaustive_draw" }).dealerTenpai, "流局時の親副露ノーテンがdealerTenpaiになりました");

const closed = createEngine(Sanma, "phase15-closed-tenpai", {});
arrangeEngine(Sanma, closed, {
  turnIndex: 0,
  players: [
    { hand: ["2s", "3s", "4s", "2p", "3p", "4p", "6p", "7p", "8p", "6s", "7s", "8s", "5p"] },
    { hand: ["z2", "z2", "z2", "z2", "z3", "z3", "z3", "z3", "z4", "z4", "z4", "z4", "z5"], lastDraw: false },
    { hand: ["1m", "9m", "1p", "2p", "3p", "4p", "6p", "7p", "8p", "1s", "2s", "3s", "z1"], lastDraw: false },
  ],
});
assert(closed.withDrawTenpai({ type: "exhaustive_draw" }).dealerTenpai, "門前親聴牌流局が壊れました");

console.log("Phase 15 exhaustive draw meld-aware tenpai tests passed.");
