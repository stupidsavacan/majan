const {
  CATEGORIES,
  ISSUE26_ACCEPTANCE_ROWS,
  STATUS,
  assert,
  findRepositoryRoot,
  groupRowsByCategory,
  missingMatrixIdsInText,
  readRequiredText,
} = require("./issue26-test-helpers");

const repositoryRoot = findRepositoryRoot(__dirname);

const readme = readRequiredText(repositoryRoot, "README.md");
const docsIndex = readRequiredText(repositoryRoot, "docs/INDEX.md");
const testingDoc = readRequiredText(repositoryRoot, "docs/TESTING.md");
const bugsDoc = readRequiredText(repositoryRoot, "docs/BUGS.md");
const roadmapDoc = readRequiredText(repositoryRoot, "docs/ROADMAP.md");
const matrixDoc = readRequiredText(repositoryRoot, "docs/ISSUE26_ACCEPTANCE_MATRIX.md");
const runner = readRequiredText(repositoryRoot, "tests/run-all-tests.js");

assert(ISSUE26_ACCEPTANCE_ROWS.length >= 40, "Issue #26 acceptance matrix must cover all planned feature/regression areas.");
assert(new Set(ISSUE26_ACCEPTANCE_ROWS.map((row) => row.id)).size === ISSUE26_ACCEPTANCE_ROWS.length, "Issue #26 matrix IDs must be unique.");
assert(ISSUE26_ACCEPTANCE_ROWS.every((row) => Object.values(STATUS).includes(row.status)), "Issue #26 matrix statuses must be known values.");

const grouped = groupRowsByCategory(ISSUE26_ACCEPTANCE_ROWS);
CATEGORIES.forEach((category) => {
  assert(Array.isArray(grouped[category]) && grouped[category].length > 0, `${category} must have at least one Issue #26 matrix row.`);
  assert(matrixDoc.includes(`### ${category}`), `${category} must have a section in docs/ISSUE26_ACCEPTANCE_MATRIX.md.`);
});

const missingIds = missingMatrixIdsInText(ISSUE26_ACCEPTANCE_ROWS, matrixDoc);
assert(missingIds.length === 0, `docs/ISSUE26_ACCEPTANCE_MATRIX.md is missing matrix IDs: ${missingIds.join(", ")}`);

ISSUE26_ACCEPTANCE_ROWS.forEach((row) => {
  assert(row.promotionTrigger.includes(row.id), `${row.id} must carry its own promotion trigger.`);
  assert(matrixDoc.includes(row.promotionTrigger), `${row.id} promotion trigger must be documented.`);
});

assert(docsIndex.includes("docs/ISSUE26_ACCEPTANCE_MATRIX.md"), "docs/INDEX.md must link the Issue #26 acceptance matrix.");
assert(testingDoc.includes("Issue #26 Test Foundation"), "docs/TESTING.md must document the Issue #26 foundation test policy.");
assert(testingDoc.includes("tests/issue26-acceptance-matrix.test.js"), "docs/TESTING.md must list the Issue #26 acceptance matrix test.");
assert(testingDoc.includes("tests/issue26-test-helpers.js"), "docs/TESTING.md must list the Issue #26 helper file.");
assert(runner.includes('"issue26-acceptance-matrix.test.js"'), "tests/run-all-tests.js must register the Issue #26 foundation test.");

assert(readme.includes("ダブロンは `RuleConfig.doubleRonPolicy.allowed`"), "README must document the integrated daburon policy.");
assert(readme.includes("CPUのポン/チー/明槓は実装済み") && readme.includes("CPU通常ロン"), "README must document implemented CPU call and ron behavior.");
assert(bugsDoc.includes("issue-runtime-flow-regressions.test.js") && bugsDoc.includes("issue-storage-replay-regressions.test.js"), "docs/BUGS.md must keep Phase 16.1 regression coverage visible.");
assert(!roadmapDoc.includes("CPU繝昴Φ/繝√・/譏取ｧ薙・螳溯｣・→讀懆ｨｼ"), "docs/ROADMAP.md must not list implemented CPU calls as future work.");

const todoRows = ISSUE26_ACCEPTANCE_ROWS.filter((row) => row.status === STATUS.TODO);
assert(todoRows.length > 0, "The foundation must keep incomplete Issue #26 behavior as TODO rows, not false green executable coverage.");
assert(matrixDoc.includes("Do not convert TODO rows to failing tests before the implementation PR"), "Matrix doc must explicitly prevent premature failing tests.");

console.log("Issue #26 acceptance matrix foundation tests passed.");
