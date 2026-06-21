const fs = require("fs");
const path = require("path");
const { assert, projectRoot } = require("./test-helpers");

const renderTableSource = fs.readFileSync(
  path.resolve(projectRoot, "src", "ui", "renderTable.js"),
  "utf8"
);
const mainCss = fs.readFileSync(path.resolve(projectRoot, "src", "styles", "main.css"), "utf8");
const phase5Css = fs.readFileSync(path.resolve(projectRoot, "src", "styles", "phase5.css"), "utf8");

const centerAppend = "center.append(tableInfo, renderDiscards(state.players), doraPanel);";
assert(renderTableSource.includes(centerAppend), "center-boardで河がドラ表示牌より前に配置されていません");
assert(
  renderTableSource.indexOf(centerAppend) < renderTableSource.indexOf("center.appendChild(renderCallWindow"),
  "呼び出し窓が河・ドラ表示牌より前に配置されています"
);
assert(
  renderTableSource.indexOf("center.appendChild(renderCallWindow")
    < renderTableSource.indexOf("center.appendChild(renderWinResult"),
  "和了結果が呼び出し窓より前に配置されています"
);
assert(
  renderTableSource.includes("winResult.winners") && renderTableSource.includes("win-result-winner"),
  "ダブロン表示で複数勝者ごとの結果を描画する分岐がありません"
);
assert(
  /\.center-board\s*\{[^}]*grid-template-columns:1fr minmax\(12rem,.35fr\)/s.test(mainCss),
  "デスクトップのcenter-boardが河メイン列・ドラサイド列の2列構成ではありません"
);
assert(
  /\.table-info\s*\{[^}]*grid-column:1\/-1/s.test(mainCss),
  "table infoがcenter-board全幅を占めていません"
);
assert(
  /@media\(max-width:820px\)\s*\{[\s\S]*?\.top-bar,.center-board,.debug-layout\s*\{[^}]*grid-template-columns:1fr/s.test(mainCss),
  "モバイルでcenter-boardが1列へ縦積みされません"
);
assert(
  /\.call-window\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/s.test(phase5Css),
  "呼び出し窓がcenter-board全幅を占めません"
);

console.log("Phase 9.4 table layout tests passed.");
