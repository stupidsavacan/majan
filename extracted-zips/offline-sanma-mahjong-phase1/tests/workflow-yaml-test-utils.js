const fs = require("fs");

function validateWorkflowYaml(filePath, assert) {
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/);
  let blockIndent = null;
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    assert(!line.includes("\t"), `${filePath}:${lineNumber} にタブインデントがあります`);
    if (!line.trim() || line.trim().startsWith("#")) return;
    const indent = line.length - line.trimStart().length;
    if (blockIndent !== null && indent > blockIndent) return;
    blockIndent = null;
    assert(indent % 2 === 0, `${filePath}:${lineNumber} のインデントが2文字単位ではありません`);
    const trimmed = line.trim();
    const mapping = /^(?:-\s+)?[^:#][^:]*:\s*(.*)$/.exec(trimmed);
    const sequence = /^-\s+.+$/.test(trimmed);
    assert(Boolean(mapping || sequence), `${filePath}:${lineNumber} はYAMLのmapping/sequence構文ではありません`);
    if (mapping && /^[>|][-+]?$/.test(mapping[1])) blockIndent = indent;
  });
  return text;
}

module.exports = { validateWorkflowYaml };
