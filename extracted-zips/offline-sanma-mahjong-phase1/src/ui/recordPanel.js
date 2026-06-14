(function attachRecordPanel(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function actionButton(label, action) {
    const node = el("button", "", label);
    node.type = "button";
    node.dataset.recordAction = action;
    return node;
  }

  function renderStats(stats) {
    const grid = el("div", "stats-grid");
    [
      ["対局", stats.gamesPlayed],
      ["局", stats.roundsPlayed],
      ["和了", stats.wins],
      ["敗北", stats.losses],
      ["役満", stats.yakumanCount],
      ["収支", `${stats.totalScoreMovement >= 0 ? "+" : ""}${stats.totalScoreMovement}点`],
    ].forEach(([label, value]) => {
      const item = el("div", "stat-item");
      item.append(el("span", "info-label", label), el("strong", "info-value", String(value)));
      grid.appendChild(item);
    });
    return grid;
  }

  function eventText(event) {
    const data = event.data || {};
    const details = [];
    if (data.playerName) details.push(data.playerName);
    if (data.tile) details.push(data.tile);
    if (data.action) details.push(data.action);
    if (data.reason) details.push(data.reason);
    return `${event.index}. ${event.type}${details.length ? `: ${details.join(" / ")}` : ""}`;
  }

  function render(root, input, handlers) {
    const options = input || {};
    const records = options.records || [];
    const stats = options.stats || Sanma.GameRecordStorage.defaultStats();
    const latest = records.length > 0 ? records[records.length - 1] : null;
    root.innerHTML = "";

    root.append(el("h3", "", "成績"), renderStats(stats), el("h3", "", "牌譜・履歴"));
    const highest = stats.highestHand && stats.highestHand.score
      ? stats.highestHand.score.limitName || `${stats.highestHand.score.han}飜${stats.highestHand.score.fu || 0}符`
      : "なし";
    root.appendChild(el(
      "div",
      "record-summary",
      `最高打点: ${highest} / 最終プレイ: ${stats.lastPlayedAt || "なし"}`
    ));
    const firstRound = latest && latest.rounds[0] ? latest.rounds[0] : null;
    const lastRound = latest && latest.rounds.length > 0 ? latest.rounds[latest.rounds.length - 1] : null;
    const summary = el("div", "record-summary", latest
      ? `${latest.createdAt} / ${firstRound.roundLabel}${lastRound !== firstRound ? `〜${lastRound.roundLabel}` : ""} / ${latest.seed || "ランダムseed"}`
      : "保存済み牌譜はありません。");
    root.appendChild(summary);
    const diagnostics = options.diagnostics || {};
    const storageStatus = diagnostics.localStorage || {};
    if (storageStatus.corruptedRecovered) {
      root.appendChild(el("div", "record-summary", "破損した保存データを安全に復旧しました。"));
    }

    const history = el("ul", "record-history");
    records.slice().reverse().forEach((record) => {
      const round = record.rounds && record.rounds.length > 0 ? record.rounds[record.rounds.length - 1] : {};
      const result = round.result || {};
      const outcome = Number.isInteger(result.winnerIndex)
        ? `${record.players[result.winnerIndex] ? record.players[result.winnerIndex].name : "和了者"} ${result.winType || "和了"}`
        : "流局";
      history.appendChild(el("li", "", `${record.createdAt} / ${record.rounds.length}局 / ${outcome} / ${record.matchEndReason || "終了"}`));
    });
    root.appendChild(history);

    const events = el("ol", "record-events");
    const latestRounds = latest && Array.isArray(latest.rounds) ? latest.rounds : [];
    latestRounds.forEach((round) => {
      (round.events || []).forEach((event) => {
        events.appendChild(el("li", "", `${round.roundLabel}: ${eventText(event)}`));
      });
    });
    root.appendChild(events);

    const textarea = el("textarea", "transfer-textarea");
    textarea.id = "recordsJson";
    textarea.readOnly = true;
    textarea.placeholder = "牌譜JSON";
    const status = el("div", "transfer-status");
    const actions = el("div", "panel-actions transfer-actions");
    const exportButton = actionButton("エクスポート", "export");
    exportButton.id = "exportRecordsButton";
    exportButton.textContent = "牌譜JSON表示";
    exportButton.disabled = !latest;
    exportButton.addEventListener("click", () => {
      textarea.value = latest ? JSON.stringify(latest, null, 2) : "";
      status.textContent = "最新の牌譜JSONを表示しました。";
    });
    const copyButton = actionButton("コピー", "copy");
    copyButton.id = "copyRecordsButton";
    copyButton.textContent = "牌譜JSONをコピー";
    copyButton.disabled = !latest;
    copyButton.addEventListener("click", () => {
      const text = latest ? JSON.stringify(latest, null, 2) : "";
      textarea.value = text;
      if (handlers && handlers.onCopy) handlers.onCopy(text, status);
    });
    const resetRecords = actionButton("牌譜をリセット", "reset-records");
    resetRecords.id = "resetRecordsButton";
    resetRecords.className = "danger";
    resetRecords.addEventListener("click", () => handlers && handlers.onResetRecords && handlers.onResetRecords());
    const resetStats = actionButton("成績をリセット", "reset-stats");
    resetStats.id = "resetStatsButton";
    resetStats.className = "danger";
    resetStats.addEventListener("click", () => handlers && handlers.onResetStats && handlers.onResetStats());
    actions.append(exportButton, copyButton, resetRecords, resetStats);
    root.append(actions, textarea, status);
  }

  Sanma.RecordPanel = { render };
})(window);
