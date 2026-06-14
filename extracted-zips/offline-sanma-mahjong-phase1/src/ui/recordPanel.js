(function attachRecordPanel(global) {
  "use strict";
  const Sanma = global.Sanma = global.Sanma || {};
  function escapeHtml(value) {
    return String(value).replace(/[&<>]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[character]));
  }
  function render(root) {
    const records = Sanma.GameRecordStorage.loadRecords();
    const stats = Sanma.GameRecordStorage.loadStats();
    const history = records.length ? records.map((record) => {
      const label = `${record.createdAt} (${record.seed || "ランダム"})`;
      return `<details><summary>${escapeHtml(label)}</summary><pre>${escapeHtml(JSON.stringify(record, null, 2))}</pre></details>`;
    }).join("") : "<p>保存された牌譜はありません。</p>";
    root.innerHTML = `<h3>成績</h3><p>対局 ${stats.gamesPlayed} / 局 ${stats.roundsPlayed} / 和了 ${stats.wins} / 放銃・敗北 ${stats.losses}</p>`
      + `<p>役満 ${stats.yakumanCount} / 累計点棒移動 ${stats.totalScoreMovement}</p><h3>牌譜・履歴</h3>${history}`;
  }
  Sanma.RecordPanel = { render };
})(window);
