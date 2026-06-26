const fs = require("fs");
const path = require("path");
const { assert, projectRoot } = require("./test-helpers");

const repoRoot = path.resolve(projectRoot, "..", "..");
const workflowPath = path.resolve(repoRoot, ".github", "workflows", "embed-yuji-mai.yml");
const workflow = fs.readFileSync(workflowPath, "utf8");
const subsetText = "一二三四五六七八九萬東南西北發中";

assert(workflow.includes("YUJI_MAI_SUBSET_TEXT"), "Yuji Mai subset text env var is missing");
assert(workflow.includes(subsetText), "Yuji Mai subset glyph list changed or disappeared");
assert(workflow.includes("pyftsubset"), "workflow does not subset the source TTF before embedding");
assert(workflow.includes("--flavor=woff2"), "workflow should emit a compressed WOFF2 subset");
assert(workflow.includes("data:font/woff2;base64,"), "workflow should embed the WOFF2 subset, not a raw TTF");
assert(workflow.includes("unicode-range:"), "generated @font-face should limit the font to tile glyph codepoints");
assert(
  !workflow.includes("base64 -w 0 assets/fonts/YujiMai-Regular.ttf"),
  "workflow still embeds the full Yuji Mai TTF directly"
);
assert(
  workflow.includes("U+842C") && workflow.includes("U+767C") && workflow.includes("U+4E2D"),
  "unicode-range is missing key mahjong tile glyphs"
);

console.log("Font subset workflow regression test passed.");
