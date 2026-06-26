const { assert, loadModules } = require("./test-helpers");

const Sanma = loadModules(["src/ui/recordPanel.js"]);

const players = [
  { id: 0, name: "Human", seatWind: "east", isHuman: true, points: 35000 },
  { id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: 35000 },
  { id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: 35000 },
];

function createNode(tag) {
  return {
    tag,
    children: [],
    className: "",
    textContent: "",
    innerHTML: "",
    append(...items) { this.children.push(...items); },
    appendChild(item) { this.children.push(item); return item; },
  };
}

function collectText(node) {
  if (!node) return "";
  return `${node.textContent || ""} ${(node.children || []).map(collectText).join(" ")}`;
}

global.document = { createElement: createNode };

const manual = Sanma.ScoreCalculator.calculateScore({
  ruleConfig: Sanma.RuleConfig.createRuleConfig({ doubleYakuman: true }),
  agariResult: { isAgari: true, bestPattern: { type: "kokushi" } },
  yakuResult: {
    hasYaku: true,
    totalHan: 0,
    isYakuman: true,
    yakuman: [{ id: "kokushi-musou-13-wait", name: "国士無双十三面待ち", yakuman: 2 }],
    yaku: [],
  },
  context: { winType: "ron", winnerIndex: 0, loserIndex: 1, dealerIndex: 0, isMenzen: true },
});
assert(manual.yakumanCount === 2, "score should keep double yakuman units");
assert(manual.limitName === "ダブル役満", "score limit label should show double yakuman");

const record = Sanma.GameRecord.create({ players, seed: "multiple-yakuman-display" });
record.id = "multiple-yakuman-display";
record.rounds[0].result = {
  type: "win",
  winnerIndex: 0,
  winType: "ron",
  yaku: [],
  yakuman: ["国士無双十三面待ち"],
  score: {
    isValidWin: true,
    isYakuman: true,
    yakumanCount: 2,
    basePoints: 16000,
    limitName: "役満",
  },
  changes: [
    { playerIndex: 0, delta: 96000, after: 131000 },
    { playerIndex: 1, delta: -96000, after: 0 },
    { playerIndex: 2, delta: 0, after: 35000 },
  ],
};
record.finalPoints = [131000, 0, 35000];

const stats = Sanma.AdvancedStats.calculate([record]);
assert(stats.hand.yakumanCount === 1, "legacy yakumanCount should still mean yakuman winning hands");
assert(stats.hand.yakumanHands === 1, "stats should count one yakuman hand");
assert(stats.hand.yakumanUnits === 2, "stats should count two yakuman units");

const entry = Sanma.RecordIndex.buildEntry(record);
assert(Sanma.RecordListPanel.highestHandLabel(entry).includes("ダブル役満"), "record list should display double yakuman semantics");

const root = createNode("div");
Sanma.RecordPanel.renderAdvancedStats(root, stats);
const text = collectText(root);
assert(text.includes("役満和了"), "stats UI should label yakuman hands");
assert(text.includes("役満単位"), "stats UI should label yakuman units");
assert(text.includes("2"), "stats UI should display two yakuman units");

console.log("Multiple-yakuman display and stats regression tests passed.");
