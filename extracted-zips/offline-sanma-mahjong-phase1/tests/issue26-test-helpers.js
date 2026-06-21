const fs = require("fs");
const path = require("path");

const STATUS = Object.freeze({
  FOUNDATION_PASS: "foundation-pass",
  EXISTING_PASS: "existing-pass",
  TODO: "todo",
});

const CATEGORIES = Object.freeze([
  "chi-off",
  "priority-a-yaku",
  "priority-bc-yaku",
  "ryuukyoku-settlement",
  "daburon",
  "regression",
]);

const ISSUE26_ACCEPTANCE_ROWS = Object.freeze([
  row("CHI-001", "chi-off", STATUS.EXISTING_PASS, "New RuleConfig default has allowChi=false for new games."),
  row("CHI-002", "chi-off", STATUS.EXISTING_PASS, "Existing imported/saved explicit allowChi settings keep their requested value."),
  row("CHI-003", "chi-off", STATUS.EXISTING_PASS, "Human chi call candidates are hidden when allowChi=false."),
  row("CHI-004", "chi-off", STATUS.EXISTING_PASS, "CPU chi candidates/reactions are suppressed when allowChi=false."),

  row("YAKU-A-001", "priority-a-yaku", STATUS.EXISTING_PASS, "Honitsu is detected with correct open/closed han."),
  row("YAKU-A-002", "priority-a-yaku", STATUS.EXISTING_PASS, "Chinitsu is detected with correct open/closed han."),
  row("YAKU-A-003", "priority-a-yaku", STATUS.EXISTING_PASS, "Suuankou is detected as yakuman and tanki double-yakuman rules are explicit."),
  row("YAKU-A-004", "priority-a-yaku", STATUS.EXISTING_PASS, "Daisangen is detected as yakuman."),
  row("YAKU-A-005", "priority-a-yaku", STATUS.EXISTING_PASS, "Tsuuiisou is detected as yakuman."),
  row("YAKU-A-006", "priority-a-yaku", STATUS.EXISTING_PASS, "Shousuushi is detected as yakuman."),
  row("YAKU-A-007", "priority-a-yaku", STATUS.EXISTING_PASS, "Daisuushi is detected as yakuman and double-yakuman policy is explicit."),

  row("YAKU-BC-001", "priority-bc-yaku", STATUS.EXISTING_PASS, "Ittsuu is detected in sanma-valid suits with open/closed han."),
  row("YAKU-BC-002", "priority-bc-yaku", STATUS.EXISTING_PASS, "Sanankou counts only concealed triplets/quads correctly."),
  row("YAKU-BC-003", "priority-bc-yaku", STATUS.EXISTING_PASS, "Shousangen is detected with two dragon triplets and a dragon pair."),
  row("YAKU-BC-004", "priority-bc-yaku", STATUS.EXISTING_PASS, "Chanta requires every set to contain terminal/honor and at least one sequence."),
  row("YAKU-BC-005", "priority-bc-yaku", STATUS.EXISTING_PASS, "Junchan requires every set to contain terminal and no honors."),
  row("YAKU-BC-006", "priority-bc-yaku", STATUS.EXISTING_PASS, "Ryanpeikou is detected only for closed hands and suppresses duplicate iipeikou scoring."),
  row("YAKU-BC-007", "priority-bc-yaku", STATUS.EXISTING_PASS, "Chinroutou is detected as all-terminal yakuman."),
  row("YAKU-BC-008", "priority-bc-yaku", STATUS.EXISTING_PASS, "Ryuuiisou is detected with the allowed green tile set only."),
  row("YAKU-BC-009", "priority-bc-yaku", STATUS.EXISTING_PASS, "Chuuren poutou is detected in sanma-valid suits and pure nine-gates policy is explicit."),
  row("YAKU-BC-010", "priority-bc-yaku", STATUS.EXISTING_PASS, "Sankantsu is detected from three quads."),
  row("YAKU-BC-011", "priority-bc-yaku", STATUS.EXISTING_PASS, "Suukantsu is detected as yakuman from four quads."),
  row("YAKU-BC-012", "priority-bc-yaku", STATUS.EXISTING_PASS, "Sanshoku doukou is detected across sanma-valid suits/honor exclusions."),

  row("RYU-001", "ryuukyoku-settlement", STATUS.EXISTING_PASS, "Exhaustive draw with 0 tenpai players produces no tenpai payment."),
  row("RYU-002", "ryuukyoku-settlement", STATUS.EXISTING_PASS, "Exhaustive draw with 1 tenpai player pays the single tenpai player correctly."),
  row("RYU-003", "ryuukyoku-settlement", STATUS.EXISTING_PASS, "Exhaustive draw with 2 tenpai players splits payment correctly."),
  row("RYU-004", "ryuukyoku-settlement", STATUS.EXISTING_PASS, "Exhaustive draw with 3 tenpai players produces no net payment."),
  row("RYU-005", "ryuukyoku-settlement", STATUS.EXISTING_PASS, "Dealer tenpai draw follows renchan policy."),
  row("RYU-006", "ryuukyoku-settlement", STATUS.EXISTING_PASS, "Dealer noten draw follows rotation policy."),
  row("RYU-007", "ryuukyoku-settlement", STATUS.EXISTING_PASS, "Point deltas are conserved and match sanma noten-bappu totals."),
  row("RYU-008", "ryuukyoku-settlement", STATUS.EXISTING_PASS, "Draw settlement is saved into record/debug events for replay and stats."),

  row("DABU-001", "daburon", STATUS.EXISTING_PASS, "When double ron is OFF, head-bump resolves only the nearest winner."),
  row("DABU-002", "daburon", STATUS.EXISTING_PASS, "When double ron is ON, two ron winners are resolved in the same discard."),
  row("DABU-003", "daburon", STATUS.EXISTING_PASS, "The discarder pays both winners with correct parent/child values."),
  row("DABU-004", "daburon", STATUS.EXISTING_PASS, "Riichi sticks, honba, dealer continuation, and winner ordering are deterministic."),
  row("DABU-005", "daburon", STATUS.EXISTING_PASS, "Record, replay, stats, and result UI represent multiple ron winners."),

  row("REG-001", "regression", STATUS.EXISTING_PASS, "Phase 16.1 runtime and storage/replay regression tests stay registered."),
  row("REG-002", "regression", STATUS.EXISTING_PASS, "Root/canonical entry point documentation stays synchronized."),
  row("REG-003", "regression", STATUS.FOUNDATION_PASS, "No implementation TODO row is silently treated as executable acceptance before its feature PR."),
  row("REG-004", "regression", STATUS.FOUNDATION_PASS, "Issue #26 matrix, helper rows, docs index, and runner registration stay synchronized."),
  row("REG-005", "regression", STATUS.FOUNDATION_PASS, "Changed JavaScript files remain parseable with node --check."),
  row("REG-006", "regression", STATUS.TODO, "Renhou and nagashi mangan stay documented local-rule decisions until a dedicated implementation PR adds deterministic tests."),
]);

const ISSUE26_FIXTURES = Object.freeze({
  "CHI-001": Object.freeze({ ruleConfig: { allowChi: false } }),
  "YAKU-A-001": Object.freeze({ hand: ["2p", "3p", "4p", "6p", "7p", "8p", "2p", "2p", "z1", "z1", "z1", "z5", "z5", "z5"], winType: "ron" }),
  "YAKU-A-002": Object.freeze({ hand: ["2s", "3s", "4s", "4s", "5s", "6s", "6s", "7s", "8s", "8s", "8s", "8s", "2s", "2s"], winType: "ron" }),
  "YAKU-A-004": Object.freeze({ hand: ["z5", "z5", "z5", "z6", "z6", "z6", "z7", "z7", "z7", "2s", "3s", "4s", "9p", "9p"], winType: "ron" }),
  "RYU-002": Object.freeze({ tenpaiPlayers: [0], notenPlayers: [1, 2], expectedNet: [3000, -1500, -1500] }),
  "RYU-003": Object.freeze({ tenpaiPlayers: [0, 1], notenPlayers: [2], expectedNet: [1500, 1500, -3000] }),
  "DABU-001": Object.freeze({ doubleRonPolicy: { allowed: false }, expectedWinnerCount: 1 }),
  "DABU-002": Object.freeze({ doubleRonPolicy: { allowed: true }, expectedWinnerCount: 2 }),
});

function row(id, category, status, acceptance) {
  if (!CATEGORIES.includes(category)) throw new Error(`Unknown Issue #26 category: ${category}`);
  return Object.freeze({
    id,
    category,
    status,
    acceptance,
    promotionTrigger: `Promote ${id} only after implementation, deterministic test, runner registration, and local verification are present.`,
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function findRepositoryRoot(startDir) {
  const candidates = [
    path.resolve(startDir, ".."),
    path.resolve(startDir, "..", "..", ".."),
    process.cwd(),
  ];
  const seen = new Set();
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    if (fs.existsSync(path.join(candidate, "README.md")) && fs.existsSync(path.join(candidate, "docs"))) {
      return candidate;
    }
  }
  throw new Error(`Cannot locate repository root from ${startDir}`);
}

function readRequiredText(repositoryRoot, relativePath) {
  return fs.readFileSync(path.resolve(repositoryRoot, relativePath), "utf8");
}

function groupRowsByCategory(rows) {
  return rows.reduce((groups, matrixRow) => {
    groups[matrixRow.category] = groups[matrixRow.category] || [];
    groups[matrixRow.category].push(matrixRow);
    return groups;
  }, {});
}

function missingMatrixIdsInText(rows, text) {
  return rows.filter((matrixRow) => !text.includes(matrixRow.id)).map((matrixRow) => matrixRow.id);
}

function createIssue26Fixture(id, overrides) {
  const matrixRow = ISSUE26_ACCEPTANCE_ROWS.find((candidate) => candidate.id === id);
  assert(matrixRow, `Unknown Issue #26 fixture id: ${id}`);
  return Object.freeze(Object.assign({
    id,
    category: matrixRow.category,
    status: matrixRow.status,
    acceptance: matrixRow.acceptance,
    data: ISSUE26_FIXTURES[id] || Object.freeze({}),
  }, overrides || {}));
}

module.exports = {
  CATEGORIES,
  ISSUE26_ACCEPTANCE_ROWS,
  ISSUE26_FIXTURES,
  STATUS,
  assert,
  createIssue26Fixture,
  findRepositoryRoot,
  groupRowsByCategory,
  missingMatrixIdsInText,
  readRequiredText,
};
