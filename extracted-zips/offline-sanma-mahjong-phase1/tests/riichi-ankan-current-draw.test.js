const { assert, createTileFactory, loadModules } = require("./test-helpers");

const Sanma = loadModules();
const tile = createTileFactory(Sanma.TileUtil);

function stateFor(codes, lastDrawBaseId, hasRiichi, isHuman) {
  const player = new Sanma.Player({
    id: 0,
    name: isHuman === false ? "CPU" : "あなた",
    seatWind: "east",
    isHuman: isHuman !== false,
    points: 35000,
  });
  player.hand = codes.map((code) => tile(code));
  player.sortHand();
  player.lastDraw = [...player.hand].reverse().find((candidate) => candidate.baseId === lastDrawBaseId);
  player.hasRiichi = Boolean(hasRiichi);
  return {
    players: [player],
    ruleConfig: Sanma.RuleConfig.createRuleConfig({}),
    lastDiscard: null,
  };
}

const oldFour = stateFor([
  "1p", "1p", "1p", "1p",
  "2p", "3p", "4p",
  "5p", "6p", "7p",
  "2s", "3s", "4s",
  "9s",
], "9s", true, true);
assert(!Sanma.KanRules.getAvailableKanActions({ state: oldFour, playerIndex: 0 })
  .some((option) => option.type === "ankan"), "リーチ後に現在ツモ牌を含まない古い4枚で暗槓できました");

const unchanged = stateFor([
  "1p", "1p", "1p",
  "2p", "3p", "4p",
  "5p", "6p", "7p",
  "2s", "3s", "4s",
  "5s",
  "1p",
], "1p", true, true);
const unchangedOption = Sanma.KanRules.getAvailableKanActions({ state: unchanged, playerIndex: 0 })
  .find((option) => option.type === "ankan");
assert(unchangedOption && unchangedOption.consumeInstanceIds.includes(unchanged.players[0].lastDraw.instanceId), "現在ツモ牌で完成し待ちが変わらないリーチ暗槓を許可しません");

const changed = stateFor([
  "2p", "2p", "2p",
  "3p", "3p", "3p",
  "4p", "4p", "4p",
  "5p", "5p", "5p",
  "6p",
  "2p",
], "2p", true, true);
assert(!Sanma.KanRules.getAvailableKanActions({ state: changed, playerIndex: 0 })
  .some((option) => option.type === "ankan"), "現在ツモ牌を含んでも待ちが変わるリーチ暗槓を許可しました");

const nonRiichi = stateFor([
  "2p", "2p", "2p",
  "3p", "3p", "3p",
  "4p", "4p", "4p",
  "5p", "5p", "5p",
  "6p",
  "2p",
], "2p", false, true);
assert(Sanma.KanRules.getAvailableKanActions({ state: nonRiichi, playerIndex: 0 })
  .some((option) => option.type === "ankan"), "非リーチ時の通常暗槓を拒否しました");

const cpuRiichi = stateFor([
  "1p", "1p", "1p", "1p",
  "2p", "3p", "4p",
  "5p", "6p", "7p",
  "2s", "3s", "4s",
  "9s",
], "9s", true, false);
assert(!Sanma.KanRules.getAvailableKanActions({ state: cpuRiichi, playerIndex: 0 })
  .some((option) => option.type === "ankan"), "CPUリーチが現在ツモ牌制約を回避しました");

console.log("Phase 14.2C riichi ankan current draw tests passed.");
